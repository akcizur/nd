import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { SkeletonUtils } from 'three/examples/jsm/utils/SkeletonUtils.js';
import './style.css';

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

// Parked starter vehicle: the next interaction step can bind E/touch to enter it.
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
let playerMixer = null;
const playerActions = {};
let playerState = 'Idle';

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

  playerMixer = new THREE.AnimationMixer(player);
  for (const clip of gltf.animations) {
    if (['Idle', 'Walk', 'Run'].includes(clip.name)) {
      playerActions[clip.name] = playerMixer.clipAction(clip);
    }
  }

  playPlayerAnimation('Idle');
}

function playPlayerAnimation(name) {
  if (!playerMixer || !playerActions[name] || playerState === name) return;
  const next = playerActions[name];
  const current = playerActions[playerState];

  if (current) current.fadeOut(0.18);
  next.reset().fadeIn(0.18).play();
  playerState = name;
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

const keys = Object.create(null);
const touchState = { accelerate: false, reverse: false, left: false, right: false };

addEventListener('keydown', event => {
  keys[event.code] = true;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
    event.preventDefault();
  }
});

addEventListener('keyup', event => { keys[event.code] = false; });

document.querySelectorAll('[data-control]').forEach(button => {
  const control = button.dataset.control;
  const set = value => {
    touchState[control] = value;
    button.classList.toggle('active', value);
  };

  button.addEventListener('pointerdown', event => {
    event.preventDefault();
    button.setPointerCapture?.(event.pointerId);
    set(true);
  });
  button.addEventListener('pointerup', () => set(false));
  button.addEventListener('pointercancel', () => set(false));
  button.addEventListener('pointerleave', () => set(false));
});

const hudObjective = document.querySelector('#objective');
const hudSpeed = document.querySelector('#speed');

function blocked(position) {
  const playerBox = new THREE.Box3(
    new THREE.Vector3(position.x - 0.42, 0, position.z - 0.42),
    new THREE.Vector3(position.x + 0.42, 1.9, position.z + 0.42)
  );
  return collisionBoxes.some(box => playerBox.intersectsBox(box));
}

function updatePlayer(dt) {
  if (!player) return;

  const x =
    (keys.KeyD || keys.ArrowRight || touchState.right ? 1 : 0) -
    (keys.KeyA || keys.ArrowLeft || touchState.left ? 1 : 0);
  const z =
    (keys.KeyS || keys.ArrowDown || touchState.reverse ? 1 : 0) -
    (keys.KeyW || keys.ArrowUp || touchState.accelerate ? 1 : 0);

  const input = new THREE.Vector2(x, z);
  const moving = input.lengthSq() > 0;
  if (moving) input.normalize();

  const speed = keys.ShiftLeft || keys.ShiftRight ? 6.2 : 3.8;
  const move = new THREE.Vector3(input.x, 0, input.y);
  const next = player.position.clone().addScaledVector(move, speed * dt);

  if (!blocked(next)) player.position.copy(next);

  if (moving) {
    const targetAngle = Math.atan2(input.x, input.y);
    player.rotation.y = THREE.MathUtils.lerp(player.rotation.y, targetAngle, 0.18);
  }

  playPlayerAnimation(moving ? (speed > 5 ? 'Run' : 'Walk') : 'Idle');
  hudSpeed.textContent = moving ? (speed > 5 ? 'Běh' : 'Chůze') + ' · ' + Math.round(speed * 10) / 10 + ' m/s' : 'Stojí · Idle';
}

function updateNpcs(dt) {
  for (const npc of npcs) {
    npc.mixer.update(dt);
    npc.model.rotation.y += Math.sin(performance.now() * 0.0006 + npc.phase) * 0.0004;
  }
}

function updateCamera() {
  if (!player) return;

  const desired = new THREE.Vector3(0, 3.6, 6.5)
    .applyQuaternion(player.quaternion)
    .add(player.position);

  camera.position.lerp(desired, 0.1);

  const target = new THREE.Vector3(0, 1.1, 0)
    .applyQuaternion(player.quaternion)
    .add(player.position);

  camera.lookAt(target);
}

const clock = new THREE.Clock();

async function start() {
  hudObjective.textContent = 'Načítám character pack…';
  await loadCharacters();
  hudObjective.textContent = 'Player ready · Chůze / běh';
  animate();
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  playerMixer?.update(dt);
  updatePlayer(dt);
  updateNpcs(dt);
  updateCamera();

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

