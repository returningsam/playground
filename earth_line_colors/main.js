const RES_RATIO = 1;
var elevator, geocoder;

function uniq(a) {
   return Array.from(new Set(a));
}

function getPath() {
    return [
        {lat: 5.047664,  lng: -9.123128},
        {lat: 28.285467, lng: 121.638142},
    ];
}

function expandPath(path,count) {
    for (var i = 0; i < count; i++) {
        let newPath = [];
        for (var j = 0; j < path.length-1; j++) {
            let dlat = (path[j+1].lat - path[j].lat)/2;
            let dlng = (path[j+1].lng - path[j].lng)/2;
            let midPoint = {
                lat: path[j].lat + dlat,
                lng: path[j].lng + dlng
            };
            newPath.push(path[j]);
            newPath.push(midPoint)
        }
        newPath.push(path[path.length-1]);
        path = newPath;
    }
    return path;
}

var compPath;
var compEls;

function getElevations(pathResult,status) {
    console.log(status);
    if (!compEls) compEls = [];
    if (pathResult && pathResult.length && status == "OK") compEls = compEls.concat(pathResult);

    if (compPath.length > 1) {
        let curSeg = [
            compPath.splice(0,1)[0],
            compPath[0]
        ];

        elevator.getElevationAlongPath({
            'path': curSeg,
            'samples': 256
        }, getElevations);
    }
    else finishRecieveElevations();
}

var elevationsToGC;
var curElInd = 0;

function geocode(results,status) {
    if (status == "OK") {

        elevationsToGC.types = [];
        for (var i = 0; i < results.length; i++)
            elevationsToGC.types = elevationsToGC.types.concat(results[i].types);
        elevationsToGC.types = uniq(elevationsToGC.types);

        curElInd++;
        if (curElInd < elevationsToGC.length) {
            setTimeout(function () {
                geocoder.geocode({'location': elevationsToGC[curElInd].location}, geocode);
            }, 2000);
        }
    }
    else {
        console.log("Query limit reached: adding timeout...");
        if (curElInd < elevationsToGC.length) {
            setTimeout(function () {
                geocoder.geocode({'location': elevationsToGC[curElInd].location}, geocode);
            }, 20000);
        }
    }
    console.log("ind: " + (curElInd),"remaining: " + (elevationsToGC.length - curElInd));
}

function finishRecieveElevations() {
    elevationsToGC = compEls;
    geocoder.geocode({'location': elevationsToGC[curElInd].location}, geocode);
}

var canv, ctx;

function initCanvas() {
    canv = document.getElementById("canvas");
    ctx  = canv.getContext("2d");
    canv.width  = window.innerWidth  * RES_RATIO;
    canv.height = window.innerHeight * RES_RATIO;
}

function init() {
    elevator = new google.maps.ElevationService;
    geocoder = new google.maps.Geocoder;
    let path = getPath();
    // path = expandPath(path,0);
    compPath = path;
    getElevations();
}

window.onload = init;
