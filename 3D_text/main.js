const MAX_SKEW = 50;

var DIFF_Z;
var NUM_TEXTS;
var TEXT_CONTENT;

var transformProp;

var percX;
var percY;

var xMed = window.innerWidth/2;
var yMed = window.innerHeight/2;

const SIZES = [100,300,400,500,700,900];

// settings:
var inverted = false;
const ALIGMENTS = ["center","left","right","justify"];
var cur_align = 0;

function randInt(min, max) {
    return chance.integer({min:min,max:max});
}

function randString(len) {
    var str = "";
    var exclude = [2483,7333,2181,7330,6575,2255,2258,2747,5887,11252,9857];
    for (var i = 0; i < len; i++) {
        var curCharCode = randInt(13,11500);
        while (exclude.indexOf(curCharCode) > -1 || String.fromCharCode(curCharCode) == "⯴")
            curCharCode = randInt(13,11500);
        console.log(curCharCode);
        str += String.fromCharCode(curCharCode);
    }
    return str;
}

function getAngle(x,y) {
    return Math.atan2(x, y) * 180 / Math.PI;
}

function getDist(x,y) {
    return Math.sqrt((x*x)+(y*y));
}

function getTransformProperty(node) {
    var properties = ['transform','WebkitTransform','msTransform','MozTransform','OTransform'];
    var p;
    while (p = properties.shift()) if (typeof node.style[p] != 'undefined') return p;
    return false;
};

function handleMouseMove(ev) {
    if (ev.clientX < xMed) percX = -(xMed-ev.clientX) / xMed;
    else percX = (ev.clientX-xMed) / xMed;

    if (ev.clientY < yMed) percY = (yMed-ev.clientY) / yMed;
    else percY = -(ev.clientY-yMed) / yMed;
}

function updateSkew() {
    var textEls = document.getElementById("textCont").getElementsByTagName("p");

    for (var i = 0; i < textEls.length; i++) {
        textEls[i].style[transformProp] = "rotateY(" + (percX * MAX_SKEW) + "deg) rotateX(" + ((percY) * MAX_SKEW) + "deg) perspective(0px) translateZ(" + ((i * DIFF_Z)-((textEls.length/2)*DIFF_Z)) + "px)";
    }

    var gradientEl = document.getElementById("gradientEl");
    var gradAngle = Math.round(getAngle(percX, percY));
    var gradCVal = ((getDist(percX,-percY)/getDist(1,1))*0.7);
    if (inverted) {
        gradAngle = MAX_SKEW + gradAngle;
        gradCVal = gradCVal;
    }
    gradientEl.style.background = "linear-gradient(" + gradAngle + "deg,rgba(0,0,0,0),rgba(0,0,0," + gradCVal + "))";
}

var curInitText = 0;
var numPerIter = 3;
var initTextsInterval;

function initTexts() {
    var colorStep = 255/(NUM_TEXTS+1);

    var textEl = document.createElement("p");
    textEl.innerHTML = TEXT_CONTENT;
    var curColorVal = (colorStep * (curInitText+1)).toFixed(0);
    if (inverted) {
        curColorVal = 255 - curColorVal;
    }
    var curColor = "rgba(" + curColorVal + "," + curColorVal + "," + curColorVal + ",1) !important";
    textEl.style = "color: " + curColor + ";font-weight: " + (SIZES[SIZES.length - (curInitText+2)]);
    // textEl = setSkew(textEl,curInitText);
    document.getElementById("textCont").appendChild(textEl);
    curInitText++;

    updateSkew();

    if (!percX || !percY) {
        percX = 0.5;
        percY = 0.5;
    }

    if (curInitText >= NUM_TEXTS) clearInterval(initTextsInterval);
}

function initGrain() {
    var gCanv = document.getElementById("grainCanv");
    var gCtx = gCanv.getContext("2d");
    gCanv.width  = window.innerWidth  * 2;
    gCanv.height = window.innerHeight * 2;
    gCtx.clearRect(0,0,gCanv.width,gCanv.width);
    var imgData = gCtx.createImageData(gCanv.width,gCanv.height);
    for (var i = 0; i < imgData.data.length; i+=4) {
        imgData.data[i]   = chance.integer({min: 0, max: 200});
        imgData.data[i+1] = chance.integer({min: 0, max: 200});
        imgData.data[i+2] = chance.integer({min: 0, max: 200});
        imgData.data[i+3] = chance.integer({min: 0, max: 50});
    }
    gCtx.putImageData(imgData, 0, 0);
    console.log("grain done");
}

function removeTexts() {
    var texts = document.getElementById("textCont").getElementsByTagName("p");
    for (var i = 0; i < texts.length; i++) {
        texts[i].parentNode.removeChild(texts[i]);
        console.log(i);
        i--;
    }
}

function redraw() {
    if (initTextsInterval) clearInterval(initTextsInterval);
    if (updateInterval) clearInterval(updateInterval);
    DIFF_Z       = 7;
    NUM_TEXTS    = SIZES.length-1;
    TEXT_CONTENT = the_text.join("");//randString((1,2));
    curInitText = 0;
    console.log("DIFF_Z:       " + DIFF_Z);
    console.log("NUM_TEXTS:    " + NUM_TEXTS);
    console.log("TEXT_CONTENT: " + TEXT_CONTENT);
    removeTexts();
    initTextsInterval = setInterval(initTexts, 1);
    console.log("done...");
    updateInterval = setInterval(updateSkew, 50);
}

var updateInterval;


var the_text = ["TYPE WHAT","<br>","YOU WANT"];
var text_ind = the_text.length-1;
var newLine = false;

function backspace(meta) {
    if (the_text.length < 1) return;

    var curLine = the_text[the_text.length-1];

    if (meta || curLine == "<br>") {
        the_text.splice(the_text.length-1,1);
        return;
    }

    curLine = curLine.substring(0,curLine.length-1);
    if (curLine.length > 0) the_text[the_text.length-1] = curLine;
    else the_text.splice(the_text.length-1,1);
}

function addChar(c) {
    if (the_text.length < 1) {
        the_text.push("");
    }
    if (newLine == true) {
        the_text.push("<br>");
        newLine = false;
    }
    the_text[the_text.length-1] += c;
}

function handleTyping(ev) {
    if (ev.key == "Backspace") backspace(ev.metaKey);
    else if (ev.key == "Enter") newLine = true;
    else if (ev.key.length > 1) return;
    else addChar(ev.key);

    redraw();
}

function updateInverted() {
    inverted = !inverted;
    redraw();
    if (inverted) {
        document.body.style.backgroundColor = "white";
        document.getElementById("controls").style.color = "black";
    }
    else {
        document.body.style.backgroundColor = null;
        document.getElementById("controls").style.color = null;
    }
}

function randomizeText() {
    the_text = [];
    var numRand = chance.integer({min:1,max:4})
    for (var i = 0; i < numRand; i++) {
        the_text.push(randString(chance.integer({min:1,max:10})));
        if (i < numRand-1) the_text.push("<br>");
    }
}

function updateAlignment() {
    cur_align++;
    cur_align = cur_align % ALIGMENTS.length;
    document.getElementById("textCont").style.textAlign = ALIGMENTS[cur_align];
    document.getElementById("align").innerHTML = ALIGMENTS[cur_align];
}

function init() {
    initGrain();
    transformProp = getTransformProperty(document.body);
    document.body.addEventListener("mousemove",handleMouseMove);
    document.body.addEventListener("click",redraw);
    document.body.addEventListener("keydown",handleTyping);
    document.getElementById("invert").addEventListener("click",updateInverted);
    document.getElementById("random").addEventListener("click",randomizeText);
    document.getElementById("align").addEventListener("click",updateAlignment);
    redraw();
}

function resize() {
    xMed = window.innerWidth/2;
    yMed = window.innerHeight/2;
}

window.onload = init;
window.onresize = resize;
