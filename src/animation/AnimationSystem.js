import * as THREE from 'three';

export class AnimationSystem {
  constructor(object) {
    this.object = object;
    this.mixer = null;
    this.actions = {};
    this.state = null;
    this.previousState = null;
    this.upperBody = null;
    this.landedPulse = 0;
    this.locomotion = {
      enabled: false,
      current: 'idle',
      speed: 0,
      maxSpeed: 1,
      normalizedSpeed: 0,
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
      ['forwardLeft', /^(?:forwardleft|leftforward|forwardstrafeleft|strafeleftforward)$/],
      ['forwardRight', /^(?:forwardright|rightforward|forwardstraferight|straferightforward)$/],
      ['backwardLeft', /^(?:backwardleft|leftbackward|backwardstrafeleft|strafeleftbackward)$/],
      ['backwardRight', /^(?:backwardright|rightbackward|backwardstraferight|straferightbackward)$/],
      ['forward', /^(?:forward|forwards)$/],
      ['backward', /^(?:backward|backwards|back)$/],
      ['left', /^(?:left|strafeleft)$/],
      ['right', /^(?:right|straferight)$/],
    ];

    for (const [alias, pattern] of rules) {
      if (pattern.test(key) && !this.actions[alias]) this.actions[alias] = action;
    }
  }

  _registerClip(clip) {
    const key = this._key(clip.name);
    const action = this.mixer.clipAction(clip);
    this.actions[key] = action;
    this._aliasDirectional(key, action);

    const aliases = [];
    if (/idle|stand|breath/.test(key)) aliases.push('idle');
    if (/walk|walking|locomotion/.test(key) && !/back|strafe/.test(key)) aliases.push('walk');
    if (/run|running|jog/.test(key) && !/back|strafe/.test(key)) aliases.push('run');
    if (/sprint/.test(key)) aliases.push('sprint');
    if (/jumpstart|takeoff|jump/.test(key)) aliases.push('jump');
    if (/jumploop|fall|airborne/.test(key)) aliases.push('fall');
    if (/land|landing/.test(key)) aliases.push('land');
    if (/crouch|crouching/.test(key)) aliases.push('crouch');

    for (const alias of aliases) {
      if (!this.actions[alias]) this.actions[alias] = action;
    }
  }

  bind(mixer, clips = []) {
    this.mixer = mixer;
    this.actions = {};

    for (const clip of clips) this._registerClip(clip);

    if (!this.actions.idle) {
      this.actions.idle = this.actions.stand ||
        this.actions.breath ||
        Object.values(this.actions)[0] ||
        null;
    }

    if (!this.actions.walk) this.actions.walk = this.actions.run || null;
    if (!this.actions.run) this.actions.run = this.actions.walk || null;
    if (!this.actions.sprint) this.actions.sprint = this.actions.run || null;
    if (!this.actions.fall) this.actions.fall = this.actions.jump || null;

    this._configureLooping();
    this.state = null;

    if (this.actions.idle) this._transition('idle', 0);
    this.locomotion.enabled = Boolean(this.actions.idle);
  }

  addClips(clips = []) {
    if (!this.mixer) return;
    for (const clip of clips) this._registerClip(clip);
    if (!this.actions.walk) this.actions.walk = this.actions.run || null;
    if (!this.actions.run) this.actions.run = this.actions.walk || null;
    if (!this.actions.sprint) this.actions.sprint = this.actions.run || null;
    this._configureLooping();
  }

  _configureLooping() {
    const unique = new Set(Object.values(this.actions).filter(Boolean));

    for (const action of unique) {
      action.enabled = false;
      action.setLoop(THREE.LoopRepeat, Infinity);
      action.clampWhenFinished = false;
      action.setEffectiveWeight(0);
      action.setEffectiveTimeScale(1);
    }

    for (const key of ['jump', 'land']) {
      if (!this.actions[key]) continue;
      this.actions[key].setLoop(THREE.LoopOnce, 1);
      this.actions[key].clampWhenFinished = true;
    }
  }

  _resolve(name) {
    const key = this._key(name);
    if (this.actions[key]) return key;

    const aliases = {
      idle: ['stand', 'breath'],
      walk: ['run', 'idle'],
      run: ['walk', 'sprint', 'idle'],
      sprint: ['run', 'walk', 'idle'],
      crouch: ['walk', 'idle'],
      jump: ['fall', 'run', 'walk', 'idle'],
      fall: ['jump', 'run', 'walk', 'idle'],
      land: ['idle', 'walk', 'run'],
    };

    return (aliases[key] || []).find(alias => this.actions[alias]) || null;
  }

  _uniqueActions() {
    return [...new Set(Object.values(this.actions).filter(Boolean))];
  }

  _transition(name, fade = 0.14, { restart = true } = {}) {
    const resolved = this._resolve(name);
    if (!resolved) return false;

    const next = this.actions[resolved];
    const current = this.actions[this.state];

    if (current === next && this.state === resolved) {
      next.enabled = true;
      return true;
    }

    this.previousState = this.state;
    this.state = resolved;

    if (current && current !== next) {
      current.fadeOut(fade);
    }

    next.enabled = true;
    next.setEffectiveWeight(0);
    if (restart) next.reset();
    next.fadeIn(fade).play();

    return true;
  }

  _playOneShot(name) {
    const resolved = this._resolve(name);
    if (!resolved) return false;

    const action = this.actions[resolved];
    action.enabled = true;
    action.reset();
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.setEffectiveWeight(1);
    action.play();
    this.state = resolved;
    return true;
  }

  _selectDirectional(forward, strafe) {
    const directional = {
      forwardLeft: this.actions.forwardLeft,
      forwardRight: this.actions.forwardRight,
      backwardLeft: this.actions.backwardLeft,
      backwardRight: this.actions.backwardRight,
      forward: this.actions.forward,
      backward: this.actions.backward,
      left: this.actions.left,
      right: this.actions.right,
    };

    const hasAny = Object.values(directional).some(Boolean);
    if (!hasAny) return null;

    const angle = Math.atan2(strafe, forward);
    const octant = Math.round(angle / (Math.PI / 4));
    const index = (octant + 8) % 8;
    const names = [
      'forward', 'forwardRight', 'right', 'backwardRight',
      'backward', 'backwardLeft', 'left', 'forwardLeft',
    ];

    const preferred = names[index];
    const fallback = {
      forwardRight: ['forward'],
      backwardRight: ['backward', 'forward'],
      backwardLeft: ['backward', 'forward'],
      forwardLeft: ['forward'],
      right: ['forward'],
      left: ['forward'],
    };

    return directional[preferred] ||
      (fallback[preferred] || []).map(key => directional[key]).find(Boolean) ||
      null;
  }

  updateLocomotion({
    speed = 0,
    maxSpeed = 8.4,
    grounded = true,
    verticalVelocity = 0,
    dt = 1 / 60,
    forward = 1,
    strafe = 0,
    crouched = false,
    sprinting = false,
  } = {}) {
    if (!this.mixer || !this.actions.idle) return;

    const safeMax = Math.max(0.01, maxSpeed);
    const normalized = THREE.MathUtils.clamp(speed / safeMax, 0, 1);
    const smoothing = 1 - Math.exp(-14 * dt);

    let target = 'idle';

    // Highest priority: airborne state. A jump clip is committed once;
    // after its authored takeoff it hands off to fall without restarting.
    if (!grounded) {
      if (verticalVelocity > 0.15 && this.actions.jump) {
        target = 'jump';
      } else if (this.actions.fall) {
        target = 'fall';
      } else {
        target = 'jump';
      }
    } else if (this.locomotion.grounded === false && this.actions.land) {
      // A short landing state gives the feet a deterministic recovery pose.
      target = 'land';
    } else if (crouched) {
      target = this.actions.crouch ? 'crouch' : 'walk';
    } else if (speed < 0.12) {
      target = 'idle';
    } else if (sprinting || normalized >= 0.78) {
      target = this.actions.sprint ? 'sprint' : 'run';
    } else if (normalized >= 0.52) {
      target = this.actions.run ? 'run' : 'walk';
    } else {
      target = 'walk';
    }

    // Directional clips are used only for grounded locomotion and only when
    // they are explicitly present in the loaded animation pack.
    const directional = grounded && speed > 0.12
      ? this._selectDirectional(forward, strafe)
      : null;

    const canonical = this._resolve(target);
    const desired = directional && !['idle', 'land', 'crouch'].includes(target)
      ? directional
      : (canonical ? this.actions[canonical] : null);

    if (desired) {
      const current = this.actions[this.state];

      if (current !== desired) {
        if (current) current.fadeOut(Math.min(0.16, Math.max(0.06, dt * 5)));
        desired.enabled = true;
        desired.setEffectiveWeight(0);
        desired.reset();
        desired.fadeIn(Math.min(0.16, Math.max(0.06, dt * 5))).play();

        const entry = Object.entries(this.actions).find(([, action]) => action === desired);
        this.previousState = this.state;
        this.state = entry?.[0] || canonical || target;
      } else if (!desired.isRunning() && !['jump', 'fall', 'land'].includes(this.state)) {
        desired.play();
      }

      desired.enabled = true;
      desired.setEffectiveWeight(
        THREE.MathUtils.damp(desired.getEffectiveWeight(), 1, 14, dt)
      );
    }

    const selected = desired;
    for (const action of this._uniqueActions()) {
      if (action === selected) continue;
      action.setEffectiveWeight(
        THREE.MathUtils.damp(action.getEffectiveWeight(), 0, 16, dt)
      );
      if (action.getEffectiveWeight() < 0.001) action.enabled = false;
    }

    if (selected) {
      const gait = this.state === 'sprint' ? 8.4 :
        this.state === 'run' ? 6.2 :
        this.state === 'walk' ? 3.8 : 4.0;
      selected.timeScale = ['walk', 'run', 'sprint'].includes(this.state)
        ? THREE.MathUtils.clamp(speed / gait, 0.72, 1.8)
        : 1;
    }

    // A one-shot jump must never be restarted every frame. Once it has
    // finished, the state machine can move to fall/land on the next update.
    if (this.state === 'jump' && selected && !selected.isRunning() && grounded === false) {
      this.state = this.actions.fall ? 'fall' : this.state;
    }

    if (this.state === 'land' && selected && !selected.isRunning()) {
      this.state = null;
    }

    this.locomotion.speed = speed;
    this.locomotion.maxSpeed = safeMax;
    this.locomotion.normalizedSpeed = normalized;
    this.locomotion.grounded = grounded;
    this.locomotion.direction = Math.atan2(strafe, forward);
    this.locomotion.blend += (normalized - this.locomotion.blend) * smoothing;
    this.locomotion.current = target;
  }

  setUpperBody(action) {
    this.upperBody = action || null;
  }

  update(dt) {
    this.mixer?.update(dt);
  }
}
