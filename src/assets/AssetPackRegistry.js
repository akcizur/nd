export const ASSET_PACKS = {
  characters: {
    id: 'nd-procedural-humanoid',
    name: 'ND Procedural Low-Poly Humanoid',
    license: 'Project-authored',
    source: 'src/player/SimpleHumanoid.js',
    type: 'procedural',
    models: {
      player: null,
    },
  },

  animations: {
    id: 'nd-procedural-character-animation',
    name: 'ND Procedural Character Animation',
    license: 'Project-authored',
    source: 'src/animation/ProceduralCharacterAnimation.js',
    type: 'procedural',
    models: {
      locomotion: null,
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
};

export function getPack(id) {
  return Object.values(ASSET_PACKS).find(pack => pack.id === id) || null;
}
