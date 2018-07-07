const CANV_RATIO = 1;
const NUM_ROWS   = 2*CANV_RATIO;

var FONT_SIZE    = 200 * CANV_RATIO;

var canv;
var ctx;

var mouse_x;
var mouse_y;
var dx = 0;
var dy = 0;

var the_text = ["TYPE WHAT","YOU WANT"];
var text_ind = the_text.length-1;

var updateInterval;

var newLine = false;

function indToCoord(i) {
    i = i/4;
    var x = i%canv.width;
    var y = (i-x)/canv.width;
    return [x,y];
}

function coordToInd(x,y) {
    return (((y*canv.width)+x)*4);
}

function backspace(meta) {
    if (the_text.length < 1) return;

    if (meta) {
        the_text.splice(the_text.length-1,1);
        return;
    }

    var curLine = the_text[the_text.length-1];
    curLine = curLine.substring(0,curLine.length-1);
    if (curLine.length > 0) the_text[the_text.length-1] = curLine;
    else the_text.splice(the_text.length-1,1);
}

function addChar(c) {
    if (the_text.length < 1 || newLine) {
        newLine = false;
        the_text.push("");
    }
    the_text[the_text.length-1] += c;
}

function handleTyping(ev) {
    if (ev.key == "Backspace") backspace(ev.metaKey);
    else if (ev.key == "Enter") newLine = true;
    else if (ev.key.length > 1) return;
    else addChar(ev.key);
    reset();
}

function handleMouseMove(ev) {
    if (!mouse_x || !mouse_y) {
        mouse_x = ev.clientX*CANV_RATIO;
        mouse_y = ev.clientY*CANV_RATIO;
    }
    else {
        dx += (ev.clientX*CANV_RATIO) - mouse_x;
        dy += (ev.clientY*CANV_RATIO) - mouse_y;
        mouse_x = ev.clientX*CANV_RATIO;
        mouse_y = ev.clientY*CANV_RATIO;
    }
}

function updateDrawingBoth() {
    updateDrawingX();
    updateDrawingY();
}

function updateDrawingX() {
    var nxtImgData = ctx.getImageData(0,0,canv.width,canv.height);
    var curImgData = ctx.getImageData(0,0,canv.width,canv.height);
    for (var j = -NUM_ROWS/2; j < NUM_ROWS/2; j++) {
        var cur_y = mouse_y + j;
        for (var i = coordToInd(0,cur_y); i < coordToInd(canv.width,cur_y); i+=4) {
            var coord = indToCoord(i);
            var cur_x = coord[0];
            var new_x = cur_x + dx;
            if (new_x >= 0 && new_x < canv.width && curImgData.data[i+3] > 0) {
                var new_ind = coordToInd(new_x,cur_y);
                nxtImgData.data[new_ind]   = curImgData.data[i];
                nxtImgData.data[new_ind+1] = curImgData.data[i+1];
                nxtImgData.data[new_ind+2] = curImgData.data[i+2];
                nxtImgData.data[new_ind+3] = curImgData.data[i+3];
            }
            else if (curImgData.data[i+3] > 0) {
                nxtImgData.data[new_ind]   = 0;
                nxtImgData.data[new_ind+1] = 0;
                nxtImgData.data[new_ind+2] = 0;
                nxtImgData.data[new_ind+3] = 0;
            }
        }
    }

    ctx.putImageData(nxtImgData,0,0);
    dx = 0;
}

function updateDrawingY() {
    var nxtImgData = ctx.getImageData(0,0,canv.width,canv.height);
    var curImgData = ctx.getImageData(0,0,canv.width,canv.height);
    // console.log(dy);
    for (var j = -NUM_ROWS/2; j < NUM_ROWS/2; j++) {
        var cur_x = mouse_x + j;
        for (var i = coordToInd(cur_x,0); i <= coordToInd(cur_x,canv.height); i+=(canv.width*4)) {
            var coord = indToCoord(i);
            var cur_y = coord[1];
            var new_y = cur_y + dy;
            if (new_y >= 0 && new_y < canv.height && curImgData.data[i+3] > 0) {
                var new_ind = coordToInd(cur_x,new_y);
                nxtImgData.data[new_ind]   = curImgData.data[i];
                nxtImgData.data[new_ind+1] = curImgData.data[i+1];
                nxtImgData.data[new_ind+2] = curImgData.data[i+2];
                nxtImgData.data[new_ind+3] = curImgData.data[i+3];
            }
            else if (curImgData.data[i+3] > 0) {
                nxtImgData.data[new_ind]   = 0;
                nxtImgData.data[new_ind+1] = 0;
                nxtImgData.data[new_ind+2] = 0;
                nxtImgData.data[new_ind+3] = 0;
            }
        }
    }

    ctx.putImageData(nxtImgData,0,0);
    dy = 0;
}

function writeLine(line,text_dy,bump) {
    ctx.fillText(line, (canvas.width/2), (canvas.height/2) + (FONT_SIZE/4) + (text_dy*FONT_SIZE/2));
}

function writeText() {
    // check text size
    var longest = 0;
    for (var i = 0; i < the_text.length; i++) if (the_text[i].length > longest) longest = the_text[i].length;
    FONT_SIZE = Math.min((canv.width*1.4) / longest,(canv.height)/(the_text.length*1.4));

    ctx.font = "800 " + FONT_SIZE + "px Open Sans";

    for (var i = 0; i < the_text.length; i++) {
        var line = the_text[i];
        var text_dy = ((-(the_text.length-1)/2) + i)*2;
        if (the_text.length%2==0) {
            writeLine(line,text_dy,true);
        }
        else {
            writeLine(line,text_dy,false);
        }
    }
}

function drawImage(link) {
    var image = new Image();
    image.src = link;
    image.onload = function () {
        console.log(image);
        ctx.drawImage(image,(canv.width/2)-(image.width/2),(canv.height/2)-(image.height/2));
    }
}



const dirs = ["horizontal","vertical","both"];

function changeDir(ev) {
    clearInterval(updateInterval);
    dy = dx = 0;
    var cur = parseInt(ev.target.className.split("_")[1]);
    cur = (cur+1) % dirs.length;
    console.log(cur);
    switch (cur) {
        case 0:
            updateInterval = setInterval(updateDrawingX, 1);
            break;
        case 1:
            updateInterval = setInterval(updateDrawingY, 1);
            break;
        case 2:
            updateInterval = setInterval(updateDrawingBoth, 1);
            break;
    }
    ev.target.innerHTML = dirs[cur];
    ev.target.className = "cur_" + cur;
}

function download(ev) {
    var curImgData = ctx.getImageData(0,0,canv.width,canv.height);
    ctx.fillStyle = "white";
    ctx.fillRect(0,0,canv.width,canv.height);
    ctx.putImageData(curImgData,0,0);
    var url = canv.toDataURL('image/png');
    this.href = url;
    setTimeout(function () {
        ctx.clearRect(0,0,canv.width,canv.height);
        ctx.putImageData(curImgData,0,0);
        ctx.fillStyle = "black";
    }, 10);
};

function reset() {
    ctx.clearRect(0,0,canv.width,canv.height);
    writeText();
}

function resize() {
    initCanv();
    reset();
}

function initCanv() {
    canv = document.getElementById("canvas");
    ctx = canv.getContext("2d");
    canv.width  = window.innerWidth  * CANV_RATIO;
    canv.height = window.innerHeight * CANV_RATIO;
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.font = "800 " + FONT_SIZE + "px Open Sans";
    ctx.fillRect(0,0,canv.width,canv.height);
    ctx.fillStyle = "black"; 
}

function init() {
    initCanv();
    writeText();
    // drawImage("./img.jpg");
    canv.addEventListener("mousemove",handleMouseMove);
    updateInterval = setInterval(updateDrawingX, 1);
    document.body.addEventListener("keydown",handleTyping);
    document.getElementById("direction").addEventListener("click",changeDir);
    document.getElementById("reset").addEventListener("click",reset);
    document.getElementById("download").addEventListener("click",download,false);
}

window.onload = init;
window.onresize = resize;
