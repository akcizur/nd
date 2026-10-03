import * as THREE from 'three';

/**
 * Mavon gameplay bridge.
 *
 * The renderer remains Three.js-first, while gameplay state is kept in a
 * small engine-shaped layer so MavonEngine/Rapier can replace the adapters
 * without changing the player/vehicle UI contract.
 */
export const ActorState = Object.freeze({
  ON_FOOT: 'on-foot',
  IN_VEHICLE: 'in-vehicle',
});

export class GameplayActor {
  constructor(object3d) {
    this.object3d = object3d;
    this.state = ActorState.ON_FOOT;
    this.velocity = new THREE.Vector3();
    this.input = { x: 0, z: 0 };
  }

  setState(state) {
    this.state = state;
  }

  setInput(x, z) {
    this.input.x = x;
    this.input.z = z;
  }

  clearMotion() {
    this.velocity.set(0, 0, 0);
  }
}

export class GameplayVehicle extends GameplayActor {
  constructor(object3d) {
    super(object3d);
    this.maxSpeed = 13;
    this.speed = 0;
    this.steering = 0;
  }
}

/**
 * Adapter seam for MavonEngine.
 * Later this can own Entity/StateMachine/Rapier bodies directly.
 */
export class MavonGameplayBridge {
  constructor({ player, vehicle }) {
    this.player = new GameplayActor(player);
    this.vehicle = new GameplayVehicle(vehicle);
    this.active = this.player;
  }

  enterVehicle() {
    this.active = this.vehicle;
    this.player.setState(ActorState.IN_VEHICLE);
    this.vehicle.setState(ActorState.IN_VEHICLE);
  }

  exitVehicle(position) {
    this.vehicle.clearMotion();
    this.active = this.player;
    this.player.object3d.position.copy(position);
    this.player.setState(ActorState.ON_FOOT);
    this.vehicle.setState(ActorState.ON_FOOT);
  }

  get state() {
    return this.active.state;
  }
}
