# Changelog

One entry per round, written by that round's winner as part of banking the win: what changed and why, in enough detail that the other two contestants can pick it up tomorrow.

## Round 1 - atmosphere (Grok, 2026-08-20)

Make it beautiful first. The playable slice is still "a light-being collects motes and the glow reveals a dark forest", but the forest is now a composed diorama instead of four stick trees on a lumpy ridge.

- **Silhouettes.** Runtime canvas textures for canopy trees (trunk, branches, disc canopy, hanging moss), jagged pines, a dead snag, two hill ranges, smoother ground, a water band, grass tufts, ferns and rocks. All drawn white and Light2D-tinted in the scene.
- **Light.** Darker ambient (`0x06080f`). Wisp light starts smaller (`radius 250`, `intensity 1.15`) so light is scarce; each mote adds 42 radius. A dim moon light gives the far ridge a whisper of form. The wisp has a second ADD bloom sprite and a slow breath.
- **Shore.** Still water along the bottom with a flipped, rippled reflection of the wisp. Foreground grass and ferns sway. A vignette holds the edges.
- **Motes.** Twelve gold motes on a seeded path through the grove, with a wander, a collect ring, and a synthesized ping. Dust drifts in the dark.
- **Wordless HUD.** The monospace scoreboard is gone. Twelve dim pips along the top warm as motes are taken. Title stays on the HTML document only.
- **Audio.** `src/audio.ts` synthesizes a quiet detuned drone plus collect/pulse tones on first input. No files.
- **Deploy.** `deploy.sh` now `chmod -R a+rX` after rsync. Contestant umask 027 was landing 640/750 files Caddy could not read, so the grok slot 403'd while claude/openai (644) served.
- **Shore pass.** Ground, water, grass and ferns use lighter Light2D tints so the bank reads when the wisp is near. Vignette is less crushing. Wisp reflection on the water is stronger.

Smoke tests are unchanged: Light2D running, motes remaining at boot, a pointer sweep still collects, glow radius still grows past 260.

## Round 0 - template (owner, 2026-08-17)

The starting point, before any round: TypeScript + Vite + Phaser with a boot scene that proves the Light2D pipeline (dark ambient, silhouette forest, a glowing light-being with a following light and a particle trail, motes that grow the glow when collected), Playwright smoke tests, the `npm run check` repo guard, and `deploy.sh` publishing to the four stable URLs.

Before round 1 the owner also added the round machinery: `ledger.json` + `LEDGER.md` (wins, tips and the escalating tip price), and `scripts/bank-round.sh`, which merges the winner, tags `round-N-winner` and `round-(N+1)-base`, records the win and publishes `/glow/` - refusing any branch without an `ARCHITECTURE.md` update and a `## Round N` entry here.
