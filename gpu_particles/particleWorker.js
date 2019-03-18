importScripts("./chance.min.js","./gpu.min.js");

var gpu;

const PART_LEN  = 7;
var msPos = [0,0];
var particles = [];
var options;

var canvWidth, canvHeight;

var updateParticles;
var updateParticlesInterval;

function resetParticles() {
    particles = [];
    for (var i = 0; i < options.numParticles; i++) {
        var x = chance.integer({min:10,max:canvWidth-10});
        var y = chance.integer({min:10,max:canvHeight-10});
        var curPart = [
            0,
            0,
            x,   // x coordinate
            y,   // y coordinate
            0,   // x direction
            0,   // y direction
            i    // id
        ];

        particles.push(curPart);
    }
}

function initParticles() {
    gpu = new GPU();
    resetParticles();
    gpu.addFunction(function dist(x1,y1,x2,y2) {
        const dx = abs(x1-x2);
        const dy = abs(y1-y2);
        return sqrt((dx*dx) + (dy*dy));
    },{paramTypes: { x1: 'Number', y1: 'Number', x2: 'Number', y2: 'Number'}, returnType: 'Number' });

    gpu.addFunction(function diff(x1,y1,x2,y2) {
        return [x2-x1,y2-y1];
    },{paramTypes: { x1: 'Number', y1: 'Number', x2: 'Number', y2: 'Number'}, returnType: 'Array(2)' });

    updateParticles = gpu.createKernel(function (p,ms,mx,inertia,grav,dPow,mDist,mouseDir) {
        const cur = p[this.thread.y][this.thread.x];
        const mdist  = max(mDist,pow(dist(p[this.thread.y][2],p[this.thread.y][3],ms[0],ms[1]),dPow));
        const mxdist = dist(0,0,mx[0],mx[1]);
        mdist = mdist/mxdist;
        const mdiff  = diff(p[this.thread.y][2],p[this.thread.y][3],ms[0],ms[1]);
        if (this.thread.x == 0) {
            mdiff[0] = mdiff[0]/mdist;
            return (cur*inertia + mdiff[0]*grav)/(inertia+1);
        }
        else if (this.thread.x == 1) {
            mdiff[1] = mdiff[1]/mdist;
            return (cur*inertia + mdiff[1]*grav)/(inertia+1);
        }
        else if ((this.thread.x == 2 || this.thread.x == 3)) {
            return p[this.thread.y][this.thread.x] + mouseDir*p[this.thread.y][this.thread.x-2];
        }
        return p[this.thread.y][this.thread.x];
    }).setOutput({x: PART_LEN, y: options.numParticles});
}

function runUpdate() {
    particles = updateParticles(
        particles,
        msPos,
        [canvWidth,canvHeight],
        options.inertia,
        options.gravity,
        options.distPow,
        options.minDist,
        (options.mouse_effect == "push" ? -1 : 1)
    );
}

function startUpdate() {
    updateParticlesInterval = setInterval(runUpdate,10);
}

self.addEventListener('message', function(e) {
    if (e.data.type == "start") {
        options    = e.data.ops;
        msPos      = e.data.ms;
        canvWidth  = e.data.w;
        canvHeight = e.data.h;
        initParticles();
        // startUpdate();
    }
    if (e.data.type == "get") {
        options    = e.data.ops;
        msPos      = e.data.ms;
        canvWidth  = e.data.w;
        canvHeight = e.data.h;
        runUpdate();
        self.postMessage({particles: particles});
    }
    if (e.data.type == "reset") {
        // clearInterval(updateParticlesInterval);
        resetParticles();
        // startUpdate();
    }
}, false);
