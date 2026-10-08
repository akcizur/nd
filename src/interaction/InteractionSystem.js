import * as THREE from 'three';
import {
  acceleratedRaycast,
  computeBoundsTree,
  disposeBoundsTree,
} from 'three-mesh-bvh';

let bvhInstalled = false;

function installBVH() {
  if (bvhInstalled) return;

  THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
  THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;

  bvhInstalled = true;
}

export class InteractionSystem {
  constructor({
    camera = null,
    maxDistance = 3,
    recursive = true,
  } = {}) {
    installBVH();

    this.camera = camera;
    this.maxDistance = maxDistance;
    this.recursive = recursive;

    this.raycaster = new THREE.Raycaster();
    this.raycaster.firstHitOnly = true;

    this.root = null;
    this.interactables = new Set();

    this.lastHit = null;
    this.lastTarget = null;
  }

  setCamera(camera) {
    this.camera = camera;
  }

  setRoot(root) {
    this.root = root;
    return this.buildBVH(root);
  }

  buildBVH(root = this.root) {
    if (!root) return 0;

    let built = 0;

    root.traverse(object => {
      if (!object.isMesh || object.isSkinnedMesh) return;
      if (!object.geometry || object.visible === false) return;

      if (!object.geometry.boundsTree) {
        object.geometry.computeBoundsTree();
        object.raycast = acceleratedRaycast;
        built += 1;
      } else if (object.raycast !== acceleratedRaycast) {
        object.raycast = acceleratedRaycast;
      }
    });

    return built;
  }

  dispose(root = this.root) {
    if (!root) return;

    root.traverse(object => {
      if (!object.isMesh || !object.geometry?.boundsTree) return;
      object.geometry.disposeBoundsTree();
      if (object.raycast === acceleratedRaycast) {
        delete object.raycast;
      }
    });
  }

  register(object, {
    action = null,
    enabled = true,
    distance = this.maxDistance,
    prompt = null,
    metadata = {},
  } = {}) {
    if (!object) return null;

    const interaction = {
      action,
      enabled,
      distance,
      prompt,
      metadata,
    };

    object.userData.interaction = interaction;
    this.interactables.add(object);
    return interaction;
  }

  unregister(object) {
    if (!object) return;
    this.interactables.delete(object);

    if (object.userData?.interaction) {
      delete object.userData.interaction;
    }
  }

  clear() {
    for (const object of this.interactables) {
      if (object.userData?.interaction) {
        delete object.userData.interaction;
      }
    }

    this.interactables.clear();
    this.lastHit = null;
    this.lastTarget = null;
  }

  _findInteractable(object) {
    let current = object;

    while (current) {
      const data = current.userData?.interaction;
      if (data?.enabled !== false) {
        return { object: current, data };
      }
      current = current.parent;
    }

    return null;
  }

  raycastFromCamera({
    camera = this.camera,
    ndc = { x: 0, y: 0 },
    maxDistance = this.maxDistance,
  } = {}) {
    if (!camera || !this.root) {
      this.lastHit = null;
      this.lastTarget = null;
      return null;
    }

    this.raycaster.setFromCamera(ndc, camera);
    this.raycaster.near = camera.near;
    this.raycaster.far = maxDistance;

    const hits = this.raycaster.intersectObject(this.root, this.recursive);

    for (const hit of hits) {
      const target = this._findInteractable(hit.object);
      if (!target) continue;

      const limit = Math.min(maxDistance, target.data.distance ?? maxDistance);
      if (hit.distance > limit) continue;

      const result = {
        ...target,
        hit,
      };

      this.lastHit = hit;
      this.lastTarget = result;
      return result;
    }

    this.lastHit = null;
    this.lastTarget = null;
    return null;
  }

  get current() {
    return this.lastTarget;
  }

  update(options = {}) {
    return this.raycastFromCamera(options);
  }
}
