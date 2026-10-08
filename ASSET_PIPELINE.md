# ND Asset Pipeline

The project now has an explicit asset pipeline separate from runtime game code.

## Runtime

AssetManifest -> AssetPackRegistry -> loaders -> Three.js

Runtime visual assets can be local paths under the Vite base URL. The current playable character is generated in code and has no runtime asset download dependency.

## Source / production folders

public/assets-source/ = original authoring assets
public/assets/ = optimized production assets

## Optimization

Run:

npm run assets:inspect
npm run assets:optimize

The optimizer uses glTF Transform with Meshopt geometry/animation compression and WebP texture compression.

## Recommended flow

optional asset download -> assets-source -> inspect -> optimize -> assets -> AssetManifest

## Rules

1. Keep source files separate from production files.
2. Do not put temporary asset URLs directly into gameplay code.
3. Keep licenses in the manifest or asset credits.
4. Optimize before adding large environment packs.
5. Keep gameplay collision geometry independent from visual geometry.

## BVH interaction

src/interaction/InteractionSystem.js uses three-mesh-bvh for static mesh raycasting. Skinned character meshes are deliberately excluded. Rapier remains the authoritative gameplay collision system.
