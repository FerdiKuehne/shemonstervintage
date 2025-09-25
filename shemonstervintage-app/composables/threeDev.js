import { Scene, PerspectiveCamera, WebGLRenderer, Color } from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { createBackgroundSphereFromAPI } from '@/composables/backgroundsphere.js'


async function init(backgroundSphereNeeded = true, orbiterControlsNeeded = true) {


    let controls, backgroundSphere;
    const animateObjects = [];
    const container = document.getElementById('three-root');

    // Scene
    const scene = new Scene()
    scene.background = new Color(0x000000)

    // Camera
    const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.set(0, 0, 0)

    // Renderer
    const renderer = new WebGLRenderer({ antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(window.devicePixelRatio || 1)
    container.appendChild(renderer.domElement);

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
            animateObjects.forEach(cb => {
            cb
          });
        }
        if (controls) {
            controls.update();
        }
        
        renderer.render(scene, camera);
      }
    
      renderer.setAnimationLoop(animate);

      window.addEventListener('resize', () => {
   
        camera.aspect = window.innerWidth / window.innerHeight
        camera.updateProjectionMatrix()
        renderer.setSize(window.innerWidth, window.innerHeight)
      }, { passive: true })

      return { scene, camera, renderer, controls, backgroundSphere,animateObjects}
  }


  export { init }