import { ExtendedObject3D } from 'three-stdlib';
import { Card } from './Card';

export class Grid extends ExtendedObject3D {
    static COLUMNS = Math.floor(window.innerWidth / 100) | 1;
    static ROWS = Math.floor(window.innerHeight / 100) | 1;
    // ...
    
    resize() {
        Grid.COLUMNS = Math.floor(window.innerWidth / 100) | 1;
        Grid.ROWS = Math.floor(window.innerHeight / 100) | 1;
    }
    constructor() {
        super();
    
        this.#_createCards();
      }
    
      #_createCards() {
        for(let i = 0; i < Grid.COLUMNS; i++) {
          for(let j = 0; j < Grid.ROWS; j++) {
            const card = new Card(i, j);
            this.add(card);
          }
        }
      }

  }