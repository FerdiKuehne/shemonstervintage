import {SphereGeometry,MeshBasicMaterial,Mesh,DoubleSide} from "three";

function createBackgroundSphere () {
    const geom = new SphereGeometry(500, 60, 40);
    geom.scale(-1, 1, 1);
    const mat = new MeshBasicMaterial({
      color: 0xf0f0f0,
      side: DoubleSide,
    });
    const sphere = new Mesh(geom, mat);

    return sphere;
}

export { createBackgroundSphere };
