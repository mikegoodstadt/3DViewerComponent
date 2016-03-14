var loadedModel;
var grid;
var showcaseModel = true;


var Viewer = function () {
    var $this = this;

    this.init = function () {
        $this.autorotate = true;
        var self = $this;

        var body = document.body;
        var html = document.documentElement;

        var bodyHeight = Math.max( body.scrollHeight, body.offsetHeight,
            html.clientHeight, html.scrollHeight, html.offsetHeight );

        $this.fov = Math.asin(bodyHeight / 40);

        $this.renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
        $this.renderer.setClearColor(0x000000, 0);

        $this.scene = new THREE.Scene();

        var VIEW_ANGLE = 80;
        var ASPECT = 1.0;
        var NEAR = 0.01;
        var FAR = 1000;

        $this.camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
        $this.camera.position.set(-9.5, 14, 11);

        $this.controls = new THREE.OrbitControls(self.camera, self.renderer.domElement);
        $this.controls.maxDistance = 1000;
        $this.controls.autoRotate = true;

        // create lights
        light = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.4);

        shadowLight = new THREE.DirectionalLight(0xffffff, 0.4);
        shadowLight.position.set(100, 50, 100);

        backLight = new THREE.DirectionalLight(0xffffff, .6);
        backLight.position.set(-100, 200, 50);

        $this.scene.add(backLight);
        $this.scene.add(light);
        $this.scene.add(shadowLight);

        // GRID HELPER
        var size = 500;
        var step = 20;

        var gridHelper = new THREE.GridHelper(size, step);
        gridHelper.setColors(0xaaaaaa, 0xe0e0e0);
        gridHelper.position.y = 0.2;
        $this.scene.add(gridHelper);

        // GROUND
        var geometry = new THREE.PlaneBufferGeometry(10, 10);
        var planeMaterial = new THREE.MeshPhongMaterial({color: 0xe9e9e9});
        var ground = new THREE.Mesh(geometry, planeMaterial);

        ground.position.set(0, 0, 0);
        ground.rotation.x = -Math.PI / 2;
        ground.scale.set(100, 100, 100);
        ground.castShadow = false;
        ground.receiveShadow = true;

        $this.scene.add(ground);

        document.querySelector('body').addEventListener('click', function(event) {
            if (event.target.parentNode && event.target.parentNode.nodeName.toLowerCase() === 'div' && event.target.parentNode.classList.contains('viewer') > -1) {
                $this.stopRotating();
            }
        });

        function animate() {
            requestAnimationFrame(animate);

            self.controls.update();
            self.renderer.render(self.scene, self.camera);
        }

        animate();
    };

    this.stopRotating = function() {
        $this.controls.autoRotate = false;
    };

    this.startRotating = function() {
        $this.controls.autoRotate = true;
    };

    this.unloadObj = function () {
        var obj = $this.scene.getObjectByName('objGroup');
        $this.scene.remove(obj);
    };


    this.loadObj = function (obj, onViewerReady, onError) {
        var self = $this;


        showcaseModel = true;
        var loader = new THREE.OBJLoader();

        loader.load(obj, function (ob) {
            var obGroup = new THREE.Group();

            ob.traverse(function (child) {
                if (child instanceof THREE.Mesh) {
                    var newColor = '#F18D05';
                    var color = new THREE.Color(newColor);
                    var material = new THREE.MeshPhongMaterial({color: color});

                    var geometry = new THREE.Geometry();
                    geometry.fromBufferGeometry(child.geometry);
                    var mesh = new THREE.Mesh(geometry, material);

                    if ($this.autorotate) {
                        mesh.rotation.x = -Math.PI / 2;
                    }

                    obGroup.add(mesh);
                }
            }.bind($this));

            obGroup.name = 'objGroup';
            loadedModel = obGroup;
            self.unloadObj();
            $this.scene.add(obGroup);

            $this.fitMeshToCamera(obGroup);

            onViewerReady && onViewerReady()
        }.bind($this), undefined, onError);
    };


    this.loadStl = function (obj, onViewerReady, onError) {
        showcaseModel = true;
        var loader = new THREE.STLLoader();

        loader.load(obj, function (geom) {
            var newColor = '#F18D05';
            var color = new THREE.Color(newColor);
            var material = new THREE.MeshPhongMaterial({color: color});

            geom = $this.centerGeometry(geom);
            var mesh = new THREE.Mesh(geom, material);

            if ($this.autorotate) {
                mesh.rotation.x = -Math.PI / 2;
            }

            mesh.name = 'objGroup';
            loadedModel = mesh;
            $this.scene.add(mesh);
            $this.fitMeshToCamera(mesh);

            onViewerReady && onViewerReady()
        }.bind($this), undefined, onError);
    };


    this.centerGeometry = function (geom) {
        var geometry = new THREE.Geometry();
        geometry.fromBufferGeometry(geom);
        geometry.computeBoundingBox();
        geometry.center();
        return geometry;
    };


    this.changeColor = function (e) {
        $this.color = e;
        var group = $this.scene.getObjectByName('objGroup');

        if (group) {
            group.traverse(function (child) {
                if (child instanceof THREE.Mesh) {
                    var code = '#' + e;
                    var color = new THREE.Color(code);

                    var material = new THREE.MeshPhongMaterial({color: color});

                    child.material = material;
                }
            }.bind($this));
        }
    };


    this.fitMeshToCamera = function (group) {
        var max = {x: 0, y: 0, z: 0};
        min = {x: 0, y: 0, z: 0};

        group.traverse(function (child) {
            if (child instanceof THREE.Mesh) {
                var bbox = new THREE.BoundingBoxHelper(child, 0xffffff);
                bbox.update();

                max.x = (bbox.box.max.x > max.x) ? bbox.box.max.x : max.x;
                max.y = (bbox.box.max.y > max.y) ? bbox.box.max.y : max.y;
                max.z = (bbox.box.max.z > max.z) ? bbox.box.max.z : max.z;

                min.x = (bbox.box.min.x < min.x) ? bbox.box.min.x : min.x;
                min.y = (bbox.box.min.y < min.y) ? bbox.box.min.y : min.y;
                min.z = (bbox.box.min.z < min.z) ? bbox.box.min.z : min.z;
            }
        }.bind($this));

        var meshY = Math.abs(max.y - min.y);
        meshX = Math.abs(max.x - min.x);
        meshZ = Math.abs(max.z - min.z);
        scaleFactor = 10 / Math.max(meshX, meshY);

        group.scale.set(scaleFactor, scaleFactor, scaleFactor);

        group.position.y = meshY / 2 * scaleFactor;

        var box = new THREE.Box3().setFromObject(group);
        box.center(group.position); // $this re-sets the mesh position
        group.position.multiplyScalar(-1);

        group.position.y += meshY * scaleFactor + 0.2;
    };


    this.loadObject = function (obj, type, onViewerReady, onLoadError) {
        switch (type) {
            case 'obj':
                $this.loadObj(obj, onViewerReady, onLoadError);
                break;
            case 'stl':
                $this.loadStl(obj, onViewerReady, onLoadError);
                break;
            default:
        }
    };


    this.resize = function () {
        window.onresize = function () {
            $this.resizeAccordingToViewerElem();
        };
    };


    this.initialize = function () {
        $this.init();
        $this.render();
    };


    this.render = function (el) {
        $this.viewerEl = document.querySelector(el);
        $this.resizeAccordingToViewerElem();
        $this.viewerEl.appendChild($this.renderer.domElement);
    };


    this.resizeAccordingToViewerElem = function () {
        $this.renderer.setSize($this.viewerEl.offsetWidth, $this.viewerEl.offsetHeight);
        $this.camera.aspect = $this.viewerEl.offsetWidth / $this.viewerEl.offsetHeight;
        $this.camera.updateProjectionMatrix();
    };


    this.stopShowcasingModel = function () {
        showcaseModel = false;
    };

};