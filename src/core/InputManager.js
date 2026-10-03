import * as THREE from 'three';

export class InputManager {
  constructor() {
    this.keys = Object.create(null);
    this.touch = { move: new THREE.Vector2(), camera: new THREE.Vector2(), interact: false, handbrake: false, pause: false };
    this.enabled = true;
    this._bindKeyboard();
  }

  _bindKeyboard() {
    addEventListener('keydown', event => {
      this.keys[event.code] = true;
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(event.code)) event.preventDefault();
      if (event.code === 'Escape' && !event.repeat) this.touch.pause = true;
      if (event.code === 'KeyE' && !event.repeat) this.touch.interact = true;
      if (event.code === 'Space' && !event.repeat) this.touch.handbrake = true;
    });
    addEventListener('keyup', event => {
      this.keys[event.code] = false;
      if (event.code === 'Space') this.touch.handbrake = false;
    });
  }

  setMove(x, y) {
    this.touch.move.set(x, y);
  }

  setCamera(x, y) {
    this.touch.camera.set(x, y);
  }

  setAction(name, value = true) {
    this.touch[name] = value;
  }

  consume(name) {
    const value = Boolean(this.touch[name]);
    this.touch[name] = false;
    return value;
  }

  get move() {
    const x = (this.keys.KeyD || this.keys.ArrowRight ? 1 : 0) - (this.keys.KeyA || this.keys.ArrowLeft ? 1 : 0);
    const y = (this.keys.KeyW || this.keys.ArrowUp ? 1 : 0) - (this.keys.KeyS || this.keys.ArrowDown ? 1 : 0);
    const result = new THREE.Vector2(x + this.touch.move.x, y + this.touch.move.y);
    if (result.lengthSq() > 1) result.normalize();
    return result;
  }

  get cameraInput() {
    return this.touch.camera.clone();
  }

  get run() {
    return Boolean(this.keys.ShiftLeft || this.keys.ShiftRight);
  }

  get handbrake() {
    return Boolean(this.keys.Space || this.touch.handbrake);
  }
}
