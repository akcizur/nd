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

// A small grid makes movement and camera orientation immediately readable.
const grid = new THREE.GridHelper(160, 80, 0x666666, 0x252525);
grid.position.y = 0.006;
world.add(grid);

const loader = new GLTFLoader();
const characterPack = new CharacterPackLoader(loader);

let player = null;
let playerVisual = null;
let playerCollider = null;
let playerAnimation = null;
let playerController = null;
let cameraSystem = null;
let universalAnimations = [];

function createPlayerRig(model, scale = 0.92) {
  const rig = new THREE.Group();
  rig.name = 'PlayerCharacter';

  // Invisible gameplay collider. The visible character never owns gameplay
  // movement directly; the rig/capsule is the authoritative body.
  const collider = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.34, 1.05, 8, 12),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  collider.name = 'PlayerCollisionCapsule';
  collider.visible = false;
  collider.position.y = 0.865;
  rig.add(collider);

  model.scale.setScalar(scale);
  model.updateMatrixWorld(true);

  const bounds = new THREE.Box3().setFromObject(model);
  model.position.y = -bounds.min.y + 0.01;

  // The selected playable model is the yellow character. Keep the model
  // visually distinct while the collider remains completely invisible.
  model.traverse(node => {
    if (!node.isMesh) return;
    node.castShadow = true;
    node.receiveShadow = true;

    if (node.material) {
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      node.material = materials.map(source => {
        const material = source.clone();
        if ('color' in material) material.color.set(0xffd21f);
        if ('roughness' in material) material.roughness = Math.max(0.55, material.roughness);
        if ('metalness' in material) material.metalness = 0;
        return material;
      });
    }
  });

  model.name = 'YellowPlayableCharacter';
  rig.add(model);
  rig.position.set(0, 0, 0);
  rig.updateMatrixWorld(true);
  world.add(rig);

  player = rig;
  playerVisual = model;
  playerCollider = collider;
  return rig;
}

function createFallbackPlayer() {
  const visual = new THREE.Group();
  visual.name = 'YellowPlayableCharacter';

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.28, 0.92, 6, 10),
    new THREE.MeshStandardMaterial({ color: 0xffd21f, roughness: 0.78 })
  );
  body.position.y = 0.72;
  body.castShadow = true;
  visual.add(body);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0xffd21f, roughness: 0.9 })
  );
  head.position.y = 1.44;
  head.castShadow = true;
  visual.add(head);

  createPlayerRig(visual, 1);
  playerAnimation = null;
}

async function loadPlayer() {
  try {
    const animationGltf = await characterPack.loadAnimationLibrary();
    universalAnimations = animationGltf.animations || [];
  } catch (error) {
    console.warn('UAL unavailable:', error);
  }

  try {
    const gltf = await characterPack.loadPlayer();
    const clips = characterPack.retargetClips(universalAnimations, gltf.scene);
    const hasIdle = clips.some(clip => /idle|stand|breath/i.test(clip.name));
    const hasLocomotion = clips.some(clip => /walk|jog|run|sprint/i.test(clip.name));

    if (!hasIdle || !hasLocomotion) {
      throw new Error('Universal character has no complete idle/locomotion set');
    }

    createPlayerRig(gltf.scene);

    playerAnimation = new AnimationSystem(playerVisual);
    playerAnimation.bind(new THREE.AnimationMixer(playerVisual), clips);
    playerAnimation.play('idle', 0);
    return;
  } catch (error) {
    console.warn('Universal character failed:', error);
  }

  // Never use the animation-library donor scene as a visible character.
  // It can contain multiple reference meshes. The playable scene must contain
  // exactly one character model.
  createFallbackPlayer();
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

function updatePlayer(dt) {
  if (!playerController || gameState.current !== GameState.PLAYING) return;

  playerController.update(dt);

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
    dt,
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
  hudObjective.textContent = 'Loading character…';

  await loadPlayer();

  cameraSystem = new CameraSystem(camera);
  applyCameraSettings();

  playerController = new PlayerController({
    object: player,
    input: input.input,
    camera: cameraSystem,
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
    updatePlayer(dt);
    playerAnimation?.update(dt);
    updateCamera(dt);
    updateInteraction();
  }

  debug.update({
    dt,
    gameState: gameState.current,
    player: playerController,
    physics: null,
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
