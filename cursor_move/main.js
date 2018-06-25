const CANV_RATIO = 1;
const FONT_SIZE  = 250 * CANV_RATIO;
const NUM_ROWS   = 10;
var canv;
var ctx;

var mouse_x;
var mouse_y;
var dx = 0;

function indToCoord(i) {
    i = i/4;
    var x = i%canv.width;
    var y = (i-x)/canv.width;
    return [x,y];
}

function coordToInd(x,y) {
    return (((y*canv.width)+x)*4);
}

function handleMouseMove(ev) {
    if (!mouse_x || !mouse_y) {
        mouse_x = ev.clientX;
        mouse_y = ev.clientY;
    }
    else {
        dx = ev.clientX - mouse_x;
        mouse_x = ev.clientX;
        mouse_y = ev.clientY;
    }
    updateDrawing();
}

function updateDrawing() {
    var nxtImgData = ctx.getImageData(0,0,canv.width,canv.height);
    var curImgData = ctx.getImageData(0,0,canv.width,canv.height);
    for (var j = -NUM_ROWS/2; j < NUM_ROWS/2; j++) {
        var cur_y = mouse_y + j;
        for (var i = coordToInd(0,cur_y); i < coordToInd(canv.width,cur_y); i+=4) {
            var coord = indToCoord(i);
            var cur_x = coord[0];
            var new_x = cur_x + dx;
            if (new_x >= 0 && new_x < canv.width) {
                var new_ind = coordToInd(new_x,cur_y);
                nxtImgData.data[new_ind]   = curImgData.data[i];
                nxtImgData.data[new_ind+1] = curImgData.data[i+1];
                nxtImgData.data[new_ind+2] = curImgData.data[i+2];
                nxtImgData.data[new_ind+3] = curImgData.data[i+3];
            }
            else {
                nxtImgData.data[new_ind]   = 0;
                nxtImgData.data[new_ind+1] = 0;
                nxtImgData.data[new_ind+2] = 0;
                nxtImgData.data[new_ind+3] = 0;
            }
        }
    }
    ctx.putImageData(nxtImgData,0,0);
}

function writeText(text) {
    ctx.fillText(text, (canvas.width/2), (canvas.height/2) + (FONT_SIZE/4));
}

function drawImage(link) {
    var image = new Image();
    image.src = link;
    image.onload = function () {
        console.log(image);
        ctx.drawImage(image,(canv.width/2)-(image.width/2),(canv.height/2)-(image.height/2));
    }
}

function initCanv() {
    canv = document.getElementById("canvas");
    ctx = canv.getContext("2d");
    canv.width  = window.innerWidth  * CANV_RATIO;
    canv.height = window.innerHeight * CANV_RATIO;
    ctx.fillStyle = "black";
    ctx.textAlign = "center";
    ctx.font = "800 " + FONT_SIZE + "px Open Sans";
}

function resize() {
    initCanv();
    drawImage("./img.jpg");
}

function init() {
    initCanv();
    drawImage("./img.jpg");
    canv.addEventListener("mousemove",handleMouseMove);
    // setInterval(updateDrawing, 10);
}

window.onload = init;
window.onresize = resize;
