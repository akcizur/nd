import * as THREE from 'three';
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
import { ProceduralCharacterAnimation } from './animation/ProceduralCharacterAnimation.js';
import { createSimpleHumanoid } from './player/SimpleHumanoid.js';
import { PhysicsWorld } from './physics/PhysicsWorld.js';
import { InteractionSystem } from './interaction/InteractionSystem.js';

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
function addPhysicsBox({ x, y, z, width, height, depth, interaction = null }) {
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

  if (interaction) {
    mesh.userData.interaction = interaction;
  }

  testObstacles.push(mesh);
  return mesh;
}

let player = null;
let playerVisual = null;
let playerCollider = null;
let playerAnimation = null;
let playerController = null;
let cameraSystem = null;
let physicsWorld = null;
let playerPhysics = null;
let interactionSystem = null;
const testObstacles = [];

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

  // The procedural character is authored with Three.js -Z as its forward axis,
  // matching the controller and camera conventions. No asset-specific yaw fix is needed.
  model.rotation.y = 0;
  model.userData.forwardYawOffset = 0;

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

async function loadPlayer() {
  // Primary runtime character: lightweight, self-contained, and deterministic.
  // No third-party model download is required, so GitHub Pages works offline after the page loads.
  const { model } = createSimpleHumanoid();

  createPlayerRig(model, 1.8);
  playerAnimation = new ProceduralCharacterAnimation(playerVisual);

  console.info('[PLAYER] Procedural humanoid loaded', {
    model: 'simple-low-poly',
    animations: 'procedural',
    externalRuntimeAssets: false,
  });

  return;
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

  const speed = playerController.horizontalSpeed;

  playerAnimation?.updateLocomotion({
    speed,
    maxSpeed: playerController.sprintSpeed,
    grounded: playerController.grounded,
    verticalVelocity: playerController.velocityY,
    strafe: playerController.animationInput.strafe,
    forward: playerController.animationInput.forward,
    sprinting: Boolean(playerController.input.sprint),
    crouched: Boolean(playerController.input.crouch),
    walkSpeed: playerController.walkSpeed,
    runSpeed: playerController.runSpeed,
    sprintSpeed: playerController.sprintSpeed,
    justLanded: playerController.justLanded,
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
    return;
  }

  const target = interactionSystem?.update({ maxDistance: 3 });
  const prompt = target?.data?.prompt;

  hudObjective.textContent = target
    ? prompt || 'Interact'
    : 'Third-person movement';

  hudHint.textContent = target
    ? 'E · interakce'
    : 'WASD · SHIFT běh · RMB kamera';

  if (target && input.consume('interact')) {
    target.data.action?.(target);
  }
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

  interactionSystem = new InteractionSystem({
    camera,
    maxDistance: 3,
  });
  interactionSystem.setRoot(world);

  const obstacleA = testObstacles[0];
  const obstacleB = testObstacles[1];

  if (obstacleA) {
    interactionSystem.register(obstacleA, {
      prompt: 'Physical obstacle',
      action: ({ object }) => {
        console.info('[INTERACTION] obstacle A', object.name);
      },
    });
  }

  if (obstacleB) {
    interactionSystem.register(obstacleB, {
      prompt: 'Physical obstacle',
      action: ({ object }) => {
        console.info('[INTERACTION] obstacle B', object.name);
      },
    });
  }

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

    updatePlayer(dt);
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
