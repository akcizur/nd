import * as THREE from 'three';

export class PlayerController {
  constructor({
    object,
    input,
    camera,
    physicsWorld,
    physicsCharacter,
    movementSettings = {},
  }) {
    this.object = object;
    this.input = input;
    this.camera = camera;
    this.physicsWorld = physicsWorld;
    this.physicsCharacter = physicsCharacter;

    this.velocityY = 0;
    this.horizontalVelocity = new THREE.Vector3();
    this.lastHorizontalVelocity = new THREE.Vector3();

    this.grounded = true;
    this.previousGrounded = true;
    this.state = 'idle';
    this.justLanded = false;
    this.justJumped = false;

    this.coyoteTime = 0.1;
    this.jumpBufferTime = 0.12;
    this.timeSinceGrounded = 0;
    this.jumpBufferRemaining = 0;

    this.animationInput = { forward: 0, strafe: 0, magnitude: 0 };

    // Metres / second for a human-scale 1.8 m character.
    this.walkSpeed = 2.6;
    this.runSpeed = 4.8;
    this.sprintSpeed = 7.0;
    this.crouchSpeed = 1.55;

    // Acceleration is deliberately finite: velocity drives animation speed.
    this.acceleration = 11;
    this.deceleration = 17;
    this.airAcceleration = 3.0;

    this.rotationSharpness = 14;
    this.gravity = 9.81;
    this.jumpSpeed = 5.4;

    this.movementSettings = {
      cameraRelativeMovement: true,
      ...movementSettings,
    };
  }

  get horizontalSpeed() {
    return Math.hypot(this.horizontalVelocity.x, this.horizontalVelocity.z);
  }

  get horizontalAcceleration() {
    return Math.hypot(
      this.horizontalVelocity.x - this.lastHorizontalVelocity.x,
      this.horizontalVelocity.z - this.lastHorizontalVelocity.z
    );
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
    this.lastHorizontalVelocity.set(0, 0, 0);

    this.velocityY = 0;
    this.grounded = true;
    this.previousGrounded = true;
    this.state = 'idle';
    this.justLanded = false;
    this.justJumped = false;

    this.coyoteTime = 0.1;
    this.timeSinceGrounded = 0;
    this.jumpBufferRemaining = 0;

    this.animationInput.forward = 0;
    this.animationInput.strafe = 0;
    this.animationInput.magnitude = 0;

    this.physicsWorld?.resetCharacter(this.physicsCharacter, {
      x: position.x,
      y: position.y,
      z: position.z,
    });

    if (this.physicsWorld && this.physicsCharacter) {
      const p = this.physicsCharacter.body.translation();
      this.object.position.set(
        p.x,
        p.y - this.physicsCharacter.footOffset,
        p.z
      );
    }
  }

  _getDesiredVelocity() {
    const move = this.input.move;
    const magnitude = Math.min(1, move.length());

    if (magnitude < 0.001) {
      move.set(0, 0);
    }

    const speed = this.input.crouch
      ? this.crouchSpeed
      : this.input.sprint
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

    return {
      direction: desiredDirection,
      magnitude,
      targetSpeed: speed * magnitude,
    };
  }

  fixedUpdate(dt) {
    if (!this.physicsWorld || !this.physicsCharacter) return;

    this.justLanded = false;
    this.justJumped = false;
    this.previousGrounded = this.grounded;
    this.lastHorizontalVelocity.copy(this.horizontalVelocity);

    const { direction, magnitude, targetSpeed } = this._getDesiredVelocity();

    const targetX = direction.x * targetSpeed;
    const targetZ = direction.z * targetSpeed;

    const response = this.grounded
      ? magnitude > 0.001
        ? this.acceleration
        : this.deceleration
      : magnitude > 0.001
        ? this.airAcceleration
        : 1.2;

    this.horizontalVelocity.x = THREE.MathUtils.damp(
      this.horizontalVelocity.x,
      targetX,
      response,
      dt
    );

    this.horizontalVelocity.z = THREE.MathUtils.damp(
      this.horizontalVelocity.z,
      targetZ,
      response,
      dt
    );

    if (this.input.jump) {
      this.jumpBufferRemaining = this.jumpBufferTime;
    } else {
      this.jumpBufferRemaining = Math.max(0, this.jumpBufferRemaining - dt);
    }

    this.timeSinceGrounded += dt;

    if (this.grounded) {
      this.timeSinceGrounded = 0;
    }

    const canCoyoteJump = this.timeSinceGrounded <= this.coyoteTime;

    if (this.jumpBufferRemaining > 0 && canCoyoteJump) {
      this.velocityY = this.jumpSpeed;
      this.grounded = false;
      this.jumpBufferRemaining = 0;
      this.justJumped = true;
      this.input.setAction('jump', false);
    }

    if (this.grounded && this.velocityY < 0) {
      this.velocityY = -1.5;
    }

    this.velocityY -= this.gravity * dt;

    const desiredTranslation = {
      x: this.horizontalVelocity.x * dt,
      y: this.velocityY * dt,
      z: this.horizontalVelocity.z * dt,
    };

    const result = this.physicsWorld.moveCharacter(
      this.physicsCharacter,
      desiredTranslation
    );

    if (dt > 0) {
      const actualX = result.movement.x / dt;
      const actualZ = result.movement.z / dt;

      if (Math.abs(this.horizontalVelocity.x) > Math.abs(actualX) + 0.15) {
        this.horizontalVelocity.x = actualX;
      }
      if (Math.abs(this.horizontalVelocity.z) > Math.abs(actualZ) + 0.15) {
        this.horizontalVelocity.z = actualZ;
      }
    }

    this.grounded = result.grounded;

    if (this.grounded && this.velocityY < 0) {
      this.velocityY = -1.5;
    }

    if (!this.previousGrounded && this.grounded) {
      this.justLanded = true;
    }

    const horizontalMagnitude = this.horizontalSpeed;

    if (magnitude > 0.05 && horizontalMagnitude > 0.08) {
      const targetYaw = Math.atan2(
        -this.horizontalVelocity.x,
        -this.horizontalVelocity.z
      );

      const delta = THREE.MathUtils.euclideanModulo(
        targetYaw - this.object.rotation.y + Math.PI,
        Math.PI * 2
      ) - Math.PI;

      this.object.rotation.y += delta * (
        1 - Math.exp(-this.rotationSharpness * dt)
      );
    }

    this.state = !this.grounded
      ? (this.velocityY > 0 ? 'jump' : 'fall')
      : this.input.crouch
        ? 'crouch'
        : horizontalMagnitude < 0.08
          ? 'idle'
          : this.input.sprint
            ? 'sprint'
            : horizontalMagnitude < this.runSpeed * 0.92
              ? 'walk'
              : 'run';
  }

  getPhysicsState() {
    return {
      grounded: this.grounded,
      speed: this.horizontalSpeed,
      verticalVelocity: this.velocityY,
      horizontalAcceleration: this.horizontalAcceleration,
      state: this.state,
      justLanded: this.justLanded,
      justJumped: this.justJumped,
    };
  }
}
