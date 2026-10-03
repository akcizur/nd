import { GameplayInput } from './GameplayInput.js';
import {
  DEFAULT_BINDINGS,
  loadControlSettings,
  saveControlSettings,
} from './ControlConfig.js';

export class InputRouter {
  constructor({ bindings = null, settings = null } = {}) {
    const saved = loadControlSettings();

    this.input = new GameplayInput();
    this.bindings = structuredClone(bindings || saved.bindings || DEFAULT_BINDINGS);
    this.settings = {
      sprintMode: saved.sprintMode,
      cameraRelativeMovement: saved.cameraRelativeMovement,
      touchDeadzone: saved.touchDeadzone,
      ...(settings || {}),
    };

    this.keys = Object.create(null);
    this.mouseButtons = Object.create(null);
    this.gamepad = null;
    this.touchMove = { x: 0, y: 0 };
    this.touchLook = { x: 0, y: 0 };
    this.mouseLookDelta = { x: 0, y: 0 };

    this.manualActions = Object.create(null);
    this.toggleActions = Object.create(null);
    this.pendingPulses = new Set();

    this.enabled = true;
    this.mouseLook = false;
    this.previousPadButtons = [];

    this._bindKeyboard();
    this._bindMouse();
    this._bindGamepad();
  }

  _bindKeyboard() {
    addEventListener('keydown', event => {
      this.keys[event.code] = true;

      if ([
        'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'
      ].includes(event.code)) {
        event.preventDefault();
      }

      if (event.repeat) return;

      if (this._has('pause', event.code)) this.pulseAction('pause');
      if (this._has('interact', event.code)) this.pulseAction('interact');
      if (this._has('jump', event.code)) this.pulseAction('jump');

      if (this._has('sprint', event.code) && this.settings.sprintMode === 'toggle') {
        this.toggleActions.sprint = !this.toggleActions.sprint;
      }
    });

    addEventListener('keyup', event => {
      this.keys[event.code] = false;
    });
  }

  _bindMouse() {
    addEventListener('mousedown', event => {
      this.mouseButtons[`Mouse${event.button + 1}`] = true;
      if (event.button === 2) this.mouseLook = true;
    });

    addEventListener('mouseup', event => {
      this.mouseButtons[`Mouse${event.button + 1}`] = false;
      if (event.button === 2) this.mouseLook = false;
    });

    addEventListener('mousemove', event => {
      if (!this.mouseLook || !this.enabled) return;
      this.mouseLookDelta.x += event.movementX || 0;
      this.mouseLookDelta.y += event.movementY || 0;
    });

    addEventListener('contextmenu', event => event.preventDefault());
  }

  _bindGamepad() {
    addEventListener('gamepadconnected', event => {
      this.gamepad = event.gamepad;
    });

    addEventListener('gamepaddisconnected', event => {
      if (this.gamepad?.index === event.gamepad.index) this.gamepad = null;
    });
  }

  _has(action, code) {
    return (this.bindings[action] || []).includes(code);
  }

  remap(action, codes) {
    this.bindings[action] = Array.isArray(codes) ? [...codes] : [codes];
    this.save();
  }

  setMove(x, y) {
    this.touchMove.x = x;
    this.touchMove.y = y;
  }

  setLook(x, y) {
    this.touchLook.x = x;
    this.touchLook.y = y;
  }

  setAction(name, value = true) {
    this.manualActions[name] = Boolean(value);
  }

  pulseAction(name) {
    this.pendingPulses.add(name);
  }

  consume(name) {
    return this.input.consume(name);
  }

  setSettings(next) {
    this.settings = {
      ...this.settings,
      ...(next || {}),
    };
    this.save();
  }

  save() {
    saveControlSettings({
      ...this.settings,
      bindings: this.bindings,
    });
  }

  resetSettings() {
    const defaults = loadControlSettings();
    this.bindings = structuredClone(defaults.bindings);
    this.settings = {
      sprintMode: defaults.sprintMode,
      cameraRelativeMovement: defaults.cameraRelativeMovement,
      touchDeadzone: defaults.touchDeadzone,
    };
    this.toggleActions = Object.create(null);
    this.manualActions = Object.create(null);
    this.save();
  }

  update() {
    if (!this.enabled) {
      this.input.reset();
      this.mouseLookDelta.x = 0;
      this.mouseLookDelta.y = 0;
      this.pendingPulses.clear();
      return;
    }

    const keyboardX =
      (this._down('moveRight') ? 1 : 0) -
      (this._down('moveLeft') ? 1 : 0);

    const keyboardY =
      (this._down('moveForward') ? 1 : 0) -
      (this._down('moveBackward') ? 1 : 0);

    const pad = navigator.getGamepads?.()[this.gamepad?.index ?? -1];
    let moveX = keyboardX;
    let moveY = keyboardY;
    let lookX = 0;
    let lookY = 0;

    if (Math.abs(this.touchMove.x) > 0.001 || Math.abs(this.touchMove.y) > 0.001) {
      moveX = this.touchMove.x;
      moveY = this.touchMove.y;
    }

    if (this.mouseLookDelta.x || this.mouseLookDelta.y) {
      lookX = this._clamp(this.mouseLookDelta.x * 0.012);
      lookY = this._clamp(this.mouseLookDelta.y * 0.012);
    } else {
      lookX = this.touchLook.x;
      lookY = this.touchLook.y;
    }

    const padHeld = Object.create(null);

    if (pad) {
      moveX = Math.abs(pad.axes[0] ?? 0) > 0.12 ? pad.axes[0] : moveX;
      moveY = Math.abs(pad.axes[1] ?? 0) > 0.12 ? -(pad.axes[1] ?? 0) : moveY;

      if (Math.abs(pad.axes[2] ?? 0) > 0.12) lookX = pad.axes[2];
      if (Math.abs(pad.axes[3] ?? 0) > 0.12) lookY = pad.axes[3];

      padHeld.sprint = Boolean(pad.buttons[10]?.pressed);
      padHeld.crouch = Boolean(pad.buttons[1]?.pressed);
      padHeld.aim = Boolean(pad.buttons[6]?.pressed);
      padHeld.handbrake = Boolean(pad.buttons[7]?.pressed);

      if (this._pressed(pad, 0)) this.pulseAction('jump');
      if (this._pressed(pad, 2)) this.pulseAction('interact');
      if (this._pressed(pad, 9)) this.pulseAction('pause');

      this.previousPadButtons = pad.buttons.map(button => Boolean(button?.pressed));
    } else {
      this.previousPadButtons = [];
    }

    const sprintFromKeyboard = this.settings.sprintMode === 'toggle'
      ? Boolean(this.toggleActions.sprint)
      : this._down('sprint');

    this.input.setMove(this._clamp(moveX), this._clamp(moveY));
    this.input.setLook(this._clamp(lookX), this._clamp(lookY));

    this.input.setAction(
      'sprint',
      Boolean(this.manualActions.sprint || sprintFromKeyboard || padHeld.sprint)
    );
    this.input.setAction(
      'crouch',
      Boolean(this.manualActions.crouch || this._down('crouch') || padHeld.crouch)
    );
    this.input.setAction(
      'aim',
      Boolean(this.manualActions.aim || this._down('aim') || padHeld.aim || this.mouseLook)
    );
    this.input.setAction(
      'handbrake',
      Boolean(this.manualActions.handbrake || this._down('handbrake') || padHeld.handbrake)
    );

    for (const action of this.pendingPulses) this.input.pulse(action);
    this.pendingPulses.clear();

    this.mouseLookDelta.x = 0;
    this.mouseLookDelta.y = 0;
  }

  _pressed(pad, index) {
    const current = Boolean(pad.buttons[index]?.pressed);
    return current && !Boolean(this.previousPadButtons[index]);
  }

  _down(action) {
    return (this.bindings[action] || []).some(code => {
      if (code.startsWith('Mouse')) return Boolean(this.mouseButtons[code]);
      return Boolean(this.keys[code]);
    });
  }

  _clamp(value) {
    return Math.max(-1, Math.min(1, value || 0));
  }
}
