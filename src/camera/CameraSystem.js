import * as THREE from 'three';

export class CameraSystem {
  constructor(camera) {
    this.camera = camera;

    // Third-person orbit state.
    // yaw = horizontal orbit around the player, pitch = vertical orbit.
    this.yaw = 0;
    this.pitch = 0.28;

    this.sensitivityX = 1.8;
    this.sensitivityY = 1.6;
    this.invertX = false;
    this.invertY = false;
    this.fovBase = 60;

    this.distance = 5.8;
    this.height = 2.45;
    this.targetHeight = 1.1;

    this.positionSharpness = 14;
    this.rotationFollowSharpness = 5.5;
    this.pitchMin = -0.18;
    this.pitchMax = 0.82;

    this.autoFollow = true;
    this.autoFollowDelay = 0.18;
    this.autoFollowTimer = 0;
  }

  update(dt, {
    subject,
    vehicle = false,
    input,
    speed = 0,
    collisionTest,
  }) {
    if (!subject) return;

    const look = input?.look ?? { x: 0, y: 0 };
    const hasManualLook = look.x * look.x + look.y * look.y > 0.0005;

    if (hasManualLook) {
      const factor = input?.lookSource === 'mouse' ? 1 : dt * 2.8;
      this.yaw -= look.x * this.sensitivityX * factor * (this.invertX ? -1 : 1);
      this.pitch += look.y * this.sensitivityY * factor * (this.invertY ? -1 : 1);
      this.pitch = THREE.MathUtils.clamp(this.pitch, this.pitchMin, this.pitchMax);
      this.autoFollowTimer = 0;
    } else {
      this.autoFollowTimer += dt;

      // Do not constantly snap the camera behind the character.
      // Only gently recover behind the actor after a short delay.
      if (
        this.autoFollow &&
        input?.move?.lengthSq() > 0.01 &&
        this.autoFollowTimer > this.autoFollowDelay
      ) {
        const targetYaw = subject.rotation.y;
        const delta = THREE.MathUtils.euclideanModulo(
          targetYaw - this.yaw + Math.PI,
          Math.PI * 2
        ) - Math.PI;

        this.yaw += delta * (1 - Math.exp(-this.rotationFollowSharpness * dt));
      }
    }

    const distance = vehicle ? 8.2 : this.distance;
    const height = vehicle ? 3.1 : this.height;
    const targetHeight = vehicle ? 1.0 : this.targetHeight;

    const horizontal = Math.cos(this.pitch) * distance;

    // Camera sits behind the subject relative to orbit yaw.
    const desired = new THREE.Vector3(
      subject.position.x + Math.sin(this.yaw) * horizontal,
      subject.position.y + height + Math.sin(this.pitch) * distance,
      subject.position.z + Math.cos(this.yaw) * horizontal
    );

    const safe = this._avoidCollision(
      subject.position.clone().add(new THREE.Vector3(0, targetHeight, 0)),
      desired,
      collisionTest
    );

    this.camera.position.lerp(
      safe,
      1 - Math.exp(-this.positionSharpness * dt)
    );

    const target = subject.position.clone();
    target.y += targetHeight;

    this.camera.lookAt(target);

    this.camera.fov = THREE.MathUtils.damp(
      this.camera.fov,
      this.fovBase + Math.min(12, Math.abs(speed) * 0.65),
      6,
      dt
    );
    this.camera.updateProjectionMatrix();
  }

  _avoidCollision(origin, desired, collisionTest) {
    const direction = desired.clone().sub(origin);
    const length = direction.length();

    if (!length || typeof collisionTest !== 'function') return desired;

    direction.normalize();

    let safe = desired.clone();

    // Move the camera toward the player when a wall/building blocks the orbit.
    for (let i = 1, n = Math.max(6, Math.ceil(length / 0.35)); i <= n; i++) {
      const p = origin.clone().addScaledVector(direction, (length * i) / n);

      if (collisionTest(p, 0.28, 0.8)) {
        const safeDistance = Math.max(1.05, (length * (i - 1)) / n);
        safe = origin.clone().addScaledVector(direction, safeDistance);
        break;
      }
    }

    return safe;
  }

  lookBehind(subject = null) {
    if (subject) this.yaw = subject.rotation.y;
    else this.yaw += Math.PI;

    this.autoFollowTimer = 0;
  }

  reset(subject = null) {
    this.yaw = subject?.rotation?.y ?? 0;
    this.pitch = 0.28;
    this.autoFollowTimer = 0;
  }
}
