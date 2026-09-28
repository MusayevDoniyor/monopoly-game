import { gameSettings } from "./boardData.js";

export class TurnTimer {
  constructor(app) {
    this.app = app;
    this._matchClockInterval = null;
    this._turnTimerInterval = null;
  }

  get engine() { return this.app.engine; }
  get ui() { return this.app.ui; }
  get multiplayer() { return this.app.multiplayer; }

  startMatchClock() {
    this.stopMatchClock();
    this.ui.updateMatchTimer(this.engine.getMatchDurationSeconds());
    this._matchClockInterval = setInterval(() => {
      if (this.engine.gameOver) {
        this.stopMatchClock();
        return;
      }
      this.ui.updateMatchTimer(this.engine.getMatchDurationSeconds());
    }, 1000);
  }

  stopMatchClock() {
    if (this._matchClockInterval) {
      clearInterval(this._matchClockInterval);
      this._matchClockInterval = null;
    }
  }

  startTurnTimer(player, phase = "roll") {
    this.stopTurnTimer();
    if (!player || player.isAi || this.engine.gameOver) {
      this.ui.hideTurnTimer();
      return;
    }

    const totalSec =
      phase === "roll"
        ? (gameSettings.turnTimerSeconds ?? 25)
        : Math.min(15, gameSettings.turnTimerSeconds ?? 15);

    if (totalSec <= 0) {
      this.ui.hideTurnTimer();
      return;
    }

    let remaining = totalSec;
    this.ui.updateTurnTimer(remaining, totalSec);

    this._turnTimerInterval = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        this.stopTurnTimer();
        this.handleTurnTimeout(player, phase);
      } else {
        this.ui.updateTurnTimer(remaining, totalSec);
      }
    }, 1000);
  }

  stopTurnTimer() {
    if (this._turnTimerInterval) {
      clearInterval(this._turnTimerInterval);
      this._turnTimerInterval = null;
    }
  }

  handleTurnTimeout(player, phase) {
    if (this.engine.gameOver) return;
    const current = this.engine.getCurrentPlayer();
    if (!current || current.id !== player.id) return;
    if (
      this.multiplayer.isOnline &&
      this.multiplayer.localPlayerId !== player.id
    )
      return;

    if (phase === "roll") {
      if (!this.engine.currentTurn.hasRolled && !player.inJail) {
        this.engine.log(
          `⏱️ [TURN TIMEOUT] ${player.name} ran out of time! Auto-rolling dice...`,
          "warning",
        );
        this.app.handleRollDice(false);
      }
    } else if (phase === "end_turn") {
      if (this.engine.currentTurn.hasRolled) {
        this.engine.log(
          `⏱️ [TURN TIMEOUT] ${player.name} ran out of time! Auto-passing turn...`,
          "warning",
        );
        this.app.handleEndTurn();
      }
    }
  }

  resumeTurnTimerIfNeeded() {
    if (this.engine.gameOver) return;
    const player = this.engine.getCurrentPlayer();
    if (
      player &&
      !player.isAi &&
      !this.ui.modalOverlay.classList.contains("active")
    ) {
      const phase = this.engine.currentTurn.hasRolled ? "end_turn" : "roll";
      this.startTurnTimer(player, phase);
    }
  }
}
