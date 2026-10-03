import * as THREE from 'three';

export class VirtualJoystick {
  constructor({ zone, className = 'virtual-joystick', onChange, radius }) {
    this.zone = zone;
    this.onChange = onChange;
    this.radius = radius;
    this.activeTouch = null;
    this.center = new THREE.Vector2();
    this.value = new THREE.Vector2();

    this.el = document.createElement('div');
    this.el.className = className;
    this.el.style.setProperty('--joystick-radius', `${radius}px`);

    this.ring = document.createElement('div');
    this.ring.className = 'virtual-joystick__ring';
    this.knob = document.createElement('div');
    this.knob.className = 'virtual-joystick__knob';
    this.ring.appendChild(this.knob);
    this.el.appendChild(this.ring);
    zone.appendChild(this.el);

    // Mobile joystick uses native Touch Events exclusively.
    // This avoids PointerEvent/TouchEvent compatibility conflicts on iOS WebKit
    // and gives each joystick its own touch identifier for two-thumb control.
    zone.addEventListener('touchstart', event => this.start(event), { passive: false });
    window.addEventListener('touchmove', event => this.move(event), { passive: false });
    window.addEventListener('touchend', event => this.end(event), { passive: false });
    window.addEventListener('touchcancel', event => this.end(event), { passive: false });
  }

  setRadius(radius) {
    this.radius = radius;
    this.el.style.setProperty('--joystick-radius', `${radius}px`);
  }

  start(event) {
    if (this.activeTouch !== null) return;

    const touch = event.changedTouches[0];
    if (!touch) return;

    event.preventDefault();
    this.activeTouch = touch.identifier;
    this.center.set(touch.clientX, touch.clientY);
    this.el.style.left = `${touch.clientX}px`;
    this.el.style.top = `${touch.clientY}px`;
    this.el.classList.add('active');

    this.update(touch.clientX, touch.clientY);
  }

  move(event) {
    if (this.activeTouch === null) return;

    const touch = Array.from(event.touches).find(
      item => item.identifier === this.activeTouch
    );
    if (!touch) return;

    event.preventDefault();
    this.update(touch.clientX, touch.clientY);
  }

  end(event) {
    if (this.activeTouch === null) return;

    const touch = Array.from(event.changedTouches).find(
      item => item.identifier === this.activeTouch
    );
    if (!touch) return;

    event.preventDefault();
    this.activeTouch = null;
    this.value.set(0, 0);
    this.el.classList.remove('active');
    this.knob.style.transform = 'translate(-50%, -50%)';
    this.onChange?.(0, 0);
  }

  update(x, y) {
    const dx = x - this.center.x;
    const dy = y - this.center.y;
    const distance = Math.hypot(dx, dy);
    const max = Math.max(1, this.radius);
    const scale = distance > max ? max / distance : 1;
    const nx = (dx * scale) / max;
    const ny = (dy * scale) / max;

    const deadzone = 0.08;
    const magnitude = Math.hypot(nx, ny);

    if (magnitude < deadzone) {
      this.value.set(0, 0);
    } else {
      const adjusted = (magnitude - deadzone) / (1 - deadzone);
      const factor = adjusted / magnitude;
      this.value.set(nx * factor, -ny * factor);
    }

    this.knob.style.transform =
      `translate(calc(-50% + ${nx * max}px), calc(-50% + ${ny * max}px))`;

    this.onChange?.(this.value.x, this.value.y);
  }
}
