import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../js/gameEngine.js';
import { updateGameSettings, reloadActiveBoard } from '../js/boardData.js?v=5.1';
import { sounds } from '../js/audio.js?v=5.1';
import { CHANCE_CARDS } from '../js/cardsData.js?v=5.2';

function createEngine(boardTheme = 'classic') {
  updateGameSettings({ boardTheme, startingCash: 1500, jailBailFee: 150 });
  reloadActiveBoard();
  const engine = new GameEngine();
  engine.initPlayers([
    { name: 'Tester', token: 'TOP_HAT', color: '#3b82f6' },
    { name: 'Rival', token: 'CAR', color: '#ef4444' }
  ]);
  return engine;
}

test('classic edition exposes the correct corners and jail behavior', () => {
  const engine = createEngine('classic');
  assert.equal(engine.getBoardLength(), 40);
  assert.equal(engine.getTileAt(0).name, 'GO');
  assert.equal(engine.getTileAt(10).name, 'JAIL');
  assert.equal(engine.getTileAt(20).name, 'FREE PARKING');
  assert.equal(engine.getTileAt(30).name, 'GO TO JAIL');

  const player = engine.players[0];
  player.position = engine.getJailTileId();
  engine.handleTileLanding(player);
  assert.equal(player.position, 10);
  assert.equal(player.inJail, false); // Just Visiting in official rules

  player.inJail = false;
  player.position = engine.getGoToJailTileId();
  engine.handleTileLanding(player);
  assert.equal(player.position, 10);
  assert.equal(player.inJail, true);
});

test('world edition keeps the 36-tile custom layout and safe zone', () => {
  const engine = createEngine('world');
  assert.equal(engine.getBoardLength(), 36);
  assert.equal(engine.getTileAt(0).name, 'START');
  assert.equal(engine.getTileAt(9).name, 'JAIL');
  assert.equal(engine.getTileAt(18).name, 'SAFE ZONE');
  assert.equal(engine.getTileAt(27).name, 'GO TO JAIL');

  const player = engine.players[0];
  player.position = 18;
  engine.handleTileLanding(player);
  assert.equal(player.inJail, false);
  assert.equal(engine.currentTurn.awaitingAction, null);
});

test('dice stay within range and classic railroad rent follows the official schedule', () => {
  const engine = createEngine('classic');
  const rolls = Array.from({ length: 500 }, () => engine.rollDice());
  assert.ok(rolls.every(({ d1, d2, sum }) => d1 >= 1 && d1 <= 6 && d2 >= 1 && d2 <= 6 && sum === d1 + d2));

  engine.board[5].owner = 0;
  assert.equal(engine.calculateRent(5), 25);
  engine.board[15].owner = 0;
  assert.equal(engine.calculateRent(5), 50);
  engine.board[25].owner = 0;
  assert.equal(engine.calculateRent(5), 100);
  engine.board[35].owner = 0;
  assert.equal(engine.calculateRent(5), 200);
});

test('mortgaged railroads leave active rent count while a double-rent card is explicit', () => {
  const engine = createEngine('classic');
  const owner = engine.players[0];
  const visitor = engine.players[1];
  [5, 15, 25, 35].forEach(id => { engine.board[id].owner = owner.id; });
  engine.board[35].mortgaged = true;

  assert.equal(engine.calculateRent(35), 0, 'a mortgaged railroad itself collects no rent');
  assert.equal(engine.calculateRent(5), 100, 'three unmortgaged railroads use the three-railroad rate');

  visitor.position = 5;
  const ownerCash = owner.cash;
  const visitorCash = visitor.cash;
  engine.handleTileLanding(visitor);
  assert.equal(owner.cash - ownerCash, 100);
  assert.equal(visitorCash - visitor.cash, 100);

  owner.cash = ownerCash;
  visitor.cash = visitorCash;
  engine.handleTileLanding(visitor, null, { doubleRent: true });
  assert.equal(owner.cash - ownerCash, 200, 'the nearest-railroad card doubles the reduced base rent');
  assert.match(engine.logs[0].text, /double-rent card: \$100 × 2/);
});

test('property purchase, even building, hotels, sale, and mortgage stay financially consistent', () => {
  const engine = createEngine('classic');
  const player = engine.players[0];
  player.cash = 10000;

  player.position = 1;
  engine.handleTileLanding(player);
  engine.currentTurn.awaitingAction.onBuy();
  assert.equal(engine.board[1].owner, player.id);
  assert.equal(player.cash, 9940);

  engine.board[3].owner = player.id;
  for (let level = 0; level < 4; level += 1) {
    assert.equal(engine.buildHouse(player.id, 1).success, true);
    assert.equal(engine.buildHouse(player.id, 3).success, true);
  }
  assert.equal(engine.board[1].houses, 4);
  assert.equal(engine.board[3].houses, 4);

  const housesBeforeHotel = engine.bank.houses;
  assert.equal(engine.buildHouse(player.id, 1).success, true);
  assert.equal(engine.bank.houses, housesBeforeHotel + 4);
  assert.equal(engine.board[1].houses, 5);
  assert.equal(engine.buildHouse(player.id, 1).success, true);
  assert.equal(engine.board[1].houses, 6);

  assert.equal(engine.sellHouse(player.id, 1), true);
  assert.equal(engine.board[1].houses, 5);
  assert.equal(engine.sellHouse(player.id, 1), true);
  assert.equal(engine.board[1].houses, 4);
  for (let level = 0; level < 4; level += 1) {
    assert.equal(engine.sellHouse(player.id, 1), true);
    assert.equal(engine.sellHouse(player.id, 3), true);
  }
  assert.equal(engine.mortgageProperty(player.id, 1), true);
  assert.equal(engine.calculateRent(1), 0);
});

test('card jail actions resolve and finish the callback exactly once', () => {
  const engine = createEngine('classic');
  const player = engine.players[0];
  let completed = 0;
  engine.executeCard(player, {
    text: 'Go directly to Jail.',
    action: { type: 'GO_TO_JAIL' }
  }, () => { completed += 1; });
  assert.equal(player.inJail, true);
  assert.equal(player.position, 10);
  assert.equal(completed, 1);
});

test('travel cards defer destination completion until their movement animation can finish', () => {
  const engine = createEngine('classic');
  const player = engine.players[0];
  player.position = 36;
  let completed = 0;
  const tokyoCard = CHANCE_CARDS.find(card => card.id === 'ch_tokyo');
  engine.chanceDeck = [tokyoCard];

  engine.handleTileLanding(player, () => { completed += 1; });
  const drawAction = engine.currentTurn.awaitingAction;
  assert.equal(drawAction.type, 'card_drawn');
  drawAction.onResolve(true);

  assert.equal(player.position, 24);
  assert.equal(engine.getTileAt(player.position).name, 'Illinois Avenue');
  assert.equal(player.cash, 1700);
  assert.equal(engine.currentTurn.awaitingAction.type, 'buy_prompt');
  assert.equal(completed, 0, 'the landing callback must wait for movement and the destination prompt');

  engine.currentTurn.awaitingAction.onPass();
  assert.equal(completed, 0, 'the deferred animation path owns completion');

  const worldEngine = createEngine('world');
  const worldPlayer = worldEngine.players[0];
  worldEngine.executeCard(worldPlayer, tokyoCard, () => {});
  assert.equal(worldPlayer.position, 22);
  assert.equal(worldEngine.getTileAt(worldPlayer.position).name, 'Tokyo');
});

test('music and sound effects keep independent mute states', () => {
  sounds.setSfxMuted(false);
  sounds.musicEnabled = false;

  assert.equal(sounds.toggleMusic(), true);
  assert.equal(sounds.musicEnabled, true);

  assert.equal(sounds.toggleMute(), true);
  assert.equal(sounds.sfxMuted, true);
  assert.equal(sounds.musicEnabled, true);

  assert.equal(sounds.toggleMute(), false);
  assert.equal(sounds.toggleMusic(), false);
  assert.equal(sounds.sfxMuted, false);
});

test('bot sound effects stay quiet by default but can be enabled', () => {
  const bot = { isAi: true };
  const human = { isAi: false };

  sounds.setBotSfxEnabled(false);
  assert.equal(sounds.shouldPlayFor(bot), false);
  assert.equal(sounds.shouldPlayFor(human), true);

  sounds.setBotSfxEnabled(true);
  assert.equal(sounds.shouldPlayFor(bot), true);
  sounds.setBotSfxEnabled(false);
});

test('paying Jail bail does not trigger the sad payment voice', () => {
  const engine = createEngine('classic');
  const player = engine.players[0];
  player.inJail = true;
  player.cash = 500;

  const originalPlayPay = sounds.playPay;
  let playPayCalls = 0;
  sounds.playPay = () => { playPayCalls += 1; };

  try {
    assert.equal(engine.payJailBail(player), true);
    assert.equal(playPayCalls, 0);
  } finally {
    sounds.playPay = originalPlayPay;
  }
});
