import * as THREE from 'three';
import './style.css';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(8, 7, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
document.querySelector('#app').appendChild(renderer.domElement);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(20, 40, 20);
dirLight.castShadow = true;
scene.add(dirLight);
scene.add(new THREE.AmbientLight(0xffffff, 0.4));

const grid = new THREE.GridHelper(200, 50, 0xff0000, 0x444444);
grid.position.y = 0.01;
scene.add(grid);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.MeshStandardMaterial({ color: 0x222222 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const player = new THREE.Mesh(
  new THREE.BoxGeometry(1, 2, 1),
  new THREE.MeshStandardMaterial({ color: 0x00ff00 })
);
player.position.y = 1;
player.castShadow = true;
scene.add(player);

const keys = Object.create(null);
window.addEventListener('keydown', (event) => {
  keys[event.code] = true;
});
window.addEventListener('keyup', (event) => {
  keys[event.code] = false;
});

const clock = new THREE.Clock();

function updatePlayer(delta) {
  const speed = 9 * delta;

  if (keys.KeyW || keys.ArrowUp) player.position.z -= speed;
  if (keys.KeyS || keys.ArrowDown) player.position.z += speed;
  if (keys.KeyA || keys.ArrowLeft) player.position.x -= speed;
  if (keys.KeyD || keys.ArrowRight) player.position.x += speed;

  player.position.x = THREE.MathUtils.clamp(player.position.x, -99, 99);
  player.position.z = THREE.MathUtils.clamp(player.position.z, -99, 99);
}

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.05);
  updatePlayer(delta);

  camera.position.x = THREE.MathUtils.lerp(
    camera.position.x,
    player.position.x + 8,
    0.08
  );
  camera.position.z = THREE.MathUtils.lerp(
    camera.position.z,
    player.position.z + 10,
    0.08
  );
  camera.lookAt(player.position.x, player.position.y, player.position.z);

  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

animate();
