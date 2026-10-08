import * as THREE from 'three';

export function createSimpleCar() {
  const root = new THREE.Group();
  root.name = 'PlayerVehicle';

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2e5c93, roughness: 0.34, metalness: 0.5 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x15191d, roughness: 0.55, metalness: 0.2 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x243b4e, roughness: 0.14, metalness: 0.3, transparent: true, opacity: 0.82 });
  const lightMat = new THREE.MeshStandardMaterial({ color: 0xf4f0cf, emissive: 0xffe6a0, emissiveIntensity: 1.1 });
  const brakeMat = new THREE.MeshStandardMaterial({ color: 0x2b0909, emissive: 0x320000, emissiveIntensity: 0 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.48, 3.65), bodyMat);
  body.position.y = 0.55;
  root.add(body);

  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.16, 1.05), bodyMat);
  hood.position.set(0, 0.82, 1.15);
  root.add(hood);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.62, 1.8), trimMat);
  cabin.position.set(0, 0.95, -0.10);
  root.add(cabin);

  const windows = new THREE.Mesh(new THREE.BoxGeometry(1.43, 0.46, 1.52), glassMat);
  windows.position.set(0, 1.01, -0.10);
  root.add(windows);

  const frontLights = [];
  const rearLights = [];
  for (const x of [-0.62, 0.62]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.12, 0.06), lightMat);
    head.position.set(x, 0.67, 1.86);
    root.add(head);
    frontLights.push(head);

    const brake = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.11, 0.06), brakeMat);
    brake.position.set(x, 0.68, -1.86);
    root.add(brake);
    rearLights.push(brake);
  }

  const wheels = [];
  for (const x of [-0.98, 0.98]) {
    for (const z of [-1.22, 1.22]) {
      const holder = new THREE.Group();
      holder.position.set(x, 0.38, z);
      holder.userData.baseY = holder.position.y;

      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.32, 0.20, 12),
        trimMat
      );
      wheel.rotation.z = Math.PI / 2;
      holder.add(wheel);
      root.add(holder);
      wheels.push(holder);
    }
  }

  root.userData.vehicle = {
    wheels,
    brakeLights: rearLights,
    frontLights,
  };

  root.traverse(node => {
    if (node.isMesh) {
      node.castShadow = true;
      node.receiveShadow = true;
    }
  });

  return root;
}
