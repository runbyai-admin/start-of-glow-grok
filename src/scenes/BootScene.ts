import Phaser from "phaser";
import { GlowAudio } from "../audio";
import {
  makeCanopyTreeTexture,
  makeFernTexture,
  makeGlowTexture,
  makeGrassTexture,
  makeGroundTexture,
  makeHillTexture,
  makeMistTexture,
  makeMoonTexture,
  makePineTexture,
  makeRingTexture,
  makeRockTexture,
  makeSnagTexture,
  makeVignetteTexture,
  makeWaterTexture,
} from "../textures";

export const WORLD_WIDTH = 1280;
export const WORLD_HEIGHT = 720;

const COLLECT_RADIUS = 48;
const WATER_TOP = WORLD_HEIGHT - 86;
const BASE_RADIUS = 250;
const RADIUS_STEP = 42;
const WANE_PER_SEC = 11;
const SNUFF_RADIUS = 88;
const GATE_X = 1224;

type Phase = "title" | "play" | "failing" | "ending";
type Mote = Phaser.GameObjects.Image & { homeX: number; homeY: number; phase: number };

const STAGES: Array<{
  ambient: number;
  need: number;
  homes: Array<[number, number]>;
}> = [
  {
    ambient: 0x06080f,
    need: 4,
    homes: [
      [180, 250],
      [310, 360],
      [420, 210],
      [520, 430],
      [610, 280],
    ],
  },
  {
    ambient: 0x071018,
    need: 4,
    homes: [
      [240, 400],
      [410, 220],
      [640, 340],
      [820, 180],
      [980, 390],
    ],
  },
  {
    ambient: 0x04060c,
    need: 3,
    homes: [
      [360, 260],
      [640, 200],
      [780, 380],
      [960, 240],
    ],
  },
];

/**
 * A full game on the round-1 atmosphere: three stages, a glow that can snuff,
 * a reset, an ending. The grove is playable on the first frame — not a menu wall.
 */
export class BootScene extends Phaser.Scene {
  private wisp!: Phaser.GameObjects.Image;
  private bloom!: Phaser.GameObjects.Image;
  private reflection!: Phaser.GameObjects.Image;
  private wispLight!: Phaser.GameObjects.Light;
  private trail!: Phaser.GameObjects.Particles.ParticleEmitter;
  private motes: Mote[] = [];
  private pips: Phaser.GameObjects.Image[] = [];
  private stagePips: Phaser.GameObjects.Image[] = [];
  private titleMark!: Phaser.GameObjects.Image;
  private gate!: Phaser.GameObjects.Image;
  private gateLight!: Phaser.GameObjects.Light;
  private veil!: Phaser.GameObjects.Rectangle;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private target = new Phaser.Math.Vector2(WORLD_WIDTH * 0.38, WORLD_HEIGHT * 0.58);
  private collected = 0;
  private stageCollected = 0;
  private stageIndex = 0;
  private phase: Phase = "title";
  private gateOpen = false;
  private lastDrainAt = 0;
  private audio = new GlowAudio();
  private swaying: Phaser.GameObjects.Image[] = [];
  private mists: Phaser.GameObjects.Image[] = [];
  private groveTrees: Phaser.GameObjects.Image[] = [];
  private pineTrees: Phaser.GameObjects.Image[] = [];
  private snag!: Phaser.GameObjects.Image;

  constructor() {
    super("boot");
  }

  preload(): void {
    makeGlowTexture(this, "wisp", 96, "rgba(255,255,255,1)", "rgba(168,214,255,0.5)");
    makeGlowTexture(this, "mote", 28, "rgba(255,244,214,1)", "rgba(255,186,82,0.55)");
    makeGlowTexture(this, "spark", 14, "rgba(255,255,255,0.95)", "rgba(190,226,255,0.35)");
    makeGlowTexture(this, "pip", 10, "rgba(255,236,196,1)", "rgba(255,196,92,0.4)");
    makeRingTexture(this, "ring", 48);
    makeMoonTexture(this, "moon", 90);
    makeMistTexture(this, "mist", 720, 180);
    makeVignetteTexture(this, "vignette", WORLD_WIDTH, WORLD_HEIGHT);
    makeHillTexture(this, "hills-far", WORLD_WIDTH, 280, 11);
    makeHillTexture(this, "hills-near", WORLD_WIDTH, 220, 23);
    makeGroundTexture(this, "ground", WORLD_WIDTH, 200, 7);
    makeWaterTexture(this, "water", WORLD_WIDTH, 110);
    makeSnagTexture(this, "snag", 180, 420, 3);
    for (let i = 0; i < 5; i += 1) {
      makeCanopyTreeTexture(this, `canopy-${i}`, 280, 560, i + 4);
      makePineTexture(this, `pine-${i}`, 180, 480, i + 17);
      makeGrassTexture(this, `grass-${i}`, 70, 90, i + 31);
      makeFernTexture(this, `fern-${i}`, 110, 140, i + 41);
      makeRockTexture(this, `rock-${i}`, 90, 48, i + 51);
    }
  }

  create(): void {
    this.lights.enable().setAmbientColor(0x06080f);

    this.buildSky();
    this.buildForest();
    this.buildMist();
    this.buildShore();
    this.buildWisp();
    this.buildGate();
    this.buildHud();
    this.spawnStage(0, false);
    this.bindInput();

    this.events.once(Phaser.Scenes.Events.POST_UPDATE, () => this.announceReady());
  }

  private buildSky(): void {
    // A hint of night colour so the unlit screen is not a blank void.
    this.add.rectangle(0, 0, WORLD_WIDTH, WORLD_HEIGHT, 0x070910).setOrigin(0).setDepth(-80);

    const moon = this.add
      .image(WORLD_WIDTH * 0.72, WORLD_HEIGHT * 0.13, "moon")
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(1.15)
      .setDepth(-70)
      .setAlpha(0.85);
    this.tweens.add({
      targets: moon,
      alpha: { from: 0.72, to: 0.95 },
      scale: { from: 1.1, to: 1.2 },
      duration: 5200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    this.lights.addLight(moon.x, moon.y, 520, 0x8ea4c8, 0.32);

    this.add
      .image(moon.x, moon.y + 90, "wisp")
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.14)
      .setScale(1.6, 5.2)
      .setDepth(-68);

    const rng = new Phaser.Math.RandomDataGenerator(["stars"]);
    for (let i = 0; i < 18; i += 1) {
      const star = this.add
        .image(rng.between(40, WORLD_WIDTH - 40), rng.between(20, 220), "spark")
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(rng.realInRange(0.12, 0.28))
        .setAlpha(rng.realInRange(0.25, 0.7))
        .setDepth(-75);
      this.tweens.add({
        targets: star,
        alpha: { from: star.alpha * 0.4, to: star.alpha },
        duration: rng.between(1800, 4200),
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
        delay: rng.between(0, 2000),
      });
    }
  }

  private buildForest(): void {
    const farHills = this.add
      .image(0, WATER_TOP + 8, "hills-far")
      .setOrigin(0, 1)
      .setTint(0x1a2438)
      .setDepth(-60)
      .setAlpha(0.95);
    farHills.setPipeline("Light2D");

    const nearHills = this.add
      .image(0, WATER_TOP + 18, "hills-near")
      .setOrigin(0, 1)
      .setTint(0x151c2c)
      .setDepth(-55);
    nearHills.setPipeline("Light2D");

    const pines: Array<{ x: number; scale: number; key: string; tint: number; depth: number }> = [
      { x: 70, scale: 0.72, key: "pine-0", tint: 0x182030, depth: -50 },
      { x: 210, scale: 0.88, key: "pine-1", tint: 0x141c28, depth: -50 },
      { x: 340, scale: 0.58, key: "pine-2", tint: 0x1a2434, depth: -48 },
      { x: 1020, scale: 0.7, key: "pine-3", tint: 0x161e2a, depth: -50 },
      { x: 1210, scale: 0.92, key: "pine-4", tint: 0x121a26, depth: -48 },
    ];
    for (const p of pines) {
      const tree = this.add
        .image(p.x, WATER_TOP + 6, p.key)
        .setOrigin(0.5, 1)
        .setScale(p.scale)
        .setTint(p.tint)
        .setDepth(p.depth);
      tree.setPipeline("Light2D");
      this.pineTrees.push(tree);
    }

    const grove: Array<{ x: number; scale: number; key: string; tint: number; depth: number }> = [
      { x: 120, scale: 0.82, key: "canopy-0", tint: 0x1a2438, depth: -36 },
      { x: 400, scale: 0.7, key: "canopy-1", tint: 0x161e30, depth: -34 },
      { x: 620, scale: 0.92, key: "canopy-2", tint: 0x1c263c, depth: -32 },
      { x: 900, scale: 0.74, key: "canopy-3", tint: 0x181f32, depth: -35 },
      { x: 1120, scale: 0.86, key: "canopy-4", tint: 0x141c2c, depth: -33 },
    ];
    for (const g of grove) {
      const tree = this.add
        .image(g.x, WATER_TOP + 10, g.key)
        .setOrigin(0.5, 1)
        .setScale(g.scale)
        .setTint(g.tint)
        .setDepth(g.depth);
      tree.setPipeline("Light2D");
      this.groveTrees.push(tree);
    }

    this.snag = this.add
      .image(300, WATER_TOP + 12, "snag")
      .setOrigin(0.5, 1)
      .setScale(0.7)
      .setTint(0x222a38)
      .setDepth(-28);
    this.snag.setPipeline("Light2D");
  }

  private buildMist(): void {
    const bands: Array<{ x: number; y: number; scale: number; alpha: number }> = [
      { x: 520, y: 330, scale: 1.85, alpha: 0.07 },
      { x: 980, y: 410, scale: 1.6, alpha: 0.05 },
    ];
    for (const band of bands) {
      const mist = this.add
        .image(band.x, band.y, "mist")
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(band.alpha)
        .setScale(band.scale, 0.85)
        .setDepth(-20);
      this.mists.push(mist);
      this.tweens.add({
        targets: mist,
        x: band.x + 36,
        alpha: { from: band.alpha * 0.7, to: band.alpha },
        duration: 7000 + band.y,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
  }

  private buildShore(): void {
    const ground = this.add
      .image(0, WORLD_HEIGHT + 8, "ground")
      .setOrigin(0, 1)
      .setTint(0x243044)
      .setDepth(-10);
    ground.setPipeline("Light2D");

    const water = this.add
      .image(0, WORLD_HEIGHT, "water")
      .setOrigin(0, 1)
      .setTint(0x2a4a66)
      .setAlpha(0.62)
      .setDepth(-8);
    water.setPipeline("Light2D");

    for (let i = 0; i < 5; i += 1) {
      const rock = this.add
        .image(80 + i * 280 + (i % 2) * 40, WORLD_HEIGHT - 54, `rock-${i}`)
        .setOrigin(0.5, 1)
        .setScale(0.7 + (i % 3) * 0.15)
        .setTint(0x222a36)
        .setDepth(-6);
      rock.setPipeline("Light2D");
    }

    const grassXs = [40, 160, 280, 520, 760, 940, 1120, 1240];
    for (let i = 0; i < grassXs.length; i += 1) {
      const tuft = this.add
        .image(grassXs[i], WORLD_HEIGHT - 48, `grass-${i % 5}`)
        .setOrigin(0.5, 1)
        .setScale(0.9 + (i % 3) * 0.15)
        .setTint(0x2a3a48)
        .setDepth(18);
      tuft.setPipeline("Light2D");
      this.swaying.push(tuft);
    }

    const ferns = [
      { x: 90, s: 0.95 },
      { x: 390, s: 1.1 },
      { x: 860, s: 0.85 },
      { x: 1210, s: 1.05 },
    ];
    for (let i = 0; i < ferns.length; i += 1) {
      const fern = this.add
        .image(ferns[i].x, WORLD_HEIGHT - 42, `fern-${i}`)
        .setOrigin(0.5, 1)
        .setScale(ferns[i].s)
        .setTint(0x263848)
        .setDepth(20);
      fern.setPipeline("Light2D");
      this.swaying.push(fern);
    }

    this.add
      .image(0, 0, "vignette")
      .setOrigin(0)
      .setDepth(80)
      .setAlpha(0.7)
      .setScrollFactor(0);
  }

  private clearMotes(): void {
    for (const mote of this.motes) {
      this.tweens.killTweensOf(mote);
      mote.destroy();
    }
    this.motes = [];
  }

  private spawnMotes(homes: Array<[number, number]>): void {
    this.clearMotes();
    for (let i = 0; i < homes.length; i += 1) {
      const [hx, hy] = homes[i];
      const mote = this.add
        .image(hx, hy, "mote")
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(0.52)
        .setDepth(5) as Mote;
      mote.homeX = hx;
      mote.homeY = hy;
      mote.phase = i * 0.7;
      this.tweens.add({
        targets: mote,
        alpha: { from: 0.55, to: 1 },
        scale: { from: 0.46, to: 0.58 },
        duration: 1400 + (i % 5) * 180,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
      this.motes.push(mote);
    }
  }

  private buildWisp(): void {
    this.trail = this.add.particles(0, 0, "spark", {
      speed: { min: 4, max: 26 },
      lifespan: { min: 600, max: 1300 },
      scale: { start: 0.55, end: 0 },
      alpha: { start: 0.5, end: 0 },
      tint: [0xffffff, 0x9fd8ff, 0xffe6a8],
      blendMode: Phaser.BlendModes.ADD,
      frequency: 36,
      quantity: 1,
      emitZone: {
        type: "random",
        source: new Phaser.Geom.Circle(0, 0, 18),
        quantity: 1,
      },
    });
    this.trail.setDepth(9);

    this.bloom = this.add
      .image(this.target.x, this.target.y, "wisp")
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(1.15)
      .setAlpha(0.35)
      .setDepth(9);

    this.wisp = this.add
      .image(this.target.x, this.target.y, "wisp")
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.48)
      .setDepth(10);

    this.reflection = this.add
      .image(this.target.x, this.mirrorY(this.target.y), "wisp")
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.42, -0.32)
      .setAlpha(0.22)
      .setDepth(-4);

    this.wispLight = this.lights.addLight(this.wisp.x, this.wisp.y, BASE_RADIUS, 0xd4e8ff, 1.15);
    this.trail.startFollow(this.wisp);

    this.add.particles(0, 0, "spark", {
      x: { min: 0, max: WORLD_WIDTH },
      y: { min: 40, max: WATER_TOP },
      speedY: { min: -6, max: 4 },
      speedX: { min: -8, max: 8 },
      lifespan: { min: 2800, max: 7000 },
      scale: { start: 0.22, end: 0 },
      alpha: { start: 0.28, end: 0 },
      tint: [0xb7d4ff, 0xffe6a8, 0xffffff],
      blendMode: Phaser.BlendModes.ADD,
      frequency: 90,
      quantity: 1,
    }).setDepth(2);
  }

  private buildGate(): void {
    this.gate = this.add
      .image(GATE_X, WORLD_HEIGHT * 0.48, "wisp")
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.35, 4.8)
      .setAlpha(0)
      .setDepth(6);
    this.gateLight = this.lights.addLight(GATE_X, WORLD_HEIGHT * 0.5, 160, 0xc8dcff, 0);
    this.veil = this.add
      .rectangle(0, 0, WORLD_WIDTH, WORLD_HEIGHT, 0x020308, 0)
      .setOrigin(0)
      .setDepth(200)
      .setScrollFactor(0);
  }

  private buildHud(): void {
    const originX = 28;
    const originY = 28;
    for (let i = 0; i < 5; i += 1) {
      const pip = this.add
        .image(originX + i * 18, originY, "pip")
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(0.55)
        .setAlpha(0.16)
        .setDepth(100)
        .setScrollFactor(0);
      this.pips.push(pip);
    }
    for (let i = 0; i < STAGES.length; i += 1) {
      const pip = this.add
        .image(WORLD_WIDTH - 28 - (STAGES.length - 1 - i) * 20, 28, "pip")
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(i === 0 ? 0.7 : 0.5)
        .setAlpha(i === 0 ? 0.85 : 0.2)
        .setDepth(100)
        .setScrollFactor(0);
      this.stagePips.push(pip);
    }
    this.titleMark = this.add
      .image(WORLD_WIDTH * 0.5, 64, "ring")
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(1.4)
      .setAlpha(0.35)
      .setDepth(90)
      .setScrollFactor(0);
    this.tweens.add({
      targets: this.titleMark,
      scale: { from: 1.2, to: 1.7 },
      alpha: { from: 0.18, to: 0.4 },
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private bindInput(): void {
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (pointer: Phaser.Input.Pointer) => {
      this.target.set(pointer.worldX, pointer.worldY);
    });
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      this.audio.unlock();
      this.beginPlay();
      this.target.set(pointer.worldX, pointer.worldY);
      this.pulse();
    });
    this.input.keyboard?.on("keydown", () => {
      this.audio.unlock();
      this.beginPlay();
    });
    this.cursors = this.input.keyboard!.createCursorKeys();
  }

  private pulse(): void {
    this.audio.pulse();
    this.tweens.add({
      targets: this.wispLight,
      intensity: { from: 2.6, to: this.baseIntensity() },
      duration: 480,
      ease: "Quad.easeOut",
    });
    this.trail.explode(22, this.wisp.x, this.wisp.y);
  }

  private baseIntensity(): number {
    return 1.15 + this.collected * 0.1;
  }

  private baseScale(): number {
    return 0.48 + this.collected * 0.022;
  }

  private mirrorY(y: number): number {
    return WATER_TOP + (WATER_TOP - y) * 0.35 + 36;
  }

  update(time: number, delta: number): void {
    if (this.phase === "failing" || this.phase === "ending") {
      this.wispLight.setPosition(this.wisp.x, this.wisp.y);
      return;
    }

    const step = (delta / 1000) * 340;
    if (this.cursors.left.isDown) this.target.x -= step;
    if (this.cursors.right.isDown) this.target.x += step;
    if (this.cursors.up.isDown) this.target.y -= step;
    if (this.cursors.down.isDown) this.target.y += step;
    this.target.x = Phaser.Math.Clamp(this.target.x, 24, WORLD_WIDTH - 24);
    this.target.y = Phaser.Math.Clamp(this.target.y, 24, WATER_TOP - 8);

    const t = 1 - Math.pow(0.002, delta / 1000);
    this.wisp.x = Phaser.Math.Linear(this.wisp.x, this.target.x, t);
    this.wisp.y = Phaser.Math.Linear(this.wisp.y, this.target.y, t);
    this.wispLight.setPosition(this.wisp.x, this.wisp.y);

    const breath = 1 + 0.07 * Math.sin(time / 420);
    this.wisp.setScale(this.baseScale() * breath);
    this.bloom.setPosition(this.wisp.x, this.wisp.y);
    this.bloom.setScale(this.baseScale() * 2.3 * breath);
    this.bloom.setAlpha(0.28 + 0.08 * Math.sin(time / 520));
    this.wispLight.intensity = this.baseIntensity() * (1 + 0.05 * Math.sin(time / 480));

    const ripple = Math.sin(time / 380) * 6;
    this.reflection.setPosition(this.wisp.x + ripple, this.mirrorY(this.wisp.y));
    this.reflection.setAlpha(this.wisp.y > WATER_TOP - 220 ? 0.4 : 0.16);
    this.reflection.setScale(this.baseScale() * 0.9, -this.baseScale() * 0.65);

    for (const mote of this.motes) {
      mote.x = mote.homeX + Math.sin(time / 700 + mote.phase) * 14;
      mote.y = mote.homeY + Math.cos(time / 920 + mote.phase) * 10;
    }

    for (let i = 0; i < this.swaying.length; i += 1) {
      this.swaying[i].rotation = Math.sin(time / 1400 + i * 0.4) * 0.05;
    }

    this.collectNearbyMotes();
    this.wane(time, delta);
    this.tryGate();
  }

  private collectNearbyMotes(): void {
    for (let i = this.motes.length - 1; i >= 0; i -= 1) {
      const mote = this.motes[i];
      if (Phaser.Math.Distance.Between(mote.x, mote.y, this.wisp.x, this.wisp.y) > COLLECT_RADIUS) {
        continue;
      }
      this.motes.splice(i, 1);
      this.tweens.killTweensOf(mote);
      this.trail.explode(14, mote.x, mote.y);
      const startX = mote.x;
      const startY = mote.y;
      mote.setDepth(11);
      const ring = this.add
        .image(startX, startY, "ring")
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(12)
        .setScale(0.4);
      this.tweens.add({
        targets: ring,
        scale: 2.4,
        alpha: 0,
        duration: 560,
        ease: "Quad.easeOut",
        onComplete: () => ring.destroy(),
      });
      this.tweens.add({
        targets: mote,
        scale: 0.12,
        alpha: 0.15,
        duration: 280,
        ease: "Cubic.easeIn",
        onUpdate: (tween) => {
          const p = tween.progress;
          mote.x = Phaser.Math.Linear(startX, this.wisp.x, p);
          mote.y = Phaser.Math.Linear(startY, this.wisp.y, p);
        },
        onComplete: () => {
          this.trail.explode(18, this.wisp.x, this.wisp.y);
          mote.destroy();
        },
      });
      this.collected += 1;
      this.stageCollected += 1;
      this.audio.unlock();
      this.beginPlay();
      this.audio.collect(this.collected);
      this.grow();
    }
  }

  private grow(): void {
    this.wispLight.radius = Math.min(640, this.wispLight.radius + RADIUS_STEP);
    this.wispLight.intensity = this.baseIntensity();
    const pip = this.pips[this.stageCollected - 1];
    if (pip) {
      pip.setAlpha(0.95);
      pip.setScale(0.85);
    }
    const need = STAGES[this.stageIndex].need;
    if (!this.gateOpen && this.stageCollected >= need) {
      this.openGate();
    }
    this.reportState();
  }

  private beginPlay(): void {
    if (this.phase !== "title") return;
    this.phase = "play";
    this.tweens.add({
      targets: this.titleMark,
      alpha: 0,
      scale: 2.4,
      duration: 700,
      ease: "Quad.easeOut",
      onComplete: () => this.titleMark.setVisible(false),
    });
  }

  private wane(time: number, delta: number): void {
    if (this.phase !== "play" || this.collected === 0) return;
    this.wispLight.radius = Math.max(56, this.wispLight.radius - WANE_PER_SEC * (delta / 1000));
    if (this.wispLight.radius < SNUFF_RADIUS + 40 && time - this.lastDrainAt > 900) {
      this.lastDrainAt = time;
      this.audio.drain();
    }
    if (this.wispLight.radius <= SNUFF_RADIUS) {
      this.snuff();
    }
    this.reportState();
  }

  private openGate(): void {
    this.gateOpen = true;
    this.audio.gate();
    this.tweens.add({
      targets: this.gate,
      alpha: 0.55,
      duration: 500,
      ease: "Sine.easeOut",
    });
    this.gateLight.intensity = 0.7;
    this.gateLight.radius = 200;
  }

  private closeGate(): void {
    this.gateOpen = false;
    this.gate.setAlpha(0);
    this.gateLight.intensity = 0;
  }

  private tryGate(): void {
    if (!this.gateOpen || this.phase !== "play") return;
    if (this.wisp.x < GATE_X - 36) return;
    this.nextStage();
  }

  private spawnStage(index: number, fromGate: boolean): void {
    this.stageIndex = index;
    this.stageCollected = 0;
    this.closeGate();
    const stage = STAGES[index];
    this.lights.setAmbientColor(stage.ambient);
    this.spawnMotes(stage.homes);
    this.applyBiome(index);
    for (let i = 0; i < this.pips.length; i += 1) {
      this.pips[i].setAlpha(i < stage.need ? 0.16 : 0);
      this.pips[i].setScale(0.55);
      this.pips[i].setVisible(i < stage.need);
    }
    for (let i = 0; i < this.stagePips.length; i += 1) {
      this.stagePips[i].setAlpha(i === index ? 0.9 : i < index ? 0.55 : 0.18);
      this.stagePips[i].setScale(i === index ? 0.72 : 0.48);
    }
    if (fromGate) {
      this.target.set(80, WORLD_HEIGHT * 0.58);
      this.wisp.setPosition(70, WORLD_HEIGHT * 0.58);
      this.wispLight.radius = Math.max(BASE_RADIUS, this.wispLight.radius * 0.85);
    }
    this.reportState();
  }

  private applyBiome(index: number): void {
    for (const tree of this.groveTrees) {
      tree.setAlpha(index === 1 ? 0.35 : 1);
    }
    for (const tree of this.pineTrees) {
      tree.setAlpha(index === 2 ? 0.45 : 1);
    }
    this.snag.setAlpha(index === 2 ? 1 : 0.85);
    this.snag.setX(index === 2 ? WORLD_WIDTH * 0.5 : 300);
  }

  private nextStage(): void {
    if (this.stageIndex >= STAGES.length - 1) {
      this.finish();
      return;
    }
    this.spawnStage(this.stageIndex + 1, true);
  }

  private snuff(): void {
    if (this.phase !== "play") return;
    this.phase = "failing";
    this.audio.fail();
    this.tweens.add({
      targets: this.veil,
      alpha: 0.92,
      duration: 420,
      yoyo: true,
      hold: 180,
      onYoyo: () => {
        this.spawnStage(this.stageIndex, true);
        this.wispLight.radius = BASE_RADIUS + this.stageIndex * 24;
        this.wisp.setScale(this.baseScale());
      },
      onComplete: () => {
        this.phase = "play";
        this.reportState();
      },
    });
  }

  private finish(): void {
    this.phase = "ending";
    this.closeGate();
    this.clearMotes();
    this.audio.ending();
    this.lights.setAmbientColor(0x1a2438);
    this.gateLight.setPosition(WORLD_WIDTH * 0.5, WORLD_HEIGHT * 0.42);
    this.gateLight.intensity = 0.55;
    this.gateLight.radius = 420;
    this.tweens.add({
      targets: this.wisp,
      x: WORLD_WIDTH * 0.5,
      y: WORLD_HEIGHT * 0.46,
      duration: 1600,
      ease: "Sine.easeInOut",
    });
    this.target.set(WORLD_WIDTH * 0.5, WORLD_HEIGHT * 0.46);
    this.tweens.add({
      targets: this.wispLight,
      radius: 520,
      intensity: 1.6,
      duration: 2200,
      ease: "Sine.easeOut",
    });
    this.reportState();
  }

  private announceReady(): void {
    document.body.dataset.gameReady = "true";
    this.reportState();
  }

  /** Test hook. Keep it in sync when the scene's state changes shape. */
  private reportState(): void {
    window.__glow = {
      ready: true,
      collected: this.collected,
      remaining: this.motes.length,
      glowRadius: this.wispLight.radius,
      lightsActive: this.lights.active,
    };
  }
}
