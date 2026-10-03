export class AnimationSystem {
  constructor(object) {
    this.object = object;
    this.mixer = null;
    this.actions = {};
    this.state = null;
    this.upperBody = null;
  }

  bind(mixer, clips) {
    this.mixer = mixer;
    this.actions = {};
    for (const clip of clips) {
      const key = clip.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      this.actions[key] = mixer.clipAction(clip);
    }
    if (this.actions.idle) this.play('idle', 0);
  }

  _resolve(name) {
    const key = String(name).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (this.actions[key]) return key;
    const aliases = {
      sprint: ['run', 'walk'],
      crouch: ['walk', 'idle'],
      jump: ['run', 'idle'],
      fall: ['run', 'idle'],
      turn: ['walk', 'idle'],
    };
    return (aliases[key] || []).find(alias => this.actions[alias]) || null;
  }

  play(name, fade = 0.16) {
    if (!this.mixer) return false;
    const resolved = this._resolve(name);
    if (!resolved || this.state === resolved) return Boolean(resolved);
    const next = this.actions[resolved];
    const current = this.actions[this.state];
    if (current) current.fadeOut(fade);
    next.reset().fadeIn(fade).play();
    this.state = resolved;
    return true;
  }

  setUpperBody(action) {
    this.upperBody = action || null;
  }

  update(dt) {
    this.mixer?.update(dt);
  }
}
