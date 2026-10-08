import * as THREE from 'three';

const LOOPING = ['idle', 'walk', 'run', 'sprint'];
const AIR = ['jump', 'fall', 'land'];

export class AnimationSystem {
  constructor(object) {
    this.object = object;
    this.mixer = null;
    this.actions = {};
    this.state = 'idle';
    this.previousState = null;

    this.landedPulse = 0;
    this.airPhase = null;
    this.landingActive = false;

    this.locomotion = {
      enabled: false,
      current: 'idle',
      speed: 0,
      maxSpeed: 1,
      normalizedSpeed: 0,
      grounded: true,
      direction: 0,
      blend: 0,
      weights: { idle: 1, walk: 0, run: 0, sprint: 0 },
    };
  }

  _key(name) {
    return String(name).toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  _registerClip(clip) {
    if (!clip?.name || !this.mixer) return;
    this.actions[this._key(clip.name)] = this.mixer.clipAction(clip);
  }

  bind(mixer, clips = []) {
    this.mixer = mixer;
    this.actions = {};

    for (const clip of clips) this._registerClip(clip);

    // UAL1 is authored for the Universal skeleton. CharacterPackLoader
    // already sanitized/rebound the tracks to this player's bones, so here we
    // only select the canonical in-place locomotion clips.
    const exact = name => this.actions[this._key(name)] || null;

    this.actions.idle = exact('Idle_Loop');
    this.actions.walk = exact('Walk_Loop');
    this.actions.run = exact('Jog_Fwd_Loop');
    this.actions.sprint = exact('Sprint_Loop');
    this.actions.jump = exact('Jump_Start');
    this.actions.fall = exact('Jump_Loop');
    this.actions.land = exact('Jump_Land');

    this._configureActions();

    if (this.actions.idle) {
      this.actions.idle.enabled = true;
      this.actions.idle.setEffectiveWeight(1);
      this.actions.idle.play();
    }

    this.locomotion.enabled = Boolean(this.actions.idle);
    console.info('[ANIM] UAL1 direct binding', {
      idle: Boolean(this.actions.idle),
      walk: Boolean(this.actions.walk),
      jog: Boolean(this.actions.run),
      sprint: Boolean(this.actions.sprint),
      jump: Boolean(this.actions.jump),
      fall: Boolean(this.actions.fall),
      land: Boolean(this.actions.land),
    });
  }

  addClips(clips = []) {
    if (!this.mixer) return;
    for (const clip of clips) this._registerClip(clip);
    this._configureActions();
  }

  _configureActions() {
    const unique = new Set(Object.values(this.actions).filter(Boolean));

    for (const action of unique) {
      action.enabled = false;
      action.setEffectiveWeight(0);
      action.setEffectiveTimeScale(1);
      action.setLoop(THREE.LoopRepeat, Infinity);
      action.clampWhenFinished = false;
    }

    for (const key of ['jump', 'fall', 'land']) {
      const action = this.actions[key];
      if (!action) continue;
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
    }
  }

  _playLoop(key) {
    const action = this.actions[key];
    if (!action) return null;

    action.enabled = true;
    if (!action.isRunning()) action.play();
    return action;
  }

  _fadeAction(action, target, sharpness, dt) {
    if (!action) return;
    const weight = THREE.MathUtils.damp(action.getEffectiveWeight(), target, sharpness, dt);
    action.enabled = weight > 0.001 || target > 0;
    action.setEffectiveWeight(weight);
  }

  _setLocomotionWeights(weights, dt) {
    for (const key of LOOPING) {
      const action = this.actions[key];
      if (!action) continue;

      const target = weights[key] ?? 0;
      this._playLoop(key);
      this._fadeAction(action, target, target > 0 ? 12 : 18, dt);

      if (key !== 'idle' && action.getEffectiveWeight() < 0.001) {
        action.enabled = false;
      }
    }
  }

  _blendSpeed(speed, walkSpeed, runSpeed, sprintSpeed) {
    const walk = Math.max(0.01, walkSpeed);
    const run = Math.max(walk + 0.01, runSpeed);
    const sprint = Math.max(run + 0.01, sprintSpeed);

    if (speed <= 0.12) {
      return { idle: 1, walk: 0, run: 0, sprint: 0, state: 'idle' };
    }

    // Continuous 4-point locomotion blend:
    // idle → walk → jog → sprint.
    if (speed < walk) {
      const t = THREE.MathUtils.smoothstep(speed, 0.12, walk);
      return {
        idle: 1 - t,
        walk: t,
        run: 0,
        sprint: 0,
        state: 'walk',
      };
    }

    if (speed < run) {
      const t = THREE.MathUtils.smoothstep(speed, walk, run);
      return {
        idle: 0,
        walk: 1 - t,
        run: t,
        sprint: 0,
        state: 'run',
      };
    }

    const t = THREE.MathUtils.smoothstep(speed, run, sprint);
    return {
      idle: 0,
      walk: 0,
      run: 1 - t,
      sprint: t,
      state: 'sprint',
    };
  }

  _startAirPhase(phase) {
    const key = this.actions[phase] ? phase : phase === 'jump' ? 'fall' : 'jump';
    const action = this.actions[key];
    if (!action) return;

    for (const locomotion of LOOPING) {
      if (this.actions[locomotion]) this.actions[locomotion].setEffectiveWeight(0);
    }

    action.enabled = true;
    action.reset();
    action.setEffectiveWeight(1);
    action.play();

    this.airPhase = key;
    this.state = key;
  }

  _updateAirborne({ grounded, verticalVelocity, dt }) {
    if (grounded) return false;

    if (this.airPhase === null) {
      this._startAirPhase(verticalVelocity > 0 ? 'jump' : 'fall');
      return true;
    }

    if (
      this.airPhase === 'jump' &&
      verticalVelocity <= 0.05 &&
      this.actions.fall
    ) {
      const old = this.actions.jump;
      const next = this.actions.fall;

      if (old && old !== next) {
        old.enabled = false;
        old.setEffectiveWeight(0);
      }

      next.enabled = true;
      next.setEffectiveWeight(1);
      if (!next.isRunning()) {
        next.reset().play();
      }

      this.airPhase = 'fall';
      this.state = 'fall';
    }

    return true;
  }

  _startLanding() {
    const action = this.actions.land;
    this.landingActive = Boolean(action);

    if (!action) return;

    action.enabled = true;
    action.reset();
    action.setEffectiveWeight(1);
    action.play();

    this.state = 'land';
  }

  updateLocomotion({
    speed = 0,
    maxSpeed = 7,
    grounded = true,
    verticalVelocity = 0,
    dt = 1 / 60,
    walkSpeed = 2.6,
    runSpeed = 4.8,
    sprintSpeed = 7.0,
    strafe = 0,
    justLanded = false,
    sprinting = false,
  } = {}) {
    if (!this.mixer || !this.actions.idle) return;

    const safeMax = Math.max(0.01, maxSpeed);

    if (!grounded) {
      this.landingActive = false;
      this._updateAirborne({ grounded, verticalVelocity, dt });

      this.locomotion.speed = speed;
      this.locomotion.maxSpeed = safeMax;
      this.locomotion.normalizedSpeed = THREE.MathUtils.clamp(speed / safeMax, 0, 1);
      this.locomotion.grounded = false;
      this.locomotion.direction = Math.atan2(strafe, 1);
      return;
    }

    // Grounded again: leave air state and optionally play a dedicated landing clip.
    if (this.locomotion.grounded === false) {
      if (justLanded) this._startLanding();
      this.airPhase = null;
      this.landedPulse = 0.1;
    }

    if (this.landingActive) {
      const land = this.actions.land;

      for (const key of LOOPING) {
        this._fadeAction(this.actions[key], 0, 20, dt);
      }

      if (land && !land.isRunning()) {
        this.landingActive = false;
        land.enabled = false;
        land.setEffectiveWeight(0);
        this.state = 'idle';
      } else {
        this.locomotion.grounded = true;
        this.locomotion.speed = speed;
        this.locomotion.maxSpeed = safeMax;
        return;
      }
    }

    const blend = this._blendSpeed(speed, walkSpeed, runSpeed, sprintSpeed);

    // Sprint input is a gameplay modifier, not a hard animation switch.
    // If sprint is released while velocity is still high, the blend naturally
    // decays through jog instead of snapping.
    if (!sprinting && blend.sprint > 0) {
      const runShare = blend.sprint;
      blend.run += runShare;
      blend.sprint = 0;
      const total = blend.run + blend.walk + blend.idle;
      blend.run /= Math.max(total, 0.001);
      blend.walk /= Math.max(total, 0.001);
      blend.idle /= Math.max(total, 0.001);
    }

    this._setLocomotionWeights(blend, dt);

    const gaitSpeed =
      blend.sprint > 0.45 ? sprintSpeed :
      blend.run > blend.walk ? runSpeed :
      walkSpeed;

    const primary =
      blend.sprint > blend.run ? this.actions.sprint :
      blend.run > blend.walk ? this.actions.run :
      this.actions.walk;

    if (primary && (blend.walk + blend.run + blend.sprint) > 0.01) {
      const targetRate = THREE.MathUtils.clamp(
        speed / Math.max(gaitSpeed, 0.01),
        0.72,
        1.55
      );
      primary.setEffectiveTimeScale(
        THREE.MathUtils.damp(primary.getEffectiveTimeScale(), targetRate, 9, dt)
      );
    }

    this.previousState = this.state;
    this.state = blend.state;
    this.locomotion.current = blend.state;
    this.locomotion.speed = speed;
    this.locomotion.maxSpeed = safeMax;
    this.locomotion.normalizedSpeed = THREE.MathUtils.clamp(speed / safeMax, 0, 1);
    this.locomotion.grounded = true;
    this.locomotion.direction = Math.atan2(strafe, 1);
    this.locomotion.blend = THREE.MathUtils.damp(
      this.locomotion.blend,
      this.locomotion.normalizedSpeed,
      10,
      dt
    );
    this.locomotion.weights = {
      idle: blend.idle,
      walk: blend.walk,
      run: blend.run,
      sprint: blend.sprint,
    };

    this.landedPulse = Math.max(0, this.landedPulse - dt);
  }

  update(dt) {
    this.mixer?.update(dt);
  }
}
