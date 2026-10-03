# ND

Three.js / Vite browser 3D city-game prototype.

## Current game foundation

- third-person drivable vehicle
- keyboard and mobile/touch controls
- acceleration, reverse, steering and inertia
- static building collision
- checkpoint mission loop
- score + distance HUD
- procedural city layout
- Kenney City Kit Roads
- Kenney City Kit Suburban
- Kenney City Kit Commercial
- CC0 GLB assets loaded directly in the browser
- distance fog, shadows and follow camera
- GitHub Pages deployment
- MavonEngine Core dependency prepared for the next gameplay/physics layer
- rigged third-person player character
- Idle / Walk / Run animation state machine
- CC0 rigged NPC character pack
- skeleton-aware NPC cloning

## Free asset kits

The city uses free CC0 Kenney assets:

- City Kit (Roads)
- City Kit (Suburban)
- City Kit (Commercial)

The models are loaded from the public Bevy/Kenney asset mirror at runtime, so the repository stays small. Kenney's City Kit packs are CC0 and may be used commercially. Attribution is not required.

## Gameplay foundation

The first loop is deliberately small:

1. spawn in the city
2. drive to the yellow checkpoint
3. complete five checkpoints
4. receive 100 points per checkpoint
5. after the final checkpoint, continue in free roam

This gives the project a real gameplay state instead of only a rendering demo.

## Controls

- W / Arrow Up — accelerate
- S / Arrow Down — reverse / brake
- A / Arrow Left — steer left
- D / Arrow Right — steer right
- Touch arrows — mobile/tablet driving

## Development

npm install
npm run dev

## Production

npm run build

GitHub Pages uses the production base path `/nd/`.

## Engine direction

MavonEngine is included as the target gameplay engine layer. It provides a shared entity system, state machine, Rapier physics and a path toward server-authoritative multiplayer. The current Pages build remains a static client prototype; server/networking can be added separately without blocking the client.

## Sources

- Kenney City Kit Roads — https://kenney.nl/assets/city-kit-roads
- Kenney City Kit Suburban — https://kenney.nl/assets/city-kit-suburban
- Kenney City Kit Industrial — https://kenney.nl/assets/city-kit-industrial
- MavonEngine Core — https://github.com/MavonEngine/Core
