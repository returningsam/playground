const RES_RATIO = 1;
const VID_SCALE = .315;

var config =  {
    FADE:          1,
    SHOW_VIDEO:    false,
    VIDEO_OPACITY: 0.25,
    NUM_PARTS:     20000,
    ADD_PER_FRAME: 5000,
    SHAPE:         "line",
    SPRING:        true,
    PART_MASS:     .1
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

/******************************************************************************/
/************************ HELPERS *********************************************/
/******************************************************************************/

function length(v) {
    return Math.sqrt(v.u * v.u + v.v * v.v);
}

function drawCircle(x,y,r) {
    ctx.moveTo(x+r,y);
    ctx.arc(x, y, r, 0, 2 * Math.PI);
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

Array.prototype.mySwapDelete = function arrayMySwapDelete (index) {
    this[index] = this[this.length - 1];
    this.pop();
}

/******************************************************************************/
/************************ PARTICLES *******************************************/
/******************************************************************************/

var curParts;

function drawParts() {
    if (config.FADE == 1) {
        ctx.clearRect(0,0,canv.width,canv.height);
    }
    else {
        ctx.fillStyle = "rgba(0,0,0," + config.FADE + ")";
        ctx.fillRect(0,0,canv.width,canv.height);
    }
    if (config.SHAPE == "dot") {
        ctx.fillStyle = "white";
        for (var i = 0; i < curParts.length; i++) curParts[i].drawDot(ctx);
    }
    else if (config.SHAPE == "line") {
        ctx.strokeStyle = "white";
        ctx.beginPath();
        for (var i = 0; i < curParts.length; i++) curParts[i].drawLine(ctx);
        ctx.stroke();
        ctx.closePath();
    }
}

function fillParts() {
    let toAdd = Math.min(config.ADD_PER_FRAME,config.NUM_PARTS - curParts.length);
    for (var i = 0; i < toAdd; i++) {
        curParts.push(new Particle(
            chance.floating({min:0,max:canv.width}),
            chance.floating({min:0,max:canv.height}),
            0,0, // u,v
            config.PART_MASS,   // mass
            0,0, // gravit x,y
            0,canv.width,
            0,canv.height
        ));
    }
}

function initParts() {
    curParts = [];
    numToAddGui.__max = config.NUM_PARTS;
}

/******************************************************************************/
/************************ ANIMATION *******************************************/
/******************************************************************************/

function animate() {
    // refill parts array if not full
    if (curParts.length < config.NUM_PARTS) fillParts();

    // run flow processing
    for (var i = 0; i < curParts.length; i++) {
        let curVec = flowLookup(curParts[i].x,curParts[i].y);
        curParts[i].u -= curParts[i].u*.05;
        curParts[i].v -= curParts[i].v*.05;
        curParts[i].u += curVec.u;
        curParts[i].v += curVec.v;
        if (config.SPRING) curParts[i].update(config.SPRING)
        else {
            if (!curParts[i].update(config.SPRING)) {
                curParts.mySwapDelete(i);
                i--;
            }
        }
    }

    render();
    requestAnimationFrame(animate);
}

function render() {
    drawParts();
}

/******************************************************************************/
/************************ OPENCV STUFF ****************************************/
/******************************************************************************/

var vidCap;
var oldFrame, curFrame, oldGray, curGray;
var pflow, flow;
var pyrScale, levels, winsize, iterations, polyN, polySigma, flags, flowVec;

function flowLookup(x,y) {
    // scale coord to video size
    x = Math.floor((x*VID_SCALE/vidScale + 1));
    y = Math.floor((y*VID_SCALE/vidScale + 1)/1.1);

    if (x > 0 && x < camVideo.width && y > 0 && y < camVideo.height) {
        let v = {
            u: flow.floatAt(y,x*2),
            v: flow.floatAt(y,x*2+1)
        }
        return v;
    }
    return {u: 0,v: 0};
}

function processFlow() {
    // read current frame and convert to grayscale
    vidCap.read(inpFrame);
    cv.resize(inpFrame,curFrame,curFrame.size(),0,0,cv.INTER_AREA);
    cv.flip(curFrame,curFrame,1);
    cv.cvtColor(curFrame, curGray, cv.COLOR_RGBA2GRAY);

    // flow.copyTo(pflow);

    // process frame at points
    cv.calcOpticalFlowFarneback(
        oldGray, curGray, // prev frame and new frame
        flow,           // prev points and new points
        pyrScale, levels, winsize, iterations, polyN, polySigma, flags
    );


    // cv.addWeighted(flow,.5,pflow,0.5,0,flow);

    // move current frame to old frame
    curGray.copyTo(oldGray);

    setTimeout(processFlow, 0);
}

function initFlow() {
    console.log(cv);
    // init params
    pyrScale   = .5;
    levels     = 2;
    winsize    = 15;
    iterations = 1;
    polyN      = 5;
    polySigma  = 1.1;
    flags      = cv.OPTFLOW_USE_INITIAL_FLOW;

    // connect video stream to cv
    vidCap = new cv.VideoCapture(camVideo);

    // init color frame buffers
    inpFrame = new cv.Mat(camVideo.height, camVideo.width, cv.CV_8UC4);
    oldFrame = new cv.Mat(Math.round(camVideo.height*VID_SCALE),
                          Math.round(camVideo.width*VID_SCALE), cv.CV_8UC4);
    curFrame = new cv.Mat(Math.round(camVideo.height*VID_SCALE),
                          Math.round(camVideo.width*VID_SCALE), cv.CV_8UC4);
    flow     = new cv.Mat(Math.round(camVideo.height*VID_SCALE),
                          Math.round(camVideo.width*VID_SCALE), cv.CV_32FC2);
    pflow    = new cv.Mat(Math.round(camVideo.height*VID_SCALE),
                          Math.round(camVideo.width*VID_SCALE), cv.CV_32FC2);

    flowVec = new cv.MatVector();

    console.log(curFrame.size());

    // init grayscale frame buffers
    oldGray  = new cv.Mat();
    curGray  = new cv.Mat();

    // read current frame into oldFrame and convert to grayscale
    vidCap.read(inpFrame);
    cv.resize(inpFrame,oldFrame,oldFrame.size(),0,0,cv.INTER_AREA);
    cv.flip(oldFrame,oldFrame,1);
    cv.cvtColor(oldFrame, oldGray, cv.COLOR_RGB2GRAY);
    oldFrame.delete();

    processFlow();
    animate();
}

/******************************************************************************/
/************************ WEBCAM INPUT ****************************************/
/******************************************************************************/

var vidScale;

function updateCamElement() {
    if (config.SHOW_VIDEO) camVideo.style.opacity = config.VIDEO_OPACITY;
    else camVideo.style.opacity = 0;
}

function handleScreenResize() {
    vidScale = Math.max(window.innerWidth/camVideo.videoWidth,window.innerHeight/camVideo.videoHeight);

    // udpdate video overlay size
    camVideo.style.width  = camVideo.videoWidth *vidScale + "px";
    camVideo.style.height = camVideo.videoHeight*vidScale + "px";

    // update render canvas
    canv              = document.getElementById("canvas");
    ctx               = canv.getContext("2d");
    canv.width        = camVideo.videoWidth *vidScale*RES_RATIO;
    canv.height       = camVideo.videoHeight*vidScale*RES_RATIO;
    canv.style.width  = camVideo.videoWidth *vidScale + "px";
    canv.style.height = camVideo.videoHeight*vidScale + "px";
    ctx.fillStyle     = "blue";
    ctx.fillRect(0,0,canv.width,canv.height);
    ctx.fillStyle = "rgba(0,0,0,0.1)";
    ctx.strokeStyle = "white";
    ctx.fillStyle = "white";
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
                camVideo.width = camVideo.videoWidth;
                camVideo.height = camVideo.videoHeight;
                handleScreenResize();
                window.onresize = handleScreenResize;
                initFlow();
            }
        })
        .catch(function (err0r) {
            console.log("Something went wrong!");
        });
    }
}

/******************************************************************************/
/************************ DAT GUI THO *****************************************/
/******************************************************************************/

var gui;
var numToAddGui;

function initGUI() {
    gui = new dat.GUI();
    gui.domElement.style.zIndex = 100;

    let numPartsGui = gui.add(config,"NUM_PARTS",  10, 40000);
    numPartsGui.onFinishChange(initParts);
    numToAddGui = gui.add(config,"ADD_PER_FRAME", 10, config.NUM_PARTS);
    gui.add(config,"FADE")
    let showVidGui = gui.add(config,"SHOW_VIDEO").name("Show Overlay");
    showVidGui.onFinishChange(updateCamElement);
    let videoOpacGui = gui.add(config,"VIDEO_OPACITY", 0, 1).name("Overlay opacity");
    videoOpacGui.onFinishChange(updateCamElement);
    gui.add(config,"SHAPE", ["line", "dot"]);
    gui.add(config,"SPRING");
    let partMassGui = gui.add(config,"PART_MASS", 0, 2);
    partMassGui.onFinishChange(initParts);
}

/******************************************************************************/
/************************ INIT ************************************************/
/******************************************************************************/

function init() {
    // simplex = new SimplexNoise();
    initGUI();
    initParts();
    initCam();
    window.onresize = handleScreenResize;
}

window.onload = init;
