import { SphereGeometry, MeshBasicMaterial, Mesh, TextureLoader, DoubleSide } from 'three';

function createBackgroundSphere() {
  const geom = new SphereGeometry(50, 60, 40);
  geom.scale(-1, 1, 1); // invert the sphere to see the texture from inside

  // Load texture
  const loader = new TextureLoader();
  const texture = loader.load('https://shemonstervintage.de/img/panorama.jpg');

  const mat = new MeshBasicMaterial({
    map: texture, // assign texture
    side: DoubleSide, // make sure it's visible inside
  });

  const sphere = new Mesh(geom, mat);
  return sphere;
}

export { createBackgroundSphere };
