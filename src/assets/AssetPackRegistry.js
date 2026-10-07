export const ASSET_PACKS = {
  characters: {
    id: 'gobkit-yellow-player',
    name: 'Gobkit Free Minions — Yellow C-1 Player',
    license: 'CC0-1.0',
    source: 'https://gobkit.itch.io/gobkit-free-minions',
    models: {
      player: 'https://gobkit.com/freebies/minion/minion-c01.glb',
    },
  },
  animations: {
    id: 'gobkit-player-animations',
    name: 'Gobkit C-1 embedded animations',
    license: 'CC0-1.0',
    source: 'https://gobkit.itch.io/gobkit-free-minions',
    clips: ['idle', 'attack', 'dead'],
    fps: 24,
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
