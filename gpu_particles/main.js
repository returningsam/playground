/******************************************************************************/
/*************************** Helpers ******************************************/
/******************************************************************************/

function round(a,b=.1){var c=a%b;return a-c+(c/b+1.5>>1)*b}

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

function parseHexStr(str) {return parseInt(str.replace(/^#/, ''), 16);}

function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function distance(x1,y1,x2,y2) {
    let a = x1 - x2;
    let b = y1 - y2;
    return Math.sqrt( a*a + b*b );
}

/******************************************************************************/
/*************************** Seeding Canvas ***********************************/
/******************************************************************************/

var sCanv;
var sCtx;

function indToCoord(i,width) {
    i = i/4;
    var x = i%width;
    var y = (i-x)/width;
    return [x,y];
}

function coordToInd(x,y,width) {
    return (((y*width)+x)*4);
}

// input range (-100 -> 100)
function contrastImage(imgData, contrast) {
    var d = imgData.data;
    contrast = (contrast/100) + 1;
    var intercept = 128 * (1 - contrast);
    for(var i=0;i<d.length;i+=4) {
        d[i] = d[i]*contrast + intercept;
        d[i+1] = d[i+1]*contrast + intercept;
        d[i+2] = d[i+2]*contrast + intercept;
    }
    return imgData;
}

function doImageSeed() {
    if (!sCanv) initSeedCanv();
    sCtx.clearRect(0,0,sCanv.width,sCanv.height);

    let seedImage = new Image();
    seedImage.src = "./seed.jpg";
    seedImage.onload = function () {

        let imgRatio   = seedImage.width/seedImage.height;
        let sCanvRatio = sCanv.width/sCanv.height;

        sCtx.drawImage(
            seedImage,
            0, 0, seedImage.width, seedImage.height,
            0, 0, sCanv.width,     sCanv.height
        );

        var filledCoords = [];
        var sImgData = sCtx.getImageData(0,0,sCanv.width,sCanv.height);
        let thresh = 255/2;
        for (var i = 0; i < sImgData.data.length; i+=4) {
            let curCoord = indToCoord(i,sCanv.width);
            if (sImgData.data[i] > thresh || sImgData.data[i+1] > thresh || sImgData.data[i+2] > thresh) {
                filledCoords.push(curCoord);
            }
        }

        shuffle(filledCoords);
        let finalSeeds = filledCoords.slice(0,options.numParticles);
        console.log(finalSeeds);
        updateParticlesSeed(finalSeeds);
    }
}

function getTextSeed(text) {
    if (!sCanv) initSeedCanv();
    sCtx.fillStyle = "white";
    sCtx.fillRect(0,0,sCanv.width,sCanv.height);

    let fSize = (options.font_size*UPSCALE);
    sCtx.font = "bold italic " + fSize + "px Verdana";
    sCtx.textAlign    = options.font_align;
    sCtx.textBaseline = "middle";
    sCtx.fillStyle = "black";

    var lines = text.split("|");
    lines = lines.filter(function (el) {return el.length > 0;});

    for (var i = 0; i < lines.length; i++) {
        let cur  = i;
        let hDiff = (Math.ceil(cur-(lines.length/2)))*fSize;
        if (lines.length % 2 == 0) hDiff += fSize/1.8;

        if (options.font_align == "left")
            sCtx.fillText(lines[i], 100, sCanv.height/2 + hDiff);
        else if (options.font_align == "center")
            sCtx.fillText(lines[i], sCanv.width/2, sCanv.height/2 + hDiff);
        else if (options.font_align == "right")
            sCtx.fillText(lines[i], sCanv.width - 100, sCanv.height/2 + hDiff);
    }

    var filledCoords = [];
    var sImgData = sCtx.getImageData(0,0,sCanv.width,sCanv.height);
    for (var i = 0; i < sImgData.data.length; i+=4) {
        let curCoord = indToCoord(i,sCanv.width);
        if (sImgData.data[i] < 100 || sImgData.data[i+1] < 100 || sImgData.data[i+2] < 100) {
            filledCoords.push(curCoord);
        }
    }

    shuffle(filledCoords);
    return filledCoords.slice(0,options.numParticles);
}

function initSeedCanv() {
    sCanv = document.createElement("canvas");
    sCtx  = sCanv.getContext("2d");

    sCanv.width = window.innerWidth  * UPSCALE;
    sCanv.height = window.innerHeight * UPSCALE;

    // remove this
    // sCanv.style.width = window.innerWidth;
    // sCanv.style.height = window.innerHeight;
    // sCanv.style.position = "fixed";
    // sCanv.style.top = 0;
    // sCanv.style.left = 0;
    // sCanv.style.zIndex = 1000;
    // document.body.appendChild(sCanv);
}

/******************************************************************************/
/*************************** Random Seeding ***********************************/
/******************************************************************************/

function getRandomSeed() {
    var randSeeds = [];
    for (var i = 0; i < options.numParticles; i++) {
        var x = chance.integer({min:10,max:(window.innerWidth*UPSCALE)-10});
        var y = chance.integer({min:10,max:(window.innerHeight*UPSCALE)-10});
        randSeeds.push([x,y]);
    }
    return randSeeds;
}

/******************************************************************************/
/*************************** Particles Data ***********************************/
/******************************************************************************/

const PART_LEN  = 7;
var particles = [];
var updateParticles;

function sortSeeds(seeds) {
    let sortedSeeds = [];
    for (var i = 0; i < particles.length; i++) {
        for (var j = 0; j < particles[i].length; j++) {
            let px = particles[i][j][2];
            let py = particles[i][j][3];

            let curMinDist = 100000;
            let curMinDistInd = 0;
            for (var k = 0; k < seeds.length; k++) {
                let sx = seeds[k][0];
                let sy = seeds[k][1];
                let curDist = distance(px,py,sx,sy);
                if (curDist < curMinDist) {
                    curMinDist    = curDist;
                    curMinDistInd = k;
                }
            }
            sortedSeeds.push(seeds.splice(curMinDistInd, 1)[0]);
        }
    }
    return sortedSeeds;
}

function updateParticlesSeed(seeds) {
    if (seeds.length != options.numParticles) {
        console.log(seeds.length,options.numParticles);
    }

    options.spring_back = 0.0001;

    for (var i = 0; i < particles.length; i++) {
        for (var j = 0; j < particles[i].length; j++) {
            var curSeed = seeds.shift();
            var x = curSeed[0];
            var y = curSeed[1];
            particles[i][j][4] = x;
            particles[i][j][5] = y;
        }
    }

    for (var i = 0; i < 20; i++)
        setTimeout(function () {options.spring_back += .1;}, 100*i);
}

function updateParticlesSeedSorted(seeds) {
    if (seeds.length != options.numParticles) {
        console.log(seeds.length,options.numParticles);
    }

    seeds = sortSeeds(seeds);
    options.spring_back = 0.0001;

    for (var i = 0; i < particles.length; i++) {
        for (var j = 0; j < particles[i].length; j++) {
            var curSeed = seeds.shift();
            var x = curSeed[0];
            var y = curSeed[1];
            particles[i][j][4] = x;
            particles[i][j][5] = y;
        }
    }

    for (var i = 0; i < 20; i++)
        setTimeout(function () {options.spring_back += .1;}, 100*i);
}

function randomizeParticles() {
    var root = Math.floor(Math.sqrt(options.numParticles));
    for (var i = 0; i < root; i++) {
        particles.push([]);
        for (var j = 0; j < root; j++) {
            var x = chance.integer({min:10,max:(window.innerWidth*UPSCALE)-10});
            var y = chance.integer({min:10,max:(window.innerHeight*UPSCALE)-10});
            var curPart = [
                0,   // dx
                0,   // dy
                x,   // x coordinate
                y,   // y coordinate
                x,   // orig x coordinate
                y,   // orig y coordinate
                i+j  // id
            ];

            particles[i].push(curPart);
        }
    }
}

function seedParticles(seeds) {
    var root = Math.floor(Math.sqrt(options.numParticles));
    for (var i = 0; i < root; i++) {
        particles.push([]);
        for (var j = 0; j < root; j++) {
            var curSeed = seeds.pop();
            var x = curSeed[0];
            var y = curSeed[1];
            var curPart = [
                0,   // dx
                0,   // dy
                x,   // x coordinate
                y,   // y coordinate
                x,   // orig x coordinate
                y,   // orig y coordinate
                i+j  // id
            ];

            particles[i].push(curPart);
        }
    }
}

const SECOND = 60;
var tempOptions;

function runNYAnim() {
    if (fc == Math.round(SECOND)) {
        updateParticlesSeed(getTextSeed("2018"));
    }
    if (fc == 8*SECOND) {
        updateParticlesSeed(getRandomSeed());
    }
    if (fc == Math.round(8.5*SECOND)) {
        updateParticlesSeed(getTextSeed("2019"));
    }
    if (fc == 15.5*SECOND) {
        updateParticlesSeed(getRandomSeed());
    }
    if (fc == Math.round(16*SECOND)) {
        options.font_size = 200;
        updateGUI();
        updateParticlesSeed(getTextSeed("HAPPY|NEW|YEAR!"));
    }
    if (fc == Math.round(16.3*SECOND)) {
        options.ms_gravity = -3.3;
        options.m_spread = 2.2;
        options.auto_mouse_speed = 0.014;
    }
}

function runCountingAnim() {
    options.font_size = 250;
    let step = 5;
    if (fc == Math.round(0.01*SECOND)) {
        updateParticlesSeed(getTextSeed("1      |       |       "));
    }
    if (fc == Math.round(step*SECOND)) {
        updateParticlesSeed(getTextSeed("   2   |       |       "));
    }
    if (fc == Math.round(2*step*SECOND)) {
        updateParticlesSeed(getTextSeed("      3|       |       "));
    }
    if (fc == Math.round(3*step*SECOND)) {
        updateParticlesSeed(getTextSeed("       |4      |       "));
    }
    if (fc == Math.round(4*step*SECOND)) {
        updateParticlesSeed(getTextSeed("       |   5   |       "));
    }
    if (fc == Math.round(5*step*SECOND)) {
        updateParticlesSeed(getTextSeed("       |      6|       "));
    }
    if (fc == Math.round(6*step*SECOND)) {
        updateParticlesSeed(getTextSeed("       |       |7      "));
    }
    if (fc == Math.round(7*step*SECOND)) {
        updateParticlesSeed(getTextSeed("       |       |   8   "));
    }
    if (fc == Math.round(8*step*SECOND)) {
        updateParticlesSeed(getTextSeed("       |       |      9"));
    }
}

function runYesNoAnim() {
    if (fc % Math.round(9.5*SECOND) == 0) {
        updateParticlesSeed(getRandomSeed());
    }
    if (fc % Math.round(10*SECOND) == 0) {
        updateParticlesSeed(getTextSeed("NO"));
    }
    if ((fc % Math.round(9.5*SECOND)) - Math.round(5*SECOND) == 0) {
        updateParticlesSeed(getRandomSeed());
    }
    if ((fc % Math.round(10*SECOND)) - Math.round(5*SECOND) == 0) {
        updateParticlesSeed(getTextSeed("YES"));
    }
}

function resetParticles() {
    particles = [];
    randomizeParticles();
    createUpdateParticlesKernel();
    curMaxDist = 30;
    fc = 0;
    // doImageSeed();
}



function createUpdateParticlesKernel() {
    if (updateParticles) updateParticles.destroy();
    let root = Math.floor(Math.sqrt(options.numParticles));
    updateParticles = gpu.createKernel(function (p,msx,msy,mxw,mxh,inertia,grav,dPow,minDist,pSpring) {
        if (this.thread.x < 2.) {
            const curVal = p[this.thread.z][this.thread.y][this.thread.x];

            const cur_x = p[this.thread.z][this.thread.y][2];
            const cur_y = p[this.thread.z][this.thread.y][3];
            const def_x = p[this.thread.z][this.thread.y][4];
            const def_y = p[this.thread.z][this.thread.y][5];

            const mxdist = dist(0,0,mxw,mxh);

            const mdist  = max(minDist,pow(dist(cur_x,cur_y,msx,msy),dPow));
            mdist        = mdist/mxdist;
            const mdiff  = diff(cur_x,cur_y,msx,msy);
            if (mdist>15000) {
                mdiff = [0,0];
            }

            const pdist  = pow(dist(cur_x,cur_y,def_x,def_y),1.5)/200;
            const pdiff  = diff(cur_x,cur_y,def_x,def_y);

            if (this.thread.x == 0) {
                mdiff[0] = mdiff[0]*grav/mdist;
                pdiff[0] = pdiff[0]*pSpring/max(5,pdist);

                const tdiff = mdiff[0] + pdiff[0];

                return (curVal*inertia + tdiff)/(inertia+1);
            }
            if (this.thread.x == 1) {
                mdiff[1] = mdiff[1]*grav/mdist;
                pdiff[1] = pdiff[1]*pSpring/max(5,pdist);

                const tdiff = mdiff[1] + pdiff[1];

                return (curVal*inertia + tdiff)/(inertia+1);
            }
        }
        if ((this.thread.x == 2. || this.thread.x == 3.)) {
            return p[this.thread.z][this.thread.y][this.thread.x] + p[this.thread.z][this.thread.y][this.thread.x-2];
        }
        return p[this.thread.z][this.thread.y][this.thread.x];
    }).setOutput({x: PART_LEN, y: root, z: root});
}

function initParticles() {
    resetParticles();
    gpu.addFunction(function dist(x1,y1,x2,y2) {
        const dx = abs(x1-x2);
        const dy = abs(y1-y2);
        return sqrt((dx*dx) + (dy*dy));
    },{paramTypes: { x1: 'Number', y1: 'Number', x2: 'Number', y2: 'Number'}, returnType: 'Number' });

    gpu.addFunction(function diff(x1,y1,x2,y2) {
        return [x2-x1,y2-y1];
    },{paramTypes: { x1: 'Number', y1: 'Number', x2: 'Number', y2: 'Number'}, returnType: 'Array(2)' });

    createUpdateParticlesKernel();

    animate();
}

/******************************************************************************/
/*************************** Animation Loop ***********************************/
/******************************************************************************/

var time = 0;
var fc   = 0;
var mfc  = SECOND*60;
var cvg = false;

function animate() {
    stats.begin();

    if (cvg) cvg.addFrame(canvas);
    fc++;

    if (options.auto_mouse) simplexMouseMovement();
    particles = updateParticles(
        particles,
        msPos[0],
        msPos[1],
        window.innerWidth*UPSCALE,
        window.innerHeight*UPSCALE,
        options.inertia,
        options.ms_gravity*msTimeout,
        options.m_spread,
        options.minDist,
        options.spring_back
    );
    drawParticles();
    stats.end();

    if (cvg) {
        if (fc < mfc) window.requestAnimationFrame(animate);
        else {
            cvg.render('render');
            cvg = false;
        }
    }
    else window.requestAnimationFrame(animate);

    if (options.grav_on_move) {
        msTimeout = Math.max(0,Math.min(msTimeout - 0.01,Math.pow(msTimeout,.9)));
    }
}

/******************************************************************************/
/*************************** Canvas/Drawing ***********************************/
/******************************************************************************/

const UPSCALE = 1.;
var canv;
var ctx;
var rcanv;
var rctx;
var curSprite;

var curMaxDist = 0;

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
    rctx.fillRect(x-hr,y-hr,r,r);
}

function drawSprite(x,y,r) {
    let hr = (r/2); // half radius
    rctx.drawImage(curSprite,x-hr,y-hr,r,r);
}

function processParticles() {
    var pParts = {};
    for (var i = 0; i < particles.length; i++) {
        for (var j = 0; j < particles[i].length; j++) {
            let curx = particles[i][j][2];
            let cury = particles[i][j][3];

            let dx = particles[i][j][0] + chance.floating({min: -1,max: 1});
            let dy = particles[i][j][1] + chance.floating({min: -1,max: 1});

            let curDist = Math.sqrt(dx*dx + dy*dy);
            curMaxDist = Math.max(curMaxDist,curDist);

            let distPerc = round(Math.min(1,((curDist*3)/curMaxDist)),.001);

            if (!pParts[distPerc]) {
                var newLevel = {
                    dp: distPerc,
                    particles: [],
                    size: (options.size_change ? interpolateVal(distPerc,options.minParticleSize,options.maxParticleSize) : options.minParticleSize),
                    color: (options.color_change ? interpolateColor(distPerc,options.color_1,options.color_2) : options.color_1)
                }
                pParts[distPerc] = newLevel;
            }

            pParts[distPerc].particles.push([curx,cury,dx,dy]);
        }
    }
    return pParts;
}

function drawParticlesPP() {
    var pParts = processParticles();

    rctx.fillStyle = options.bg_color;
    rctx.fillRect(0,0,(window.innerWidth*UPSCALE),(window.innerHeight*UPSCALE));

    if (options.shape != "sprite" && !options.color_change) {
        rctx.fillStyle   = options.color_1;
        rctx.strokeStyle = options.color_1;
    }

    var keys = Object.keys(pParts);
    for (var i = 0; i < keys.length; i++) {
        let curDistPerc = keys[i];
        if (pParts[curDistPerc]) {
            let curLevel = pParts[curDistPerc];

            if (options.color_change) {
                rctx.fillStyle = curLevel.color;
                rctx.strokeStyle = curLevel.color;
            }

            if (options.size_change)
                rctx.lineWidth = curLevel.size;

            for (var j = 0; j < curLevel.particles.length; j++) {
                let curParticle = curLevel.particles[j];
                let curx = curParticle[0];
                let cury = curParticle[1];
                let dx   = curParticle[2];
                let dy   = curParticle[3];

                if (options.shape == "line")
                    drawLine(curx - options.maxLineLen*dx, cury - options.maxLineLen*dy,curx,cury)

                if (options.shape == "circle")
                    drawCirc(curx,cury,curLevel.size);

                if (options.shape == "rectangle")
                    drawRect(curx,cury,curLevel.size);

                if (options.shape == "sprite")
                    drawSprite(curx,cury,curLevel.size);
            }
        }
    }

    if (options.show_mouse && options.auto_mouse) {
        rctx.fillStyle = "red";
        drawRect(msPos[0],msPos[1],10*UPSCALE);
    }

    ctx.clearRect(0,0,(window.innerWidth*UPSCALE),(window.innerHeight*UPSCALE));
    ctx.drawImage(rcanv,0,0);
}

function drawParticles() {
    rctx.fillStyle = options.bg_color;
    rctx.fillRect(0,0,(window.innerWidth*UPSCALE),(window.innerHeight*UPSCALE));

    if (options.shape != "sprite" && !options.color_change) {
        rctx.fillStyle   = options.color_1;
        rctx.strokeStyle = options.color_1;
    }

    for (var i = 0; i < particles.length; i++) {
        for (var j = 0; j < particles[i].length; j++) {
            let curx = particles[i][j][2];
            let cury = particles[i][j][3];

            let dx = particles[i][j][0];
            let dy = particles[i][j][1];

            let curDist = Math.sqrt(dx*dx + dy*dy);
            curMaxDist = Math.max(curMaxDist,curDist);

            let distPerc = Math.max(0.000001,Math.min(1,((curDist*3)/curMaxDist)));
            if (options.spring_back > 0) distPerc = 1-distPerc;


            if (options.shape == "line") {
                if (options.maxParticleSize > 1 && options.size_change) {
                    let curWidth = interpolateVal(distPerc,options.minParticleSize,options.maxParticleSize);
                    rctx.lineWidth = curWidth;
                }
                if (options.color_change)
                    rctx.strokeStyle = interpolateColor(distPerc,options.color_1,options.color_2);

                let lLen = interpolateVal(distPerc,options.minLineLen,options.maxLineLen);
                let ldx = (lLen*dx/curDist)/2;
                let ldy = (lLen*dy/curDist)/2;
                drawLine(curx-ldx, cury-ldy,curx+ldx,cury+ldy)
            }
            if (options.shape == "circle") {
                let radius = options.minParticleSize;
                if (options.size_change)
                    radius = interpolateVal(distPerc,options.minParticleSize,options.maxParticleSize);

                if (options.color_change)
                    rctx.fillStyle = interpolateColor(distPerc,options.color_1,options.color_2);

                drawCirc(curx,cury,radius);
            }
            if (options.shape == "rectangle") {
                let curWidth = options.minParticleSize;
                if (options.size_change)
                    curWidth = interpolateVal(distPerc,options.minParticleSize,options.maxParticleSize);

                if (options.color_change)
                    rctx.fillStyle = interpolateColor(distPerc,options.color_1,options.color_2);

                drawRect(curx,cury,curWidth);
            }
            if (options.shape == "sprite") {
                let curWidth = options.minParticleSize;
                if (options.size_change)
                    curWidth = interpolateVal(distPerc,options.minParticleSize,options.maxParticleSize);

                drawSprite(curx,cury,curWidth);
            }
        }
    }

    if (options.show_mouse && options.auto_mouse) {
        rctx.fillStyle = "red";
        drawRect(msPos[0],msPos[1],10*UPSCALE);
    }

    ctx.clearRect(0,0,(window.innerWidth*UPSCALE),(window.innerHeight*UPSCALE));
    ctx.drawImage(rcanv,0,0);
}

function canvResizeHandler() {
    canv.width   = window.innerWidth  * UPSCALE;
    canv.height  = window.innerHeight * UPSCALE;
    rcanv.width  = canv.width;
    rcanv.height = canv.height;
}

function initCanv() {
    canv = document.getElementById("canvas");
    ctx  = canv.getContext("2d");

    rcanv = document.createElement("canvas");
    rctx  = rcanv.getContext("2d");

    canvResizeHandler();
    window.addEventListener("resize",canvResizeHandler);

    rctx.fillStyle = "white";
    rctx.strokeStyle = "black";
}

/******************************************************************************/
/*************************** Mouse ********************************************/
/******************************************************************************/

var msPos = [0,0];
var msTimeout = 0;

function simplexMouseMovement() {
    time += options.auto_mouse_speed;
    let padding = 50*UPSCALE;
    msPos = [
        padding + ((simplex.noise2D(time, -time + 10)+1)/2) * ((window.innerWidth*UPSCALE) - padding*2),
        padding + ((simplex.noise2D(time, -time + 1000)+1)/2) * ((window.innerHeight*UPSCALE) - padding*2)
    ];
    if (options.grav_on_move) {
        msTimeout = Math.min(1,Math.max(msTimeout+msTimeout,.1));
    }
}

function updateShowMouseHandler() {
    if (options.show_mouse && !options.auto_mouse) {
        canv.style.cursor = "crosshair";
    }
    else {
        canv.style.cursor = "none";
    }
}

function handleMouseMove(ev) {
    if (!options.auto_mouse) {
        msPos = [ev.pageX*UPSCALE,ev.pageY*UPSCALE];
    }
    if (options.grav_on_move) {
        msTimeout = Math.min(1,Math.max(msTimeout+msTimeout,.1));
    }
    else msTimeout = 1;
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
    inertia: 10,
    ms_gravity: -1,
    m_spread: 2,
    minDist: 50,
    minLineLen: 1,
    maxLineLen: 50,
    minParticleSize: 1,
    maxParticleSize: 10,
    auto_mouse: false,
    auto_mouse_speed: 0.005,
    show_mouse: true,
    numParticles: 10000,
    size_change: true,
    color_change: false,
    spring_back: 2,
    grav_on_move: true,
    color_1: "#ffffff",
    color_2: "#ffffff",
    bg_color: "#000000",
    shape: "rectangle",
    reset: resetParticles,
    textSeed: function () {updateParticlesSeed(getTextSeed(options.message));},
    textSeedSorted: function () {updateParticlesSeedSorted(getTextSeed(options.message));},
    update_sprite: updateSprite,
    message: "TEXT",
    font_size: 300,
    font_align: "left"
}

function updateGUI() {
    for (var i in gui.__controllers) {
        gui.__controllers[i].updateDisplay();
    }
}

function initGUI() {
    gui = new dat.GUI();
    gui.close();

    gui.addColor(options, 'bg_color');

    ////////////////////////////////////////////////////////////////////////////
    let particleOptions = gui.addFolder('Particles');
    particleOptions.add(options, 'inertia',0,500);

    var minLineLenUpdate = particleOptions.add(options, 'minLineLen',0,200);
    minLineLenUpdate.onFinishChange(function () {
        options.minLineLen = Math.min(options.minLineLen,options.maxLineLen-.1);
        updateGUI();
    });
    particleOptions.add(options, 'maxLineLen',.1,200);

    var minPartSizeUpdate = particleOptions.add(options, 'minParticleSize',0.1,200);
    minPartSizeUpdate.onFinishChange(function () {
        options.minParticleSize = Math.min(options.minParticleSize,options.maxParticleSize-.1);
        rctx.lineWidth = options.minParticleSize*UPSCALE;
        updateGUI();
    });
    particleOptions.add(options, 'maxParticleSize',2,1000);

    let lgrWhenSlowUpdate = particleOptions.add(options, 'size_change');
    lgrWhenSlowUpdate.onFinishChange(function (value) {if (!value) rctx.lineWidth = options.minParticleSize*UPSCALE;});
    particleOptions.add(options, 'color_change');

    particleOptions.add(options, 'spring_back',0,10);

    particleOptions.addColor(options, 'color_1');
    particleOptions.addColor(options, 'color_2');

    particleOptions.add(options, 'shape', [ 'line', 'rectangle', 'circle', 'sprite' ] );

    let numParticlesUpdate = particleOptions.add(options, 'numParticles',10,50000);
    numParticlesUpdate.onFinishChange(resetParticles);

    particleOptions.add(options, 'minDist',0.1,Math.max(window.innerWidth,window.innerHeight)*UPSCALE);
    particleOptions.add(options, 'update_sprite').name("Change sprite");
    particleOptions.add(options, 'reset').name("Randomize particles");

    ////////////////////////////////////////////////////////////////////////////
    let mouseOptions = gui.addFolder('Mouse');
    mouseOptions.add(options, 'ms_gravity',-20,20).name("gravity");
    mouseOptions.add(options, 'm_spread',.1,10).name("spread");

    let autoMouseUpdate = mouseOptions.add(options, 'auto_mouse');
    autoMouseUpdate.onFinishChange(updateShowMouseHandler);
    mouseOptions.add(options, 'auto_mouse_speed');

    let showMouseUpdate = mouseOptions.add(options, 'show_mouse');
    showMouseUpdate.onFinishChange(updateShowMouseHandler);

    ////////////////////////////////////////////////////////////////////////////
    let textOptions = gui.addFolder('Text Seeding');

    textOptions.add(options, 'textSeed').name("Update");
    textOptions.add(options, 'textSeedSorted').name("Sorted Update");
    textOptions.add(options, 'message');
    textOptions.add(options, 'font_size');
    textOptions.add(options, 'font_align', [ 'left', 'center', 'right'] );
}

/******************************************************************************/
/*************************** Init *********************************************/
/******************************************************************************/

// imports
var gpu;
var gui;
var stats;
var simplex;

function init() {
    simplex = new SimplexNoise();
    gpu = new GPU();

    stats = new Stats();
    stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
    // document.body.appendChild( stats.dom );


    initGUI();
    initSprite();
    initCanv();
    initParticles();

    window.addEventListener("mousemove",handleMouseMove);
    // cvg = false;
}

window.onload = init;
