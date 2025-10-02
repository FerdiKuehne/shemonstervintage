import { MathUtils } from "three";

export function createCameraSettingsGUI(
    gui,
    params,
    camInfo,
    camera,
    passAMat,
    applyCameraFromGUI
  ) {
    const infoFolder = gui.addFolder("Kamera · Position");
    const yawCtrl = infoFolder
    .add(camInfo, "yaw", -180, 180, 0.1)
    .name("Yaw [°]")
    .listen()
    .onChange(() => applyCameraFromGUI());
  const pitchCtrl = infoFolder
    .add(camInfo, "pitch", -89, 89, 0.1)
    .name("Pitch [°]")
    .listen()
    .onChange(() => applyCameraFromGUI());
  const fovCtrl = infoFolder
    .add(camInfo, "fov", 40, 140, 0.1)
    .name("FOV [°]")
    .listen()
    .onChange((v) => {
      camera.fov = v;
      camera.updateProjectionMatrix();
      passAMat.uniforms.fovY.value = MathUtils.degToRad(v);
      params.cameraFov = v;
    });
    
    return {yawCtrl: yawCtrl, pitchCtrl: pitchCtrl, fovCtrl: fovCtrl};
  }
  