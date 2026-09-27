import { BOARD_TILES, COLOR_GROUPS, TILE_PROBABILITIES } from './boardData.js?v=4.18';
import { sounds } from './audio.js?v=4.18';

export class AiPlayer {
  constructor(engine) {
    this.engine = engine;
    this.lastTradeTurn = {};
    this.lastHumanTradeTurn = -999;
    this.rejectedOffers = {}; // `${targetPlayerId}_${tileId}` -> { count: number, lastTurn: number, lastCash: number }
  }

  reset() {
    this.lastTradeTurn = {};
    this.lastHumanTradeTurn = -999;
    this.rejectedOffers = {};
  }

  // Handle Jail phase decision
  decideJailAction(player) {
    if (!player.inJail) return 'roll';

    // If has jail card, definitely use it
    if (player.getOutOfJailCards > 0) {
      return 'card';
    }

    // In early-game: unowned properties exist, so leaving Jail fast to buy properties is optimal
    const unownedCount = BOARD_TILES.filter(t => t.type === 'property' && this.engine.board[t.id].owner === null).length;
    if (unownedCount > 6 && player.cash >= 150) {
      return 'pay';
    }

    // In late-game: properties are loaded with dangerous houses! Staying in Jail is a safe haven!
    if (unownedCount <= 2 && player.jailTurns < 2) {
      return 'roll'; // Safely stay in jail
    }

    // If 3rd turn in jail, will be forced to pay anyway
    if (player.jailTurns >= 2 && player.cash >= 50) {
      return 'pay';
    }

    return 'roll';
  }

  // Property purchase decision based on strategic portfolio management & Markov EV
  decideBuyProperty(player, tile) {
    if (player.cash < tile.price) return false;

    // 1. Monopoly completion check (Top Priority)
    if (tile.type === 'property') {
      const groupTiles = BOARD_TILES.filter(t => t.group === tile.group);
      const ownedInGroup = groupTiles.filter(t => this.engine.board[t.id].owner === player.id).length;
      if (ownedInGroup === groupTiles.length - 1) {
        // Completes our monopoly! High priority, buy as long as we have even $20 left
        return player.cash >= tile.price + 20;
      }

      // 2. Block opponent monopoly (High Priority)
      for (const opponent of this.engine.getActivePlayers()) {
        if (opponent.id === player.id) continue;
        const oppOwned = groupTiles.filter(t => this.engine.board[t.id].owner === opponent.id).length;
        if (oppOwned === groupTiles.length - 1) {
          // Block opponent!
          return player.cash >= tile.price + 50;
        }
      }
    }

    // 3. Station / Airport synergy
    if (tile.type === 'railroad') {
      const railroads = BOARD_TILES.filter(t => t.group === 'RAILROAD');
      const ownedStations = railroads.filter(r => this.engine.board[r.id].owner === player.id).length;
      if (ownedStations >= 1 && player.cash >= tile.price + 100) {
        return true; // Owning multiple stations scales rent up to $200!
      }
    }

    // 4. Cash preservation for existing monopolies:
    // If AI already owns a monopoly that needs houses, don't waste cash buying dead-end single properties!
    const owned = this.engine.getPlayerProperties(player.id);
    const hasMonopolyNeedingDevelopment = owned.some(t => {
      if (t.type !== 'property' || !this.engine.hasMonopoly(player.id, t.group)) return false;
      const st = this.engine.board[t.id];
      return st && st.houses < 4;
    });

    if (hasMonopolyNeedingDevelopment) {
      // Must maintain a warchest to build houses! (at least $350 after buying)
      if (player.cash < tile.price + 350) {
        return false;
      }
    }

    // 5. Progress towards a set (owning 1 of a 3-property group already)
    let synergyScore = 0;
    if (tile.type === 'property') {
      const groupTiles = BOARD_TILES.filter(t => t.group === tile.group);
      const ownedInGroup = groupTiles.filter(t => this.engine.board[t.id].owner === player.id).length;
      if (ownedInGroup > 0) {
        synergyScore += 100;
      }
    }

    // 6. Dynamic safety buffer based on game stage:
    const unownedCount = BOARD_TILES.filter(t => t.type === 'property' && this.engine.board[t.id].owner === null).length;
    let safetyBuffer = 180;
    if (unownedCount <= 8) safetyBuffer = 260;
    if (unownedCount <= 3) safetyBuffer = 360; // Late game: dangerous houses on board!

    // If synergy exists, reduce required buffer
    safetyBuffer = Math.max(70, safetyBuffer - synergyScore);

    return player.cash >= tile.price + safetyBuffer;
  }

  // Algorithm: Return on Investment (ROI), Monopolies & Housing Scarcity strategy
  tryUpgrading(player) {
    if (player.cash < 150) return;

    const owned = this.engine.getPlayerProperties(player.id);
    const monopolizedGroups = new Set();

    owned.forEach(tile => {
      if (tile.type === 'property' && this.engine.hasMonopoly(player.id, tile.group)) {
        monopolizedGroups.add(tile.group);
      }
    });

    if (monopolizedGroups.size === 0) return;

    // Evaluate best property to upgrade using ROI:
    let bestCandidate = null;
    let highestRoi = -1;

    for (const groupKey of monopolizedGroups) {
      const groupTiles = BOARD_TILES.filter(t => t.group === groupKey);

      for (const t of groupTiles) {
        const state = this.engine.board[t.id];
        const status = this.engine.getBuildStatus(player.id, t.id);
        if (!status.canBuild) continue;

        const currentRent = this.engine.calculateRent(t.id);
        let nextRent = 0;
        if (state.houses < 4) {
          nextRent = t.rent[state.houses + 1];
        } else if (state.houses === 4) {
          nextRent = t.rent[5]; // 1 Hotel
        } else if (state.houses === 5) {
          nextRent = Math.round(t.rent[5] * 1.5); // 2nd Hotel
        }

        const rentGain = Math.max(10, nextRent - currentRent);
        const prob = (TILE_PROBABILITIES[t.id] || 2.5) / 100;
        let roi = (rentGain * prob) / t.houseCost;

        // Weight finishing 3-4 houses or 1st hotel
        if (state.houses >= 2 && state.houses < 5) roi *= 1.3;

        // For 2nd hotel (houses === 5), only build if abundant cash (> $300 reserve)
        if (state.houses === 5 && player.cash < t.houseCost + 300) {
          continue;
        }

        if (roi > highestRoi) {
          highestRoi = roi;
          bestCandidate = t;
        }
      }
    }

    if (bestCandidate && player.cash >= bestCandidate.houseCost + 120) {
      this.engine.buildHouse(player.id, bestCandidate.id);
      // AI with strong cash reserve can build multiple upgrades in one turn
      if (player.cash > 450 && Math.random() < 0.6) {
        this.tryUpgrading(player);
      }
    }
  }

  // Debt handling / emergency liquidation
  handleDebt(player) {
    if (player.cash >= 0) return true;

    const owned = this.engine.getPlayerProperties(player.id);

    // 1. Sell houses / hotels on lowest ROI properties
    for (const t of owned) {
      if (this.engine.canSellHouse(player.id, t.id)) {
        this.engine.sellHouse(player.id, t.id);
        if (player.cash >= 0) return true;
      }
    }

    // 2. Mortgage non-monopolized properties
    const nonMonopolies = owned.filter(t => !this.engine.hasMonopoly(player.id, t.group) && !this.engine.board[t.id].mortgaged);
    nonMonopolies.sort((a, b) => (a.rent?.[0] || 0) - (b.rent?.[0] || 0));

    for (const t of nonMonopolies) {
      if (this.engine.canMortgage(player.id, t.id)) {
        this.engine.mortgageProperty(player.id, t.id);
        if (player.cash >= 0) return true;
      }
    }

    // 3. Mortgage remaining properties if still in debt
    const remaining = owned.filter(t => !this.engine.board[t.id].mortgaged);
    for (const t of remaining) {
      if (this.engine.canMortgage(player.id, t.id)) {
        this.engine.mortgageProperty(player.id, t.id);
        if (player.cash >= 0) return true;
      }
    }

    return player.cash >= 0;
  }

  // Proactively scans for trade opportunities to complete AI monopolies or mutually advantageous deals
  async considerProactiveTrade(player, app) {
    if (!player || player.bankrupt) return false;

    const currentTurn = this.engine.turnCount || 0;
    const playerCount = Math.max(2, this.engine.players.length || 4);

    // Cooldown check for this AI: max 1 trade attempt per 3 rounds
    if (currentTurn - (this.lastTradeTurn[player.id] || -999) < playerCount * 3) {
      return false;
    }

    // Do not initiate trade if player is low on cash
    if (player.cash < 200) return false;

    // Scan for a color group where AI owns all but 1 property
    for (const groupKey of Object.keys(COLOR_GROUPS)) {
      if (groupKey === 'SPECIAL') continue;
      const groupTiles = BOARD_TILES.filter(t => t.group === groupKey);
      if (groupTiles.length === 0) continue;

      const aiOwned = groupTiles.filter(t => this.engine.board[t.id]?.owner === player.id);
      if (aiOwned.length === groupTiles.length - 1) {
        // AI has all but 1!
        const missingTile = groupTiles.find(t => this.engine.board[t.id]?.owner !== player.id);
        if (!missingTile) continue;

        const targetOwnerId = this.engine.board[missingTile.id]?.owner;
        if (targetOwnerId === null || targetOwnerId === undefined || targetOwnerId === player.id) continue;

        const targetPlayer = this.engine.players[targetOwnerId];
        if (!targetPlayer || targetPlayer.bankrupt) continue;

        const rejectKey = `${targetPlayer.id}_${missingTile.id}`;
        const rej = this.rejectedOffers[rejectKey];

        // Anti-Spam protection for HUMAN player:
        if (!targetPlayer.isAi) {
          // 1. Global human trade cooldown: across ALL bots, human gets max 1 offer per 4 full rounds (~16 turns)
          if (currentTurn - (this.lastHumanTradeTurn || -999) < playerCount * 4) {
            continue;
          }

          // 2. Rejection history checks for this specific property:
          if (rej) {
            // If human rejected 3 or more times, respect their decision permanently!
            if (rej.count >= 3) {
              continue;
            }

            // Cooldown after previous rejection:
            // 1st rejection -> must wait at least 5 full rounds
            // 2nd rejection -> must wait at least 8 full rounds
            const requiredWaitRounds = rej.count === 1 ? 5 : 8;
            if (currentTurn - rej.lastTurn < playerCount * requiredWaitRounds) {
              continue;
            }
          }
        }

        // Look for a spare property that AI can offer (not part of AI's monopolies or 2/3 sets)
        const aiProps = this.engine.getPlayerProperties(player.id);
        const spareProps = aiProps.filter(p => {
          if (p.id === missingTile.id) return false;
          if (this.engine.hasMonopoly(player.id, p.group)) return false;
          const setTiles = BOARD_TILES.filter(t => t.group === p.group);
          const ownedInSet = setTiles.filter(t => this.engine.board[t.id]?.owner === player.id).length;
          return ownedInSet < setTiles.length - 1; // not 2/3
        });

        // Pick best spare property to offer, or cash-only offer
        let offeredProps = [];
        let offeredCash = 0;

        if (spareProps.length > 0) {
          // Find spare property that target player might want (synergy) or highest value
          spareProps.sort((a, b) => {
            const aTargetHas = BOARD_TILES.filter(t => t.group === a.group && this.engine.board[t.id]?.owner === targetPlayer.id).length;
            const bTargetHas = BOARD_TILES.filter(t => t.group === b.group && this.engine.board[t.id]?.owner === targetPlayer.id).length;
            return bTargetHas - aTargetHas;
          });
          const bestSpare = spareProps[0];
          offeredProps = [bestSpare.id];
          const valDiff = missingTile.price - bestSpare.price;

          if (rej) {
            // SWEETENED OFFER (After rejection): substantial extra cash bonus!
            const bonus = rej.count === 1 ? 120 : 200;
            offeredCash = Math.max((rej.lastCash || 0) + 80, Math.max(50, valDiff) + bonus);
          } else {
            offeredCash = Math.max(50, valDiff + 60);
          }
        } else {
          // Pure cash offer
          if (rej) {
            // SWEETENED CASH OFFER:
            // 2nd attempt: 190% of price (or at least +$80 over previous offer)
            // 3rd attempt: 250% of price (or at least +$120 over previous offer)
            const premiumMultiplier = rej.count === 1 ? 1.9 : 2.5;
            const stepBonus = rej.count === 1 ? 80 : 140;
            offeredCash = Math.max(
              Math.round(missingTile.price * premiumMultiplier),
              (rej.lastCash || 0) + stepBonus
            );
          } else {
            // Initial fair offer: 135% of property face value
            offeredCash = Math.round(missingTile.price * 1.35);
          }
        }

        // Ensure AI can afford offeredCash while leaving at least $120 liquid reserve
        if (player.cash < offeredCash + 120) continue;

        this.lastTradeTurn[player.id] = currentTurn;

        // Case A: Target is HUMAN player -> Present trade offer modal!
        if (!targetPlayer.isAi) {
          this.lastHumanTradeTurn = currentTurn;
          const isSweetened = !!rej;
          const attemptNote = isSweetened
            ? `🔥 SWEETENED OFFER: Attempt #${rej.count + 1} (Includes extra +$${offeredCash - (rej.lastCash || 0)} bonus cash since previous decline!)`
            : null;

          return new Promise(resolve => {
            app.stopTurnTimer();
            if (isSweetened) {
              this.engine.log(`🤖 [SWEETENED DEAL] ${player.name} is offering MORE CASH ($${offeredCash}) for ${missingTile.name}!`, 'info');
            } else {
              this.engine.log(`🤖 ${player.name} is offering a trade for ${missingTile.name}!`, 'info');
            }

            app.ui.showTradeOfferModal(
              player,
              targetPlayer,
              offeredProps,
              offeredCash,
              [missingTile.id],
              0,
              () => {
                // Human accepted!
                delete this.rejectedOffers[rejectKey];
                player.cash -= offeredCash;
                targetPlayer.cash += offeredCash;
                offeredProps.forEach(id => {
                  this.engine.board[id].owner = targetPlayer.id;
                });
                this.engine.board[missingTile.id].owner = player.id;

                this.engine.log(`🤝 [TRADE AGREEMENT] You accepted ${player.name}'s offer!`, 'success');
                sounds.playCash(targetPlayer);
                if (this.engine.hasMonopoly(player.id, missingTile.group)) {
                  app.ui.celebrateMonopoly(player, missingTile.group);
                }
                app.ui.updateBoardState();
                app.ui.updateHUD();
                resolve(true);
              },
              () => {
                // Human declined -> Record rejection to remember and enforce cooldown & sweetener
                if (!this.rejectedOffers[rejectKey]) {
                  this.rejectedOffers[rejectKey] = { count: 1, lastTurn: currentTurn, lastCash: offeredCash };
                } else {
                  this.rejectedOffers[rejectKey].count++;
                  this.rejectedOffers[rejectKey].lastTurn = currentTurn;
                  this.rejectedOffers[rejectKey].lastCash = Math.max(this.rejectedOffers[rejectKey].lastCash, offeredCash);
                }

                const rejCount = this.rejectedOffers[rejectKey].count;
                const cooldownMsg = rejCount >= 3
                  ? "Bots will not bother you about this property anymore."
                  : `Bots will leave you alone about this for at least ${rejCount === 1 ? "5" : "8"} rounds.`;

                this.engine.log(`❌ You declined ${player.name}'s trade offer. ${cooldownMsg}`, 'warning');
                resolve(false);
              },
              attemptNote
            );
          });
        }

        // Case B: Target is another AI -> Evaluate algorithmically
        const evalResult = this.evaluateTradeOffer(targetPlayer, player, offeredProps, offeredCash, [missingTile.id], 0);
        if (evalResult.accepted) {
          player.cash -= offeredCash;
          targetPlayer.cash += offeredCash;
          offeredProps.forEach(id => {
            this.engine.board[id].owner = targetPlayer.id;
          });
          this.engine.board[missingTile.id].owner = player.id;

          this.engine.log(`🤝 [AI TRADE DEAL] ${player.name} and ${targetPlayer.name} finalized a deal! ${player.name} acquired ${missingTile.name} and completed a monopoly!`, 'success');
          sounds.playCash(player);
          if (this.engine.hasMonopoly(player.id, missingTile.group)) {
            app.ui.celebrateMonopoly(player, missingTile.group);
          }
          app.ui.updateBoardState();
          app.ui.updateHUD();
          return true;
        }
      }
    }

    return false;
  }

  // Evaluate incoming trade offer
  evaluateTradeOffer(receiverPlayer, offeringPlayer, offeredProps, offeredCash, requestedProps, requestedCash) {
    if (offeredProps.length === 0 && offeredCash === 0 && requestedProps.length === 0 && requestedCash === 0) {
      return { accepted: false, reason: "No terms offered in trade proposal." };
    }
    if (requestedCash > receiverPlayer.cash) {
      return { accepted: false, reason: "I don't have that much liquid capital right now." };
    }

    let offeredValue = offeredCash;
    let requestedValue = requestedCash;

    // Value of properties offered to AI
    offeredProps.forEach(id => {
      const tile = BOARD_TILES[id];
      offeredValue += tile.price;

      // Monopoly synergy bonus: If this completes AI's monopoly!
      const groupTiles = BOARD_TILES.filter(t => t.group === tile.group);
      const currentlyOwned = groupTiles.filter(t => this.engine.board[t.id]?.owner === receiverPlayer.id).length;
      if (currentlyOwned === groupTiles.length - 1) {
        offeredValue += tile.price * 2.2; // Massive value to complete a monopoly
      } else if (currentlyOwned > 0) {
        offeredValue += tile.price * 0.3; // Progress towards set
      }
    });

    // Value of properties requested from AI
    requestedProps.forEach(id => {
      const tile = BOARD_TILES[id];
      requestedValue += tile.price;

      // Heavy penalty if giving away a property from an already completed monopoly
      if (this.engine.hasMonopoly(receiverPlayer.id, tile.group)) {
        requestedValue += 1000; // Never dismantle our monopoly
      }

      // Penalty if giving this property completes the OPPONENT'S monopoly!
      const groupTiles = BOARD_TILES.filter(t => t.group === tile.group);
      const oppOwned = groupTiles.filter(t => this.engine.board[t.id]?.owner === offeringPlayer.id).length;
      if (oppOwned === groupTiles.length - 1) {
        requestedValue += tile.price * 1.8; // Significant premium to give opponent a monopoly
      }
    });

    // Fair deal condition: offered value must be at least 95% of requested value
    const accepted = offeredValue >= (requestedValue * 0.95);

    let reason = '';
    if (accepted) {
      reason = "Deal agreed! This trade makes strategic sense for our portfolios.";
    } else if (offeredValue < requestedValue * 0.6) {
      reason = "Offer declined. You are asking for far more value than you are offering!";
    } else {
      reason = "Offer declined. Add some extra cash or another property, and we can make a deal.";
    }

    return { accepted, reason };
  }
}
