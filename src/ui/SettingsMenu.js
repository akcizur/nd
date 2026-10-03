export class SettingsMenu {
  constructor({ onBack, inputRouter = null, onCameraSettings = null }) {
    this.input = inputRouter;
    this.onCameraSettings = onCameraSettings;
    this.root = document.createElement('section');
    this.root.className = 'menu-screen settings-menu';
    this.root.innerHTML = `
      <div class="menu-card">
        <div class="menu-kicker">ND / SETTINGS</div>
        <h2>SETTINGS</h2>
        <label class="setting-row"><span>Camera sensitivity</span><input type="range" min=".5" max="2.5" step=".1" value="1" data-setting="sensitivity"></label>
        <label class="setting-row"><span>Invert camera X</span><input type="checkbox" data-setting="invertX"></label>
        <label class="setting-row"><span>Invert camera Y</span><input type="checkbox" data-setting="invertY"></label>
        <div class="menu-kicker settings-subtitle">CONTROLS</div>
        <button data-remap="jump">REMAP JUMP</button>
        <button data-remap="interact">REMAP ENTER VEHICLE</button>
        <button data-remap="sprint">REMAP SPRINT</button>
        <p class="remap-status" data-remap-status>Choose an action, then press a key.</p>
        <button data-menu="back">BACK</button>
      </div>`;
    document.body.appendChild(this.root);
    this.sensitivity=1; this.invertX=false; this.invertY=false; this.waitingFor=null;
    this.root.querySelector('[data-setting="sensitivity"]').oninput=e=>{this.sensitivity=Number(e.target.value);this._emitCameraSettings();};
    this.root.querySelector('[data-setting="invertX"]').onchange=e=>{this.invertX=e.target.checked;this._emitCameraSettings();};
    this.root.querySelector('[data-setting="invertY"]').onchange=e=>{this.invertY=e.target.checked;this._emitCameraSettings();};
    for(const button of this.root.querySelectorAll('[data-remap]')) button.onclick=()=>this.beginRemap(button.dataset.remap);
    this.status=this.root.querySelector('[data-remap-status]');
    this.root.querySelector('[data-menu="back"]').onclick=onBack;
    this.remapListener=e=>{if(!this.waitingFor||['Escape'].includes(e.code))return;this.input?.remap(this.waitingFor,e.code);this.status.textContent=this.waitingFor.toUpperCase()+': '+e.code;this.waitingFor=null;};
    addEventListener('keydown',this.remapListener);
  }
  _emitCameraSettings(){this.onCameraSettings?.({sensitivity:this.sensitivity,invertX:this.invertX,invertY:this.invertY});}
  beginRemap(action){if(!this.input){this.status.textContent='Input router unavailable';return;}this.waitingFor=action;this.status.textContent='Press a key…';}
  show(){this.root.classList.add('visible');}
  hide(){this.root.classList.remove('visible');}
}