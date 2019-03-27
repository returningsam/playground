const RES_RATIO = 1;
const ZRES_RATIO = .1;

var config =  {
    THRESHOLD:     7.5,
    GRAVITY_X:     0,
    GRAVITY_Y:     -9.8,
    DUST_MASS:     .25,
    DRAW_TAIL:     true,
    SHOW_VIDEO:    false,
    VIDEO_OPACITY: 0.25,
    NUM_PARTS:     10000,
    PS_MARGIN:     100,
}

var canv, ctx, camVideo;

var flow;

var simplex;

var requestAnimationFrame = window.requestAnimationFrame ||
                            window.mozRequestAnimationFrame ||
                            window.webkitRequestAnimationFrame ||
                            window.msRequestAnimationFrame;

var cancelAnimationFrame = window.cancelAnimationFrame ||
                           window.mozCancelAnimationFrame;

function fastDist(p1,p2) {
    var a = p1.x - p2.x;
    var b = p1.y - p2.y;
    return (a*a + b*b);
}

function indToCoord(i,w) {
    i = i/4;
    var x = i%w;
    var y = (i-x)/w;
    return [x,y];
}

function coordToInd(x,y,w) {
    return Math.floor((((y*w)+x)*4));
}

function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function length(v) {
    return Math.sqrt(v.u * v.u + v.v * v.v);
}

function randPrune(arr,len) {
    return shuffle(arr).splice(0,len);
}

function simplexColor(x,y) {
    let r = Math.round(((simplex.noise2D(x,y)+1)/2)*255);
    x += 100;y += 100;
    let g = Math.round(((simplex.noise2D(x,y)+1)/2)*255);
    x += 100;y += 100;
    let b = Math.round(((simplex.noise2D(x,y)+1)/2)*255);
    return "rgb(" + r + "," + g + "," + b + ")";
}

var parts = [];

function drawCircle(x,y,r) {
    ctx.moveTo(x+r,y);
    ctx.arc(x, y, r, 0, 2 * Math.PI);
}

function treeify() {
    zTree = new kdTree(zones, fastDist, ["x","y"]);
}

var zCanv;
var zCtx;
var zImgData;
var zTree;
var zones;

function vecLookup(x,y) {
    x *= ZRES_RATIO/RES_RATIO;
    y *= ZRES_RATIO/RES_RATIO;

    let maxDist = (zCanv.width*zCanv.height)/1000;

    let avgVec = {u: 0,v: 0};
    if (zTree) {
        let closest = zTree.nearest({x:x,y:y}, 5, maxDist);
        let count = 0;
        if (closest.length > 0) {
            for (var j = 0; j < closest.length; j++) {
                let curZone = closest[j][0];
                let curDist = 1.-(closest[j][1]/maxDist);
                avgVec.u += curZone.u*curDist;
                avgVec.v += curZone.v*curDist;
            }
            avgVec.u /= closest.length;
            avgVec.v /= closest.length;
        }
    }

    return avgVec;
}

function handleFlowUpdate(data) {
    zones = data.zones;
    for (var i = 0; i < zones.length; i++) {
        if (length(zones[i]) < config.THRESHOLD) {
            zones.splice(i,1);
            i--;
        }
        else {
            let scale = (zCanv.width/flow.getWidth());
            zones[i].x = zCanv.width-zones[i].x*scale + chance.floating({min:-10,max:10});
            zones[i].y = zones[i].y*scale + chance.floating({min:-10,max:10});
            zones[i].u = -zones[i].u;
            zones[i].v = (zones[i].v);
        }
    }
    // compute maxLength
    let maxLen = 1;
    for (var i = 0; i < zones.length; i++)
        maxLen = Math.max(length(zones[i]),maxLen);
    // prune and scale
    for (var i = 0; i < zones.length; i++) {
        zones[i].u /= maxLen;
        zones[i].v /= maxLen;
    }
    treeify();
}

var curParts;

function animate() {
    if (!curParts) curParts = [];
    if (curParts.length < config.NUM_PARTS) {
        let toAdd = config.NUM_PARTS - curParts.length;
        for (var i = 0; i < toAdd; i++) {
            curParts.push(new Particle(
                chance.floating({min:0,max:canv.width}),
                chance.floating({min:0,max:canv.height}),
                0,0, // u,v
                1,   // mass
                0,0, // gravit x,y
                0,canv.width,
                0,canv.height));
        }
    }

    for (var i = 0; i < curParts.length; i++) {
        let curVec = vecLookup(curParts[i].x,curParts[i].y);
        curParts[i].u += curVec.u*10.;
        curParts[i].v += curVec.v*10.;
        if (length(curParts[i]) > 1) {
            curParts[i].u -= curParts[i].u*.03;
            curParts[i].v -= curParts[i].v*.03;
        }
        if (!curParts[i].update()) {
            curParts.splice(i,1);
            i--;
        }
    }

    render();
    requestAnimationFrame(animate);
}

function render() {
    ctx.fillStyle = "rgba(0,0,0,0.1)";
    ctx.clearRect(0,0,canv.width,canv.height);
    ctx.strokeStyle = "white";
    ctx.beginPath();
    for (var i = 0; i < curParts.length; i++) curParts[i].draw(ctx);
    ctx.stroke();
    ctx.closePath();
}

function startFlow() {
    flow = new oflow.VideoFlow(camVideo,20);
    flow.onCalculated(handleFlowUpdate);
    flow.startCapture();
    animate();
}

function updateCamElement() {
    if (config.SHOW_VIDEO) camVideo.style.opacity = config.VIDEO_OPACITY;
    else camVideo.style.opacity = 0;
}

var vidScale;

function handleScreenResize() {
    vidScale = Math.max(window.innerWidth/camVideo.videoWidth,window.innerHeight/camVideo.videoHeight);

    // udpdate video overlay size
    camVideo.style.width  = camVideo.videoWidth *vidScale + "px";
    camVideo.style.height = camVideo.videoHeight*vidScale + "px";

    // update zone processing canvas
    zCanv          = document.createElement("canvas");
    zCtx           = zCanv.getContext("2d");
    zCanv.width    = camVideo.videoWidth *vidScale*ZRES_RATIO;
    zCanv.height   = camVideo.videoHeight*vidScale*ZRES_RATIO;
    zCtx.fillStyle = "blue";
    zCtx.fillRect(0,0,zCanv.width,zCanv.height);

    // update render canvas
    canv              = document.getElementById("canvas");
    ctx               = canv.getContext("2d");
    canv.width        = camVideo.videoWidth *vidScale*RES_RATIO;
    canv.height       = camVideo.videoHeight*vidScale*RES_RATIO;
    canv.style.width  = camVideo.videoWidth *vidScale + "px";
    canv.style.height = camVideo.videoHeight*vidScale + "px";
    ctx.fillStyle     = "blue";
    ctx.fillRect(0,0,canv.width,canv.height);
}

function initCam() {
    camVideo = document.createElement("video");
    document.body.appendChild(camVideo);
    updateCamElement();
    if (navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true })
        .then(function (stream) {
            camVideo.srcObject = stream;
            camVideo.oncanplay = function () {
                camVideo.play();
                handleScreenResize();
                window.onresize = handleScreenResize;
                startFlow();
            }
        })
        .catch(function (err0r) {
            console.log("Something went wrong!");
        });
    }
}

var gui;

function initGUI() {
    gui = new dat.GUI();
    gui.domElement.style.zIndex = 100;

    gui.add(config,"THRESHOLD",  0, 30);
    gui.add(config,"GRAVITY_X", -15,15);
    gui.add(config,"GRAVITY_Y", -15,15);
    gui.add(config,"DUST_MASS",  0, 1);
    gui.add(config,"DRAW_TAIL")
    let showVidGui = gui.add(config,"SHOW_VIDEO").name("Show Overlay");
    showVidGui.onFinishChange(updateCamElement);
    let videoOpacGui = gui.add(config,"VIDEO_OPACITY", 0, 1).name("Overlay opacity");
    videoOpacGui.onFinishChange(updateCamElement);
}

function init() {
    initGUI();
    initCam();
    simplex = new SimplexNoise();
    window.onresize = handleScreenResize;
}

window.onload = init;
