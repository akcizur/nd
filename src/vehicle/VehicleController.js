import * as THREE from 'three';

export class VehicleController {
  constructor({ object, wheels = [], input, physics = null }) {
    this.object = object;
    this.wheels = wheels;
    this.input = input;
    this.physics = physics;
    this.physicsBody = null;
    this.dynamics = null;
    this.speed = 0;
    this.maxForward = 13;
    this.maxReverse = 6;
    this.steeringAngle = 0;
    this.steerRate = 7;
    this.bodyRoll = 0;
    this.bodyPitch = 0;
    this.yaw = object.rotation.y;
  }

  bindPhysics(body) {
    this.physicsBody = body;
    this.dynamics = this.physics?.createVehicleDynamics(body, {
      maxForward: this.maxForward,
      maxReverse: this.maxReverse,
      wheels: this.wheels.map(wheel => {
        const p = wheel.position;
        return { object: wheel, local: { x: p.x, y: p.y - 0.35, z: p.z } };
      }),
    });
    this.physics?.syncObject(this.object, body);
  }

  update(dt) {
    if (!this.physicsBody || !this.physics || !this.dynamics) return;

    const throttle = Math.max(0, this.input.move.y);
    const brake = Math.max(0, -this.input.move.y);
    const steer = THREE.MathUtils.clamp(this.input.move.x, -1, 1);

    this.physics.setVehicleInput(this.physicsBody, {
      throttle,
      brake,
      steer,
      handbrake: this.input.handbrake,
    });

    const velocity = this.physicsBody.linvel();
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.object.quaternion);
    this.speed = velocity.x * forward.x + velocity.z * forward.z;

    this.steeringAngle = THREE.MathUtils.damp(
      this.steeringAngle,
      steer * this.dynamics.steeringMax,
      this.steerRate,
      dt
    );

    const speedFactor = Math.min(1, Math.abs(this.speed) / this.maxForward);
    this.bodyRoll = THREE.MathUtils.damp(
      this.bodyRoll,
      -this.steeringAngle * speedFactor * 0.08,
      8,
      dt
    );
    this.bodyPitch = THREE.MathUtils.damp(
      this.bodyPitch,
      -throttle * 0.04 + brake * 0.05,
      8,
      dt
    );
  }

  syncFromPhysics() {
    if (!this.physicsBody) return;
    const velocity = this.physicsBody.linvel();
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.object.quaternion);
    const signedSpeed = velocity.x * forward.x + velocity.z * forward.z;
    this.speed = Math.abs(signedSpeed) < 0.03 ? 0 : signedSpeed;
    this.physics?.syncObject(this.object, this.physicsBody);
    this.yaw = this.object.rotation.y;

    for (let i = 0; i < this.wheels.length; i++) {
      const wheel = this.wheels[i];
      const state = this.dynamics?.suspension[i];
      if (!state) continue;
      wheel.userData.suspension = state.compression;
      wheel.userData.steer = (i < 2 ? this.steeringAngle : 0);
      wheel.userData.lastSpin = (wheel.userData.lastSpin ?? wheel.rotation.x)
        - this.speed * (1 / 60) / 0.34;

      wheel.rotation.x = wheel.userData.lastSpin;
      wheel.rotation.y = wheel.userData.steer;
      wheel.position.y = wheel.userData.baseY ?? (wheel.userData.baseY = wheel.position.y);
      wheel.position.y -= state.compression * 0.22;
    }
  }
}
