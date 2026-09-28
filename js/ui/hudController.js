import { UIComponent } from "./uiComponent.js";
import { getIcon } from "../icons.js?v=8.2";
import { COLOR_GROUPS, gameSettings } from "../boardData.js?v=8.2";
import { escapeHtml } from "../utils.js";

export class HudController extends UIComponent {
  initStaticIcons() {
    const setIcon = (id, iconKey, className) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = getIcon(iconKey, className);
    };

    // Timers
    setIcon("matchTimerIcon", "CLOCK");
    setIcon("turnTimerIcon", "HOURGLASS");

    // Header & Drawer
    setIcon("musicIconWrap", "MUSIC");
    setIcon("muteIconWrap", "SPEAKER");
    setIcon("rulesHeaderIconWrap", "BOOK");
    setIcon("fullscreenIconWrap", "EXPAND");
    setIcon("exitIconWrap", "EXIT");
    setIcon("menuIconWrap", "MENU");
    setIcon("drawerHeaderIcon", "TOP_HAT");
    setIcon("closeDrawerIconWrap", "CLOSE");

    setIcon("rulesIconWrap", "BOOK");
    setIcon("geminiIconWrap", "BRAIN");
    setIcon("heatmapIconWrap", "FLAME");
    setIcon("speedIconWrap", "LIGHTNING");
    setIcon("settingsIconWrap", "GEAR");
    setIcon("newGameIconWrap", "REFRESH");
    setIcon("trophyIconWrap", "TROPHY");

    // Arena Buttons
    setIcon("btnRollDiceIcon", "DICE");
    setIcon("btnEndTurnIcon", "CHECK");
    setIcon("btnManageIcon", "HOUSE");
    setIcon("btnTradeIcon", "HANDSHAKE");

    // HUD Titles & Controls
    setIcon("tycoonsTitleIcon", "USER");
    setIcon("logTitleIcon", "ACTIVITY");
    setIcon("exportLogIcon", "DOWNLOAD");
    setIcon("jumpLatestIcon", "CHEVRON_DOWN");
    setIcon("modalCloseCrossIcon", "CLOSE");
  }
  bindDrawerEvents() {
    if (this.gameMenuBtn) {
      this.gameMenuBtn.onclick = () => this.openMenuDrawer();
    }
    if (this.closeDrawerBtn) {
      this.closeDrawerBtn.onclick = () => this.closeMenuDrawer();
    }
    if (this.menuDrawerBackdrop) {
      this.menuDrawerBackdrop.onclick = () => this.closeMenuDrawer();
    }
    if (this.modalOverlay) {
      this.modalOverlay.onclick = (e) => {
        if (e.target === this.modalOverlay && this.isInspectModal) {
          this.closeModal();
        }
      };
    }
    if (this.closeModalCrossBtn) {
      this.closeModalCrossBtn.onclick = () => this.closeModal();
    }
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.closeMenuDrawer();
        this.closeModal();
      }
    });
  }
  openMenuDrawer() {
    if (this.menuDrawer) this.menuDrawer.classList.add("open");
    if (this.menuDrawerBackdrop)
      this.menuDrawerBackdrop.classList.add("active");
  }
  closeMenuDrawer() {
    if (this.menuDrawer) this.menuDrawer.classList.remove("open");
    if (this.menuDrawerBackdrop)
      this.menuDrawerBackdrop.classList.remove("active");
  }
  updateMatchTimer(seconds) {
    if (!this.matchTimerText) return;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    const pad = (n) => String(n).padStart(2, "0");
    if (m >= 60) {
      const h = Math.floor(m / 60);
      const remM = m % 60;
      this.matchTimerText.innerText = `${pad(h)}:${pad(remM)}:${pad(s)}`;
    } else {
      this.matchTimerText.innerText = `${pad(m)}:${pad(s)}`;
    }
  }
  updateTurnTimer(remaining, total) {
    if (!this.turnTimerBadge) return;
    this.turnTimerBadge.style.display = "inline-flex";
    if (this.turnTimerCount) this.turnTimerCount.innerText = `${remaining}s`;

    const pct = Math.max(0, Math.min(100, (remaining / total) * 100));
    if (this.turnTimerBar) {
      this.turnTimerBar.classList.remove("ai-thinking");
      this.turnTimerBar.style.width = `${pct}%`;
      if (remaining <= 5) {
        this.turnTimerBar.classList.add("urgent");
      } else {
        this.turnTimerBar.classList.remove("urgent");
      }
    }

    if (remaining <= 5) {
      this.turnTimerBadge.classList.add("urgent");
    } else {
      this.turnTimerBadge.classList.remove("urgent");
    }
  }
  setTurnTimerAiThinking() {
    if (!this.turnTimerBadge) return;
    this.turnTimerBadge.style.display = "inline-flex";
    this.turnTimerBadge.classList.remove("urgent");
    if (this.turnTimerCount) this.turnTimerCount.innerText = "AI";
    if (this.turnTimerBar) {
      this.turnTimerBar.classList.remove("urgent");
      this.turnTimerBar.classList.add("ai-thinking");
      this.turnTimerBar.style.width = "100%";
    }
  }
  hideTurnTimer() {
    if (this.turnTimerBadge) this.turnTimerBadge.style.display = "none";
    if (this.turnTimerBar) this.turnTimerBar.style.width = "0%";
  }
  updateHUD() {
    const current = this.engine.getCurrentPlayer();
    if (current) {
      this.turnPlayerNameEl.innerText = current.name;
      this.turnPlayerTokenEl.innerHTML = getIcon(current.token || "TOP_HAT");
      this.turnPlayerTokenEl.style.borderColor = current.color;
      this.turnPlayerTokenEl.style.backgroundColor = `${current.color}25`;

      const isRolling = !!this.app?._isRollingAnimation;
      const isOnline = !!this.app?.multiplayer?.isOnline;
      const isLocalTurn =
        !isOnline || this.app.multiplayer.localPlayerId === current.id;

      if (this.engine.gameOver) {
        this.turnStatusEl.innerText = `Champion: ${this.engine.winner?.name || "Game Over"}`;
        this.rollBtn.disabled = true;
        this.endTurnBtn.disabled = true;
      } else if (!isLocalTurn) {
        const actionDesc = this.engine.currentTurn?.awaitingActionDesc;
        if (actionDesc?.type === "buy_prompt") {
          this.turnStatusEl.innerText = `${current.name} is deciding whether to buy ${actionDesc.tileName || "Property"} ($${actionDesc.tilePrice || ""})...`;
        } else {
          this.turnStatusEl.innerText = `Waiting for ${current.name}...`;
        }
        this.rollBtn.disabled = true;
        this.endTurnBtn.disabled = true;
      } else if (current.cash < 0) {
        this.turnStatusEl.innerHTML = `<span style="color: #ef4444; font-weight: 800;">IN DEBT: Must raise $${Math.abs(current.cash)} by selling houses or mortgaging!</span>`;
        this.rollBtn.disabled = true;
        this.endTurnBtn.disabled = true;
      } else if (current.inJail) {
        this.turnStatusEl.innerText = `In Jail (Bail: $${gameSettings.jailBailFee} or roll doubles)`;
        this.rollBtn.disabled =
          isRolling || this.engine.currentTurn.hasRolled || current.isAi;
        this.endTurnBtn.disabled =
          isRolling || !this.engine.currentTurn.hasRolled || current.isAi;
      } else if (this.engine.currentTurn.canRollAgain) {
        this.turnStatusEl.innerText = current.isAi
          ? `${current.name} rolled DOUBLES! Rolling again...`
          : "Rolled DOUBLES! Roll dice again.";
        this.rollBtn.disabled = isRolling || current.isAi;
        this.endTurnBtn.disabled = true;
      } else if (this.engine.currentTurn.hasRolled) {
        this.turnStatusEl.innerText = current.isAi
          ? "AI completing turn..."
          : "Turn completed. Click End Turn.";
        this.rollBtn.disabled = true;
        this.endTurnBtn.disabled = isRolling || current.isAi;
      } else {
        this.turnStatusEl.innerText = current.isAi
          ? "AI thinking..."
          : "Roll dice to move.";
        this.rollBtn.disabled = isRolling || current.isAi;
        this.endTurnBtn.disabled = true;
      }

      const rollBtnText = document.getElementById("rollDiceBtnText");
      if (rollBtnText) {
        rollBtnText.innerText = this.engine.currentTurn.canRollAgain
          ? "Roll Again (Doubles!)"
          : "Roll Dice";
      }

      const rollIcon = document.getElementById("btnRollDiceIcon");
      if (
        rollIcon &&
        (!rollIcon.innerHTML || rollIcon.innerText === "Roll Dice")
      ) {
        rollIcon.innerHTML = getIcon("DICE");
      }
    }

    // Players List
    this.playersListEl.innerHTML = "";
    this.engine.players.forEach((p, idx) => {
      const card = document.createElement("div");
      card.className = `player-hud-card ${idx === this.engine.currentTurn.playerIndex ? "active-turn" : ""} ${p.bankrupt ? "bankrupt" : ""}`;
      card.style.borderLeftColor = p.color;

      const props = this.engine.getPlayerProperties(p.id);
      const nw = this.engine.getPlayerNetWorth(p.id);

      card.innerHTML = `
        <div class="player-row-top">
          <div class="player-info-meta">
            <div class="player-chip-icon" style="background-color: ${p.color};">
              ${getIcon(p.token || "TOP_HAT")}
            </div>
            <span>${p.name}</span>
            <span title="${p.isAi ? "AI Player" : "Human Player"}">
              ${p.isAi ? getIcon("BOT", "badge-ai") : getIcon("USER", "badge-human")}
            </span>
            ${p.inJail ? '<span style="font-size: 0.72rem; background: #ea580c; color: #fff; padding: 2px 7px; border-radius: 4px; font-weight: bold;">JAIL</span>' : ""}
          </div>
          <div class="player-cash-badge" style="${p.bankrupt ? "color: #94a3b8; border-color: rgba(255,255,255,0.1); background: rgba(255,255,255,0.05);" : p.cash < 0 ? "color: #ef4444; border-color: #ef4444; background: rgba(239,68,68,0.18);" : ""}">
            <span class="icon-wrap" style="width: 1.1rem; height: 1.1rem; color: ${p.bankrupt ? "#94a3b8" : p.cash < 0 ? "#ef4444" : "#34d399"};">${getIcon("COIN")}</span>
            <span>$${Math.max(0, p.cash).toLocaleString()}</span>
          </div>
        </div>

        <div class="player-stats-subrow">
          <span title="${escapeHtml(nw.breakdownText)}" style="cursor: help;">Net Worth: <strong>$${nw.total.toLocaleString()}</strong></span>
          <span>Properties: <strong>${props.length}</strong></span>
          ${p.getOutOfJailCards > 0 ? `<span style="display: inline-flex; align-items: center; gap: 4px; color: var(--gold);">${getIcon("TICKET", "icon-sm")} VIP Ticket: ${p.getOutOfJailCards}</span>` : ""}
        </div>

        <div class="property-pills">
          ${props
            .map((prop) => {
              const grp = COLOR_GROUPS[prop.group];
              const state = this.engine.board[prop.id];
              return `<div class="prop-pill ${state?.mortgaged ? "mortgaged" : ""}" style="background-color: ${grp?.hex || "#666"};" title="${prop.name} (Click to inspect)" data-prop-id="${prop.id}"></div>`;
            })
            .join("")}
        </div>
      `;

      // Allow clicking property pills to view their deeds
      card.querySelectorAll(".prop-pill").forEach((pill) => {
        pill.onclick = (e) => {
          e.stopPropagation();
          const pId = parseInt(pill.getAttribute("data-prop-id"), 10);
          this.showDeedModal(pId);
        };
      });

      this.playersListEl.appendChild(card);
    });

    // Activity Feed
    this.renderActivityFeed();

    // Online Room Badge
    const roomBadge = document.getElementById("onlineRoomBadge");
    const roomText = document.getElementById("onlineRoomText");
    if (roomBadge && roomText) {
      if (this.app?.multiplayer?.isOnline && this.app.multiplayer.roomCode) {
        roomBadge.style.display = "inline-flex";
        if (this.app.multiplayer.isReconnecting) {
          roomBadge.classList.add("reconnecting");
          roomText.innerText = "RECONNECTING...";
        } else {
          roomBadge.classList.remove("reconnecting");
          roomText.innerText = `ROOM: ${this.app.multiplayer.roomCode}`;
        }
      } else {
        roomBadge.style.display = "none";
      }
    }
  }
}
