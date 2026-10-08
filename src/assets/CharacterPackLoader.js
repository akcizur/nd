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

  retargetClips(clips, targetRoot) {
    const nodes = new Map();
    const normalized = new Map();
    const normalize = value => String(value || '')
      .replace(/\\/g, '/')
      .split('/')
      .pop()
      .split('|')
      .pop()
      .replace(/[^a-z0-9]/gi, '')
      .toLowerCase();

    targetRoot.traverse(node => {
      if (!node.name) return;
      nodes.set(node.name, node);
      normalized.set(normalize(node.name), node);
    });

    const resolveTrack = trackName => {
      const dot = trackName.lastIndexOf('.');
      if (dot <= 0) return null;
      const sourcePath = trackName.slice(0, dot);
      const property = trackName.slice(dot + 1);
      const sourceLeaf = sourcePath
        .replace(/\\/g, '/')
        .split('/')
        .pop()
        .split('|')
        .pop();
      const target = nodes.get(sourceLeaf) || normalized.get(normalize(sourceLeaf));
      return target ? { target, name: target.name + '.' + property } : null;
    };

    return clips
      .filter(clip => clip?.tracks?.length)
      .map(clip => {
        const tracks = [];
        for (const track of clip.tracks) {
          const binding = resolveTrack(track.name);
          if (!binding) continue;
          const next = track.clone();
          next.name = binding.name;
          tracks.push(next);
        }
        return tracks.length
          ? new THREE.AnimationClip(clip.name, clip.duration, tracks)
          : null;
      })
      .filter(Boolean);
  }

  createMixer(model, clips = []) {
    const mixer = new THREE.AnimationMixer(model);
    return { mixer, actions: clips.map(clip => mixer.clipAction(clip)) };
  }
}
