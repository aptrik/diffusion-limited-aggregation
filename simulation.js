/* jshint esversion: 6 */
/* jshint -W097 */
'use strict';

/* global console, performance */

function _random(maximum) {
    return Math.floor(Math.random() * maximum);
}

function Simulation(width, height, ratio) {
    this.width = width;
    this.height = height;
    this.ratio = Math.min(1.0, Math.max(0.0, ratio));
    this.numberOfParticles = Math.floor(this.ratio * width * height);
    this.steps = 0;
    console.log("Simulation=%s", JSON.stringify(this, null, 2));

    this.grid = new Array(this.width * this.height);
    for (var i = 0; i < this.grid.length; i++) {
        this.grid[i] = 0;
    }

    this.particles = new Array(this.numberOfParticles - 1);
    this.stuckParticles = [];

    // Stick the first particle to the grid center.
    var x = Math.floor(this.width / 2);
    var y = Math.floor(this.height / 2);
    this.stuckParticles.push({x: x, y: y});
    this.grid[this.gridIndex(x, y)] = 1;

    // Place the rest of the particles randomly on the grid.
    for (var j = 0; j < this.particles.length; j++) {
        this.particles[j] = this.randomPosition();
    }

    this.gradient = [
        0x00F000,
        0x28C800,
        0x50A000,
        0x787800,
        0xA05000,
        0xC82800,
        0xF00000,
    ];
}

Simulation.prototype.colourAt = function (steps) {
    var maxSteps = this.steps;
    var index = Math.floor((steps / maxSteps) * this.gradient.length) % this.gradient.length;
    var colour = this.gradient[index];
    return [(colour & 0xff0000) >> 16,
            (colour & 0x00ff00) >> 8,
            (colour & 0x0000ff)];
};

Simulation.prototype.gridIndex = function (x, y) {
    return x + y * this.width;
};

Simulation.prototype.randomPosition = function () {
    var x, y;
    do {
        x = _random(this.width);
        y = _random(this.height);
    } while (this.grid[this.gridIndex(x, y)] > 0);
    return {x: x, y: y};
};

Simulation.prototype.isParticleFree = function (position) {
    var x = position.x;
    var leftX = x - 1;
    var rightX = x + 1;
    var y = position.y;
    var topY = y - 1;
    var bottomY = y + 1;
    if (x <= 0 || x >= this.width ||
        leftX <= 0 || leftX >= this.width ||
        rightX <= 0 || rightX >= this.width ||
        y <= 0 || y >= this.height ||
        topY <= 0 || topY >= this.height ||
        bottomY <= 0 || bottomY >= this.height) {
        return true;
    }
    y *= this.width;
    topY *= this.width;
    bottomY *= this.width;
    if (this.grid[x + topY] ||
        this.grid[leftX + y] ||
        this.grid[rightX + y] ||
        this.grid[x + bottomY] ||
        this.grid[leftX + topY] ||
        this.grid[leftX + bottomY] ||
        this.grid[rightX + topY] ||
        this.grid[rightX + bottomY]) {
        return false;
    }
    return true;
};

Simulation.prototype.move = function (position) {
    var x = position.x;
    var y = position.y;
    x += Math.random() > 0.5 ? 1 : -1;
    y += Math.random() > 0.5 ? 1 : -1;
    if ((x < 0) || (y < 0) || (x >= this.width) || (y >= this.height)) {
        return this.randomPosition();
    }
    // if (x < 0) {
    //     x += 2;
    // } else if (x >= this.width) {
    //     x -= 2;
    // }
    // if (y < 0) {
    //     y += 2;
    // } else if (y >= this.height) {
    //     y -= 2;
    // }
    return {
        x: x,
        y: y
    };
};

Simulation.prototype.isDone = function () {
    return this.particles.length === 0;
};

Simulation.prototype.step = function (steps = 1) {
    if (!this.startTime) {
        this.startTime = performance.now();
    }
    for (var step = 0; step < steps; step++) {
        this.steps += 1;
        var freeParticles = [];
        for (var i = 0; i < this.particles.length; i++) {
            var newPos = this.move(this.particles[i]);
            if (this.isParticleFree(newPos)) {
                freeParticles.push(newPos);
            } else {
                this.stuckParticles.push(newPos);
                this.grid[this.gridIndex(newPos.x, newPos.y)] = this.steps;
            }
        }
        this.particles = freeParticles;
        if (this.particles.length === 0) {
            break;
        }
    }
    if (this.isDone()) {
        this.duration = (performance.now() - this.startTime) / 1000;
        console.log(
            "Simulation finished in %s steps after %.2f seconds.",
            this.steps, this.duration);
    }
};

Simulation.prototype.paint = function (canvas) {
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var imagedata = ctx.getImageData(0, 0, canvas.width, canvas.height);
    var data = imagedata.data;
    var particle, index;
    for (var i = 0; i < this.particles.length; i++) {
        particle = this.particles[i];
        index = this.gridIndex(particle.x, particle.y);
        data[4 * index + 0] = 0x80;
        data[4 * index + 1] = 0x80;
        data[4 * index + 2] = 0x80;
        data[4 * index + 3] = 0xd0;
    }
    var done = this.isDone();
    var r, g, b;
    for (var j = 0; j < this.stuckParticles.length; j++) {
        particle = this.stuckParticles[j];
        index = this.gridIndex(particle.x, particle.y);
        [r, g, b] = done ? this.colourAt(this.grid[index]) : [0x00, 0xf0, 0x00];
        data[4 * index + 0] = r;
        data[4 * index + 1] = g;
        data[4 * index + 2] = b;
        data[4 * index + 3] = 0xd0;
    }
    ctx.putImageData(imagedata, 0, 0);
};
