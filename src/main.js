import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CharacterPackLoader } from './assets/CharacterPackLoader.js';
import './style.css';
import { GameState, GameStateManager } from './core/GameState.js';
import { InputManager } from './core/InputManager.js';
import { DebugOverlay } from './core/DebugOverlay.js';
import { MobileControls } from './mobile/MobileControls.js';
import { MainMenu } from './ui/MainMenu.js';
import { GameMenu } from './ui/GameMenu.js';
import { SettingsMenu } from './ui/SettingsMenu.js';
import { PlayerController } from './player/PlayerController.js';
import { CameraSystem } from './camera/CameraSystem.js';
import { AnimationSystem } from './animation/AnimationSystem.js';
import { PhysicsWorld } from './physics/PhysicsWorld.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0b0b);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.05, 250);
camera.position.set(0, 3, 6);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.querySelector('#app').appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xffffff, 0x202020, 1.7));
const sun = new THREE.DirectionalLight(0xffffff, 2.1);
sun.position.set(8, 14, 6);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
scene.add(sun);

const world = new THREE.Group();
scene.add(world);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(160, 160),
  new THREE.MeshStandardMaterial({
    color: 0x303030,
    roughness: 0.94,
    metalness: 0,
  })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
world.add(ground);

const grid = new THREE.GridHelper(160, 80, 0x666666, 0x252525);
grid.position.y = 0.006;
world.add(grid);

// Small physical test obstacles: they make the capsule controller's
// wall blocking + autostep behavior immediately visible while the scene
// is still intentionally minimal.
function addPhysicsBox({ x, y, z, width, height, depth }) {
  physicsWorld?.addStaticBox(x, y, z, width, height, depth);

  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({
      color: 0x454545,
      roughness: 0.9,
      metalness: 0,
    })
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  world.add(mesh);
}

const loader = new GLTFLoader();
const characterPack = new CharacterPackLoader(loader);

let player = null;
let playerVisual = null;
let playerCollider = null;
let playerAnimation = null;
let playerController = null;
let cameraSystem = null;
let physicsWorld = null;
let playerPhysics = null;

function createPlayerRig(model, targetHeight = 1.8) {
  const rig = new THREE.Group();
  rig.name = 'PlayerCharacter';

  // Gameplay collision proxy: always invisible, independently sized from the visual mesh.
  const collider = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.34, 1.05, 8, 12),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  collider.name = 'PlayerCollisionCapsule';
  collider.visible = false;
  collider.position.y = 0.865;
  rig.add(collider);

  // Normalize the imported character to a real human-like ~1.8 m height.
  model.updateMatrixWorld(true);
  const sourceBounds = new THREE.Box3().setFromObject(model);
  const sourceHeight = sourceBounds.max.y - sourceBounds.min.y;
  const normalizedScale = sourceHeight > 0.001
    ? targetHeight / sourceHeight
    : 1;

  model.scale.setScalar(normalizedScale);
  model.updateMatrixWorld(true);

  const bounds = new THREE.Box3().setFromObject(model);
  model.position.y = -bounds.min.y + 0.01;

  // Quaternius Universal Base mesh faces +Z in its source orientation.
  // The controller/world use -Z as character forward, so keep the visual
  // model on a fixed 180° yaw offset while the gameplay rig remains canonical.
  model.rotation.y = Math.PI;
  model.userData.forwardYawOffset = Math.PI;

  model.traverse(node => {
    if (!node.isMesh) return;
    node.castShadow = true;
    node.receiveShadow = true;
  });

  model.name = 'PlayableCharacter';
  rig.add(model);
  rig.position.set(0, 0, 0);
  rig.updateMatrixWorld(true);
  world.add(rig);

  player = rig;
  playerVisual = model;
  playerCollider = collider;
  return rig;
}

function createTestFigure() {
  const visual = new THREE.Group();
  visual.name = 'PlayableCharacter';

  const skin = new THREE.MeshStandardMaterial({ color: 0x8ec5ff, roughness: 0.8 });
  const accent = new THREE.MeshStandardMaterial({ color: 0xffd21f, roughness: 0.75 });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.23, 0.8, 5, 10), skin);
  torso.position.y = 1.08;
  torso.castShadow = true;
  visual.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 18), accent);
  head.position.y = 1.82;
  head.castShadow = true;
  visual.add(head);

  const leftArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.62, 4, 8), skin);
  leftArm.position.set(-0.38, 1.2, 0);
  leftArm.rotation.z = 0.35;
  leftArm.castShadow = true;
  visual.add(leftArm);

  const rightArm = leftArm.clone();
  rightArm.position.x = 0.38;
  rightArm.rotation.z = -0.35;
  visual.add(rightArm);

  const leftLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.7, 4, 8), skin);
  leftLeg.position.set(-0.14, 0.38, 0);
  leftLeg.castShadow = true;
  visual.add(leftLeg);

  const rightLeg = leftLeg.clone();
  rightLeg.position.x = 0.14;
  visual.add(rightLeg);

  visual.userData.testFigure = {
    torso,
    head,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
  };

  createPlayerRig(visual, 1);
  playerAnimation = {
    update(dt) {
      const parts = playerVisual?.userData?.testFigure;
      if (!parts || !playerController) return;

      const swing = Math.sin(performance.now() * 0.008 * (1 + playerController.horizontalSpeed * 0.6)) * 0.7;
      const speedState = playerController.state;
      const idleSwing = speedState === 'idle' ? 0.12 : 0.45;

      parts.leftArm.rotation.x = speedState === 'idle' ? 0.15 : swing;
      parts.rightArm.rotation.x = speedState === 'idle' ? -0.15 : -swing;
      parts.leftLeg.rotation.x = speedState === 'idle' ? -0.1 : -swing * 1.2;
      parts.rightLeg.rotation.x = speedState === 'idle' ? 0.1 : swing * 1.2;
      parts.torso.rotation.z = playerController.horizontalSpeed > 0.1 ? playerController.animationInput.strafe * 0.18 : 0;
      parts.head.rotation.y = playerController.animationInput.forward * 0.15;
      parts.head.position.y = 1.82 + (playerController.grounded ? 0 : Math.sin(performance.now() * 0.02) * 0.04);
    },
    updateLocomotion() {},
  };
}

async function loadPlayer() {
  try {
    // Load the Quaternius humanoid and the shared Universal Animation Library in parallel.
    const [gltf, animationLibrary] = await Promise.all([
      characterPack.loadPlayer(),
      characterPack.loadAnimationLibrary(),
    ]);

    createPlayerRig(gltf.scene, 1.8);

    // Quaternius UAL uses the same humanoid skeleton naming, so bind clips by bone name.
    const clips = characterPack.retargetClips(
      characterPack.createPlayerClips(animationLibrary),
      playerVisual
    );

    if (clips.length) {
      playerAnimation = new AnimationSystem(playerVisual);
      playerAnimation.bind(new THREE.AnimationMixer(playerVisual), clips);
    }

    console.info(
      '[PLAYER] Quaternius Superhero Male loaded',
      { animationClips: clips.length }
    );
    return;
  } catch (error) {
    console.warn('Quaternius player failed, using test figure fallback:', error);
  }

  createTestFigure();
}

const input = new InputManager();
const mobileControls = new MobileControls(input);
const debug = new DebugOverlay({ enabled: new URLSearchParams(location.search).has('debug') });
const gameState = new GameStateManager(GameState.MAIN_MENU);

const cameraSettings = {
  sensitivity: input.controlSettings.sensitivity ?? 1,
  invertX: input.controlSettings.invertX ?? false,
  invertY: input.controlSettings.invertY ?? false,
};

const movementSettings = {
  sprintMode: input.controlSettings.sprintMode,
  cameraRelativeMovement: true,
  touchDeadzone: input.controlSettings.touchDeadzone,
};

function applyCameraSettings() {
  if (!cameraSystem) return;
  cameraSystem.sensitivityX = 1.8 * cameraSettings.sensitivity;
  cameraSystem.sensitivityY = 1.6 * cameraSettings.sensitivity;
  cameraSystem.invertX = cameraSettings.invertX;
  cameraSystem.invertY = cameraSettings.invertY;
}

function applyMovementSettings(settings = {}) {
  Object.assign(movementSettings, settings, {
    cameraRelativeMovement: true,
  });
  input.setControlSettings(movementSettings);
  mobileControls.setTouchDeadzone(movementSettings.touchDeadzone);
  playerController?.setMovementSettings(movementSettings);
}

const settingsMenu = new SettingsMenu({
  onBack: () => closeSettings(),
  inputRouter: input,
  onCameraSettings: settings => {
    Object.assign(cameraSettings, settings);
    applyCameraSettings();
  },
  onMovementSettings: settings => applyMovementSettings(settings),
});

const mainMenu = new MainMenu({
  onPlay: () => enterPlay(),
  onSettings: () => openSettings(GameState.MAIN_MENU),
  onAbout: () => showAbout(),
});

const gameMenu = new GameMenu({
  onResume: () => resumeGame(),
  onRestart: () => restartGame(),
  onSettings: () => openSettings(GameState.PAUSED),
  onMainMenu: () => returnToMainMenu(),
});

const aboutMenu = document.createElement('section');
aboutMenu.className = 'menu-screen about-menu';
aboutMenu.innerHTML = `
  <div class="menu-card">
    <div class="menu-kicker">ND / MOVEMENT</div>
    <h2>THIRD PERSON</h2>
    <p>Simple character movement prototype.</p>
    <p>WASD / touch joystick + third-person camera.</p>
    <button data-menu="back">BACK</button>
  </div>`;
document.body.appendChild(aboutMenu);
aboutMenu.querySelector('[data-menu="back"]').onclick = () => {
  aboutMenu.classList.remove('visible');
  mainMenu.show();
};

mobileControls.root.classList.add('hidden');
gameMenu.button.classList.add('hidden');

function showAbout() {
  mainMenu.hide();
  aboutMenu.classList.add('visible');
}

let settingsReturnState = GameState.MAIN_MENU;

function openSettings(returnState) {
  settingsReturnState = returnState;
  mainMenu.hide();
  gameMenu.close();
  aboutMenu.classList.remove('visible');
  settingsMenu.show();
  gameState.set(GameState.SETTINGS);
}

function closeSettings() {
  settingsMenu.hide();
  if (settingsReturnState === GameState.PAUSED) {
    gameState.set(GameState.PAUSED);
    gameMenu.open();
  } else {
    gameState.set(GameState.MAIN_MENU);
    mainMenu.show();
  }
}

function enterPlay() {
  if (!player || !playerController || !cameraSystem) return;

  playerController.reset(new THREE.Vector3(0, 0, 0), 0);
  cameraSystem.reset(player);
  mainMenu.hide();
  aboutMenu.classList.remove('visible');
  settingsMenu.hide();
  gameMenu.close();
  gameMenu.button.classList.remove('hidden');
  mobileControls.root.classList.remove('hidden');
  gameState.set(GameState.PLAYING);
}

function resumeGame() {
  gameMenu.close();
  gameState.set(GameState.PLAYING);
}

function restartGame() {
  if (!player) return;
  playerController.reset(new THREE.Vector3(0, 0, 0), 0);
  cameraSystem.reset(player);
  gameMenu.close();
  gameState.set(GameState.PLAYING);
}

function returnToMainMenu() {
  gameMenu.close();
  gameMenu.button.classList.add('hidden');
  mobileControls.root.classList.add('hidden');
  gameState.set(GameState.MAIN_MENU);
  mainMenu.show();
}

gameState.onChange(state => {
  document.body.dataset.gameState = state;
  mobileControls.root.classList.toggle('hidden', state !== GameState.PLAYING);
});

const hudObjective = document.querySelector('#objective');
const hudSpeed = document.querySelector('#speed');
const hudHint = document.querySelector('#hint');

function updatePlayer() {
  if (!playerController || gameState.current !== GameState.PLAYING) return;

  const speed = playerController.horizontalSpeed;
  const maxSpeed = playerController.input.sprint
    ? playerController.sprintSpeed
    : playerController.runSpeed;

  playerAnimation?.updateLocomotion({
    speed,
    maxSpeed,
    grounded: playerController.grounded,
    verticalVelocity: playerController.velocityY,
    forward: playerController.animationInput.forward,
    strafe: playerController.animationInput.strafe,
    crouched: false,
    sprinting: Boolean(playerController.input.sprint),
    dt: 1 / 60,
  });

  hudSpeed.textContent = playerController.state.toUpperCase() + ' · ' +
    Math.round(speed * 10) / 10 + ' m/s';
}

function updateCamera(dt) {
  cameraSystem?.update(dt, {
    subject: player,
    vehicle: false,
    input: input.input,
    speed: playerController?.horizontalSpeed || 0,
  });
}

function updateInteraction() {
  if (gameState.current !== GameState.PLAYING) return;

  if (input.consume('pause')) {
    gameState.set(GameState.PAUSED);
    gameMenu.open();
  }

  hudObjective.textContent = 'Third-person movement';
  hudHint.textContent = 'WASD · SHIFT běh · RMB kamera';
}

const clock = new THREE.Clock();

async function start() {
  hudObjective.textContent = 'Initializing physics…';

  physicsWorld = await PhysicsWorld.create();
  physicsWorld.addGround(160);

  addPhysicsBox({ x: 0, y: 0.15, z: -4, width: 3.0, height: 0.3, depth: 1.2 });
  addPhysicsBox({ x: 2.6, y: 0.35, z: -6.0, width: 1.4, height: 0.7, depth: 1.4 });

  await loadPlayer();

  // One authoritative Rapier capsule owns gameplay collisions.
  // The Three.js capsule remains purely a hidden visual/debug proxy.
  playerPhysics = physicsWorld.createCharacter(player);

  cameraSystem = new CameraSystem(camera);
  applyCameraSettings();

  playerController = new PlayerController({
    object: player,
    input: input.input,
    camera: cameraSystem,
    physicsWorld,
    physicsCharacter: playerPhysics,
    movementSettings,
  });

  playerController.reset(new THREE.Vector3(0, 0, 0), 0);
  cameraSystem.reset(player);

  hudObjective.textContent = 'Ready · PLAY';
  mainMenu.show();

  animate();
}

function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.05);
  input.update();

  if (gameState.current === GameState.PLAYING) {
    physicsWorld?.step(dt, fixedDt => {
      playerController?.fixedUpdate(fixedDt);
    });

    if (playerPhysics) {
      physicsWorld?.syncObject(player, playerPhysics);
    }

    updatePlayer();
    playerAnimation?.update(dt);
    updateCamera(dt);
    updateInteraction();
  }

  debug.update({
    dt,
    gameState: gameState.current,
    player: playerController,
    physics: physicsWorld,
    vehicle: null,
    inVehicle: false,
  });

  renderer.render(scene, camera);
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
});

start().catch(error => {
  console.error(error);
  hudObjective.textContent = 'Character se nepodařilo načíst';
});
