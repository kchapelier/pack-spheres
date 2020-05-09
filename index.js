module.exports = packSphere;
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
    while(radius < shape.maxRadius && count < shape.maxGrowthSteps) {
      const newRadius = radius + shape.radiusGrowth;
      if (outsideFn && outsideFn(shape.position, newRadius, shape.padding)) {
        break;
      }
      radius = newRadius;
      count++;
    }

    shape.radius = Math.min(radius, shape.maxRadius);
    return shape;
  }

  function expand(arg, defaultValue) {
    let result = defined(arg, defaultValue);
    if (typeof result === "function") return result();
    return result;
  }

  function place() {
    const radiusGrowth = expand(opt.radiusGrowth, 0.01);
    const maxGrowthSteps = expand(opt.maxGrowthSteps, Infinity);
    const position = sampleFn();
    const minRadius = expand(opt.minRadius, 0.01);
    const padding = expand(opt.padding, 0);
    let maxRadius = expand(opt.maxRadius, 0.5);

    if (outsideFn && outsideFn(position, minRadius, padding)) {
      return false;
    }

    for (let i = 0; i < shapes.length; i++) {
      const other = shapes[i];

      let distance = 0;
      for (let n = 0; n < position.length; n++) {
        const delta = position[n] - other.position[n];
        distance += delta * delta;
      }

      distance = Math.sqrt(distance);
      maxRadius = Math.min(maxRadius, distance - (padding + other.radius + other.padding));

      if (maxRadius < minRadius) {
        return false;
      }
    }


    return {
      maxGrowthSteps,
      minRadius,
      maxRadius,
      radiusGrowth,
      position,
      padding
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
