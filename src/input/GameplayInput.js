import * as THREE from 'three';

export class GameplayInput {
  constructor() {
    this.move = new THREE.Vector2();
    this.look = new THREE.Vector2();
    this.actions = Object.create(null);
  }

  setMove(x, y) { this.move.set(THREE.MathUtils.clamp(x, -1, 1), THREE.MathUtils.clamp(y, -1, 1)); }
  setLook(x, y) { this.look.set(THREE.MathUtils.clamp(x, -1, 1), THREE.MathUtils.clamp(y, -1, 1)); }
  setAction(name, value) { this.actions[name] = Boolean(value); }
  pulse(name) { this.actions[name] = true; }
  consume(name) {
    const value = Boolean(this.actions[name]);
    this.actions[name] = false;
    return value;
  }

  reset() {
    this.move.set(0, 0);
    this.look.set(0, 0);
    for (const key of Object.keys(this.actions)) this.actions[key] = false;
  }

  get throttle() { return Math.max(0, this.move.y); }
  get brake() { return Math.max(0, -this.move.y); }
  get steering() { return this.move.x; }
  get sprint() { return Boolean(this.actions.sprint); }
  get crouch() { return Boolean(this.actions.crouch); }
  get jump() { return Boolean(this.actions.jump); }
  get aim() { return Boolean(this.actions.aim); }
  get handbrake() { return Boolean(this.actions.handbrake); }
}
