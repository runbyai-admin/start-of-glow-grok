/**
 * The hollow's one new verb. A kindled press on a socket plants a lantern
 * and spends the glow the same way a forest press does. The planted light
 * stays; motes in this zone only kindle the next plant.
 *
 * Still water is the forest-never-saw-this mechanic: below the waterline the
 * wisp sinks and drags until a planted lantern stills that pool. Shadows
 * that enter a lantern's pool are washed into light.
 */
export const SOCKET_RADIUS = 100;
export const LANTERN_LIGHT_RADIUS = 360;
export const LANTERN_LIGHT_INTENSITY = 1.85;
/** Two walked motes rekindle a plant. The forest still asks for five. */
export const HOLLOW_TOUCH_RESTORE = 110;
/** Still-water line. Lanterns above it throw a dim reflection. */
export const WATER_Y = 560;
/** Fraction of walk speed left in unstilled water. */
export const WATER_SPEED_SCALE = 0.36;
/** Extra downward drift in unstilled water, as a fraction of the step. */
export const WATER_SINK_SCALE = 0.42;
/** How far a planted lantern stills water and washes shadows. */
export const LANTERN_HAVEN_SCALE = 0.62;

export interface SocketPoint {
  x: number;
  y: number;
}

export interface LitSocket extends SocketPoint {
  lit: boolean;
}

export function socketInRange(wisp: SocketPoint, socket: SocketPoint, radius = SOCKET_RADIUS): boolean {
  return Math.hypot(wisp.x - socket.x, wisp.y - socket.y) <= radius;
}

export function nearestUnlitSocket(
  wisp: SocketPoint,
  sockets: LitSocket[],
  radius = SOCKET_RADIUS,
): LitSocket | undefined {
  let best: LitSocket | undefined;
  let bestDist = radius;
  for (const socket of sockets) {
    if (socket.lit) continue;
    const d = Math.hypot(wisp.x - socket.x, wisp.y - socket.y);
    if (d <= bestDist) {
      best = socket;
      bestDist = d;
    }
  }
  return best;
}

export function requiredLanterns(required: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(required, total);
}

export function lanternHavenRadius(): number {
  return LANTERN_LIGHT_RADIUS * LANTERN_HAVEN_SCALE;
}

export function lanternHaven(point: SocketPoint, sockets: LitSocket[]): boolean {
  const radius = lanternHavenRadius();
  for (const socket of sockets) {
    if (!socket.lit) continue;
    if (Math.hypot(point.x - socket.x, point.y - socket.y) < radius) return true;
  }
  return false;
}

/** Below the waterline and outside every planted pool or lamp-road: the water still holds. */
export function inUnstillWater(point: SocketPoint, sockets: LitSocket[], waterY = WATER_Y): boolean {
  if (point.y <= waterY) return false;
  if (lanternHaven(point, sockets)) return false;
  if (nearLanternThread(point, sockets)) return false;
  return true;
}

export function waterSpeedScale(point: SocketPoint, sockets: LitSocket[], waterY = WATER_Y): number {
  return inUnstillWater(point, sockets, waterY) ? WATER_SPEED_SCALE : 1;
}

export const THREAD_RADIUS = 52;

export function distToSegment(point: SocketPoint, a: SocketPoint, b: SocketPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0
    ? 0
    : Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared));
  return Math.hypot(point.x - (a.x + dx * t), point.y - (a.y + dy * t));
}

/** Consecutive sockets in layout order: a standing road once both are lit, a guide to the next cold one. */
export function lanternThreads(sockets: LitSocket[]): Array<{ from: LitSocket; to: LitSocket; lit: boolean }> {
  const threads: Array<{ from: LitSocket; to: LitSocket; lit: boolean }> = [];
  for (let i = 0; i < sockets.length - 1; i += 1) {
    if (!sockets[i].lit) continue;
    threads.push({ from: sockets[i], to: sockets[i + 1], lit: sockets[i + 1].lit });
    if (!sockets[i + 1].lit) break;
  }
  return threads;
}

export function nearLanternThread(point: SocketPoint, sockets: LitSocket[], radius = THREAD_RADIUS): boolean {
  for (const thread of lanternThreads(sockets)) {
    if (distToSegment(point, thread.from, thread.to) <= radius) return true;
  }
  return false;
}
