# Asset and character credits

## Primary runtime character

The playable character is now a **project-authored procedural low-poly humanoid** generated from Three.js primitives.

- Model: `src/player/SimpleHumanoid.js`
- Animation: `src/animation/ProceduralCharacterAnimation.js`
- Runtime downloads: **none**
- External character package required at startup: **none**

This keeps the character deterministic and GitHub Pages-friendly while the controller is being stabilized.

## Optional CC0 references

These are suitable third-party replacements/add-ons for a later visual pass. They are **not required by the current runtime**.

| Pack | Use | License | Source |
|---|---|---|---|
| Quaternius Universal Base Characters | higher-detail humanoid replacement | CC0-1.0 | https://quaternius.itch.io/universal-base-characters |
| Quaternius Universal Animation Library | 120+ humanoid animations | CC0-1.0 | https://quaternius.itch.io/universal-animation-library |
| Quaternius Universal Animation Library 2 | newer locomotion / combat / parkour set | CC0-1.0 | https://quaternius.itch.io/universal-animation-library-2 |
| Kenney Mini Characters | very small stylized animated characters | CC0 | https://kenney.nl/assets/mini-characters |
| Kenney Blocky Characters | simple stylized animated characters | CC0 | https://kenney.nl/assets/blocky-characters |

For redistributed third-party files, retain the original author/license information with the bundled asset.


## Runtime-generated city and vehicle

The current city block geometry, street furniture, traffic cars, pedestrians and player vehicle are generated directly with Three.js primitives in:

- `src/world/CityBuilder.js`
- `src/world/CitySimulation.js`
- `src/vehicle/SimpleCar.js`

These runtime-generated elements do not require external asset downloads.

## Reference projects studied

The architecture was informed by open Three.js browser-game patterns from **Neon City Demo** and **Courier City**. Their source code and assets remain separate projects; no external project is vendored into ND. Respect each original repository's license when reusing any code or assets in the future.
