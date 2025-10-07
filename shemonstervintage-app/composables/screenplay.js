import { Vector3, Quaternion, Euler, MathUtils } from "three";
import gsap from "gsap";

function moveCamera({
  camera,
  passAMat,
  yaw,
  pitch,
  fov,
  duration = 4,
  controls = null,
  radius = 5, // same as your CAMERA_RADIUS
  onComplete = null,
}) {
  const targetYaw = MathUtils.degToRad(yaw);
  const targetPitch = MathUtils.degToRad(pitch);

  const startQuat = new Quaternion().copy(camera.quaternion);
  const endQuat = new Quaternion().setFromEuler(
    new Euler(targetPitch, targetYaw, 0, "YXZ")
  );
  const tempQuat = new Quaternion();

  const startFov = camera.fov;

  const startPos = camera.position.clone();
  const target = controls?.target || new Vector3(0, 0, 0);

  // Compute target camera position
  const dir = new Vector3(0, 0, -1).applyQuaternion(endQuat); // forward direction from new orientation
  const endPos = new Vector3().copy(target).sub(dir.multiplyScalar(radius));

  gsap.to(
    { t: 0 },
    {
      t: 1,
      duration,
      ease: "power2.inOut",
      onUpdate: function () {
        const t = this.targets()[0].t;
        console.log(t);
        // Animate rotation
        tempQuat.copy(startQuat).slerp(endQuat, t);
        camera.quaternion.copy(tempQuat);

        // Compute orbiting position from current orientation
        const fwd = new Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        camera.position.copy(controls.target).sub(fwd.multiplyScalar(radius));

        // Animate FOV
        camera.fov = MathUtils.lerp(startFov, fov, t);
        camera.updateProjectionMatrix();
        passAMat.uniforms.fovY.value = MathUtils.degToRad(camera.fov);

        camera.updateMatrixWorld(true);

        controls.update();
      },
    }
  );
}

function homeCameraShift(camera,passAMat, controls) {
  moveCamera({
    camera,
    passAMat,
    yaw: 10,
    pitch: 30,
    fov: 30,
    duration: 4, // optional
    controls,
  });
}

function aboutCameraShift(camera,passAMat, controls) {
  moveCamera({
    camera,
    passAMat,
    yaw: -40,
    pitch: 30,
    fov: 80,
    duration: 4, // optional
    controls,
  });
}

function galleryCameraShift(camera,passAMat, controls) {
  moveCamera({
    camera,
    passAMat,
    yaw: 10,
    pitch: 30,
    fov: 40,
    duration: 4, // optional
    controls,
  });
}

function locationCameraShift(camera,passAMat, controls) {
  moveCamera({
    camera,
    passAMat,
    yaw: 10,
    pitch: 180,
    fov: 30,
    duration: 4, // optional
    controls,
  });
}

function contactCameraShift(camera,passAMat, controls){
  moveCamera({
    camera,
    passAMat,
    yaw: 180,
    pitch: 30,
    fov: 70,
    duration: 4, // optional
    controls,
  });
}

function editmodeCameraShift(camera,passAMat, controls){
  moveCamera({
    camera,
    passAMat,
    yaw: 10,
    pitch: 30,
    fov: 40,
    duration: 4, // optional
    controls,
  });
}

function impressumCameraShift(camera,passAMat, controls) {
  moveCamera({
    camera,
    passAMat,
    yaw: 10,
    pitch: 30,
    fov: 40,
    duration: 4, // optional
    controls,
  });
}

export {
  homeCameraShift,
  aboutCameraShift,
  galleryCameraShift,
  contactCameraShift,
  locationCameraShift,
  editmodeCameraShift,
};
