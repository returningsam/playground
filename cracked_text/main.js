const RES_RATIO = 1;

var requestAnimationFrame = window.requestAnimationFrame ||
                            window.mozRequestAnimationFrame ||
                            window.webkitRequestAnimationFrame ||
                            window.msRequestAnimationFrame;

var cancelAnimationFrame = window.cancelAnimationFrame ||
                           window.mozCancelAnimationFrame;

var config = {
    GAP_WIDTH:           2,
    NUM_TILES:           300,
    NUM_TILE_VERTS:      30,
    BG_COLOR:            "#000000",

    DO_FILL:             true,
    FILL_COLOR:          "#ffffff",
    DO_STROKE:           false,
    STROKE_COLOR:        "#0000ff",
    STROKE_WIDTH:        2,
    DO_RAND_SEED:        randomSeed,
    CLEAR_TILES:         clearTiles,
    TEXT_SIZE:           400,
    TEXT:                "ICE"
}

var svgDraw;

var canv, ctx;
var simplex;

var tiles;
var tree;

var curTime = Date.now();

function uniq(a) {
   return Array.from(new Set(a));
}

function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function sqr (x) {
    return x * x;
}

function dist2 (v, w) {
    return sqr(v[0] - w[0]) + sqr(v[1] - w[1]);
}

// p - point
// v - start point of segment
// w - end point of segment
function distToSegmentSquared (p, v, w) {
    var l2 = dist2(v, w);
    if (l2 === 0) return dist2(p, v);
    var t = ((p[0] - v[0]) * (w[0] - v[0]) + (p[1] - v[1]) * (w[1] - v[1])) / l2;
    t = Math.max(0, Math.min(1, t));
    return dist2(p, [ v[0] + t * (w[0] - v[0]), v[1] + t * (w[1] - v[1]) ]);
}

// p - point
// v - start point of segment
// w - end point of segment
function distToSegment (p, s) {
    return distToSegmentSquared(p, s[0], s[1]);
}

function getAngle(p1, p2) {
    var dy = p2[1] - p1[1];
    var dx = p2[0] - p1[0];
    return Math.atan2(dy, dx) + Math.PI; // range (0, 2*PI]
}

function distance(p1,p2) {
    var a = p1[0] - p2[0];
    var b = p1[1] - p2[1];
    return Math.sqrt( a*a + b*b );
}

function fastDist(p1,p2) {
    // console.log(p1);
    var a = p1[0] - p2[0];
    var b = p1[1] - p2[1];
    return a*a + b*b;
}

function indToCoord(i,w) {
    i = i/4;
    var x = i%w;
    var y = (i-x)/w;
    return [x,y];
}

function coordToInd(x,y,w) {
    return (((y*w)+x)*4);
}

function vectorLen(v) {
    return Math.sqrt(v[0]*v[0] + v[1]*v[1]);
}

function simplexColor(i,time) {
    let r = noise2D(i/100,.0) * 255;
    let g = noise2D(i/100,.1) * 255;
    let b = noise2D(i/100,.2) * 255;
    return "rgb(" + r + "," + g + "," + b + ")";
}

function normalize(v) {
    let len = vectorLen(v);
    v[0] /= len;
    v[1] /= len;
    return v;
}

function noise2D(x,y) {
    return (simplex.noise2D(x,y)+1)/2;
}

function drawCircle(x,y,r) {
    ctx.moveTo(x+r,y);
    ctx.arc(x, y, r, 0, 2 * Math.PI);
}

function rotate(cx, cy, x, y, angle) {
    var radians = (Math.PI / 180) * angle,
        cos = Math.cos(radians),
        sin = Math.sin(radians),
        nx = (cos * (x - cx)) + (sin * (y - cy)) + cx,
        ny = (cos * (y - cy)) - (sin * (x - cx)) + cy;
    return [nx, ny];
}

class RawVertex {
    constructor(p,o,tid) {
        this.dpos = p;
        this.tid  = tid;
        this.origin = o;
        this.stop = true;
        this.mdiff = 0;
    }

    moveTo() {
        ctx.moveTo(Math.round(this.dpos[0]),Math.round(this.dpos[1]));
    }

    lineTo() {
        ctx.lineTo(Math.round(this.dpos[0]),Math.round(this.dpos[1]));
    }

    get apos() {
        return this.dpos;
    }
}

class Vertex {
    constructor(p,a,tid,torigin) {
        this.pos  = p;
        this.dpos = p;
        this.ang  = a;
        this.dif  = [Math.cos(a),Math.sin(a)];
        this.tid  = tid;
        this.origin = torigin;
        this.stop = false;
        this.mdiff = 0;
        this.dlen = Math.min(.5,config.GAP_WIDTH*RES_RATIO/10);
        this.alen = config.GAP_WIDTH*RES_RATIO;
    }

    get apos() {
        return [
            this.pos[0] + this.dif[0]*config.GAP_WIDTH*RES_RATIO,
            this.pos[1] + this.dif[1]*config.GAP_WIDTH*RES_RATIO
        ];
    }

    update(imgData,imgWidth) {

        let curapos = this.apos;
        let lax = curapos[0];
        let lay = curapos[1];

        let nearbyTiles = tree.nearest(curapos, 20);
        // nearbyTiles = uniq(nearbyTiles.sort((a,b) => (a[1]-b[1])).map((x) => x[0][2]));
        nearbyTiles = nearbyTiles.sort((a,b) => (a[1]-b[1])).map((x) => x[0][2]);

        if (!this.stop && (lax < 0 || lax > canv.width || lay < 0 || lay > canv.height)) {
            this.stop = true;
        }

        if (!this.stop) {
            for (var i = 0; i < nearbyTiles.length; i++) {
                let curInd = nearbyTiles[i];
                if (tiles[curInd].id != this.tid && tiles[curInd].isNear(this.pos)) {
                    this.stop = true;
                    break;
                }
            }
        }

        if (!this.stop && imgData.data[coordToInd(Math.floor(lax),Math.floor(lay),imgWidth)+3] < 2) {
            this.stop = true;
        }

        if (!this.stop) {
            this.pos[0] += this.dif[0]*this.dlen;
            this.pos[1] += this.dif[1]*this.dlen;

            this.dpos[0] = this.pos[0];
            this.dpos[1] = this.pos[1];

            this.mdiff += this.dlen;
        }

        return this.stop;
    }

    moveTo() {
        ctx.moveTo(Math.round(this.dpos[0]),Math.round(this.dpos[1]));
    }

    lineTo() {
        ctx.lineTo(Math.round(this.dpos[0]),Math.round(this.dpos[1]));
    }
}

class Tile {
    constructor(id,origin,seedImg,seedImgWidth) {
        this.id = id;
        this.verts = [];
        this.seedImg = seedImg;
        this.seedImgWidth = seedImgWidth;
        this.origin = origin;

        // this.numVerts = chance.integer({min:20,max:50});
        this.numVerts = config.NUM_TILE_VERTS;
        for (var i = 0; i < this.numVerts; i++) {
            // let curAng = chance.floating({min:0,max:Math.PI*2});
            let curAng = i*((Math.PI*2)/config.NUM_TILE_VERTS);
            let curPos = [this.origin[0]+Math.cos(curAng),this.origin[1]+Math.sin(curAng)];
            let newVert = new Vertex(curPos,curAng,this.id,this.origin);
            this.verts.push(newVert);
        }
        this.verts = this.verts.sort((a,b) => (a.ang > b.ang) ? 1 : -1);
        this.stop = false;
    }

    get treeData(){
        let data = [[this.origin[0],this.origin[1],this.id]];
        // for (var i = 0; i < this.verts.length; i++) {
        //     data.push([this.verts[i].apos[0],this.verts[i].apos[1],this.id]);
        // }
        return data;
    }

    compSegments() {
        this.segs = [];
        for (var i = 0; i < this.verts.length; i++) {
            if (i == this.verts.length-1) this.segs.push([this.verts[i].pos,this.verts[0].pos]);
            else this.segs.push([this.verts[i].pos,this.verts[i+1].pos]);
        }
    }

    compNextSegments() {
        this.segs = [];
        for (var i = 0; i < this.verts.length; i++) {
            if (i == this.verts.length-1) this.segs.push([this.verts[i].apos,this.verts[0].apos]);
            else this.segs.push([this.verts[i].apos,this.verts[i+1].apos]);
        }
    }

    update() {
        this.segs = false;
        if (!this.stop) {
            this.stop = true;
            for (var i = 0; i < this.verts.length; i++) {
                let vertStopped = this.verts[i].update(this.seedImg,this.seedImgWidth);
                if (!vertStopped) this.stop = false;
            }
            if (this.stop) this.optimize();
        }
        return this.stop;
    }

    isNear(point) {
        let distThresh = sqr(config.GAP_WIDTH*RES_RATIO);
        if (!this.segs) this.compNextSegments();
        for (var i = 0; i < this.segs.length; i++) {
            let curDist = distToSegment(point,this.segs[i]);
            if (curDist <= distThresh) return true;
        }

        return false;
    }

    willContain(point) {
        // ray-casting algorithm based on
        // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html

        var x = point[0], y = point[1];

        var inside = false;
        for (var i = 0, j = this.verts.length - 1; i < this.verts.length; j = i++) {
            var xi = this.verts[i].apos[0], yi = this.verts[i].apos[1];
            var xj = this.verts[j].apos[0], yj = this.verts[j].apos[1];

            var intersect = ((yi > y) != (yj > y))
                && (x < ((xj - xi) * (y - yi) / (yj - yi) + xi));
            if (intersect) inside = !inside;
        }

        return inside;
    }

    draw() {
        ctx.fillStyle = config.FILL_COLOR;
        ctx.strokeStyle = config.STROKE_COLOR;
        ctx.beginPath();
        this.verts[0].moveTo();
        for (var i = 0; i < this.verts.length; i++) {
            this.verts[i].lineTo();
        }
        this.verts[0].lineTo();
        if (config.DO_FILL) ctx.fill();
        if (config.DO_STROKE) ctx.stroke();
        ctx.closePath();
    }

    optimize() {
        let rawVerts = [];
        for (var i = 0; i < this.verts.length; i++) {
            rawVerts.push({
                x: this.verts[i].pos[0],
                y: this.verts[i].pos[1]
            });
        }
        let prevLen = rawVerts.length;
        rawVerts = simplify(rawVerts,.5,true).map((v) => new RawVertex([v.x,v.y],this.origin,this.id));
        this.verts = rawVerts;
        let newLen = this.verts.length;
        // console.log("verticies removed: " + (prevLen - newLen));
    }
}

function drawText() {
    var pxRatio = RES_RATIO;
    var tCanvas = document.createElement("canvas");
    var tCtx = tCanvas.getContext("2d");
    // var fSize = (window.innerWidth/2)*pxRatio;
    var fSize = config.TEXT_SIZE*pxRatio;
    tCanvas.width = window.innerWidth*pxRatio;
    tCanvas.height = window.innerHeight*pxRatio;
    tCtx.fillStyle = "black";

    tCtx.font = "bold " + fSize + "px Inter";
    tCtx.textAlign = "center";
    tCtx.textBaseline = "middle";

    tCtx.fillText(config.TEXT, tCanvas.width/2,tCanvas.height/2);

    return [tCtx.getImageData(0,0,tCanvas.width,tCanvas.height),tCanvas.width];
}

function getSeeding() {
    let textData     = drawText();
    let imgData      = textData[0];
    let imgDataWidth = textData[1];

    let seedCoords = [];

    for (var i = 0; i < imgData.data.length; i+=4) {
        if (imgData.data[i+3] > 0) {
            seedCoords.push(indToCoord(i,imgDataWidth));
        }
    }

    seedCoords = shuffle(seedCoords);
    // seedCoords = seedCoords.splice(0,config.NUM_TILES);

    for (var i = 0; i < seedCoords.length; i++) {
        seedCoords[i][0] *= canv.width/imgDataWidth;
        seedCoords[i][1] *= canv.width/imgDataWidth;
    }

    return [seedCoords,imgData,imgDataWidth];
}

var seedCoords;
var seedImgData;
var seedImgWidth;
var mpos = [0,0];

function rebuildTree() {
    let newTreeData = [];
    for (var i = 0; i < tiles.length; i++) {
        newTreeData = newTreeData.concat(tiles[i].treeData);
    }

    tree = new kdTree(newTreeData, fastDist, ["0", "1", "2"]);
}

function randomSeed() {
    while (tiles.length < config.NUM_TILES && seedCoords.length > 0) {
        let curSeedCoord = seedCoords.splice(0,1)[0];
        let free = true;
        for (var i = 0; i < tiles.length; i++)
            if (tiles[i].isNear(curSeedCoord) || tiles[i].willContain(curSeedCoord))
                free = false;
        if (free) tiles.push(new Tile(i,curSeedCoord,seedImgData,seedImgWidth));
        rebuildTree();
    }
}

function clearTiles() {
    tiles = [];
}

function startTiling() {
    let seedData = getSeeding();
    seedCoords   = seedData[0];
    seedImgData  = seedData[1];
    seedImgWidth = seedData[2];

    clearTiles();
    console.log("tiling ready");
}

function initCanvas() {
    canv = document.getElementById("canvas");
    ctx = canv.getContext("2d");

    canv.width  = window.innerWidth  * RES_RATIO;
    canv.height = window.innerHeight * RES_RATIO;

    ctx.lineWidth = config.STROKE_WIDTH*RES_RATIO;
    ctx.lineJoin = "round";// || "bevel" || "miter";
    ctx.strokeStyle = config.BORDER_COLOR;
}

const SECOND = 60;

var fc = 0;
var maxFc = SECOND * 30;

var record = false;
var cvg;

var mouseAdditions;
const mouseAddColors = ["#ffffff","#ff0000","#0000ff","#00ff00"];
var curMouseColor;

var animationLoopID = false;

function animate() {
    ctx.fillStyle = config.BG_COLOR;
    ctx.fillRect(0,0,canv.width,canv.height);
    curTime += 0.005;

    // update all tiles
    for (var i = 0; i < tiles.length; i++) {
        if (!mouseIsDown) tiles[i].update();
        tiles[i].draw();
    }
    rebuildTree();

    if (mouseIsDown && mouseAdditions.length > 0) {
        ctx.beginPath();
        ctx.fillStyle = curMouseColor;
        for (var i = 0; i < mouseAdditions.length; i++) {
            drawCircle(mouseAdditions[i][0],mouseAdditions[i][1],2*RES_RATIO);
        }
        ctx.fill();
        ctx.closePath();
    }

    animationLoopID = requestAnimationFrame(animate);
}

function exportSVG() {
    svgDraw.clear(); // hopefully this clears the svg canvas

    for (var i = 0; i < tiles.length; i++) {
        tiles[i].drawSVGPoly();
    }
}

function handleMouseMove(ev) {
    let x = ev.clientX*RES_RATIO;
    let y = ev.clientY*RES_RATIO;

    mpos = [x,y];
    if (mouseIsDown) mouseAdditions.push(mpos);
}

var mouseIsDown = false;

function handleMouseDown(ev) {
    mouseAdditions = [];
    mouseIsDown = true;
    // get the current mouse color
    for (var i = 0; i < mouseAddColors.length; i++) {
        if (mouseAddColors[i] != config.BG_COLOR &&
            mouseAddColors[i] != config.STROKE_COLOR &&
            mouseAddColors[i] != config.FILL_COLOR) {
            curMouseColor = mouseAddColors[i];
            break;
        }
    }

    handleMouseMove(ev);
}

function handleMouseUp() {
    mouseIsDown = false;
    while (mouseAdditions.length > 0) {
        let curMpos = mouseAdditions.splice(0,1)[0];
        let free = seedImgData.data[coordToInd(Math.floor(curMpos[0]),Math.floor(curMpos[1]),seedImgWidth)+3] > 0;
        for (var i = 0; i < tiles.length; i++) {
            if (tiles[i].isNear(curMpos) || tiles[i].willContain(curMpos)) {
                free = false;
                break;
            }
        }
        if (free) {
            tiles.push(new Tile(tiles.length,curMpos,seedImgData,seedImgWidth));
            rebuildTree();
        }
    }
}

function finishFontLoad() {
    console.log("font loaded");
    if (animationLoopID) cancelAnimationFrame(animationLoopID);
    startTiling();
    animate();
}

function loadFont() {
    console.log("loading font");
    // WebFont.load({
    //     custom: {families: ["Inter"]},
    //     urls: ["style.css"],
    //     active: finishFontLoad
    // });
    let fface = new FontFace('Inter', 'url("./Inter-Bold.ttf")');
    document.fonts.add(fface);
    fface.load().then(finishFontLoad);
}

function init() {
    var gui = new dat.GUI();

    let gWidthGui       = gui.add(config,"GAP_WIDTH");
    gWidthGui.onFinishChange(startTiling);
    let numTilesGui     = gui.add(config,"NUM_TILES");
    numTilesGui.onFinishChange(startTiling);
    let tileVertsGui    = gui.add(config,"NUM_TILE_VERTS");
    tileVertsGui.onFinishChange(startTiling);
    let bgColorGui      = gui.addColor(config,"BG_COLOR");
    let fillToggleGui   = gui.add(config,"DO_FILL");
    let fillColorGui    = gui.addColor(config,"FILL_COLOR");
    let strokeToggleGui = gui.add(config,"DO_STROKE");
    let strokeColorGui  = gui.addColor(config,"STROKE_COLOR");
    let strokeWidthGui  = gui.add(config,"STROKE_WIDTH");
    strokeWidthGui.onChange(function () {
        ctx.lineWidth = config.STROKE_WIDTH*RES_RATIO;
    });

    let doRandSeedGui = gui.add(config,"DO_RAND_SEED");
    let clearTilesGui = gui.add(config,"CLEAR_TILES");

    let textSizeGui = gui.add(config,"TEXT_SIZE", 0, 1000);
    textSizeGui.onFinishChange(startTiling);
    let textGui = gui.add(config,"TEXT");
    textGui.onFinishChange(startTiling);

    simplex = new SimplexNoise();
    initCanvas();
    loadFont();

    window.addEventListener("mousemove",handleMouseMove);
    window.addEventListener("mousedown",handleMouseDown);
    window.addEventListener("mouseup",handleMouseUp);

    svgDraw = SVG('svg_draw').size(window.innerWidth, window.innerHeight);
}

window.onload = init;
