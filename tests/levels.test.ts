import assert from "node:assert/strict";
import test from "node:test";
import { LEVEL_1_LAYOUT, LEVEL_2_LAYOUT, LEVEL_3_LAYOUT, LEVEL_4_LAYOUT, type LevelLayout } from "../src/levels.ts";
import { WATER_Y } from "../src/lantern.ts";

function distanceToSegment(
  point: { x: number; y: number },
  start: { x: number; y: number },
  end: { x: number; y: number },
): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0
    ? 0
    : Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  return Math.hypot(point.x - (start.x + dx * t), point.y - (start.y + dy * t));
}

function orientation(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function distanceBetweenSegments(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
  d: { x: number; y: number },
): number {
  const crosses = orientation(a, b, c) * orientation(a, b, d) <= 0
    && orientation(c, d, a) * orientation(c, d, b) <= 0;
  if (crosses) return 0;
  return Math.min(
    distanceToSegment(a, c, d),
    distanceToSegment(b, c, d),
    distanceToSegment(c, a, b),
    distanceToSegment(d, a, b),
  );
}

function assertRouteContract(
  layout: LevelLayout,
  safeCount: number,
  riskyCount: number,
  hazardCount: number,
): void {
  assert.equal(layout.motes.length, safeCount + riskyCount);
  assert.equal(layout.hazards.length, hazardCount);

  const safe = layout.motes.slice(0, safeCount);
  const route = safe.concat({ x: 2202, y: 245 });
  for (const [index, start] of route.slice(0, -1).entries()) {
    const end = route[index + 1];
    const clearance = Math.min(
      ...layout.hazards.flatMap((loop) =>
        loop.map((hazardStart, waypoint) =>
          distanceBetweenSegments(start, end, hazardStart, loop[(waypoint + 1) % loop.length]),
        ),
      ),
    );
    assert.ok(clearance >= 200, `safe link ${index + 1}-${index + 2} has only ${clearance.toFixed(1)}px clearance`);
  }

  const risky = layout.motes.slice(safeCount).filter((mote) =>
    layout.hazards.some((loop) =>
      loop.some((start, waypoint) => distanceToSegment(mote, start, loop[(waypoint + 1) % loop.length]) < 90),
    ),
  );
  assert.equal(risky.length, riskyCount);
}

test("level 2 has a thirteen-mote safe corridor and five shadow-pocket choices", () => {
  assertRouteContract(LEVEL_2_LAYOUT, 13, 5, 4);
});

test("level 1 keeps ten required motes safe and four pull-pocket choices risky", () => {
  assertRouteContract(LEVEL_1_LAYOUT, 10, 4, 2);
});

test("level 3 has a sixteen-mote safe detour and six paid-gate choices", () => {
  assertRouteContract(LEVEL_3_LAYOUT, 16, 6, 6);
});

test("the hollow keeps a ten-mote kindling road and four pocket lights", () => {
  const layout = LEVEL_4_LAYOUT;
  assert.equal(layout.motes.length, 14);
  assert.equal(layout.hazards.length, 3);
  const kindling = layout.motes.slice(0, 10);
  for (const [index, mote] of kindling.entries()) {
    const near = layout.hazards.some((loop) =>
      loop.some((start, waypoint) => distanceToSegment(mote, start, loop[(waypoint + 1) % loop.length]) < 90),
    );
    assert.equal(near, false, `kindling mote ${index + 1} sits inside a patrol`);
  }
  const risky = layout.motes.slice(10).filter((mote) =>
    layout.hazards.some((loop) =>
      loop.some((start, waypoint) => distanceToSegment(mote, start, loop[(waypoint + 1) % loop.length]) < 90),
    ),
  );
  assert.equal(risky.length, 4);
});

test("the hollow plants five road sockets, the third in still water, and two pocket ones", () => {
  const sockets = LEVEL_4_LAYOUT.sockets ?? [];
  assert.equal(sockets.length, 7);
  assert.ok(sockets[2].y > WATER_Y, "the third heart socket must sit in the lake");
  assert.ok(sockets[0].y < WATER_Y && sockets[1].y < WATER_Y);
  assert.ok(sockets[3].y < WATER_Y && sockets[4].y < WATER_Y);
  const beacon = { x: 2202, y: 245 };
  const dryLinks: Array<[{ x: number; y: number }, { x: number; y: number }]> = [
    [{ x: 220, y: 446 }, sockets[0]],
    [sockets[0], sockets[1]],
    [sockets[3], sockets[4]],
    [sockets[4], beacon],
  ];
  for (const [index, [from, to]] of dryLinks.entries()) {
    const clearance = Math.min(
      ...LEVEL_4_LAYOUT.hazards.flatMap((loop) =>
        loop.map((hazardStart, waypoint) =>
          distanceBetweenSegments(from, to, hazardStart, loop[(waypoint + 1) % loop.length]),
        ),
      ),
    );
    assert.ok(clearance >= 200, `dry socket link ${index + 1} has only ${clearance.toFixed(1)}px clearance`);
  }
  const risky = sockets.slice(5).filter((socket) =>
    LEVEL_4_LAYOUT.hazards.some((loop) =>
      loop.some((startPt, waypoint) => distanceToSegment(socket, startPt, loop[(waypoint + 1) % loop.length]) < 90),
    ),
  );
  assert.equal(risky.length, 2);
});
