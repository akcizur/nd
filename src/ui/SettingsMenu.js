const ACTIONS = [
  ['moveForward', 'MOVE FORWARD'],
  ['moveBackward', 'MOVE BACK'],
  ['moveLeft', 'MOVE LEFT'],
  ['moveRight', 'MOVE RIGHT'],
  ['sprint', 'SPRINT'],
  ['jump', 'JUMP'],
  ['crouch', 'CROUCH'],
  ['interact', 'INTERACT / VEHICLE'],
  ['handbrake', 'HANDBRAKE'],
  ['pause', 'PAUSE'],
];

const displayCode = code => ({
  KeyW: 'W', KeyA: 'A', KeyS: 'S', KeyD: 'D',
  ArrowUp: '↑', ArrowLeft: '←', ArrowDown: '↓', ArrowRight: '→',
  Space: 'SPACE', ShiftLeft: 'SHIFT', ShiftRight: 'SHIFT',
  KeyC: 'C', KeyE: 'E', Escape: 'ESC',
})[code] || String(code).replace('Key', '').replace('Digit', '');

export class SettingsMenu {
  constructor({ onBack, inputRouter = null, onCameraSettings = null, onMovementSettings = null }) {
    this.input = inputRouter;
    this.onCameraSettings = onCameraSettings;
    this.onMovementSettings = onMovementSettings;
    this.root = document.createElement('section');
    this.root.className = 'menu-screen settings-menu';
    this.root.innerHTML = `
      <div class="menu-card menu-card--settings">
        <div class="menu-kicker">ND / SETTINGS</div>
        <h2>CONTROLS</h2>

        <section class="settings-section">
          <div class="settings-section__title">MOVEMENT</div>
          <label class="setting-row"><span>Sprint</span><select data-setting="sprintMode"><option value="hold">HOLD</option><option value="toggle">TOGGLE</option></select></label>
          <label class="setting-row"><span>Camera-relative movement</span><input type="checkbox" data-setting="cameraRelativeMovement"></label>
          <label class="setting-row setting-row--stack"><span>Touch deadzone</span><input type="range" min="0" max="0.2" step="0.01" data-setting="touchDeadzone"><output data-setting-output="touchDeadzone"></output></label>
        </section>

        <section class="settings-section">
          <div class="settings-section__title">CAMERA</div>
          <label class="setting-row setting-row--stack"><span>Sensitivity</span><input type="range" min="0.5" max="2.5" step="0.1" data-setting="sensitivity"><output data-setting-output="sensitivity"></output></label>
          <label class="setting-row"><span>Invert X</span><input type="checkbox" data-setting="invertX"></label>
          <label class="setting-row"><span>Invert Y</span><input type="checkbox" data-setting="invertY"></label>
        </section>

        <section class="settings-section settings-section--bindings">
          <div class="settings-section__title">KEYBOARD / MOUSE</div>
          <div class="binding-list" data-binding-list></div>
          <p class="remap-status" data-remap-status>Tap a binding, then press a key.</p>
        </section>

        <div class="settings-actions">
          <button data-menu="reset">RESET CONTROLS</button>
          <button data-menu="back">BACK</button>
        </div>
      </div>`;
    document.body.appendChild(this.root);

    this.waitingFor = null;
    this.status = this.root.querySelector('[data-remap-status]');

    this.sensitivityInput = this.root.querySelector('[data-setting="sensitivity"]');
    this.sprintInput = this.root.querySelector('[data-setting="sprintMode"]');
    this.relativeInput = this.root.querySelector('[data-setting="cameraRelativeMovement"]');
    this.deadzoneInput = this.root.querySelector('[data-setting="touchDeadzone"]');
    this.invertXInput = this.root.querySelector('[data-setting="invertX"]');
    this.invertYInput = this.root.querySelector('[data-setting="invertY"]');
    this.sensitivityOutput = this.root.querySelector('[data-setting-output="sensitivity"]');
    this.deadzoneOutput = this.root.querySelector('[data-setting-output="touchDeadzone"]');

    this.sensitivityInput.oninput = () => this._cameraChanged();
    this.invertXInput.onchange = () => this._cameraChanged();
    this.invertYInput.onchange = () => this._cameraChanged();
    this.sprintInput.onchange = () => this._movementChanged();
    this.relativeInput.onchange = () => this._movementChanged();
    this.deadzoneInput.oninput = () => this._movementChanged();

    this.root.querySelector('[data-menu="reset"]').onclick = () => {
      this.input?.resetControlSettings();
      this._syncFromInput();
      this._cameraChanged();
      this._movementChanged();
      this.status.textContent = 'Controls restored to defaults.';
    };
    this.root.querySelector('[data-menu="back"]').onclick = onBack;

    this._buildBindings();
    this._syncFromInput();
    this.remapListener = event => this._captureKey(event);
    addEventListener('keydown', this.remapListener);
  }

  _buildBindings() {
    const list = this.root.querySelector('[data-binding-list]');
    list.innerHTML = ACTIONS.map(([action, label]) => `
      <div class="binding-row" data-binding="${action}">
        <span>${label}</span>
        <button type="button" data-remap="${action}">—</button>
      </div>`).join('');
    for (const button of list.querySelectorAll('[data-remap]')) {
      button.onclick = () => this.beginRemap(button.dataset.remap);
    }
  }

  _syncFromInput() {
    const settings = this.input?.controlSettings || { sprintMode: 'hold', cameraRelativeMovement: true, touchDeadzone: 0.08 };
    this.sprintInput.value = settings.sprintMode;
    this.relativeInput.checked = settings.cameraRelativeMovement !== false;
    this.deadzoneInput.value = settings.touchDeadzone;
    this.sensitivityInput.value = String(settings.sensitivity ?? 1);
    this.invertXInput.checked = Boolean(settings.invertX);
    this.invertYInput.checked = Boolean(settings.invertY);
    this._updateOutputs();

    const bindings = this.input?.bindings || {};
    for (const [action] of ACTIONS) {
      const button = this.root.querySelector(`[data-remap="${action}"]`);
      if (button) button.textContent = (bindings[action] || []).map(displayCode).join(' / ') || 'UNBOUND';
    }
  }

  _updateOutputs() {
    this.sensitivityOutput.value = `${Number(this.sensitivityInput.value).toFixed(1)}×`;
    this.deadzoneOutput.value = `${Math.round(Number(this.deadzoneInput.value) * 100)}%`;
  }

  _cameraChanged() {
    this._updateOutputs();
    const camera = {
      sensitivity: Number(this.sensitivityInput.value),
      invertX: this.invertXInput.checked,
      invertY: this.invertYInput.checked,
    };
    this.input?.setControlSettings(camera);
    this.onCameraSettings?.(camera);
  }

  _movementChanged() {
    this._updateOutputs();
    const settings = {
      sprintMode: this.sprintInput.value,
      cameraRelativeMovement: this.relativeInput.checked,
      touchDeadzone: Number(this.deadzoneInput.value),
    };
    this.input?.setControlSettings(settings);
    this.onMovementSettings?.(settings);
  }

  beginRemap(action) {
    if (!this.input) return;
    this.waitingFor = action;
    this.status.textContent = `Press a key for ${action.toUpperCase()}…`;
  }

  _captureKey(event) {
    if (!this.waitingFor || event.code === 'Escape') return;
    event.preventDefault();
    this.input.remap(this.waitingFor, [event.code]);
    this.status.textContent = `${this.waitingFor.toUpperCase()}: ${displayCode(event.code)}`;
    this.waitingFor = null;
    this._syncFromInput();
  }

  show() {
    this._syncFromInput();
    this.root.classList.add('visible');
  }
  hide() {
    this.waitingFor = null;
    this.root.classList.remove('visible');
  }
}
