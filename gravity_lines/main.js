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

/******************************************************************************/
/************************** WET ***********************************************/
/******************************************************************************/

const CANV_RATIO = 0.8;
const GRAV_DIST_MULT = 2.5;

var canvas;
var context;

const colorPallete = ["#000000", "#050505", "#101010", "#151515", "#202020", "#252525"];

var width,
    height,
    wetSrc,
    circles = [],
    wetEnabled = false,
    wetEl,
    wetInterval;

var buffer = [];

var slow = false;

window.onresize = function() {
    width = canvas.width = window.innerWidth * CANV_RATIO;
    height = canvas.height = window.innerHeight * CANV_RATIO;
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

        this.r  = (setr ? setr : ((10 + (50 * Math.random())) * CANV_RATIO));
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

        // sort circles by distance to current circle

        var temp_circles = circles.slice()
            .sort((a,b) => (getDist(this.x,this.y,a.x,a.y) -
                            getDist(this.x,this.y,b.x,b.y)));
        // apply gravity
        for (var i = 0; i < temp_circles.length; i++) {
            var b = temp_circles[i];
            if (this.equals(b)) continue;
            var d = getDist(this.x,this.y,b.x,b.y);
            const maxDist = this.r + b.r * GRAV_DIST_MULT;
            var brad2 = Math.pow(b.r,2);
            if (d < maxDist) {
                var mult = Math.pow((maxDist-d)/maxDist,2) * 0.01;
                this.vx += ((b.x - this.x) * mult * (brad2 / rad2ed));
                this.vy += ((b.y - this.y) * mult * (brad2 / rad2ed));
            }
            else return;
        }
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

function drawConnection(x1,y1,rad1, x2,y2,rad2) {
    const d = getDist(x1,y1,x2,y2);
    const maxDist = rad1 + rad2 * GRAV_DIST_MULT;
    if (rad1 === 0 || rad2 === 0 || d > maxDist) return;

    // Generate the connector path
    context.beginPath();

    context.moveTo(x1,y1);
    context.lineTo(x2,y2);


    context.stroke();
    context.closePath();
}

var curRender = 0;

function renderCircles() {
    curRender++;

    context.fillStyle = "rgba(0,0,0,1)";
    // context.fillStyle = "white";
    context.fillRect(0, 0, width, height);

    for (var i = 0; i < circles.length; i++) {
        var a = circles[i];

        context.beginPath();

        context.arc(a.x, a.y, Math.max(0,a.r), 0, Math.PI * 2, true);

        context.fillStyle = "black";
        context.fill();
        context.stroke();
        context.closePath();

        context.fillStyle = context.strokeStyle = "white";
        for (var j = i+1; j < circles.length; j++) {
            var b = circles[j];
            drawConnection(a.x,a.y,a.r, b.x,b.y,b.r);
        }

        a.update();
    }

    if (tempCirc) {
        context.beginPath();

        context.arc(tempCirc.x, tempCirc.y, Math.max(0,tempCirc.r), 0, Math.PI * 2, true);

        context.fillStyle = "white";
        context.fill();
        // context.stroke();
        context.closePath();
    }

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
    context.fillStyle = "white";
    context.fillRect(0,0,width,height);
    context.fillStyle = "rgba(0,0,0,0.07)";
    for (var i = 0; i < 100; i++) context.fillRect(0,0,width,height);
}

/******************************************************************************/
/************************** INITIALIZATION ************************************/
/******************************************************************************/

function init() {
    initCanvas();
    initWet();
}

window.onload = init;
