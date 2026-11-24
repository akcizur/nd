import * as THREE from 'three';

export class ThirdPersonCamera {
  yaw = 0;
  pitch = 0.24;
  distance = 5.4;
  height = 1.35;
  minPitch = -0.15;
  maxPitch = 0.72;
  sensitivity = 0.0028;
  touchTurnSpeed = 2.2;
  minDistance = 2.3;
  maxDistance = 8.2;

  private current = new THREE.Vector3();
  private desired = new THREE.Vector3();
  private target = new THREE.Vector3();
  private offset = new THREE.Vector3();
  private raycaster = new THREE.Raycaster();
  private direction = new THREE.Vector3();
  private initialized = false;

  constructor(readonly camera: THREE.PerspectiveCamera) {}

  lookDelta(dx: number, dy: number, dt = 1 / 60, source: 'mouse' | 'touch' = 'mouse') {
    const scale = source === 'mouse' ? this.sensitivity : this.touchTurnSpeed * dt;
    // Positive horizontal input must orbit to the right, not invert the mouse.
    this.yaw += dx * scale;
    this.pitch -= dy * scale;
    this.pitch = THREE.MathUtils.clamp(this.pitch, this.minPitch, this.maxPitch);
  }

  zoom(amount: number) {
    this.distance = THREE.MathUtils.clamp(this.distance + amount, this.minDistance, this.maxDistance);
  }

  update(dt: number, subject: THREE.Object3D, scene?: THREE.Scene) {
    this.target.copy(subject.position);
    this.target.y += this.height;

    const cp = Math.cos(this.pitch);
    const sp = Math.sin(this.pitch);
    // At yaw=0 the camera sits behind the character (+Z), looking toward -Z.
    this.offset.set(Math.sin(this.yaw) * cp, sp, Math.cos(this.yaw) * cp).multiplyScalar(this.distance);
    this.desired.copy(this.target).add(this.offset);

    if (scene) {
      this.direction.subVectors(this.desired, this.target);
      const distance = this.direction.length();
      this.raycaster.set(this.target, this.direction.clone().normalize());
      this.raycaster.far = distance;
      const hit = this.raycaster.intersectObjects(scene.children, true).find(hit => {
        let node: THREE.Object3D | null = hit.object;
        while (node) {
          if (node === subject) return false;
          node = node.parent;
        }
        return hit.object.name !== 'Ground';
      });
      if (hit) this.desired.copy(this.target).addScaledVector(this.direction, Math.max(1.15, hit.distance - 0.25));
    }

    if (!this.initialized) {
      this.current.copy(this.desired);
      this.initialized = true;
    } else {
      this.current.lerp(this.desired, 1 - Math.exp(-dt * 12));
    }
    this.camera.position.copy(this.current);
    this.camera.lookAt(this.target);
  }
}
