const RES_RATIO = 1;
const ZRES_RATIO = .1;

var config =  {
    THRESHOLD:     7.5,
    GRAVITY_X:     0,
    GRAVITY_Y:     -9.8,
    DUST_MASS:     .25,
    DRAW_TAIL:     true,
    SHOW_VIDEO:    true,
    VIDEO_OPACITY: 0.25,
    NUM_PARTS:     500,
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

/******************************************************************************/
/************************ PARTICLES *******************************************/
/******************************************************************************/

var curParts;

function drawParts() {
    ctx.fillStyle = "rgba(0,0,0,0.1)";
    ctx.clearRect(0,0,canv.width,canv.height);
    ctx.strokeStyle = "white";
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

    // update input point matrix
    p0 = new cv.Mat(curParts.length, 1, cv.CV_32FC2);
    for (var i = 0; i < curParts.length; i++) {
        p0.data32F[i*2]   = Math.round(curParts[i].x / vidScale);
        p0.data32F[i*2+1] = Math.round(curParts[i].y / vidScale);
    }

    // run flow processing
    let mVecs = processFlow();
    for (var i = 0; i < curParts.length; i++) {
        curParts[i].u -= curParts[i].u*.05;
        curParts[i].v -= curParts[i].v*.05;
        curParts[i].u += mVecs[i].u*.2;
        curParts[i].v += mVecs[i].v*.2;
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
var oldFrame, curFrame, oldGray, curGray;
var flowCriteria;
var p0, p1, st, err, winSize, maxLevel;

function processFlow() {
    // read current frame and convert to grayscale
    vidCap.read(curFrame);
    cv.flip(curFrame,curFrame,1);
    cv.cvtColor(curFrame, curGray, cv.COLOR_RGBA2GRAY);

    // process frame at points
    cv.calcOpticalFlowPyrLK(
        oldGray, curGray, // prev frame and new frame
        p0, p1,           // prev points and new points
        st, err,
        winSize, maxLevel,
        flowCriteria
    );

    // select good points
    let mVecs = [];
    for (let i = 0; i < st.rows; i++) {
        if (st.data[i] === 1) { // usefull flow data found
            let curVec = {
                u: p1.data32F[i*2]   - p0.data32F[i*2],
                v: p1.data32F[i*2+1] - p0.data32F[i*2+1]
            };
            if (length(curVec) >= config.THRESHOLD) {
                mVecs.push(curVec);
                continue;
            }
        }
        mVecs.push({u: 0,v: 0}); // bad flow data at point: no movement
    }

    // move current frame to old frame
    curGray.copyTo(oldGray);
    return mVecs;
}

function initFlow() {
    // init params
    flowCriteria = new cv.TermCriteria(cv.TERM_CRITERIA_EPS | cv.TERM_CRITERIA_COUNT, 10, 0.03);
    p0       = new cv.Mat();
    p1       = new cv.Mat();
    st       = new cv.Mat();
    err      = new cv.Mat();
    winSize  = new cv.Size(20, 20);
    maxLevel = 2;

    // connect video stream to cv
    vidCap = new cv.VideoCapture(camVideo);

    // init color frame buffers
    oldFrame = new cv.Mat(camVideo.height, camVideo.width, cv.CV_8UC4);
    curFrame = new cv.Mat(camVideo.height, camVideo.width, cv.CV_8UC4);


    // init grayscale frame buffers
    oldGray  = new cv.Mat();
    curGray  = new cv.Mat();

    // read current frame into oldFrame and convert to grayscale
    vidCap.read(oldFrame);
    cv.flip(oldFrame,oldFrame,1);
    cv.cvtColor(oldFrame, oldGray, cv.COLOR_RGB2GRAY);

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
