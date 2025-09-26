import { Scene, PerspectiveCamera, WebGLRenderer, Color, Group, BoxGeometry, MeshBasicMaterial, Mesh,AmbientLight,DirectionalLight } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createBackgroundSphereFromAPI } from "@/composables/backgroundsphere.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { XRButton } from 'three/examples/jsm/webxr/XRButton.js';
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';

import {
  ArToolkitContext,
  ArToolkitSource,
  ArMarkerControls,
} from "@ar-js-org/ar.js/three.js/build/ar-threex.js";

async function init(
  backgroundSphereNeeded = true,
  orbiterControlsNeeded = true,
  trackerNeeded = false,
  arNeeded = false,
  xrNeeded = false, 
) {
  let controls, backgroundSphere, arToolkitSource, arToolkitContext;
  const animateObjects = [];
  const container = document.getElementById("three-root");

  // Scene
  const scene = new Scene();
 
  scene.add(new AmbientLight(0xffffff, 0.5));
  const dirLight = new DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(1, 1, 1);
  scene.add(dirLight);

  // Camera
  const camera = new PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 0, 5);

  // Renderer
  const renderer = new WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio || 1);

  if(xrNeeded){
    renderer.xr.enabled = true;
    container.appendChild(XRButton.createButton(renderer));
  }

  if(arNeeded) {
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
    const material = new MeshBasicMaterial({color: 0xff00ff})

    marker.add(new Mesh(geometry,material))
  }


  if (backgroundSphereNeeded) {
    backgroundSphere = await createBackgroundSphereFromAPI();
    scene.add(backgroundSphere);
  }

  if (orbiterControlsNeeded) {
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.target.set(0, 0, 0);
    controls.update();
  }

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
