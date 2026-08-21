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
src/scenes/BootScene.ts   the full game (title beat, three stages, snuff/reset, ending)
src/textures.ts       runtime-generated silhouette and glow textures
src/audio.ts          synthesized Web Audio bed (drone, collect, drain, fail, gate, ending)
src/global.d.ts       the window.__glow test hook contract
tests/smoke.spec.ts   the smoke tests every build must pass
scripts/check-workspace.mjs   repo hygiene guard behind `npm run check`
deploy.sh             publish a build to one of the four slots
```

## How the game works

`BootScene` is the whole game. It is still one scene so the first frame is already the grove — there is no menu wall. Phases: `title` → `play` → (`failing` and back) → `ending`.

- **Title beat.** The grove is live and motes can be collected on frame one (smoke tests depend on that). A faint ring hangs at the top until the first click, key, or collect, then it fades. That is the menu.
- **Three stages.** `STAGES` in `BootScene.ts`: grove (need 4 of 5), shore (need 4 of 5), hollow (need 3 of 4). Each has its own mote homes and ambient. Biome shifts: grove trees dim on shore, pines dim and the snag moves to centre in the hollow. Collect enough and a vertical seam of light opens on the right (`GATE_X`). Walk into it for the next stage, or the ending after the last.
- **Fail / reset.** After the first collect the glow *wanes* (`WANE_PER_SEC`). Drop to `SNUFF_RADIUS` and the wisp snuffs: a veil, the stage motes respawn, radius resets to a stage base. No text. Wordless fail.
- **Ending.** After the hollow gate the wisp settles under a brighter ambient, the drone swells, motes are gone. Sit with it.
- **Lighting.** Dark ambient, Light2D silhouettes, wisp as a *source* (not a lit object), moon light, and a third gate light when the seam is open. Phaser Light2D caps at ten; we use three.
- **HUD.** Wordless. Left: pips for this stage's need. Right: three stage pips. No scoreboard.
- **Audio.** `GlowAudio`: drone, collect ping, pulse, drain warning, fail downsweep, gate fifth, ending swell. Unlocks on first input.
- **Assets.** Runtime canvas textures in `src/textures.ts`. No files in `public/assets/`.
- **Test hook.** `window.__glow` `{ ready, collected, remaining, glowRadius, lightsActive }` and `body[data-game-ready]`. Smoke still: lights on, motes remaining at boot, a pointer sweep collects, radius grows past 260.

## Fixed resolution

The game runs at a **1280x720** design resolution with `Phaser.Scale.FIT`, letterboxed. `WORLD_WIDTH`/`WORLD_HEIGHT` in `BootScene.ts` are the single source of truth - the Phaser config imports them, so there is no second place to keep in sync.

Deterministic layout is deliberate: it makes screenshots comparable between machines, it means the owner plays the same framing on every build, and 720p is a clean source for the recorded judging sessions (`Scale.FIT` scales the canvas in CSS but leaves the backing store at the design resolution, so anything smaller records as an upscale). The resolution is mandated by [SPEC.md](SPEC.md) - do not change it.

## Constraints worth knowing before you refactor

- The production bundle serves from four URL prefixes, so never hardcode an absolute asset path or set `base` to `/`.
- Everything in the build is made by you: draw or synthesize it in code, or generate it with an AI model and commit it under `public/assets/`. Never a downloaded sprite pack, stock texture or asset-store sound.
- Private notes, journals and durable agent state live in your own workspace, never here. `npm run check` will stop you.
- Phaser Light2D defaults to ten lights. Round 1 uses two (wisp + moon). Leave headroom.
