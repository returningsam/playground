
const MIN_NUM_MESHES = 7;
const MAX_NUM_MESHES = 20;
const NUM_LANTERNS = 1;
const MIN_RADIUS = .15;
const MAX_RADIUS = 12;
const SHADE_HEIGHT = 20;
const TIME_STEP  = 0.001;

const LIGHT_COLOR = "#e8b757";

// three.js variables
var container, camera, scene, renderer;

var controls;

var simplex;

var lanterns;

var curTime = Date.now();

class Lantern {
    constructor(scene) {
        this.scene = scene;
        this.lights = [];
        this.numMeshes = chance.integer({min:MIN_NUM_MESHES,max:MAX_NUM_MESHES});
        this.meshes = [];

        this.timeOffset = chance.floating({min:10, max:1000});
        this.time = curTime + this.timeOffset;

        this.zPos = 0;//chance.floating({min:10,max:100});
        this.xPos = chance.floating({min:-(this.zPos/2),max:(this.zPos/2)});
        this.zPos *= -1;

        this.defYPos = 0;
        this.yPos = Math.sin(curTime*10)+this.defYPos;

        var ptLight = new THREE.PointLight( LIGHT_COLOR, 1, 0, 3 );
        ptLight.position.set( this.xPos, -SHADE_HEIGHT/2, this.zPos );
        ptLight.castShadow = true;
        this.lights.push(ptLight);
        this.scene.add( ptLight );

        ptLight = new THREE.PointLight( LIGHT_COLOR, 1, 0, 3 );
        ptLight.position.set( this.xPos, SHADE_HEIGHT/2, this.zPos );
        ptLight.castShadow = true;
        this.lights.push(ptLight);
        this.scene.add( ptLight );

        this.defVerts = [];

        for (var i = 0; i < this.numMeshes; i++) {

            let curVal = this.curRadius(i);

            let curRad = Math.round((MIN_RADIUS*4) + MAX_RADIUS*curVal);
            let geometry = new THREE.RingGeometry(MIN_RADIUS,curRad,Math.round(Math.sqrt(curRad)*20),curRad*5);

            let material = new THREE.MeshLambertMaterial({
                wireframe: false,//chance.bool(),
                side: THREE.DoubleSide,
                color: this.curColor(i),
                reflectivity: 1,
                refractionRatio: 0,
                aoMapIntensity: 2,
                emissiveIntensity: 2,
                // polygonOffset: true,
                // polygonOffsetFactor: 0
            });

            let curMesh = new THREE.Mesh(geometry,material);
            curMesh.castShadow    = true;
            curMesh.reveiveShadow = true;

            curMesh.position.x = this.xPos;
            curMesh.position.y = (i - (this.numMeshes/2))*(SHADE_HEIGHT/this.numMeshes);
            curMesh.position.z = this.zPos;
            curMesh.rotateX(Math.PI/2);

            let curVertCopies = [];
            for (var j = 0; j < curMesh.geometry.vertices.length; j++) {
                curVertCopies.push(new THREE.Vector3(
                    curMesh.geometry.vertices[j].x,
                    curMesh.geometry.vertices[j].y,
                    curMesh.geometry.vertices[j].z
                ));
            }
            this.defVerts.push(curVertCopies);

            this.meshes.push(curMesh);
            this.scene.add(curMesh);
        }
    }

    curRadius(i) {
        let n = (simplex.noise2D(i/10,this.time)+1.5)/2.5;
        let relRad = n*(Math.sin(Math.PI*.5*(1-(i - (this.numMeshes/2))/(this.numMeshes/2)))+0.2);
        return relRad;
    }

    curColor(i) {
        let r = .35*(1+simplex.noise3D(this.time/10,i/10,0)) + 0.1;
        let g = .35*(1+simplex.noise3D(this.time/10,i/10,.15)) + 0.1;
        let b = .35*(1+simplex.noise3D(this.time/10,i/10,.3)) + 0.1;
        return new THREE.Color(r,g,b);
    }

    update() {
        this.time += TIME_STEP * (Math.pow(Math.sin(Math.PI*(this.yPos+2)/8)+.7,1.5) + (simplex.noise2D(curTime,curTime)+1)/2);
        // this.zPos -= 0.1;
        this.yPos = (Math.sin(this.time*10)*2)+this.defYPos;

        for (var i = 0; i < this.lights.length; i++) {
            this.lights[i].position.x = this.xPos;
            this.lights[i].position.z = this.zPos;
        }

        for (var i = 0; i < this.meshes.length; i++) {
            for (var j = 0; j < this.meshes[i].geometry.vertices.length; j++) {
                let defPos = this.defVerts[i][j];
                let dist = defPos.distanceTo(new THREE.Vector3(0,0,defPos.z));
                let curNoise = simplex.noise2D(dist/10 + this.time,defPos.y*1.5)*Math.sqrt(dist+1)*.15;
                this.meshes[i].geometry.vertices[j].z = this.yPos + defPos.z + simplex.noise2D(defPos.z,this.time) + Math.sin(dist - (this.time*10))*.5;
            }
            this.meshes[i].geometry.verticesNeedUpdate = true;
            this.meshes[i].geometry.computeVertexNormals();
            this.meshes[i].position.z = this.zPos;
        }
    }
}

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

const SECOND = 60;
var fc = 0;
var cvg;
var record = false;

function animate() {
    curTime += TIME_STEP;
    updateLanterns();

    render();

    if (record) {
        fc++;
        if (cvg) {
            cvg.addFrame(renderer.domElement);
            if (fc < SECOND*60) requestAnimationFrame(animate);
            else cvg.render('render');
        }
        else requestAnimationFrame( animate );
    }
    else requestAnimationFrame( animate );
}

function render() {
    controls.update();
    renderer.render(scene, camera);
}

function handleMouseMove(ev) {}
function handleMouseDown(ev) {}
function handleMouseUp(ev)   {}

function handleWindowResize( event ) {
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
}

function randAngle() {
    return chance.floating({min:0,max:2*Math.PI});
}

var defVerts = [];

function updateLanterns() {
    for (var i = 0; i < lanterns.length; i++) {
        lanterns[i].update();
    }
}

function initScene() {
    container = document.getElementById( "graphics_cont" );
    const near = 1;
    const far = 1000;
    const fieldOfView = 55;
    camera = new THREE.PerspectiveCamera(fieldOfView, window.innerWidth/window.innerHeight, near, far);
    camera.position.z = MAX_RADIUS*2.4;
    camera.position.y = MAX_RADIUS*.5;
    camera.lookAt(0,0,0);

    controls = new THREE.TrackballControls( camera );
    controls.update();

    scene = new THREE.Scene();

    var amLight = new THREE.AmbientLight( "#666666" ); // soft white light
    scene.add( amLight );

    lanterns = [];
    for (var i = 0; i < NUM_LANTERNS; i++) lanterns.push(new Lantern(scene));

    renderer = new THREE.WebGLRenderer();
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap ;

    renderer.shadowCameraNear = camera.near;
    renderer.shadowCameraFar = camera.far;
    renderer.shadowCameraFov = camera.fov;

    renderer.shadowMapBias = 0.0001;
    renderer.shadowMapDarkness = .2;
    renderer.shadowMapWidth = 1024*2;
    renderer.shadowMapHeight = 1024*2;
    // renderer.physicallyBasedShading = true;

    container.appendChild( renderer.domElement );

    handleWindowResize();
    window.addEventListener("resize",    handleWindowResize, false );
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup",   handleMouseUp);

    animate();
}

function initGraphics() {
    simplex = new SimplexNoise();
    initScene();
}

function init() {
    initGraphics();
}

window.onload = init;
