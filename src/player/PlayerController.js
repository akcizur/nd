import * as THREE from 'three';

export class PlayerController {
  constructor({ object, input, collisionTest, camera }) {
    this.object = object; this.input = input; this.collisionTest = collisionTest; this.camera = camera;
    this.velocityY = 0; this.grounded = true; this.state = 'idle';
    this.walkSpeed = 3.8; this.runSpeed = 6.2; this.sprintSpeed = 8;
    this.rotationSharpness = 12;
  }
  update(dt) {
    const move = this.input.move;
    const magnitude = Math.min(1, move.length());
    const speed = this.input.sprint ? this.sprintSpeed : this.input.crouch ? this.walkSpeed * .55 : this.runSpeed;
    const forward = new THREE.Vector3(-Math.sin(this.camera.yaw), 0, -Math.cos(this.camera.yaw));
    const right = new THREE.Vector3(Math.cos(this.camera.yaw), 0, -Math.sin(this.camera.yaw));
    const desired = forward.multiplyScalar(move.y).add(right.multiplyScalar(move.x));
    if (desired.lengthSq() > 1) desired.normalize();
    desired.multiplyScalar(speed * magnitude);
    if (desired.lengthSq() > .0001) {
      const target = Math.atan2(desired.x, -desired.z);
      const delta = THREE.MathUtils.euclideanModulo(target - this.object.rotation.y + Math.PI, Math.PI * 2) - Math.PI;
      this.object.rotation.y += delta * Math.min(1, dt * this.rotationSharpness);
    }
    this.velocityY -= 22 * dt;
    if (this.input.jump && this.grounded) { this.velocityY = 7.2; this.grounded = false; this.input.setAction('jump', false); }
    const next = this.object.position.clone().addScaledVector(desired, dt);
    next.y += this.velocityY * dt;
    if (next.y <= 0) { next.y = 0; this.velocityY = 0; this.grounded = true; }
    if (!this.collisionTest(next, .42, 1.9)) this.object.position.copy(next);
    this.state = !this.grounded ? (this.velocityY > 0 ? 'jump' : 'fall') : magnitude < .05 ? 'idle' : this.input.sprint ? 'sprint' : this.input.crouch ? 'crouch' : magnitude < .65 ? 'walk' : 'run';
  }
}
