export class DebugOverlay {
  constructor({ enabled = false } = {}) {
    this.enabled = enabled;
    this.root = document.createElement('pre');
    this.root.className = 'debug-overlay';
    this.root.hidden = !enabled;
    this.root.setAttribute('aria-hidden', enabled ? 'false' : 'true');
    document.body.appendChild(this.root);
    this.lastTime = performance.now();
    this.frames = 0;
    this.fps = 0;
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    this.root.hidden = !this.enabled;
    this.root.setAttribute('aria-hidden', this.enabled ? 'false' : 'true');
  }

  update({ dt, gameState, player, vehicle, physics, inVehicle }) {
    if (!this.enabled) return;

    this.frames += 1;
    const now = performance.now();
    if (now - this.lastTime >= 500) {
      this.fps = this.frames * 1000 / (now - this.lastTime);
      this.frames = 0;
      this.lastTime = now;
    }

    const playerBody = physics?.body?.translation?.();
    const vehicleBody = vehicle?.body?.translation?.();

    this.root.textContent = [
      'ND DEBUG',
      `FPS       ${this.fps.toFixed(0)}`,
      `FRAME     ${(dt * 1000).toFixed(1)} ms`,
      `STATE     ${gameState}`,
      `VEHICLE   ${inVehicle ? 'YES' : 'NO'}`,
      playerBody ? `PLAYER    ${this._vec(playerBody)}` : 'PLAYER    -',
      vehicleBody ? `CAR       ${this._vec(vehicleBody)}` : 'CAR       -',
      `CAR SPEED ${vehicle?.body?.linvel ? this._speed(vehicle.body.linvel()) : 0} m/s`,
      `CONTACTS  ${physics?.world?.contactPair ? 'Rapier' : 'ready'}`,
    ].join('\\n');
  }

  _vec(v) {
    return `${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)}`;
  }

  _speed(v) {
    return Math.hypot(v.x, v.z).toFixed(2);
  }
}
