export const ASSET_PACKS = {
  characters: {
    id: 'quaternius-universal-base',
    name: 'Quaternius Universal Base Characters',
    license: 'CC0-1.0',
    source: 'https://quaternius.itch.io/universal-base-characters',
    models: {
      player: 'https://raw.githubusercontent.com/programasweights/avatar/main/public/assets/character.glb',
    },
  },
  animations: {
    id: 'quaternius-universal-animation-library',
    name: 'Quaternius Universal Animation Library',
    license: 'CC0-1.0',
    source: 'https://quaternius.itch.io/universal-animation-library',
    gltf: 'https://raw.githubusercontent.com/J-Ponzo/gltf-universal-animation-library/main/glTF/AnimationLibrary_Godot_Standard.gltf',
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
    name: 'Gobkit Free Minions',
    license: 'CC0-1.0',
    source: 'https://gobkit.itch.io/gobkit-free-minions',
    models: [
      'https://gobkit.com/freebies/minion/minion-a01.glb',
      'https://gobkit.com/freebies/minion/minion-b01.glb',
      'https://gobkit.com/freebies/minion/minion-c01.glb',
    ],
  },
};

export function getPack(id) {
  return Object.values(ASSET_PACKS).find(pack => pack.id === id) || null;
}
