import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../js/gameEngine.js';
import { updateGameSettings, reloadActiveBoard, BOARD_TILES } from '../js/boardData.js?v=5.1';
import { sounds } from '../js/audio.js?v=5.1';
import { CHANCE_CARDS } from '../js/cardsData.js?v=5.2';
import { AiPlayer } from '../js/aiPlayer.js';

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

test('smart net worth accurately calculates cash, unmortgaged, mortgaged equity, buildings, and VIP cards', () => {
  const engine = createEngine('classic');
  const player = engine.players[0];
  player.cash = 1500;

  // 1. Initial net worth with starting cash
  let nw = engine.getPlayerNetWorth(player.id);
  assert.equal(nw.total, 1500);
  assert.equal(nw.cash, 1500);
  assert.equal(nw.propertiesValue, 0);

  // 2. Buy property (Boardwalk id 39, price: 400)
  engine.board[39].owner = player.id;
  player.cash = 1100;
  nw = engine.getPlayerNetWorth(player.id);
  assert.equal(nw.total, 1500); // 1100 cash + 400 property
  assert.equal(nw.propertiesValue, 400);
  assert.equal(nw.mortgageDebt, 0);

  // 3. Mortgage property: gets $200 cash, equity is $200, mortgage debt is $200
  assert.equal(engine.mortgageProperty(player.id, 39), true);
  assert.equal(player.cash, 1300); // 1100 + 200
  nw = engine.getPlayerNetWorth(player.id);
  // Smart test: mortgaging must NOT falsely inflate net worth!
  assert.equal(nw.total, 1500); // 1300 cash + 200 equity
  assert.equal(nw.mortgageDebt, 200);
  assert.equal(nw.mortgagedEquity, 200);

  // 4. Build houses on Mediterranean Avenue (id 1, price 60, houseCost 50) and Baltic Avenue (id 3)
  engine.board[1].owner = player.id;
  engine.board[3].owner = player.id;
  engine.board[1].houses = 3;
  engine.board[3].houses = 3;
  // Houses value: 6 * 50 = 300
  nw = engine.getPlayerNetWorth(player.id);
  assert.equal(nw.buildingsValue, 300);

  // 5. VIP / Get Out of Jail Free card (worth $150 bail fee each)
  player.getOutOfJailCards = 2;
  nw = engine.getPlayerNetWorth(player.id);
  assert.equal(nw.jailCardsValue, 300);

  // 6. Bankruptcy resets net worth to 0
  player.bankrupt = true;
  nw = engine.getPlayerNetWorth(player.id);
  assert.equal(nw.total, 0);
});

test('activity feed tracks match history with categories and exports complete match JSON report', () => {
  const engine = createEngine('classic');
  const p1 = engine.players[0];
  const p2 = engine.players[1];

  // Initial event logged at game start
  assert.ok(engine.matchHistory.length >= 1);
  assert.equal(engine.matchHistory[0].id, 1);

  // Add sample events of different categories
  engine.log(`${p1.name} rolled 5 and 3 (Total: 8).`);
  engine.log(`${p1.name} bought Mediterranean Avenue for $60.`);
  engine.log(`${p2.name} paid $20 rent to ${p1.name}.`);
  engine.log(`[TRADE] Trade completed between ${p1.name} and ${p2.name}!`, 'success');
  engine.log(`${p1.name} mortgaged Boardwalk for $200.`);
  engine.log(`Card Drawn: "Advance to GO. Collect +$200."`, 'info');
  engine.log(`${p2.name} was arrested and sent to JAIL!`, 'warning');
  engine.log(`${p2.name} went bankrupt!`, 'danger');
  engine.log(`[CHAMPION] GAME OVER! ${p1.name} IS THE MONOPOLY CHAMPION!`, 'success');

  // Verify categories
  assert.equal(engine.detectCategory('rolled 4 and 4', 'info'), 'DICE');
  assert.equal(engine.detectCategory('bought Vermont Avenue', 'info'), 'BUY');
  assert.equal(engine.detectCategory('paid $50 rent to Bob', 'info'), 'RENT');
  assert.equal(engine.detectCategory('[TRADE] Trade accepted', 'success'), 'TRADE');
  assert.equal(engine.detectCategory('mortgaged Boardwalk', 'info'), 'MORTGAGE');
  assert.equal(engine.detectCategory('built 2 houses on Park Place', 'info'), 'BUILD');
  assert.equal(engine.detectCategory('Card Drawn: "Doctor\'s Fee"', 'info'), 'CARD');
  assert.equal(engine.detectCategory('sent to JAIL!', 'warning'), 'JAIL');
  assert.equal(engine.detectCategory('bankrupt player eliminated', 'danger'), 'BANKRUPT');
  assert.equal(engine.detectCategory('GAME OVER! Champion crowned', 'success'), 'CHAMPION');

  // Verify match history chronological order
  assert.ok(engine.matchHistory.length >= 10);
  assert.equal(engine.logs[0].text, `[CHAMPION] GAME OVER! ${p1.name} IS THE MONOPOLY CHAMPION!`);

  // Verify match report export data
  engine.gameOver = true;
  engine.winner = p1;
  const exportData = engine.getMatchLogExportData();

  assert.equal(exportData.gameTitle, 'Monopoly Master - Official Match Activity Report');
  assert.equal(typeof exportData.exportedAt, 'string');
  assert.equal(exportData.matchStats.boardEdition, 'Classic 40-Tile Edition');
  assert.equal(exportData.matchStats.isGameOver, true);
  assert.equal(exportData.matchStats.winner.name, p1.name);
  assert.equal(exportData.finalStandings[0].name, p1.name);
  assert.equal(exportData.finalStandings[0].isWinner, true);
  assert.ok(Array.isArray(exportData.matchEvents));
  assert.equal(exportData.matchEvents.length, engine.matchHistory.length);

  // Validate JSON stringification
  const jsonStr = JSON.stringify(exportData);
  assert.ok(jsonStr.length > 500);
  const parsed = JSON.parse(jsonStr);
  assert.equal(parsed.matchStats.winner.name, p1.name);
});

test('strict solvency prevents negative cash: auto-mortgages properties or transfers to creditor on bankruptcy', () => {
  const engine = createEngine('classic');
  const human = engine.players[0]; // Human
  const bot = engine.players[1];   // AI Bot (like WallStreet Bot)
  bot.isAi = true;

  // Scenario 1: Bot has $32 cash and owns Mediterranean Ave (id 1, price 60, mortgage 30).
  // Bot lands on human's property and owes $50 rent.
  engine.board[1].owner = bot.id;
  engine.board[1].mortgaged = false;
  bot.cash = 32;
  const initialHumanCash = human.cash;

  const res1 = engine.processPayment(bot, 50, human, 'rent for property');
  assert.equal(res1.success, true);
  assert.equal(res1.bankrupt, false);
  // Bot auto-mortgaged Mediterranean Ave: 32 + 30 = 62, then paid 50 -> 12 cash remaining!
  assert.equal(engine.board[1].mortgaged, true);
  assert.equal(bot.cash, 12, 'Bot cash must stay positive (never negative!)');
  assert.equal(human.cash - initialHumanCash, 50, 'Creditor received full rent');

  // Scenario 2: Tax deduction exceeding cash
  // Bot has $12 cash and owns Baltic Ave (id 3, mortgage 30).
  // Bot lands on Luxury Tax ($100).
  engine.board[3].owner = bot.id;
  engine.board[3].mortgaged = false;
  // Total liquidatable = 12 cash + 30 mortgage = 42. Since 42 < 100, bot cannot pay and goes bankrupt!
  const res2 = engine.processPayment(bot, 100, null, 'Luxury Tax');
  assert.equal(res2.bankrupt, true);
  assert.equal(bot.bankrupt, true);
  assert.equal(bot.cash, 0, 'Bankrupt player cash must be reset to 0 (never negative!)');
  // Properties return to bank
  assert.equal(engine.board[1].owner, null);
  assert.equal(engine.board[3].owner, null);

  // Scenario 3: Bankruptcy to a player creditor surrenders properties to that creditor
  const bot2 = engine.players[2] || { id: 2, name: 'Bot 2', isAi: true, cash: 20, bankrupt: false };
  if (!engine.players[2]) engine.players.push(bot2);
  bot2.isAi = true;
  bot2.cash = 20;
  bot2.bankrupt = false;
  engine.board[6].owner = bot2.id; // Oriental Ave
  engine.board[6].mortgaged = false;
  engine.board[8].owner = bot2.id; // Vermont Ave
  engine.board[8].mortgaged = false;

  // Bot 2 owes $1000 rent to Human (cannot afford)
  const res3 = engine.processPayment(bot2, 1000, human, 'Boardwalk rent');
  assert.equal(res3.bankrupt, true);
  assert.equal(bot2.bankrupt, true);
  assert.equal(bot2.cash, 0, 'Bankrupt cash must be 0');
  // Properties transferred to human creditor
  assert.equal(engine.board[6].owner, human.id, 'Creditor received Oriental Ave');
  assert.equal(engine.board[8].owner, human.id, 'Creditor received Vermont Ave');
});

test('all transit tiles and chance cards use consistent Station terminology without legacy Airport remnants', () => {
  const engine = createEngine('world');
  const worldStations = Array.from({ length: engine.getBoardLength() }, (_, i) => engine.getTileAt(i))
    .filter(t => t.group === 'RAILROAD');
  assert.equal(worldStations.length, 4);
  assert.ok(worldStations.every(t => t.name.includes('Station') && t.iconKey === 'TRAIN'));
  assert.ok(worldStations.every(t => !t.name.toLowerCase().includes('airport')));

  const transitCard = CHANCE_CARDS.find(c => c.action?.type === 'MOVE_NEAREST_RAILROAD');
  assert.ok(transitCard);
  assert.equal(transitCard.badge, 'NEAREST STATION');
  assert.ok(!transitCard.title.toLowerCase().includes('airport'));
  assert.ok(!transitCard.text.toLowerCase().includes('airport'));
});

test('bank starts with 18 hotels (1.5x scaled from classic 12) to accommodate luxury builds', () => {
  const engine = createEngine('classic');
  assert.equal(engine.bank.houses, 32);
  assert.equal(engine.bank.hotels, 18);
});

test('player stats track financial metrics and getMatchSummary outputs standings with certificate grades', () => {
  const engine = createEngine('classic');
  const p1 = engine.players[0];
  const p2 = engine.players[1];

  assert.ok(p1.stats, 'Player stats initialized');
  assert.equal(p1.stats.rentCollected, 0);

  // Simulate rent transaction
  p1.stats.rentCollected += 350;
  p1.stats.rentPerProperty[1] = 350;
  p2.stats.rentPaid += 350;
  p1.stats.housesBuilt += 3;
  p1.stats.buildingSpend += 150;

  engine.winner = p1;
  const summary = engine.getMatchSummary();

  assert.ok(summary.durationFormatted, 'Duration formatted exists');
  assert.equal(summary.standings.length, 2);
  assert.equal(summary.standings[0].id, p1.id);
  assert.equal(summary.standings[0].grade, 'S+');
  assert.equal(summary.standings[0].title, 'Grand Monopoly Champion');
  assert.equal(summary.standings[0].stats.rentCollected, 350);
  assert.equal(summary.standings[0].stats.housesBuilt, 3);
  assert.equal(summary.standings[1].stats.rentPaid, 350);
  assert.ok(summary.globalCrownJewel, 'Global crown jewel detected');
  assert.equal(summary.globalCrownJewel.rentCollected, 350);
});

test('AI difficulty modes: aggressive buys aggressively and rushes 3 houses, standard buys sensibly', () => {
  const engine = createEngine('classic');
  const ai = new AiPlayer(engine);
  const bot = engine.players[1];

  // 1. Aggressive Mode property acquisition test
  updateGameSettings({ aiDifficulty: 'aggressive' });
  bot.cash = 250;
  const tile1 = engine.getTileAt(6); // Oriental Ave ($100)
  assert.ok(ai.decideBuyProperty(bot, tile1), 'Aggressive bot buys unowned property with $250 cash');

  const railroad = engine.getTileAt(5); // Reading Railroad ($200)
  assert.ok(ai.decideBuyProperty(bot, railroad), 'Aggressive bot buys railroad station with $250 cash ($200 + $10 buffer)');

  // 2. Standard Mode property acquisition test
  updateGameSettings({ aiDifficulty: 'standard' });
  bot.cash = 250;
  assert.ok(ai.decideBuyProperty(bot, tile1), 'Standard bot buys Oriental Ave with $250 cash');
  assert.ok(ai.decideBuyProperty(bot, railroad), 'Standard bot buys Reading Railroad with $250 cash ($200 + $35 buffer)');

  // 3. Aggressive 3-House Blitz Build test
  updateGameSettings({ aiDifficulty: 'aggressive' });
  // Give bot the Brown monopoly (Mediterranean 1, Baltic 3)
  engine.board[1].owner = bot.id;
  engine.board[3].owner = bot.id;
  engine.board[1].houses = 0;
  engine.board[3].houses = 0;
  bot.cash = 1000; // House cost is $50 each

  ai.tryUpgrading(bot);
  // In aggressive mode, it should build across the group reaching at least 3 houses on each
  assert.ok(engine.board[1].houses >= 3, `Mediterranean reached ${engine.board[1].houses} houses (>= 3)`);
  assert.ok(engine.board[3].houses >= 3, `Baltic reached ${engine.board[3].houses} houses (>= 3)`);

  // 4. Unmortgage test
  engine.board[1].mortgaged = true;
  bot.cash = 500;
  ai.tryUnmortgaging(bot);
  assert.equal(engine.board[1].mortgaged, false, 'Bot unmortgaged its monopoly property');
});



