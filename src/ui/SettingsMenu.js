export class SettingsMenu {
  constructor({ onBack }) {
    this.root = document.createElement('section');
    this.root.className = 'menu-screen settings-menu';
    this.root.innerHTML = `
      <div class="menu-card">
        <div class="menu-kicker">ND / SETTINGS</div>
        <h2>SETTINGS</h2>
        <label class="setting-row"><span>Camera sensitivity</span><input type="range" min="0.5" max="2" step="0.1" value="1" data-setting="sensitivity"></label>
        <label class="setting-row"><span>Invert camera Y</span><input type="checkbox" data-setting="invert"></label>
        <button data-menu="back">BACK</button>
      </div>
    `;
    document.body.appendChild(this.root);
    this.sensitivity = 1;
    this.invertY = false;
    this.root.querySelector('[data-setting="sensitivity"]').oninput = event => { this.sensitivity = Number(event.target.value); };
    this.root.querySelector('[data-setting="invert"]').onchange = event => { this.invertY = event.target.checked; };
    this.root.querySelector('[data-menu="back"]').onclick = onBack;
  }

  show() { this.root.classList.add('visible'); }
  hide() { this.root.classList.remove('visible'); }
}
