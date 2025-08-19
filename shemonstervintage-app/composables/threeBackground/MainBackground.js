import { MainThree } from "@/composables/threeBackground/script/MainThree.js";
import { Ticker } from "@/composables/three/utils/Ticker.js";

export class Main {

  static async Init() {

    MainThree.Init();
    Ticker.Start();

    this.#_CreateScene();
  }

/* here update scene with objekt */
  static #_CreateScene() {
    MainThree.Add( /* new Object*/);
  }

}
