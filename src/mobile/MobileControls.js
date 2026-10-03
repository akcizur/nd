import { VirtualJoystick } from './VirtualJoystick.js';

export class MobileControls {
  constructor(input) {
    this.input = input;
    this.root = document.createElement('div');
    this.root.className = 'mobile-controls';
    this.root.innerHTML = `
      <div class="mobile-zone mobile-zone--left"></div>
      <div class="mobile-zone mobile-zone--right"></div>
      <div class="mobile-actions">
        <button type="button" data-action="interact" aria-label="Nastoupit nebo vystoupit">E</button>
        <button type="button" data-action="handbrake" aria-label="Ruční brzda">●</button>
      </div>
    `;
    document.body.appendChild(this.root);

    const radius = () => Math.min(innerWidth, innerHeight) * 0.11;
    this.left = new VirtualJoystick({
      zone: this.root.querySelector('.mobile-zone--left'),
      radius: radius(),
      onChange: (x, y) => input.setMove(x, y),
    });
    this.right = new VirtualJoystick({
      zone: this.root.querySelector('.mobile-zone--right'),
      radius: radius(),
      onChange: (x, y) => input.setCamera(x, y),
    });

    this.root.querySelectorAll('[data-action]').forEach(button => {
      const action = button.dataset.action;
      const press = event => {
        event.preventDefault();
        input.setAction(action, true);
        button.classList.add('active');
        if (action === 'interact') setTimeout(() => input.setAction(action, false), 60);
      };
      const release = () => {
        if (action !== 'interact') input.setAction(action, false);
        button.classList.remove('active');
      };
      button.addEventListener('pointerdown', press);
      button.addEventListener('pointerup', release);
      button.addEventListener('pointercancel', release);
      button.addEventListener('pointerleave', release);
    });

    addEventListener('resize', () => {
      const r = radius();
      this.left.setRadius(r);
      this.right.setRadius(r);
    });
  }
}
