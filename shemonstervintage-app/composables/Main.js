import { AssetsId } from "../composables/three/constants/AssetsId";
import { AssetsManager } from "@/composables/three/managers/AssetsManager.js";
import { Grid } from "@/composables/three/components/Grid.js";
import { MainThree } from "@/composables/three/MainThree.js";
import { Ticker } from "@/composables/three/utils/Ticker.js";

export class Main {

  indexMaske = "http://localhost:3000/_nuxt/public/img/sabo.stock/DSCFNNNN.jpg";

  static async Init() {

    MainThree.Init();
    Ticker.Start();

    await this.#_LoadAssets();
    this.#_CreateScene();
  }


  static async #_LoadAssets() {

    for (let i = 129; i < 150; i++) {
      const indexpicture = i.toString().padStart(4, '0');
      const imageUrl = indexMaske.replace("NNNN", indexpicture);
      
      try {
        const response = await fetch(imageUrl, { method: 'HEAD' });
        if (response.ok) {
          AssetsManager.AddTexture(AssetsId[`TEXTURE_${i}`], `${imageUrl}`);
        }
      } catch (error) {
        console.warn(`Image not found: ${imageUrl}`);
      }
    }
    await AssetsManager.Load();
  }

  static #_CreateScene() {
    MainThree.Add(new Grid());
  }


}



const indexMaske = "http://localhost:3000/_nuxt/public/img/sabo.stock/DSCFNNNN.jpg";

async function loadImages() {
  for (let i = 129; i < 1423; i++) {
    const indexpicture = i.toString().padStart(4, '0');
    const imageUrl = indexMaske.replace("NNNN", indexpicture);
    
    try {
      const response = await fetch(imageUrl, { method: 'HEAD' });
      if (response.ok) {
        images.value.push(imageUrl);
      }
    } catch (error) {
      console.warn(`Image not found: ${imageUrl}`);
    }
  }

  loading.value = false;
}

