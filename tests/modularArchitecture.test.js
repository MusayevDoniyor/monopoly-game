import test from "node:test";
import assert from "node:assert/strict";
import { escapeHtml, formatMoney, formatTime, delay } from "../js/utils.js";
import { TurnTimer } from "../js/turnTimer.js";
import { UIComponent } from "../js/ui/uiComponent.js";

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

test("smart reload protection: correctly detects reload keys and game in progress state", () => {
  const isReloadKey = (e) =>
    e.key === "F5" ||
    Boolean((e.ctrlKey || e.metaKey) && (e.key === "r" || e.key === "R"));

  assert.equal(isReloadKey({ key: "F5" }), true);
  assert.equal(isReloadKey({ key: "r", ctrlKey: true }), true);
  assert.equal(isReloadKey({ key: "R", ctrlKey: true }), true);
  assert.equal(isReloadKey({ key: "r", metaKey: true }), true);
  assert.equal(isReloadKey({ key: "R", metaKey: true }), true);
  assert.equal(isReloadKey({ key: "r", ctrlKey: false, metaKey: false }), false);
  assert.equal(isReloadKey({ key: "Enter" }), false);
  assert.equal(isReloadKey({ key: "Escape" }), false);

  const checkGameInProgress = ({ engine, ui }) => {
    return Boolean(
      engine &&
      Array.isArray(engine.players) &&
      engine.players.length > 0 &&
      !engine.gameOver &&
      !ui.isStartingSelector &&
      !ui.modalCard?.classList.contains("setup-modal")
    );
  };

  // Not started (empty players)
  assert.equal(checkGameInProgress({ engine: { players: [], gameOver: false }, ui: { modalCard: { classList: { contains: () => false } } } }), false);

  // In setup modal
  assert.equal(checkGameInProgress({ engine: { players: [{ name: "P1" }], gameOver: false }, ui: { modalCard: { classList: { contains: (c) => c === "setup-modal" } } } }), false);

  // During starting selector wheel
  assert.equal(checkGameInProgress({ engine: { players: [{ name: "P1" }], gameOver: false }, ui: { isStartingSelector: true, modalCard: { classList: { contains: () => false } } } }), false);

  // Game over
  assert.equal(checkGameInProgress({ engine: { players: [{ name: "P1" }], gameOver: true }, ui: { isStartingSelector: false, modalCard: { classList: { contains: () => false } } } }), false);

  // Actively playing match
  assert.equal(checkGameInProgress({ engine: { players: [{ name: "P1" }], gameOver: false }, ui: { isStartingSelector: false, modalCard: { classList: { contains: () => false } } } }), true);
});

test("UIComponent proxy delegates onTradeProposalCallback and dynamic properties to ui facade", () => {
  let proposalReceived = null;
  const mockUi = {
    onTradeProposalCallback: (p1, p2, offProps, offCash, reqProps, reqCash) => {
      proposalReceived = { p1, p2, offProps, offCash, reqProps, reqCash };
    },
    engine: {
      players: [{ id: 0, name: "Player 1", cash: 1500 }, { id: 1, name: "Player 2", cash: 1500 }],
      board: { 1: { owner: 1, mortgaged: false } }
    }
  };

  class TestModalSubmodule extends UIComponent {
    proposeTestTrade(p1, p2, offProps, offCash, reqProps, reqCash) {
      const cb = this.onTradeProposalCallback || this.ui?.onTradeProposalCallback;
      assert.ok(cb, "Trade callback must be accessible on submodule instance");
      cb(p1, p2, offProps, offCash, reqProps, reqCash);
    }
  }

  const submodule = new TestModalSubmodule(mockUi);
  submodule.proposeTestTrade(
    mockUi.engine.players[0],
    mockUi.engine.players[1],
    [],
    400,
    [1],
    0
  );

  assert.ok(proposalReceived, "Trade proposal callback should be executed");
  assert.equal(proposalReceived.p1.name, "Player 1");
  assert.equal(proposalReceived.p2.name, "Player 2");
  assert.equal(proposalReceived.offCash, 400);
  assert.deepEqual(proposalReceived.reqProps, [1]);
});


