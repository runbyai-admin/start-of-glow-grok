import Phaser from "phaser";

/**
 * Every texture in this repo is generated at runtime.
 * The spec forbids downloaded sprite packs, so shapes are drawn with the
 * canvas API into Phaser textures at boot. Drawn white so Light2D can tint them.
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

function rngOf(seed: number | string): Phaser.Math.RandomDataGenerator {
  return new Phaser.Math.RandomDataGenerator([String(seed)]);
}

/** Soft radial glow - the light-being itself, its motes, bloom discs. */
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
    gradient.addColorStop(0.32, edge);
    gradient.addColorStop(0.7, edge.replace(/[\d.]+\)$/, "0.12)"));
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(radius, radius, radius, 0, Math.PI * 2);
    ctx.fill();
  });
}

/** A filled ring used as the collect flash. */
export function makeRingTexture(scene: Phaser.Scene, key: string, radius: number): void {
  const size = radius * 2;
  makeCanvasTexture(scene, key, size, size, (ctx) => {
    const gradient = ctx.createRadialGradient(radius, radius, radius * 0.55, radius, radius, radius);
    gradient.addColorStop(0, "rgba(255,255,255,0)");
    gradient.addColorStop(0.7, "rgba(255,236,196,0.55)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(radius, radius, radius, 0, Math.PI * 2);
    ctx.fill();
  });
}

/**
 * Soft moon disc. Drawn in colour (not a Light2D silhouette) so it can sit
 * in the sky as a light source, not a lit object.
 */
export function makeMoonTexture(scene: Phaser.Scene, key: string, radius: number): void {
  const size = radius * 2;
  makeCanvasTexture(scene, key, size, size, (ctx) => {
    const g = ctx.createRadialGradient(radius * 0.9, radius * 0.9, 0, radius, radius, radius);
    g.addColorStop(0, "rgba(230,236,255,0.95)");
    g.addColorStop(0.45, "rgba(186,204,232,0.55)");
    g.addColorStop(0.78, "rgba(140,164,210,0.18)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(radius, radius, radius, 0, Math.PI * 2);
    ctx.fill();
  });
}

/** Full-frame vignette: transparent centre, dark edges. */
export function makeVignetteTexture(scene: Phaser.Scene, key: string, width: number, height: number): void {
  makeCanvasTexture(scene, key, width, height, (ctx) => {
    const g = ctx.createRadialGradient(
      width * 0.5,
      height * 0.48,
      Math.min(width, height) * 0.22,
      width * 0.5,
      height * 0.5,
      Math.max(width, height) * 0.72,
    );
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(0.55, "rgba(2,4,10,0.18)");
    g.addColorStop(1, "rgba(0,0,0,0.72)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
  });
}

/** Distant hill range - one filled silhouette, seed picks the ridgeline. */
export function makeHillTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  seed: number,
): void {
  makeCanvasTexture(scene, key, width, height, (ctx) => {
    const rng = rngOf(seed);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(0, height * rng.realInRange(0.45, 0.7));
    const peaks = rng.between(4, 7);
    for (let i = 1; i <= peaks; i += 1) {
      const x = (width / peaks) * i;
      const y = height * rng.realInRange(0.08, 0.55);
      const cx = x - width / peaks / 2;
      const cy = height * rng.realInRange(0.12, 0.62);
      ctx.quadraticCurveTo(cx, cy, x, y);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
  });
}

/**
 * Broadleaf tree: tapered trunk, a few branches, a canopy of overlapping
 * discs. Seeded so a grove is a grove, not a clone stamp.
 */
export function makeCanopyTreeTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  seed: number,
): void {
  makeCanvasTexture(scene, key, width, height, (ctx) => {
    const rng = rngOf(seed);
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#ffffff";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const baseX = width / 2;
    const trunkTop = height * rng.realInRange(0.28, 0.4);
    ctx.beginPath();
    ctx.moveTo(baseX - width * 0.055, height);
    ctx.quadraticCurveTo(baseX - width * 0.02, height * 0.55, baseX - width * 0.018, trunkTop);
    ctx.lineTo(baseX + width * 0.018, trunkTop);
    ctx.quadraticCurveTo(baseX + width * 0.02, height * 0.55, baseX + width * 0.055, height);
    ctx.closePath();
    ctx.fill();

    const blobs = rng.between(22, 34);
    for (let i = 0; i < blobs; i += 1) {
      const bx = baseX + rng.realInRange(-width * 0.34, width * 0.34);
      const by = height * rng.realInRange(0.05, 0.36);
      const r = width * rng.realInRange(0.055, 0.145);
      ctx.beginPath();
      ctx.ellipse(bx, by, r, r * rng.realInRange(0.7, 1.08), rng.realInRange(-0.5, 0.5), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.lineWidth = Math.max(1.4, width * 0.01);
    const moss = rng.between(2, 4);
    for (let i = 0; i < moss; i += 1) {
      const mx = baseX + rng.realInRange(-width * 0.22, width * 0.22);
      const my = height * rng.realInRange(0.3, 0.4);
      ctx.beginPath();
      ctx.moveTo(mx, my);
      ctx.quadraticCurveTo(mx + rng.realInRange(-6, 6), my + 10, mx, my + rng.realInRange(12, 26));
      ctx.stroke();
    }
  });
}

/** Jagged pine - stacked irregular triangles, reads at a distance. */
export function makePineTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  seed: number,
): void {
  makeCanvasTexture(scene, key, width, height, (ctx) => {
    const rng = rngOf(seed);
    ctx.fillStyle = "#ffffff";
    const cx = width / 2;
    ctx.beginPath();
    ctx.moveTo(cx - width * 0.04, height);
    ctx.lineTo(cx - width * 0.018, height * 0.62);
    ctx.lineTo(cx + width * 0.018, height * 0.62);
    ctx.lineTo(cx + width * 0.04, height);
    ctx.closePath();
    ctx.fill();

    const layers = rng.between(5, 7);
    for (let i = 0; i < layers; i += 1) {
      const top = height * (0.02 + i * 0.1);
      const bottom = Math.min(height * 0.7, top + height * 0.2);
      const half = width * (0.16 + i * 0.11);
      const jogL = rng.realInRange(0.88, 1.06);
      const jogR = rng.realInRange(0.88, 1.06);
      ctx.beginPath();
      ctx.moveTo(cx, top);
      ctx.lineTo(cx - half * jogL, bottom);
      ctx.lineTo(cx + half * jogR, bottom);
      ctx.closePath();
      ctx.fill();
    }
  });
}

/** Dead snag - trunk and a few broken limbs, no canopy. */
export function makeSnagTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  seed: number,
): void {
  makeCanvasTexture(scene, key, width, height, (ctx) => {
    const rng = rngOf(seed);
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#ffffff";
    ctx.lineCap = "round";
    const cx = width / 2;
    ctx.beginPath();
    ctx.moveTo(cx - width * 0.07, height);
    ctx.quadraticCurveTo(cx - width * 0.03, height * 0.45, cx - width * 0.02, height * 0.08);
    ctx.lineTo(cx + width * 0.015, height * 0.06);
    ctx.quadraticCurveTo(cx + width * 0.04, height * 0.45, cx + width * 0.08, height);
    ctx.closePath();
    ctx.fill();
    const limbs = rng.between(2, 4);
    for (let i = 0; i < limbs; i += 1) {
      const y = height * rng.realInRange(0.18, 0.48);
      const dir = i % 2 === 0 ? -1 : 1;
      const len = width * rng.realInRange(0.12, 0.22);
      ctx.lineWidth = Math.max(2, width * 0.03 * (1 - i / limbs));
      ctx.beginPath();
      ctx.moveTo(cx, y);
      ctx.quadraticCurveTo(cx + dir * len * 0.55, y - len * 0.2, cx + dir * len, y - len * 0.15);
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
    const rng = rngOf(seed);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(0, height * 0.55);
    const steps = 8;
    for (let i = 1; i <= steps; i += 1) {
      const x = (width / steps) * i;
      const y = height * rng.realInRange(0.28, 0.62);
      const cx = x - width / steps / 2;
      const cy = height * rng.realInRange(0.22, 0.7);
      ctx.quadraticCurveTo(cx, cy, x, y);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
  });
}

/** Still-water band: a dark sheet with a faint highlight along the far shore. */
export function makeWaterTexture(scene: Phaser.Scene, key: string, width: number, height: number): void {
  makeCanvasTexture(scene, key, width, height, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, height);
    g.addColorStop(0, "#d8e4f0");
    g.addColorStop(0.12, "#9aacbf");
    g.addColorStop(1, "#6d7c90");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
  });
}

/** A grass tuft - a handful of blades from one root. */
export function makeGrassTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  seed: number,
): void {
  makeCanvasTexture(scene, key, width, height, (ctx) => {
    const rng = rngOf(seed);
    ctx.strokeStyle = "#ffffff";
    ctx.lineCap = "round";
    const blades = rng.between(7, 12);
    const rootX = width / 2;
    const rootY = height * 0.95;
    for (let i = 0; i < blades; i += 1) {
      const lean = rng.realInRange(-0.55, 0.55);
      const h = height * rng.realInRange(0.45, 0.95);
      ctx.lineWidth = rng.realInRange(1.6, 3.4);
      ctx.beginPath();
      ctx.moveTo(rootX, rootY);
      ctx.quadraticCurveTo(rootX + lean * width * 0.25, rootY - h * 0.55, rootX + lean * width * 0.45, rootY - h);
      ctx.stroke();
    }
  });
}

/** A fern: central rachis, paired leaflets. */
export function makeFernTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  seed: number,
): void {
  makeCanvasTexture(scene, key, width, height, (ctx) => {
    const rng = rngOf(seed);
    ctx.strokeStyle = "#ffffff";
    ctx.fillStyle = "#ffffff";
    ctx.lineCap = "round";
    const x0 = width * 0.2;
    const y0 = height * 0.95;
    const x1 = width * 0.82;
    const y1 = height * 0.08;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(width * 0.35, height * 0.55, x1, y1);
    ctx.stroke();
    const pairs = rng.between(6, 9);
    for (let i = 1; i < pairs; i += 1) {
      const t = i / pairs;
      const x = x0 + (x1 - x0) * t;
      const y = y0 + (y1 - y0) * t * t;
      const len = width * (0.28 - t * 0.18);
      ctx.lineWidth = 2;
      for (const dir of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + dir * len * 0.5, y - len * 0.15, x + dir * len, y - len * 0.05);
        ctx.stroke();
      }
    }
  });
}

/** A low boulder silhouette. */
export function makeRockTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  seed: number,
): void {
  makeCanvasTexture(scene, key, width, height, (ctx) => {
    const rng = rngOf(seed);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(0, height);
    const pts = rng.between(5, 7);
    for (let i = 0; i <= pts; i += 1) {
      const x = (width / pts) * i;
      const y = height * (i === 0 || i === pts ? 0.85 : rng.realInRange(0.08, 0.55));
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
  });
}
