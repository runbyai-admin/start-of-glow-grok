import Phaser from "phaser";
import { GlowAudio } from "../audio";
import {
  makeCanopyTreeTexture,
  makeFernTexture,
  makeGlowTexture,
  makeGrassTexture,
  makeGroundTexture,
  makeHillTexture,
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

const MOTE_COUNT = 12;
const COLLECT_RADIUS = 48;
const WATER_TOP = WORLD_HEIGHT - 86;
const BASE_RADIUS = 250;
const RADIUS_STEP = 42;

type Mote = Phaser.GameObjects.Image & { homeX: number; homeY: number; phase: number };

/**
 * Round 1 is an atmosphere slice: a dark forest, a small light-being, motes
 * that grow the glow. The world is silhouettes. Light is the camera.
 */
export class BootScene extends Phaser.Scene {
  private wisp!: Phaser.GameObjects.Image;
  private bloom!: Phaser.GameObjects.Image;
  private reflection!: Phaser.GameObjects.Image;
  private wispLight!: Phaser.GameObjects.Light;
  private trail!: Phaser.GameObjects.Particles.ParticleEmitter;
  private motes: Mote[] = [];
  private pips: Phaser.GameObjects.Image[] = [];
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private target = new Phaser.Math.Vector2(WORLD_WIDTH * 0.38, WORLD_HEIGHT * 0.58);
  private collected = 0;
  private audio = new GlowAudio();
  private swaying: Phaser.GameObjects.Image[] = [];

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
    this.buildShore();
    this.buildMotes();
    this.buildWisp();
    this.buildHud();
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
    }

    const snag = this.add
      .image(300, WATER_TOP + 12, "snag")
      .setOrigin(0.5, 1)
      .setScale(0.7)
      .setTint(0x222a38)
      .setDepth(-28);
    snag.setPipeline("Light2D");
  }

  private buildShore(): void {
    const ground = this.add
      .image(0, WORLD_HEIGHT + 8, "ground")
      .setOrigin(0, 1)
      .setTint(0x1a2430)
      .setDepth(-10);
    ground.setPipeline("Light2D");

    const water = this.add
      .image(0, WORLD_HEIGHT, "water")
      .setOrigin(0, 1)
      .setTint(0x1a3044)
      .setAlpha(0.55)
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
        .setTint(0x1c2834)
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
        .setTint(0x1a2630)
        .setDepth(20);
      fern.setPipeline("Light2D");
      this.swaying.push(fern);
    }

    this.add
      .image(0, 0, "vignette")
      .setOrigin(0)
      .setDepth(80)
      .setAlpha(0.9)
      .setScrollFactor(0);
  }

  private buildMotes(): void {
    // A gentle path through the grove, not a uniform scatter - still dense
    // enough that a pointer sweep across the canvas collects at least one.
    const homes: Array<[number, number]> = [
      [180, 250],
      [310, 360],
      [420, 210],
      [520, 430],
      [610, 280],
      [700, 190],
      [780, 360],
      [870, 240],
      [960, 400],
      [1080, 270],
      [240, 480],
      [1010, 500],
    ];
    for (let i = 0; i < MOTE_COUNT; i += 1) {
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
  }

  private buildHud(): void {
    // Wordless: a row of dim pips that warm as motes are taken.
    const originX = 28;
    const originY = 28;
    for (let i = 0; i < MOTE_COUNT; i += 1) {
      const pip = this.add
        .image(originX + i * 18, originY, "pip")
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(0.55)
        .setAlpha(0.18)
        .setDepth(100)
        .setScrollFactor(0);
      this.pips.push(pip);
    }
  }

  private bindInput(): void {
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (pointer: Phaser.Input.Pointer) => {
      this.target.set(pointer.worldX, pointer.worldY);
    });
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      this.audio.unlock();
      this.target.set(pointer.worldX, pointer.worldY);
      this.pulse();
    });
    this.input.keyboard?.on("keydown", () => this.audio.unlock());
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
    this.reflection.setAlpha(this.wisp.y > WATER_TOP - 180 ? 0.28 : 0.1);
    this.reflection.setScale(this.baseScale() * 0.9, -this.baseScale() * 0.65);

    for (const mote of this.motes) {
      mote.x = mote.homeX + Math.sin(time / 700 + mote.phase) * 14;
      mote.y = mote.homeY + Math.cos(time / 920 + mote.phase) * 10;
    }

    for (let i = 0; i < this.swaying.length; i += 1) {
      this.swaying[i].rotation = Math.sin(time / 1400 + i * 0.4) * 0.05;
    }

    this.collectNearbyMotes();
  }

  private collectNearbyMotes(): void {
    for (let i = this.motes.length - 1; i >= 0; i -= 1) {
      const mote = this.motes[i];
      if (Phaser.Math.Distance.Between(mote.x, mote.y, this.wisp.x, this.wisp.y) > COLLECT_RADIUS) {
        continue;
      }
      this.motes.splice(i, 1);
      this.tweens.killTweensOf(mote);
      this.trail.explode(20, mote.x, mote.y);
      const ring = this.add
        .image(mote.x, mote.y, "ring")
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(12)
        .setScale(0.4);
      this.tweens.add({
        targets: ring,
        scale: 2.6,
        alpha: 0,
        duration: 520,
        ease: "Quad.easeOut",
        onComplete: () => ring.destroy(),
      });
      mote.destroy();
      this.collected += 1;
      this.audio.unlock();
      this.audio.collect(this.collected);
      this.grow();
    }
  }

  private grow(): void {
    this.wispLight.radius = BASE_RADIUS + this.collected * RADIUS_STEP;
    this.wispLight.intensity = this.baseIntensity();
    if (this.pips[this.collected - 1]) {
      this.pips[this.collected - 1].setAlpha(0.95);
      this.pips[this.collected - 1].setScale(0.85);
    }
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
