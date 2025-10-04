import {
  HemisphereLight,
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Color,
  Group,
  BoxGeometry,
  MeshBasicMaterial,
  Mesh,
  AmbientLight,
  DirectionalLight,
  Raycaster,
  Vector2,
  SRGBColorSpace,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createBackgroundSphereFromAPI } from "@/composables/backgroundsphere.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { XRButton } from "three/examples/jsm/webxr/XRButton.js";
import { ARButton } from "three/examples/jsm/webxr/ARButton.js";
import { Observer } from "gsap/Observer";
import {
  ArToolkitContext,
  ArToolkitSource,
  ArMarkerControls,
} from "@ar-js-org/ar.js/three.js/build/ar-threex.js";
import { gsap } from "gsap";
gsap.registerPlugin(Observer);

async function init(
  backgroundSphereNeeded = true,
  orbiterControlsNeeded = true,
  trackerNeeded = false,
  arNeeded = false,
  xrNeeded = false,
  itemClick = (v) => console.log(v)
) {
  let controls, backgroundSphere, arToolkitSource, arToolkitContext;
  const animateObjects = [];
  const container = document.getElementById("three-root");
  const CAMERA_RADIUS = 1e-4;

  // Scene
  const scene = new Scene();

  const dl = new DirectionalLight(0xffffff, 0.7);
  dl.position.set(1, 1, 1);

  scene.add(new HemisphereLight(0xffffff, 0x222233, 1.0));
  scene.add(dl);

  // Camera
  const camera = new PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.001,
    1000
  );
  
  camera.position.set(0, 0, 4);

  // Renderer
  const renderer = new WebGLRenderer({ antialias:true });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById("three-root").appendChild(renderer.domElement);
  renderer.domElement.setAttribute('tabindex','0');
  renderer.domElement.addEventListener('click', ()=> renderer.domElement.focus());

  if (xrNeeded) {
    renderer.xr.enabled = true;
    container.appendChild(XRButton.createButton(renderer));
  }

  if (arNeeded) {
    renderer.xr.enabled = true;
    container.appendChild(ARButton.createButton(renderer));
  }

  container.appendChild(renderer.domElement);

  if (trackerNeeded) {
    renderer.setClearColor(new Color("lightgrey"), 0);
    renderer.alpha = true;
    renderer.domElement.style.display = "none";
    arToolkitSource = new ArToolkitSource({
      sourceType: "webcam",
      sourceWidth: window.innerWidth > window.innerHeight ? 640 : 480,
      sourceHeight: window.innerWidth > window.innerHeight ? 480 : 640,
    });

    arToolkitSource.init(() => {
      setTimeout(() => {
        arToolkitSource.onResize();
        arToolkitSource.copySizeTo(renderer.domElement);
        renderer.domElement.style.display = "block";
      }, 2000);
    });

    arToolkitContext = new ArToolkitContext({
      cameraParametersUrl: "/asseets/tracker/camera_para.dat",
      detectionMode: "mono",
    });

    arToolkitContext.init(() => {
      camera.projectionMatrix.copy(arToolkitContext.getProjectionMatrix());
    });

    const marker = new Group();
    scene.add(marker);

    new ArMarkerControls(arToolkitContext, marker, {
      type: "pattern",
      patternUrl: "/asseets/tracker/patt.hiro",
      changeMatrixMode: "modelViewMatrix",
    });

    const geometry = new BoxGeometry();
    const material = new MeshBasicMaterial({ color: 0xff00ff });

    marker.add(new Mesh(geometry, material));
  }

  if (backgroundSphereNeeded) {
    backgroundSphere = await createBackgroundSphereFromAPI();
    scene.add(backgroundSphere);
  }

  if (orbiterControlsNeeded) {
    controls = new OrbitControls(camera, renderer.domElement);

    controls.enablePan = false;
    controls.enableZoom = false; // FOV via Wheel
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.rotateSpeed = 0.9;
    controls.target.set(0, 0, 0);
    controls.saveState();
  }
  
  const raycaster = new Raycaster();
  const mouse = new Vector2();

  Observer.create({
    target: renderer.domElement,
    type: "pointer",
    onClick(ev) {
      const e = ev.event || ev;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      console.log("click");
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects([scene], true);
      if (!hits.length) return;
     
      itemClick(hits[0].object);
      
    }})


  function animate() {
    if (animateObjects.length > 0) {
      animateObjects.forEach((cb) => {
        cb;
      });
    }
    controls?.update();

    if (arToolkitSource) {
      if (arToolkitSource.ready) {
        arToolkitContext.update(arToolkitSource.domElement);
      }
    }

    renderer.render(scene, camera);
  }

  renderer.setAnimationLoop(animate);

  window.addEventListener(
    "resize",
    () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    },
    { passive: true }
  );

  return {
    scene,
    camera,
    renderer,
    controls,
    backgroundSphere,
    animateObjects,
  };
}

export { init };
