import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ASSET_PACKS } from './AssetPackRegistry.js';

export class BuildingPackLoader {
  constructor(loader = new GLTFLoader()) {
    this.loader = loader;
    this.cache = new Map();
  }

  async load(url) {
    if (!this.cache.has(url)) this.cache.set(url, this.loader.loadAsync(url));
    return this.cache.get(url);
  }

  async loadPack() {
    return Promise.all(ASSET_PACKS.buildings.models.map(url => this.load(url)));
  }

  instantiate(gltf, position, scale = 1) {
    const model = gltf.scene.clone(true);
    model.position.copy(position);
    model.scale.setScalar(scale);
    model.traverse(node => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    return model;
  }

  getBounds(model) {
    model.updateMatrixWorld(true);
    return new THREE.Box3().setFromObject(model);
  }
}
