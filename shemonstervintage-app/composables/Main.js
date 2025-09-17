import {
  Scene,
  Color,
  PerspectiveCamera,
  WebGLRenderer,
  AxesHelper,
  GridHelper,
} from "three";
import { createBackgroundSphere } from "./backgroundsphere.js";
import { initGrid } from "./grid.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { gsap } from "gsap";



async function run(container, containerHeight) {
  const scene = new Scene();
  const sphere = createBackgroundSphere();
  const renderer = new WebGLRenderer({ antialias: true });
  const axesHelper = new AxesHelper(30);
  const gridHelper = new GridHelper(20, 20);
  
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  const camera = new PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  container.appendChild(renderer.domElement);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enableZoom = false;
  controls.dampingFactor = 0.05;
  controls.target.set(0, 0, 0);
  const grid = await initGrid(renderer);

  scene.background = new Color(0x000000);
  camera.position.z = 6;
  gridHelper.rotation.x = Math.PI / 2;
  controls.update();

  /* add Objects */
  scene.add(axesHelper);
  scene.add(gridHelper);
  scene.add(sphere);
  scene.add(grid);

  /* End add Objects */


  function animate() {
    controls.update();
    renderer.render(scene, camera);
  }

  renderer.setAnimationLoop(animate);

  return { grid, camera, renderer };
}

export { run };
