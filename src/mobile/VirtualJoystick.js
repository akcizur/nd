import * as THREE from 'three';

export class VirtualJoystick {
  constructor({ zone, className = 'virtual-joystick', onChange, radius }) {
    this.zone = zone; this.onChange = onChange; this.radius = radius;
    this.activePointer = null; this.activeTouch = null;
    this.center = new THREE.Vector2(); this.value = new THREE.Vector2();
    this.el = document.createElement('div'); this.el.className = className;
    this.el.style.setProperty('--joystick-radius', `${radius}px`);
    this.ring = document.createElement('div'); this.ring.className = 'virtual-joystick__ring';
    this.knob = document.createElement('div'); this.knob.className = 'virtual-joystick__knob';
    this.ring.appendChild(this.knob); this.el.appendChild(this.ring); zone.appendChild(this.el);

    zone.addEventListener('pointerdown', e => this.startPointer(e), { passive: false });
    window.addEventListener('pointermove', e => this.movePointer(e), { passive: false });
    window.addEventListener('pointerup', e => this.endPointer(e), { passive: false });
    window.addEventListener('pointercancel', e => this.endPointer(e), { passive: false });

    zone.addEventListener('touchstart', e => this.startTouch(e), { passive: false });
    zone.addEventListener('touchmove', e => this.moveTouch(e), { passive: false });
    zone.addEventListener('touchend', e => this.endTouch(e), { passive: false });
    zone.addEventListener('touchcancel', e => this.endTouch(e), { passive: false });
  }

  setRadius(radius) { this.radius = radius; this.el.style.setProperty('--joystick-radius', `${radius}px`); }

  _start(x, y) {
    this.center.set(x, y); this.el.style.left = `${x}px`; this.el.style.top = `${y}px`;
    this.el.classList.add('active'); this.update(x, y);
  }

  startPointer(e) {
    if (this.activePointer !== null || this.activeTouch !== null) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault(); this.activePointer = e.pointerId; this._start(e.clientX, e.clientY);
  }

  movePointer(e) {
    if (e.pointerId !== this.activePointer) return;
    e.preventDefault(); this.update(e.clientX, e.clientY);
  }

  endPointer(e) {
    if (e.pointerId !== this.activePointer) return;
    e.preventDefault(); this.activePointer = null; this.end();
  }

  startTouch(e) {
    if (this.activePointer !== null || this.activeTouch !== null) return;
    const t = e.changedTouches[0]; if (!t) return;
    e.preventDefault(); this.activeTouch = t.identifier; this._start(t.clientX, t.clientY);
  }

  moveTouch(e) {
    if (this.activeTouch === null) return;
    const t = [...e.touches].find(touch => touch.identifier === this.activeTouch);
    if (!t) return; e.preventDefault(); this.update(t.clientX, t.clientY);
  }

  endTouch(e) {
    if (this.activeTouch === null) return;
    const t = [...e.changedTouches].find(touch => touch.identifier === this.activeTouch);
    if (!t) return; e.preventDefault(); this.activeTouch = null; this.end();
  }

  update(x, y) {
    const dx = x - this.center.x, dy = y - this.center.y;
    const distance = Math.hypot(dx, dy), max = Math.max(1, this.radius);
    const scale = distance > max ? max / distance : 1;
    const nx = (dx * scale) / max, ny = (dy * scale) / max;
    const deadzone = 0.08, magnitude = Math.hypot(nx, ny);
    if (magnitude < deadzone) this.value.set(0, 0);
    else { const adjusted = (magnitude - deadzone) / (1 - deadzone); const factor = adjusted / magnitude; this.value.set(nx * factor, -ny * factor); }
    this.knob.style.transform = `translate(calc(-50% + ${nx * max}px), calc(-50% + ${ny * max}px))`;
    this.onChange?.(this.value.x, this.value.y);
  }

  end() {
    this.value.set(0, 0); this.el.classList.remove('active');
    this.knob.style.transform = 'translate(-50%, -50%)'; this.onChange?.(0, 0);
  }
}