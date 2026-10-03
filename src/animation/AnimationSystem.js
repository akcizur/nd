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
      direction: 0,
      blend: 0,
    };
  }

  _key(name) {
    return String(name).toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  _aliasDirectional(key, action) {
    const rules = [
      ['forward', /forward|forwards/],
      ['backward', /backward|backwards|back/],
      ['left', /strafeleft|left/],
      ['right', /straferight|right/],
      ['forwardLeft', /forwardleft|leftforward/],
      ['forwardRight', /forwardright|rightforward/],
      ['backwardLeft', /backwardleft|leftbackward/],
      ['backwardRight', /backwardright|rightbackward/],
    ];
    for (const [alias, pattern] of rules) {
      if (pattern.test(key) && !this.actions[alias]) this.actions[alias] = action;
    }
  }

  bind(mixer, clips) {
    this.mixer = mixer;
    this.actions = {};
    for (const clip of clips) {
      const key = this._key(clip.name);
      this.actions[key] = mixer.clipAction(clip);
      this._aliasDirectional(key, this.actions[key]);
    }

    for (const [key, action] of Object.entries(this.actions)) {
      if (/idle|stand|breath/.test(key) && !this.actions.idle) this.actions.idle = action;
      if (/walk|walking/.test(key) && !this.actions.walk) this.actions.walk = action;
      if (/run|running|jog/.test(key) && !this.actions.run) this.actions.run = action;
      if (/sprint/.test(key) && !this.actions.sprint) this.actions.sprint = action;
      if (/jump/.test(key) && !this.actions.jump) this.actions.jump = action;
      if (/fall/.test(key) && !this.actions.fall) this.actions.fall = action;
      if (/crouch|crouching/.test(key) && !this.actions.crouch) this.actions.crouch = action;
    }

    this._configureLooping();
    if (this.actions.idle) this.play('idle', 0);
  }

  addClips(clips = []) {
    if (!this.mixer) return;
    for (const clip of clips) {
      const key = this._key(clip.name);
      this.actions[key] = this.mixer.clipAction(clip);
      this._aliasDirectional(key, this.actions[key]);
      const aliases = [];
      if (/idle|stand|breath/.test(key)) aliases.push('idle');
      if (/walk|walking|locomotion/.test(key)) aliases.push('walk');
      if (/run|running|jog/.test(key)) aliases.push('run');
      if (/sprint/.test(key)) aliases.push('sprint');
      if (/jump/.test(key)) aliases.push('jump');
      if (/fall/.test(key)) aliases.push('fall');
      if (/crouch|crouching/.test(key)) aliases.push('crouch');
      for (const alias of aliases) if (!this.actions[alias]) this.actions[alias] = this.mixer.clipAction(clip);
    }
    this._configureLooping();
  }

  _configureLooping() {
    for (const name of Object.keys(this.actions)) {
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

  _directionAction(forward, strafe) {
    const hasDirectional = this.actions.forward || this.actions.backward ||
      this.actions.left || this.actions.right;
    if (!hasDirectional) return null;

    const angle = Math.atan2(strafe, forward);
    const octant = Math.round(angle / (Math.PI / 4));
    const index = (octant + 8) % 8;
    const names = [
      'forward', 'forwardRight', 'right', 'backwardRight',
      'backward', 'backwardLeft', 'left', 'forwardLeft',
    ];
    const candidates = {
      forwardRight: ['forwardRight', 'forward'],
      backwardRight: ['backwardRight', 'backward'],
      backwardLeft: ['backwardLeft', 'backward'],
      forwardLeft: ['forwardLeft', 'forward'],
      right: ['right', 'forward'],
      left: ['left', 'forward'],
    };
    const name = names[index];
    if (this.actions[name]) return this.actions[name];
    return (candidates[name] || [name]).map(key => this.actions[key]).find(Boolean) || null;
  }

  updateLocomotion({
    speed = 0,
    maxSpeed = 8.4,
    grounded = true,
    dt = 1 / 60,
    forward = 1,
    strafe = 0,
    crouched = false,
  } = {}) {
    if (!this.mixer || !this.actions.idle) return;

    const normalized = Math.max(0, Math.min(1, speed / Math.max(0.01, maxSpeed)));
    const smoothing = 1 - Math.exp(-10 * dt);
    const directional = this._directionAction(forward, strafe);
    const base = crouched ? (this.actions.crouch || directional) : directional;

    if (base && grounded && speed > 0.05) {
      for (const key of ['forward', 'backward', 'left', 'right', 'forwardLeft', 'forwardRight', 'backwardLeft', 'backwardRight']) {
        const action = this.actions[key];
        if (!action) continue;
        const target = action === base ? Math.min(1, normalized * 1.4) : 0;
        action.enabled = true;
        action.weight += (target - action.weight) * smoothing;
      }
    }

    const idle = this.actions.idle;
    const walk = this.actions.walk;
    const run = this.actions.run;
    const sprint = this.actions.sprint || run;
    const airAction = !grounded ? (this.actions.jump || this.actions.fall) : null;

    const walkZone = Math.min(1, normalized * 2);
    const runZone = Math.max(0, (normalized - 0.5) * 2);
    const targetIdle = !grounded ? 0 : Math.max(0, 1 - walkZone);
    const targetWalk = !grounded || directional ? 0 : Math.max(0, walkZone - runZone);
    const targetRun = !grounded || directional ? 0 : runZone;

    const ensure = action => {
      if (action && !action.isRunning()) action.reset().play();
    };

    ensure(idle);
    ensure(walk);
    ensure(run);
    ensure(sprint);

    idle.weight += (targetIdle - idle.weight) * smoothing;
    if (walk) walk.weight += (targetWalk - walk.weight) * smoothing;
    if (run && run !== sprint) run.weight += (targetRun - run.weight) * smoothing;

    if (sprint && sprint !== run) {
      const targetSprint = grounded && !directional ? runZone : 0;
      sprint.weight += (targetSprint - sprint.weight) * smoothing;
    }

    if (airAction) {
      ensure(airAction);
      airAction.weight += (1 - airAction.weight) * smoothing;
      airAction.enabled = airAction.weight > 0.001;
    } else if (this.actions.jump || this.actions.fall) {
      const air = this.actions.jump || this.actions.fall;
      air.weight += (0 - air.weight) * smoothing;
      air.enabled = air.weight > 0.001;
    }

    idle.enabled = idle.weight > 0.001;
    if (walk) walk.enabled = walk.weight > 0.001;
    if (run) run.enabled = run.weight > 0.001;

    if (walk) walk.timeScale = Math.max(0.55, speed / 3.8);
    if (run) run.timeScale = Math.max(0.65, speed / 6.2);
    if (sprint) sprint.timeScale = Math.max(0.65, speed / 8.4);

    for (const key of ['forward', 'backward', 'left', 'right', 'forwardLeft', 'forwardRight', 'backwardLeft', 'backwardRight']) {
      if (this.actions[key]) this.actions[key].timeScale = Math.max(0.65, speed / 5.5);
    }

    this.locomotion.speed = speed;
    this.locomotion.maxSpeed = maxSpeed;
    this.locomotion.grounded = grounded;
    this.locomotion.direction = Math.atan2(strafe, forward);
    this.locomotion.blend += (normalized - this.locomotion.blend) * smoothing;

    this.state = !grounded
      ? (this.actions.jump ? 'jump' : 'fall')
      : normalized < 0.03
        ? 'idle'
        : crouched
          ? 'crouch'
          : normalized < 0.62
            ? 'walk'
            : 'run';
  }

  setUpperBody(action) {
    this.upperBody = action || null;
  }

  update(dt) {
    this.mixer?.update(dt);
  }
}
