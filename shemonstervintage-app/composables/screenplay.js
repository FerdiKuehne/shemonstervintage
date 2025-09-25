import { Vector3 } from "three";
import gsap from "gsap";

function moveCamera(camera, toPos, duration = 2, lookAtTarget = new Vector3(0, 0, 0)) {

  gsap.to(camera.position, {
    x: toPos.x,
    y: toPos.y,
    z: toPos.z,
    duration,
    ease: "power2.inOut",
    onUpdate: () => {
      camera.lookAt(lookAtTarget);
    },
  });
}

function homeCameraShift(camera) {
  moveCamera(camera, new Vector3(2, 0, 0), 1.0);
}

function aboutCameraShift(camera) {
  moveCamera(camera, new Vector3(-2, 0, 0), 10.0);
}

function galleryCameraShift(camera) {
  moveCamera(camera, new Vector3(2, 0, 2), 10.0);
}

function locationCameraShift(camera) {
  moveCamera(camera, new Vector3(2, 0, -2), 10.0);
}

function contactCameraShift(camera) {
  moveCamera(camera, new Vector3(-2, 0, -2), 10.0);
}



function editmodeCameraShift(camera, targeetvector) {
  moveCamera(camera, targeetvector, 10.0);
}

export {
  homeCameraShift,
  aboutCameraShift,
  galleryCameraShift,
  contactCameraShift,
  locationCameraShift,
  editmodeCameraShift
};
