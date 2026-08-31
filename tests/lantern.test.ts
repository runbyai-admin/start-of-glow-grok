import assert from "node:assert/strict";
import test from "node:test";
import { nearestUnlitSocket, requiredLanterns, socketInRange, SOCKET_RADIUS } from "../src/lantern.ts";
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
