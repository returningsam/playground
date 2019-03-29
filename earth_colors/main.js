var elevator, geocoder, simplex;

const PALLETS = {
    "default": [
        "#010E3F",
        "#011842",
        "#003A59",
        "#016874",
        "#005852",
        "#2E3D37",
        "#697358",
        "#BAB273",
        "#EBD18A",
        "#FFE3A4",
    ],
    "b&w": [
        "#000000",
        "#343434",
        "#5b5b5b",
        "#858585",
        "#b3b3b3",
        "#dbdbdb",
        "#ffffff",
    ],
    "red and blue": [
        "#0F275C",
        "#4C86A1",
        "#F0EEDA",
        "#C21E23",
        "#631B18",
    ],
    "bad at naming": [
        "#F3E2D2",
        "#6186A5",
        "#035374",
        "#F29E3C",
        "#EF801A",
    ],
    "everest": [
        "#010D26",
        "#0E3A73",
        "#395D8C",
        "#6D8BA6",
        "#F2F2F2",
    ]
}

var config = {
    RES_RATIO: 2,
    BG_COLOR: "#000000",
    PALLET: "default",
    NUM_SAMPLES: 1000,
    MARGIN: 100,
    WARP_AMT: 30,
    WARP_DENSITY: .002,
    HULL_CONTAIN: false,
    HULL_CONCAVE: false,
    HULL_CONCAVITY: 40,
    DRAW_REF_COUNT: 3,
    SPREAD_DIST: 100,
    RAND_CENTER: false,
    LAT_CENTER: -3.0674,
    LNG_CENTER: 37.3556,
    START: start
}

function uniq(a) {
   return Array.from(new Set(a));
}

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function lerpColor(a, b, amt) {
    try {
        var ah = parseInt(a.replace(/#/g, ''), 16),
            ar = ah >> 16, ag = ah >> 8 & 0xff, ab = ah & 0xff,
            bh = parseInt(b.replace(/#/g, ''), 16),
            br = bh >> 16, bg = bh >> 8 & 0xff, bb = bh & 0xff,
            rr = ar + amt * (br - ar),
            rg = ag + amt * (bg - ag),
            rb = ab + amt * (bb - ab);

        return '#' + ((1 << 24) + (rr << 16) + (rg << 8) + rb | 0).toString(16).slice(1);
    } catch (e) {
        console.log("color inperpolation error. values: ", a, b, amt);
    }
}

function colorFromPerc(perc) {
    let find = perc/(1/(PALLETS[config.PALLET].length-1));
    let level = Math.floor(find);
    let betw  = find - level;
    if (betw == 0) return PALLETS[config.PALLET][level];
    else return lerpColor(PALLETS[config.PALLET][level],PALLETS[config.PALLET][level+1],betw);
}

function contains(point, vs) {
    // ray-casting algorithm based on
    // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html

    var x = point.x, y = point.y;

    var inside = false;
    for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        var xi = vs[i].x, yi = vs[i].y;
        var xj = vs[j].x, yj = vs[j].y;

        var intersect = ((yi > y) != (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }

    return inside;
};

function fastDist(p1,p2) {
    let a = (p1.x - p2.x);
    let b = (p1.y - p2.y);
    return (a*a + b*b);
}

function dist(p1,p2) {
    return Math.sqrt(fastDist(p1,p2));
}

function indToCoord(i,w) {
    i = i/4;
    var x = i%w;
    var y = (i-x)/w;
    return {x:x,y:y};
}

function coordToInd(x,y,w) {
    return Math.floor((((y*w)+x)*4));
}

function getRandSpread() {
    let spread = [];
    let center
    if (config.RAND_CENTER) {
        center = {
            lat: chance.floating({min:-90,max:90}),
            lng: chance.floating({min:-180,max:180})
        };
    }
    else {
        center = {
            lat: config.LAT_CENTER,
            lng: config.LNG_CENTER,
        }
    }
    spread.push(center);
    let maxSpread = config.SPREAD_DIST;
    for (var i = 0; i < config.NUM_SAMPLES; i++) {
        let dist = chance.floating({min:0,max:maxSpread});
        let ang  = chance.floating({min:0,max:360});

        let newLoc = destVincenty(center.lat,center.lng,ang,dist);

        // make sure it is not a duplicate;
        let dup = false;
        for (var j = 0; j < spread.length; j++) {
            if (spread[j].lat == newLoc.lat && spread[j].lng == newLoc.lng) {
                dup = true;
                break;
            }
        }
        if (dup) {
            i--;
            continue;
        }

        spread.push(newLoc);
    }
    return spread;
}

var compLocs;
var elevDataHolder;

function getAreaElevations(data,status) {
    // if recieving data, and data is valid, concat to holder array
    if (data && data.length && status == "OK") {
        console.log(status);
        compLocs.splice(0,500);
        if (!elevDataHolder) elevDataHolder = [];
        elevDataHolder = elevDataHolder.concat(data);
    }
    else if (status == "OVER_QUERY_LIMIT") { // query limit hit (temporarily), wait a bit and get going again.
        console.log(status + " adding timeout...");
        return setTimeout(getAreaElevations, 5000);
    }

    // if the array holdin locations to lookup is still full, take 500 and look them up
    // (500 seems to be a good per-query limit)
    if (compLocs.length > 0) {
        let curLocs = compLocs.slice(0,500);
        elevator.getElevationForLocations({
            'locations': curLocs
        }, getAreaElevations);
    }
    else { // if all the locations have been looked up, analyze computed data
        handleElevationsResults(elevDataHolder);
    }
}

function handleElevationsResults(data) {
    compEls = null; // clear for future operations
    elevDataHolder = null;

    // init max and mins with first value
    let maxElev = data[0].elevation,
        minElev = data[0].elevation;

    for (var i = 0; i < data.length; i++) {
        // check for min and max elevation
        maxElev = Math.max(maxElev,data[i].elevation);
        minElev = Math.min(minElev,data[i].elevation);

        // modify location format for later processing
        data[i].pos = {
            x: data[i].location.lng(),
            y: data[i].location.lat(),
        }
        // clear some data for memory i guess (why not)
        delete data[i].location;
    }

    // constain all locations to one "hemisphere"
    // this will ensure a good even spreads
    for (var i = 0; i < data.length-1; i++) {
        let curPos = data[i].pos;
        let nextPosOps = [];
        for (var j = -2; j <= 2; j++) {
            nextPosOps.push({
                x:data[i+1].pos.x + j*180,
                y:data[i+1].pos.y
            });
        }
        let sorted = nextPosOps.sort((a,b) => (fastDist(curPos,a) - fastDist(curPos,b)));
        data[i+1].pos = sorted[0];
    }

    // range of elevation data...
    let elevRange = maxElev - minElev;

    // init coordinate bounds
    let minX = data[0].pos.x,
        maxX = data[0].pos.x,
        minY = data[0].pos.y,
        maxY = data[0].pos.y;

    for (var i = 0; i < data.length; i++) {
        // interpolate elevation
        data[i].elevPerc = (data[i].elevation - minElev)/elevRange;
        // decide color for data point
        data[i].color = hexToRgb(colorFromPerc(data[i].elevPerc));
        // get coordinate bounds
        minX = Math.min(minX,data[i].pos.x);
        maxX = Math.max(maxX,data[i].pos.x);
        minY = Math.min(minY,data[i].pos.y);
        maxY = Math.max(maxY,data[i].pos.y);
    }

    // comput coordinate ranges
    let xRange = maxX-minX;
    let yRange = maxY-minY;

    // interpolate positions (convert all coordinate values to 0->1 ranges)
    // x values need to be mirrored
    for (var i = 0; i < data.length; i++) {
        data[i].pos.x = 1-((data[i].pos.x - minX)/xRange);
        data[i].pos.y = (data[i].pos.y - minY)/yRange;
    }

    // pass to drawing function
    createElevationImage(data);
}

var canv, ctx;

function drawCirc(x,y,r,c) {
    ctx.fillStyle = c; // c is color
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fill();
    ctx.closePath();
}

var posData;
var posTree;
var posImgData;

function createElevationImage(data) {
    // map coordinates to canvas coordinates
    // flatten object attributes
    for (var i = 0; i < data.length; i++) {
        data[i].x = data[i].pos.x * (canv.width - config.MARGIN) + config.MARGIN/2;
        data[i].y = data[i].pos.y * (canv.height - config.MARGIN) + config.MARGIN/2;
        delete data[i].pos;
    }
    posData = data;

    // create hull if needed
    let curHull;
    if (config.HULL_CONTAIN) {
        curHull = (config.HULL_CONCAVE ?
                   hull(data, config.HULL_CONCAVITY, [".x",".y"]) :
                   hull(data, Infinity, [".x",".y"]));
    }

    // create kd tree for fast(er) data lookup during drawing
    posTree = new kdTree(data, fastDist, ["x","y"]);

    // compute bg rgb values
    let bgColor = hexToRgb(config.BG_COLOR);

    // get imae data to work with
    posImgData = ctx.getImageData(0,0,canv.width,canv.height);
    for (var i = 0; i < posImgData.data.length; i+=4) {
        if (i % Math.floor(posImgData.data.length/500) == 0) {
            console.log((Math.floor(100*i/posImgData.data.length)) + "% complete");
        }
        let cPos = indToCoord(i,canv.width);

        if (config.WARP_AMT > 0) {
            cPos.x += config.WARP_AMT*simplex.noise2D(
                cPos.x*config.WARP_DENSITY,
                cPos.y*config.WARP_DENSITY
            );
            cPos.y += config.WARP_AMT*simplex.noise2D(
                cPos.x*config.WARP_DENSITY + 23754,
                cPos.y*config.WARP_DENSITY + 327169
            );
        }

        if (config.HULL_CONTAIN && !contains(cPos,curHull)) {
            posImgData.data[i]   = bgColor.r;
            posImgData.data[i+1] = bgColor.g;
            posImgData.data[i+2] = bgColor.b;
            posImgData.data[i+3] = 255;
            continue;
        }

        let numClosest = config.DRAW_REF_COUNT;
        let closest = posTree.nearest(cPos, numClosest);
        let avgColor = {r:0,g:0,b:0};
        for (var j = 0; j < closest.length; j++) {
            avgColor.r += closest[j][0].color.r;
            avgColor.g += closest[j][0].color.g;
            avgColor.b += closest[j][0].color.b;
        }
        posImgData.data[i]   = avgColor.r/numClosest;
        posImgData.data[i+1] = avgColor.g/numClosest;
        posImgData.data[i+2] = avgColor.b/numClosest;
        posImgData.data[i+3] = 255;
    }

    drawShit();
}

function drawShit() {
    ctx.clearRect(0,0,canv.width,canv.height);
    ctx.putImageData(posImgData,0,0);

    if (config.DRAW_DATA_POINTS) {
        for (var i = 0; i < posData.length; i++) {
            drawCirc(
                posData[i].x,posData[i].y,
                config.DATA_POINT_RADIUS,
                config.DATA_POINT_COLOR
            );
        }
    }
}

function initCanvas() {
    canv = document.getElementById("canvas");
    ctx  = canv.getContext("2d");

    ctx.lineJoin = "round";
    ctx.lineWidth = 1*config.RES_RATIO;
}

var gui;
var marginGui;

function initGUI() {
    gui = new dat.GUI();
    gui.domElement.style.zIndex = 100;

    gui.add(config,"RES_RATIO",1,4);
    gui.addColor(config,"BG_COLOR");
    gui.add(config,"PALLET",Object.keys(PALLETS));
    gui.add(config,"NUM_SAMPLES", 5, 10000);
    gui.add(config,"SPREAD_DIST", 10,5000).name("Spread (miles)");
    marginGui = gui.add(config,"MARGIN", 0, Math.min(canv.width,canv.height)/3);
    gui.add(config,"WARP_AMT", 0, 200);
    gui.add(config,"WARP_DENSITY", .0005,1);
    gui.add(config,"HULL_CONTAIN");
    gui.add(config,"HULL_CONCAVE");
    gui.add(config,"HULL_CONCAVITY", 1, 10000);
    gui.add(config,"DRAW_REF_COUNT", 1, 20);
    gui.add(config,"RAND_CENTER");
    gui.add(config,"LAT_CENTER",-90,90);
    gui.add(config,"LNG_CENTER",-180,180);
    gui.add(config,"START");
}

function handleResize() {
    canv.width  = window.innerWidth  * config.RES_RATIO;
    canv.height = window.innerHeight * config.RES_RATIO;

    marginGui.__max = Math.min(canv.width,canv.height)/3;
}

function start() {
    compLocs = getRandSpread();
    getAreaElevations();
}

function init() {
    simplex  = new SimplexNoise();
    elevator = new google.maps.ElevationService;
    geocoder = new google.maps.Geocoder;

    initCanvas();
    initGUI();
    handleResize();
    window.onresize = handleResize;

    start();
}

window.onload = init;
