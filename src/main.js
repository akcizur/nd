import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import './style.css';
import { MavonGameplayBridge } from './game/mavonLayer.js';
import { GameState, GameStateManager } from './core/GameState.js';
import { InputManager } from './core/InputManager.js';
import { MobileControls } from './mobile/MobileControls.js';
import { MainMenu } from './ui/MainMenu.js';
import { GameMenu } from './ui/GameMenu.js';
import { SettingsMenu } from './ui/SettingsMenu.js';
import { PlayerController } from './player/PlayerController.js';
import { VehicleController } from './vehicle/VehicleController.js';
import { CameraSystem } from './camera/CameraSystem.js';
import { AnimationSystem } from './animation/AnimationSystem.js';
import { CheckpointSystem } from './game/CheckpointSystem.js';
import { PhysicsWorld } from './physics/PhysicsWorld.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fd7f5);
scene.fog = new THREE.Fog(0x9fd7f5, 70, 240);

const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.1, 600);
camera.position.set(0, 4, 7);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.querySelector('#app').appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xdff4ff, 0x304030, 1.9));
const sun = new THREE.DirectionalLight(0xffffff, 2.4);
sun.position.set(50, 90, 30);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
scene.add(sun);

const world = new THREE.Group();
scene.add(world);
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(320, 320),
  new THREE.MeshStandardMaterial({ color: 0x586158, roughness: 0.96 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
world.add(floor);

const collisionBoxes = [];
function box(x, y, z, w, h, d, color, collision = false) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.86 })
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  world.add(mesh);
  if (collision) {
    collisionBoxes.push(new THREE.Box3(
      new THREE.Vector3(x - w / 2, y - h / 2, z - d / 2),
      new THREE.Vector3(x + w / 2, y + h / 2, z + d / 2)
    ));
  }
  return mesh;
}

for (let i = -120; i <= 120; i += 24) {
  box(0, 0.025, i, 240, 0.05, 9, 0x202020);
  box(i, 0.026, 0, 9, 0.052, 240, 0x202020);
}

const buildingColors = [0x686868, 0x777777, 0x555555, 0x858585];
for (let x = -96; x <= 96; x += 24) {
  for (let z = -96; z <= 96; z += 24) {
    if (Math.abs(x) < 15 || Math.abs(z) < 15) continue;
    const seed = Math.abs((x * 17 + z * 31) | 0);
    const w = 13 + (seed % 5);
    const d = 13 + ((seed >> 3) % 5);
    const h = 6 + (seed % 15);
    box(x, h / 2, z, w, h, d, buildingColors[seed % buildingColors.length], true);
  }
}

// Starter vehicle. E enters/exits when the player is nearby.
const car = new THREE.Group();
const carBody = new THREE.Mesh(
  new THREE.BoxGeometry(1.8, 0.55, 3.6),
  new THREE.MeshStandardMaterial({ color: 0xe2e2e2, metalness: 0.15, roughness: 0.5 })
);
carBody.position.y = 0.65;
carBody.castShadow = true;
car.add(carBody);
const cabin = new THREE.Mesh(
  new THREE.BoxGeometry(1.45, 0.55, 1.65),
  new THREE.MeshStandardMaterial({ color: 0x20252a, roughness: 0.32 })
);
cabin.position.set(0, 1.08, -0.15);
cabin.castShadow = true;
car.add(cabin);

const wheels = [];
for (const x of [-0.82, 0.82]) {
  for (const z of [-1.15, 1.15]) {
    const wheel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.36, 0.22, 16),
      new THREE.MeshStandardMaterial({ color: 0x090909, roughness: 0.9 })
    );
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.4, z);
    wheel.castShadow = true;
    car.add(wheel);
    wheels.push(wheel);
  }
}
car.position.set(0, 0, 5);
world.add(car);

const loader = new GLTFLoader();
const SOLDIER_URL = 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/Soldier.glb';
const GOBKIT_URLS = [
  'https://gobkit.com/freebies/minion/minion-a01.glb',
  'https://gobkit.com/freebies/minion/minion-b01.glb',
  'https://gobkit.com/freebies/minion/minion-c01.glb'
];

let player = null;
let playerAnimation = null;
let playerController = null;
let vehicleController = null;
let cameraSystem = null;
let checkpoints = null;
let physicsWorld = null;
let inVehicle = false;
let interactLocked = false;
let gameplay = null;
let playerPhysics = null;
let vehiclePhysics = null;

async function loadPlayer() {
  const gltf = await loader.loadAsync(SOLDIER_URL);
  player = gltf.scene;
  player.scale.setScalar(1.05);
  player.position.set(0, 0, 1);
  player.traverse(node => {
    if (node.isMesh) {
      node.castShadow = true;
      node.receiveShadow = true;
    }
  });
  world.add(player);
  playerAnimation = new AnimationSystem(player);
  playerAnimation.bind(new THREE.AnimationMixer(player), gltf.animations);
}

const npcs = [];
async function loadNpc(url, position) {
  try {
    const gltf = await loader.loadAsync(url);
    const model = SkeletonUtils.clone(gltf.scene);
    model.position.copy(position);
    model.scale.setScalar(1.1);
    model.traverse(node => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    world.add(model);
    const mixer = new THREE.AnimationMixer(model);
    const master = gltf.animations[0];
    if (master) {
      const idle = THREE.AnimationUtils.subclip(master, 'Idle', 0, 29, 24);
      mixer.clipAction(idle).play();
    }
    npcs.push({ model, mixer, phase: Math.random() * Math.PI * 2 });
  } catch (error) {
    console.warn('NPC asset failed:', error);
  }
}

async function loadCharacters() {
  await loadPlayer();
  await Promise.all(
    GOBKIT_URLS.map((url, index) =>
      loadNpc(url, new THREE.Vector3((index - 1) * 5, 0, -8 - index * 3))
    )
  );
}

const input = new InputManager();
const gameState = new GameStateManager(GameState.MAIN_MENU);
const mobileControls = new MobileControls(input);
let cameraYaw = 0;
let cameraPitch = 0.28;
let settingsReturnState = GameState.MAIN_MENU;

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
const cameraSettings = { sensitivity: 1, invertX: false, invertY: false };
const applyCameraSettings = () => {
  if (!cameraSystem) return;
  cameraSystem.sensitivityX = 1.8 * cameraSettings.sensitivity;
  cameraSystem.sensitivityY = 1.6 * cameraSettings.sensitivity;
  cameraSystem.invertX = cameraSettings.invertX;
  cameraSystem.invertY = cameraSettings.invertY;
};
const settingsMenu = new SettingsMenu({
  onBack: () => closeSettings(),
  inputRouter: input,
  onCameraSettings: settings => {
    Object.assign(cameraSettings, settings);
    applyCameraSettings();
  },
});

const aboutMenu = document.createElement('section');
aboutMenu.className = 'menu-screen about-menu';
aboutMenu.innerHTML = `
  <div class="menu-card">
    <div class="menu-kicker">ND / CITY</div>
    <h2>ABOUT</h2>
    <p>Three.js city driving prototype.</p>
    <p>Keyboard, touch and dynamic mobile camera controls.</p>
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
  if (!player || !car) return;
  if (!inVehicle) physicsWorld?.setCharacterEnabled(playerPhysics, true);
  cameraSystem ||= new CameraSystem(camera);
  playerController ||= new PlayerController({ object: player, input: input.input, camera: cameraSystem, physics: physicsWorld });
  vehicleController ||= new VehicleController({ object: car, wheels, input: input.input, physics: physicsWorld });
  mainMenu.hide();
  aboutMenu.classList.remove('visible');
  settingsMenu.hide();
  gameMenu.close();
  gameMenu.button.classList.remove('hidden');
  mobileControls.root.classList.remove('hidden');
  gameState.set(GameState.PLAYING);
  input.consume('interact');
  input.consume('pause');
}

function resumeGame() {
  gameMenu.close();
  gameState.set(GameState.PLAYING);
}

function restartGame() {
  if (!player) return;
  cameraSystem && (cameraSystem.yaw = 0, cameraSystem.pitch = .28);
  vehicleController && (vehicleController.speed = 0);
  physicsWorld?.setCharacterEnabled(playerPhysics, true);
  physicsWorld?.resetObject(player, playerPhysics, new THREE.Vector3(0, 0, 1), 0);
  playerController && (playerController.velocityY = 0, playerController.grounded = true);
  physicsWorld?.resetObject(car, vehiclePhysics, new THREE.Vector3(0, 0, 5), 0);
  vehicleController && (vehicleController.speed = 0, vehicleController.yaw = 0);
  player.rotation.set(0, 0, 0);
  player.visible = true;
  car.userData.speed = 0;
  inVehicle = false;
  document.body.classList.remove('vehicle-mode');
  gameMenu.close();
  gameState.set(GameState.PLAYING);
}

function returnToMainMenu() {
  if (inVehicle) {
    inVehicle = false;
    player.visible = true;
    physicsWorld?.setCharacterEnabled(playerPhysics, true);
    physicsWorld?.resetObject(player, playerPhysics, new THREE.Vector3(0, 0, 1), 0);
    physicsWorld?.resetObject(car, vehiclePhysics, new THREE.Vector3(0, 0, 5), 0);
    vehicleController && (vehicleController.speed = 0, vehicleController.yaw = 0);
    document.body.classList.remove('vehicle-mode');
    mobileControls.setVehicleMode(false);
  }
  gameMenu.close();
  gameMenu.button.classList.add('hidden');
  mobileControls.root.classList.add('hidden');
  gameState.set(GameState.MAIN_MENU);
  mainMenu.show();
}

gameState.onChange(state => {
  document.body.dataset.gameState = state;
  if (state !== GameState.PLAYING) mobileControls.root.classList.add('hidden');
  else mobileControls.root.classList.remove('hidden');
});

const hudObjective = document.querySelector('#objective');
const hudSpeed = document.querySelector('#speed');
const hudHint = document.querySelector('#hint');

function blocked(position, radius = 0.42, height = 1.9) {
  const playerBox = new THREE.Box3(
    new THREE.Vector3(position.x - radius, 0, position.z - radius),
    new THREE.Vector3(position.x + radius, height, position.z + radius)
  );
  return collisionBoxes.some(item => playerBox.intersectsBox(item));
}

function nearCar() {
  if (!player || inVehicle) return false;
  const dx = player.position.x - car.position.x;
  const dz = player.position.z - car.position.z;
  return Math.hypot(dx, dz) < 4.4;
}

function toggleVehicle() {
  if (!player || interactLocked) return;
  if (inVehicle) {
    exitVehicle();
  } else if (nearCar()) {
    enterVehicle();
  }
}

function enterVehicle() {
  interactLocked = true;
  inVehicle = true;
  gameplay?.enterVehicle();
  player.visible = false;
  physicsWorld?.resetObject(player, playerPhysics, car.position.clone(), car.rotation.y);
  physicsWorld?.setCharacterEnabled(playerPhysics, false);
  car.userData.speed = 0;
  hudObjective.textContent = 'Vehicle · řízení aktivní';
  hudHint.textContent = 'WASD / šipky · E = vystoupit';
  document.body.classList.add('vehicle-mode');
  mobileControls.setVehicleMode(true);
  setTimeout(() => { interactLocked = false; }, 180);
}

function exitVehicle() {
  interactLocked = true;
  const side = new THREE.Vector3(2.1, 0, 0).applyQuaternion(car.quaternion);
  const exitPosition = car.position.clone().add(side);
  if (blocked(exitPosition, 0.4, 1.9)) {
    side.multiplyScalar(-1);
    exitPosition.copy(car.position).add(side);
  }
  physicsWorld?.setCharacterEnabled(playerPhysics, true);
  physicsWorld?.resetObject(player, playerPhysics, exitPosition, car.rotation.y);
  gameplay?.exitVehicle(exitPosition);
  player.rotation.y = car.rotation.y;
  player.visible = true;
  inVehicle = false;
  car.userData.speed = 0;
  hudObjective.textContent = 'Player ready · Chůze / běh';
  hudHint.textContent = 'WASD / šipky · Shift = běh · E = nastoupit';
  document.body.classList.remove('vehicle-mode');
  mobileControls.setVehicleMode(false);
  setTimeout(() => { interactLocked = false; }, 180);
}

function updatePlayer(dt) {
  if (!player || inVehicle || !playerController) return;
  playerController.update(dt);
  const state = playerController.state;
  const animationMap = { idle:'idle', walk:'walk', run:'run', sprint:'run', crouch:'walk', jump:'run', fall:'run' };
  playerAnimation?.play(animationMap[state] || 'idle');
  hudSpeed.textContent = state.toUpperCase() + ' · ' + Math.round((playerController.input.move.length()) * (state === 'sprint' ? 8 : state === 'run' ? 6.2 : 3.8) * 10) / 10 + ' m/s';
}

function updateVehicle(dt) {
  if (!inVehicle || !vehicleController) return;
  vehicleController.update(dt);
  car.userData.speed = vehicleController.speed;
  carBody.rotation.z = vehicleController.bodyRoll;
  carBody.rotation.x = vehicleController.bodyPitch;
  cabin.rotation.z = vehicleController.bodyRoll * .8;
  cabin.rotation.x = vehicleController.bodyPitch * .7;
  for (const wheel of wheels) {
    wheel.rotation.x = wheel.userData.lastSpin ?? wheel.rotation.x;
    wheel.rotation.y = wheel.userData.steer ?? 0;
  }
  hudSpeed.textContent = 'AUTO · ' + Math.round(Math.abs(vehicleController.speed) * 3.6) + ' KM/H';
}

function updateNpcs(dt) {
  for (const npc of npcs) {
    npc.mixer.update(dt);
    npc.model.rotation.y += Math.sin(performance.now() * 0.0006 + npc.phase) * 0.0004;
  }
}

function updateCamera(dt) {
  if (!cameraSystem) return;
  cameraSystem.update(dt, {
    subject: inVehicle ? car : player,
    vehicle: inVehicle,
    input: input.input,
    speed: inVehicle ? vehicleController?.speed || 0 : 0,
    collisionTest: blocked,
  });
}

function updateInteractionHud() {
  if (input.consume('interact')) toggleVehicle();
  if (input.consume('pause') && gameState.current === GameState.PLAYING) {
    gameState.set(GameState.PAUSED);
    gameMenu.open();
  }
  if (inVehicle) return;
  if (nearCar()) {
    hudObjective.textContent = 'E · nastoupit do auta';
    hudHint.textContent = 'E / dotykové tlačítko · nastoupit';
  } else {
    hudObjective.textContent = 'Volný pohyb městem';
    hudHint.textContent = 'WASD / šipky · Shift = běh · přibliž se k autu';
  }
}

const clock = new THREE.Clock();
async function start() {
  hudObjective.textContent = 'Loading city…';
  physicsWorld = await PhysicsWorld.create();
  physicsWorld.addGround(320);
  for (const box of collisionBoxes) {
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    physicsWorld.addStaticBox(center.x, center.y, center.z, size.x, size.y, size.z);
  }
  await loadCharacters();
  cameraSystem = new CameraSystem(camera);
  applyCameraSettings();
  playerController = new PlayerController({ object: player, input: input.input, camera: cameraSystem, physics: physicsWorld });
  vehicleController = new VehicleController({ object: car, wheels, input: input.input, physics: physicsWorld });
  playerPhysics = physicsWorld.createCharacter(player);
  vehiclePhysics = physicsWorld.createVehicle(car);
  playerController.bindPhysics(playerPhysics);
  vehicleController.bindPhysics(vehiclePhysics);
  physicsWorld.step(1 / 60);
  physicsWorld.syncObject(player, playerPhysics);
  physicsWorld.syncObject(car, vehiclePhysics);
  checkpoints = new CheckpointSystem(scene, [[0, .05, -24], [48, .05, -48], [72, .05, 24], [-48, .05, 48], [-72, .05, -24]]);
  gameplay = new MavonGameplayBridge({ player, vehicle: car });
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
      updatePlayer(fixedDt);
      updateVehicle(fixedDt);
    });
    physicsWorld?.syncObject(player, playerPhysics);
    vehicleController?.syncFromPhysics();
    playerAnimation?.update(dt);
    updateNpcs(dt);
    updateInteractionHud();
    const missionPosition = inVehicle ? car.position : player.position;
    if (checkpoints?.update(missionPosition)) hudObjective.textContent = 'MISSION COMPLETE · FREE ROAM';
    updateCamera(dt);
  }
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
