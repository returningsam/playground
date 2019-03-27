const RES_RATIO = 1;
const VID_SCALE = .15;

var config =  {
    THRESHOLD:     7.5,
    GRAVITY_X:     0,
    GRAVITY_Y:     -9.8,
    DUST_MASS:     .25,
    DRAW_TAIL:     true,
    SHOW_VIDEO:    true,
    VIDEO_OPACITY: 0.25,
    NUM_PARTS:     20000,
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

/******************************************************************************/
/************************ PARTICLES *******************************************/
/******************************************************************************/

var curParts;

function drawParts() {
    ctx.clearRect(0,0,canv.width,canv.height);
    ctx.beginPath();
    for (var i = 0; i < curParts.length; i++) curParts[i].draw(ctx);
    ctx.stroke();
    ctx.closePath();
}

function fillParts() {
    let toAdd = config.NUM_PARTS - curParts.length;
    for (var i = 0; i < toAdd; i++) {
        curParts.push(new Particle(
            chance.floating({min:0,max:canv.width}),
            chance.floating({min:0,max:canv.height}),
            0,0, // u,v
            1,   // mass
            0,0, // gravit x,y
            0,canv.width,
            0,canv.height
        ));
    }
}

function initParts() {
    curParts = [];
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
        curParts[i].u += curVec.u*.3;
        curParts[i].v += curVec.v*.3;
        if (!curParts[i].update()) {
            curParts.splice(i,1);
            i--;
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
var flowWorker;
var inpFrame, curFrame;
var flow

function flowLookup(x,y) {
    // scale coord to video size
    x = Math.floor(x*VID_SCALE/vidScale);
    y = Math.floor(y*VID_SCALE/vidScale);

    if (flow && x > 0 && x < camVideo.width && y > 0 && y < camVideo.height) {
        return {
            u: flow.floatAt(y,x*2),
            v: flow.floatAt(y,x*2+1)
        }
    }
    else return {u: 0,v: 0};
}

function readFrame() {
    vidCap.read(inpFrame);
    cv.resize(inpFrame,curFrame,curFrame.size(),0,0,cv.INTER_AREA);
}
function sendFrame(frame) {
    let message = {
        f: frame.data
    }
    flowWorker.postMessage(message,[message.f.buffer]);
}

function sendSize(frame) {
    let message = {
        init:true,
        height:camVideo.height*VID_SCALE,
        width:camVideo.width*VID_SCALE,
    }
    flowWorker.postMessage(message);
}

function processFlow() {
    // read current frame and convert to grayscale
    readFrame();
    sendFrame(curFrame);
}

function updateFlow(data) {
    flow = cv.matFromArray( camVideo.height*VID_SCALE, camVideo.width*VID_SCALE, cv.CV_32FC2, data.flow);
}

function handleWorkerMessage(e) {
    if (e.data.cmd == "start") {
        console.log("worker ready");
        initFlow();
    }
    else {
        updateFlow(e.data);
        processFlow();
    }
}

function initFlow() {
    // init frame buffer
    inpFrame = new cv.Mat(camVideo.height, camVideo.width, cv.CV_8UC4);
    curFrame = new cv.Mat(camVideo.height*VID_SCALE, camVideo.width*VID_SCALE, cv.CV_8UC4);

    sendSize(curFrame);

    // start steam
    vidCap = new cv.VideoCapture(camVideo);

    processFlow();
    animate();
}

function initFlowWorker() {
    flowWorker = new Worker('./cv_worker.js');
    flowWorker.addEventListener("message",handleWorkerMessage,false);
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
                initFlowWorker();
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
