import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ASSET_PACKS } from './AssetPackRegistry.js';

export class CharacterPackLoader {
  constructor(loader = new GLTFLoader()) {
    this.loader = loader;
    this.cache = new Map();
  }

  async load(url) {
    if (!this.cache.has(url)) this.cache.set(url, this.loader.loadAsync(url));
    return this.cache.get(url);
  }

  async loadPlayer() {
    return this.load(ASSET_PACKS.characters.models.player);
  }

  async loadAnimationLibrary() {
    return this.load(ASSET_PACKS.animations.models.locomotion);
  }

  clone(gltf, position = new THREE.Vector3(), scale = 1) {
    const model = SkeletonUtils.clone(gltf.scene);
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

  createPlayerClips(gltf) {
    return gltf?.animations?.filter(Boolean) ?? [];
  }

  // Quaternius Universal Base Characters and UAL1 use the same Universal
  // humanoid skeleton. Do not retarget bone transforms at runtime: direct
  // AnimationClip binding preserves the authored local bone frames.
  retargetClips(clips) {
    return clips?.filter(Boolean) ?? [];
  }

  createMixer(model, clips = []) {
    const mixer = new THREE.AnimationMixer(model);
    return { mixer, actions: clips.map(clip => mixer.clipAction(clip)) };
  }
}
