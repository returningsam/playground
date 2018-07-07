const CANV_RATIO = 0.8;
const MAX_DIFF = 0.1;

var canv;
var ctx;

var rMatrix;
var gMatrix;
var bMatrix;
var aMatrix;

var rDiffMatrix;
var gDiffMatrix;
var bDiffMatrix;
var aDiffMatrix;

function HSVtoRGB(h, s, v) {
    var r, g, b, i, f, p, q, t;
    if (arguments.length === 1) {
        s = h.s, v = h.v, h = h.h;
    }
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }
    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    };
}

function indToCoord(i) {
    i = i/4;
    var x = i%canv.width;
    var y = (i-x)/canv.width;
    return [x,y];
}

function coordToInd(x,y) {
    return (((y*canv.width)+x)*4);
}

function updateGradient() {

    noise.seed(Math.random());
    for (var y = 0; y < canv.height; y++) for (var x = 0; x < canv.width; x++) {
        rDiffMatrix[x+(y*canv.width)] = Math.min(MAX_DIFF,Math.max(-MAX_DIFF,rDiffMatrix[x+(y*canv.width)] + noise.perlin2(x/100,y/100)));
    }

    noise.seed(Math.random());
    for (var y = 0; y < canv.height; y++) for (var x = 0; x < canv.width; x++) {
        gDiffMatrix[x+(y*canv.width)] = Math.min(MAX_DIFF,Math.max(-MAX_DIFF,gDiffMatrix[x+(y*canv.width)] + noise.perlin2(x/100,y/100)));
    }

    noise.seed(Math.random());
    for (var y = 0; y < canv.height; y++) for (var x = 0; x < canv.width; x++) {
        bDiffMatrix[x+(y*canv.width)] = Math.min(MAX_DIFF,Math.max(-MAX_DIFF,bDiffMatrix[x+(y*canv.width)] + noise.perlin2(x/100,y/100)));
    }

    noise.seed(Math.random());
    for (var y = 0; y < canv.height; y++) for (var x = 0; x < canv.width; x++) {
        aDiffMatrix[x+(y*canv.width)] = Math.min(MAX_DIFF,Math.max(-MAX_DIFF,aDiffMatrix[x+(y*canv.width)] + noise.perlin2(x/100,y/100)));
    }

    for (var i = 0; i < rMatrix.length; i++) rMatrix[i] = Math.min(255,Math.max(0,rMatrix[i] + rDiffMatrix[i]));
    for (var i = 0; i < gMatrix.length; i++) gMatrix[i] = Math.min(255,Math.max(0,gMatrix[i] + gDiffMatrix[i]));
    for (var i = 0; i < bMatrix.length; i++) bMatrix[i] = Math.min(255,Math.max(0,bMatrix[i] + bDiffMatrix[i]));
    for (var i = 0; i < aMatrix.length; i++) aMatrix[i] = Math.min(255,Math.max(0,aMatrix[i] + aDiffMatrix[i]));


    drawGradient();
}

function newGradient() {
    rMatrix = [];
    gMatrix = [];
    bMatrix = [];
    aMatrix = [];
    rDiffMatrix = [];
    gDiffMatrix = [];
    bDiffMatrix = [];
    aDiffMatrix = [];

    noise.seed(Math.random());
    for (var y = 0; y < canv.height; y++) for (var x = 0; x < canv.width; x++) rMatrix.push(Math.round(Math.abs(noise.perlin2(x/100,y/100))));
    for (var y = 0; y < canv.height; y++) for (var x = 0; x < canv.width; x++) rDiffMatrix.push(noise.perlin2(x/100,y/100)*MAX_DIFF);

    noise.seed(Math.random());
    for (var y = 0; y < canv.height; y++) for (var x = 0; x < canv.width; x++) gMatrix.push(Math.round(Math.abs(noise.perlin2(x/100,y/100))));
    for (var y = 0; y < canv.height; y++) for (var x = 0; x < canv.width; x++) gDiffMatrix.push(noise.perlin2(x/100,y/100)*MAX_DIFF);

    noise.seed(Math.random());
    for (var y = 0; y < canv.height; y++) for (var x = 0; x < canv.width; x++) bMatrix.push(Math.round(Math.abs(noise.perlin2(x/100,y/100))));
    for (var y = 0; y < canv.height; y++) for (var x = 0; x < canv.width; x++) bDiffMatrix.push(noise.perlin2(x/100,y/100)*MAX_DIFF);

    noise.seed(Math.random());
    for (var y = 0; y < canv.height; y++) for (var x = 0; x < canv.width; x++) aMatrix.push(Math.round(Math.abs(noise.perlin2(x/100,y/100))));
    for (var y = 0; y < canv.height; y++) for (var x = 0; x < canv.width; x++) aDiffMatrix.push(noise.perlin2(x/100,y/100)*MAX_DIFF);

    drawGradient();
}

function drawGradient() {
    var imgData = ctx.createImageData(canv.width,canv.height);
    for (var i = 0; i < imgData.data.length; i+=4) {
        var rgb = HSVtoRGB(rMatrix[i/4], gMatrix[i/4], bMatrix[i/4])
        imgData.data[i]   = rgb.r;
        imgData.data[i+1] = rgb.g;
        imgData.data[i+2] = rgb.b;
        imgData.data[i+3] = 255;// aMatrix[i/4];
    }
    ctx.putImageData(imgData,0,0);
}

function resize() {
    initCanv();
    // reset();
}

function initCanv() {
    canv = document.getElementById("canvas");
    ctx = canv.getContext("2d");
    canv.width  = window.innerWidth  * CANV_RATIO;
    canv.height = window.innerHeight * CANV_RATIO;
}

function init() {
    initCanv();
    newGradient();
    setInterval(updateGradient, 10);
}

window.onload = init;
// window.onresize = resize;
