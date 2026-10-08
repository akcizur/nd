export const ASSET_PACKS = {
  characters: {
    id: 'quaternius-universal-base-characters',
    name: 'Quaternius Universal Base Characters — Superhero Male',
    license: 'CC0-1.0',
    source: 'https://quaternius.itch.io/universal-base-characters',
    models: {
      player: 'https://raw.githubusercontent.com/kirbycope/godot-3d-player-controller-v2/a928cfa67684352b75a65c510d8751d1f3f2489c/assets/universal_base_characters/Base%20Characters/Superhero_Male_FullBody.gltf',
    },
  },
  animations: {
    id: 'quaternius-universal-animation-library',
    name: 'Quaternius Universal Animation Library — Standard',
    license: 'CC0-1.0',
    source: 'https://quaternius.itch.io/universal-animation-library',
    models: {
      locomotion: 'https://raw.githubusercontent.com/DyingStar-game/DyingStar/bf86a5120641676336735efad0c5a31e32775179/assets/Universal%20Animation%20Library/Unreal-Godot/UAL1_Standard.glb',
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
