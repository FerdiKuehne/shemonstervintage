// ------------------------------------------------------------
// Imports
// ------------------------------------------------------------
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
  MeshStandardMaterial,
  Mesh,
  DirectionalLight,
  Raycaster,
  Vector2,
  SRGBColorSpace,
  Vector3,
  Quaternion,
  Euler,
  MathUtils,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createBackgroundPanoFromAPI } from "@/composables/loadpano.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { XRButton } from "three/examples/jsm/webxr/XRButton.js";
import { ARButton } from "three/examples/jsm/webxr/ARButton.js";
import {
  ArToolkitContext,
  ArToolkitSource,
  ArMarkerControls,
} from "@ar-js-org/ar.js/three.js/build/ar-threex.js";
import { gsap } from "gsap";
import { Observer } from "gsap/Observer";
gsap.registerPlugin(Observer);

const mat = new MeshStandardMaterial({
  color: 0x5a7dff,
  roughness: 0.4,
  metalness: 0.08,
  emissive: 0x6690ff,
  emissiveIntensity: 0.18,
  transparent: false,
  opacity: 1.0,
  depthWrite: true,
  polygonOffset: true,
  polygonOffsetFactor: 2,
  polygonOffsetUnits: 2,
});


function createAboutObjekt() {
  const box = new BoxGeometry( 0.2, 0.2, 0.2 );
  const material = new MeshBasicMaterial({ color: 0xff00ff });
  return new Mesh(box,material)
}

function createGalleryObjekt() {
  const box = new BoxGeometry( 0.2, 0.2, 0.2  );
  const material = new MeshBasicMaterial({ color: 0x0000ff });
  return new Mesh(box,material)

}

function createLocationObjekt() {
  const box = new BoxGeometry( 0.2, 0.2, 0.2  );
  const material = new MeshBasicMaterial({ color: 0x00ff00 });
  return new Mesh(box,material)
}

function createContactObjekt(){
  const box = new BoxGeometry(0.2, 0.2, 0.2 );
  const material = new MeshBasicMaterial({ color: 0xff0000 });
  return new Mesh(box,material)
}



// ------------------------------------------------------------
// Init
// ------------------------------------------------------------
async function init(
  backgroundSphereNeeded = true,
  orbiterControlsNeeded = true,
  trackerNeeded = false,
  arNeeded = false,
  xrNeeded = false,
  itemClick = (v) => console.log(v)
) {
  let controls, arToolkitSource, arToolkitContext, pano, fsCam, passAMat;
  const animateObjects = [];

  // Canvas/Container säubern
  const container = document.getElementById("three-root");
  while (container.firstChild) container.removeChild(container.firstChild);

  const CAMERA_RADIUS = 1e-4;

  // Szene
  const scene = new Scene();
  const dl = new DirectionalLight(0xffffff, 1.0);
  dl.position.set(1, 1, 1);
  scene.add(new HemisphereLight(0xffffff, 0x222233, 1.0));
  scene.add(dl);

  const aboutObject = createAboutObjekt(); 
  const galleryObject = createGalleryObjekt();
  const contactOnject = createContactObjekt();
  const locationObjekt = createLocationObjekt();


  aboutObject.position.set(-1.65, -0.57, -1.92); 
  galleryObject.position.set(-1.65, -0.57, -1.92); 
  contactOnject.position.set(0, -.4 , -1.73); 
  locationObjekt.position.set(-0.3, 0.48, -1.06); 

  scene.add(aboutObject,galleryObject,contactOnject,locationObjekt);

  // Kamera
  const camera = new PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.001,
    1000
  );
  camera.position.set(0, 0, CAMERA_RADIUS);

  // Renderer
  const renderer = new WebGLRenderer({ antialias: true, alpha: true });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);
  renderer.domElement.setAttribute("tabindex", "0");
  renderer.domElement.addEventListener("click", () =>
    renderer.domElement.focus()
  );
  renderer.setClearColor(0x000000, 0);

  // XR/AR Buttons optional
  if (xrNeeded) {
    renderer.xr.enabled = true;
    container.appendChild(XRButton.createButton(renderer));
  }
  if (arNeeded) {
    renderer.xr.enabled = true;
    container.appendChild(ARButton.createButton(renderer));
  }

  // AR-Marker-Tracking (optional)
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
      cameraParametersUrl: "/assets/tracker/camera_para.dat", // <- Pfad checken
      detectionMode: "mono",
    });

    arToolkitContext.init(() => {
      camera.projectionMatrix.copy(arToolkitContext.getProjectionMatrix());
    });

    const marker = new Group();
    scene.add(marker);

    new ArMarkerControls(arToolkitContext, marker, {
      type: "pattern",
      patternUrl: "/assets/tracker/patt.hiro", // <- Pfad checken
      changeMatrixMode: "modelViewMatrix",
    });

    const geometry = new BoxGeometry();
    const material = new MeshBasicMaterial({ color: 0xff00ff });
    marker.add(new Mesh(geometry, material));
  }

  // Orbit Controls (optional)
  if (orbiterControlsNeeded) {
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableZoom = false; // Zoomen via FOV/Animation
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.rotateSpeed = 0.9;
    controls.target.set(0, 0, 0);
    controls.saveState();
  }

  // Hintergrund-Pano + Post-Pass (optional)
  if (backgroundSphereNeeded) {
    pano = await createBackgroundPanoFromAPI(camera, controls, renderer);
    renderer.domElement.style.display = "block";

    fsCam = pano.fsCam;
    passAMat = pano.passAMat;

    // --- Einmalige Uniform-Initialisierung (nicht pro Frame!) ---
    passAMat.uniforms.uAngle.value = 0.0; // 0° = horizontal
    passAMat.uniforms.uRadial.value = 0.0; // linear
    passAMat.uniforms.uCenter.value = new Vector2(0.5, 0.5);
    passAMat.uniforms.uFalloff.value = 0.0;
    passAMat.uniforms.uMix.value = 1.0; // Effekt aktiv
    passAMat.uniforms.fovY.value = MathUtils.degToRad(camera.fov);

    scene.add(aboutObject,galleryObject,contactOnject,locationObjekt);


    console.log(pano.screenSceneB.children);

    // --- Zustand für Bewegungs-Erkennung ---
    pano._motionState = {
      prevQuat: camera.quaternion.clone(),
      prevPos: camera.position.clone(),
      split: 0, // geglätteter uSplit-Wert
    };
  }

  // Raycaster (Klicks)
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

      raycaster.setFromCamera(mouse, camera);
      // Besser: alle Kind-Objekte testen (rekursiv)
      const hits = raycaster.intersectObjects(scene.children, true);
      if (!hits.length) return;
      itemClick(hits[0].object);
    },
  });

  // Clock
  const clock = new Clock();

  // ------------------------------------------------------------
  // Render-Loop
  // ------------------------------------------------------------
  function animate() {
    // Delta-Zeit (stabil für Geschwindigkeiten)
    const dt = Math.max(1e-4, clock.getDelta());
    

    controls.update();
    
    if (animateObjects.length > 0) {
      animateObjects.forEach((cb) => cb(dt));
    }
    

    if (arToolkitSource && arToolkitSource.ready) {
      arToolkitContext.update(arToolkitSource.domElement);
    }

    if (backgroundSphereNeeded) {
      pano.updateCamBasis();

  
    

      // uTime weiterreichen (hier: absolute Zeit OK)
      passAMat.uniforms.uTime.value = clock.elapsedTime;

      // ---------- Bewegungs-abhängiges uSplit ----------
      const s = pano._motionState;

      // Winkelgeschwindigkeit (rad/s)
      const dot = Math.min(1, Math.max(-1, s.prevQuat.dot(camera.quaternion)));
      const ang = 2 * Math.acos(Math.abs(dot)); // [0..π]
      const angSpeed = ang / dt;

      // Positionsgeschwindigkeit (units/s) – gering gewichten
      const posSpeed =
        camera.position.distanceTo(s.prevPos) / dt;

      // Kombiniertes Bewegungsmaß
      const motion = angSpeed + 0.15 * posSpeed;

      // Schwelle + Mapping auf [0..20]
      const MOTION_ON = 0.2; // ab hier sichtbar
      const MOTION_MAX = 1.0; // Sättigung
      const MAX_SPLIT = 50.0;        // oder 16.0
      const targetSplit = Math.max(0, Math.min(
        MAX_SPLIT,
        (MAX_SPLIT * (motion - MOTION_ON)) / (MOTION_MAX - MOTION_ON)
      ));

      // Sanftes Ansteigen/Abfallen
      const rise = 10.0; // höher = schneller Anstieg
      const fall = 3.0; // höher = schneller Abfall
      s.split += (targetSplit - s.split) * Math.min(1, rise * dt);
      s.split *= Math.exp(-fall * dt);

      passAMat.uniforms.uSplit.value = s.split;

      // Samples aktualisieren
      s.prevQuat.copy(camera.quaternion);
      s.prevPos.copy(camera.position);

      // ---------- Resizing der RenderTargets ----------
      const cur = new Vector2();
      renderer.getDrawingBufferSize(cur);
      if (cur.x !== pano.db.x || cur.y !== pano.db.y) {
        pano.db.copy(cur);
        pano.passAMat.uniforms.resolution.value.copy(pano.db);
        pano.passBMat.uniforms.resolution.value.copy(pano.db);
        pano.rtObjects.setSize(pano.db.x, pano.db.y);
        pano.rtCombined.setSize(pano.db.x, pano.db.y);
      }

      // ---------- Two-Pass Komposition ----------
      const prev = renderer.getRenderTarget();
      renderer.setRenderTarget(pano.rtObjects);
      renderer.clear(true, true, true);
      renderer.render(scene, camera);
      
      renderer.setRenderTarget(prev);

      renderer.setRenderTarget(pano.rtCombined);
      renderer.clear(true, true, true);
      renderer.render(pano.screenSceneA, fsCam);
      renderer.setRenderTarget(null);

      pano.passBMat.uniforms.src.value = pano.rtCombined.texture;
      renderer.render(pano.screenSceneB, fsCam);

    } else {
      renderer.render(scene, camera);
    }

    requestAnimationFrame(animate);
  }

  animate();

  // Resize-Handling
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
    animateObjects,
    fsCam,
    passAMat,
  };
}

export { init };

// ------------------------------------------------------------
// Kamera-Animationen (Deutsch, mit FOV-Update ins Shader-Uniform)
// ------------------------------------------------------------
function moveCamera({
  camera,
  passAMat,
  yaw,
  pitch,
  fov,
  duration = 4,
  controls = null,
  radius = 5, // Kamera-Abstand zum Target
  onComplete = null,
}) {
  const targetYaw = MathUtils.degToRad(yaw);
  const targetPitch = MathUtils.degToRad(pitch);

  const startQuat = camera.quaternion.clone();
  const endQuat = new Quaternion().setFromEuler(
    new Euler(targetPitch, targetYaw, 0, "YXZ")
  );
  const tempQuat = new Quaternion();

  const startFov = camera.fov;
  const target = controls?.target || new Vector3(0, 0, 0);

  // Ziel-Position aus Orientierung ableiten (Orbit um Target)
  const dir = new Vector3(0, 0, -1).applyQuaternion(endQuat);
  const endPos = target.clone().sub(dir.multiplyScalar(radius));

  // GSAP-Interpolations-Objekt
  const state = { t: 0 };

  gsap.to(state, {
    t: 1,
    duration,
    ease: "power2.inOut",
    onUpdate: () => {
      const t = state.t;

      // Rotation (Slerp)
      tempQuat.copy(startQuat).slerp(endQuat, t);
      camera.quaternion.copy(tempQuat);

      // Position aus aktueller Orientierung neu ableiten (Orbit-Logik)
      const fwd = new Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      camera.position.copy(target).sub(fwd.multiplyScalar(radius));

      // FOV
      camera.fov = MathUtils.lerp(startFov, fov, t);
      camera.updateProjectionMatrix();

      // FOV auch dem Shader mitteilen (falls vorhanden)
      if (passAMat?.uniforms?.fovY) {
        passAMat.uniforms.fovY.value = MathUtils.degToRad(camera.fov);
      }

      controls?.update();
    },
    onComplete,
  });
}

// Presets
function homeCameraShift(camera, passAMat, controls) {
  moveCamera({ camera, passAMat, yaw: 10, pitch: 30, fov: 30, duration: 4, controls });
}
function aboutCameraShift(camera, passAMat, controls) {
  moveCamera({ camera, passAMat, yaw: -40, pitch: 30, fov: 80, duration: 4, controls });
}
function galleryCameraShift(camera, passAMat, controls) {
  moveCamera({ camera, passAMat, yaw: 10, pitch: 30, fov: 40, duration: 4, controls });
}
function locationCameraShift(camera, passAMat, controls) {
  moveCamera({ camera, passAMat, yaw: 10, pitch: 180, fov: 30, duration: 4, controls });
}
function contactCameraShift(camera, passAMat, controls) {
  moveCamera({ camera, passAMat, yaw: 180, pitch: 30, fov: 70, duration: 4, controls });
}
function editmodeCameraShift(camera, passAMat, controls) {
  moveCamera({ camera, passAMat, yaw: 10, pitch: 30, fov: 40, duration: 4, controls });
}
function impressumCameraShift(camera, passAMat, controls) {
  moveCamera({ camera, passAMat, yaw: 10, pitch: 30, fov: 40, duration: 4, controls });
}

export {
  homeCameraShift,
  aboutCameraShift,
  galleryCameraShift,
  contactCameraShift,
  locationCameraShift,
  editmodeCameraShift,
  impressumCameraShift,
};
