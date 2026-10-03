import * as THREE from 'three';

export class AnimationSystem {
  constructor(object) {
    this.object = object;
    this.mixer = null;
    this.actions = {};
    this.state = null;
    this.upperBody = null;
    this.locomotion = {
      enabled: false,
      current: null,
      speed: 0,
      maxSpeed: 1,
      grounded: true,
    };
  }

  _key(name) {
    return String(name).toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  bind(mixer, clips) {
    this.mixer = mixer;
    this.actions = {};
    for (const clip of clips) {
      const key = this._key(clip.name);
      this.actions[key] = mixer.clipAction(clip);
    }

    // Build stable semantic aliases from the actual clip names.
    for (const [key, action] of Object.entries(this.actions)) {
      if (/idle|stand|breath/.test(key) && !this.actions.idle) this.actions.idle = action;
      if (/walk|walking/.test(key) && !this.actions.walk) this.actions.walk = action;
      if (/run|running|jog/.test(key) && !this.actions.run) this.actions.run = action;
      if (/sprint/.test(key) && !this.actions.sprint) this.actions.sprint = action;
      if (/jump/.test(key) && !this.actions.jump) this.actions.jump = action;
      if (/fall/.test(key) && !this.actions.fall) this.actions.fall = action;
      if (/crouch/.test(key) && !this.actions.crouch) this.actions.crouch = action;
    }

    this._configureLooping();
    if (this.actions.idle) this.play('idle', 0);
  }

  addClips(clips = []) {
    if (!this.mixer) return;
    for (const clip of clips) {
      const key = this._key(clip.name);
      this.actions[key] = this.mixer.clipAction(clip);
      const aliases = [];
      if (/idle|stand|breath/.test(key)) aliases.push('idle');
      if (/walk|walking|locomotion/.test(key)) aliases.push('walk');
      if (/run|running|jog/.test(key)) aliases.push('run');
      if (/sprint/.test(key)) aliases.push('sprint');
      if (/jump/.test(key)) aliases.push('jump');
      if (/fall/.test(key)) aliases.push('fall');
      if (/crouch/.test(key)) aliases.push('crouch');
      for (const alias of aliases) if (!this.actions[alias]) this.actions[alias] = this.mixer.clipAction(clip);
    }
    this._configureLooping();
  }

  _configureLooping() {
    for (const name of ['idle', 'walk', 'run', 'sprint', 'crouch']) {
      const action = this.actions[name];
      if (action) action.setLoop(THREE.LoopRepeat, Infinity);
    }
    for (const name of ['jump', 'fall']) {
      const action = this.actions[name];
      if (action) action.setLoop(THREE.LoopRepeat, Infinity);
    }
  }

  _resolve(name) {
    const key = this._key(name);
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

  /**
   * Dynamic locomotion controller.
   *
   * Uses compatible humanoid clips as a small blend tree:
   * idle -> walk -> run. The weights follow actual physical velocity,
   * while timeScale follows stride speed. This avoids hard animation
   * snapping when acceleration/sprint state changes.
   */
  updateLocomotion({ speed = 0, maxSpeed = 8.4, grounded = true, dt = 1 / 60 } = {}) {
    if (!this.mixer || !this.actions.idle) return;

    const idle = this.actions.idle;
    const walk = this.actions.walk;
    const run = this.actions.run;

    const normalized = Math.max(0, Math.min(1, speed / Math.max(0.01, maxSpeed)));
    const walkZone = Math.max(0, Math.min(1, normalized * 2.0));
    const runZone = Math.max(0, (normalized - 0.5) * 2.0);

    // Smooth the weights so acceleration/braking produces a natural blend.
    const smoothing = 1 - Math.exp(-10 * dt);
    const hasAirClip = !grounded && (this.actions.jump || this.actions.fall);
    const airAction = this.actions.jump || this.actions.fall;
    const targetIdle = hasAirClip ? 0 : (grounded ? 1 - walkZone : 0);
    const targetWalk = hasAirClip ? 0 : Math.max(0, walkZone - runZone);
    const targetRun = hasAirClip ? 0 : runZone;

    const ensure = action => {
      if (!action) return;
      if (!action.isRunning()) action.reset().play();
    };

    ensure(idle);
    ensure(walk);
    ensure(run);

    idle.weight += (targetIdle - idle.weight) * smoothing;
    if (walk) walk.weight += (targetWalk - walk.weight) * smoothing;
    if (run) run.weight += (targetRun - run.weight) * smoothing;

    if (airAction) {
      if (hasAirClip) ensure(airAction);
      const targetAir = hasAirClip ? 1 : 0;
      airAction.weight += (targetAir - airAction.weight) * smoothing;
      airAction.enabled = airAction.weight > 0.001;
      airAction.timeScale = 1;
    }

    idle.enabled = idle.weight > 0.001;
    if (walk) walk.enabled = walk.weight > 0.001;
    if (run) run.enabled = run.weight > 0.001;

    // Locomotion clips are authored for a fixed cadence. Match their
    // playback rate to gameplay speed instead of making the feet slide.
    if (walk) walk.timeScale = Math.max(0.55, speed / 3.8);
    if (run) run.timeScale = Math.max(0.65, speed / 6.2);
    idle.timeScale = 1;

    this.state = !grounded && hasAirClip
      ? (this.actions.jump ? 'jump' : 'fall')
      : normalized < 0.03 ? 'idle' : normalized < 0.62 ? 'walk' : 'run';
  }

  setUpperBody(action) {
    this.upperBody = action || null;
  }

  update(dt) {
    this.mixer?.update(dt);
  }
}
