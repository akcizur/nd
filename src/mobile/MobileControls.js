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
        <button type="button" data-action="interact"><span class="mobile-action__label">E</span><small>ENTER</small></button>
        <button type="button" data-action="crouch"><span class="mobile-action__label">C</span><small>CROUCH</small></button>
        <button type="button" data-action="sprint"><span class="mobile-action__label">RUN</span><small>SPRINT</small></button>
        <button type="button" data-action="jump"><span class="mobile-action__label">↑</span><small>JUMP</small></button>
      </div>`;
    document.body.appendChild(this.root);

    const radius = () => Math.min(innerWidth, innerHeight) * 0.11;
    const deadzone = input.controlSettings.touchDeadzone;

    this.left = new VirtualJoystick({
      zone: this.root.querySelector('.mobile-zone--left'),
      radius: radius(),
      deadzone,
      onChange: (x, y) => input.setMove(x, y),
    });

    this.right = new VirtualJoystick({
      zone: this.root.querySelector('.mobile-zone--right'),
      radius: radius(),
      deadzone,
      onChange: (x, y) => input.setCamera(x, y),
    });

    this.buttons = [...this.root.querySelectorAll('[data-action]')];
    for (const button of this.buttons) {
      const down = event => {
        event.preventDefault();
        button.setPointerCapture?.(event.pointerId);
        const action = button.dataset.action;

        if (action === 'interact' || action === 'jump') {
          input.pulseAction(action);
          button.classList.add('active');
          return;
        }

        if (action === 'sprint' && input.controlSettings.sprintMode === 'toggle') {
          const active = input.toggleAction(action);
          button.classList.toggle('active', active);
          return;
        }

        input.setAction(action, true);
        button.classList.add('active');
      };

      const up = event => {
        event?.preventDefault();
        const action = button.dataset.action;
        if (
          action !== 'interact' &&
          action !== 'jump' &&
          !(action === 'sprint' && input.controlSettings.sprintMode === 'toggle')
        ) {
          input.setAction(action, false);
        }
        button.classList.toggle(
          'active',
          action === 'sprint' &&
          input.controlSettings.sprintMode === 'toggle' &&
          Boolean(input.input.sprint)
        );
      };

      button.addEventListener('pointerdown', down, { passive: false });
      button.addEventListener('pointerup', up, { passive: false });
      button.addEventListener('pointercancel', up, { passive: false });
      button.addEventListener('pointerleave', up, { passive: false });
    }

    addEventListener('resize', () => {
      const r = radius();
      this.left.setRadius(r);
      this.right.setRadius(r);
    });

    this.setVehicleMode(false);
  }

  setTouchDeadzone(value) {
    this.left.setDeadzone(value);
    this.right.setDeadzone(value);
  }

  setVehicleMode(vehicle) {
    this.root.classList.toggle('vehicle-controls', vehicle);
    this.root.dataset.mode = vehicle ? 'vehicle' : 'on-foot';

    const interact = this.root.querySelector('[data-action="interact"]');
    const crouch = this.root.querySelector('[data-action="crouch"]');
    const sprint = this.root.querySelector('[data-action="sprint"]');
    const jump = this.root.querySelector('[data-action="jump"], [data-action="handbrake"]');

    interact.querySelector('.mobile-action__label').textContent = vehicle ? '↙' : 'E';
    interact.querySelector('small').textContent = vehicle ? 'EXIT' : 'ENTER';
    crouch.hidden = vehicle;
    sprint.hidden = vehicle;
    jump.querySelector('.mobile-action__label').textContent = vehicle ? 'HB' : '↑';
    jump.querySelector('small').textContent = vehicle ? 'BRAKE' : 'JUMP';
    jump.dataset.action = vehicle ? 'handbrake' : 'jump';
  }
}
