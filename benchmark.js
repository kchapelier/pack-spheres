"use strict";

var pack = require('.');
//const Random = require("canvas-sketch-util/random");

var num = 0;
var time = 0;
var iterations = 5;
var shapes = [];

for (var i = 0; i < iterations; i++) {
    var hrstart = process.hrtime();
    var start = Date.now();

    shapes.push(pack({
        bounds: 1,
        /*
        sample: () => Random.insideCircle(1),
        outside: (position, radius) => {
            // See if length of circle + radius
            // exceeds the bounds
            const length = Math.sqrt(
            position[0] * position[0] + position[1] * position[1]
            );
            return length + radius >= 1;
        },
        */
        maxCount: 2500,
        dimensions: 2,
        minRadius: 0.01,
        maxRadius: 0.5,
        padding: 0.0025
    }));

    var hrend = process.hrtime(hrstart);
    var end = Date.now();

    num+= shapes[i].length;
    time+= (hrend[0] + hrend[1] / 1000000000);
    console.info('Iteration #%d: %d Circles in %ds', i+1 , shapes[i].length, (hrend[0] + hrend[1] / 1000000000));
}

console.log();

console.info('Average: ~%d Circles in ~%ds', (num/iterations).toFixed(0), (time/iterations).toFixed(4))