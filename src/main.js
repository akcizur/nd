import * as THREE from 'three';
import './style.css';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 45, 180);

const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.1, 500);
camera.position.set(8, 6, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.querySelector('#app').appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xbfe8ff, 0x303030, 1.8));

const sun = new THREE.DirectionalLight(0xffffff, 2);
sun.position.set(40, 70, 25);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
scene.add(sun);

const world = new THREE.Group();
scene.add(world);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(240, 240),
  new THREE.MeshStandardMaterial({ color: 0x242424, roughness: 0.95 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
world.add(floor);

function box(x, y, z, w, h, d, color) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.85 })
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  world.add(mesh);
  return mesh;
}

function road(x, z, w, d) {
  const r = box(x, 0.025, z, w, 0.05, d, 0x171717);
  r.receiveShadow = true;
}

road(0, 0, 240, 12);
road(0, 0, 12, 240);
road(0, 36, 240, 8);
road(0, -36, 240, 8);
road(36, 0, 8, 240);
road(-36, 0, 8, 240);

const buildingColors = [0x686868, 0x777777, 0x555555, 0x858585];

for (let x = -84; x <= 84; x += 24) {
  for (let z = -84; z <= 84; z += 24) {
    if (Math.abs(x) < 15 || Math.abs(z) < 15 || Math.abs(x) < 45 && Math.abs(z) < 45 && (x === 36 || z === 36 || x === -36 || z === -36)) continue;
    const w = 14 + ((Math.abs(x + z) * 3) % 5);
    const d = 14 + ((Math.abs(x - z) * 2) % 5);
    const h = 5 + ((Math.abs(x * 7 + z * 3)) % 16);
    box(x, h / 2, z, w, h, d, buildingColors[Math.abs(x + z) % buildingColors.length]);
  }
}

const car = new THREE.Group();
const body = new THREE.Mesh(
  new THREE.BoxGeometry(1.8, 0.55, 3.6),
  new THREE.MeshStandardMaterial({ color: 0xdedede, metalness: 0.15, roughness: 0.5 })
);
body.position.y = 0.65;
body.castShadow = true;
car.add(body);

const cabin = new THREE.Mesh(
  new THREE.BoxGeometry(1.45, 0.55, 1.65),
  new THREE.MeshStandardMaterial({ color: 0x20252a, metalness: 0.1, roughness: 0.35 })
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

const keys = Object.create(null);
addEventListener('keydown', e => { keys[e.code] = true; });
addEventListener('keyup', e => { keys[e.code] = false; });

const clock = new THREE.Clock();
const velocity = new THREE.Vector3();

function updateCar(dt) {
  const throttle = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
  const steer = (keys.KeyA || keys.ArrowLeft ? 1 : 0) - (keys.KeyD || keys.ArrowRight ? 1 : 0);

  const acceleration = 18;
  const maxSpeed = 20;
  const reverseSpeed = 8;

  velocity.z += throttle * acceleration * dt;
  velocity.z *= Math.pow(0.04, dt);
  velocity.z = THREE.MathUtils.clamp(velocity.z, -reverseSpeed, maxSpeed);

  const direction = velocity.z >= 0 ? 1 : -1;
  car.rotation.y += steer * direction * 1.7 * dt * Math.min(Math.abs(velocity.z) / 6, 1);

  const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(car.quaternion);
  car.position.addScaledVector(forward, velocity.z * dt);

  car.position.x = THREE.MathUtils.clamp(car.position.x, -112, 112);
  car.position.z = THREE.MathUtils.clamp(car.position.z, -112, 112);
}

function updateCamera() {
  const desired = new THREE.Vector3(0, 5.5, -9).applyQuaternion(car.quaternion).add(car.position);
  camera.position.lerp(desired, 0.08);

  const target = new THREE.Vector3(0, 1, 3).applyQuaternion(car.quaternion).add(car.position);
  camera.lookAt(target);
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  updateCar(dt);
  updateCamera();
  renderer.render(scene, camera);
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
});

animate();
