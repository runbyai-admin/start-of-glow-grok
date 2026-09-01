import Phaser from "phaser";

/**
 * Every texture in this repo is generated at runtime.
 * The spec forbids downloaded sprite packs, so shapes are drawn with the
 * canvas API into Phaser textures at boot.
 */

function makeCanvasTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
): void {
  if (scene.textures.exists(key)) return;
  const texture = scene.textures.createCanvas(key, width, height);
  if (!texture) throw new Error(`could not create canvas texture "${key}"`);
  const ctx = texture.getContext();
  draw(ctx);
  texture.refresh();
}

/** Soft radial glow - the light-being itself, and its motes. */
export function makeGlowTexture(
  scene: Phaser.Scene,
  key: string,
  radius: number,
  core: string,
  edge: string,
): void {
  const size = radius * 2;
  makeCanvasTexture(scene, key, size, size, (ctx) => {
    const gradient = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
    gradient.addColorStop(0, core);
    gradient.addColorStop(0.35, edge);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(radius, radius, radius, 0, Math.PI * 2);
    ctx.fill();
  });
}

/**
 * A tree silhouette: a tapering trunk with a few branches. Drawn white so the
 * Light2D pipeline can tint and light it; the scene applies the dark tint.
 */
export function makeTreeTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  seed: number,
): void {
  makeCanvasTexture(scene, key, width, height, (ctx) => {
    const rng = new Phaser.Math.RandomDataGenerator([String(seed)]);
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#ffffff";
    ctx.lineCap = "round";

    const baseX = width / 2;
    ctx.beginPath();
    ctx.moveTo(baseX - width * 0.16, height);
    ctx.quadraticCurveTo(baseX - width * 0.06, height * 0.4, baseX - width * 0.04, 0);
    ctx.lineTo(baseX + width * 0.04, 0);
    ctx.quadraticCurveTo(baseX + width * 0.06, height * 0.4, baseX + width * 0.16, height);
    ctx.closePath();
    ctx.fill();

    const branches = rng.between(3, 5);
    for (let i = 0; i < branches; i += 1) {
      const y = height * (0.15 + 0.6 * (i / branches));
      const dir = i % 2 === 0 ? -1 : 1;
      const len = width * rng.realInRange(0.25, 0.45);
      ctx.lineWidth = Math.max(2, width * 0.05 * (1 - i / branches));
      ctx.beginPath();
      ctx.moveTo(baseX, y);
      ctx.quadraticCurveTo(baseX + dir * len * 0.6, y - len * 0.25, baseX + dir * len, y - len * 0.7);
      ctx.stroke();
    }
  });
}

/** A lumpy ground ridge, used as the foreground silhouette band. */
export function makeGroundTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  seed: number,
): void {
  makeCanvasTexture(scene, key, width, height, (ctx) => {
    const rng = new Phaser.Math.RandomDataGenerator([String(seed)]);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(0, height * 0.6);
    const steps = 12;
    for (let i = 1; i <= steps; i += 1) {
      const x = (width / steps) * i;
      const y = height * rng.realInRange(0.35, 0.75);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
  });
}

/**
 * The night sky: a near-black vertical gradient with a faint indigo lift near
 * the horizon, scattered with still stars. Drawn once at full viewport size
 * and held fixed on screen (scrollFactor 0) - real skies don't parallax.
 */
export function makeSkyTexture(scene: Phaser.Scene, key: string, width: number, height: number, seed: number): void {
  makeCanvasTexture(scene, key, width, height, (ctx) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#05060c");
    gradient.addColorStop(0.55, "#070a14");
    gradient.addColorStop(1, "#0d1526");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const rng = new Phaser.Math.RandomDataGenerator([String(seed)]);
    const starCount = Math.round((width * height) / 5200);
    for (let i = 0; i < starCount; i += 1) {
      const x = rng.between(0, width);
      const y = rng.between(0, height * 0.75);
      const r = rng.realInRange(0.4, 1.5);
      ctx.globalAlpha = rng.realInRange(0.18, 0.75);
      ctx.fillStyle = i % 5 === 0 ? "#bfe4ff" : "#f2f6ff";
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  });
}

/** A distant, gently rolling silhouette ridge - sits behind the trees. */
export function makeHillsTexture(scene: Phaser.Scene, key: string, width: number, height: number, seed: number): void {
  makeCanvasTexture(scene, key, width, height, (ctx) => {
    const rng = new Phaser.Math.RandomDataGenerator([String(seed)]);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(0, height * 0.6);
    const steps = 9;
    let prevY = height * 0.6;
    for (let i = 1; i <= steps; i += 1) {
      const x = (width / steps) * i;
      // Small deltas from the previous point keep the ridge gentle and
      // rolling instead of the jagged silhouette the ground uses.
      const y = Phaser.Math.Clamp(prevY + rng.realInRange(-height * 0.14, height * 0.14), height * 0.25, height * 0.65);
      const midX = x - width / steps / 2;
      ctx.quadraticCurveTo(midX, prevY, x, y);
      prevY = y;
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
  });
}

/**
 * A shadow-creature: an irregular dark blob (not a circle - the wisp already
 * owns "perfect radial glow", so the hazard needs to read as a different kind
 * of thing at a glance) with a thin cold rim light. The rim is what the
 * player actually sees coming in the dark; the fill is near-black so it never
 * competes with the wisp's warmth for attention.
 */
export function makeHazardTexture(scene: Phaser.Scene, key: string, radius: number, seed: number): void {
  const size = radius * 2;
  makeCanvasTexture(scene, key, size, size, (ctx) => {
    const rng = new Phaser.Math.RandomDataGenerator([String(seed)]);
    const cx = radius;
    const cy = radius;

    // Irregular blob outline: a ring of points at varying radii, splined.
    const points = 9;
    const coords: Array<[number, number]> = [];
    for (let i = 0; i < points; i += 1) {
      const angle = (i / points) * Math.PI * 2;
      const r = radius * rng.realInRange(0.62, 0.98);
      coords.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]);
    }

    const rim = ctx.createRadialGradient(cx, cy, radius * 0.35, cx, cy, radius);
    rim.addColorStop(0, "rgba(30,16,46,0.92)");
    rim.addColorStop(0.75, "rgba(64,34,96,0.55)");
    rim.addColorStop(1, "rgba(120,80,190,0)");
    ctx.fillStyle = rim;
    ctx.beginPath();
    ctx.moveTo(coords[0][0], coords[0][1]);
    for (let i = 1; i <= points; i += 1) {
      const [x, y] = coords[i % points];
      const [px, py] = coords[i - 1];
      ctx.quadraticCurveTo(px, py, (px + x) / 2, (py + y) / 2);
    }
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(150,110,220,0.5)";
    ctx.lineWidth = Math.max(1, radius * 0.05);
    ctx.stroke();
  });
}

/** Cave vault: no stars, a warm-black lift toward the floor so water can read. */
export function makeCaveSkyTexture(scene: Phaser.Scene, key: string, width: number, height: number): void {
  makeCanvasTexture(scene, key, width, height, (ctx) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#050308");
    gradient.addColorStop(0.45, "#08060c");
    gradient.addColorStop(1, "#120e16");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  });
}

/** Horizon lift for the ending that pays the hollow off - not the night forest. */
export function makeDawnSkyTexture(scene: Phaser.Scene, key: string, width: number, height: number): void {
  makeCanvasTexture(scene, key, width, height, (ctx) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#0a0c18");
    gradient.addColorStop(0.45, "#1a1420");
    gradient.addColorStop(0.78, "#4a2a28");
    gradient.addColorStop(1, "#c47848");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  });
}

/**
 * A standing lamp, not a mote. Stem, cage, and a globe bigger than the wisp
 * that planted it - the hollow's "I left a light" tell.
 */
export function makeLanternTexture(scene: Phaser.Scene, key: string): void {
  makeCanvasTexture(scene, key, 96, 160, (ctx) => {
    const glow = ctx.createRadialGradient(48, 52, 0, 48, 58, 46);
    glow.addColorStop(0, "rgba(255,244,214,1)");
    glow.addColorStop(0.28, "rgba(255,186,92,0.8)");
    glow.addColorStop(1, "rgba(255,140,40,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 96, 120);

    ctx.fillStyle = "rgba(58, 36, 18, 0.95)";
    ctx.fillRect(45, 72, 6, 78);
    ctx.fillRect(38, 146, 20, 6);

    ctx.strokeStyle = "rgba(90, 58, 28, 0.85)";
    ctx.lineWidth = 2;
    ctx.strokeRect(36, 34, 24, 34);
    ctx.beginPath();
    ctx.moveTo(48, 34);
    ctx.lineTo(48, 68);
    ctx.moveTo(36, 51);
    ctx.lineTo(60, 51);
    ctx.stroke();

    ctx.fillStyle = "rgba(255, 236, 190, 0.95)";
    ctx.beginPath();
    ctx.arc(48, 50, 10, 0, Math.PI * 2);
    ctx.fill();
  });
}

/** Hanging stone: wide at the vault, tapering to a point. No branches. */
export function makeStalactiteTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  seed: number,
): void {
  makeCanvasTexture(scene, key, width, height, (ctx) => {
    const rng = new Phaser.Math.RandomDataGenerator([String(seed)]);
    ctx.fillStyle = "#ffffff";
    const top = width / 2;
    ctx.beginPath();
    ctx.moveTo(width * 0.04, 0);
    ctx.lineTo(width * 0.96, 0);
    const lumps = rng.between(4, 6);
    for (let i = 1; i <= lumps; i += 1) {
      const t = i / lumps;
      const y = height * t;
      const half = (width * 0.46) * (1 - t * 0.94) * rng.realInRange(0.78, 1.12);
      ctx.lineTo(top + half, y);
    }
    ctx.lineTo(top, height);
    for (let i = lumps; i >= 1; i -= 1) {
      const t = i / lumps;
      const y = height * t;
      const half = (width * 0.46) * (1 - t * 0.94) * rng.realInRange(0.78, 1.12);
      ctx.lineTo(top - half, y);
    }
    ctx.closePath();
    ctx.fill();
  });
}

/** Closed vault band along the top of the cave - the sky is gone. */
export function makeCaveCeilingTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  seed: number,
): void {
  makeCanvasTexture(scene, key, width, height, (ctx) => {
    const rng = new Phaser.Math.RandomDataGenerator([String(seed)]);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(width, 0);
    ctx.lineTo(width, height * 0.35);
    const steps = 14;
    for (let i = steps; i >= 0; i -= 1) {
      const x = (width / steps) * i;
      const y = height * rng.realInRange(0.4, 0.95);
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  });
}

/** The hollow's heart: a warm crystal, not the forest beacon. */
export function makeHeartTexture(scene: Phaser.Scene, key: string): void {
  makeCanvasTexture(scene, key, 180, 180, (ctx) => {
    const g = ctx.createRadialGradient(90, 90, 0, 90, 90, 90);
    g.addColorStop(0, "rgba(255,236,200,1)");
    g.addColorStop(0.28, "rgba(255,176,96,0.75)");
    g.addColorStop(0.62, "rgba(210,120,70,0.28)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 180, 180);

    ctx.fillStyle = "rgba(255, 230, 190, 0.9)";
    ctx.beginPath();
    ctx.moveTo(90, 28);
    ctx.lineTo(124, 78);
    ctx.lineTo(108, 150);
    ctx.lineTo(72, 150);
    ctx.lineTo(56, 78);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(255, 200, 130, 0.55)";
    ctx.beginPath();
    ctx.moveTo(90, 46);
    ctx.lineTo(112, 82);
    ctx.lineTo(90, 132);
    ctx.lineTo(68, 82);
    ctx.closePath();
    ctx.fill();
  });
}

/** A dim stone ring on the cave floor. Lit sockets keep using this, just brighter. */
export function makeSocketTexture(scene: Phaser.Scene, key: string): void {
  makeCanvasTexture(scene, key, 90, 56, (ctx) => {
    ctx.strokeStyle = "rgba(210, 186, 130, 0.9)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(45, 30, 32, 14, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(140, 118, 78, 0.45)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(45, 30, 20, 8, 0, 0, Math.PI * 2);
    ctx.stroke();
  });
}
