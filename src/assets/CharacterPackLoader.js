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
    const gltf = await this.cache.get(url);
    return gltf;
  }

  async loadUniversal() {
    return this.load(ASSET_PACKS.characters.models.male);
  }

  async loadAnimationLibrary() {
    return this.load(ASSET_PACKS.animations.gltf);
  }

  clone(gltf, position, scale = 1) {
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

  retargetClips(clips, targetRoot) {
    const names = new Set();
    targetRoot.traverse(node => names.add(node.name));
    return clips
      .filter(clip => clip?.tracks?.length)
      .map(clip => {
        const tracks = clip.tracks
          .filter(track => names.has(track.name.split('.')[0]))
          .map(track => track.clone());
        if (!tracks.length) return null;
        return new THREE.AnimationClip(clip.name, clip.duration, tracks);
      })
      .filter(Boolean);
  }

  createMixer(model, clips = []) {
    const mixer = new THREE.AnimationMixer(model);
    for (const clip of clips) mixer.clipAction(clip).play();
    return mixer;
  }
}
