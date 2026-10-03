export class GameMenu {
  constructor({ onResume, onRestart, onSettings, onMainMenu }) {
    this.button = document.createElement('button');
    this.button.className = 'game-menu-toggle';
    this.button.setAttribute('aria-label', 'Game menu');
    this.button.textContent = '☰';
    document.body.appendChild(this.button);

    this.root = document.createElement('section');
    this.root.className = 'game-menu';
    this.root.innerHTML = `
      <div class="menu-card">
        <div class="menu-kicker">ND / GAME</div>
        <h2>GAME MENU</h2>
        <button data-menu="resume">RESUME</button>
        <button data-menu="restart">RESTART</button>
        <button data-menu="settings">CONTROLS</button>
        <button data-menu="main">MAIN MENU</button>
      </div>
    `;
    document.body.appendChild(this.root);

    this.button.onclick = () => this.open();
    this.root.querySelector('[data-menu="resume"]').onclick = onResume;
    this.root.querySelector('[data-menu="restart"]').onclick = onRestart;
    this.root.querySelector('[data-menu="settings"]').onclick = onSettings;
    this.root.querySelector('[data-menu="main"]').onclick = onMainMenu;
  }

  open() { this.root.classList.add('visible'); this.button.classList.add('hidden'); }
  close() { this.root.classList.remove('visible'); this.button.classList.remove('hidden'); }
}
