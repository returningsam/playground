
const CANV_RATIO    = 1;
const LINE_WIDTH    = 5 * CANV_RATIO;
const A_GOOD_PRIME  = 7;

const PADDING_X     = 50;
const PADDING_Y     = 0;

const LINE_POS_DIFF = 0.0005;
const LINE_COL_DIFF = 0.001;
const LINE_COL_SAT  = 0.1;
const NUM_LINES     = 3500;
const TIME_STEP     = 0.002;

const DRAW_CIRCLES_INSTEAD = false;

var canv, ctx;
var pCanv, pCtx;

var mousePoint;
var lastMousePoint;
var edgePoints;
var simplex = new SimplexNoise();
var started = false;

function randInt(min,max) {return chance.integer({min: min, max: max});}

function randFloat(min,max) {return chance.floating({min: min, max: max});}

function distance(p1,p2) {
    return Math.sqrt(Math.pow(p1[0]-p2[0],2) + Math.pow(p1[1]-p2[1],2));
}

function dualConversion(entity) {
    return [entity[0],-entity[1]];
}

function findMidpoint(p1,p2) {
    return [
        p1[0] + (p2[0]-p1[0])/2,
        p1[1] + (p2[1]-p1[1])/2
    ]
}

function findIntersection(l1,l2) {
    var x = (l2[1]-l1[1])/(l1[0]-l2[0]);
    var y = (l1[0]*x) + l1[1];
    return [x,y];
}

function getRandPointOnLine(line,minWidth,maxWidth,minHeight,maxHeight) {
    var x = randFloat(minWidth,maxWidth);
    var y = (line[0]*x) + line[1];
    while (y < minHeight || y > maxHeight) {
        x = randFloat(minWidth,maxWidth);
        y = (line[0]*x) + line[1];
    }
    return [x,y];
}

function pointsToLine(p1,p2) {
    var a = (p2[1]-p1[1])/(p2[0]-p1[0]);
    var b = p1[1]-(a*p1[0]);
    return [a,b];
}

function newRandPoint(minWidth,maxWidth,minHeight,maxHeight) {
    var x = randFloat(minWidth,maxWidth);
    var y = randFloat(minHeight,maxHeight);
    return [x,y];
}

function newRandLine(minWidth,maxWidth,minHeight,maxHeight) {
    var p1 = newRandPoint(minWidth,maxWidth,minHeight,maxHeight);
    var p2 = newRandPoint(minWidth,maxWidth,minHeight,maxHeight);
    return pointsToLine(p1,p2);
}

function drawPoint(point,radius,color) {
    ctx.fillStyle = (color ? color : "red");
    ctx.beginPath();
    ctx.arc(point[0],point[1],(radius ? radius : 5)*CANV_RATIO,0,2*Math.PI);
    ctx.fill();
    ctx.closePath();
}

function drawLineHelper(line) {
    p1x = -canv.width;
    p1y = (line[0]*p1x) + line[1];
    p1 = [p1x,p1y];

    p2x = canv.width;
    p2y = (line[0]*p2x) + line[1];
    p2 = [p2x,p2y];
    return [p1,p2];
}

function drawLine(line,width,color) {
    ctx.lineWidth = (width ? width : 1)*CANV_RATIO;
    ctx.strokeStyle = (color ? color : "black");
    ctx.beginPath();
    var linePoints = drawLineHelper(line);
    ctx.moveTo(parseFloat((linePoints[0][0]).toFixed(5))+(canv.width/2),parseFloat((linePoints[0][1]).toFixed(5))+(canv.height/2));
    ctx.lineTo(parseFloat((linePoints[1][0]).toFixed(5))+(canv.width/2),parseFloat((linePoints[1][1]).toFixed(5))+(canv.height/2));
    ctx.stroke();
    ctx.closePath();
}

function initCanv() {
    canv = document.getElementById("canvas");
    ctx = canv.getContext("2d");
    canv.width  = window.innerWidth  * CANV_RATIO;
    canv.height = window.innerHeight * CANV_RATIO;

    pCanv = document.createElement("canvas");
    pCtx = pCanv.getContext("2d");
    pCanv.width  = window.innerWidth  * CANV_RATIO;
    pCanv.height = window.innerHeight * CANV_RATIO;
}

function intersectionPreservingExample() {
    var l1 = newRandLine(-canv.width/2,canv.width/2,-canv.height/2,canv.height/2);
    var l1_dp = dualConversion(l1);
    drawLine(l1,2,"blue");
    drawPoint(l1_dp,5,"blue");

    var l2 = newRandLine(-canv.width/2,canv.width/2,-canv.height/2,canv.height/2);
    var l2_dp = dualConversion(l2);
    drawLine(l2,2,"red");
    drawPoint(l2_dp,5,"red");

    var int12 = findIntersection(l1,l2);
    var int1_dl = dualConversion(int12);
    drawPoint(int12,5,"black");
    drawLine(int1_dl,2,"black");
}

function colinearityCoincidenceExample() {
    var p1 = newRandPoint(-canv.width/2,canv.width/2,-canv.height/2,canv.height/2);
    var p1_dl = dualConversion(p1);
    var p2 = newRandPoint(-canv.width/2,canv.width/2,-canv.height/2,canv.height/2);
    var p2_dl = dualConversion(p2);

    var l12 = pointsToLine(p1,p2);

    var p3 = getRandPointOnLine(l12,-canv.width/2,canv.width/2,-canv.height/2,canv.height/2);
    var p3_dl = dualConversion(p3);

    var l13 = pointsToLine(p1,p3);
    var l23 = pointsToLine(p2,p3);

    drawPoint(p1,5,"black");
    drawPoint(p2,5,"black");
    drawPoint(p3,5,"black");

    // line through points ~~ only need one because they are collinear
    drawLine(l12,2,"red");

    // draw dual lines 1, 2 and 3
    drawLine(p1_dl,2,"green");
    drawLine(p2_dl,2,"green");
    drawLine(p3_dl,2,"green");

    // find and draw dual line intersection point
    var p12_dl_int = findIntersection(p1_dl,p2_dl);
    var p13_dl_int = findIntersection(p1_dl,p3_dl);
    var p23_dl_int = findIntersection(p2_dl,p3_dl);

    drawPoint(p12_dl_int,10,"blue");
    drawPoint(p13_dl_int,10,"blue");
    drawPoint(p23_dl_int,10,"blue");
}

function newDrawing() {
    canv.width = window.innerWidth * CANV_RATIO;
    canv.height = window.innerHeight * CANV_RATIO;
    pCanv.width = window.innerWidth * CANV_RATIO;
    pCanv.height = window.innerHeight * CANV_RATIO;
    ctx.clearRect(0,0,canv.width,canv.height);
    pCtx.clearRect(0,0,canv.width,canv.height);
    if (!started) {
        initEdgePoints();
        updateEdgePoints();
    }
    pCtx.fillStyle = "black";
    if (!DRAW_CIRCLES_INSTEAD) pCtx.lineWidth = LINE_WIDTH;
    document.body.style.backgroundColor = "black";
}

function initEdgePoints() {
    edgePoints = [[],[]];
    for (var i = 0; i < NUM_LINES; i++) {
        edgePoints[0].push([
            (canv.width/2)  + (canv.width/2 - PADDING_X)  *
                simplex.noise(curTime + 0*A_GOOD_PRIME + i*LINE_POS_DIFF,(curTime/2)-3*A_GOOD_PRIME),
            (canv.height/2) + (canv.height/2 - PADDING_Y) *
                simplex.noise(curTime + 2*A_GOOD_PRIME + i*LINE_POS_DIFF,(curTime/2)-1*A_GOOD_PRIME)
        ]);
        edgePoints[1].push([
            (canv.width/2)  + (canv.width/2 - PADDING_X)  *
                simplex.noise(curTime + 1*A_GOOD_PRIME + i*LINE_POS_DIFF,(curTime/2)-2*A_GOOD_PRIME),
            (canv.height/2) + (canv.height/2 - PADDING_Y) *
                simplex.noise(curTime + 3*A_GOOD_PRIME + i*LINE_POS_DIFF,(curTime/2)-0*A_GOOD_PRIME)
        ]);
    }
    started = true;
}

function updateEdgePoints() {
    window.requestAnimationFrame(updateEdgePoints);
    for (var i = 0; i < edgePoints[0].length; i++) {
        var curLineDiff = LINE_POS_DIFF + ((Math.sin(curTime/10. + Math.PI/2)+1)/i);
        edgePoints[0][i][0] = (canv.width/2)  + (canv.width/2 - PADDING_X) *
            simplex.noise(curTime + 0*A_GOOD_PRIME + i*curLineDiff,(curTime/2)-3*A_GOOD_PRIME);
        edgePoints[1][i][0] = (canv.width/2)  + (canv.width/2 - PADDING_X) *
            simplex.noise(curTime + 1*A_GOOD_PRIME + i*curLineDiff,(curTime/2)-2*A_GOOD_PRIME);
        edgePoints[0][i][1] = (canv.height/2) + (canv.height/2 - PADDING_Y) *
            simplex.noise(curTime + 2*A_GOOD_PRIME + i*curLineDiff,(curTime/2)-1*A_GOOD_PRIME);
        edgePoints[1][i][1] = (canv.height/2) + (canv.height/2 - PADDING_Y) *
            simplex.noise(curTime + 3*A_GOOD_PRIME + i*curLineDiff,(curTime/2)-0*A_GOOD_PRIME);
    }
    curTime += TIME_STEP;
    drawEdgePoints();
}

function simplexColor(i) {
    var curR = ((i+1)/NUM_LINES)*((simplex.noise(i*LINE_COL_DIFF,curTime+0*LINE_COL_SAT)+1)/2)*255;
    var curG = ((i+1)/NUM_LINES)*((simplex.noise(i*LINE_COL_DIFF,curTime+1*LINE_COL_SAT)+1)/2)*255;
    var curB = ((i+1)/NUM_LINES)*((simplex.noise(i*LINE_COL_DIFF,curTime+2*LINE_COL_SAT)+1)/2)*255;
    var color = "rgba(" + (curR).toFixed(0) + "," + (curG).toFixed(0) + "," + (curB).toFixed(0) + "," + Math.min(1,Math.pow(i,1.05)/NUM_LINES) + ")";
    return color;
}

function redToBlackColor(i) {
    var curR = (i/NUM_LINES) * Math.round((Math.sin(Math.PI*100*i/NUM_LINES)+1)/2)*255;
    var curG = 0;
    var curB = 0;
    var color = "rgb(" + curR + "," + curG + "," + curB + ")";
    return color;
}

function redToWhiteColor(i) {
    var curR = (i/NUM_LINES) * ((Math.sin(Math.PI*5*i/NUM_LINES)+1)/2)*255;
    var curG = 0;
    var curB = (i/NUM_LINES) * ((Math.cos(Math.PI*5*i/NUM_LINES)+1)/2)*255;
    var color = "rgb(" + curR + "," + curG + "," + curB + ")";
    return color;
}

function dualColor(i) {
    var shade1 = ((Math.sin(Math.PI*4*i/NUM_LINES)+1.2)/2);
    var shade2 = ((Math.cos(Math.PI*4*i/NUM_LINES)+1.2)/2);
    var color1 = [231,93,53];
    var color2 = [16,17,11];
    // var color1 = [155,117,94];
    // var color2 = [111,176,170];
    // var color1 = [246,89,96];
    // var color2 = [158,146,192];
    var curR = Math.max(color1[0]*shade1,color2[0]*shade2);
    var curG = Math.max(color1[1]*shade1,color2[1]*shade2);
    var curB = Math.max(color1[2]*shade1,color2[2]*shade2);
    var color = "rgb(" + curR + "," + curG + "," + curB + ")";
    return color;
}

function drawEdgePoints() {
    pCtx.clearRect(0,0,canv.width,canv.height);
    // ctx.fillRect(0,0,canv.width,canv.height);
    var color;
    for (var i = 0; i < NUM_LINES; i++) {
        color = simplexColor(i);
        pCtx.strokeStyle = color;
        var p1 = edgePoints[0][i];
        var p2 = edgePoints[1][i];
        var mp = findMidpoint(p1,p2);
        var radius = distance(p1,mp);

        if (DRAW_CIRCLES_INSTEAD) {
            // this draws a circle
            pCtx.beginPath();
            pCtx.arc(mp[0],mp[1],radius,0,2*Math.PI,false);
            pCtx.stroke();
            pCtx.closePath();
        }
        else {
            // this draws a line
            pCtx.beginPath();
            pCtx.moveTo(p1[0],p1[1]);
            pCtx.lineTo(p2[0],p2[1]);
            pCtx.stroke();
            pCtx.closePath();
        }
    }
    ctx.clearRect(0,0,canv.width,canv.height);
    ctx.drawImage(pCanv,0,0);
}

var curTime = 0;

function init() {
    initCanv();
    newDrawing();
}

window.onload = init;
window.onresize = newDrawing;
window.onclick = newDrawing;
