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
import { CityBuilder } from './world/CityBuilder.js';
import { CitySimulation } from './world/CitySimulation.js';
import { createSimpleCar } from './vehicle/SimpleCar.js';
import { VehicleController } from './vehicle/VehicleController.js';

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
  new THREE.PlaneGeometry(430, 430),
  new THREE.MeshStandardMaterial({
    color: 0x303030,
    roughness: 0.94,
    metalness: 0,
  })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
world.add(ground);

// The city itself is the visual navigation grid; avoid a debug grid in production.
: they make the capsule controller's
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
let cityBuilder = null;
let citySimulation = null;
let vehicle = null;
let vehicleController = null;
let vehiclePhysics = null;
let inVehicle = false;
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
    <div class="menu-kicker">ND / CITY</div>
    <h2>THIRD PERSON</h2>
    <p>Lightweight open-city browser sandbox.</p>
    <p>Walk, sprint, crouch, enter a car and explore.</p>
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

  inVehicle = false;
  player.visible = true;
  mobileControls.setVehicleMode(false);
  playerController.reset(new THREE.Vector3(0, 0, 8), 0);
  vehicleController?.reset(new THREE.Vector3(0, 0, 4), 0);
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
  inVehicle = false;
  player.visible = true;
  mobileControls.setVehicleMode(false);
  playerController.reset(new THREE.Vector3(0, 0, 8), 0);
  vehicleController?.reset(new THREE.Vector3(0, 0, 4), 0);
  cameraSystem.reset(player);
  gameMenu.close();
  gameState.set(GameState.PLAYING);
}

function enterVehicle() {
  if (!vehicleController || !vehicleController.isNearby(player.position)) return;
  inVehicle = true;
  player.visible = false;
  mobileControls.setVehicleMode(true);
  cameraSystem.reset(vehicle);
}

function exitVehicle() {
  if (!vehicleController) return;
  const exit = vehicleController.getExitPosition();
  inVehicle = false;
  playerController.reset(exit, vehicle.rotation.y);
  player.visible = true;
  mobileControls.setVehicleMode(false);
  cameraSystem.reset(player);
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
  const subject = inVehicle ? vehicle : player;
  const speed = inVehicle
    ? Math.abs(vehicleController?.speed || 0)
    : playerController?.horizontalSpeed || 0;

  cameraSystem?.update(dt, {
    subject,
    vehicle: inVehicle,
    input: input.input,
    speed,
  });
}

function updateInteraction() {
  if (gameState.current !== GameState.PLAYING) return;

  if (input.consume('pause')) {
    gameState.set(GameState.PAUSED);
    gameMenu.open();
    return;
  }

  if (input.consume('interact')) {
    if (inVehicle) {
      exitVehicle();
      return;
    }

    if (vehicleController?.isNearby(player.position)) {
      enterVehicle();
      return;
    }

    const target = interactionSystem?.update({ maxDistance: 3 });
    target?.data?.action?.(target);
    return;
  }

  const target = interactionSystem?.update({ maxDistance: 3 });
  const nearCar = !inVehicle && vehicleController?.isNearby(player.position);

  hudObjective.textContent = nearCar
    ? 'Vehicle ready'
    : target
      ? target.data?.prompt || 'Interact'
      : inVehicle
        ? 'Driving'
        : 'Explore the city';

  hudHint.textContent = inVehicle
    ? 'W/S · throttle · A/D · steer · J · handbrake · E · exit'
    : nearCar
      ? 'E · enter vehicle'
      : 'WASD · SHIFT sprint · C crouch · SPACE jump · RMB camera';
}

const clock = new THREE.Clock();

async function start() {
  hudObjective.textContent = 'Building city…';

  physicsWorld = await PhysicsWorld.create();
  physicsWorld.addGround(430);

  cityBuilder = new CityBuilder(world, physicsWorld);
  cityBuilder.build({
    blocks: 7,
    blockSize: 26,
    roadWidth: 9,
    seed: 42,
  });

  citySimulation = new CitySimulation(world, {
    trafficCount: 16,
    pedestrianCount: 20,
  });
  citySimulation.init();

  await loadPlayer();

  vehicle = createSimpleCar();
  vehicle.position.set(0, 0, 4);
  world.add(vehicle);
  vehiclePhysics = physicsWorld.createVehicle(vehicle);
  vehicleController = new VehicleController({
    object: vehicle,
    wheels: vehicle.userData.vehicle.wheels,
    input: input.input,
    physics: physicsWorld,
  });
  vehicleController.bindPhysics(vehiclePhysics);

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

  playerController = new PlayerController({
    object: player,
    input: input.input,
    camera: cameraSystem,
    physicsWorld,
    physicsCharacter: playerPhysics,
    movementSettings,
  });

  playerController.reset(new THREE.Vector3(0, 0, 8), 0);
  vehicleController.reset(new THREE.Vector3(0, 0, 4), 0);
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
    if (inVehicle) {
      vehicleController?.update(dt);
    }

    physicsWorld?.step(dt, fixedDt => {
      if (!inVehicle) playerController?.fixedUpdate(fixedDt);
    });

    if (!inVehicle && playerPhysics) {
      physicsWorld?.syncObject(player, playerPhysics);
    }

    if (inVehicle && vehiclePhysics) {
      vehicleController?.syncFromPhysics();
    }

    citySimulation?.update(dt);
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
    vehicle: inVehicle ? vehicleController : null,
    inVehicle,
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
