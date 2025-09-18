import {
  Scene,
  Color,
  PerspectiveCamera,
  WebGLRenderer,
  AxesHelper,
  GridHelper,
  Vector2,
  Raycaster,
  PlaneGeometry,
  MeshBasicMaterial,
    Mesh,
    DoubleSide
} from "three";
import gsap from "gsap";
import { createBackgroundSphere } from "./backgroundsphere.js";
import { initGrid } from "./grid.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Observer } from "gsap/Observer";

gsap.registerPlugin(Observer);

async function run(container, containerHeight, scrollContainer) {
  const scene = new Scene();
  const sphere = createBackgroundSphere();
  const renderer = new WebGLRenderer({ antialias: true });
  const axesHelper = new AxesHelper(30);
  const gridHelper = new GridHelper(20, 20);
  const mouse = new Vector2();
  const raycaster = new Raycaster();
  const zoomSpace = gsap.timeline({ paused: true });
  let selectedObj = null;
  let zoomedIn = false;
  const geometryPlane = new PlaneGeometry(20, 2);
  const materialPlane = new MeshBasicMaterial({ color: 0xff00ff, side: DoubleSide ,transparent: true, opacity: 0.2});
  const plane = new Mesh(geometryPlane, materialPlane);
  plane.userData.name = "openGrid";
plane.position.set(0, 2, 3);

  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  const camera = new PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    260
  );
  camera.position.z = 250;
  container.value.appendChild(renderer.domElement);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enableZoom = false;
  controls.dampingFactor = 0.05;
  controls.target.set(0, 0, 0);
  axesHelper.layers.set(1);
  gridHelper.layers.set(1);
  raycaster.layers.set(0);

  const grid = await initGrid(
    renderer,
    camera,
    containerHeight,
    scrollContainer
  );

  zoomSpace.to(camera.position, {
    duration: 1,
    z: 6,
    y: 0,
    x: 0,
    ease: "power2.inOut",
  });

  grid.visible = false;
  scene.background = new Color(0x000000);

  gridHelper.rotation.x = Math.PI / 2;
  controls.update();

  /* add Objects */
  scene.add(axesHelper);
  scene.add(gridHelper);
  scene.add(sphere);
  scene.add(grid);
  scene.add(plane);

  /* End add Objects */

  /* Observer click object */

  Observer.create({
    target: renderer.domElement,
    type: "pointer",
    onClick: (ev) => {
      const e = ev.event || ev;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      console.log("click..............................");
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects([scene], true);
      if (!hits.length) return;
      selectedObj = hits[0].object;
      if (selectedObj.geometry.type === "SphereGeometry") {
        if (!zoomedIn) {
            zoomSpace.play();     
          } else {
            zoomSpace.reverse();
          }
          zoomedIn = !zoomedIn;
      } if(selectedObj.userData.name === "openGrid"){
        if(!grid.visible) {
            grid.visible = true;
        } else {
            grid.visible = false;
        }
      }
      console.log("Selected object:", selectedObj);
    },
  });

  function animate() {
    controls.update();
    renderer.render(scene, camera);
  }

  renderer.setAnimationLoop(animate);
}

export { run };
