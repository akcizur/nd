const BASE = import.meta.env.BASE_URL || '/';

export const ASSET_MANIFEST = {
  characters: {
    player: {
      id: 'nd-procedural-humanoid',
      type: 'procedural',
      source: 'src/player/SimpleHumanoid.js',
      license: 'Project-authored',
    },
  },

  animations: {
    locomotion: {
      id: 'nd-procedural-character-animation',
      type: 'procedural',
      source: 'src/animation/ProceduralCharacterAnimation.js',
      license: 'Project-authored',
    },
  },

  optional: {
    quaterniusBaseCharacters: {
      id: 'quaternius-universal-base-characters',
      type: 'external-reference',
      path: 'https://quaternius.itch.io/universal-base-characters',
      license: 'CC0-1.0',
    },
    quaterniusAnimationLibrary: {
      id: 'quaternius-universal-animation-library',
      type: 'external-reference',
      path: 'https://quaternius.itch.io/universal-animation-library',
      license: 'CC0-1.0',
    },
    kenneyMiniCharacters: {
      id: 'kenney-mini-characters',
      type: 'external-reference',
      path: 'https://kenney.nl/assets/mini-characters',
      license: 'CC0',
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

  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('//')
  ) {
    return path;
  }

  return new URL(
    path.replace(/^\/+/, ''),
    new URL(BASE, document.baseURI)
  ).href;
}

export function getAsset(...keys) {
  return keys.reduce((value, key) => value?.[key], ASSET_MANIFEST);
}

export function registerAsset(category, asset) {
  if (!Array.isArray(ASSET_MANIFEST[category])) {
    ASSET_MANIFEST[category] = [];
  }

  ASSET_MANIFEST[category].push(asset);
  return asset;
}
