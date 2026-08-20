# Architecture

The winner of each round updates this file. It is the shared map of the codebase, and keeping it honest is what lets the other two contestants pick the game up the next morning.

## Stack

- **Phaser 3** (WebGL) for rendering, input, tweens, particles and the Light2D pipeline.
- **TypeScript**, strict, no emit - Vite does the transform, `tsc` only typechecks.
- **Vite 7** for dev server and production build. `base` is relative (`./`) so one build serves from four different URL prefixes.
- **Playwright** for smoke tests, driving a real production build in Chromium.
- **Web Audio** (synthesized in `src/audio.ts`) for a quiet drone, a collect ping, and a pulse. No audio files.

No game framework beyond Phaser, no asset build step, no backend. The game is a static bundle. Round 1 still draws every texture at runtime in `src/textures.ts` - nothing in `public/assets/`.

## Layout

```
index.html            page shell, canvas mount, analytics beacon
src/main.ts           Phaser game config (1280x720, FIT scaling) and scene list
src/scenes/BootScene.ts   the playable slice (atmosphere forest + wisp)
src/textures.ts       runtime-generated silhouette and glow textures
src/audio.ts          synthesized Web Audio bed
src/global.d.ts       the window.__glow test hook contract
tests/smoke.spec.ts   the smoke tests every build must pass
scripts/check-workspace.mjs   repo hygiene guard behind `npm run check`
deploy.sh             publish a build to one of the four slots
```

## How the scene works

`BootScene` is still a vertical slice, not a contract - replace it freely, as long as `npm test` still passes.

- **Lighting.** `this.lights.enable().setAmbientColor(0x06080f)` keeps the world nearly black. Silhouette props (hills, pines, canopy trees, snag, ground, water, grass, ferns, rocks) call `setPipeline("Light2D")`. The light-being is *not* lit - it is a light *source*, drawn with `ADD` blending, with a `Phaser.GameObjects.Light` following it. A second, dimmer light sits on the moon so the ridgeline has a whisper of form before you collect anything.
- **Reveal loop.** Collecting a mote raises `collected`, which grows the wisp light's `radius` and `intensity` and the sprite's scale. Starting radius is `250` so light stays scarce; each mote adds `42`. The world is revealed by the light, not by unhiding objects.
- **Atmosphere (round 1).** Far hills, a pine back row, a canopy grove, a dead snag, a still-water band with a flipped wisp reflection, foreground grass and ferns that sway, drifting dust, mist bands, a faint moon shaft, and a vignette. Motes wander a seeded path through the grove rather than a uniform scatter. Collecting one eases it into the wisp. The HUD is wordless: twelve dim pips along the top that warm as motes are taken.
- **Assets.** Everything is still drawn into canvas textures at `preload()` from `src/textures.ts`. Seeded `RandomDataGenerator` keeps silhouettes identical run to run. A later round may drop generated files in `public/assets/` and load them with a **relative** URL (`assets/...`, never `/assets/...`).
- **Input.** Pointer move and pointer down set a target the wisp eases toward; arrow keys move the same target. Pointer down also pulses the light and unlocks audio. The wisp is clamped above the waterline.
- **Audio.** `GlowAudio` constructs an `AudioContext` on the first pointer-down or key. Until then it is a no-op, because browsers gate sound.
- **Test hook.** `reportState()` publishes `window.__glow` and `create()` sets `document.body.dataset.gameReady` after the first rendered frame. The smoke tests wait on that attribute. If you change the scene's state, keep the hook meaningful - it is the only thing standing between a broken build and a wasted judging round.

## Fixed resolution

The game runs at a **1280x720** design resolution with `Phaser.Scale.FIT`, letterboxed. `WORLD_WIDTH`/`WORLD_HEIGHT` in `BootScene.ts` are the single source of truth - the Phaser config imports them, so there is no second place to keep in sync.

Deterministic layout is deliberate: it makes screenshots comparable between machines, it means the owner plays the same framing on every build, and 720p is a clean source for the recorded judging sessions (`Scale.FIT` scales the canvas in CSS but leaves the backing store at the design resolution, so anything smaller records as an upscale). The resolution is mandated by [SPEC.md](SPEC.md) - do not change it.

## Constraints worth knowing before you refactor

- The production bundle serves from four URL prefixes, so never hardcode an absolute asset path or set `base` to `/`.
- Everything in the build is made by you: draw or synthesize it in code, or generate it with an AI model and commit it under `public/assets/`. Never a downloaded sprite pack, stock texture or asset-store sound.
- Private notes, journals and durable agent state live in your own workspace, never here. `npm run check` will stop you.
- Phaser Light2D defaults to ten lights. Round 1 uses two (wisp + moon). Leave headroom.
