// Converts a #ffffff hex string into an [r,g,b] array
function h2r(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ] : null;
};

// Inverse of the above
function r2h(rgb) {
    return "#" + ((1 << 24) + (rgb[0] << 16) + (rgb[1] << 8) + rgb[2]).toString(16).slice(1);
};

// Interpolates two [r,g,b] colors and returns an [r,g,b] of the result
function interpolateColor(v, color1, color2) {
    color1 = h2r(color1); color2 = h2r(color2);
    if (!v) v = 0.5;
    var result = color1.slice();
    for (var i=0;i<3;i++)
        result[i] = round(result[i] + v*(color2[i]-color1[i]));
    return r2h(result);
};

function interpolateVal(v,min,max) {
    return (max + (v * (min - max)));
}

function round(a,b=.5){var c=a%b;return a-c+(c/b+1.5>>1)*b}

/******************************************************************************/
/*************************** Particles Data ***********************************/
/******************************************************************************/

var pWorker;
var particles = [];

function resetParticles() {
    pWorker.postMessage({type: 'reset'});
}

function handleRecieveParticles(e) {
    particles = e.data.particles;
    if (!animStarted) {
        window.requestAnimationFrame(animate);
        animStarted = true;
    }
}

function requestParticlesUpdate() {
    let tOps = JSON.parse(JSON.stringify(options));
    pWorker.postMessage({type: 'get', ops: tOps, ms: msPos, w: canv.width, h: canv.height});
}

function initParticles() {
    let tOps = JSON.parse(JSON.stringify(options));
    pWorker = new Worker('./particleWorker.js');
    pWorker.addEventListener('message', handleRecieveParticles, false);
    pWorker.postMessage({type: 'start', ops: tOps, ms: msPos, w: canv.width, h: canv.height});
    requestParticlesUpdate();
}

/******************************************************************************/
/*************************** Animation Loop ***********************************/
/******************************************************************************/

var time = 0;
var animStarted = false;

function animate() {
    stats.begin();
    requestParticlesUpdate();
    drawParticles();
    stats.end();
    window.requestAnimationFrame(animate);
}

/******************************************************************************/
/*************************** Canvas/Drawing ***********************************/
/******************************************************************************/

const UPSCALE = 1.5;
var canv;
var ctx;
var rcanv;
var rctx;
var curSprite;

var curMaxDist = 20*UPSCALE;

function drawLine(x1,y1,x2,y2) {
    rctx.beginPath();
    rctx.moveTo(x1,y1);
    rctx.lineTo(x2,y2);
    rctx.stroke();
    rctx.closePath();
}

function drawCirc(x,y,r) {
    rctx.beginPath();
    rctx.arc(x, y, r, 0, 2 * Math.PI);
    rctx.fill();
    rctx.closePath();
}

function drawRect(x,y,r) {
    let hr = (r/2); // half radius
    rctx.fillRect(x-hr,y-hr,hr,hr);
}

function drawSprite(x,y,r) {
    let hr = (r/2); // half radius
    rctx.drawImage(curSprite,x-hr,y-hr,hr,hr);
}

function drawParticles() {
    if (options.auto_mouse) simplexMouseMovement();

    rctx.fillStyle = options.bg_color;
    rctx.fillRect(0,0,canv.width,canv.height);

    if (options.shape != "sprite" && !options.color_change) {
        rctx.fillStyle   = options.p_color_1;
        rctx.strokeStyle = options.p_color_1;
    }

    for (var i = 0; i < particles.length; i++) {
        let curx = particles[i][2];
        let cury = particles[i][3];

        let dx = particles[i][0];
        let dy = particles[i][1];

        let curDist = Math.sqrt(dx*dx + dy*dy);
        curMaxDist = Math.max(curMaxDist,curDist);

        let distPerc = Math.min(1,((curDist*3)/curMaxDist));


        if (options.shape == "line") {
            if (options.maxParticleSize > 1 && options.size_change) {
                let curWidth = interpolateVal(distPerc,options.minParticleSize,options.maxParticleSize);
                rctx.lineWidth = round(curWidth);
            }
            if (options.color_change)
                rctx.strokeStyle = interpolateColor(distPerc,options.p_color_1,options.p_color_2);

            drawLine(curx - options.maxLineLen*dx, cury - options.maxLineLen*dy,curx,cury)
        }
        if (options.shape == "circle") {
            let radius = options.minParticleSize;
            if (options.size_change)
                radius = interpolateVal(distPerc,options.minParticleSize,options.maxParticleSize);

            if (options.color_change)
                rctx.fillStyle = interpolateColor(distPerc,options.p_color_1,options.p_color_2);

            drawCirc(curx,cury,round(radius));
        }
        if (options.shape == "rectangle") {
            let curWidth = options.minParticleSize;
            if (options.size_change)
                curWidth = interpolateVal(distPerc,options.minParticleSize,options.maxParticleSize);

            if (options.color_change)
                rctx.fillStyle = interpolateColor(distPerc,options.p_color_1,options.p_color_2);

            drawRect(curx,cury,round(curWidth));
        }
        if (options.shape == "sprite") {
            let curWidth = options.minParticleSize;
            if (options.size_change)
                curWidth = interpolateVal(distPerc,options.minParticleSize,options.maxParticleSize);

            drawSprite(curx,cury,round(curWidth));
        }
    }

    if (options.show_mouse && options.auto_mouse) {
        rctx.fillStyle = "red";
        drawRect(msPos[0],msPos[1],10*UPSCALE);
    }

    ctx.clearRect(0,0,canv.width,canv.height);
    ctx.drawImage(rcanv,0,0);
}

function initCanv() {
    canv = document.getElementById("canvas");
    ctx  = canv.getContext("2d");

    rcanv = document.createElement("canvas");
    rctx  = rcanv.getContext("2d");

    resizeHandler();
    window.addEventListener("resize",resizeHandler);

    rctx.fillStyle = "white";
    rctx.strokeStyle = "black";
}

/******************************************************************************/
/*************************** Mouse ********************************************/
/******************************************************************************/

var msPos = [0,0];

function simplexMouseMovement() {
    time += 0.0035;
    let padding = 50*UPSCALE;
    msPos = [
        padding + ((simplex.noise2D(time, -time + 10)+1)/2) * ((window.innerWidth*UPSCALE) - padding*2),
        padding + ((simplex.noise2D(time, -time + 1000)+1)/2) * ((window.innerHeight*UPSCALE) - padding*2)
    ];
}

function updateShowMouseHandler() {
    if (options.show_mouse && !options.auto_mouse) {
        canv.style.cursor = "crosshair";
    }
    else {
        canv.style.cursor = "none";
    }
}

/******************************************************************************/
/*************************** Sprite *******************************************/
/******************************************************************************/

function initSprite() {
    curSprite = new Image();
    curSprite.src = "./sprite.png";
    document.getElementById("fileInput").addEventListener("change",handleNewSpriteUploaded);
}

function updateSprite() {
    document.getElementById("fileInput").click();
}

function readURL(input) {
  if (input.files && input.files[0]) {
    var reader = new FileReader();
    reader.onload = function (e) {
      $('#blah')
        .attr('src', e.target.result)
        .width(150)
        .height(200);
    };
    reader.readAsDataURL(input.files[0]);
  }
}

function handleNewSpriteUploaded(ev) {
    let input = ev.target;
    if (input.files && input.files[0]) {
        var reader = new FileReader();
        reader.onload = function (e) {
            curSprite.src = e.target.result;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

/******************************************************************************/
/*************************** GUI **********************************************/
/******************************************************************************/

// gui options defaults
var options = {
    inertia: 80,
    gravity: 1,
    distPow: 1.7,
    minDist: 10,
    maxLineLen: 3,
    minParticleSize: 10,
    maxParticleSize: 70,
    auto_mouse: false,
    show_mouse: true,
    numParticles: 10000,
    size_change: false,
    color_change: false,
    p_color_1: "#000000",
    p_color_2: "#000000",
    bg_color: "#ffffff",
    shape: "rectangle",
    mouse_effect: "pull",
    reset: resetParticles,
    update_sprite: updateSprite
}

function updateGUI() {
    for (var i in gui.__controllers) {
        gui.__controllers[i].updateDisplay();
    }
}

function initGUI() {
    gui = new dat.GUI();

    gui.add(options, 'inertia',0,500);
    gui.add(options, 'gravity',0,50);
    gui.add(options, 'distPow',0.1,10);
    gui.add(options, 'maxLineLen',1,20);

    var minPartSizeUpdate = gui.add(options, 'minParticleSize',0.1,200);
    minPartSizeUpdate.onFinishChange(function () {
        options.minParticleSize = Math.min(options.minParticleSize,options.maxParticleSize-1);
        rctx.lineWidth = options.minParticleSize*UPSCALE;
        updateGUI();
    });

    gui.add(options, 'maxParticleSize',2,200);

    let lgrWhenSlowUpdate = gui.add(options, 'size_change');
    lgrWhenSlowUpdate.onFinishChange(function (value) {if (!value) rctx.lineWidth = options.minParticleSize*UPSCALE;});
    gui.add(options, 'color_change');

    let autoMouseUpdate = gui.add(options, 'auto_mouse');
    autoMouseUpdate.onFinishChange(updateShowMouseHandler);

    let showMouseUpdate = gui.add(options, 'show_mouse');
    showMouseUpdate.onFinishChange(updateShowMouseHandler);

    gui.addColor(options, 'p_color_1');
    gui.addColor(options, 'p_color_2');
    gui.addColor(options, 'bg_color');

    gui.add(options, 'shape', [ 'line', 'rectangle', 'circle', 'sprite' ] );

    let numParticlesUpdate = gui.add(options, 'numParticles',10,15000);
    numParticlesUpdate.onFinishChange(resetParticles);

    gui.add(options, 'mouse_effect', [ 'pull', 'push' ] );
    gui.add(options, 'minDist',0.1,Math.max(window.innerWidth,window.innerHeight));
    gui.add(options, 'reset').name("Reset particles");
    gui.add(options, 'update_sprite').name("Update sprite");
}

/******************************************************************************/
/*************************** Event Handlers ***********************************/
/******************************************************************************/

function resizeHandler() {
    canv.width   = window.innerWidth  * UPSCALE;
    canv.height  = window.innerHeight * UPSCALE;
    rcanv.width  = canv.width;
    rcanv.height = canv.height;
}

function handleMouseMove(ev) {
    if (!options.auto_mouse) {
        msPos = [ev.pageX*UPSCALE,ev.pageY*UPSCALE];
    }
}

/******************************************************************************/
/*************************** Init *********************************************/
/******************************************************************************/

// imports
var gui;
var stats;
var simplex;

function init() {
    simplex = new SimplexNoise();

    stats = new Stats();
    stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
    document.body.appendChild( stats.dom );


    initGUI();
    initSprite();
    initCanv();
    initParticles();

    window.addEventListener("mousemove",handleMouseMove);
}

window.onload = init;
