const THREEClamp = value => Math.max(-1, Math.min(1, Number(value) || 0));
const quatForward = q => ({
  x: -2 * (q.x * q.z + q.w * q.y),
  y: 0,
  z: -(1 - 2 * (q.x * q.x + q.y * q.y)),
});

const rotateLocal = (q, v) => {
  const ix = q.w * v.x + q.y * v.z - q.z * v.y;
  const iy = q.w * v.y + q.z * v.x - q.x * v.z;
  const iz = q.w * v.z + q.x * v.y - q.y * v.x;
  const iw = -q.x * v.x - q.y * v.y - q.z * v.z;
  return {
    x: ix * q.w + iw * -q.x + iy * -q.z - iz * -q.y,
    y: iy * q.w + iw * -q.y + iz * -q.x - ix * -q.z,
    z: iz * q.w + iw * -q.z + ix * -q.y - iy * -q.x,
  };
};

import RAPIER from '@dimforge/rapier3d-compat';

export class PhysicsWorld {
  static async create() {
    await RAPIER.init();
    return new PhysicsWorld(new RAPIER.World({ x: 0, y: -9.81, z: 0 }));
  }

  constructor(world) {
    this.world = world;
    this.staticBodies = [];
    this.fixedDt = 1 / 60;
    this.accumulator = 0;
    this.maxSubsteps = 8;
    this.stepCount = 0;
    this.lastSteps = 0;
    this.characterController = world.createCharacterController(0.02);
    this.characterController.setUp({ x: 0, y: 1, z: 0 });
    this.characterController.setMaxSlopeClimbAngle(Math.PI * 0.43);
    this.characterController.setMinSlopeSlideAngle(Math.PI * 0.48);
    this.characterController.enableAutostep(0.35, 0.18, false);
    this.characterController.enableSnapToGround(0.15);
    this.characterController.setApplyImpulsesToDynamicBodies(true);
    this.vehicleSolvers = new Set();
  }

  addStaticBox(x, y, z, w, h, d) {
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z)
    );
    const collider = this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(w / 2, h / 2, d / 2),
      body
    );
    this.staticBodies.push(body);
    return { body, collider };
  }

  addGround(size = 320) {
    return this.addStaticBox(0, -0.06, 0, size, 0.1, size);
  }

  createCharacter(object) {
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
        object.position.x,
        object.position.y + 0.95,
        object.position.z
      )
    );
    const collider = this.world.createCollider(
      RAPIER.ColliderDesc.capsule(0.55, 0.38)
        .setFriction(0.0)
        .setRestitution(0.0),
      body
    );
    return { body, collider, footOffset: 0.95 };
  }

  moveCharacter(character, desiredTranslation) {
    if (!character) return { movement: { x: 0, y: 0, z: 0 }, grounded: true };
    const current = character.body.translation();
    this.characterController.computeColliderMovement(character.collider, desiredTranslation);
    const corrected = this.characterController.computedMovement();
    character.body.setNextKinematicTranslation({
      x: current.x + corrected.x,
      y: current.y + corrected.y,
      z: current.z + corrected.z,
    });
    return {
      movement: { x: corrected.x, y: corrected.y, z: corrected.z },
      grounded: this.characterController.computedGrounded(),
    };
  }

  createVehicle(object) {
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(object.position.x, object.position.y + 0.65, object.position.z)
        .setGravityScale(1)
        .setLinearDamping(0.55)
        .setAngularDamping(3.2)
        .setCcdEnabled(true)
        .setCanSleep(false)
    );
    const collider = this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(0.92, 0.65, 1.82)
        .setDensity(160)
        .setFriction(1.1)
        .setRestitution(0.05),
      body
    );
    return { body, collider, bodyOffsetY: 0.65 };
  }

  createVehicleDynamics(vehicle, options = {}) {
    const dynamics = {
      maxForward: options.maxForward ?? 13,
      maxReverse: options.maxReverse ?? 6,
      engineForce: options.engineForce ?? 9000,
      brakeForce: options.brakeForce ?? 12000,
      handbrakeForce: options.handbrakeForce ?? 7000,
      lateralGrip: options.lateralGrip ?? 8.5,
      rollingResistance: options.rollingResistance ?? 1.2,
      airResistance: options.airResistance ?? 0.018,
      steeringMax: options.steeringMax ?? 0.58,
      wheelBase: options.wheelBase ?? 2.35,
      trackWidth: options.trackWidth ?? 1.55,
      wheelRadius: options.wheelRadius ?? 0.34,
      suspensionRest: options.suspensionRest ?? 0.42,
      suspensionTravel: options.suspensionTravel ?? 0.22,
      spring: options.spring ?? 18000,
      damper: options.damper ?? 2400,
      mass: options.mass ?? 1400,
      wheels: options.wheels ?? [],
      steer: 0,
      throttle: 0,
      brake: 0,
      handbrake: false,
      grounded: 0,
      suspension: [],
    };
    dynamics.suspension = dynamics.wheels.map(() => ({ compression: 0, contact: false, normal: { x: 0, y: 1, z: 0 } }));
    vehicle.dynamics = dynamics;
    this.vehicleSolvers.add(vehicle);
    return dynamics;
  }

  setVehicleInput(vehicle, input) {
    if (!vehicle?.dynamics) return;
    Object.assign(vehicle.dynamics, {
      throttle: THREEClamp(input.throttle),
      brake: THREEClamp(input.brake),
      steer: THREEClamp(input.steer),
      handbrake: Boolean(input.handbrake),
    });
  }

  solveVehicle(vehicle, dt) {
    const d = vehicle?.dynamics;
    if (!d) return;

    const body = vehicle.body;
    const p = body.translation();
    const r = body.rotation();
    const velocity = body.linvel();
    const angular = body.angvel();
    const mass = d.mass;
    let contacts = 0;

    for (let i = 0; i < d.wheels.length; i++) {
      const wheel = d.wheels[i];
      const local = wheel.local ?? { x: 0, y: -0.45, z: 0 };
      const offset = rotateLocal(r, local);
      const worldPos = {
        x: p.x + offset.x,
        y: p.y + offset.y,
        z: p.z + offset.z,
      };

      const ray = this.world.castRay(
        new RAPIER.Ray(worldPos, { x: 0, y: -1, z: 0 }),
        d.suspensionRest + d.suspensionTravel,
        true,
        undefined,
        undefined,
        vehicle.collider
      );

      const state = d.suspension[i];
      if (!ray) {
        state.compression = 0;
        state.contact = false;
        continue;
      }

      const hit = ray.toi;
      const compression = Math.max(
        0,
        Math.min(1, (d.suspensionRest - hit) / Math.max(d.suspensionTravel, 0.01))
      );
      state.compression = compression;
      state.contact = true;
      contacts++;

      const pointVelocity = {
        x: velocity.x + angular.y * offset.z - angular.z * offset.y,
        y: velocity.y + angular.z * offset.x - angular.x * offset.z,
        z: velocity.z + angular.x * offset.y - angular.y * offset.x,
      };

      const suspensionVelocity = pointVelocity.y;
      const springForce = d.spring * compression;
      const damperForce = -d.damper * suspensionVelocity;
      const suspensionForce = Math.max(0, springForce + damperForce);
      body.applyImpulseAtPoint(
        { x: 0, y: suspensionForce * dt, z: 0 },
        worldPos,
        true
      );

      const isFront = local.z < 0;
      const steerAngle = isFront ? d.steer * d.steeringMax : 0;
      const wheelForwardLocal = {
        x: Math.sin(steerAngle),
        y: 0,
        z: -Math.cos(steerAngle),
      };
      const wheelRightLocal = {
        x: Math.cos(steerAngle),
        y: 0,
        z: Math.sin(steerAngle),
      };
      const wheelForward = rotateLocal(r, wheelForwardLocal);
      const wheelRight = rotateLocal(r, wheelRightLocal);

      const longSpeed =
        pointVelocity.x * wheelForward.x +
        pointVelocity.z * wheelForward.z;
      const lateralSpeed =
        pointVelocity.x * wheelRight.x +
        pointVelocity.z * wheelRight.z;

      const wheelCount = Math.max(1, d.wheels.length);
      let longitudinalForce = d.throttle * d.engineForce / wheelCount;
      if (d.brake > 0) {
        longitudinalForce -= Math.sign(longSpeed || 1) * d.brake * d.brakeForce / wheelCount;
      }
      if (d.handbrake && !isFront) {
        longitudinalForce -= Math.sign(longSpeed || 1) * d.handbrakeForce / wheelCount;
      }

      const lateralForce = -lateralSpeed * d.lateralGrip * mass / wheelCount;
      const tireImpulse = {
        x: (wheelForward.x * longitudinalForce + wheelRight.x * lateralForce) * dt,
        y: 0,
        z: (wheelForward.z * longitudinalForce + wheelRight.z * lateralForce) * dt,
      };

      body.applyImpulseAtPoint(tireImpulse, worldPos, true);
    }

    d.grounded = contacts;

    const planarSpeed = Math.hypot(velocity.x, velocity.z);
    if (planarSpeed > 0.01) {
      const resistance = d.rollingResistance * planarSpeed +
        d.airResistance * planarSpeed * planarSpeed;
      const dragImpulse = {
        x: -velocity.x / planarSpeed * resistance * dt,
        y: 0,
        z: -velocity.z / planarSpeed * resistance * dt,
      };
      body.applyImpulse(dragImpulse, true);
    }

    if (contacts > 0) {
      const forward = quatForward(r);
      const forwardSpeed = velocity.x * forward.x + velocity.z * forward.z;
      const steerAngle = d.steer * d.steeringMax;
      const yawRate = Math.tan(steerAngle) * forwardSpeed / Math.max(d.wheelBase, 0.1);
      body.setAngvel({
        x: angular.x * 0.55,
        y: yawRate * 0.85,
        z: angular.z * 0.55,
      }, true);
    }
  }

  setVehicleState(vehicle, { velocity, yaw, dt }) {
    if (!vehicle) return;
    const rotation = vehicle.body.rotation();
    const currentYaw = Math.atan2(2 * (rotation.w * rotation.y), 1 - 2 * (rotation.y * rotation.y));
    const delta = Math.atan2(Math.sin(yaw - currentYaw), Math.cos(yaw - currentYaw));
    vehicle.body.setLinvel(
      { x: velocity.x, y: vehicle.body.linvel().y, z: velocity.z },
      true
    );
    vehicle.body.setAngvel({ x: 0, y: delta / Math.max(dt, 1e-4), z: 0 }, true);
  }

  syncObject(object, physicsObject) {
    if (!object || !physicsObject) return;
    const p = physicsObject.body.translation();
    object.position.set(
      p.x,
      p.y - (physicsObject.footOffset ?? physicsObject.bodyOffsetY ?? 0),
      p.z
    );
    if (physicsObject.bodyOffsetY != null) {
      const r = physicsObject.body.rotation();
      object.quaternion.set(r.x, r.y, r.z, r.w);
    }
  }

  resetObject(object, physicsObject, position, yaw = 0) {
    if (!physicsObject) return;
    const y = position.y + (physicsObject.footOffset ?? physicsObject.bodyOffsetY ?? 0);
    physicsObject.body.setTranslation({ x: position.x, y, z: position.z }, true);
    if (physicsObject.bodyOffsetY != null) {
      const half = yaw * 0.5;
      physicsObject.body.setRotation(
        { x: 0, y: Math.sin(half), z: 0, w: Math.cos(half) },
        true
      );
      physicsObject.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      physicsObject.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    }
    this.syncObject(object, physicsObject);
  }

  setCharacterEnabled(character, enabled) {
    character?.body.setEnabled(enabled);
  }

  step(frameDt, beforeStep = null) {
    this.accumulator += Math.min(frameDt, 0.1);
    let steps = 0;
    while (this.accumulator >= this.fixedDt && steps < this.maxSubsteps) {
      beforeStep?.(this.fixedDt);
      for (const vehicle of this.vehicleSolvers) this.solveVehicle(vehicle, this.fixedDt);
      this.world.step();
      this.accumulator -= this.fixedDt;
      this.stepCount += 1;
      steps += 1;
    }
    if (this.accumulator >= this.fixedDt) this.accumulator = 0;
    this.lastSteps = steps;
    return steps;
  }
}
