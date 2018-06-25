const NUM_COLS = 3;
const NUM_ROWS = 3;

const Y_DIFF_MIN = -20;
const Y_DIFF_MAX = 20;
const X_DIFF_MIN = -20;
const X_DIFF_MAX = 20;

var Y_DIFF = Y_DIFF_MIN * 100 * Math.random();
var X_DIFF = X_DIFF_MIN * 100 * Math.random();

function updateMousePos(ev) {
    Y_DIFF = Y_DIFF_MIN + ((Y_DIFF_MAX - Y_DIFF_MIN)*((window.innerHeight - ev.clientY)/window.innerHeight))
    X_DIFF = X_DIFF_MIN + ((X_DIFF_MAX - X_DIFF_MIN)*((window.innerWidth - ev.clientX)/window.innerWidth))

    updateTexts();
}

function step() {
    if (Math.abs(Y_DIFF) > 0) {
        Y_DIFF += Math.max(0.01,Math.abs(Y_DIFF)/100);
        console.log(Y_DIFF);
    }
    if (Math.abs(X_DIFF) > 0) {
        X_DIFF += Math.max(0.01,Math.abs(X_DIFF)/100);
        console.log(X_DIFF);
    }
    updateTexts();
}

function updateTexts() {
    for (var i = Math.floor(NUM_COLS/-2); i <= Math.ceil(NUM_COLS/2); i++) {
        for (var j = Math.floor(NUM_ROWS/-2); j <= Math.ceil(NUM_ROWS/2); j++) {
            var text = document.getElementById(i + "_" + j);
            text.style.top  = ((window.innerHeight/2) - (text.clientHeight/2) + (j * 5 * Y_DIFF)) + "px";
            text.style.left = ((window.innerWidth/2) - (text.clientWidth/2) + (i * 5 * X_DIFF))  + "px";
            text.style.transform = "rotateZ(" + ((i*X_DIFF) + (j*Y_DIFF)) + "deg)"
        }
    }
}

function init() {
    for (var i = Math.floor(NUM_COLS/-2); i <= Math.ceil(NUM_COLS/2); i++) {
        for (var j = Math.floor(NUM_ROWS/-2); j <= Math.ceil(NUM_ROWS/2); j++) {
            var text = document.createElement("p");
            text.innerHTML = "&&&&";
            text.id = i + "_" + j;
            // text.style.color = chance.color();
            // text.style.fontSize = ((Math.abs(i) + Math.abs(j)) * 5) + "rem";
            document.body.appendChild(text);
            text.style.top  = ((window.innerHeight/2) - (text.clientHeight/2)) + "px";
            text.style.left = ((window.innerWidth/2)  - (text.clientWidth/2))  + "px";
        }
    }
    document.body.addEventListener("mousemove",updateMousePos);
    // setInterval(step, 10);
}

window.onload = init;
