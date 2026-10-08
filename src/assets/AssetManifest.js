const BASE = import.meta.env.BASE_URL || '/';

export const ASSET_MANIFEST = {
  characters: {
    player: {
      id: 'quaternius-superhero-male',
      type: 'remote',
      path: 'https://raw.githubusercontent.com/kirbycope/godot-3d-player-controller-v2/a928cfa67684352b75a65c510d8751d1f3f2489c/assets/universal_base_characters/Base%20Characters/Superhero_Male_FullBody.gltf',
      license: 'CC0-1.0',
    },
  },

  animations: {
    locomotion: {
      id: 'ual1-standard',
      type: 'remote',
      path: 'https://raw.githubusercontent.com/DyingStar-game/DyingStar/bf86a5120641676336735efad0c5a31e32775179/assets/Universal%20Animation%20Library/Unreal-Godot/UAL1_Standard.glb',
      license: 'CC0-1.0',
    },
  },

  world: {
    street: [],
    buildings: [],
    props: [],
    vehicles: [],
    nature: [],
  },
};

export function assetUrl(entryOrPath) {
  const path = typeof entryOrPath === 'string'
    ? entryOrPath
    : entryOrPath?.path;

  if (!path) {
    throw new Error('Asset manifest entry has no path');
  }

  if (/^(?:https?:)?\\//i.test(path)) {
    return path;
  }

  return new URL(path.replace(/^\\/+/, ''), new URL(BASE, document.baseURI)).href;
}

export function getAsset(...keys) {
  return keys.reduce((value, key) => value?.[key], ASSET_MANIFEST);
}

export function registerAsset(category, asset) {
  if (!ASSET_MANIFEST[category]) ASSET_MANIFEST[category] = [];
  ASSET_MANIFEST[category].push(asset);
  return asset;
}
