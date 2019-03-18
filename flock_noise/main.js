const SECOND = 60;
const RES_SCALE  = 1.5;
const SEED       = Date.now();
const START_NUM  = 5000;
const LINE_WIDTH = 1*RES_SCALE;

var canv, ctx;

var fbm;
var simplex;

var walks;

var fc   = 0;
var mfc  = SECOND*60;
var cvg  = false;

function distance(p1x,p1y,p2x,p2y){
    var dx = p2x-p1x;
    var dy = p2y-p1y;
    return Math.sqrt(dx*dx + dy*dy);
}

function updateWalks() {
    for (var i = 0; i < walks.length; i++) {
        let t = fc / 250;
        walks[i].lx1 = walks[i].lx;
        walks[i].ly1 = walks[i].ly;
        walks[i].lx = walks[i].x;
        walks[i].ly = walks[i].y;

        let fbmX = (walks[i].lx)/(RES_SCALE*500);
        let fbmY = (walks[i].ly)/(RES_SCALE*500);

        walks[i].x += (chance.floating({min:-1,max:1}) + 3*fbm.getValue(fbmX,fbmY,t + 0))*5;
        walks[i].y += (chance.floating({min:-1,max:1}) + 3*fbm.getValue(fbmX,fbmY,t + 100))*5;

        // walks[i].x = walks[i].x % canv.width;
        // walks[i].y = walks[i].y % canv.height;

        if (walks[i].lx1 < 0) {
            walks[i] = newWalk();
            // walks[i].x = canv.width-1;
            // walks[i].lx = canv.width-1;
            // walks[i].lx1 = canv.width-1;
        }
        if (walks[i].lx1 > canv.width) {
            walks[i] = newWalk();
            // walks[i].x = 0;
            // walks[i].lx = 0;
            // walks[i].lx1 = 0;
        }
        if (walks[i].ly1 < 0) {
            walks[i] = newWalk();
            // walks[i].y = canv.height-1;
            // walks[i].ly = canv.height-1;
            // walks[i].ly1 = canv.height-1;
        }
        if (walks[i].ly1 > canv.height) {
            walks[i] = newWalk();
            // walks[i].y = 0;
            // walks[i].ly = 0;
            // walks[i].ly1 = 0;
        }
    }
}


function newWalk() {
    let x = chance.integer({min:0,max:canv.width-1});
    let y = chance.integer({min:0,max:canv.height-1});
    return {
        x: x,
        y: y,
        lx: x,
        ly: y,
        lx1: x,
        ly1: y
    };
}

function initWalks() {
    walks = [];
    for (var i = 0; i < START_NUM; i++)
        walks.push(newWalk());
}

function animate() {
    if (cvg) cvg.addFrame(canv);
    fc++;

    updateWalks();
    render();

    if (cvg) {
        if (fc < mfc) window.requestAnimationFrame(animate);
        else {
            cvg.render('render');
            cvg = false;
        }
    }
    else window.requestAnimationFrame(animate);
}

function render() {
    ctx.fillRect(0,0,canv.width,canv.height);
    ctx.beginPath();
    for (var i = 0; i < walks.length; i++) {
        // let t = Date.now()/50000.;
        // let r = Math.floor(((simplex.getValue(walks[i].x/1000., walks[i].y/1000., i/(5*walks.length) + t - 0.1)+1.1)/2.05)*255);
        // let g = Math.floor(((simplex.getValue(walks[i].x/1000., walks[i].y/1000., i/(5*walks.length) + t + 0.0)+1.1)/2.05)*255);
        // let b = Math.floor(((simplex.getValue(walks[i].x/1000., walks[i].y/1000., i/(5*walks.length) + t + 0.1)+1.1)/2.05)*255);
        // let c = "rgb(" + r + "," + g + "," + b + ")";
        // ctx.strokeStyle = c;

        let x   = Math.floor(walks[i].x);
        let y   = Math.floor(walks[i].y);
        let lx  = Math.floor(walks[i].lx);
        let ly  = Math.floor(walks[i].ly);
        let lx1 = Math.floor(walks[i].lx1);
        let ly1 = Math.floor(walks[i].ly1);

        ctx.moveTo(lx1,ly1);
        ctx.lineTo(lx,ly);
        ctx.lineTo(x,y);
    }
    ctx.stroke();
    ctx.closePath();
}

function initCanv() {
    canv = document.getElementById("canv");
    ctx  = canv.getContext("2d");

    canv.width    = window.innerWidth  * RES_SCALE;
    canv.height   = window.innerHeight * RES_SCALE;
    ctx.lineWidth = LINE_WIDTH;
    ctx.lineJoin  = "round";
    ctx.lineCap   = "round";
    ctx.fillStyle = "black";
    ctx.fillRect(0,0,canv.width,canv.height);
    ctx.fillStyle = "rgba(0,0,0,.1)";
    ctx.strokeStyle = "white";
}

function init() {
    simplex = new JSNoise.Module.Simplex();
    simplex.seed = SEED;

    fbm = new JSNoise.Module.FBM();

    fbm.octaves = 8;
    fbm.persistence = .3;
    fbm.lacunarity = 5;

    fbm.setSourceModules([simplex]);

    initCanv();
    initWalks();
    animate();
}

window.onload = init;
