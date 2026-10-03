export class MainMenu {
  constructor({ onPlay, onSettings, onAbout }) {
    this.root = document.createElement('section');
    this.root.className = 'menu-screen main-menu';
    this.root.innerHTML = `
      <div class="menu-card">
        <div class="menu-kicker">ND / CITY</div>
        <h1>ND</h1>
        <button data-menu="play">PLAY</button>
        <button data-menu="settings">CONTROLS</button>
        <button data-menu="about">ABOUT</button>
      </div>
    `;
    document.body.appendChild(this.root);
    this.root.querySelector('[data-menu="play"]').onclick = onPlay;
    this.root.querySelector('[data-menu="settings"]').onclick = onSettings;
    this.root.querySelector('[data-menu="about"]').onclick = onAbout;
  }

  show() { this.root.classList.add('visible'); }
  hide() { this.root.classList.remove('visible'); }
}
