import { InputRouter } from '../input/InputRouter.js';

export class InputManager {
  constructor(options = {}) {
    this.router = new InputRouter(options);
    this.input = this.router.input;
  }

  update() {
    this.router.update();
  }

  setMove(x, y) {
    this.router.setTouchMove(x, y);
  }

  setCamera(x, y) {
    this.router.setTouchLook(x, y);
  }

  setAction(name, value = true) {
    this.input.setAction(name, value);
  }

  consume(name) {
    return this.input.consume(name);
  }

  remap(action, codeOrCodes) {
    return this.router.remap(action, codeOrCodes);
  }

  get move() {
    return this.input.move.clone();
  }

  get cameraInput() {
    return this.input.look.clone();
  }

  get run() {
    return this.input.sprint;
  }

  get handbrake() {
    return this.input.handbrake;
  }

  get enabled() {
    return this.router.enabled;
  }

  set enabled(value) {
    this.router.enabled = Boolean(value);
  }
}
