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

const CANV_RATIO = 0.9;
const MAX_GRAV_DIST = 100;

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
    constructor() {
        this.x = wetSrc.x * CANV_RATIO;
        this.y = wetSrc.y * CANV_RATIO;
        this.angle = Math.PI * 2 * Math.random();
        var speed = 1.5 + Math.random();
        this.vx = speed * Math.cos(this.angle) * CANV_RATIO;
        this.vy = speed * Math.sin(this.angle) * CANV_RATIO;

        // this.xr = 6 + 50 * Math.random() * CANV_RATIO;
        // this.yr = 6 + 50 * Math.random() * CANV_RATIO;
        this.r  = 50 * Math.random() * CANV_RATIO;
    }

    equals(c) {
        return this.x     == c.x     && this.y  == c.y   &&
               this.angle == c.angle && this.r  == c.r   &&
               this.vx    == c.vx    && this.vy == c.vy;
    }

    update() {
        var ctrl = 100;
        this.x += this.vx;
        this.y += this.vy;
        this.r -= 0.1;

        // apply gravity
        for (var i = 0; i < circles.length; i++) {
            var b = circles[i];
            if (this.equals(b)) continue;
            var d = getDist(this.x,this.y,b.x,b.y);
            if (d < MAX_GRAV_DIST) {
                var mult = ((MAX_GRAV_DIST-d)/MAX_GRAV_DIST) * 0.0001;
                this.vx += (b.x - this.x) * (b.r + this.r) * mult;
                this.vy += (b.y - this.y) * (b.r + this.r) * mult;
            }
        }
        // this.vy += 0.1;
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

function drawConnection(x1,y1,rad1, x2,y2,rad2, handleSize=1.5, v=2) {
    const HALF_PI = Math.PI / 2;
    const d = getDist(x1,y1,x2,y2);
    const maxDist = rad1 + rad2 * 3;
    let u1, u2;

    // No blob if a radius is 0
    // or if distance between the circles is larger than max-dist
    // or if circle2 is completely inside circle1
    if (rad1 === 0 || rad2 === 0 || d > maxDist || d <= Math.abs(rad1 - rad2)) return;

    // Calculate u1 and u2 if the circles are overlapping
    if (d < rad1 + rad2) {
        u1 = Math.acos((rad1 * rad1 + d * d - rad2 * rad2) / (2 * rad1 * d));
        u2 = Math.acos((rad2 * rad2 + d * d - rad1 * rad1) / (2 * rad2 * d));
    }
    else { // Else set u1 and u2 to zero
        u1 = 0;
        u2 = 0;
    }

    // Calculate the max spread
    const angleBetweenCenters = angle(x2,y2, x1,y1);
    const maxSpread = Math.cos((rad1 - rad2) / d);
    // Angles for the points
    const angle4 = angleBetweenCenters + u1 + (maxSpread - u1) * v;
    const angle3 = angleBetweenCenters - u1 - (maxSpread - u1) * v;
    const angle2 = angleBetweenCenters + Math.PI - u2 - (Math.PI - u2 - maxSpread) * v;
    const angle1 = angleBetweenCenters - Math.PI + u2 + (Math.PI - u2 - maxSpread) * v;

    // Point locations
    const p1 = getVector(x1,y1, angle1, rad1);
    const p2 = getVector(x1,y1, angle2, rad1);
    const p3 = getVector(x2,y2, angle3, rad2);
    const p4 = getVector(x2,y2, angle4, rad2);

    // Define handle length by the distance between both ends of the curve
    const totalRadius = rad1 + rad2;
    const d2Base = Math.min(v * handleSize, getDist(p1[0],p1[1], p3[0],p3[1]) / totalRadius);
    // Take into account when circles are overlapping
    const d2 = d2Base * Math.min(1, d * 2 / (rad1 + rad2));

    // Length of the handles
    const r1 = rad1 * d2;
    const r2 = rad2 * d2;

    // Handle locations
    const h1 = getVector(p1[0],p1[1], angle1 - HALF_PI, r1);
    const h2 = getVector(p2[0],p2[1], angle2 + HALF_PI, r1);
    const h3 = getVector(p3[0],p3[1], angle3 + HALF_PI, r2);
    const h4 = getVector(p4[0],p4[1], angle4 - HALF_PI, r2);

    // Generate the connector path
    context.beginPath();

    context.moveTo(x1,y1);
    context.lineTo(x2,y2);


    context.stroke();
    context.closePath();
}

function renderCircles() {

    context.fillStyle = "rgba(0,0,0,0.05)";
    context.fillRect(0, 0, width, height);

    for (var i = 0; i < circles.length; i++) {
        var a = circles[i];
        // context.beginPath();
        //
        // context.arc(a.x, a.y, Math.max(0,a.r), 0, Math.PI * 2, true);
        //
        // context.fill();
        // context.closePath();

        context.fillStyle = context.strokeStyle = "white";
        for (var j = i+1; j < circles.length; j++) {
            var b = circles[j];
            drawConnection(a.x,a.y,a.r, b.x,b.y,b.r);
        }

        a.update();
    }

    removeCircles();
    if (slow) {
        setTimeout(function () {
            myRequestAnimationFrame(renderCircles);
        }, 1000);
    }
    else myRequestAnimationFrame(renderCircles);
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
}

function handleWetMouseMove(ev) {
    if (!wetSrc) {
        wetSrc = {
            x: width / 2,
            y: height / 2
        }
    }
    wetSrc.x = ev.clientX;
    wetSrc.y = ev.clientY;
    if (wetEnabled && chance.bool({liklihood: 0.99})) {
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
    context.strokeStyle = "blue";
    context.lineWidth = 2;
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
