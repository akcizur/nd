import * as THREE from 'three';

export class PlayerController {
  constructor({ object, input, camera, physics = null, movementSettings = {} }) {
    this.object = object;
    this.input = input;
    this.camera = camera;
    this.physics = physics;
    this.physicsBody = null;

    this.velocityY = 0;
    this.horizontalVelocity = new THREE.Vector3();
    this.grounded = true;
    this.state = 'idle';

    this.walkSpeed = 3.8;
    this.runSpeed = 6.2;
    this.sprintSpeed = 8.4;
    this.acceleration = 25;
    this.deceleration = 32;
    this.airControl = 0.42;
    this.rotationSharpness = 14;

    this.movementSettings = {
      cameraRelativeMovement: true,
      ...movementSettings,
    };
  }

  bindPhysics(body) {
    this.physicsBody = body;
    this.physics?.syncObject(this.object, body);
  }

  setMovementSettings(settings = {}) {
    this.movementSettings = { ...this.movementSettings, ...settings };
  }

  resetMovement() {
    this.horizontalVelocity.set(0, 0, 0);
    this.velocityY = 0;
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

    let forward;
    let right;
    if (this.movementSettings.cameraRelativeMovement) {
      forward = new THREE.Vector3(-Math.sin(this.camera.yaw), 0, -Math.cos(this.camera.yaw));
      right = new THREE.Vector3(Math.cos(this.camera.yaw), 0, -Math.sin(this.camera.yaw));
    } else {
      forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.object.rotation.y);
      right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.object.rotation.y);
    }

    const desiredDirection = forward.multiplyScalar(move.y).add(right.multiplyScalar(move.x));
    if (desiredDirection.lengthSq() > 1) desiredDirection.normalize();

    const targetVelocity = desiredDirection.multiplyScalar(speed * magnitude);
    const targetRate = magnitude > 0.001
      ? (this.grounded ? this.acceleration : this.acceleration * this.airControl)
      : (this.grounded ? this.deceleration : this.deceleration * this.airControl);
    const maxDelta = targetRate * dt;
    this.horizontalVelocity.x = THREE.MathUtils.damp(
      this.horizontalVelocity.x, targetVelocity.x, targetRate, dt
    );
    this.horizontalVelocity.z = THREE.MathUtils.damp(
      this.horizontalVelocity.z, targetVelocity.z, targetRate, dt
    );

    if (magnitude > 0.05 && this.horizontalVelocity.lengthSq() > 0.001) {
      const target = Math.atan2(this.horizontalVelocity.x, -this.horizontalVelocity.z);
      const delta = THREE.MathUtils.euclideanModulo(
        target - this.object.rotation.y + Math.PI, Math.PI * 2
      ) - Math.PI;
      this.object.rotation.y += delta * Math.min(1, dt * this.rotationSharpness);
    }

    if (this.input.jump && this.grounded) {
      this.velocityY = 7.2;
      this.grounded = false;
      this.input.setAction('jump', false);
    }

    this.velocityY -= 22 * dt;

    const desiredTranslation = {
      x: this.horizontalVelocity.x * dt,
      y: this.velocityY * dt,
      z: this.horizontalVelocity.z * dt,
    };
    const result = this.physics.moveCharacter(this.physicsBody, desiredTranslation);
    this.grounded = result.grounded;
    if (this.grounded && this.velocityY < 0) this.velocityY = 0;

    this.physics.syncObject(this.object, this.physicsBody);

    const currentSpeed = Math.hypot(this.horizontalVelocity.x, this.horizontalVelocity.z);
    this.state = !this.grounded
      ? (this.velocityY > 0 ? 'jump' : 'fall')
      : currentSpeed < 0.08
        ? 'idle'
        : this.input.sprint
          ? 'sprint'
          : this.input.crouch
            ? 'crouch'
            : currentSpeed < this.runSpeed * 0.92
              ? 'walk'
              : 'run';
  }
}
