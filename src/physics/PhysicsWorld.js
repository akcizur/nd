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
    this.maxSubsteps = 4;
    this.characterController = world.createCharacterController(0.02);
    this.characterController.setUp({ x: 0, y: 1, z: 0 });
    this.characterController.setMaxSlopeClimbAngle(Math.PI * 0.43);
    this.characterController.setMinSlopeSlideAngle(Math.PI * 0.48);
    this.characterController.enableAutostep(0.35, 0.18, false);
    this.characterController.enableSnapToGround(0.15);
    this.characterController.setApplyImpulsesToDynamicBodies(true);
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
        .setDensity(650)
        .setFriction(1.1)
        .setRestitution(0.05),
      body
    );
    return { body, collider, bodyOffsetY: 0.65 };
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
      this.world.step();
      this.accumulator -= this.fixedDt;
      steps += 1;
    }
    return steps;
  }
}
