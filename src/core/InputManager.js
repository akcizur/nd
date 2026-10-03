import { InputRouter } from '../input/InputRouter.js';

export class InputManager {
  constructor(options = {}) {
    this.router = new InputRouter(options);
    this.input = this.router.input;
  }

  update() { this.router.update(); }

  setMove(x, y) { this.router.setMove(x, y); }
  setCamera(x, y) { this.router.setLook(x, y); }
  setAction(name, value = true) { this.router.setAction(name, value); }
  pulseAction(name) { this.router.pulseAction(name); }
  consume(name) { return this.router.consume(name); }

  remap(action, codeOrCodes) { return this.router.remap(action, codeOrCodes); }
  setControlSettings(settings) { return this.router.setSettings(settings); }
  resetControlSettings() { return this.router.resetSettings(); }

  get controlSettings() {
    return { ...this.router.settings };
  }

  get bindings() {
    return structuredClone(this.router.bindings);
  }

  get move() { return this.input.move.clone(); }
  get cameraInput() { return this.input.look.clone(); }
  get run() { return this.input.sprint; }
  get handbrake() { return this.input.handbrake; }
  get enabled() { return this.router.enabled; }
  set enabled(value) { this.router.enabled = Boolean(value); }
}
