/**
 * The hollow's one new verb. A kindled press on a socket plants a lantern
 * and spends the glow the same way a forest press does. The planted light
 * stays; motes in this zone only kindle the next plant.
 */
export const SOCKET_RADIUS = 78;
export const LANTERN_LIGHT_RADIUS = 300;
export const LANTERN_LIGHT_INTENSITY = 1.45;

export interface SocketPoint {
  x: number;
  y: number;
}

export function socketInRange(wisp: SocketPoint, socket: SocketPoint, radius = SOCKET_RADIUS): boolean {
  return Math.hypot(wisp.x - socket.x, wisp.y - socket.y) <= radius;
}

export function nearestUnlitSocket(
  wisp: SocketPoint,
  sockets: Array<SocketPoint & { lit: boolean }>,
  radius = SOCKET_RADIUS,
): (SocketPoint & { lit: boolean }) | undefined {
  let best: (SocketPoint & { lit: boolean }) | undefined;
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
