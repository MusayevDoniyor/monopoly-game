import {
  BOARD_TILES,
  COLOR_GROUPS,
  gameSettings,
  reloadActiveBoard,
} from "./boardData.js?v=8.1";
import { CHANCE_CARDS, COMMUNITY_CHEST_CARDS } from "./cardsData.js?v=8.1";
import { sounds } from "./audio.js?v=8.1";

export class GameEngine {
  constructor() {
    this.reset();
  }

  getBoardLength() {
    return BOARD_TILES.length;
  }

  getTileAt(position) {
    return BOARD_TILES[position] || null;
  }

  getTile(id) {
    return BOARD_TILES[id] || null;
  }

  getJailTileId() {
    const jail = BOARD_TILES.find(
      (t) => t.name === "JAIL" || t.name === "Jail / Just Visiting",
    );
    return jail ? jail.id : 9;
  }

  getGoToJailTileId() {
    const gtj = BOARD_TILES.find(
      (t) => t.name === "GO TO JAIL" || t.name === "Go To Jail",
    );
    return gtj ? gtj.id : 27;
  }

  reset() {
    reloadActiveBoard();
    this.players = [];
    this.board = {}; // tileId -> { owner: null, houses: 0, mortgaged: false }
    this.bank = {
      houses: gameSettings.bankHouses ?? 32,
      hotels: gameSettings.bankHotels ?? 18,
    };
    this.turnCount = 0;
    this.roundCount = 1;
    this.currentTurn = {
      count: 0,
      playerIndex: 0,
      dice: [1, 1],
      doublesCount: 0,
      hasRolled: false,
      canRollAgain: false,
      awaitingAction: null, // 'buy_prompt', 'jail_decision', 'card_prompt', 'game_over'
    };
    this.chanceDeck = this.shuffleDeck([...CHANCE_CARDS]);
    this.communityChestDeck = this.shuffleDeck([...COMMUNITY_CHEST_CARDS]);
    this.logs = [];
    this.matchHistory = [];
    this._logCounter = 0;
    this.gameOver = false;
    this.winner = null;
    this.lastGlobalRollWasDoubles = false;
    this.matchStartTime = Date.now();
    this.bankruptcyCounter = 0;

    BOARD_TILES.forEach((tile) => {
      this.board[tile.id] = {
        owner: null,
        houses: 0,
        mortgaged: false,
      };
    });
  }

  initPlayerStats(player) {
    if (!player) return null;
    player.stats = {
      rentPaid: 0,
      rentCollected: 0,
      taxesPaid: 0,
      salaryCollected: 0,
      cardEarnings: 0,
      cardPenalties: 0,
      housesBuilt: 0,
      hotelsBuilt: 0,
      buildingSpend: 0,
      propertiesBought: 0,
      propertySpend: 0,
      jailVisits: 0,
      jailBailPaid: 0,
      diceRolls: 0,
      doublesRolled: 0,
      lapsCompleted: 0,
      bankruptciesCaused: 0,
      peakCash: player.cash || 1500,
      peakNetWorth: player.cash || 1500,
      rentPerProperty: {},
    };
    return player.stats;
  }

  getMatchDurationSeconds() {
    return this.matchStartTime
      ? Math.floor((Date.now() - this.matchStartTime) / 1000)
      : 0;
  }

  shuffleDeck(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  initPlayers(playerConfigs) {
    this.matchStartTime = Date.now();
    this.logs = [];
    this.matchHistory = [];
    this._logCounter = 0;
    this.bankruptcyCounter = 0;
    const startingCash = gameSettings.startingCash || 1500;
    this.players = playerConfigs.map((cfg, index) => {
      // Player names are rendered in several HTML templates, including the
      // multiplayer lobby. Keep them plain text at the model boundary so a
      // custom name can never become executable markup.
      const safeName =
        String(cfg.name || `Player ${index + 1}`)
          .replace(/[<>]/g, "")
          .replace(/[\u0000-\u001f\u007f]/g, "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 24) || `Player ${index + 1}`;

      const p = {
        id: index,
        name: safeName,
        token: cfg.token || "TOP_HAT",
        color: cfg.color || "#3b82f6",
        isAi: !!cfg.isAi,
        cash: startingCash,
        position: 0,
        inJail: false,
        jailTurns: 0,
        getOutOfJailCards: 0,
        bankrupt: false,
      };
      this.initPlayerStats(p);
      return p;
    });
    this.log(
      `Game started with ${this.players.length} players! Each received $${startingCash}.`,
    );
  }

  getCurrentPlayer() {
    return this.players[this.currentTurn.playerIndex];
  }

  getActivePlayers() {
    return this.players.filter((p) => !p.bankrupt);
  }

  detectCategory(msg, type) {
    if (msg.includes("[CHAMPION]") || msg.includes("GAME OVER")) return "CHAMPION";
    if (msg.includes("[TRADE]")) return "TRADE";
    if (msg.includes("[AI Advisor]")) return "ADVISOR";
    if (msg.includes("[CHAT]")) return "CHAT";
    if (msg.includes("bankrupt") || msg.includes("BANKRUPT")) return "BANKRUPT";
    if (msg.includes("JAIL") || msg.includes("jailed") || msg.includes("bail") || msg.includes("Arrested") || msg.includes("ARRESTED")) return "JAIL";
    if (msg.includes("Card Drawn") || msg.includes("CHEST") || msg.includes("CHANCE") || msg.includes("COMMUNITY")) return "CARD";
    if (msg.includes("mortgage") || msg.includes("Mortgage")) return "MORTGAGE";
    if (msg.includes("built") || msg.includes("house") || msg.includes("hotel")) return "BUILD";
    if (msg.includes("rent") || msg.includes("Rent")) return "RENT";
    if (msg.includes("bought") || msg.includes("purchased") || msg.includes("acquired")) return "BUY";
    if (msg.includes("rolled") || msg.includes("doubles")) return "DICE";
    if (msg.includes("Tax") || msg.includes("tax") || msg.includes("START") || msg.includes("GO")) return "SPECIAL";
    if (type === "danger") return "ALERT";
    if (type === "warning") return "WARNING";
    if (type === "success") return "SUCCESS";
    return "EVENT";
  }

  log(msg, type = "info", category = null) {
    const activePlayer = this.getCurrentPlayer();
    const entry = {
      id: ++this._logCounter,
      text: msg,
      type,
      category: category || this.detectCategory(msg, type),
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      timestamp: Date.now(),
      turn: this.turnCount,
      round: this.roundCount,
      playerId: activePlayer ? activePlayer.id : null,
      playerName: activePlayer ? activePlayer.name : null,
      playerColor: activePlayer ? activePlayer.color : null,
    };
    this.logs.unshift(entry);
    if (this.logs.length > 100) this.logs.pop();
    this.matchHistory.push(entry);
  }

  getRandomInt(min, max) {
    if (
      typeof window !== "undefined" &&
      window.crypto &&
      window.crypto.getRandomValues
    ) {
      const range = max - min + 1;
      const limit = Math.floor(0x100000000 / range) * range;
      const buffer = new Uint32Array(1);
      do {
        window.crypto.getRandomValues(buffer);
      } while (buffer[0] >= limit);
      return min + (buffer[0] % range);
    }
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  rollDice() {
    // Dice must remain independent and fair. The third-double Jail rule is
    // applied by the turn controller after the natural result is known.
    const d1 = this.getRandomInt(1, 6);
    const d2 = this.getRandomInt(1, 6);

    const isDoubles = d1 === d2;
    this.lastGlobalRollWasDoubles = isDoubles;
    this.currentTurn.dice = [d1, d2];
    this.currentTurn.hasRolled = true;

    if (isDoubles) {
      this.currentTurn.doublesCount++;
    } else {
      this.currentTurn.doublesCount = 0;
    }

    const activePlayer = this.getCurrentPlayer();
    if (activePlayer) {
      if (!activePlayer.stats) this.initPlayerStats(activePlayer);
      activePlayer.stats.diceRolls += 1;
      if (isDoubles) activePlayer.stats.doublesRolled += 1;
    }

    return { d1, d2, sum: d1 + d2, isDoubles };
  }

  // Calculate rent for a tile
  calculateRent(tileId, diceSum = 7) {
    const tile = BOARD_TILES[tileId];
    const state = this.board[tileId];
    if (!tile || !state || state.owner === null || state.mortgaged) return 0;

    const ownerId = state.owner;

    if (tile.type === "property") {
      if (state.houses === 6) {
        // 2 Hotels (Grand Luxury): 50% rent premium over standard hotel
        return Math.round(tile.rent[5] * 1.5);
      }
      if (state.houses > 0) {
        return tile.rent[state.houses];
      }
      if (this.hasMonopoly(ownerId, tile.group)) {
        return tile.rent[0] * 2;
      }
      return tile.rent[0];
    }

    // Dynamic Railroad / Station rent (User formula: 1 = 50, 2 = 100, 3 = 150, 4 = 200)
    if (tile.type === "railroad") {
      const railroads = BOARD_TILES.filter((t) => t.group === "RAILROAD");
      const ownedCount = railroads.filter(
        (r) =>
          this.board[r.id]?.owner === ownerId && !this.board[r.id]?.mortgaged,
      ).length;
      if (this.getBoardLength() === 40) {
        const classicRent = tile.rent || [25, 50, 100, 200];
        return classicRent[
          Math.min(classicRent.length - 1, Math.max(0, ownedCount - 1))
        ];
      }
      const baseRent = gameSettings.stationBaseRent || 50;
      const stepRent = gameSettings.stationStepRent || 50;
      return baseRent + Math.max(0, ownedCount - 1) * stepRent;
    }

    if (tile.type === "utility") {
      const utilities = BOARD_TILES.filter((t) => t.group === "UTILITY");
      const ownedCount = utilities.filter(
        (u) =>
          this.board[u.id]?.owner === ownerId && !this.board[u.id]?.mortgaged,
      ).length;
      const multiplier = ownedCount >= 2 ? 10 : 4;
      return diceSum * multiplier;
    }

    return 0;
  }

  hasMonopoly(playerId, groupKey) {
    if (!groupKey || groupKey === "RAILROAD" || groupKey === "UTILITY")
      return false;
    const groupTiles = BOARD_TILES.filter((t) => t.group === groupKey);
    return groupTiles.every((t) => this.board[t.id]?.owner === playerId);
  }

  getPlayerMonopolies(playerId) {
    const props = this.getPlayerProperties(playerId);
    const distinctGroups = [
      ...new Set(props.map((p) => p.group).filter(Boolean)),
    ];
    return distinctGroups.filter((g) => this.hasMonopoly(playerId, g));
  }

  getPlayerProperties(playerId) {
    return BOARD_TILES.filter((t) => this.board[t.id]?.owner === playerId);
  }

  getPlayerNetWorth(playerId) {
    const player = this.players[playerId];
    if (!player) {
      return {
        total: 0,
        cash: 0,
        propertiesValue: 0,
        unmortgagedValue: 0,
        mortgagedEquity: 0,
        mortgageDebt: 0,
        buildingsValue: 0,
        totalHouses: 0,
        totalHotels: 0,
        jailCardsValue: 0,
        jailCardsCount: 0,
        monopoliesCount: 0,
        totalProperties: 0,
        breakdownText: "Net Worth: $0",
      };
    }

    if (player.bankrupt) {
      return {
        total: 0,
        cash: 0,
        propertiesValue: 0,
        unmortgagedValue: 0,
        mortgagedEquity: 0,
        mortgageDebt: 0,
        buildingsValue: 0,
        totalHouses: 0,
        totalHotels: 0,
        jailCardsValue: 0,
        jailCardsCount: 0,
        monopoliesCount: 0,
        totalProperties: 0,
        breakdownText: "Bankrupt: $0",
      };
    }

    const cash = player.cash || 0;
    const props = this.getPlayerProperties(playerId);

    let unmortgagedValue = 0;
    let mortgagedEquity = 0;
    let mortgageDebt = 0;
    let buildingsValue = 0;
    let totalHouses = 0;
    let totalHotels = 0;

    props.forEach((prop) => {
      const state = this.board[prop.id];
      const price = prop.price || 0;
      const mortgageVal =
        prop.mortgage !== undefined
          ? prop.mortgage
          : Math.floor(price / 2);

      if (state?.mortgaged) {
        mortgagedEquity += price - mortgageVal;
        mortgageDebt += mortgageVal;
      } else {
        unmortgagedValue += price;
      }

      if (state && state.houses > 0) {
        const hCost = prop.houseCost || 50;
        buildingsValue += state.houses * hCost;
        if (state.houses <= 4) {
          totalHouses += state.houses;
        } else if (state.houses === 5) {
          totalHotels += 1;
        } else if (state.houses === 6) {
          totalHotels += 2;
        }
      }
    });

    const jailCardsCount = player.getOutOfJailCards || 0;
    const jailCardsValue = jailCardsCount * (gameSettings.jailBailFee || 50);

    const propertiesValue = unmortgagedValue + mortgagedEquity;
    const total = cash + propertiesValue + buildingsValue + jailCardsValue;

    const distinctGroups = [
      ...new Set(
        props.filter((p) => p.type === "property").map((p) => p.group),
      ),
    ];
    const monopoliesCount = distinctGroups.filter((g) =>
      this.hasMonopoly(playerId, g),
    ).length;

    const parts = [
      `Cash: $${cash.toLocaleString()}`,
      `Real Estate: $${propertiesValue.toLocaleString()}`,
    ];
    if (mortgageDebt > 0) {
      parts.push(`Mortgage Debt: -$${mortgageDebt.toLocaleString()}`);
    }
    if (buildingsValue > 0) {
      parts.push(`Buildings: $${buildingsValue.toLocaleString()}`);
    }
    if (jailCardsValue > 0) {
      parts.push(`VIP Tickets: $${jailCardsValue.toLocaleString()}`);
    }

    return {
      total: Math.round(total),
      cash,
      propertiesValue,
      unmortgagedValue,
      mortgagedEquity,
      mortgageDebt,
      buildingsValue,
      totalHouses,
      totalHotels,
      jailCardsValue,
      jailCardsCount,
      monopoliesCount,
      totalProperties: props.length,
      breakdownText: parts.join(" | "),
    };
  }

  getBuildStatus(playerId, tileId) {
    const tile = BOARD_TILES[tileId];
    const state = this.board[tileId];
    if (!tile || tile.type !== "property" || state.owner !== playerId) {
      return {
        canBuild: false,
        reason: "You do not own this property.",
        code: "NOT_OWNER",
      };
    }
    if (!this.hasMonopoly(playerId, tile.group)) {
      return {
        canBuild: false,
        reason: `Monopoly required: You must own all properties in the ${tile.group} color group!`,
        code: "NO_MONOPOLY",
      };
    }

    const groupTiles = BOARD_TILES.filter((t) => t.group === tile.group);
    if (groupTiles.some((t) => this.board[t.id].mortgaged)) {
      return {
        canBuild: false,
        reason: "A property in this group is mortgaged! Unmortgage it first.",
        code: "GROUP_MORTGAGED",
      };
    }

    const minHousesInGroup = Math.min(
      ...groupTiles.map((t) => this.board[t.id].houses),
    );
    const isHouseOrFirstHotel = state.houses <= 4;
    const isSecondHotel = state.houses === 5;
    if (
      (isHouseOrFirstHotel && state.houses > minHousesInGroup) ||
      (isSecondHotel && minHousesInGroup < 4)
    ) {
      return {
        canBuild: false,
        reason:
          "Uniform build rule: You must build evenly across all properties in this group!",
        code: "UNEVEN_BUILD",
      };
    }

    if (state.houses >= 6) {
      return {
        canBuild: false,
        reason:
          "Max level reached: This property already has a Grand Hotel (2 Hotels)!",
        code: "MAX_REACHED",
      };
    }

    const player = this.players[playerId];
    if (player.cash < tile.houseCost) {
      return {
        canBuild: false,
        reason: `Insufficient funds: Building requires $${tile.houseCost} (You have: $${player.cash}).`,
        code: "INSUFFICIENT_CASH",
      };
    }

    if (state.houses < 4) {
      if (this.bank.houses <= 0) {
        return {
          canBuild: false,
          reason: "No houses left in the bank!",
          code: "BANK_EMPTY_HOUSES",
        };
      }
      return {
        canBuild: true,
        nextType: "house",
        cost: tile.houseCost,
        currentHouses: state.houses,
        reason: "Can build house.",
      };
    } else if (state.houses === 4) {
      if (this.bank.hotels <= 0) {
        return {
          canBuild: false,
          reason: "No hotels left in the bank!",
          code: "BANK_EMPTY_HOTELS",
        };
      }
      return {
        canBuild: true,
        nextType: "hotel1",
        cost: tile.houseCost,
        currentHouses: 4,
        reason: "Can upgrade to 1st Hotel (returns 4 houses).",
      };
    } else if (state.houses === 5) {
      if (this.bank.hotels <= 0) {
        return {
          canBuild: false,
          reason: "No hotels left in the bank!",
          code: "BANK_EMPTY_HOTELS",
        };
      }
      return {
        canBuild: true,
        nextType: "hotel2",
        cost: tile.houseCost,
        currentHouses: 5,
        reason: "Can purchase 2nd Hotel with cash.",
      };
    }

    return { canBuild: false, reason: "Cannot build.", code: "UNKNOWN" };
  }

  canBuildHouse(playerId, tileId) {
    return this.getBuildStatus(playerId, tileId).canBuild;
  }

  buildHouse(playerId, tileId) {
    const status = this.getBuildStatus(playerId, tileId);
    if (!status.canBuild) {
      this.log(`Build denied: ${status.reason}`, "warning");
      return { success: false, reason: status.reason };
    }
    const tile = BOARD_TILES[tileId];
    const state = this.board[tileId];
    const player = this.players[playerId];

    player.cash -= tile.houseCost;
    if (!player.stats) this.initPlayerStats(player);
    player.stats.buildingSpend += tile.houseCost;

    if (state.houses < 4) {
      this.bank.houses -= 1;
      state.houses += 1;
      player.stats.housesBuilt += 1;
      this.log(
        `${player.name} built a new house on ${tile.name} ($${tile.houseCost}). Current: ${state.houses}/4 houses.`,
        "success",
      );
    } else if (state.houses === 4) {
      this.bank.houses += 4;
      this.bank.hotels -= 1;
      state.houses = 5;
      player.stats.hotelsBuilt += 1;
      this.log(
        `${player.name} upgraded ${tile.name} to 1-HOTEL (paid $${tile.houseCost}, returned 4 houses)!`,
        "success",
      );
    } else if (state.houses === 5) {
      this.bank.hotels -= 1;
      state.houses = 6;
      player.stats.hotelsBuilt += 1;
      this.log(
        `${player.name} purchased a 2nd HOTEL (Grand Hotel) on ${tile.name} for $${tile.houseCost}!`,
        "success",
      );
    }

    sounds.playUpgrade(player);
    return { success: true };
  }

  canSellHouse(playerId, tileId) {
    const tile = BOARD_TILES[tileId];
    const state = this.board[tileId];
    if (!tile || tile.type !== "property" || state.owner !== playerId)
      return false;
    if (state.houses <= 0) return false;

    const groupTiles = BOARD_TILES.filter((t) => t.group === tile.group);
    const maxHousesInGroup = Math.max(
      ...groupTiles.map((t) => this.board[t.id].houses),
    );
    if (state.houses < maxHousesInGroup) return false;

    return true;
  }

  sellHouse(playerId, tileId) {
    if (!this.canSellHouse(playerId, tileId)) return false;
    const tile = BOARD_TILES[tileId];
    const state = this.board[tileId];
    const player = this.players[playerId];

    const refund = Math.floor(tile.houseCost / 2);
    player.cash += refund;

    if (state.houses === 6) {
      this.bank.hotels += 1;
      state.houses = 5;
      this.log(
        `${player.name} sold the 2nd Hotel (+$${refund}). 1 Hotel remaining.`,
        "warning",
      );
    } else if (state.houses === 5) {
      this.bank.hotels += 1;
      this.bank.houses += 4;
      state.houses = 4;
      this.log(
        `${player.name} downgraded Hotel to 4 houses (+$${refund}).`,
        "warning",
      );
    } else {
      this.bank.houses += 1;
      state.houses -= 1;
      this.log(
        `${player.name} sold 1 house from ${tile.name} (+$${refund}). Remaining: ${state.houses} houses.`,
        "warning",
      );
    }
    sounds.playCash(player);
    return true;
  }

  canMortgage(playerId, tileId) {
    const tile = BOARD_TILES[tileId];
    const state = this.board[tileId];
    if (!tile || state.owner !== playerId || state.mortgaged) return false;

    if (tile.type === "property") {
      const groupTiles = BOARD_TILES.filter((t) => t.group === tile.group);
      if (groupTiles.some((t) => this.board[t.id].houses > 0)) return false;
    }

    return true;
  }

  mortgageProperty(playerId, tileId) {
    if (!this.canMortgage(playerId, tileId)) return false;
    const tile = BOARD_TILES[tileId];
    const state = this.board[tileId];
    const player = this.players[playerId];

    state.mortgaged = true;
    player.cash += tile.mortgage;
    this.log(
      `${player.name} mortgaged ${tile.name} and received $${tile.mortgage}.`,
      "warning",
    );
    sounds.playCash(player);
    return true;
  }

  canUnmortgage(playerId, tileId) {
    const tile = BOARD_TILES[tileId];
    const state = this.board[tileId];
    if (!tile || state.owner !== playerId || !state.mortgaged) return false;

    const cost = Math.round(tile.mortgage * 1.1);
    return this.players[playerId].cash >= cost;
  }

  unmortgageProperty(playerId, tileId) {
    if (!this.canUnmortgage(playerId, tileId)) return false;
    const tile = BOARD_TILES[tileId];
    const state = this.board[tileId];
    const player = this.players[playerId];

    const cost = Math.round(tile.mortgage * 1.1);
    player.cash -= cost;
    state.mortgaged = false;
    this.log(
      `${player.name} lifted mortgage on ${tile.name} for $${cost}.`,
      "success",
    );
    sounds.playPay(player);
    return true;
  }

  sendToJail(player) {
    if (!player.stats) this.initPlayerStats(player);
    player.stats.jailVisits += 1;
    player.position = this.getJailTileId();
    player.inJail = true;
    player.jailTurns = 0;
    this.currentTurn.doublesCount = 0;
    this.currentTurn.canRollAgain = false;
    this.currentTurn.hasRolled = true;
    this.log(
      `[ARREST] ${player.name} was sent directly to JAIL! (Next turn bail: $${gameSettings.jailBailFee})`,
      "danger",
    );
    sounds.playJail(player);
    if (this.onJail) this.onJail(player);
  }

  payJailBail(player) {
    const bail = gameSettings.jailBailFee || 150;
    if (!player.inJail || player.cash < bail) return false;
    player.cash -= bail;
    if (!player.stats) this.initPlayerStats(player);
    player.stats.jailBailPaid += bail;
    player.inJail = false;
    player.jailTurns = 0;
    this.log(
      `${player.name} paid $${bail} bail and is released from Jail!`,
      "info",
    );
    return true;
  }

  useJailCard(player) {
    if (!player.inJail || player.getOutOfJailCards <= 0) return false;
    player.getOutOfJailCards--;
    player.inJail = false;
    player.jailTurns = 0;
    this.log(
      `${player.name} used a VIP 'Get Out of Jail Free' ticket!`,
      "success",
    );
    sounds.playCash(player);
    return true;
  }

  drawCard(type) {
    const deck = type === "chance" ? this.chanceDeck : this.communityChestDeck;
    const card = deck.shift();
    deck.push(card);
    return card;
  }

  executeCard(player, card, onComplete) {
    const action = card.action;
    this.log(`Card Drawn: "${card.text}"`, "info");

    switch (action.type) {
      case "CASH":
        if (action.amount >= 0) {
          player.cash += action.amount;
          if (!player.stats) this.initPlayerStats(player);
          player.stats.cardEarnings += action.amount;
          player.stats.peakCash = Math.max(player.stats.peakCash, player.cash);
          sounds.playCash(player);
        } else {
          const penalty = Math.abs(action.amount);
          const res = this.processPayment(
            player,
            penalty,
            null,
            card.title || "penalty fee",
          );
          if (!player.stats) this.initPlayerStats(player);
          player.stats.cardPenalties +=
            res.amountPaid !== undefined ? res.amountPaid : penalty;
          if (res.success) {
            sounds.playPay(player);
          }
        }
        if (onComplete) onComplete();
        break;

      case "MOVE_TO": {
        const oldPos = player.position;
        let target = action.targets?.[gameSettings.boardTheme] ?? action.target;
        if (target >= this.getBoardLength()) {
          target = this.getBoardLength() - 1;
        }
        if (action.collectGo && target < oldPos) {
          const goRew = gameSettings.goReward || 200;
          player.cash += goRew;
          if (!player.stats) this.initPlayerStats(player);
          player.stats.salaryCollected += goRew;
          player.stats.lapsCompleted += 1;
          player.stats.peakCash = Math.max(player.stats.peakCash, player.cash);
          this.log(
            `${player.name} collected $${goRew} for passing START!`,
            "success",
          );
          sounds.playCash(player);
        }
        player.position = target;
        this.handleTileLanding(player, onComplete);
        break;
      }

      case "MOVE_RELATIVE": {
        const total = this.getBoardLength();
        player.position = (player.position + action.steps + total) % total;
        this.handleTileLanding(player, onComplete);
        break;
      }

      case "MOVE_NEAREST_RAILROAD": {
        const railroads = BOARD_TILES.filter((t) => t.group === "RAILROAD").map(
          (t) => t.id,
        );
        let nextRR = railroads.find((r) => r > player.position);
        if (nextRR === undefined) {
          nextRR = railroads[0];
          const goRew = gameSettings.goReward || 200;
          player.cash += goRew;
          if (!player.stats) this.initPlayerStats(player);
          player.stats.salaryCollected += goRew;
          player.stats.lapsCompleted += 1;
          player.stats.peakCash = Math.max(player.stats.peakCash, player.cash);
          this.log(
            `${player.name} passed START and collected $${goRew}.`,
            "success",
          );
          sounds.playCash(player);
        }
        player.position = nextRR;
        this.handleTileLanding(player, onComplete, { doubleRent: true });
        break;
      }

      case "GO_TO_JAIL":
        this.sendToJail(player);
        if (onComplete) onComplete();
        break;

      case "GET_OUT_OF_JAIL":
        player.getOutOfJailCards++;
        this.log(
          `${player.name} received a VIP 'Get Out of Jail Free' ticket!`,
          "success",
        );
        if (onComplete) onComplete();
        break;

      case "PAY_PLAYERS": {
        const others = this.getActivePlayers().filter(
          (p) => p.id !== player.id,
        );
        const totalCost = action.amount * others.length;
        const res = this.processPayment(
          player,
          totalCost,
          null,
          card.title || "payment to players",
        );
        if (!player.stats) this.initPlayerStats(player);
        player.stats.cardPenalties +=
          res.amountPaid !== undefined ? res.amountPaid : totalCost;
        if (res.success) {
          others.forEach((p) => {
            p.cash += action.amount;
            if (!p.stats) this.initPlayerStats(p);
            p.stats.cardEarnings += action.amount;
            p.stats.peakCash = Math.max(p.stats.peakCash, p.cash);
          });
          sounds.playPay(player);
        }
        if (onComplete) onComplete();
        break;
      }

      case "COLLECT_FROM_PLAYERS": {
        const others = this.getActivePlayers().filter(
          (p) => p.id !== player.id,
        );
        others.forEach((p) => {
          const res = this.processPayment(
            p,
            action.amount,
            player,
            card.title || "collection fee",
          );
          const collected =
            res.amountPaid !== undefined
              ? res.amountPaid
              : res.success
                ? action.amount
                : 0;
          if (!p.stats) this.initPlayerStats(p);
          p.stats.cardPenalties += collected;
          if (!player.stats) this.initPlayerStats(player);
          player.stats.cardEarnings += collected;
        });
        if (player.stats) {
          player.stats.peakCash = Math.max(player.stats.peakCash, player.cash);
        }
        sounds.playCash(player);
        if (onComplete) onComplete();
        break;
      }

      case "REPAIRS": {
        let housesCount = 0;
        let hotelsCount = 0;
        BOARD_TILES.forEach((t) => {
          const s = this.board[t.id];
          if (s?.owner === player.id) {
            if (s.houses === 6) hotelsCount += 2;
            else if (s.houses === 5) hotelsCount += 1;
            else if (s.houses > 0) housesCount += s.houses;
          }
        });
        const cost =
          housesCount * action.perHouse + hotelsCount * action.perHotel;
        const res = this.processPayment(
          player,
          cost,
          null,
          "property repairs",
        );
        if (!player.stats) this.initPlayerStats(player);
        player.stats.buildingSpend +=
          res.amountPaid !== undefined ? res.amountPaid : cost;
        if (res.success) {
          this.log(
            `${player.name} paid $${cost} for repairs (${housesCount} houses, ${hotelsCount} hotels).`,
            "warning",
          );
          sounds.playPay(player);
        }
        if (onComplete) onComplete();
        break;
      }

      default:
        if (onComplete) onComplete();
    }
  }

  handleTileLanding(player, onFinished, options = {}) {
    const tile = BOARD_TILES[player.position];
    const state = this.board[tile.id];

    if (tile.id === 0) {
      this.log(`${player.name} landed on START!`, "info");
      if (onFinished) onFinished();
      return;
    }

    if (tile.id === this.getGoToJailTileId()) {
      this.sendToJail(player);
      this.currentTurn.awaitingAction = {
        type: "jailed",
        player,
        onResolve: () => {
          this.currentTurn.awaitingAction = null;
          if (onFinished) onFinished();
        },
      };
      return;
    }

    if (tile.id === this.getJailTileId()) {
      this.log(
        `${player.name} is Just Visiting Jail. No penalty or fine incurred.`,
        "info",
      );
      if (onFinished) onFinished();
      return;
    }

    if (
      tile.name.includes("SAFE") ||
      tile.name.includes("FREE") ||
      (this.getBoardLength() === 36 && tile.id === 18)
    ) {
      this.log(
        `${player.name} landed in the Safe Zone. Enjoying a restful break!`,
        "info",
      );
      if (onFinished) onFinished();
      return;
    }

    if (tile.type === "tax") {
      const res = this.processPayment(player, tile.amount, null, tile.name);
      if (!player.stats) this.initPlayerStats(player);
      player.stats.taxesPaid +=
        res.amountPaid !== undefined ? res.amountPaid : tile.amount;
      if (res.success) {
        this.log(
          `${player.name} paid $${tile.amount} in ${tile.name}.`,
          "warning",
        );
        sounds.playPay(player);
      }
      if (onFinished) onFinished(res);
      return;
    }

    if (tile.type === "chance" || tile.type === "community-chest") {
      const card = this.drawCard(tile.type);
      this.currentTurn.awaitingAction = {
        type: "card_drawn",
        cardType: tile.type,
        card,
        player,
        onResolve: (deferCompletion = false) => {
          this.currentTurn.awaitingAction = null;
          this.executeCard(
            player,
            card,
            deferCompletion ? () => {} : onFinished,
          );
        },
      };
      return;
    }

    if (
      tile.type === "property" ||
      tile.type === "railroad" ||
      tile.type === "utility"
    ) {
      if (state.owner === null) {
        this.currentTurn.awaitingAction = {
          type: "buy_prompt",
          tile,
          player,
          onBuy: () => {
            if (player.cash >= tile.price) {
              player.cash -= tile.price;
              state.owner = player.id;
              if (!player.stats) this.initPlayerStats(player);
              player.stats.propertiesBought += 1;
              player.stats.propertySpend += tile.price;
              this.log(
                `${player.name} purchased ${tile.name} for $${tile.price}!`,
                "success",
              );
              sounds.playCash(player);
            }
            this.currentTurn.awaitingAction = null;
            if (onFinished) onFinished();
          },
          onPass: () => {
            this.log(`${player.name} passed on buying ${tile.name}.`, "info");
            this.currentTurn.awaitingAction = null;
            if (onFinished) onFinished();
          },
        };
        return;
      } else if (state.owner !== player.id) {
        if (state.mortgaged) {
          this.log(`${tile.name} is mortgaged. No rent owed.`, "info");
          if (onFinished) onFinished();
          return;
        }

        const owner = this.players[state.owner];
        const baseRent = this.calculateRent(
          tile.id,
          this.currentTurn.dice[0] + this.currentTurn.dice[1],
        );
        const rent = options.doubleRent ? baseRent * 2 : baseRent;

        const res = this.processPayment(
          player,
          rent,
          owner,
          `rent on ${tile.name}`,
        );
        const actualPaid =
          res.amountPaid !== undefined
            ? res.amountPaid
            : res.success
              ? rent
              : 0;
        if (actualPaid > 0) {
          if (!player.stats) this.initPlayerStats(player);
          if (!owner.stats) this.initPlayerStats(owner);
          player.stats.rentPaid += actualPaid;
          owner.stats.rentCollected += actualPaid;
          owner.stats.rentPerProperty = owner.stats.rentPerProperty || {};
          owner.stats.rentPerProperty[tile.id] =
            (owner.stats.rentPerProperty[tile.id] || 0) + actualPaid;
          owner.stats.peakCash = Math.max(owner.stats.peakCash, owner.cash);
        }
        if (res.success) {
          const rentBreakdown = options.doubleRent
            ? ` (double-rent card: $${baseRent} × 2)`
            : "";
          this.log(
            `${player.name} paid $${rent} rent to ${owner.name} for landing on ${tile.name}${rentBreakdown}.`,
            "warning",
          );
          sounds.playPay(player);
        }
        if (onFinished) onFinished(res);
        return;
      } else {
        this.log(
          `${player.name} landed on their own property (${tile.name}).`,
          "info",
        );
        if (onFinished) onFinished();
        return;
      }
    }

    if (onFinished) onFinished();
  }

  getLiquidatableAssets(playerId) {
    let value = 0;
    const props = this.getPlayerProperties(playerId);
    props.forEach((p) => {
      const s = this.board[p.id];
      if (s.houses > 0) {
        value += s.houses * Math.floor(p.houseCost / 2);
      }
      if (!s.mortgaged) {
        value += p.mortgage;
      }
    });
    return value;
  }

  autoLiquidateForPlayer(player, targetAmount = 0) {
    const requiredCash = Math.max(0, targetAmount);
    if (player.cash >= requiredCash) return true;

    // 1. Sell houses/hotels until cash >= requiredCash
    let progress = true;
    while (player.cash < requiredCash && progress) {
      progress = false;
      const propsWithHouses = this.getPlayerProperties(player.id).filter(
        (p) =>
          this.board[p.id]?.houses > 0 && this.canSellHouse(player.id, p.id),
      );

      if (propsWithHouses.length > 0) {
        propsWithHouses.sort((a, b) => (b.houseCost || 0) - (a.houseCost || 0));
        this.sellHouse(player.id, propsWithHouses[0].id);
        progress = true;
      }
    }

    if (player.cash >= requiredCash) return true;

    // 2. Mortgage unmonopolized properties
    const unmonopolized = this.getPlayerProperties(player.id).filter(
      (p) =>
        !this.hasMonopoly(player.id, p.group) &&
        this.canMortgage(player.id, p.id),
    );
    for (const p of unmonopolized) {
      if (player.cash >= requiredCash) break;
      this.mortgageProperty(player.id, p.id);
    }

    if (player.cash >= requiredCash) return true;

    // 3. Mortgage monopolized properties
    const monopolized = this.getPlayerProperties(player.id).filter((p) =>
      this.canMortgage(player.id, p.id),
    );
    for (const p of monopolized) {
      if (player.cash >= requiredCash) break;
      this.mortgageProperty(player.id, p.id);
    }

    return player.cash >= requiredCash;
  }

  ensureSolvency(player) {
    if (!player || player.bankrupt) return true;
    if (player.cash >= 0) return true;

    if (player.isAi) {
      this.autoLiquidateForPlayer(player, 0);
      if (player.cash < 0) {
        this.declareBankruptcy(player);
        return false;
      }
      return true;
    }
    return false;
  }

  processPayment(debtor, amount, creditor = null, reason = "payment") {
    if (amount <= 0 || debtor.bankrupt) {
      return { success: true, bankrupt: false };
    }

    // 1. Debtor has sufficient cash
    if (debtor.cash >= amount) {
      debtor.cash -= amount;
      if (creditor && !creditor.bankrupt) {
        creditor.cash += amount;
      }
      return { success: true, bankrupt: false };
    }

    // 2. Debtor is AI -> Proactively raise cash by selling houses / mortgaging properties
    if (debtor.isAi) {
      this.autoLiquidateForPlayer(debtor, amount);

      if (debtor.cash >= amount) {
        debtor.cash -= amount;
        if (creditor && !creditor.bankrupt) {
          creditor.cash += amount;
        }
        return { success: true, bankrupt: false };
      }

      // Debtor cannot pay even after full liquidation: BANKRUPTCY!
      this.log(
        `[INSOLVENCY] ${debtor.name} cannot afford $${amount} for ${reason} and is bankrupt!`,
        "danger",
      );
      this.declareBankruptcy(debtor, creditor);
      return { success: false, bankrupt: true };
    }

    // 3. Debtor is Human
    const totalLiquidatable = debtor.cash + this.getLiquidatableAssets(debtor.id);
    if (totalLiquidatable < amount) {
      // Insolvent even with all assets liquidated
      this.log(
        `[INSOLVENCY] ${debtor.name} cannot afford $${amount} for ${reason} and is bankrupt!`,
        "danger",
      );
      this.declareBankruptcy(debtor, creditor);
      return { success: false, bankrupt: true };
    }

    // Human can liquidate to pay
    return {
      success: false,
      bankrupt: false,
      pendingDebt: true,
      amount,
      deficit: amount - debtor.cash,
      creditor,
      reason,
    };
  }

  checkBankruptcy(player) {
    if (player.cash >= 0) {
      return { bankrupt: false, inDebt: false };
    }

    const liquidatable = this.getLiquidatableAssets(player.id);
    const totalAssets = player.cash + liquidatable;

    if (totalAssets < 0) {
      this.declareBankruptcy(player);
      return { bankrupt: true, inDebt: false };
    }

    return { bankrupt: false, inDebt: true, deficit: Math.abs(player.cash) };
  }

  declareBankruptcy(player, creditor = null) {
    if (player.bankrupt) return;
    player.bankrupt = true;
    this.bankruptcyCounter = (this.bankruptcyCounter || 0) + 1;
    player.bankruptcyOrder = this.bankruptcyCounter;
    player.bankruptcyRound = this.roundCount;

    if (creditor && !creditor.bankrupt && creditor.id !== player.id) {
      if (!creditor.stats) this.initPlayerStats(creditor);
      creditor.stats.bankruptciesCaused =
        (creditor.stats.bankruptciesCaused || 0) + 1;
      this.log(
        `[BANKRUPT] ${player.name} went bankrupt to ${creditor.name} and is eliminated!`,
        "danger",
      );
      // Transfer remaining cash to creditor
      if (player.cash > 0) {
        creditor.cash += player.cash;
        this.log(
          `${player.name} surrendered remaining $${player.cash} to ${creditor.name}.`,
          "info",
        );
      }
      // Transfer all properties to creditor
      BOARD_TILES.forEach((t) => {
        if (this.board[t.id]?.owner === player.id) {
          this.board[t.id].owner = creditor.id;
          if (this.board[t.id].houses > 0) {
            const refund = this.board[t.id].houses * Math.floor((t.houseCost || 0) / 2);
            creditor.cash += refund;
            this.board[t.id].houses = 0;
          }
        }
      });
      this.log(
        `All properties owned by ${player.name} were surrendered to ${creditor.name}!`,
        "warning",
      );
    } else {
      this.log(
        `[BANKRUPT] ${player.name} has gone bankrupt to the Bank and is eliminated!`,
        "danger",
      );
      BOARD_TILES.forEach((t) => {
        if (this.board[t.id]?.owner === player.id) {
          this.board[t.id].owner = null;
          this.board[t.id].houses = 0;
          this.board[t.id].mortgaged = false;
        }
      });
    }

    player.cash = 0;
    sounds.playBankrupt(player);
    if (this.onBankruptcy) this.onBankruptcy(player);

    const active = this.getActivePlayers();
    if (active.length === 1) {
      this.gameOver = true;
      this.winner = active[0];
      this.log(
        `[CHAMPION] GAME OVER! ${this.winner.name} IS THE MONOPOLY CHAMPION!`,
        "success",
      );
      sounds.playVictory(this.winner);
      if (this.onGameOver) this.onGameOver(this.winner);
    }
  }

  endTurn() {
    this.currentTurn.hasRolled = false;
    this.currentTurn.canRollAgain = false;
    this.currentTurn.awaitingAction = null;

    this.turnCount = (this.turnCount || 0) + 1;
    this.currentTurn.count = this.turnCount;
    this.roundCount =
      Math.floor(this.turnCount / Math.max(1, this.players.length || 4)) + 1;

    const active = this.getActivePlayers();
    if (active.length <= 1) {
      this.gameOver = true;
      this.winner = active[0] || null;
      if (this.winner) {
        sounds.playVictory(this.winner);
        if (this.onGameOver) this.onGameOver(this.winner);
      }
      return;
    }

    let nextIndex = (this.currentTurn.playerIndex + 1) % this.players.length;
    while (this.players[nextIndex].bankrupt) {
      nextIndex = (nextIndex + 1) % this.players.length;
    }
    this.currentTurn.playerIndex = nextIndex;
    this.currentTurn.doublesCount = 0;

    const nextPlayer = this.players[nextIndex];
    this.log(`It's now ${nextPlayer.name}'s turn!`);
  }

  executeTrade(
    player1Id,
    player2Id,
    p1OfferingProps,
    p1Cash,
    p2OfferingProps,
    p2Cash,
  ) {
    const p1 = this.players[player1Id];
    const p2 = this.players[player2Id];

    if (p1.cash < p1Cash || p2.cash < p2Cash) return false;

    p1.cash -= p1Cash;
    p2.cash += p1Cash;
    p2.cash -= p2Cash;
    p1.cash += p2Cash;

    p1OfferingProps.forEach((id) => {
      if (this.board[id]) {
        this.board[id].owner = p2.id;
        if (this.board[id].mortgaged) {
          this.board[id].mortgaged = false;
          const tile = this.getTile(id);
          this.log(
            `[TRADE] ${tile?.name || "Property"} mortgage was cleared upon acquisition by ${p2.name}!`,
            "info",
          );
        }
      }
    });
    p2OfferingProps.forEach((id) => {
      if (this.board[id]) {
        this.board[id].owner = p1.id;
        if (this.board[id].mortgaged) {
          this.board[id].mortgaged = false;
          const tile = this.getTile(id);
          this.log(
            `[TRADE] ${tile?.name || "Property"} mortgage was cleared upon acquisition by ${p1.name}!`,
            "info",
          );
        }
      }
    });

    this.log(
      `[TRADE] Trade completed between ${p1.name} and ${p2.name}!`,
      "success",
    );
    sounds.playCash(p1.isAi && !p2.isAi ? p2 : p1);
    return true;
  }

  getMatchLogExportData() {
    const durationSec = this.getMatchDurationSeconds();
    const durationMin = Math.floor(durationSec / 60);
    const durationRemSec = durationSec % 60;
    const durationFormatted = `${durationMin}m ${durationRemSec}s`;

    const winnerData = this.winner
      ? {
          id: this.winner.id,
          name: this.winner.name,
          token: this.winner.token,
          color: this.winner.color,
          finalCash: this.winner.cash,
          netWorth: this.getPlayerNetWorth(this.winner.id).total,
          propertiesCount: this.getPlayerProperties(this.winner.id).length,
          monopoliesCount: this.getPlayerMonopolies(this.winner.id).length,
        }
      : null;

    const standings = [...this.players]
      .sort((a, b) => {
        if (this.winner && a.id === this.winner.id) return -1;
        if (this.winner && b.id === this.winner.id) return 1;
        if (a.bankrupt && !b.bankrupt) return 1;
        if (!a.bankrupt && b.bankrupt) return -1;
        return (
          this.getPlayerNetWorth(b.id).total -
          this.getPlayerNetWorth(a.id).total
        );
      })
      .map((p, idx) => {
        const nw = this.getPlayerNetWorth(p.id);
        const props = this.getPlayerProperties(p.id);
        return {
          rank: idx + 1,
          id: p.id,
          name: p.name,
          token: p.token,
          color: p.color,
          isWinner: this.winner ? p.id === this.winner.id : false,
          bankrupt: p.bankrupt,
          finalCash: p.cash,
          netWorth: nw.total,
          netWorthBreakdown: {
            cash: nw.cash,
            unmortgagedPropertiesValue: nw.unmortgagedValue,
            mortgagedEquity: nw.mortgagedEquity,
            mortgageDebt: nw.mortgageDebt,
            buildingsValue: nw.buildingsValue,
            jailCardsValue: nw.jailCardsValue,
          },
          propertiesCount: props.length,
          properties: props.map((prop) => ({
            id: prop.id,
            name: prop.name,
            group: prop.group,
            mortgaged: prop.mortgaged,
            houses: prop.houses,
            isHotel: prop.houses >= 5,
          })),
          monopolies: this.getPlayerMonopolies(p.id),
          stats: p.stats || this.initPlayerStats(p),
        };
      });

    return {
      gameTitle: "Monopoly Master - Official Match Activity Report",
      exportedAt: new Date().toISOString(),
      matchDuration: {
        seconds: durationSec,
        formatted: durationFormatted,
      },
      matchStats: {
        boardEdition:
          BOARD_TILES.length === 36
            ? "World 36-Tile Edition"
            : "Classic 40-Tile Edition",
        totalTiles: BOARD_TILES.length,
        totalRounds: this.roundCount,
        totalTurns: this.turnCount,
        totalEventsLogged: this.matchHistory.length,
        isGameOver: this.gameOver,
        winner: winnerData,
      },
      settings: {
        startingCash: gameSettings.startingCash || 1500,
        jailBailFee: gameSettings.jailBailFee || 150,
        doubleRentOnMonopolies: gameSettings.doubleRentOnMonopolies ?? true,
        evenBuildRule: gameSettings.evenBuildRule ?? true,
      },
      finalStandings: standings,
      matchEvents: this.matchHistory.map((item, idx) => ({
        eventIndex: idx + 1,
        time: item.time,
        timestamp: item.timestamp,
        turn: item.turn,
        round: item.round,
        player: item.playerName,
        category: item.category,
        type: item.type,
        message: item.text,
      })),
    };
  }

  getMatchSummary() {
    const durationSec = this.getMatchDurationSeconds();
    const mins = Math.floor(durationSec / 60);
    const secs = durationSec % 60;
    const durationFormatted = `${mins}m ${secs.toString().padStart(2, "0")}s`;

    this.players.forEach((p) => {
      if (!p.stats) this.initPlayerStats(p);
      const nw = this.getPlayerNetWorth(p.id);
      p.stats.peakNetWorth = Math.max(p.stats.peakNetWorth || 0, nw.total);
      p.stats.peakCash = Math.max(p.stats.peakCash || 0, p.cash);
    });

    const standings = [...this.players]
      .sort((a, b) => {
        if (this.winner && a.id === this.winner.id) return -1;
        if (this.winner && b.id === this.winner.id) return 1;
        if (!a.bankrupt && b.bankrupt) return -1;
        if (a.bankrupt && !b.bankrupt) return 1;
        if (!a.bankrupt && !b.bankrupt) {
          return (
            this.getPlayerNetWorth(b.id).total -
            this.getPlayerNetWorth(a.id).total
          );
        }
        return (b.bankruptcyOrder || 0) - (a.bankruptcyOrder || 0);
      })
      .map((p, idx) => {
        const nw = this.getPlayerNetWorth(p.id);
        const props = this.getPlayerProperties(p.id);
        const isWinner = this.winner ? p.id === this.winner.id : false;

        let title = "Real Estate Investor";
        let grade = "A";
        if (isWinner) {
          title = "Grand Monopoly Champion";
          grade = "S+";
        } else if (idx === 1 && !p.bankrupt) {
          title = "Distinguished Vice Tycoon";
          grade = "S";
        } else if (!p.bankrupt) {
          title = "Prominent Capitalist";
          grade = "A+";
        } else {
          title = "Fallen Enterprise Pioneer";
          grade = "B";
        }

        let bestProp = null;
        let maxRent = 0;
        Object.entries(p.stats.rentPerProperty || {}).forEach(
          ([tId, rentAmt]) => {
            if (rentAmt > maxRent) {
              maxRent = rentAmt;
              bestProp = BOARD_TILES[tId]?.name || `Tile #${tId}`;
            }
          },
        );

        return {
          rank: idx + 1,
          id: p.id,
          name: p.name,
          token: p.token,
          color: p.color,
          isAi: p.isAi,
          isWinner,
          title,
          grade,
          bankrupt: p.bankrupt,
          finalCash: p.cash,
          netWorth: nw.total,
          netWorthBreakdown: nw,
          propertiesCount: props.length,
          properties: props,
          monopolies: this.getPlayerMonopolies(p.id),
          crownJewel: bestProp
            ? `${bestProp} ($${maxRent.toLocaleString()})`
            : "None",
          crownJewelName: bestProp,
          crownJewelRent: maxRent,
          stats: { ...p.stats },
        };
      });

    let globalCrownJewel = null;
    let globalMaxRent = 0;
    this.players.forEach((p) => {
      Object.entries(p.stats?.rentPerProperty || {}).forEach(
        ([tId, rentAmt]) => {
          if (rentAmt > globalMaxRent) {
            globalMaxRent = rentAmt;
            globalCrownJewel = {
              tileId: tId,
              name: BOARD_TILES[tId]?.name || `Tile #${tId}`,
              rentCollected: rentAmt,
              ownerName: p.name,
            };
          }
        },
      );
    });

    return {
      durationSec,
      durationFormatted,
      totalRounds: this.roundCount,
      totalTurns: this.turnCount,
      winner: this.winner,
      standings,
      globalCrownJewel,
    };
  }
}
