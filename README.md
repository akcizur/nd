# ND

Minimal Three.js / Vite **third-person character movement prototype** for the browser.

The project is currently focused on one thing: making character movement and third-person camera control feel like a real game before adding a larger world or gameplay systems.

## Current game foundation

- third-person humanoid character
- camera-relative character movement
- smooth character rotation toward movement direction
- walk / run / sprint movement bands
- fixed-step Rapier character physics
- capsule collision with walls and ground
- physical gravity and jump velocity
- acceleration / braking with limited air control
- slope handling, ground snapping and autostep
- jump / fall / grounded state
- third-person orbit / follow camera
- camera pitch limits
- dynamic camera FOV based on movement speed
- keyboard + mouse controls
- touch / virtual joystick controls
- gamepad input
- responsive desktop and mobile layout
- Quaternius Universal Base Character loading with shared Universal Animation Library locomotion clips
- physics-driven UAL1 locomotion blendspace (idle / walk / jog / sprint)
- buffered jump + coyote-time jump handling
- dedicated jump / fall / landing animation phases
- animation timing derived from real capsule velocity
- simple flat test ground
- lightweight scene designed for movement testing
- GitHub Pages deployment
- Vite production build
- dedicated AssetManifest + production asset pipeline
- glTF Transform optimization tooling
- BVH-accelerated static interaction raycasts

## Current scope

The scene is intentionally minimal.

```text
┌──────────────────────────────────────┐
│                                      │
│             THIRD-PERSON             │
│                                      │
│                 ◯                    │
│                /|\                   │
│                / \                   │
│                                      │
│          SIMPLE TEST GROUND          │
│                                      │
└──────────────────────────────────────┘
```

There are currently no city, vehicle, NPC, mission or inventory systems in the active movement prototype.

The goal is to establish a solid character-controller foundation first.

## Movement model

```text
Input
  ↓
Camera-relative direction
  ↓
Acceleration / deceleration
  ↓
Character velocity
  ↓
Smooth character rotation
  ↓
Animation state
```

Movement is based on the camera yaw, so pressing **W** moves the character in the direction the camera is facing.

Diagonal movement is normalized to prevent diagonal speed from becoming faster than forward movement.

## Controls

### Desktop

| Input | Action |
|---|---|
| W / ↑ | Move forward |
| S / ↓ | Move backward |
| A / ← | Strafe left |
| D / → | Strafe right |
| Shift | Sprint |
| Space | Jump |
| RMB + mouse | Rotate camera |
| Esc | Game menu |

### Mobile / touch

| Control | Action |
|---|---|
| Left joystick | Character movement |
| Right joystick | Camera |
| Sprint | Sprint |
| Jump | Jump |
| E / Enter | Interaction |

### Gamepad

The input layer supports:

- left stick — movement
- right stick — camera
- gamepad sprint
- jump
- pause

## Camera

The camera is a dedicated third-person system.

- smooth follow
- orbit around the player
- controlled pitch range
- movement-aware FOV
- manual mouse orbit
- touch/gamepad camera input
- automatic follow when the player moves without manual camera input
- camera stays above the ground plane

## Character

The character pipeline supports:

- Quaternius GLTF / GLB humanoid models
- CC0 character assets
- shared Universal Animation Library locomotion
- direct UAL1 clip binding to the Universal humanoid rig
- continuous idle / walk / jog / sprint blending
- jump / fall / landing phases driven by Rapier state
- animation playback rate derived from actual horizontal speed
- no runtime bone retargeting

The controller is intentionally independent from the final character asset, so the model can be replaced without rewriting movement logic.

## Project architecture

```text
src/
├── animation/       Animation state and locomotion
├── assets/          Character / asset loading
├── camera/          Third-person camera
├── core/            Game state, input facade and debug
├── input/           Keyboard, mouse, gamepad and touch input
├── mobile/          Virtual joystick and touch controls
├── player/          Character movement controller
├── ui/              Menus and HUD
└── main.js          Scene bootstrap and game loop
```

The important runtime separation is:

```text
Input → PlayerController → Rapier CharacterController → corrected velocity
                    ↘                              ↘
                 AnimationSystem ← velocity / grounded / landing

Camera ← Input + Player

Physics:
Fixed timestep → capsule collision → corrected movement → visual sync
```

## Development

Install dependencies:

```bash
npm install
```

Run the local development server:

```bash
npm run dev
```

Build the production version:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Production / GitHub Pages

The project is deployed as a static Vite application through GitHub Pages.

Production base path:

```text
/nd/
```

Deployment is handled by GitHub Actions after changes are pushed to `main`.

## Asset and interaction foundation

The repository now separates source assets from optimized runtime assets. `AssetManifest` is the single runtime registry layer, glTF Transform provides optimization tooling, and `InteractionSystem` provides BVH-accelerated camera raycasts for static world meshes. Rapier remains authoritative for gameplay collision.

## Development priorities

### P0 — Movement foundation

- character scale
- feet correctly grounded
- acceleration / deceleration feel
- camera-relative movement
- smooth facing
- walk / run / sprint blending
- stable third-person camera
- camera collision

### P1 — Character and world quality

- capsule/visual alignment tuning
- physical obstacle collision validation
- foot contact and landing polish
- continuous locomotion blend tuning
- Quaternius UAL clip coverage
- foot contact / foot-skate reduction
- local production asset migration
- modular street / house / garage assets
- interaction targets and world props
- improved touch controls

### P2 — World

- simple streets
- low-poly buildings
- basic collision
- interactive world objects

### P3 — Gameplay

- vehicles
- NPCs
- missions
- inventory
- survival systems

World and gameplay systems should only be added after the P0 movement foundation feels reliable.

## Design principle

**Character movement first. World second. Gameplay third.**

The repository is intentionally kept small while the controller, camera and animation foundation are being stabilized.

## License / assets

Game code and bundled assets should be checked individually before redistribution.

Third-party assets retain their original licenses and attribution requirements.

## Sources

- Three.js — https://threejs.org/
- Vite — https://vite.dev/
