const canvasSketch = require("canvas-sketch");
const pack = require("..");
console.log('---')
for (let i = 0; i < 3; i++) {
  console.profile('Test ' + i);
  const start = Date.now();
  const shapes = pack({
      bounds: 1,
      maxCount: 2500,
      dimensions: 2,
      minRadius: 0.02,
      maxRadius: 0.2,
      padding: 0.0025
  });
  
  console.log(shapes.length, (Date.now() - start) / 1000);
  console.profileEnd('Test ' + i);
}

const settings = {
  dimensions: [1024, 1024]
};

const sketch = ({ width, height }) => {
  const size = Math.min(width, height);
  const margin = width * 0.1;
  const scale = 0.5 * size - margin;

  const shapes = pack({
    dimensions: 2,
    padding: 0.0025
  });

  return ({ context, width, height }) => {
    // Clear background
    context.fillStyle = "white";
    context.fillRect(0, 0, width, height);

    // Centered origin point
    context.translate(width / 2, height / 2);
    // Scale from -1..1 to -scale..scale
    context.scale(scale, scale);

    shapes.forEach(shape => {
      context.beginPath();
      context.arc(
        shape.position[0],
        shape.position[1],
        shape.radius,
        0,
        Math.PI * 2
      );
      context.fillStyle = "black";
      context.fill();
    });
  };
};

canvasSketch(sketch, settings);
