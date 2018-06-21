/******************************************************************************/
/************************** GLOBALS *******************************************/
/******************************************************************************/

var myRequestAnimationFrame =  window.requestAnimationFrame ||
              window.webkitRequestAnimationFrame ||
              window.mozRequestAnimationFrame    ||
              window.oRequestAnimationFrame      ||
              window.msRequestAnimationFrame     ||
              function(callback) {setTimeout(callback, 1)};

/******************************************************************************/
/************************** HELPER FUNCTIONS **********************************/
/******************************************************************************/

Number.prototype.mod = function(n) {
    return ((this%n)+n)%n;
};

function stringToElement(htmlString) {
    var div = document.createElement('div');
    div.innerHTML = htmlString.trim();
    return div.firstChild;
}

function elementToString(element) {
    var div = document.createElement('div');
    div.appendChild(element);
    return div.innerHTML;
}

function getDist(x1,y1,x2,y2) {
    var a = x1 - x2;
    var b = y1 - y2;
    return Math.sqrt((a*a)+(b*b));
}

function angle(x1, y1, x2, y2) {
    var dy = y2 - y1;
    var dx = x2 - x1;
    var theta = Math.atan2(dy, dx);
    theta *= 180 / Math.PI;
    return theta;
}

function getVector(x,y,r,d){
    return [x+Math.cos(r)*d,y+Math.sin(r)*d];
}

function indToCoord(i) {
    i = i / 4;
    var y = parseInt(i / width, 10);
    var x = i - y * width;
    return [x,y];
}

function coordToInd(x,y) {
    return (x + (y * width))*4;
}

/******************************************************************************/
/************************** WET ***********************************************/
/******************************************************************************/
const CONNECT = false;

const CANV_RATIO = 2;
const GRAV_DIST_MULT = 3.5;

var canvas;
var context;

var tempCanvas;
var tempContext;

const colorPallete = ["#000000", "#050505", "#101010", "#151515", "#202020", "#252525"];

var width,
    height,
    wetSrc,
    circles = [],
    wetEnabled = false,
    wetEl,
    wetInterval;

var temp_circles;

var slow = false;

window.onresize = function() {
    width = canvas.width = tempCanvas.width = window.innerWidth * CANV_RATIO;
    height = canvas.height = tempCanvas.height = window.innerHeight * CANV_RATIO;
    wetSrc.x = width / 2;
    wetSrc.y = height / 2;
}

class Circle {
    constructor(setx,sety,setr) {
        this.x = (setx ? setx : wetSrc.x);
        this.y = (sety ? sety : wetSrc.y);
        this.angle = Math.PI * 2 * Math.random();
        var speed = 1.5 + Math.random();
        this.vx = speed * Math.cos(this.angle) * CANV_RATIO;
        this.vy = speed * Math.sin(this.angle) * CANV_RATIO;
        // this.vx = 0;
        // this.vy = 0;

        this.r  = 200//(setr ? setr : ((50 + (100 * Math.random())) * CANV_RATIO));

        this.fc = "white";
        this.sc = false;
    }

    equals(c) {
        return this.x     == c.x     && this.y  == c.y &&
               this.angle == c.angle && this.r  == c.r &&
               this.vx    == c.vx    && this.vy == c.vy;
    }

    update() {
        var ctrl = 100;
        this.x += this.vx/5;
        this.y += this.vy/5;
        var rad2ed = Math.pow(this.r,2);

        // apply gravity
        // for (var i = 0; i < temp_circles.length; i++) {
        //     var b = temp_circles[i];
        //     if (this.equals(b)) continue;
        //     var d = getDist(this.x,this.y,b.x,b.y);
        //     const maxDist = this.r + b.r * GRAV_DIST_MULT;
        //     var brad2 = Math.pow(b.r,2);
        //     if (d < maxDist) {
        //         var mult = Math.pow((maxDist-d)/maxDist,2) * 0.01;
        //         this.vx += ((b.x - this.x) * mult * (brad2 / rad2ed));
        //         this.vy += ((b.y - this.y) * mult * (brad2 / rad2ed));
        //     }
        //     else return;
        // }
    }

    render() {
        tempContext.beginPath();

        tempContext.arc(this.x, this.y, Math.max(0,this.r), 0, Math.PI * 2, true);

        if (this.fc) {
            tempContext.fillStyle = this.fc;
            tempContext.fill();
        }
        if (this.sc) {
            tempContext.strokeStyle = this.sc;
            tempContext.stroke();
        }

        tempContext.closePath();
    }

    connect(b,d,m) {
        if (this.r === 0 || b.r === 0) return;

        // Generate the connector path
        tempContext.beginPath();

        tempContext.moveTo(this.x,this.y);
        tempContext.lineTo(b.x,b.y);
        tempContext.stroke();
        tempContext.closePath();
    }
}

function removeCircles() {
    for (var i = 0; i < circles.length; i++) {
        var b = circles[i];
        if ( b.x + (b.r*2) < 0 || b.x - (b.r*2) > width || b.y + (b.r*2) < 0 ||  b.y - (b.r*2) > height || b.r < 0)
            circles.splice(i, 1);
    }
}

function newCurve(sx,sy,c1x,c1y,c2x,c2y,fx,fy) {
    return [sx,sy,c1x,c1y,c2x,c2y,fx,fy]
}

var curRender = 0;

function renderCircles() {
    curRender++;

    context.clearRect(0, 0, width, height);
    tempContext.clearRect(0, 0, width, height);

    var connected = {};

    for (var i = 0; i < circles.length; i++) {
        var a = circles[i];

        a.render();

        temp_circles = circles.slice()
            .sort((b,c) => (getDist(a.x,a.y,b.x,b.y) -
                            getDist(a.x,a.y,c.x,c.y)));

        for (var j = 0; j < temp_circles.length && CONNECT; j++) {
            if (j == i || (connected[i] && connected[i].indexOf(j) >= 0)) continue;
            var b = temp_circles[j];
            var d = getDist(a.x,a.y,b.x,b.y);
            var maxDist = a.r + b.r * GRAV_DIST_MULT;
            if (d > maxDist) break;
            a.connect(b,d,maxDist);
            if (!connected[i]) connected[i] = [];
            connected[i].push(j);
        }

        a.update();
    }

    // draw circle from click
    if (tempCirc) {
        tempContext.beginPath();

        tempContext.arc(tempCirc.x, tempCirc.y, Math.max(0,tempCirc.r), 0, Math.PI * 2, true);

        tempContext.fillStyle = "white";
        tempContext.fill();
        tempContext.closePath();
    }

    var imgData = tempContext.createImageData(width,height);
    var tempImgData = tempContext.getImageData(0,0,width,height);
    var adsfasdfadsf = 0;
    for (var i = 0; i < imgData.data.length; i+=4) {
        if (tempImgData.data[i+3] < 255) continue;
        adsfasdfadsf++;
        var coord = indToCoord(i);
        var x = Math.round(coord[0] + (dispMap[coord[1]][coord[0]][0] * 30));
        var y = Math.round(coord[1] + (dispMap[coord[1]][coord[0]][1] * 30));

        var newI = coordToInd(x,y);
        if (i == newI) continue;
        imgData.data[newI]   = tempImgData.data[i]
        imgData.data[newI+1] = tempImgData.data[i+1]
        imgData.data[newI+2] = tempImgData.data[i+2]
        imgData.data[newI+3] = tempImgData.data[i+3]
    }
    // console.log("num: " + adsfasdfadsf);

    context.putImageData(imgData,0,0);

    removeCircles();
    if (slow) {
        setTimeout(function () {
            myRequestAnimationFrame(renderCircles);
        }, 1000);
    }
    else myRequestAnimationFrame(renderCircles);
}

const maxRad = 200;
const minRad = 10;
const radDelta = 0.5;

var curClickRad = minRad;
var radDir = 1;
var clickHandlerInterval;
var tempCirc = false;

function clickHandlerStep() {
    curClickRad += radDelta * radDir;
    if (curClickRad > maxRad || curClickRad < minRad) radDir *= -1;
    tempCirc = {
        r: curClickRad,
        x: wetSrc.x,
        y: wetSrc.y
    }
}

function startClickHandler(ev) {
    clickHandlerInterval = setInterval(clickHandlerStep, 10);
}

function endClickHandler(ev) {
    if (clickHandlerInterval) clearInterval(clickHandlerInterval);
    circles.push(new Circle(tempCirc.x,tempCirc.y,tempCirc.r));
    radDir = 1;
    tempCirc = false;
    curClickRad = minRad;
}

function startWet() {
    if (!wetSrc) {
        wetSrc = {
            x: width / 2,
            y: height / 2
        }
    }
    document.getElementById("canvas").classList.remove("hidden");
    wetEnabled = true;
    renderCircles();
    wetEl.addEventListener("mousemove",handleWetMouseMove);
    wetEl.addEventListener("mousedown",startClickHandler);
    wetEl.addEventListener("mouseup",endClickHandler);
}

function handleWetMouseMove(ev) {
    if (!wetSrc) {wetSrc = {x: width / 2,y: height / 2}}
    wetSrc.x = ev.clientX * CANV_RATIO;
    wetSrc.y = ev.clientY * CANV_RATIO;
    if (ev.ctrlKey && wetEnabled && chance.bool({liklihood: 0.99})) {
        circles.push(new Circle());
    }
}

function stopWet() {
    wetEnabled = false;
}

function initWet() {
    wetEl = document.body;
    startWet();
}

function initCanvas() {
    canvas  = document.getElementById("canvas");
    context = canvas.getContext("2d");
    width = canvas.width = window.innerWidth * CANV_RATIO;
    height = canvas.height = window.innerHeight * CANV_RATIO;


    tempCanvas  = document.createElement("canvas");
    tempContext = tempCanvas.getContext("2d");
    tempCanvas.width   = width;
    tempCanvas.height = height;

    generateDisplacementMap();
}

/******************************************************************************/
/************************** DISPLACEBMENT MAP *********************************/
/******************************************************************************/

var dispMap;

function generateDisplacementMap() {
    dispMap = [];
    var mod1 = chance.integer({min:10,max:50});
    var mod2 = chance.integer({min:10,max:50});
    for (var y = 0; y < height; y++) {
        dispMap.push([]);
        for (var x = 0; x < width; x++) {
            dispMap[y].push([]);
            dispMap[y][x] = [noise.perlin2(x*mod1/width,y*mod1/height),noise.perlin2(x*mod2/width,y*mod2/height)];
        }
    }
    console.log(dispMap);
}

/******************************************************************************/
/************************** INITIALIZATION ************************************/
/******************************************************************************/

function init() {
    initCanvas();
    initWet();
}

window.onload = init;
