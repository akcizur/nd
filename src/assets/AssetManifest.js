import { ASSET_PACKS } from './AssetPackRegistry.js';

export const ASSET_MANIFEST = Object.freeze({
  ...ASSET_PACKS,
  animations2: {
    id: 'quaternius-universal-animation-library-2',
    name: 'Quaternius Universal Animation Library 2',
    license: 'CC0-1.0',
    source: 'https://quaternius.itch.io/universal-animation-library-2',
    status: 'optional',
    gltf: null,
  },
  vehicles: {
    id: 'kenney-car-kit',
    name: 'Kenney Car Kit',
    license: 'CC0-1.0',
    source: 'https://kenney.nl/assets/car-kit',
    status: 'optional',
    models: [],
  },
  materials: {
    id: 'polyhaven',
    name: 'Poly Haven',
    license: 'CC0',
    source: 'https://polyhaven.com/',
    status: 'optional',
  },
});

export const MAVON_ASSET_POLICY = Object.freeze({
  preferredLicense: 'CC0',
  externalAssetsMustBeDeclared: true,
  runtimeDownloadFallback: true,
  localAssetsDirectory: '/assets/mavon/',
});

export function getAsset(id) {
  return ASSET_MANIFEST[id] || null;
}

export function listAssetsByType(type) {
  return Object.values(ASSET_MANIFEST).filter(asset => asset.type === type);
}
