import {
  Group,
  PlaneGeometry,
  SRGBColorSpace,
  TextureLoader,
  LinearFilter,
  NearestFilter,
  Mesh,
  MeshBasicMaterial,
  Box3,
  Vector3,
} from "three";

let gridSize,
  currendGrid = 0;
let geometry;
let gapX = 2.5;
let gapY = 2.7;
let grid;
const targetHeight = 4.5 * 0.56;
const targetWidth = 4 * 0.56;

const images = Array.from(
  { length: 16 },
  (_, i) => `https://picsum.photos/800/900?random=${i + 1}` // 8:9 format (400x600)
);

function getGridSize() {
  const box = new Box3().setFromObject(grid);
  const size = box.getSize(new Vector3());
  return {
    width: size.x,
    height: size.y,
  };
}

function getObjectSize(obj) {
    const box = new Box3().setFromObject(obj);
    const size = box.getSize(new Vector3());
    return {
      width: size.x,
      height: size.y,
    };
  }

function updateGridPosition(gridSize) {
    if (currendGrid !== gridSize) {
      grid.children.forEach((obj, index) => {
        setGridPosition(index, gridSize, obj);
      });
      const { width } = getGridSize();
      const { width: objectWidth } = getObjectSize(grid.children[0]);
      grid.position.x = -width / 2 + objectWidth / 2; // center the grid
      currendGrid = gridSize;
    }
  }

function getCureentGridSize() {
  if (window.innerWidth > 1200) {
    gridSize = 4;
  } else if (window.innerWidth > 768 && window.innerWidth < 1200) {
    gridSize = 3;
  } else if (window.innerWidth < 768) {
    gridSize = 2;
  }
  currendGrid = gridSize;
}

function setGridPosition(index, columns, object) {
  const row = Math.floor(index / columns);
  const col = index % columns;
  object.position.x = col * gapX;
  object.position.y = -(row * gapY);
}


async function loadGridImages(grid, images, renderer) {
  const promises = images.map((url, index) => {
    return new Promise((resolve, reject) => {
      const indexDelta = index + grid.children.length;
      const loader = new TextureLoader();

      loader.load(
        url,
        (texture) => {
          texture.colorSpace = SRGBColorSpace;
          texture.minFilter = LinearFilter;
          texture.magFilter = NearestFilter;
          texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
          texture.needsUpdate = true;

          const material = new MeshBasicMaterial({ map: texture });
          const mesh = new Mesh(geometry, material);

          setGridPosition(indexDelta, gridSize, mesh);
          mesh.userData.text =
          "Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.";
      
          grid.add(mesh);

          resolve(); // Resolve this promise when this texture is loaded
        },
        undefined,
        (err) => {
          console.error("Error loading texture:", err);
          reject(err);
        }
      );
    });
  });

  // Return a promise that resolves when all textures are loaded
    await Promise.all(promises);
    const size = getGridSize();
    console.log("Final grid size:", size.width);
    return size;
}

async function initGrid(renderer) {
  grid = new Group();

  getCureentGridSize();

  geometry = new PlaneGeometry(targetWidth, targetHeight);
  await loadGridImages(grid, images, renderer);
  const totalWidth =
    gridSize * targetWidth + (gridSize - 1) * (gapX - targetWidth);

  grid.position.x = -totalWidth / 2 + targetWidth / 2;
  grid.position.y = targetHeight ;

  return grid;
}

export { initGrid, loadGridImages, updateGridPosition,getObjectSize };
