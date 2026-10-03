import { GameplayInput } from './GameplayInput.js';

const DEFAULT_BINDINGS = {
  moveForward: ['KeyW', 'ArrowUp'],
  moveBackward: ['KeyS', 'ArrowDown'],
  moveLeft: ['KeyA', 'ArrowLeft'],
  moveRight: ['KeyD', 'ArrowRight'],
  sprint: ['ShiftLeft', 'ShiftRight'],
  jump: ['Space'],
  crouch: ['KeyC'],
  aim: ['Mouse2'],
  interact: ['KeyE'],
  handbrake: ['Space'],
  pause: ['Escape'],
  lookLeft: ['KeyQ'],
  lookRight: ['KeyE'],
};

export class InputRouter {
  constructor({ bindings = DEFAULT_BINDINGS } = {}) {
    this.input = new GameplayInput();
    this.bindings = structuredClone(bindings);
    this.keys = Object.create(null);
    this.gamepad = null;
    this.touchMove = { x: 0, y: 0 };
    this.touchLook = { x: 0, y: 0 };
    this.enabled = true;
    this.mouseLook = false;
    this._bindKeyboard();
    this._bindGamepad();
  }

  _bindKeyboard() {
    addEventListener('keydown', event => {
      this.keys[event.code] = true;
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(event.code)) event.preventDefault();
      if (event.repeat) return;
      if (this._has('pause', event.code)) this.input.pulse('pause');
      if (this._has('interact', event.code)) this.input.pulse('interact');
      if (this._has('jump', event.code)) this.input.pulse('jump');
    });
    addEventListener('keyup', event => { this.keys[event.code] = false; });
    addEventListener('mousedown', event => {
      if (event.button === 2) this.mouseLook = true;
    });
    addEventListener('mouseup', event => {
      if (event.button === 2) this.mouseLook = false;
    });
    addEventListener('contextmenu', event => event.preventDefault());
  }

  _bindGamepad() {
    addEventListener('gamepadconnected', event => { this.gamepad = event.gamepad; });
    addEventListener('gamepaddisconnected', event => {
      if (this.gamepad?.index === event.gamepad.index) this.gamepad = null;
    });
  }

  _has(action, code) { return (this.bindings[action] || []).includes(code); }

  remap(action, codes) {
    this.bindings[action] = Array.isArray(codes) ? [...codes] : [codes];
  }

  setMove(x, y) { this.touchMove.x=x; this.touchMove.y=y; }
  setLook(x, y) { this.touchLook.x=x; this.touchLook.y=y; }
  setAction(name, value = true) { this.input.setAction(name, value); }
  consume(name) { return this.input.consume(name); }

  update() {
    if (!this.enabled) { this.input.reset(); return; }

    const x = (this._down('moveRight') ? 1 : 0) - (this._down('moveLeft') ? 1 : 0);
    const y = (this._down('moveForward') ? 1 : 0) - (this._down('moveBackward') ? 1 : 0);
    const pad = navigator.getGamepads?.()[this.gamepad?.index ?? -1];
    let moveX = x, moveY = y, lookX = 0, lookY = 0;
    if (Math.abs(this.touchMove.x) > 0.001 || Math.abs(this.touchMove.y) > 0.001) { moveX=this.touchMove.x; moveY=this.touchMove.y; }
    lookX=this.touchLook.x; lookY=this.touchLook.y;

    if (pad) {
      moveX = Math.abs(pad.axes[0] ?? 0) > 0.12 ? pad.axes[0] : moveX;
      moveY = Math.abs(pad.axes[1] ?? 0) > 0.12 ? -(pad.axes[1] ?? 0) : moveY;
      if (Math.abs(pad.axes[2] ?? 0) > 0.12) lookX=pad.axes[2];
      if (Math.abs(pad.axes[3] ?? 0) > 0.12) lookY=pad.axes[3];
      if (pad.buttons[0]?.pressed) this.input.setAction('jump', true);
      this.input.setAction('sprint', Boolean(pad.buttons[10]?.pressed));
      this.input.setAction('crouch', Boolean(pad.buttons[1]?.pressed));
      this.input.setAction('aim', Boolean(pad.buttons[6]?.pressed));
      this.input.setAction('handbrake', Boolean(pad.buttons[7]?.pressed));
      if (pad.buttons[2]?.pressed) this.input.pulse('interact');
      if (pad.buttons[9]?.pressed) this.input.pulse('pause');
    }

    this.input.setMove(Math.max(-1, Math.min(1, moveX)), Math.max(-1, Math.min(1, moveY)));
    this.input.setLook(lookX, lookY);
    this.input.setAction('sprint', this._down('sprint') || this.input.actions.sprint);
    this.input.setAction('crouch', this._down('crouch') || this.input.actions.crouch);
    this.input.setAction('aim', this.mouseLook || this.input.actions.aim);
    this.input.setAction('handbrake', this._down('handbrake') || this.input.actions.handbrake);
  }

  _down(action) {
    return (this.bindings[action] || []).some(code => Boolean(this.keys[code]));
  }
}
