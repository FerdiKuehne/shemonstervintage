<template>
  <div class="wrapper">
    <div ref="threeContainer" class="three-container"></div>
  </div>
</template>

<script setup>
import * as THREE from "three";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { OutlineEffect } from 'three/examples/jsm/effects/OutlineEffect';
import { ref, onMounted } from "vue";

const threeContainer = ref(null);
const galleryItems = [9, 8, 7, 6, 5, 4, 3, 2, 1, 0].reverse(); // Example indices for gallery items
const indexMaske =
  "http://localhost:3000/_nuxt/public/img/sabo.stock/DSCFNNNN.jpg";
const images = [
  "http://localhost:3000/_nuxt/public/img/sabo.stock/DSCF0129.JPG",
  "http://localhost:3000/_nuxt/public/img/sabo.stock/DSCF0130.JPG",
  "http://localhost:3000/_nuxt/public/img/sabo.stock/DSCF0131.JPG",
  "http://localhost:3000/_nuxt/public/img/sabo.stock/DSCF0134.JPG",
  "http://localhost:3000/_nuxt/public/img/sabo.stock/DSCF0135.JPG",
  "http://localhost:3000/_nuxt/public/img/sabo.stock/DSCF0136.JPG",
  "http://localhost:3000/_nuxt/public/img/sabo.stock/DSCF0137.JPG",
  "http://localhost:3000/_nuxt/public/img/sabo.stock/DSCF0138.JPG",
  "http://localhost:3000/_nuxt/public/img/sabo.stock/DSCF0139.JPG",
];
const gridLines = [];

function setGridPosition(index, columns, object, spacing) {
  const row = Math.floor(index / columns);
  const col = index % columns;
  object.position.x = col * spacing;
  object.position.y = -(row * spacing);
}

onMounted(() => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf3f3f3); // Set background color
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  const renderer = new THREE.WebGLRenderer();
  const grid = new THREE.Group();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  let lineGeometry = new THREE.BufferGeometry()
  const lineMaterial = new THREE.LineBasicMaterial( { color: 0x0000ff } );
  let line = null;

  threeContainer.value.appendChild(renderer.domElement);

  images.forEach((url, index) => {
    const loader = new THREE.TextureLoader();
    loader.load(
      url,
      (texture) => {
        texture.format = THREE.RGBAFormat;
        texture.type = THREE.UnsignedByteType;

        const imageWidth = texture.image.width;
        const imageHeight = texture.image.height;
        const aspect = imageWidth / imageHeight;

        const targetHeight = 2; // Keep consistent visual height
        const targetWidth = targetHeight * aspect;

        const geometry = new THREE.PlaneGeometry(targetWidth, targetHeight);
        const material = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
        });

        const mesh = new THREE.Mesh(geometry, material);
       
        setGridPosition(index, 4, mesh, 3); 

        gridLines.push(new THREE.Vector3(mesh.position.x - 0.8, mesh.position.y + 1.1, mesh.position.z));
        if(index === 2){
          lineGeometry.setFromPoints(gridLines);
          line = new THREE.Line( lineGeometry, lineMaterial );
          grid.add( line );
        } 
        if(index > 2) {
          lineGeometry.dispose(); // Dispose old geometry
          lineGeometry = new THREE.BufferGeometry().setFromPoints(gridLines);
          line.geometry = lineGeometry;
        }
  
        grid.add(mesh);
      },
      undefined,
      (err) => {
        console.error("Error loading texture:", err);
      }
    );
  });

  grid.position.set(-4, 0, 5); // Center the grid

  const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
  const cubeMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
  cube.position.set(0, 0, 0);


  scene.add(grid);
  scene.add(cube);

  camera.position.z = 10;

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  function onMouseMove(event) {
    // Normalize mouse coordinates to [-1, 1]
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  window.addEventListener("mousemove", onMouseMove, false);




  function animate() {
    // Update the picking ray with the camera and mouse position
    raycaster.setFromCamera(mouse, camera);

    // Calculate objects intersecting the picking ray
    const intersects = raycaster.intersectObjects(scene.children);

    // Highlight intersected objects
    for (let i = 0; i < intersects.length; i++) {
      intersects[i].object.position.z = 0; // Move the intersected object closer
    }
    renderer.render(scene, camera);
    
  }
  renderer.setAnimationLoop(animate);

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
});
</script>

<style scoped></style>
