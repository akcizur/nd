import * as THREE from 'three';

export class VehicleController {
  constructor({ object, wheels, input, collisionTest }) {
    this.object = object; this.wheels = wheels; this.input = input; this.collisionTest = collisionTest;
    this.speed = 0; this.maxForward = 13; this.maxReverse = 6; this.acceleration = 18; this.brakePower = 25; this.drag = 3.5;
    this.steeringAngle = 0; this.steerRate = 7; this.bodyRoll = 0; this.bodyPitch = 0;
  }
  update(dt) {
    const throttle = this.input.throttle, brake = this.input.brake, steer = this.input.steering;
    if (throttle > .02) this.speed = THREE.MathUtils.moveTowards(this.speed, this.maxForward * throttle, this.acceleration * dt);
    else if (brake > .05 && this.speed > .15) this.speed = THREE.MathUtils.moveTowards(this.speed, 0, this.brakePower * dt);
    else if (brake > .05) this.speed = THREE.MathUtils.moveTowards(this.speed, -this.maxReverse * brake, this.acceleration * .65 * dt);
    else this.speed = THREE.MathUtils.damp(this.speed, 0, this.drag, dt);
    if (this.input.handbrake) this.speed = THREE.MathUtils.damp(this.speed, 0, 12, dt);
    const speedFactor = Math.min(1, Math.abs(this.speed) / this.maxForward);
    this.steeringAngle = THREE.MathUtils.damp(this.steeringAngle, steer * .58, this.steerRate, dt);
    const direction = this.speed >= 0 ? 1 : -1;
    this.object.rotation.y -= this.steeringAngle * speedFactor * dt * 2.5 * direction;
    const forward = new THREE.Vector3(0,0,-1).applyQuaternion(this.object.quaternion);
    const next = this.object.position.clone().addScaledVector(forward, this.speed * dt);
    if (!this.collisionTest(next, .92, 1.6)) this.object.position.copy(next); else this.speed *= -.15;
    for (const wheel of this.wheels) { wheel.rotation.x -= this.speed * dt * 1.8; wheel.userData.steer = this.steeringAngle; }
    this.bodyRoll = THREE.MathUtils.damp(this.bodyRoll, -this.steeringAngle * speedFactor * .06, 8, dt);
    this.bodyPitch = THREE.MathUtils.damp(this.bodyPitch, -throttle * .035, 8, dt);
  }
}
