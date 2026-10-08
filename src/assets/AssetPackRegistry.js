import { ASSET_MANIFEST, assetUrl } from './AssetManifest.js';

export const ASSET_PACKS = {
  characters: {
    id: 'quaternius-universal-base-characters',
    name: 'Quaternius Universal Base Characters — Superhero Male',
    license: ASSET_MANIFEST.characters.player.license,
    source: 'https://quaternius.itch.io/universal-base-characters',
    models: {
      player: assetUrl(ASSET_MANIFEST.characters.player),
    },
  },

  animations: {
    id: 'quaternius-universal-animation-library',
    name: 'Quaternius Universal Animation Library — Standard',
    license: ASSET_MANIFEST.animations.locomotion.license,
    source: 'https://quaternius.itch.io/universal-animation-library',
    models: {
      locomotion: assetUrl(ASSET_MANIFEST.animations.locomotion),
    },
  },

  buildings: {
    id: 'quaternius-downtown-city',
    name: 'Quaternius Downtown City MegaKit',
    license: 'CC0-1.0',
    source: 'https://quaternius.itch.io/downtown-city-megakit',
    models: [
      'https://raw.githubusercontent.com/anshaneja5/skyline-run/main/public/assets/models/b_small.glb',
      'https://raw.githubusercontent.com/anshaneja5/skyline-run/main/public/assets/models/b_medium.glb',
      'https://raw.githubusercontent.com/anshaneja5/skyline-run/main/public/assets/models/b_large.glb',
    ],
  },

  animatedCharacters: {
    id: 'gobkit-free-minions',
    name: 'Gobkit Free Minions (legacy)',
    license: 'CC0-1.0',
    source: 'https://gobkit.itch.io/gobkit-free-minions',
    status: 'optional',
    models: {
      yellow: 'https://gobkit.com/freebies/minion/minion-c01.glb',
      green: 'https://gobkit.com/freebies/minion/minion-a01.glb',
      red: 'https://gobkit.com/freebies/minion/minion-b01.glb',
    },
  },
};

export function getPack(id) {
  return Object.values(ASSET_PACKS).find(pack => pack.id === id) || null;
}
