import { Mesh, PlaneGeometry, Uniform, Vector2, Vector3 } from "three";

import { CardMaterial } from "../materials/CardMaterial";
import { ExtendedObject3D } from "../utils/ExtendedObject3D";

import { MainThree } from "../MainThree";


export class SabotagePentagon extends ExtendedObject3D {
  static Geometry = new PlaneGeometry(1, 1);

  #_defaultScale = new Vector3().setScalar(0.5);

  mesh;
  material;

  constructor(i, j) {
    super();

    this.#_createMesh();
    this.#_setTargetPosition();
    this.scale.copy(this.#_defaultScale);
  }

  #_createMesh() {

        /*
    const texture = AssetsManager.GetAsset(textureId); // hier unterschieldlige textures
        */

    this.material = new CardMaterial({
      uniforms: {
        uDistance: new Uniform(0),
        uTexture: new Uniform(texture),
      },
    });

    this.mesh = new Mesh(Card.Geometry, 
        this.material);

    this.add(this.mesh);
  }

  #_setTargetPosition() {
 
    x =
      mapLinear(
        x,
        0,
        Grid.COLUMNS,
        MainThree.Camera.left,
        MainThree.Camera.right
      ) + cardWidth;

    y =
      mapLinear(
        y,
        0,
        Grid.ROWS,
        MainThree.Camera.bottom,
        MainThree.Camera.top
      ) + cardHeight;

    this.#_gridPosition.set(x, y, 0);
  }

  static SetScale() {
    const canvas = document.querySelector("canvas"); // or your container
    const rect = canvas.getBoundingClientRect(); // container size

    const aspect = rect.width / rect.height;
    const viewWidth = MainThree.Camera.right - MainThree.Camera.left;

    const columnWidth = viewWidth / Grid.COLUMNS;

    this.#_DefaultScale.x = columnWidth;
    this.#_DefaultScale.y = columnWidth * aspect;

    const isPortrait = rect.height > rect.width;
    const scaleFactor = isPortrait ? 2 : 1.2;

    this.#_MaxScale.copy(this.#_DefaultScale).multiplyScalar(scaleFactor);
  }

  resize(event) {
    this.mesh.scale.copy(Card.#_DefaultScale);
  }

  update(dt) {
    if (this.pos == true) {
      this.#_updateScale(dt);
    }
  }

  updatePositionY(dt) {
    this.#_targetPosition.set(
      this.#_gridPosition.x,
      this.#_gridPosition.y,
      this.position.z
    );
    this.position.lerp(
      this.#_targetPosition,
      1 - Math.pow(0.005 / Grid.COLUMNS, dt * 1)
    );
  }

  updatePositionZero(dt) {
    const distanceX = Math.abs(0 - this.position.x);
    const distanceY = Math.abs(0 - this.position.y);
    if (this.zeroPos == false) {
      if (distanceX < 0.001 && distanceY < 0.001) {
        this.position.x = 0;
        this.position.y = 0;
        this.position.z = 0;
        this.rotation.set(0, 0, 0);
        this.zeroPos = true;
      } else {
        this.#_targetPosition.set(0, 0, this.position.z);
        this.position.lerp(
          this.#_targetPosition,
          1 - Math.pow(0.005 / Grid.COLUMNS, dt * 0.5)
        );
      }
    }
  }

  updatePositionX(dt) {
    if (this.pos == false) {
      const distanceX = Math.abs(this.#_gridPosition.x - this.position.x);
      if (distanceX < 0.001) {
        this.pos = true;
        this.position.x = this.#_gridPosition.x;
      }
      this.#_targetPosition.set(
        this.#_gridPosition.x,
        0, // distanceX < 0.075 ? this.#_gridPosition.y : 0,
        this.position.z
      );
      this.position.lerp(
        this.#_targetPosition,
        1 - Math.pow(0.005 / Grid.COLUMNS, dt * 0.5)
      );
    }
  }

  #_updateScale(dt) {
    const canvas = document.querySelector("canvas"); // or your container
    const rect = canvas.getBoundingClientRect(); // container size

    const aspect = rect.width / rect.height;

    const distanceX = Grid.MousePosition.x - this.position.x;
    let distanceY = Grid.MousePosition.y - this.position.y;
    distanceY /= aspect;

    let distance = Math.pow(distanceX, 2) + Math.pow(distanceY, 2);
    distance *= aspect > 1 ? 12 : 3;

    this.#_targetScale.lerpVectors(
      Card.#_DefaultScale,
      Card.#_MaxScale,
      Math.max(1 - distance, 0)
    );

    this.mesh.scale.lerp(this.#_targetScale, 1 - Math.pow(0.0002, dt));

    this.position.z = -distance;
    this.material.uniforms.uDistance.value = distance;
  }
}
