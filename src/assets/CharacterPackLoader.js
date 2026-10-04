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
    // UAL and the base character use the same humanoid skeleton, but glTF
    // exports may encode the source node as "Armature/pelvis", "Armature|pelvis"
    // or simply "pelvis". Three.js needs the target node binding, not the
    // exporter-specific path. Resolve every track to the actual target node.
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
      if (!target) return null;
      return { target, name: target.name + '.' + property };
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
