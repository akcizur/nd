import * as THREE from 'three';

export class VirtualJoystick {
  constructor({ zone, className = 'virtual-joystick', onChange, radius }) {
    this.zone = zone;
    this.onChange = onChange;
    this.radius = radius;
    this.activePointer = null;
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
    zone.addEventListener('pointerdown', event => this.start(event));
    zone.addEventListener('pointermove', event => this.move(event));
    zone.addEventListener('pointerup', event => this.end(event));
    zone.addEventListener('pointercancel', event => this.end(event));
  }

  setRadius(radius) {
    this.radius = radius;
    this.el.style.setProperty('--joystick-radius', `${radius}px`);
  }

  start(event) {
    if (this.activePointer !== null) return;
    event.preventDefault();
    this.activePointer = event.pointerId;
    this.center.set(event.clientX, event.clientY);
    this.el.style.left = event.clientX + 'px';
    this.el.style.top = event.clientY + 'px';
    this.el.classList.add('active');
    this.update(event);
  }

  move(event) {
    if (event.pointerId !== this.activePointer) return;
    event.preventDefault();
    this.update(event);
  }

  update(event) {
    const dx = event.clientX - this.center.x;
    const dy = event.clientY - this.center.y;
    const distance = Math.hypot(dx, dy);
    const max = this.radius;
    const scale = distance > max ? max / distance : 1;
    const x = (dx * scale) / max;
    const y = (dy * scale) / max;
    const deadzone = 0.12;
    const magnitude = Math.hypot(x, y);
    if (magnitude < deadzone) this.value.set(0, 0);
    else {
      const adjusted = (magnitude - deadzone) / (1 - deadzone);
      const factor = adjusted / magnitude;
      this.value.set(x * factor, y * factor);
    }
    this.knob.style.transform = `translate(calc(-50% + ${x * max}px), calc(-50% + ${y * max}px))`;
    this.onChange?.(this.value.x, -this.value.y);
  }

  end(event) {
    if (event.pointerId !== this.activePointer) return;
    this.activePointer = null;
    this.value.set(0, 0);
    this.el.classList.remove('active');
    this.onChange?.(0, 0);
  }
}
