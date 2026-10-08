import * as THREE from 'three';

export class VehicleController {
  constructor({ object, wheels = [], input, physics }) {
    this.object = object;
    this.wheels = wheels;
    this.input = input;
    this.physics = physics;
    this.physicsBody = null;
    this.dynamics = null;
    this.speed = 0;
    this.steeringAngle = 0;
  }

  bindPhysics(body) {
    this.physicsBody = body;
    this.dynamics = this.physics.createVehicleDynamics(body, {
      maxForward: 14,
      maxReverse: 6,
      engineForce: 10500,
      brakeForce: 14500,
      handbrakeForce: 8500,
      lateralGrip: 9.2,
      wheels: this.wheels.map(wheel => ({
        object: wheel,
        local: { x: wheel.position.x, y: wheel.position.y - 0.35, z: wheel.position.z },
      })),
    });
    this.physics.syncObject(this.object, body);
  }

  update(dt) {
    if (!this.physicsBody || !this.dynamics) return;

    const throttle = THREE.MathUtils.clamp(this.input.move.y, -1, 1);
    const steer = THREE.MathUtils.clamp(this.input.move.x, -1, 1);
    const velocity = this.physicsBody.body.linvel();
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.object.quaternion);
    const signedSpeed = velocity.x * forward.x + velocity.z * forward.z;

    const braking = Math.abs(signedSpeed) > 0.6 && throttle * signedSpeed < -0.15;

    this.physics.setVehicleInput(this.physicsBody, {
      throttle: braking ? 0 : throttle,
      brake: braking ? Math.abs(throttle) : 0,
      steer,
      handbrake: Boolean(this.input.handbrake),
    });

    this.steeringAngle = THREE.MathUtils.damp(
      this.steeringAngle,
      steer * this.dynamics.steeringMax,
      9,
      dt
    );
    this.speed = Math.abs(signedSpeed) < 0.03 ? 0 : signedSpeed;

    const vehicleState = this.object.userData.vehicle;
    if (vehicleState?.brakeLights) {
      const intensity = braking || this.input.handbrake ? 1.2 : 0;
      for (const lamp of vehicleState.brakeLights) lamp.material.emissiveIntensity = intensity;
    }

    if (vehicleState?.wheels) {
      for (let i = 0; i < vehicleState.wheels.length; i++) {
        const wheel = vehicleState.wheels[i];
        const suspension = this.dynamics.suspension[i];
        if (suspension) wheel.position.y = wheel.userData.baseY - suspension.compression * 0.20;
        wheel.rotation.y = i < 2 ? -this.steeringAngle : 0;
        wheel.rotation.x -= this.speed * dt / 0.32;
      }
    }
  }

  syncFromPhysics() {
    if (!this.physicsBody) return;

    this.physics.syncObject(this.object, this.physicsBody);
    const velocity = this.physicsBody.body.linvel();
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.object.quaternion);
    this.speed = velocity.x * forward.x + velocity.z * forward.z;
  }

  getExitPosition() {
    const side = new THREE.Vector3(1.55, 0, 0).applyQuaternion(this.object.quaternion);
    return this.object.position.clone().add(side);
  }

  reset(position, yaw = 0) {
    const body = this.physicsBody?.body;
    if (!body) return;

    const half = yaw * 0.5;
    body.setTranslation({
      x: position.x,
      y: position.y + (this.physicsBody.bodyOffsetY ?? 0.65),
      z: position.z,
    }, true);
    body.setRotation({
      x: 0, y: Math.sin(half), z: 0, w: Math.cos(half)
    }, true);
    body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    this.physics.syncObject(this.object, this.physicsBody);
    this.speed = 0;
  }

  isNearby(position, distance = 4.5) {
    return this.object.position.distanceTo(position) < distance;
  }
}
