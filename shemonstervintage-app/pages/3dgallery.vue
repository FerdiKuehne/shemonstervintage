<template>
    <div class="wrapper">
      <div ref="container" class="three-container"></div>
    </div>
  </template>
    
    <script setup>
  import { onMounted, ref, nextTick } from 'vue'
  import * as THREE from 'three'
  import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
  
  const container = ref(null)
  
  
  onMounted(async () => {
    await nextTick()
    const scene = new THREE.Scene()
  
    console.log('START');
  
    const width = container.value.clientWidth
    const height = container.value.clientHeight
  
    const camera = new THREE.OrthographicCamera( width / - 30, width / 40, height / 30, height / - 40, -10, 1000 );
    camera.position.z = 1;
  
  /*fov  — Camera frustum vertical field of view.
  aspect — Camera frustum aspect ratio.
  near   — Camera frustum near plane.
  far    — Camera frustum far plane.
  */
  
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  
    renderer.setSize(width, height)
   
    container.value.appendChild(renderer.domElement)
  
    const cubeGeometry = new THREE.BoxGeometry(1, 1, 1)
    const sphereGeometry = new THREE.SphereGeometry(2, 20, 20) // radius, widthSegments, heightSegments
  
   
    const wireframe = new THREE.LineSegments(
      new THREE.EdgesGeometry(cubeGeometry),
      new THREE.LineBasicMaterial({  color: 0x000000 , linewidth: 1 })
    )
  
    const wireframe2 = new THREE.LineSegments(
      new THREE.EdgesGeometry(cubeGeometry),
      new THREE.LineBasicMaterial({  color: 0x000000 , linewidth: 1 })
    )
  
    const wireframe3 = new THREE.LineSegments(
      new THREE.EdgesGeometry(sphereGeometry),
      new THREE.LineBasicMaterial({  color: 0x000000 , linewidth: 1 })
    )
  
    const color = 0xFFFFFF;
    const density = 0.05;
    //scene.fog = new THREE.FogExp2(color, density);
    
    wireframe2.position.x = -5
  
    scene.add(wireframe)
    scene.add(wireframe2)
    scene.add(wireframe3)
  
    const amplitude = 4.0 // how high it moves
    const amplitudeX = 15.0 
  
  const speed = 0.005 // delta increment
  const speedX = 0.0005 // delta increment
  
    const animate = (delta) => {
  
      requestAnimationFrame(animate)
   
    //wireframe.position.y = Math.exp(Math.cos(delta*speed) * amplitude * 0.5) 
    wireframe2.position.y = Math.sin(delta*speed) * amplitude
    wireframe3.position.y = Math.cos(delta*speed*1.15) * amplitude
  
    //camera.position.z = Math.sin(delta*speed) * 1000;
     
      //wireframe.position.x = Math.exp(Math.cos(delta*speedX) * amplitudeX*0.5)
      wireframe2.position.x = Math.sin(delta*speedX) * amplitudeX
      wireframe3.position.x = Math.cos(delta*speedX*1.2) * amplitudeX
  
      //wireframe.position.z = Math.cos(delta*speedX*0.66) * 6
      wireframe2.position.z = Math.sin(delta*speedX*0.66) * 6
      wireframe3.position.z = Math.cos(delta*speedX) * 3
  
      wireframe.rotation.y += 0.03
      wireframe2.rotation.y -= 0.03
      wireframe.rotation.x += 0.03
      wireframe2.rotation.x -= 0.03
  
      wireframe3.rotation.y += 0.03
      wireframe3.rotation.x += 0.03
      renderer.render(scene, camera)
    }
  
    animate()
  
    window.addEventListener('resize', () => {
      const width = container.value.clientWidth
      const height = container.value.clientHeight
   
  
    })
  })
  
  
  </script>
  
    
    <style scoped>
    .wrapper {
    display: flex;
    justify-content: center;  /* horizontal center */
    align-items: center;      /* vertical center */
    height: 50vh;            /* full viewport height */
    width: 100vw;             /* full viewport width */
    background: #f5f5f5;
  }
  
  .three-container {
    width: 100vw;
    height: 50vh; 
    margin: auto;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  
    </style>
    
    