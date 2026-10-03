import * as THREE from 'three';

export class PlayerController {
  constructor({ object, input, camera, physics = null }) {
    this.object = object;
    this.input = input;
    this.camera = camera;
    this.physics = physics;
    this.physicsBody = null;
    this.velocityY = 0;
    this.grounded = true;
    this.state = 'idle';
    this.walkSpeed = 3.8;
    this.runSpeed = 6.2;
    this.sprintSpeed = 8.4;
    this.rotationSharpness = 14;
  }

  bindPhysics(body) {
    this.physicsBody = body;
    this.physics?.syncObject(this.object, body);
  }

  update(dt) {
    if (!this.physicsBody || !this.physics) return;
    const move = this.input.move;
    const magnitude = Math.min(1, move.length());
    const speed = this.input.sprint
      ? this.sprintSpeed
      : this.input.crouch
        ? this.walkSpeed * 0.55
        : magnitude < 0.65
          ? this.walkSpeed
          : this.runSpeed;

    const forward = new THREE.Vector3(-Math.sin(this.camera.yaw), 0, -Math.cos(this.camera.yaw));
    const right = new THREE.Vector3(Math.cos(this.camera.yaw), 0, -Math.sin(this.camera.yaw));
    const desired = forward.multiplyScalar(move.y).add(right.multiplyScalar(move.x));
    if (desired.lengthSq() > 1) desired.normalize();
    desired.multiplyScalar(speed * magnitude);

    if (desired.lengthSq() > 0.0001) {
      const target = Math.atan2(desired.x, -desired.z);
      const delta = THREE.MathUtils.euclideanModulo(target - this.object.rotation.y + Math.PI, Math.PI * 2) - Math.PI;
      this.object.rotation.y += delta * Math.min(1, dt * this.rotationSharpness);
    }

    if (this.input.jump && this.grounded) {
      this.velocityY = 7.2;
      this.grounded = false;
      this.input.setAction('jump', false);
    }
    this.velocityY -= 22 * dt;

    const desiredTranslation = {
      x: desired.x * dt,
      y: this.velocityY * dt,
      z: desired.z * dt,
    };
    const result = this.physics.moveCharacter(this.physicsBody, desiredTranslation);
    this.grounded = result.grounded;
    if (this.grounded && this.velocityY < 0) this.velocityY = 0;

    this.physics.syncObject(this.object, this.physicsBody);
    this.state = !this.grounded
      ? (this.velocityY > 0 ? 'jump' : 'fall')
      : magnitude < 0.05
        ? 'idle'
        : this.input.sprint
          ? 'sprint'
          : this.input.crouch
            ? 'crouch'
            : magnitude < 0.65
              ? 'walk'
              : 'run';
  }
}
