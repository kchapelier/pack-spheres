module.exports = packSphere;

function tinyNDArray(gridShape) {
  const dimensions = gridShape.length;
  const stride = new Array(dimensions);
  const data = [];
  let totalLength = 1;

  for (let dimension = dimensions; dimension > 0; dimension--) {
    stride[dimension - 1] = totalLength;
    totalLength = totalLength * gridShape[dimension - 1];
  }

  for (let i = 0; i < totalLength; i++) {
    data.push([]);
  }

  return {
    stride: stride,
    data: data
  };
}

const neighbourhoodLookupTable2D = [
  [0,0],[0,-1],[-1,0],[1,0],[0,1],[-1,-1],[1,-1],[-1,1],[1,1],[0,-2],[-2,0],[2,0],
  [0,2],[-1,-2],[1,-2],[-2,-1],[2,-1],[-2,1],[2,1],[-1,2],[1,2],[-2,-2],[2,-2],[-2,2],[2,2]
];

const neighbourhoodLookupTable3D = [
  [0,0,0],[0,0,-1],[0,-1,0],[-1,0,0],[1,0,0],[0,1,0],[0,0,1],
  [0,-1,-1],[-1,0,-1],[1,0,-1],[0,1,-1],[-1,-1,0],[1,-1,0],[-1,1,0],[1,1,0],[0,-1,1],[-1,0,1],[1,0,1],[0,1,1],
  [-1,-1,-1],[1,-1,-1],[-1,1,-1],[1,1,-1],[-1,-1,1],[1,-1,1],[-1,1,1],[1,1,1],
  [0,0,-2],[0,-2,0],[-2,0,0],[2,0,0],[0,2,0],[0,0,2],
  [0,-1,-2],[-1,0,-2],[1,0,-2],[0,1,-2],[0,-2,-1],[-2,0,-1],[2,0,-1],[0,2,-1],[-1,-2,0],[1,-2,0],[-2,-1,0],
  [2,-1,0],[-2,1,0],[2,1,0],[-1,2,0],[1,2,0],[0,-2,1],[-2,0,1],[2,0,1],[0,2,1],[0,-1,2],[-1,0,2],[1,0,2],[0,1,2],
  [-1,-1,-2],[1,-1,-2],[-1,1,-2],[1,1,-2],[-1,-2,-1],[1,-2,-1],[-2,-1,-1],[2,-1,-1],[-2,1,-1],[2,1,-1],[-1,2,-1],
  [1,2,-1],[-1,-2,1],[1,-2,1],[-2,-1,1],[2,-1,1],[-2,1,1],[2,1,1],[-1,2,1],[1,2,1],[-1,-1,2],[1,-1,2],[-1,1,2],[1,1,2],
  [0,-2,-2],[-2,0,-2],[2,0,-2],[0,2,-2],[-2,-2,0],[2,-2,0],[-2,2,0],[2,2,0],[0,-2,2],[-2,0,2],[2,0,2],[0,2,2],
  [-1,-2,-2],[1,-2,-2],[-2,-1,-2],[2,-1,-2],[-2,1,-2],[2,1,-2],[-1,2,-2],[1,2,-2],[-2,-2,-1],[2,-2,-1],[-2,2,-1],
  [2,2,-1],[-2,-2,1],[2,-2,1],[-2,2,1],[2,2,1],[-1,-2,2],[1,-2,2],[-2,-1,2],[2,-1,2],[-2,1,2],[2,1,2],[-1,2,2],[1,2,2],
  [-2,-2,-2],[2,-2,-2],[-2,2,-2],[2,2,-2],[-2,-2,2],[2,-2,2],[-2,2,2],[2,2,2]
];

function packSphere(opt = {}) {
  const bounds = defined(opt.bounds, 1);
  const packAttempts = defined(opt.packAttempts, 500);
  const maxCount = defined(opt.maxCount, 1000);
  const sampleFn = opt.sample || sample;
  const dimensions = defined(opt.dimensions, 3);
  const random = opt.random || (() => Math.random());
  let outsideFn;
  if (opt.outside === false) outsideFn = null;
  else outsideFn = opt.outside || outside;

  if (dimensions !== 2 && dimensions !== 3) {
    throw new Error("Dimensions must be 2 or 3");
  }

  const maxRadius = expand(opt.maxRadius, 0.5);
  const minRadius = expand(opt.minRadius, 0.01);
  const padding = expand(opt.padding, 0);
  const radiusGrowth = expand(opt.radiusGrowth, 0.01);
  const maxGrowthSteps = expand(opt.maxGrowthSteps, Infinity);

  // setup the cache grid
  const cellSize = (maxRadius * 2 + padding) / Math.sqrt(dimensions);
  const gridShape = [];

  for (let i = 0; i < dimensions; i++) {
    gridShape.push(Math.ceil(bounds * 2 / cellSize)); // divide or multiply by 2 ?
  }

  const grid = tinyNDArray(gridShape);

  const neighbourhood = dimensions === 2 ? neighbourhoodLookupTable2D : neighbourhoodLookupTable3D;

  const shapes = [];
  for (let i = 0; i < maxCount; i++) {
    const result = pack();
    if (result) {
      shapes.push(result);
    }
  }

  return shapes;

  function defined(a, defaultValue) {
    return a != null ? a : defaultValue;
  }

  function pack() {
    // try to pack
    let shape;
    for (let i = 0; i < packAttempts; i++) {
      shape = place();
      if (shape) break;
    }

    // exhausted all pack attempts
    if (!shape) return false;

    let radius = shape.minRadius;

    let count = 0;

    // grow up to the maxRadius or up to when the border of the sphere gets outside
    while(radius < shape.maxRadius && count < maxGrowthSteps) {
      const newRadius = radius + radiusGrowth;
      if (outsideFn && outsideFn(shape.position, newRadius, padding)) {
        break;
      }
      radius = newRadius;
      count++;
    }

    // restrict the radius to the maxRadius to ensure the sphere does not impede on the space occupied by another sphere
    shape.radius = Math.min(radius, shape.maxRadius);

    // place the spheres in the cache grid
    const shapeIndex = shapes.length;
    let internalArrayIndex = 0;
    for (let dimension = 0; dimension < dimensions; dimension++) {
      internalArrayIndex += (((shape.position[dimension] + bounds) / cellSize) | 0) * grid.stride[dimension];
    }
    grid.data[internalArrayIndex].push(shapeIndex);

    return shape;
  }

  function expand(arg, defaultValue) {
    let result = defined(arg, defaultValue);
    if (typeof result === "function") return result();
    return result;
  }

  function place() {
    const position = sampleFn();
    let shapeMaxRadius = maxRadius;

    if (outsideFn && outsideFn(position, minRadius, padding)) {
      return false;
    }

    for (let neighbourIndex = 0; neighbourIndex < neighbourhood.length; neighbourIndex++) {
      let internalArrayIndex = 0;

      for (let dimension = 0; dimension < dimensions; dimension++) {
        currentDimensionValue = (((position[dimension] + bounds) / cellSize) | 0) + neighbourhood[neighbourIndex][dimension];

        if (currentDimensionValue < 0 || currentDimensionValue >= gridShape[dimension]) {
          internalArrayIndex = -1;
          break;
        }

        internalArrayIndex += currentDimensionValue * grid.stride[dimension];
      }

      if (internalArrayIndex !== -1 && grid.data[internalArrayIndex].length > 0) {
        for (let i = 0; i < grid.data[internalArrayIndex].length; i++) {
          const other = shapes[grid.data[internalArrayIndex][i]];

          let distance = 0;
          for (let n = 0; n < position.length; n++) {
            const delta = position[n] - other.position[n];
            distance += delta * delta;
          }

          distance = Math.sqrt(distance);
          shapeMaxRadius = Math.min(shapeMaxRadius, distance - (padding * 2 + other.radius));

          if (shapeMaxRadius < minRadius) {
            return false;
          }
        }
      }
    }

    return {
      position,
      minRadius,
      maxRadius: shapeMaxRadius
    };
  }

  function outside(position, radius, padding) {
    const maxBound = Math.abs(bounds);
    for (let i = 0; i < position.length; i++) {
      const component = position[i];
      if (
        Math.abs(component + radius) >= maxBound ||
        Math.abs(component - radius) >= maxBound
      ) {
        return true;
      }
    }

    return false;
  }

  function sample() {
    const p = [];
    for (let i = 0; i < dimensions; i++) {
      p.push((random() * 2 - 1) * bounds);
    }
    return p;
  }
}
