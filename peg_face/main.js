const RES_SCALE = 2;
const NUM_MESHES = 71;
const MAX_POS = 12;
const BOX_DIM = 2;
const TIME_STEP = 0.001;

const PRIMARY_COLOR   = "#b60000";
const SECONDARY_COLOR = "#5976b6";

var angDiff = .03;
var sclDiff = .1;
var posDiff = .005;

// three.js variables
var container, camera, scene, renderer;

var controls;

var graphicsPaused;

var buttonPos;

var meshes = [];

var curTime = 0;

var ctracker;
var webcamVideo;

function getDistance( v1, v2 ) {
    var dx = v1.x - v2.x;
    var dy = v1.y - v2.y;
    var dz = v1.z - v2.z;

    return Math.sqrt( dx * dx + dy * dy + dz * dz );
}

function hexToRgb(hex) {
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function(m, r, g, b) {
        return r+r+g+g+b+b;
    });

    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function nameToCoord(name) {
    let toks = name.split("_");
    return [parseInt(toks[0]),parseInt(toks[1])];
}

function animate() {
    curTime += TIME_STEP;
    if (!graphicsPaused) requestAnimationFrame( animate );
    render();
}

function render() {
    controls.update();

    var positions = ctracker.getCurrentPosition();
    if (positions) updatePlanePositions(positions);
    renderer.render(scene, camera);
}

function pauseGraphics() {
    graphicsPaused = true;
}

function startGraphics() {
    if (scene) {
        graphicsPaused = false;
        requestAnimationFrame( animate );
    }
    else setTimeout(startGraphics, 10);
}

function handleMouseMove(ev) {}
function handleMouseDown(ev) {}
function handleMouseUp(ev)   {}

function handleWindowResize( event ) {
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
}


function updatePlanePositions(points) {
    for (var i = 0; i < meshes.length; i++) {
        let mesh = meshes[i];
        let meshID = mesh.id;
        mesh.position.set(
            (parseFloat(((webcamVideo.width-points[i][0])/webcamVideo.width).toFixed(5))-.5) * MAX_POS*4,
            mesh.geometry.parameters.height/2.,
            (parseFloat((points[i][1]/webcamVideo.height).toFixed(5))-.5) * MAX_POS*4
        )
    }
}

function initScene() {
    container = document.getElementById( "graphics_cont" );
    const near = 0.001;
    const far = 2000;
    const fieldOfView = 55;
    camera = new THREE.PerspectiveCamera(fieldOfView, window.innerWidth/window.innerHeight, near, far);
    camera.position.y = 30;
    camera.position.z = 5;
    camera.lookAt(0,0,0);

    controls = new THREE.OrbitControls( camera );
    controls.update();

    scene = new THREE.Scene();

    var amLight = new THREE.AmbientLight( "#4f4f4f" ); // soft white light
    scene.add( amLight );

    var ptLight = new THREE.PointLight( PRIMARY_COLOR, 1, 0 );
    ptLight.position.set( 0, MAX_POS , MAX_POS * 2 );
    ptLight.castShadow = true;
    scene.add( ptLight );

    var sphereSize = 1;
    var pointLightHelper = new THREE.PointLightHelper( ptLight, sphereSize );
    scene.add( pointLightHelper );

    // drLight = new THREE.PointLight( SECONDARY_COLOR, 1, 0 );
    // drLight.position.set( 10, MAX_POS * 2,-10 );
    // drLight.castShadow = true;
    // scene.add( drLight );
    //
    // drLight = new THREE.PointLight( SECONDARY_COLOR, 1, 0 );
    // drLight.position.set( MAX_POS * 2, 10, -10 );
    // drLight.castShadow = true;
    // scene.add( drLight );

    let plane = new THREE.PlaneBufferGeometry( MAX_POS*2, MAX_POS*2, 1000, 1000);
    let planeMat = new THREE.MeshPhongMaterial({
        wireframe: false,
        side: THREE.DoubleSide,
        color: "#c7c7c7"
    });
    let planeMesh = new THREE.Mesh( plane, planeMat );
    planeMesh.id = 666;
    planeMesh.name = "shadowplane";
    planeMesh.receiveShadow = true;
    planeMesh.position.set(
        0,
        0,
        0
    );
    planeMesh.rotateX(Math.PI/2);
    scene.add(planeMesh);

    for (var i = 0; i < NUM_MESHES; i++) {
        let height = chance.floating({min:1,max:3});
        let geometry = new THREE.CylinderBufferGeometry( BOX_DIM/7,BOX_DIM/7,height, 10,5*height);

        let material = new THREE.MeshStandardMaterial({
            wireframe: false,
            // side: THREE.DoubleSide,
            color: "#ffffff"
        });
        let mesh = new THREE.Mesh( geometry, material );
        mesh.id = i;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        let xPos = chance.floating({min:-MAX_POS,max:MAX_POS});
        // let yPos = chance.floating({min:-MAX_POS,max:MAX_POS});
        let zPos = chance.floating({min:-MAX_POS,max:MAX_POS});
        let yPos = 0;

        mesh.position.set(
            xPos,
            yPos+height/2,
            zPos
        );

        meshes.push(mesh);
        scene.add(mesh);
    }

    renderer = new THREE.WebGLRenderer();
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap ;

    renderer.shadowCameraNear = camera.near;
    renderer.shadowCameraFar = camera.far;
    renderer.shadowCameraFov = camera.fov;

    renderer.shadowMapBias = 0.0001;
    renderer.shadowMapDarkness = 0.5;
    renderer.shadowMapWidth = 1024;
    renderer.shadowMapHeight = 1024;
    renderer.physicallyBasedShading = true;

    container.appendChild( renderer.domElement );

    handleWindowResize();
    window.addEventListener("resize",    handleWindowResize, false );
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup",   handleMouseUp);

    animate();
}

function initWebcam() {
    webcamVideo = document.getElementById("videoElement");
    webcamVideo.width  = 400;
    webcamVideo.height = 300;

    if (navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({video: true})
        .then(function(stream) {
            webcamVideo.srcObject = stream;

            webcamVideo.oncanplay = function () {
                webcamVideo.play();
                ctracker = new clm.tracker();
                ctracker.init();
                ctracker.stop();
                ctracker.reset();
                ctracker.start(webcamVideo);
                setTimeout(function () {
                    initGraphics();
                }, 10);
            }

        })
        .catch(function(err) {
            console.log("Something went wrong!");
        });
    }
}

function initGraphics() {
    graphicsPaused = false;
    initScene();
}

function init() {
    initWebcam();
}

window.onload = init;
