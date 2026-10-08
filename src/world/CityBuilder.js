import * as THREE from 'three';

export class CityBuilder {
  constructor(world, physicsWorld) {
    this.world = world;
    this.physics = physicsWorld;
    this.root = new THREE.Group();
    this.root.name = 'NDProceduralCity';
    this.world.add(this.root);
    this.buildingColliders = [];
  }

  build({ blocks = 7, blockSize = 26, roadWidth = 9, seed = 42 } = {}) {
    const rng = this._rng(seed);
    const extent = blocks * blockSize;

    this._buildRoads(blocks, blockSize, roadWidth);
    this._buildSidewalks(blocks, blockSize, roadWidth);
    this._buildBuildings(blocks, blockSize, roadWidth, rng);
    this._buildStreetFurniture(blocks, blockSize, roadWidth);

    const outer = extent + blockSize;
    const boundary = [
      { x: 0, z: -outer, w: outer * 2, d: 1.0 },
      { x: 0, z: outer, w: outer * 2, d: 1.0 },
      { x: -outer, z: 0, w: 1.0, d: outer * 2 },
      { x: outer, z: 0, w: 1.0, d: outer * 2 },
    ];
    for (const b of boundary) {
      this.physics.addStaticBox(b.x, 1.5, b.z, b.w, 3, b.d);
    }

    return this.root;
  }

  _rng(seed) {
    let state = seed >>> 0;
    return () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  _material(color, roughness = 0.84, metalness = 0) {
    return new THREE.MeshStandardMaterial({ color, roughness, metalness });
  }

  _buildRoads(blocks, blockSize, roadWidth) {
    const total = (blocks * 2 + 1) * blockSize;
    const roadMat = this._material(0x25272b, 0.96);
    const centerMat = this._material(0x8f9092, 0.68);

    for (let i = -blocks; i <= blocks; i++) {
      const c = i * blockSize;

      const horizontal = new THREE.Mesh(
        new THREE.PlaneGeometry(total, roadWidth),
        roadMat
      );
      horizontal.rotation.x = -Math.PI / 2;
      horizontal.position.set(0, 0.006, c);
      this.root.add(horizontal);

      const vertical = new THREE.Mesh(
        new THREE.PlaneGeometry(roadWidth, total),
        roadMat
      );
      vertical.rotation.x = -Math.PI / 2;
      vertical.position.set(c, 0.007, 0);
      this.root.add(vertical);

      const lineH = new THREE.Mesh(
        new THREE.PlaneGeometry(total, 0.055),
        centerMat
      );
      lineH.rotation.x = -Math.PI / 2;
      lineH.position.set(0, 0.012, c);
      this.root.add(lineH);

      const lineV = new THREE.Mesh(
        new THREE.PlaneGeometry(0.055, total),
        centerMat
      );
      lineV.rotation.x = -Math.PI / 2;
      lineV.position.set(c, 0.013, 0);
      this.root.add(lineV);
    }
  }
  _addCrossing(coord, roadWidth, axis) {
    const zebra = this._material(0xd6d6d6, 0.8);
    const root = new THREE.Group();

    for (let i = -4; i <= 4; i++) {
      const stripe = new THREE.Mesh(
        axis === 'x'
          ? new THREE.PlaneGeometry(0.42, roadWidth * 0.76)
          : new THREE.PlaneGeometry(roadWidth * 0.76, 0.42),
        zebra
      );
      stripe.rotation.x = -Math.PI / 2;
      if (axis === 'x') {
        stripe.position.set(coord + i * 0.72, 0.016, coord);
      } else {
        stripe.position.set(coord, 0.016, coord + i * 0.72);
      }
      root.add(stripe);
    }
    this.root.add(root);
  }

  _buildSidewalks(blocks, blockSize, roadWidth) {
    const total = blocks * blockSize * 2;
    const sidewalk = this._material(0x77756d, 0.92);

    for (let i = -blocks; i <= blocks; i++) {
      const c = i * blockSize;
      for (const side of [-1, 1]) {
        const x = side * (c + (roadWidth / 2 + 1.0));
        const y = 0.025;

        const h = new THREE.Mesh(
          new THREE.PlaneGeometry(total, 1.8),
          sidewalk
        );
        h.rotation.x = -Math.PI / 2;
        h.position.set(0, y, x);
        this.root.add(h);

        const v = new THREE.Mesh(
          new THREE.PlaneGeometry(1.8, total),
          sidewalk
        );
        v.rotation.x = -Math.PI / 2;
        v.position.set(x, y + 0.001, 0);
        this.root.add(v);
      }
    }
  }

  _buildBuildings(blocks, blockSize, roadWidth, rng) {
    const palettes = [0xb8b3a7, 0x8e9a9f, 0x9a846f, 0x717982, 0xa09a90, 0x6f7774];
    const half = blocks * blockSize;

    for (let gx = -blocks; gx < blocks; gx++) {
      for (let gz = -blocks; gz < blocks; gz++) {
        const centerX = gx * blockSize + blockSize / 2;
        const centerZ = gz * blockSize + blockSize / 2;

        // Leave a protected plaza in the middle for player/vehicle spawn.
        if (Math.abs(centerX) < blockSize && Math.abs(centerZ) < blockSize) {
          this._buildPlaza(centerX, centerZ, blockSize);
          continue;
        }

        const margin = roadWidth * 0.5 + 1.5;
        const available = blockSize - margin * 2;
        const split = rng() > 0.55;

        const lotCountX = split ? 2 : 1;
        const lotCountZ = split ? 2 : 1;

        for (let ix = 0; ix < lotCountX; ix++) {
          for (let iz = 0; iz < lotCountZ; iz++) {
            const lotW = available / lotCountX - 1.1;
            const lotD = available / lotCountZ - 1.1;
            const cx = centerX - available / 2 + lotW / 2 + ix * (lotW + 1.1);
            const cz = centerZ - available / 2 + lotD / 2 + iz * (lotD + 1.1);
            const width = Math.max(5.2, lotW * (0.72 + rng() * 0.20));
            const depth = Math.max(5.2, lotD * (0.72 + rng() * 0.20));
            const height = 2.8 + rng() * 8.2;

            this._addBuilding(cx, cz, width, depth, height, palettes[Math.floor(rng() * palettes.length)], rng);
          }
        }
      }
    }

    // Keep city inside the intended simulation envelope.
    void half;
  }

  _addBuilding(x, z, width, depth, height, color, rng) {
    const root = new THREE.Group();
    root.name = 'Building';
    root.position.set(x, 0, z);

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      this._material(color, 0.86)
    );
    body.position.y = height * 0.5;
    body.castShadow = true;
    body.receiveShadow = true;
    root.add(body);

    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.12, 0.15, depth + 0.12),
      this._material(0x474b50, 0.95)
    );
    roof.position.y = height + 0.08;
    roof.castShadow = true;
    root.add(roof);

    const windowMat = this._material(0x263746, 0.28, 0.15);
    const floors = Math.max(1, Math.floor(height / 2.25));
    const columns = Math.max(2, Math.floor(width / 1.6));

    for (let floor = 0; floor < floors; floor++) {
      for (let col = 0; col < columns; col++) {
        if (rng() < 0.14) continue;

        const w = 0.36;
        const h = 0.48;
        const px = -width * 0.5 + 0.9 + col * Math.max(1.1, (width - 1.5) / Math.max(1, columns - 1));
        const py = 1.0 + floor * 2.15;

        for (const zSide of [-1, 1]) {
          const win = new THREE.Mesh(
            new THREE.BoxGeometry(w, h, 0.035),
            windowMat
          );
          win.position.set(px, py, zSide * (depth * 0.5 + 0.018));
          win.castShadow = true;
          root.add(win);
        }
      }
    }

    this.root.add(root);
    this.physics.addStaticBox(x, height / 2, z, width, height, depth);
    this.buildingColliders.push(root);
  }

  _buildPlaza(x, z, blockSize) {
    const plaza = new THREE.Mesh(
      new THREE.CircleGeometry(blockSize * 0.34, 32),
      this._material(0x8a8780, 0.95)
    );
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.set(x, 0.035, z);
    this.root.add(plaza);

    const fountain = new THREE.Mesh(
      new THREE.CylinderGeometry(2.0, 2.0, 0.45, 20),
      this._material(0x64686d, 0.7, 0.1)
    );
    fountain.position.set(x, 0.22, z);
    fountain.castShadow = true;
    this.root.add(fountain);

    const water = new THREE.Mesh(
      new THREE.CylinderGeometry(1.72, 1.72, 0.06, 20),
      this._material(0x3f7891, 0.18, 0.25)
    );
    water.position.set(x, 0.47, z);
    this.root.add(water);
  }

  _buildStreetFurniture(blocks, blockSize, roadWidth) {
    const lampMat = this._material(0x35383b, 0.72, 0.45);
    const lightMat = new THREE.MeshStandardMaterial({
      color: 0xffe6a7,
      emissive: 0xffd67b,
      emissiveIntensity: 1.2,
      roughness: 0.35
    });

    for (let i = -blocks; i <= blocks; i++) {
      const c = i * blockSize;
      for (const side of [-1, 1]) {
        for (const axis of ['x', 'z']) {
          const root = new THREE.Group();
          const pole = new THREE.Mesh(
            new THREE.CylinderGeometry(0.045, 0.065, 2.65, 7),
            lampMat
          );
          pole.position.y = 1.33;
          root.add(pole);

          const head = new THREE.Mesh(
            new THREE.BoxGeometry(0.18, 0.09, 0.18),
            lightMat
          );
          head.position.set(0, 2.67, 0);
          root.add(head);

          if (axis === 'x') root.position.set(c + side * (roadWidth * 0.5 + 1.1), 0, c);
          else root.position.set(c, 0, c + side * (roadWidth * 0.5 + 1.1));

          this.root.add(root);
        }
      }
    }
  }
}
