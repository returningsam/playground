importScripts("./opencv.js");

var oldFrame, curFrame, oldGray, curGray;
var pflow, flow;
var pyrScale, levels, winsize, iterations, polyN, polySigma, flags;

var fc = 0;

function processFlow() {
    flow.copyTo(pflow);
    // process frame at points
    cv.calcOpticalFlowFarneback(
        oldGray, curGray, // prev frame and new frame
        flow,           // prev points and new points
        pyrScale, levels, winsize, iterations, polyN, polySigma, flags
    );

    cv.addWeighted(flow,.2,pflow,0.8,0,flow);

    // move current frame to old frame
    curGray.copyTo(oldGray);
}

var frameHeight, frameWidth;

self.addEventListener('message', function (e) {
    let data = e.data;
    if (data.init) {
        pyrScale   = .5;
        levels     = 2;
        winsize    = 15;
        iterations = 1;
        polyN      = 5;
        polySigma  = 1.1;
        flags      = cv.OPTFLOW_USE_INITIAL_FLOW;

        frameWidth  = data.width
        frameHeight = data.height

        oldFrame = new cv.Mat(frameHeight, frameWidth, cv.CV_8UC4);
        curFrame = new cv.Mat(frameHeight, frameWidth, cv.CV_8UC4);
        flow     = new cv.Mat(frameHeight, frameWidth, cv.CV_32FC2);
        pflow    = new cv.Mat(frameHeight, frameWidth, cv.CV_32FC2);

        // init grayscale frame buffers
        oldGray  = new cv.Mat();
        curGray  = new cv.Mat();
    }
    else {
        let frameData = data.f;
        if (fc == 0) {
            oldFrame = cv.matFromArray(frameHeight, frameWidth, cv.CV_8UC4, frameData);
            cv.flip(oldFrame,oldFrame,1);
            cv.cvtColor(oldFrame, oldGray, cv.COLOR_RGB2GRAY);
            oldFrame.delete();

            let s = flow.size();
            let message = {height:s.height,width:s.width,flow: flow.data32F};
            self.postMessage(message);
        }
        else {
            curFrame = cv.matFromArray(frameHeight, frameWidth, cv.CV_8UC4, frameData);
            cv.flip(curFrame,curFrame,1);
            cv.cvtColor(curFrame, curGray, cv.COLOR_RGB2GRAY);

            processFlow();

            let s = flow.size();
            let message = {flow: flow.data32F};
            self.postMessage(message,[message.flow.buffer]);
        }
        fc++;
    }
}, false);

function checkReady() {
    if (cv.Mat)
        self.postMessage({cmd:"start"});
    else setTimeout(checkReady, 10);
}

function init() {
    checkReady();
}

init();
