import * as THREE from 'three';

export class PlayerController {
  constructor({ object, input, camera, movementSettings = {} }) {
    this.object = object;
    this.input = input;
    this.camera = camera;

    this.velocityY = 0;
    this.horizontalVelocity = new THREE.Vector3();
    this.grounded = true;
    this.state = 'idle';
    this.animationInput = { forward: 0, strafe: 0, magnitude: 0 };

    this.walkSpeed = 3.8;
    this.runSpeed = 6.2;
    this.sprintSpeed = 8.4;
    this.acceleration = 18;
    this.deceleration = 24;
    this.rotationSharpness = 12;
    this.gravity = 22;
    this.jumpSpeed = 7.2;

    this.movementSettings = {
      cameraRelativeMovement: true,
      ...movementSettings,
    };
  }

  get horizontalSpeed() {
    return Math.hypot(this.horizontalVelocity.x, this.horizontalVelocity.z);
  }

  setMovementSettings(settings = {}) {
    this.movementSettings = {
      ...this.movementSettings,
      ...settings,
      cameraRelativeMovement: true,
    };
  }

  reset(position = new THREE.Vector3(), yaw = 0) {
    this.object.position.copy(position);
    this.object.rotation.set(0, yaw, 0);
    this.horizontalVelocity.set(0, 0, 0);
    this.velocityY = 0;
    this.grounded = true;
    this.state = 'idle';
    this.animationInput.forward = 0;
    this.animationInput.strafe = 0;
    this.animationInput.magnitude = 0;
  }

  update(dt) {
    const move = this.input.move;
    const magnitude = Math.min(1, move.length());

    if (magnitude < 0.001) {
      move.set(0, 0);
    }

    const speed = this.input.sprint
      ? this.sprintSpeed
      : magnitude < 0.65
        ? this.walkSpeed
        : this.runSpeed;

    const yaw = this.camera?.yaw ?? this.object.rotation.y;

    const forward = new THREE.Vector3(
      -Math.sin(yaw),
      0,
      -Math.cos(yaw)
    );
    const right = new THREE.Vector3(
      Math.cos(yaw),
      0,
      -Math.sin(yaw)
    );

    const desiredDirection = forward
      .multiplyScalar(move.y)
      .add(right.multiplyScalar(move.x));

    if (desiredDirection.lengthSq() > 1) {
      desiredDirection.normalize();
    }

    this.animationInput.forward = move.y;
    this.animationInput.strafe = move.x;
    this.animationInput.magnitude = magnitude;

    const targetVelocity = desiredDirection.multiplyScalar(speed * magnitude);
    const response = magnitude > 0.001 ? this.acceleration : this.deceleration;

    this.horizontalVelocity.x = THREE.MathUtils.damp(
      this.horizontalVelocity.x,
      targetVelocity.x,
      response,
      dt
    );
    this.horizontalVelocity.z = THREE.MathUtils.damp(
      this.horizontalVelocity.z,
      targetVelocity.z,
      response,
      dt
    );

    if (magnitude > 0.05 && this.horizontalSpeed > 0.08) {
      const targetYaw = Math.atan2(
        -this.horizontalVelocity.x,
        -this.horizontalVelocity.z
      );
      const delta = THREE.MathUtils.euclideanModulo(
        targetYaw - this.object.rotation.y + Math.PI,
        Math.PI * 2
      ) - Math.PI;

      this.object.rotation.y += delta * (1 - Math.exp(-this.rotationSharpness * dt));
    }

    if (this.input.jump && this.grounded) {
      this.velocityY = this.jumpSpeed;
      this.grounded = false;
      this.input.setAction('jump', false);
    }

    this.velocityY -= this.gravity * dt;

    this.object.position.x += this.horizontalVelocity.x * dt;
    this.object.position.z += this.horizontalVelocity.z * dt;
    this.object.position.y += this.velocityY * dt;

    if (this.object.position.y <= 0) {
      this.object.position.y = 0;
      this.velocityY = 0;
      this.grounded = true;
    }

    this.state = !this.grounded
      ? (this.velocityY > 0 ? 'jump' : 'fall')
      : this.horizontalSpeed < 0.08
        ? 'idle'
        : this.input.sprint
          ? 'sprint'
          : this.horizontalSpeed < this.runSpeed * 0.92
            ? 'walk'
            : 'run';
  }
}
