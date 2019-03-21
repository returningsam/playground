const RES_RATIO = 1;

var config =  {
    THRESHOLD:     10,
    GRAVITY_X:     0,
    GRAVITY_Y:     -9.8,
    DUST_MASS:     .25,
    DRAW_TAIL:     false,
    SHOW_VIDEO:    true,
    VIDEO_OPACITY: 0.25,
}

var canv, ctx, camVideo;

var flow;

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

function initCanvas() {
    canv = document.getElementById("canvas");
    ctx  = canv.getContext("2d");
    canv.width  = window.innerWidth*RES_RATIO;
    canv.height = window.innerHeight*RES_RATIO;

    ctx.strokeStyle = "white";
}

var parts = [];

function drawDirs(zones) {
    // ctx.beginPath();
    for (var i = 0; i < zones.length; i++) {
        let scale = (canv.width/flow.getWidth());
        let x = canv.width-zones[i].x*scale,
            y = zones[i].y*scale,
            u = (-zones[i].u*2),
            v = (zones[i].v);

        let curPart = new Particle(x,y,u,v,config.DUST_MASS,config.GRAVITY_X,config.GRAVITY_Y,0,canv.width,0,canv.height)
        parts.push(curPart);
        // drawCircle(curPart.x,curPart.y,length(curPart)/10);
    }
    // ctx.stroke();
    // ctx.closePath();
    drawParts();
}

function drawCircle(x,y,r) {
    ctx.moveTo(x+r,y);
    ctx.arc(x, y, r, 0, 2 * Math.PI);
}

function drawParts() {
    if (config.DRAW_TAIL) {
        ctx.fillStyle = "rgba(0,0,0,.2)";
        ctx.fillRect(0,0,canv.width,canv.height);
        canv.style.zIndex = 1;
    }
    else {
        ctx.clearRect(0,0,canv.width,canv.height);
        canv.style.zIndex = 3;
    }
    ctx.beginPath();

    for (var i = 0; i < parts.length; i++) {
        if (!parts[i].update()) {
            parts.splice(i,1);
            i--;
        }
        else parts[i].draw(ctx);
    }

    ctx.stroke();
    ctx.closePath();
}

function handleFlowUpdate(data) {
    let zones = data.zones;
    for (var i = 0; i < zones.length; i++) {
        if (length(zones[i]) < config.THRESHOLD) {
            zones.splice(i,1);
            i--;
        }
    }
    drawDirs(zones);
}

function startFlow() {
    flow = new oflow.VideoFlow(camVideo,5);
    flow.onCalculated(handleFlowUpdate);
    flow.startCapture();
}

function updateCamElement() {
    if (config.SHOW_VIDEO) {
        camVideo.style.opacity = config.VIDEO_OPACITY;
    }
    else {
        camVideo.style.opacity = 0;
    }
}

function initCam() {
    camVideo = document.createElement("video");
    document.body.appendChild(camVideo);
    updateCamElement();
    if (navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true })
        .then(function (stream) {
            camVideo.srcObject = stream;
            camVideo.play();
            startFlow();
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
    initCanvas();
    initCam();
    window.onresize = initCanvas;
}

window.onload = init;
