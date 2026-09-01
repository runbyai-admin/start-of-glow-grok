import assert from "node:assert/strict";
import test from "node:test";
import {
  HOLLOW_TOUCH_RESTORE,
  WATER_SPEED_SCALE,
  WATER_Y,
  inUnstillWater,
  lanternHaven,
  lanternThreads,
  nearestUnlitSocket,
  nearLanternThread,
  requiredLanterns,
  socketInRange,
  SOCKET_RADIUS,
  waterSpeedScale,
} from "../src/lantern.ts";
import { REACH_MIN, REACH_READY, reachReady, spendReach } from "../src/reach.ts";

test("a kindled press on a socket spends the glow the same way a forest pull does", () => {
  assert.equal(reachReady(REACH_READY), true);
  const spent = spendReach(REACH_READY);
  assert.equal(spent, REACH_MIN);
  assert.equal(reachReady(spent), false);
});

test("the nearest unlit socket within planting range is the one that takes the press", () => {
  const sockets = [
    { x: 400, y: 450, lit: false },
    { x: 760, y: 470, lit: false },
  ];
  const near = nearestUnlitSocket({ x: 410, y: 448 }, sockets);
  assert.equal(near, sockets[0]);
  sockets[0].lit = true;
  assert.equal(nearestUnlitSocket({ x: 410, y: 448 }, sockets), undefined);
  assert.equal(socketInRange({ x: 400, y: 450 }, sockets[0], SOCKET_RADIUS), true);
});

test("five of seven lanterns open the heart", () => {
  assert.equal(requiredLanterns(5, 7), 5);
  assert.equal(requiredLanterns(5, 0), 0);
  assert.equal(requiredLanterns(9, 7), 7);
});

test("two walked motes in the hollow rekindle a plant", () => {
  let reach = spendReach(REACH_READY);
  reach = Math.min(REACH_READY, reach + HOLLOW_TOUCH_RESTORE);
  assert.equal(reachReady(reach), false);
  reach = Math.min(REACH_READY + 80, reach + HOLLOW_TOUCH_RESTORE);
  assert.ok(reachReady(reach));
});

test("unstilled water holds the wisp, a planted lantern stills that pool", () => {
  const sockets = [
    { x: 400, y: 450, lit: false },
    { x: 800, y: 660, lit: true },
  ];
  assert.equal(inUnstillWater({ x: 220, y: 446 }, sockets), false);
  assert.equal(inUnstillWater({ x: 400, y: WATER_Y + 40 }, sockets), true);
  assert.equal(waterSpeedScale({ x: 400, y: WATER_Y + 40 }, sockets), WATER_SPEED_SCALE);
  assert.equal(inUnstillWater({ x: 800, y: WATER_Y + 40 }, sockets), false);
  assert.equal(waterSpeedScale({ x: 800, y: WATER_Y + 40 }, sockets), 1);
});

test("a planted lantern's pool is a haven", () => {
  const sockets = [
    { x: 290, y: 450, lit: true },
    { x: 760, y: 470, lit: false },
  ];
  assert.equal(lanternHaven({ x: 300, y: 440 }, sockets), true);
  assert.equal(lanternHaven({ x: 760, y: 470 }, sockets), false);
});

test("a planted lantern throws a guide thread to the next cold socket", () => {
  const sockets = [
    { x: 400, y: 450, lit: true },
    { x: 400, y: 660, lit: false },
  ];
  const threads = lanternThreads(sockets);
  assert.equal(threads.length, 1);
  assert.equal(threads[0].lit, false);
  assert.equal(nearLanternThread({ x: 400, y: 520 }, sockets), true);
  assert.equal(inUnstillWater({ x: 400, y: WATER_Y + 10 }, sockets), false);
});

test("two planted lanterns keep a standing road of light", () => {
  const sockets = [
    { x: 290, y: 450, lit: true },
    { x: 760, y: 470, lit: true },
    { x: 1140, y: 400, lit: false },
  ];
  const threads = lanternThreads(sockets);
  assert.equal(threads.length, 2);
  assert.equal(threads[0].lit, true);
  assert.equal(threads[1].lit, false);
});

test("a standing lamp-road carries you a little faster than the dry cave", () => {
  const sockets = [
    { x: 290, y: 450, lit: true },
    { x: 760, y: 470, lit: true },
  ];
  assert.equal(waterSpeedScale({ x: 500, y: 460 }, sockets), 1.14);
  assert.equal(waterSpeedScale({ x: 500, y: 200 }, sockets), 1);
});

test("optional sockets stay quiet until the road has three lamps", () => {
  const sockets = [
    { x: 290, y: 450, lit: true },
    { x: 760, y: 470, lit: true },
    { x: 1140, y: 400, lit: false },
    { x: 1580, y: 290, lit: false },
    { x: 2000, y: 250, lit: false },
    { x: 800, y: 130, lit: false },
    { x: 1360, y: 660, lit: false },
  ];
  assert.equal(lanternThreads(sockets, 5).length, 2);
});

test("optional sockets hang off the nearest road lamp, not the last heart socket", () => {
  const sockets = [
    { x: 290, y: 450, lit: true },
    { x: 760, y: 470, lit: true },
    { x: 980, y: 640, lit: true },
    { x: 1340, y: 280, lit: true },
    { x: 2000, y: 250, lit: true },
    { x: 800, y: 130, lit: false },
    { x: 1360, y: 660, lit: false },
  ];
  const threads = lanternThreads(sockets, 5);
  assert.equal(threads.length, 6); // 4 road + 2 optional once the road is lit
  const optional = threads.slice(4);
  assert.equal(optional[0].from.x, 760);
  assert.equal(optional[1].from.x, 980);
});

test("the third heart socket sits in still water, and the thread from the second lamp stills the crossing", () => {
  const sockets = [
    { x: 290, y: 450, lit: true },
    { x: 760, y: 470, lit: true },
    { x: 980, y: 640, lit: false },
    { x: 1340, y: 280, lit: false },
    { x: 2000, y: 250, lit: false },
  ];
  assert.ok(sockets[2].y > WATER_Y);
  assert.equal(inUnstillWater({ x: 980, y: 640 }, sockets, WATER_Y, 5), false);
  assert.equal(inUnstillWater({ x: 980, y: 710 }, sockets, WATER_Y, 5), true);
  assert.equal(waterSpeedScale({ x: 870, y: 580 }, sockets, WATER_Y, 5), 1);
  sockets[2].lit = true;
  assert.equal(waterSpeedScale({ x: 870, y: 580 }, sockets, WATER_Y, 5), 1.14);
  assert.equal(inUnstillWater({ x: 980, y: 710 }, sockets, WATER_Y, 5), false);
});
