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
- self-contained low-poly procedural humanoid model
- procedural skeletal-style locomotion animation (idle / walk / run / sprint)
- procedural directional locomotion (forward / backward / strafe)
- procedural crouch / jump / fall / landing poses
- animation timing derived from real capsule velocity
- zero runtime third-party character downloads
- procedural city blocks with roads, sidewalks, buildings, lamps and central plazas
- lightweight traffic and pedestrian simulation
- simple physics-driven player vehicle with enter / exit flow
- city stays generated from Three.js primitives for GitHub Pages
- GitHub Pages deployment
- Vite production build
- dedicated AssetManifest + production asset pipeline
- glTF Transform optimization tooling
- BVH-accelerated static interaction raycasts

## Current scope

The scene is a lightweight procedural city sandbox.

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

The current playable loop is intentionally small: walk, sprint, crouch, jump, explore a procedural city, enter a car, drive, exit, and observe traffic/pedestrians.

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

The runtime now uses a project-authored low-poly humanoid built from Three.js primitives.

The model is assembled as a small procedural rig with named joints for:

- hips / spine / chest / neck / head
- shoulders / upper arms / forearms / hands
- thighs / shins / feet

Animation is driven directly from real gameplay velocity and input:

```text
speed + movement direction + grounded state
                    ↓
        procedural animation pose
                    ↓
idle → walk → run → sprint
             ↘ crouch
             ↘ jump → fall → land
```

The visual character is separated from the Rapier capsule, so changing the mesh does not change gameplay collision. No external character file is required to start the game.


## City / vehicle foundation

The city layer follows the useful parts of open Three.js browser-game patterns without copying an external repository into the project:

- `CityBuilder` generates roads, sidewalks, buildings, lamps and plazas.
- `CitySimulation` drives lightweight traffic and pedestrians.
- `SimpleCar` provides a local visual vehicle mesh.
- `VehicleController` + Rapier provide the physics-driven driving loop.
- All four systems are plain JavaScript/Three.js and remain compatible with Vite static deployment.

## Project architecture

```text
src/
├── animation/       Procedural character animation
├── assets/          Optional world/asset loaders
├── camera/          Third-person camera
├── core/            Game state, input facade and debug
├── input/           Keyboard, mouse, gamepad and touch input
├── mobile/          Virtual joystick and touch controls
├── player/          Character movement controller + procedural model
├── vehicle/         Vehicle mesh and physics controller
├── world/           Procedural city + traffic / pedestrian simulation
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

`main` is the canonical production branch. GitHub Actions deploys it automatically after each push.

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

## Stable branch policy

The repository production source of truth is `main`. Changes should be integrated into `main` and deployed from `main`; no alternate branch is required for the runtime.
