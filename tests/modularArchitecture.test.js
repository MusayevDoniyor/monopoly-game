import test from "node:test";
import assert from "node:assert/strict";
import { escapeHtml, formatMoney, formatTime, delay } from "../js/utils.js";
import { TurnTimer } from "../js/turnTimer.js";

test("utils: escapeHtml correctly encodes special characters", () => {
  assert.equal(escapeHtml("<script>alert('xss')</script>"), "&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;");
  assert.equal(escapeHtml('Hello & "World"'), "Hello &amp; &quot;World&quot;");
  assert.equal(escapeHtml(null), "");
  assert.equal(escapeHtml(undefined), "");
});

test("utils: formatMoney formats numbers as USD currency", () => {
  assert.equal(formatMoney(1500), "$1,500");
  assert.equal(formatMoney(0), "$0");
  assert.equal(formatMoney(2500000), "$2,500,000");
  assert.equal(formatMoney(null), "$0");
});

test("utils: formatTime converts seconds to MM:SS string", () => {
  assert.equal(formatTime(0), "0:00");
  assert.equal(formatTime(45), "0:45");
  assert.equal(formatTime(65), "1:05");
  assert.equal(formatTime(3600), "60:00");
});

test("utils: delay waits properly according to speed factor", async () => {
  const start = Date.now();
  await delay(20, 2);
  const elapsed = Date.now() - start;
  assert.ok(elapsed >= 8, `Elapsed ${elapsed}ms should be at least ~10ms`);
});

test("turnTimer: manages timer state and ignores AI players", () => {
  const mockEngine = {
    gameOver: false,
    getMatchDurationSeconds: () => 120,
    getCurrentPlayer: () => ({ id: 0, name: "Bot", isAi: true })
  };
  let hiddenTimer = false;
  const mockUi = {
    updateMatchTimer: () => {},
    hideTurnTimer: () => { hiddenTimer = true; },
    updateTurnTimer: () => {}
  };
  const mockApp = {
    engine: mockEngine,
    ui: mockUi,
    multiplayer: { isOnline: false }
  };

  const timer = new TurnTimer(mockApp);
  timer.startTurnTimer(mockEngine.getCurrentPlayer(), "roll");
  assert.equal(hiddenTimer, true, "AI turns should immediately hide turn timer");
  timer.stopTurnTimer();
  timer.stopMatchClock();
});
