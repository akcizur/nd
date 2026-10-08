import * as THREE from 'three';

const clamp01 = value => THREE.MathUtils.clamp(value, 0, 1);

export class ProceduralCharacterAnimation {
  constructor(model) {
    this.model = model;
    this.rig = model?.userData?.proceduralRig ?? null;
    this.time = 0;
    this.phase = 0;
    this.state = 'idle';
    this.previousGrounded = true;
    this.landTimer = 0;
    this.locomotion = {
      speed: 0,
      grounded: true,
      forward: 0,
      strafe: 0,
      sprinting: false,
    };
  }

  _setRotation(object, x, y, z, sharpness, dt) {
    if (!object) return;
    object.rotation.x = THREE.MathUtils.damp(object.rotation.x, x, sharpness, dt);
    object.rotation.y = THREE.MathUtils.damp(object.rotation.y, y, sharpness, dt);
    object.rotation.z = THREE.MathUtils.damp(object.rotation.z, z, sharpness, dt);
  }

  _setPositionY(object, target, sharpness, dt) {
    if (!object) return;
    object.position.y = THREE.MathUtils.damp(object.position.y, target, sharpness, dt);
  }

  updateLocomotion({
    speed = 0,
    grounded = true,
    verticalVelocity = 0,
    strafe = 0,
    forward = 0,
    sprinting = false,
    justLanded = false,
    dt = 1 / 60,
  } = {}) {
    if (!this.rig) return;

    this.locomotion = {
      speed,
      grounded,
      forward,
      strafe,
      sprinting,
      crouched,
    };

    this.previousGrounded = grounded;
    if (justLanded) this.landTimer = 0.18;
    this.landTimer = Math.max(0, this.landTimer - dt);

    if (!grounded) {
      this.state = verticalVelocity > 0.05 ? 'jump' : 'fall';
    } else if (this.landTimer > 0) {
      this.state = 'land';
    } else if (crouched) {
      this.state = 'crouch';
    } else if (speed < 0.10) {
      this.state = 'idle';
    } else if (sprinting || speed > 5.8) {
      this.state = 'sprint';
    } else if (speed > 3.25) {
      this.state = 'run';
    } else {
      this.state = 'walk';
    }
  }

  _resetPose(dt, sharpness = 14) {
    const r = this.rig;

    this._setRotation(r.hips, 0, 0, 0, sharpness, dt);
    this._setRotation(r.spine, 0, 0, 0, sharpness, dt);
    this._setRotation(r.chest, 0, 0, 0, sharpness, dt);
    this._setRotation(r.neck, 0, 0, 0, sharpness, dt);
    this._setRotation(r.head, 0, 0, 0, sharpness, dt);

    this._setRotation(r.shoulders.left, 0, 0, 0, sharpness, dt);
    this._setRotation(r.shoulders.right, 0, 0, 0, sharpness, dt);

    this._setRotation(r.upperArm.left, 0, 0, 0, sharpness, dt);
    this._setRotation(r.upperArm.right, 0, 0, 0, sharpness, dt);
    this._setRotation(r.forearm.left, 0, 0, 0, sharpness, dt);
    this._setRotation(r.forearm.right, 0, 0, 0, sharpness, dt);

    this._setRotation(r.legs.left, 0, 0, 0, sharpness, dt);
    this._setRotation(r.legs.right, 0, 0, 0, sharpness, dt);
    this._setRotation(r.shins.left, 0, 0, 0, sharpness, dt);
    this._setRotation(r.shins.right, 0, 0, 0, sharpness, dt);
    this._setRotation(r.feet.left, 0, 0, 0, sharpness, dt);
    this._setRotation(r.feet.right, 0, 0, 0, sharpness, dt);

    this._setPositionY(this.model, 0, sharpness, dt);
  }

  _updateIdle(dt) {
    const r = this.rig;
    const breathing = Math.sin(this.time * 2.0);
    const sway = Math.sin(this.time * 0.95) * 0.012;

    this._setRotation(r.chest, breathing * 0.012, sway, 0, 8, dt);
    this._setRotation(r.head, -breathing * 0.008, -sway * 0.8, 0, 8, dt);
    this._setRotation(r.shoulders.left, 0, 0, -0.015, 8, dt);
    this._setRotation(r.shoulders.right, 0, 0, 0.015, 8, dt);
  }

  _updateLocomotion(dt) {
    const r = this.rig;
    const speed = this.locomotion.speed;
    const forward = this.locomotion.forward;
    const strafe = this.locomotion.strafe;

    const runFactor = clamp01((speed - 0.55) / 5.8);
    const sprintFactor = clamp01((speed - 5.6) / 1.4);
    const backward = clamp01(-forward);
    const forwardFactor = clamp01(forward);

    const strideScale =
      this.state === 'sprint' ? 0.92 :
      this.state === 'run' ? 0.72 :
      0.52;

    const gaitHz =
      this.state === 'sprint' ? 3.15 :
      this.state === 'run' ? 2.45 :
      1.85 + runFactor * 0.35;

    this.phase += dt * gaitHz * Math.PI * 2;

    const legWave = Math.sin(this.phase);
    const oppositeLegWave = Math.sin(this.phase + Math.PI);
    const legAmp = strideScale * (0.35 + runFactor * 0.42);

    const left = legWave * legAmp;
    const right = oppositeLegWave * legAmp;

    const backwardBlend = backward * 0.55;
    const forwardBlend = forwardFactor * 0.45;

    this._setRotation(r.legs.left, left * (1 - backwardBlend) - left * backwardBlend, 0, 0, 18, dt);
    this._setRotation(r.legs.right, right * (1 - backwardBlend) - right * backwardBlend, 0, 0, 18, dt);

    const kneeLeft = 0.10 + Math.max(0, -left) * (0.16 + sprintFactor * 0.08);
    const kneeRight = 0.10 + Math.max(0, -right) * (0.16 + sprintFactor * 0.08);

    this._setRotation(r.shins.left, kneeLeft, 0, 0, 18, dt);
    this._setRotation(r.shins.right, kneeRight, 0, 0, 18, dt);

    this._setRotation(r.feet.left, -Math.max(0, left) * 0.30, 0, 0, 18, dt);
    this._setRotation(r.feet.right, -Math.max(0, right) * 0.30, 0, 0, 18, dt);

    const armSwing = (0.20 + runFactor * 0.48);
    this._setRotation(r.upperArm.left, -legWave * armSwing, 0, strafe * -0.16, 16, dt);
    this._setRotation(r.upperArm.right, -oppositeLegWave * armSwing, 0, strafe * 0.16, 16, dt);

    this._setRotation(r.forearm.left, -0.10 - Math.max(0, legWave) * 0.18, 0, 0, 18, dt);
    this._setRotation(r.forearm.right, -0.10 - Math.max(0, oppositeLegWave) * 0.18, 0, 0, 18, dt);

    this._setRotation(
      r.hips,
      Math.sin(this.phase * 2) * 0.018,
      0,
      -strafe * (0.04 + sprintFactor * 0.035),
      12,
      dt
    );

    this._setRotation(
      r.spine,
      -0.025 * runFactor,
      strafe * 0.045,
      0,
      12,
      dt
    );

    this._setRotation(
      r.chest,
      0.02 * Math.abs(legWave),
      strafe * -0.055,
      strafe * 0.05,
      12,
      dt
    );

    const headSway = Math.sin(this.phase + Math.PI * 0.5) * (0.012 + runFactor * 0.018);
    this._setRotation(r.head, headSway, -strafe * 0.08, 0, 12, dt);

    this._setPositionY(
      this.model,
      Math.abs(legWave) * (0.012 + runFactor * 0.018),
      16,
      dt
    );

    const forwardLean = 0.02 + sprintFactor * 0.045;
    this._setRotation(r.spine, -forwardLean, strafe * 0.045, 0, 12, dt);

    // When moving backward, keep the body readable and reduce forward lean.
    if (forward < -0.25) {
      this._setRotation(r.spine, 0.012, strafe * 0.05, 0, 12, dt);
      this._setRotation(r.chest, -headSway * 0.3, -strafe * 0.05, 0, 12, dt);
    }
  }

  _updateCrouch(dt) {
    const r = this.rig;
    const wave = Math.sin(this.time * 2.2) * 0.012;

    this._setRotation(r.legs.left, -0.48 + wave, 0, 0, 16, dt);
    this._setRotation(r.legs.right, -0.48 - wave, 0, 0, 16, dt);
    this._setRotation(r.shins.left, 0.72, 0, 0, 16, dt);
    this._setRotation(r.shins.right, 0.72, 0, 0, 16, dt);
    this._setRotation(r.feet.left, -0.18, 0, 0, 16, dt);
    this._setRotation(r.feet.right, -0.18, 0, 0, 16, dt);

    this._setRotation(r.upperArm.left, 0.30, 0, -0.06, 12, dt);
    this._setRotation(r.upperArm.right, 0.30, 0, 0.06, 12, dt);
    this._setRotation(r.forearm.left, -0.18, 0, 0, 12, dt);
    this._setRotation(r.forearm.right, -0.18, 0, 0, 12, dt);

    this._setRotation(r.spine, 0.15, this.locomotion.strafe * 0.035, 0, 12, dt);
    this._setRotation(r.chest, 0.04 + wave, 0, 0, 12, dt);
    this._setPositionY(this.model, -0.055, 14, dt);
  }

  _updateAir(dt) {
    const r = this.rig;
    const isJump = this.state === 'jump';
    const lift = isJump ? 0.16 : 0.05;

    this._setRotation(r.spine, -0.10, this.locomotion.strafe * 0.04, 0, 10, dt);
    this._setRotation(r.chest, isJump ? -0.14 : -0.04, 0, 0, 10, dt);

    this._setRotation(r.upperArm.left, isJump ? -0.35 : 0.22, 0, -0.08, 10, dt);
    this._setRotation(r.upperArm.right, isJump ? -0.35 : 0.22, 0, 0.08, 10, dt);

    this._setRotation(r.forearm.left, -0.20, 0, 0, 10, dt);
    this._setRotation(r.forearm.right, -0.20, 0, 0, 10, dt);

    this._setRotation(r.legs.left, isJump ? 0.45 : -0.18, 0, 0, 10, dt);
    this._setRotation(r.legs.right, isJump ? -0.45 : 0.18, 0, 0, 10, dt);
    this._setRotation(r.shins.left, 0.38, 0, 0, 10, dt);
    this._setRotation(r.shins.right, 0.38, 0, 0, 10, dt);

    this._setPositionY(this.model, lift, 9, dt);
  }

  _updateLand(dt) {
    const r = this.rig;
    const t = clamp01(this.landTimer / 0.18);
    const crouch = Math.sin((1 - t) * Math.PI) * 0.20;

    this._setRotation(r.legs.left, -crouch, 0, 0, 18, dt);
    this._setRotation(r.legs.right, -crouch, 0, 0, 18, dt);
    this._setRotation(r.shins.left, crouch * 0.8, 0, 0, 18, dt);
    this._setRotation(r.shins.right, crouch * 0.8, 0, 0, 18, dt);
    this._setRotation(r.spine, crouch * 0.45, 0, 0, 18, dt);
    this._setRotation(r.chest, crouch * 0.25, 0, 0, 18, dt);
    this._setPositionY(this.model, -crouch * 0.06, 18, dt);
  }

  update(dt = 1 / 60) {
    if (!this.rig) return;

    this.time += dt;
    this._resetPose(dt, 18);

    if (!this.locomotion.grounded) {
      this._updateAir(dt);
    } else if (this.state === 'land') {
      this._updateLand(dt);
    } else if (this.state === 'crouch') {
      this._updateCrouch(dt);
    } else if (this.state === 'idle') {
      this._updateIdle(dt);
    } else {
      this._updateLocomotion(dt);
    }
  }
}
