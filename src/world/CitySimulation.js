import * as THREE from 'three';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function makeTrafficCar(seed = 0) {
  const root = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.55, 0.48, 3.05),
    new THREE.MeshStandardMaterial({
      color: [0xc94b4b, 0x4c72b8, 0xe0b84c, 0xeeeeee, 0x555c66][seed % 5],
      roughness: 0.48,
      metalness: 0.08,
    })
  );
  body.position.y = 0.46;
  body.castShadow = true;
  root.add(body);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.25, 0.42, 1.45),
    new THREE.MeshStandardMaterial({ color: 0x1e252b, roughness: 0.28 })
  );
  cabin.position.set(0, 0.79, -0.12);
  cabin.castShadow = true;
  root.add(cabin);

  for (const x of [-0.69, 0.69]) {
    for (const z of [-0.96, 0.96]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.28, 0.16, 12),
        new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 })
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.28, z);
      wheel.castShadow = true;
      root.add(wheel);
    }
  }
  root.userData.wheelSpin = 0;
  return root;
}

export class CitySimulation {
  constructor(world, { trafficCount = 14, pedestrianCount = 18 } = {}) {
    this.world = world;
    this.traffic = [];
    this.pedestrians = [];
    this.clock = 0;
    this.trafficCount = trafficCount;
    this.pedestrianCount = pedestrianCount;
    this.trafficGroup = new THREE.Group();
    this.pedestrianGroup = new THREE.Group();
    this.trafficGroup.name = 'MavonTraffic';
    this.pedestrianGroup.name = 'MavonPedestrians';
    world.add(this.trafficGroup, this.pedestrianGroup);
  }

  init() {
    this._buildTraffic();
    this._buildPedestrians();
  }

  _buildTraffic() {
    const lanes = [];
    for (let i = -120; i <= 120; i += 24) {
      lanes.push({ axis: 'x', value: i, direction: i % 48 === 0 ? 1 : -1 });
      lanes.push({ axis: 'z', value: i, direction: i % 48 === 0 ? -1 : 1 });
    }

    for (let i = 0; i < this.trafficCount; i++) {
      const lane = lanes[i % lanes.length];
      const offset = ((i * 37) % 240) - 120;
      const car = makeTrafficCar(i);
      const speed = 4.5 + (i % 5) * 0.8;
      car.userData.route = lane;
      car.userData.speed = speed;
      car.userData.distance = offset;
      this._placeTrafficCar(car);
      this.trafficGroup.add(car);
      this.traffic.push(car);
    }
  }

  _placeTrafficCar(car) {
    const route = car.userData.route;
    const d = car.userData.distance;
    if (route.axis === 'x') {
      car.position.set(d, 0, route.value + (route.direction > 0 ? -2.1 : 2.1));
      car.rotation.y = route.direction > 0 ? -Math.PI / 2 : Math.PI / 2;
    } else {
      car.position.set(route.value + (route.direction > 0 ? 2.1 : -2.1), 0, d);
      car.rotation.y = route.direction > 0 ? 0 : Math.PI;
    }
  }

  _buildPedestrians() {
    const colors = [0x3d6e8f, 0x8f573d, 0x6c4d88, 0x7b7b45, 0x3e6e57];
    for (let i = 0; i < this.pedestrianCount; i++) {
      const root = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.22, 0.62, 4, 8),
        new THREE.MeshStandardMaterial({ color: colors[i % colors.length], roughness: 0.86 })
      );
      body.position.y = 0.55;
      body.castShadow = true;
      root.add(body);

      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 12, 8),
        new THREE.MeshStandardMaterial({ color: 0xd2a37b, roughness: 0.92 })
      );
      head.position.y = 1.06;
      head.castShadow = true;
      root.add(head);

      const axis = i % 2 === 0 ? 'x' : 'z';
      const value = -108 + (i * 19) % 216;
      root.userData.axis = axis;
      root.userData.value = value;
      root.userData.distance = -100 + (i * 31) % 200;
      root.userData.speed = 0.65 + (i % 4) * 0.12;
      this._placePedestrian(root);
      this.pedestrianGroup.add(root);
      this.pedestrians.push(root);
    }
  }

  _placePedestrian(ped) {
    const { axis, value, distance } = ped.userData;
    if (axis === 'x') {
      ped.position.set(distance, 0, value + (value >= 0 ? 5.2 : -5.2));
      ped.rotation.y = distance >= 0 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      ped.position.set(value + (value >= 0 ? 5.2 : -5.2), 0, distance);
      ped.rotation.y = distance >= 0 ? 0 : Math.PI;
    }
  }

  update(dt) {
    this.clock += dt;

    for (const car of this.traffic) {
      const route = car.userData.route;
      car.userData.distance += car.userData.speed * route.direction * dt;
      if (car.userData.distance > 125) car.userData.distance = -125;
      if (car.userData.distance < -125) car.userData.distance = 125;
      this._placeTrafficCar(car);
      car.userData.wheelSpin += car.userData.speed * dt * 2.4;
      for (const wheel of car.children) {
        if (wheel.geometry?.type === 'CylinderGeometry') wheel.rotation.x = car.userData.wheelSpin;
      }
    }

    for (const ped of this.pedestrians) {
      const routeLength = 216;
      ped.userData.distance += ped.userData.speed * dt;
      if (ped.userData.distance > 108) ped.userData.distance = -108;
      this._placePedestrian(ped);
      ped.position.y = Math.sin(this.clock * 8 + ped.userData.value) * 0.015;
    }
  }

  dispose() {
    this.trafficGroup.removeFromParent();
    this.pedestrianGroup.removeFromParent();
    this.traffic.length = 0;
    this.pedestrians.length = 0;
  }
}
