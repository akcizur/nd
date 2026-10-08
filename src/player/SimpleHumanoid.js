import * as THREE from 'three';

function mat(color, roughness = 0.82, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function capsule(radius, length, material) {
  const mesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(radius, length, 4, 8),
    material
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function box(size, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function ico(radius, detail, material) {
  const mesh = new THREE.Mesh(
    new THREE.IcosahedronGeometry(radius, detail),
    material
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function joint(name, position = [0, 0, 0]) {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(...position);
  return group;
}

export function createSimpleHumanoid() {
  const model = new THREE.Group();
  model.name = 'SimpleOpenCharacter';
  model.userData.characterSource = 'ND procedural CC0-compatible runtime model';
  model.userData.forwardAxis = '-Z';

  const skin = mat(0xd7a27a);
  const skinDark = mat(0xb97855);
  const shirt = mat(0x2f5f93);
  const shirtLight = mat(0x4f82bd);
  const pants = mat(0x263342);
  const shoe = mat(0x171b22);
  const hair = mat(0x20242a);
  const accent = mat(0xe9b949);
  const eye = mat(0x101820, 0.45);

  const hips = joint('Hips', [0, 0.96, 0]);
  const spine = joint('Spine', [0, 0.17, 0]);
  const chest = joint('Chest', [0, 0.29, 0]);
  const neck = joint('Neck', [0, 0.30, 0]);
  const head = joint('Head', [0, 0.12, 0]);

  const pelvis = box([0.40, 0.26, 0.25], pants);
  pelvis.position.y = 0.0;
  hips.add(pelvis);

  const torso = capsule(0.245, 0.43, shirt);
  torso.position.y = 0.18;
  torso.scale.z = 0.82;
  chest.add(torso);

  const chestPanel = box([0.25, 0.26, 0.018], shirtLight);
  chestPanel.position.set(0, 0.19, -0.205);
  chest.add(chestPanel);

  const neckMesh = capsule(0.075, 0.06, skin);
  neckMesh.position.y = -0.02;
  neck.add(neckMesh);

  const skull = ico(0.225, 2, skin);
  skull.scale.set(1, 1.08, 0.96);
  head.add(skull);

  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.235, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.48),
    hair
  );
  hairCap.position.y = 0.035;
  hairCap.scale.set(1, 0.94, 1.02);
  hairCap.castShadow = true;
  head.add(hairCap);

  for (const side of [-1, 1]) {
    const eyeMesh = ico(0.026, 1, eye);
    eyeMesh.scale.set(1, 0.8, 0.65);
    eyeMesh.position.set(0.075 * side, 0.025, -0.208);
    head.add(eyeMesh);
  }

  hips.add(spine);
  spine.add(chest);
  chest.add(neck);
  neck.add(head);

  const shoulders = {
    left: joint('Shoulder_L', [-0.29, 0.18, 0]),
    right: joint('Shoulder_R', [0.29, 0.18, 0]),
  };
  chest.add(shoulders.left, shoulders.right);

  const upperArm = {
    left: joint('UpperArm_L'),
    right: joint('UpperArm_R'),
  };
  const forearm = {
    left: joint('Forearm_L'),
    right: joint('Forearm_R'),
  };
  const hand = {
    left: joint('Hand_L'),
    right: joint('Hand_R'),
  };

  for (const side of [-1, 1]) {
    const key = side < 0 ? 'left' : 'right';
    upperArm[key].add(capsule(0.082, 0.24, shirt));
    upperArm[key].children[0].position.y = -0.17;
    forearm[key].position.y = -0.35;
    forearm[key].add(capsule(0.071, 0.22, skinDark));
    forearm[key].children[0].position.y = -0.15;
    hand[key].position.y = -0.34;
    hand[key].add(ico(0.075, 1, skin));
    shoulders[key].add(upperArm[key]);
    upperArm[key].add(forearm[key]);
    forearm[key].add(hand[key]);
  }

  const legs = {
    left: joint('Thigh_L', [-0.125, -0.14, 0]),
    right: joint('Thigh_R', [0.125, -0.14, 0]),
  };
  const shins = {
    left: joint('Shin_L'),
    right: joint('Shin_R'),
  };
  const feet = {
    left: joint('Foot_L'),
    right: joint('Foot_R'),
  };

  for (const side of [-1, 1]) {
    const key = side < 0 ? 'left' : 'right';

    legs[key].add(capsule(0.105, 0.30, pants));
    legs[key].children[0].position.y = -0.20;

    shins[key].position.y = -0.45;
    shins[key].add(capsule(0.087, 0.27, pants));
    shins[key].children[0].position.y = -0.17;

    feet[key].position.set(0, -0.34, -0.055);
    feet[key].add(box([0.19, 0.10, 0.32], shoe));

    hips.add(legs[key]);
    legs[key].add(shins[key]);
    shins[key].add(feet[key]);
  }

  const belt = box([0.43, 0.07, 0.27], accent);
  belt.position.y = -0.10;
  hips.add(belt);

  model.add(hips);

  const rig = {
    hips,
    spine,
    chest,
    neck,
    head,
    shoulders,
    upperArm,
    forearm,
    hand,
    legs,
    shins,
    feet,
  };

  model.userData.proceduralRig = rig;

  model.traverse(node => {
    if (!node.isMesh) return;
    node.castShadow = true;
    node.receiveShadow = true;
  });

  return {
    model,
    rig,
    height: 1.90,
  };
}
