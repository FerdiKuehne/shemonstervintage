export function createGridSettingsGUI(
  gui,
  params,
  gridMesh,
  gridMat,
  setGridY
) {
    
  const gridSettings = gui.addFolder("Grid Settings");
  gridSettings
    .add(params, "gridVisible")
    .name("Grid sichtbar")
    .onChange((v) => (gridMesh.visible = v));
  gridSettings
    .add(gridMat.uniforms.spacing, "value", 0.01, 1.0, 0.01)
    .name("Feldgröße [m]");
  gridSettings
    .addColor({ axis: "#ffe28a" }, "axis")
    .name("Achsenfarbe")
    .onChange((v) => gridMat.uniforms.axisColor.value.set(v));
  gridSettings
    .add(gridMat.uniforms.axisThickness, "value", 0.5, 3.0, 0.1)
    .name("Achsendicke [px]");

  return gridSettings
    .add(params, "gridHeight", -5, 5, 0.01)
    .name("Grid Höhe (Y)")
    .onChange(setGridY);
}
