import GUI from "lil-gui";
import { MathUtils } from "three";

export function createPanoSettingsGUI(
  camera,
  passAMat,
  passBMat,
  params,
  updateRot
) {
  const gui = new GUI({ title: "Pano Settings" });

  gui
    .add(params, "rotX_deg", -180, 180, 0.1)
    .name("Textur Rot X°")
    .onChange(updateRot);
  gui
    .add(params, "rotY_deg", -180, 180, 0.1)
    .name("Textur Rot Y°")
    .onChange(updateRot);
  gui
    .add(params, "rotZ_deg", -180, 180, 0.1)
    .name("Textur Rot Z°")
    .onChange(updateRot);
  gui
    .add(params, "k1", -0.6, 0.6, 0.005)
    .name("De-Fisheye k1")
    .onChange((v) => (passBMat.uniforms.k1.value = v));
  gui
    .add(params, "k2", -0.6, 0.6, 0.005)
    .name("Fein k2")
    .onChange((v) => (passBMat.uniforms.k2.value = v));

  const cameraFovCtrl = gui
    .add(params, "cameraFov", 40, 140, 0.1)
    .name("Kamera FOV")
    .onChange((v) => {
      camera.fov = v;
      camera.updateProjectionMatrix();
      passAMat.uniforms.fovY.value = MathUtils.degToRad(v);
    });

  return { gui: gui, cameraFovCtrl: cameraFovCtrl };
}
