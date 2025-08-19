import { Card } from "./Card";
import { ExtendedObject3D } from "../utils/ExtendedObject3D";
import { Vector2, Vector3 } from "three";
import { MainThree } from "../MainThree";

export class Grid extends ExtendedObject3D {
  static COLUMNS = Math.floor(window.innerWidth / 100) | 1;
  static ROWS = Math.floor(window.innerHeight / 100) | 1;

  static MousePosition = new Vector2();
  #_targetMousePosition = new Vector2();

  #_reserve = false;


  constructor() {
    super();

    /* grid indiv iedlller anpassen => Grid . Colums weite und höhe anpassen */
    /* camera and scroller hängen */
    const canvas = document.querySelector("canvas"); // or your container
    const rect = canvas.getBoundingClientRect(); // container size

    Grid.COLUMNS = Math.floor(rect.width/ 100) | 1;
    Grid.ROWS = Math.floor(rect.height / 100) | 1;
    this.cards = [];
    Card.SetScale();
    this.#_createCards();
    this.#_setListeners();
  }

  #_setListeners() {
    window.addEventListener("mousemove", this.#_updateMousePos);
    window.addEventListener("touchmove", this.#_updateMousePos);
    window.addEventListener('click', this.#_handleClick)
  }
 
  #_handleClick = () => {
    this.#_reserve = true;
  };

  #_createCards() {
    for (let i = 0; i < Grid.COLUMNS; i++) {
      for (let j = 0; j < Grid.ROWS; j++) {
        const card = new Card(i, j);
        this.cards.push(card); // <-- store it
        this.add(card);
      }
    }
  }

  #_updateMousePos = (event) => {

    const canvas = document.querySelector("canvas"); // or your container
    const rect = canvas.getBoundingClientRect();

    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;


    this.#_targetMousePosition.set(x, y);
  };

  resize() {
    const canvas = document.querySelector("canvas"); // or your container
    const rect = canvas.getBoundingClientRect(); // container size

    Grid.COLUMNS = Math.floor(rect.width/ 100) | 1;
    Grid.ROWS = Math.floor(rect.height / 100) | 1;

    Card.SetScale();
  }

  update(dt) {
    this.#_lerpMousePosition(dt);
    console.log(Math.cos(dt))
    if(this.#_reserve) {
      if(this.cards.every((e) => e.zeroPos == true)) {
        this.cards.forEach((card) =>
          card.position.x = 0
         );
      }else {
        this.cards.forEach((card) =>
          card.updatePositionZero(dt)
         );
      }
 
    }else {
      if(this.cards.every((e) => e.pos == true)) {
        this.cards.forEach((card) =>
          card.updatePositionY(dt)
         );
      } else {
        this.cards.forEach((card) =>
          card.updatePositionX(dt)
         );
      }
    }



  }

  #_lerpMousePosition(dt) {
    Grid.MousePosition.lerp(
      this.#_targetMousePosition,
      1 - Math.pow(0.0125, dt)
    );
  }
}
