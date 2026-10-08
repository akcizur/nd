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
  // humanoid skeleton. Rebind tracks to the actual player bones while keeping
  // authored local rotations and Hips/Pelvis motion intact.
  //
  // World position belongs to the Rapier character controller. A standalone
  // skeleton root position track is therefore ignored so the animation cannot
  // make the visible player drift away from its physics body.
  retargetClips(clips, targetRoot) {
    if (!targetRoot) return clips?.filter(Boolean) ?? [];

    const bones = new Map();
    const normalizedBones = new Map();

    const normalize = value => String(value || '')
      .replace(/\\/g, '/')
      .split('/')
      .pop()
      .split('|')
      .pop()
      .replace(/[^a-z0-9]/gi, '')
      .toLowerCase();

    targetRoot.traverse(node => {
      if (!node.isBone || !node.name) return;
      bones.set(node.name, node);
      normalizedBones.set(normalize(node.name), node);
    });

    const skeletonRoots = [...bones.values()].filter(node => {
      let parent = node.parent;
      while (parent && !parent.isBone) parent = parent.parent;
      return !parent;
    });

    const isWorldRoot = node => {
      if (!skeletonRoots.includes(node)) return false;
      const name = normalize(node.name);
      return !/(hips?|pelvis)/.test(name);
    };

    return (clips ?? [])
      .filter(clip => clip?.tracks?.length)
      .map(clip => {
        const tracks = [];

        for (const track of clip.tracks) {
          const dot = track.name.lastIndexOf('.');
          if (dot <= 0) continue;

          const sourceLeaf = track.name
            .slice(0, dot)
            .replace(/\\/g, '/')
            .split('/')
            .pop()
            .split('|')
            .pop();

          const target = bones.get(sourceLeaf) ||
            normalizedBones.get(normalize(sourceLeaf));

          if (!target?.isBone) continue;

          const property = track.name.slice(dot + 1);

          // Keep authored local Hips/Pelvis motion for natural locomotion,
          // but never let a separate skeleton root own gameplay transforms.
          // The PlayerController/Rapier rig owns world position and facing.
          if (isWorldRoot(target) && (
            property === 'position' ||
            property === 'quaternion' ||
            property === 'scale'
          )) continue;

          const next = track.clone();
          next.name = target.name + '.' + property;
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
