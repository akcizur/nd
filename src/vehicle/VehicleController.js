import * as THREE from 'three';

export class VehicleController {
  constructor({ object, wheels, input, physics = null }) {
    this.object = object;
    this.wheels = wheels;
    this.input = input;
    this.physics = physics;
    this.physicsBody = null;
    this.speed = 0;
    this.maxForward = 13;
    this.maxReverse = 6;
    this.acceleration = 18;
    this.brakePower = 28;
    this.drag = 3.5;
    this.steeringAngle = 0;
    this.steerRate = 7;
    this.bodyRoll = 0;
    this.bodyPitch = 0;
    this.yaw = object.rotation.y;
  }

  bindPhysics(body) {
    this.physicsBody = body;
    this.physics?.syncObject(this.object, body);
  }

  update(dt) {
    if (!this.physicsBody || !this.physics) return;
    const throttle = this.input.throttle;
    const brake = this.input.brake;
    const steer = this.input.steering;
    const currentVelocity = this.physicsBody.linvel();
    const currentForward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.object.quaternion);
    this.speed = currentVelocity.x * currentForward.x + currentVelocity.z * currentForward.z;

    if (throttle > 0.02) {
      this.speed = THREE.MathUtils.moveTowards(this.speed, this.maxForward * throttle, this.acceleration * dt);
    } else if (brake > 0.05 && this.speed > 0.15) {
      this.speed = THREE.MathUtils.moveTowards(this.speed, 0, this.brakePower * dt);
    } else if (brake > 0.05) {
      this.speed = THREE.MathUtils.moveTowards(this.speed, -this.maxReverse * brake, this.acceleration * 0.65 * dt);
    } else {
      this.speed = THREE.MathUtils.damp(this.speed, 0, this.drag, dt);
    }

    if (this.input.handbrake) {
      this.speed = THREE.MathUtils.damp(this.speed, 0, 14, dt);
    }

    const speedFactor = Math.min(1, Math.abs(this.speed) / this.maxForward);
    this.steeringAngle = THREE.MathUtils.damp(this.steeringAngle, steer * 0.58, this.steerRate, dt);
    const direction = this.speed >= 0 ? 1 : -1;
    const yawRate = this.steeringAngle * speedFactor * 2.5 * direction;
    this.yaw -= yawRate * dt;
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    const velocity = forward.multiplyScalar(this.speed);

    this.physics.setVehicleState(this.physicsBody, { velocity, yaw: this.yaw });
    if (Math.abs(this.speed) < 0.03) this.speed = 0;

    for (const wheel of this.wheels) {
      wheel.userData.lastSpin = (wheel.userData.lastSpin ?? wheel.rotation.x) - this.speed * dt * 1.8;
      wheel.userData.steer = this.steeringAngle;
    }

    this.bodyRoll = THREE.MathUtils.damp(this.bodyRoll, -this.steeringAngle * speedFactor * 0.06, 8, dt);
    this.bodyPitch = THREE.MathUtils.damp(this.bodyPitch, -throttle * 0.035, 8, dt);
  }

  syncFromPhysics() {
    if (!this.physicsBody) return;
    const velocity = this.physicsBody.linvel();
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.object.quaternion);
    const signedSpeed = velocity.x * forward.x + velocity.z * forward.z;
    this.speed = Math.abs(signedSpeed) < 0.03 ? 0 : signedSpeed;
    this.physics?.syncObject(this.object, this.physicsBody);
    this.yaw = this.object.rotation.y;
    for (const wheel of this.wheels) {
      wheel.rotation.x = wheel.userData.lastSpin ?? wheel.rotation.x;
      wheel.rotation.y = wheel.userData.steer ?? 0;
    }
  }
}
