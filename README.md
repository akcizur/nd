# ND — Third Person Web Boilerplate

A from-scratch web port of the *architecture* behind `MaximeCrp/third-person-controller-boilerplate`, rebuilt for TypeScript + Three.js + Phaser and GitHub Pages.

Reference: https://github.com/MaximeCrp/third-person-controller-boilerplate

## Preserved controller ideas

- separate gameplay/collision body and visual model
- smooth visual rotation toward travel direction
- clamped third-person orbit camera
- walk / run / jump / fall
- predictable desktop + mobile input
- small test arena for controller iteration

The reference project is Godot 4. Its README identifies Mixamo as its character asset source. This rebuild intentionally does not copy those assets or Godot project files.

## Stack

- TypeScript
- Three.js 0.186.1
- Rapier 3D 0.18.2
- Phaser 4.2.1
- Vite 8.3.3
- GitHub Actions + GitHub Pages

## Commands

```bash
npm install
npm run dev
npm start
npm run check
npm run build
npm run preview
```

## Controls

Desktop: WASD / arrows move, Shift run, Space jump, C crouch, R reset, Esc menu, click + mouse movement orbit the camera, mouse wheel zoom.

Mobile: left stick moves, right stick looks, RUN holds sprint and JUMP jumps.

## GitHub Pages

Production base is `/nd/`; local development uses `/`. The Pages workflow builds `dist/` and publishes it through the GitHub Pages artifact/deploy actions.

## FOSS assets

The baseline player is an original procedural Three.js model, so the demo remains self-contained. FOSS/CC0 replacement sources and licensing rules are listed in `FOSS_ASSETS.md` and `public/assets/README.md`.
