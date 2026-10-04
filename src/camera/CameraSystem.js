import * as THREE from 'three';

export class CameraSystem {
  constructor(camera) {
    this.camera = camera; this.yaw = 0; this.pitch = .28;
    this.sensitivityX = 1.8; this.sensitivityY = 1.6; this.invertX = false; this.invertY = false; this.fovBase = 65;
  }
  update(dt, { subject, vehicle = false, input, speed = 0, collisionTest }) {
    if (!subject) return;
    const look = input.look;
    if (look.lengthSq() > .0005) {
      this.yaw += look.x * this.sensitivityX * dt * 3.2 * (this.invertX ? -1 : 1);
      this.pitch = THREE.MathUtils.clamp(this.pitch + look.y * this.sensitivityY * dt * 2.1 * (this.invertY ? -1 : 1), -.15, .82);
    } else if (input.move.lengthSq() > .01) {
      // Camera yaw is the direction from the subject toward the camera.
      // Because the character faces local -Z, its own yaw is already the
      // correct third-person follow angle.
      const target = subject.rotation.y;
      const delta = THREE.MathUtils.euclideanModulo(target - this.yaw + Math.PI, Math.PI * 2) - Math.PI;
      this.yaw += delta * Math.min(1, dt * 2.2);
    }
    const distance = vehicle ? 8.2 : 6.5, height = vehicle ? 3.1 : 2.7, horizontal = Math.cos(this.pitch) * distance;
    const desired = new THREE.Vector3(subject.position.x + Math.sin(this.yaw)*horizontal, subject.position.y + height + Math.sin(this.pitch)*distance, subject.position.z + Math.cos(this.yaw)*horizontal);
    const safe = this._avoidCollision(subject.position, desired, collisionTest);
    this.camera.position.lerp(safe, 1 - Math.exp(-dt * 8));
    const target = subject.position.clone(); target.y += vehicle ? 1 : 1.1; this.camera.lookAt(target);
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, this.fovBase + Math.min(12, Math.abs(speed)*.65), 6, dt);
    this.camera.updateProjectionMatrix();
  }
  _avoidCollision(origin, desired, collisionTest) {
    const direction = desired.clone().sub(origin), length = direction.length(); if (!length) return desired;
    direction.normalize(); let safe = desired.clone();
    for (let i=1, n=Math.max(4,Math.ceil(length/.5)); i<=n; i++) {
      const p=origin.clone().addScaledVector(direction,length*i/n);
      if (collisionTest(p,.25,.8)) { safe=origin.clone().addScaledVector(direction,Math.max(1.2,length*(i-1)/n)); break; }
    }
    return safe;
  }
  lookBehind() { this.yaw += Math.PI; }
}
