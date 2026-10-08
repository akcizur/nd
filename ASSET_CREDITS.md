# Asset packs

The game uses free packs through a small runtime asset registry.

| Pack | Use | License | Source |
|---|---|---|---|
| Quaternius Universal Base Characters | primary playable humanoid player | CC0 | https://quaternius.itch.io/universal-base-characters |
| Quaternius Universal Animation Library | player locomotion / humanoid animation clips | CC0 | https://quaternius.itch.io/universal-animation-library |
| Quaternius Downtown City MegaKit | modular city buildings | CC0 | https://quaternius.itch.io/downtown-city-megakit |
| Gobkit Free Minions | additional rigged/animated NPC variants | CC0 | https://gobkit.itch.io/gobkit-free-minions |

Runtime references are declared in `src/assets/AssetPackRegistry.js`.

The playable character uses the Quaternius Universal Base Characters Standard model with the Universal Animation Library. Runtime delivery currently uses pinned public mirrors of the CC0 source files; the original Quaternius pages remain the authoritative source and license reference.
