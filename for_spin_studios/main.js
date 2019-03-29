const CANV_RATIO = 2;
const S_W_RATIO  = 0.5;
const S_H_RATIO  = 0.65;

const POINTS_1 = [
    {x: 1, y: 0},
    {x: 0, y: 0},
    {x: 0, y: 0.5},
];

const POINTS_2 = [
    {x: 0.45, y: 0.5},
    {x: 1,    y: 0.5},
    {x: 1,    y: 1},
    {x: 0,    y: 1},
];

var params= {
    numLevels:  20,
    easeTiming: 0.5,
    easing:     Circ.easeInOut,
    startStrokeColor: "#ffffff",
    startFillColor: "#000000",
    endStrokeColor:   "#ffffff",
    endFillColor:   "#000000",
    colorSinRepeat: 1,
    offsetAmmount: 0.7
}

var unit_segment = Math.min(window.innerHeight,window.innerWidth);
var sWidth       = S_W_RATIO*unit_segment*CANV_RATIO;
var sHeight      = S_H_RATIO*unit_segment*CANV_RATIO;

var sOrigin = {
    x: ( (window.innerWidth  * CANV_RATIO) - sWidth  ) / 2,
    y: ( (window.innerHeight * CANV_RATIO) - sHeight ) / 2,
};

var canv,
    ctx;


function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function hexToRgb(hex) {
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function(m, r, g, b) {
        return r + r + g + g + b + b;
    });

    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function blendColors(c1,c2,perc) {
    var c1rgb = hexToRgb(c1);
    var c2rgb = hexToRgb(c2);
    c1rgb.r = parseInt(c1rgb.r + perc * (c2rgb.r - c1rgb.r));
    c1rgb.g = parseInt(c1rgb.g + perc * (c2rgb.g - c1rgb.g));
    c1rgb.b = parseInt(c1rgb.b + perc * (c2rgb.b - c1rgb.b));
    return rgbToHex(c1rgb.r,c1rgb.g,c1rgb.b);
}

var convertPoint = (point) => ({
    x: sOrigin.x + point.x*sWidth,
    y: sOrigin.y + point.y*sHeight,
});

function prepPoints(points,offsetX,offsetY) {
    var newPoints = [];
    for (var i = 0; i < points.length; i++) {
        newPoints.push(convertPoint(points[i]));
        newPoints[i].x = parseFloat((newPoints[i].x + offsetX).toFixed(2));
        newPoints[i].y = parseFloat((newPoints[i].y + offsetY).toFixed(2));
    }
    return newPoints;
}

function drawEnd(endP,otherP,radius) {
    ctx.beginPath();
    if (endP.x == otherP.x) {
        if (endP.y < otherP.y) ctx.arc(endP.x, endP.y, radius, -Math.PI, 0, false);
        else ctx.arc(endP.x, endP.y, radius, 0, Math.PI, false);
    }
    else {

        if (endP.x < otherP.x) ctx.arc(endP.x, endP.y, radius, Math.PI/2, -Math.PI/2, false);
        else ctx.arc(endP.x, endP.y, radius, -Math.PI/2, Math.PI/2, false);
    }

    ctx.stroke();
    ctx.fill();
    ctx.closePath();
}

function drawCorner(cornerP,otherP0,otherP1,radius) {
    ctx.beginPath();
    if (cornerP.x > otherP0.x) {
        if (cornerP.y < otherP1.y) ctx.arc(cornerP.x, cornerP.y, radius, 3*Math.PI/2, 2*Math.PI, false);
        else ctx.arc(cornerP.x, cornerP.y, radius, Math.PI/2, Math.PI, false);
    }
    else {
        if (cornerP.y < otherP1.y) ctx.arc(cornerP.x, cornerP.y, radius, Math.PI, 3*Math.PI/2, false);
        else ctx.arc(cornerP.x, cornerP.y, radius, 0, Math.PI/2, false);
    }

    ctx.stroke();
    ctx.closePath();

    // fill corner
    ctx.beginPath();
    if (cornerP.x > otherP0.x) {
        if (cornerP.y < otherP1.y) ctx.arc(cornerP.x, cornerP.y, radius, 3*Math.PI/2, 2*Math.PI, false);
        else ctx.arc(cornerP.x, cornerP.y, radius, Math.PI/2, Math.PI, false);
    }
    else {
        if (cornerP.y < otherP1.y) ctx.arc(cornerP.x, cornerP.y, radius, Math.PI, 3*Math.PI/2, false);
        else ctx.arc(cornerP.x, cornerP.y, radius, 0, Math.PI/2, false);
    }
    ctx.lineTo(cornerP.x,cornerP.y);

    ctx.fill();
    ctx.closePath();
}

// corners key:
const TOP_RIGHT    = "TR";
const BOTTOM_RIGHT = "BR";
const TOP_LEFT     = "TL";
const BOTTOM_LEFT  = "BL";

function getCutCorners(points,ind) {
    corners = [];
    var a,b,c;

    // compute relevant points
    if (ind+2 < points.length) { // corner is at ind+1
        c = points[ind+1]; // corner
        b = points[ind];   // before
        a = points[ind+2]; // after

        if ((b.x < c.x && a.y > c.y) || (b.y < c.y && a.x > c.x)) corners.push(BOTTOM_RIGHT);
        if ((b.y > c.y && a.x > c.x) || (b.x < c.x && a.y < c.y)) corners.push(TOP_RIGHT);
        if ((b.x > c.x && a.y > c.y) || (b.y < c.y && a.x < c.x)) corners.push(BOTTOM_LEFT);
        if ((b.y > c.y && a.x < c.x) || (b.x > c.x && a.y < c.y)) corners.push(TOP_LEFT);
    }
    if (ind-1 >= 0) { // corner is at ind
        c = points[ind];   // corner
        b = points[ind-1]; // before
        a = points[ind+1]; // after

        if ((b.x < c.x && a.y > c.y) || (b.y < c.y && a.x > c.x)) corners.push(TOP_LEFT);
        if ((b.y > c.y && a.x > c.x) || (b.x < c.x && a.y > c.y)) corners.push(BOTTOM_LEFT);
        if ((b.x > c.x && a.y > c.y) || (b.y < c.y && a.x < c.x)) corners.push(TOP_RIGHT);
        if ((b.y > c.y && a.x < c.x) || (b.x > c.x && a.y < c.y)) corners.push(BOTTOM_RIGHT);
    }
    return corners;
}

function drawSegment(point0,point1,stroke,corners) {
    ctx.beginPath();
    if (point0.x == point1.x) { // vertical
        // compute left
        point0_left = {x: point0.x - stroke/2,y: point0.y,}
        point1_left = {x: point1.x - stroke/2,y: point1.y,}
        // compute right
        point0_right = {x: point0.x + stroke/2,y: point0.y,}
        point1_right = {x: point1.x + stroke/2,y: point1.y,}
        // cut off corners
        if (point0_left.y < point1_left.y ) { // going down
            if (corners.indexOf(TOP_LEFT)     > -1) point0_left.y  += stroke/2;
            if (corners.indexOf(TOP_RIGHT)    > -1) point0_right.y += stroke/2;
            if (corners.indexOf(BOTTOM_RIGHT) > -1) point1_right.y -= stroke/2;
            if (corners.indexOf(BOTTOM_LEFT)  > -1) point1_left.y  -= stroke/2;
        }
        else { // going up
            if (corners.indexOf(TOP_LEFT)     > -1) point1_left.y  += stroke/2;
            if (corners.indexOf(TOP_RIGHT)    > -1) point1_right.y += stroke/2;
            if (corners.indexOf(BOTTOM_RIGHT) > -1) point0_right.y -= stroke/2;
            if (corners.indexOf(BOTTOM_LEFT)  > -1) point0_left.y  -= stroke/2;
        }

        ctx.beginPath();
        ctx.moveTo(point0_left.x,point0_left.y);
        ctx.lineTo(point1_left.x,point1_left.y);
        ctx.moveTo(point0_right.x,point0_right.y);
        ctx.lineTo(point1_right.x,point1_right.y);
        ctx.stroke();
        ctx.closePath();

        // replace corners for fill
        if (point0_left.y < point1_left.y ) { // going down
            if (corners.indexOf(TOP_LEFT)     > -1) point0_left.y  -= stroke/2;
            if (corners.indexOf(TOP_RIGHT)    > -1) point0_right.y -= stroke/2;
            if (corners.indexOf(BOTTOM_RIGHT) > -1) point1_right.y += stroke/2;
            if (corners.indexOf(BOTTOM_LEFT)  > -1) point1_left.y  += stroke/2;
        }
        else { // going up
            if (corners.indexOf(TOP_LEFT)     > -1) point1_left.y  -= stroke/2;
            if (corners.indexOf(TOP_RIGHT)    > -1) point1_right.y -= stroke/2;
            if (corners.indexOf(BOTTOM_RIGHT) > -1) point0_right.y += stroke/2;
            if (corners.indexOf(BOTTOM_LEFT)  > -1) point0_left.y  += stroke/2;
        }

        ctx.beginPath();
        ctx.moveTo(point0_left.x,point0_left.y);
        ctx.lineTo(point1_left.x,point1_left.y);
        ctx.lineTo(point1_right.x,point1_right.y);
        ctx.lineTo(point0_right.x,point0_right.y);
        ctx.lineTo(point0_left.x,point0_left.y);
        ctx.fill();
        ctx.closePath();
    }
    else { // horizontal
        // compute top
        point0_top = {x: point0.x,y: point0.y- stroke/2,}
        point1_top = {x: point1.x,y: point1.y - stroke/2,}
        // compute bottom
        point0_bottom = {x: point0.x,y: point0.y + stroke/2,}
        point1_bottom = {x: point1.x,y: point1.y + stroke/2,}
        // cut off corners
        if (point0_top.x < point1_top.x ) { // going right
            if (corners.indexOf(TOP_LEFT)     > -1) point0_top.x    += stroke/2;
            if (corners.indexOf(TOP_RIGHT)    > -1) point1_top.x    -= stroke/2;
            if (corners.indexOf(BOTTOM_RIGHT) > -1) point1_bottom.x -= stroke/2;
            if (corners.indexOf(BOTTOM_LEFT)  > -1) point0_bottom.x += stroke/2;
        }
        else { // going left
            if (corners.indexOf(TOP_LEFT)     > -1) point1_top.x    += stroke/2;
            if (corners.indexOf(TOP_RIGHT)    > -1) point0_top.x    -= stroke/2;
            if (corners.indexOf(BOTTOM_RIGHT) > -1) point0_bottom.x -= stroke/2;
            if (corners.indexOf(BOTTOM_LEFT)  > -1) point1_bottom.x += stroke/2;
        }

        ctx.beginPath();
        ctx.moveTo(point0_top.x,point0_top.y);
        ctx.lineTo(point1_top.x,point1_top.y);
        ctx.moveTo(point0_bottom.x,point0_bottom.y);
        ctx.lineTo(point1_bottom.x,point1_bottom.y);
        ctx.stroke();
        ctx.closePath();

        // replace corners for fill
        if (point0_top.x < point1_top.x ) { // going right
            if (corners.indexOf(TOP_LEFT)     > -1) point0_top.x    -= stroke/2;
            if (corners.indexOf(TOP_RIGHT)    > -1) point1_top.x    += stroke/2;
            if (corners.indexOf(BOTTOM_RIGHT) > -1) point1_bottom.x += stroke/2;
            if (corners.indexOf(BOTTOM_LEFT)  > -1) point0_bottom.x -= stroke/2;
        }
        else { // going left
            if (corners.indexOf(TOP_LEFT)     > -1) point1_top.x    -= stroke/2;
            if (corners.indexOf(TOP_RIGHT)    > -1) point0_top.x    += stroke/2;
            if (corners.indexOf(BOTTOM_RIGHT) > -1) point0_bottom.x += stroke/2;
            if (corners.indexOf(BOTTOM_LEFT)  > -1) point1_bottom.x -= stroke/2;
        }

        ctx.beginPath();
        ctx.moveTo(point0_top.x,point0_top.y);
        ctx.lineTo(point1_top.x,point1_top.y);
        ctx.lineTo(point1_bottom.x,point1_bottom.y);
        ctx.lineTo(point0_bottom.x,point0_bottom.y);
        ctx.lineTo(point0_top.x,point0_top.y);
        ctx.fill();
        ctx.closePath();
    }
}

function drawLevel(points,stroke,offsetX,offsetY) {
    points = prepPoints(points,offsetX,offsetY);

    for (var i = 0; i < points.length-1; i++)
        drawSegment(points[i],points[i+1],stroke,getCutCorners(points,i));

    // draw corners
    for (var i = 1; i < points.length-1; i++)
        drawCorner(points[i],points[i-1],points[i+1],stroke/2);

    // draw the caps of the lines
    drawEnd(points[0],points[1],stroke/2);
    drawEnd(points[points.length-1],points[points.length-2],stroke/2);
}

function newDrawing(offsetX,offsetY) {
    var stroke = unit_segment/2.5;
    for (var i = 0; i < params.numLevels; i++) {
        var levelStroke = stroke * (1 - i/params.numLevels);
        var levelMaxOffset = (stroke/2) * (i/params.numLevels);
        ctx.strokeStyle = blendColors(params.startStrokeColor,params.endStrokeColor,Math.abs(Math.sin(params.colorSinRepeat*(i/params.numLevels)*0.5*Math.PI)));
        ctx.fillStyle = blendColors(params.startFillColor,params.endFillColor,Math.abs(Math.sin(params.colorSinRepeat*(i/params.numLevels)*0.5*Math.PI)));
        drawLevel(POINTS_1,levelStroke,offsetX*levelMaxOffset,offsetY*levelMaxOffset);
        drawLevel(POINTS_2,levelStroke,offsetX*levelMaxOffset,offsetY*levelMaxOffset);
    }
}

function initCanvas() {
    canv = document.getElementById("canvas");
    ctx = canv.getContext("2d");
    canv.width = window.innerWidth * CANV_RATIO;
    canv.height = window.innerHeight * CANV_RATIO;
    ctx.strokeStyle = "white";
    ctx.fillStyle = "green";
    ctx.lineWidth = 2 * CANV_RATIO;
}

function handleResize() {
    unit_segment = Math.min(window.innerHeight,window.innerWidth);
    sWidth       = S_W_RATIO*unit_segment*CANV_RATIO;
    sHeight      = S_H_RATIO*unit_segment*CANV_RATIO;
    sOrigin = {
        x: ( (window.innerWidth  * CANV_RATIO) - sWidth  ) / 2,
        y: ( (window.innerHeight * CANV_RATIO) - sHeight ) / 2,
    };
    initCanvas();
    newDrawing(0,0);
}

var targDiff;
var curDiff;

var curTween;

function updateCurDiff() {
    ctx.clearRect(0,0,canv.width,canv.height);
    newDrawing(params.offsetAmmount*curDiff.x/(window.innerWidth-(window.innerWidth/2)),params.offsetAmmount*curDiff.y/(window.innerHeight-(window.innerHeight/2)));
}

function handleMouseMove(ev) {
    if (!targDiff) targDiff = {};
    if (!curDiff) curDiff = {};
    targDiff.x = ev.pageX - (window.innerWidth/2);
    targDiff.y = ev.pageY - (window.innerHeight/2);
    if (TweenMax.isTweening(curTween)) {
        TweenMax.updateTo(targDiff,true);
    }
    else {
        curTween = TweenMax.to(curDiff, params.easeTiming, {
            x: targDiff.x,
            y: targDiff.y,
            onUpdate: updateCurDiff,
            easing: params.easing
        });
    }
}

var gui;

function initGui() {
    gui = new dat.GUI({name: 'Hello Spin',autoPlace:true});
    gui.add(params, 'numLevels', 2, 30);
    gui.add(params, 'easeTiming', 0.01, 2);

    var easingOptions = {
        Circ:   Circ.easeInOut,
        Linear: Linear.easeInOut,
        Quad:   Quad.easeInOut,
        Quint:  Quint.easeInOut,
        Power0: Power0.easeInOut,
        Power1: Power1.easeInOut,
        Power2: Power2.easeInOut,
        Power3: Power3.easeInOut,
        Strong: Strong.easeInOut,
    }
    gui.add(params, 'easing', easingOptions);

    gui.addColor(params, 'startStrokeColor');
    gui.addColor(params, 'startFillColor');
    gui.addColor(params, 'endStrokeColor');
    gui.addColor(params, 'endFillColor');
    gui.add(params, 'colorSinRepeat', 1, 50);
    gui.add(params, 'offsetAmmount', 0, 3);
}

function init() {
    initGui();
    initCanvas();
    newDrawing(0,0);
    window.addEventListener("mousemove",handleMouseMove);
}

window.onresize = handleResize;
window.onload = init;
