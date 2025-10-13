import {
  HemisphereLight,
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Color,
  Group,
  Clock,
  BoxGeometry,
  MeshBasicMaterial,
  Mesh,
  AmbientLight,
  DirectionalLight,
  Raycaster,
  Vector2,
  SRGBColorSpace,
  ShaderMaterial,
  PlaneGeometry,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createBackgroundSphereFromAPI } from "@/composables/backgroundsphere.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { XRButton } from "three/examples/jsm/webxr/XRButton.js";
import { ARButton } from "three/examples/jsm/webxr/ARButton.js";
import { Observer } from "gsap/Observer";
import { createBackgroundPanoFromAPI } from "@/composables/loadpano.js";

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
  let controls, backgroundSphere, arToolkitSource, arToolkitContext, pano,fsCam,passAMat;
  const animateObjects = [];
  const container = document.getElementById("three-root");
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

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

  camera.position.set(0, 0, CAMERA_RADIUS);

  // Renderer
  const renderer = new WebGLRenderer({ antialias: true });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);
  renderer.domElement.setAttribute("tabindex", "0");
  renderer.domElement.addEventListener("click", () =>
    renderer.domElement.focus()
  );

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

  if (backgroundSphereNeeded) {
    pano = await createBackgroundPanoFromAPI(camera, controls, renderer);

    renderer.domElement.style.display = "block";
    fsCam = pano.fsCam;
    console.log(
      "Canvas size:",
      renderer.domElement.width,
      renderer.domElement.height
    );
    passAMat = pano.passAMat;
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
    },
  });
  renderer.setClearColor(0x000000, 0);

  const clock = new Clock();


  function animate() {

    if (animateObjects.length > 0) {
      animateObjects.forEach((cb) => cb());
    }
    controls?.update();

    if (arToolkitSource) {
      if (arToolkitSource.ready) {
        arToolkitContext.update(arToolkitSource.domElement);
      }
    }

    if (backgroundSphereNeeded) {
      pano.updateCamBasis();

      pano.passAMat.uniforms.uTime.value = clock.getElapsedTime(); 


      pano.passAMat.uniforms.uMix = { value: 0.0 }; // Effekt standardmäßig aus


      pano.passAMat.uniforms.uSplit.value   = 0.0;          // Pixelversatz
      pano.passAMat.uniforms.uAngle.value   = 0.0;          // 0° = horizontal, 90° = vertikal
      pano.passAMat.uniforms.uRadial.value  = 0.0;          // erst mal linear
      pano.passAMat.uniforms.uCenter.value  = new Vector2(0.5, 0.5);
      pano.passAMat.uniforms.uFalloff.value = 0.0;          // für radialen Modus interessant
      pano.passAMat.uniforms.uMix.value     = 0.0;          // voller Effekt




      // Resize buffers if needed
      const cur = new Vector2();
      renderer.getDrawingBufferSize(cur);
      if (cur.x !== pano.db.x || cur.y !== pano.db.y) {
        pano.db.copy(cur);
        pano.passAMat.uniforms.resolution.value.copy(pano.db);
        pano.passBMat.uniforms.resolution.value.copy(pano.db);
        pano.rtObjects.setSize(pano.db.x, pano.db.y);
        pano.rtCombined.setSize(pano.db.x, pano.db.y);
      }

      const prev = renderer.getRenderTarget();
      renderer.setRenderTarget(pano.rtObjects);
      renderer.clear(true, true, true);
      renderer.render(scene, camera);
      renderer.setRenderTarget(prev);

      renderer.setRenderTarget(pano.rtCombined);
      renderer.clear(true, true, true);
      renderer.render(pano.screenSceneA, pano.fsCam);
      renderer.setRenderTarget(null);

      pano.passBMat.uniforms.src.value = pano.rtCombined.texture;
      renderer.render(pano.screenSceneB, pano.fsCam);

    } else {
      renderer.render(scene, camera);
    }

    requestAnimationFrame(animate);
  }

  animate();

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
    fsCam,
  passAMat  };
}

export { init };
