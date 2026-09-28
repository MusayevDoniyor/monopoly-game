import { UIComponent } from "./uiComponent.js";
import { BOARD_TILES, COLOR_GROUPS, gameSettings } from "../boardData.js?v=8.1";
import { sounds } from "../audio.js?v=8.1";
import { getIcon, TOKEN_KEYS, TOKEN_LABELS } from "../icons.js?v=8.1";
import { achievements, ACHIEVEMENTS_LIST } from "../achievements.js?v=8.1";
import { particles } from "../particles.js?v=8.1";
import { geminiAdvisor } from "../geminiAdvisor.js?v=8.1";
import { CLASSIC_RAILROAD_ARTWORK } from "./railroadArtwork.js";
import { escapeHtml, formatMoney, formatTime } from "../utils.js";
import { initCustomSelects } from "./customSelect.js";

export class ModalManager extends UIComponent {
  startModalTimer(seconds, onTimeout, statusText = "Auto in") {
    this.clearModalTimer();
    if (!seconds || seconds <= 0) return;

    let remaining = seconds;
    const badgeId = "modalTimerBadge";

    const updateBadge = () => {
      let badge = document.getElementById(badgeId);
      if (!badge && this.modalTitle) {
        badge = document.createElement("span");
        badge.id = badgeId;
        badge.className = "modal-timer-badge";
        this.modalTitle.appendChild(badge);
      }
      if (badge) {
        badge.innerHTML = `<span class="icon-wrap" style="width: 12px; height: 12px;">${getIcon("HOURGLASS")}</span> <span>${statusText} ${remaining}s</span>`;
        if (remaining <= 5) {
          badge.classList.add("urgent");
        } else {
          badge.classList.remove("urgent");
        }
      }
    };

    updateBadge();

    this._modalTimerInterval = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        this.clearModalTimer();
        if (onTimeout) onTimeout();
      } else {
        updateBadge();
      }
    }, 1000);
  }
  clearModalTimer() {
    if (this._modalTimerInterval) {
      clearInterval(this._modalTimerInterval);
      this._modalTimerInterval = null;
    }
    const badge = document.getElementById("modalTimerBadge");
    if (badge) badge.remove();
  }
  showStartingPlayerSelector(players, winnerIndex, onComplete) {
    this.clearModalTimer();
    this.isStartingSelector = true;
    if (this.closeModalCrossBtn) this.closeModalCrossBtn.style.display = "none";
    this.modalTitle.innerHTML = `<span class="icon-wrap gold-icon">${getIcon("DICE")}</span> <span>Choosing Starting Player</span>`;

    const count = players.length;
    const segmentAngle = 360 / count;
    const safePlayerColor = (color, fallback = "#64748b") =>
      /^#[0-9a-f]{6}$/i.test(color || "") ? color : fallback;
    const wheelStops = players
      .map((player, index) => {
        const start = (index * segmentAngle).toFixed(2);
        const end = ((index + 1) * segmentAngle).toFixed(2);
        const color = safePlayerColor(player.color);
        return `${color} ${start}deg ${end}deg`;
      })
      .join(", ");

    const tokenMarkup = players
      .map((player, index) => {
        const angle = segmentAngle * index - 90;
        const radius = count === 2 ? 34 : count >= 5 ? 36 : 38;
        const x = 50 + Math.cos((angle * Math.PI) / 180) * radius;
        const y = 50 + Math.sin((angle * Math.PI) / 180) * radius;
        const playerColor = safePlayerColor(player.color);
        return `
        <div class="start-selector-token" data-player-index="${index}" style="left: ${x}%; top: ${y}%; --player-color: ${playerColor}; transform: translate(-50%, -50%) rotate(0deg);">
          <div class="start-selector-token-icon">${getIcon(player.token || "TOP_HAT")}</div>
          <span>${escapeHtml(player.name)}</span>
        </div>
      `;
      })
      .join("");

    const startGradientAngle = (-90 - segmentAngle / 2).toFixed(2);

    this.modalBody.innerHTML = `
      <div class="starting-player-selector">
        <div class="selector-subtitle">The wheel will choose who rolls first.</div>
        <div class="selector-arena selector-count-${count}">
          <div class="selector-wheel" id="selectorWheel" style="--segment-angle: ${segmentAngle.toFixed(2)}deg; --wheel-gradient: conic-gradient(from ${startGradientAngle}deg, ${wheelStops});">
            <div class="selector-wheel-grid"></div>
            <div class="selector-orbit selector-orbit-outer"></div>
            <div class="selector-orbit selector-orbit-inner"></div>
            ${tokenMarkup}
          </div>
          <div class="selector-pointer" aria-hidden="true"><span></span></div>
          <div class="selector-drum"><span>ROLL<br>FIRST</span></div>
        </div>
        <div class="selector-status" id="startingSelectorStatus">Spinning the starting wheel...</div>
      </div>
    `;
    this.modalFooter.innerHTML = `<button class="btn-primary" id="startingSelectorButton" disabled>SPINNING...</button>`;
    this.modalOverlay.classList.add("active");

    const arena = this.modalBody.querySelector(".selector-arena");
    const wheel = this.modalBody.querySelector("#selectorWheel");
    const tokens = this.modalBody.querySelectorAll(".start-selector-token");
    const status = document.getElementById("startingSelectorStatus");
    const winnerToken = this.modalBody.querySelector(
      `[data-player-index="${winnerIndex}"]`,
    );
    const totalRotation = 360 * 5 - segmentAngle * winnerIndex;

    requestAnimationFrame(() => {
      if (arena) arena.classList.add("is-spinning");
      if (wheel) wheel.style.transform = `rotate(${totalRotation}deg)`;
      tokens.forEach((token) => {
        token.style.setProperty("--token-rot", `${-totalRotation}deg`);
        token.style.transform = `translate(-50%, -50%) rotate(${-totalRotation}deg)`;
      });
    });

    window.setTimeout(() => {
      arena?.classList.remove("is-spinning");
      if (winnerToken) {
        winnerToken.classList.add("winner");
        winnerToken.style.transition =
          "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s";
        winnerToken.style.transform = `translate(-50%, -50%) rotate(${-totalRotation}deg) scale(1.22)`;
      }
      tokens.forEach((tok) => {
        if (tok !== winnerToken) {
          tok.style.opacity = "0.55";
        }
      });
      if (status)
        status.innerHTML = `<strong style="color: var(--gold);">${escapeHtml(players[winnerIndex].name)}</strong> will roll first!`;
      const button = document.getElementById("startingSelectorButton");
      if (button) {
        button.disabled = false;
        button.innerText = "START MATCH";
        button.onclick = () => {
          this.closeModal();
          if (onComplete) onComplete();
        };
      }
    }, 2400);
  }
  showArrestModal(player, onDismiss) {
    this.modalTitle.innerHTML = `<span class="icon-wrap gold-icon">${getIcon("JAIL")}</span> <span>ARRESTED & JAILED!</span>`;
    const bail = gameSettings.jailBailFee || 150;

    this.modalBody.innerHTML = `
      <div style="text-align: center; display: flex; flex-direction: column; align-items: center; gap: 14px;">
        <div style="width: 56px; height: 56px; color: #ef4444;">${getIcon("JAIL")}</div>
        <div style="font-size: 1.25rem; font-weight: 900; color: #f87171;">${player.name} has been sent to JAIL!</div>
        
        <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: 10px; padding: 14px 18px; font-size: 0.88rem; line-height: 1.6; text-align: left; width: 100%; box-sizing: border-box;">
          <div>🔒 You are locked in the cell for this turn.</div>
          <div style="margin-top: 6px;"><strong>On your next turn</strong>, you can:</div>
          <ul style="margin: 4px 0 0 16px; padding: 0;">
            <li><strong>Pay $${bail} Bail:</strong> Instant release and roll dice to move.</li>
            <li><strong>Roll for Doubles:</strong> Free escape if you roll matching dice!</li>
            <li><strong>Use VIP Golden Ticket:</strong> If you hold a 'Get Out of Jail' card.</li>
          </ul>
        </div>
      </div>
    `;

    this.modalFooter.innerHTML = `<button class="btn-primary" id="confirmArrestBtn">Understood</button>`;
    document.getElementById("confirmArrestBtn").onclick = () => {
      this.closeModal();
      if (onDismiss) onDismiss();
    };
    this.modalOverlay.classList.add("active");
  }
  showJailOptionsModal(player, onPayBail, onUseCard, onRoll) {
    this.modalTitle.innerHTML = `<span class="icon-wrap gold-icon">${getIcon("JAIL")}</span> <span>In Jail: ${player.name}</span>`;
    const bail = gameSettings.jailBailFee || 150;

    this.modalBody.innerHTML = `
      <div style="text-align: center; display: flex; flex-direction: column; gap: 14px;">
        <div style="width: 50px; height: 50px; margin: 0 auto; color: #ea580c;">${getIcon("JAIL")}</div>
        <div style="font-size: 1.15rem; color: #f8fafc; font-weight: 800;">It's your turn in Jail!</div>
        <div style="font-size: 0.88rem; color: #94a3b8;">Choose how you want to proceed:</div>
        
        <div style="background: rgba(255,255,255,0.05); padding: 14px; border-radius: 10px; text-align: left; font-size: 0.86rem; line-height: 1.6; display: flex; flex-direction: column; gap: 8px;">
          <div><strong>1. Pay $${bail} Bail:</strong> Leave immediately and roll dice to move.</div>
          <div><strong>2. Use VIP Golden Ticket:</strong> Instant free release and roll dice (You have: ${player.getOutOfJailCards}).</div>
          <div><strong>3. Roll for Doubles:</strong> Free escape if both dice match! (Attempt ${player.jailTurns + 1}/3)</div>
        </div>
      </div>
    `;

    this.modalFooter.innerHTML = `
      <button class="btn-primary" id="btnPayBail" ${player.cash < bail ? "disabled" : ""}>Pay $${bail} Bail & Roll</button>
      <button class="btn-secondary" id="btnUseTicket" ${player.getOutOfJailCards <= 0 ? "disabled" : ""}>Use Ticket & Roll</button>
      <button class="btn-secondary" id="btnRollDoubles">Roll for Doubles</button>
    `;

    document.getElementById("btnPayBail").onclick = () => {
      this.closeModal();
      onPayBail();
    };
    document.getElementById("btnUseTicket").onclick = () => {
      this.closeModal();
      onUseCard();
    };
    document.getElementById("btnRollDoubles").onclick = () => {
      this.closeModal();
      onRoll();
    };

    const timerSec = gameSettings.approvalTimerSeconds || 15;
    this.startModalTimer(
      timerSec,
      () => {
        this.engine.log(
          `⏱️ [TIME'S UP] ${player.name} did not choose jail action in time. Auto-rolling for doubles...`,
          "warning",
        );
        this.closeModal();
        onRoll();
      },
      "Auto-roll in",
    );

    this.modalOverlay.classList.add("active");
  }
  renderTitleDeedCardHTML(tileId, options = {}) {
    const { includeCloseBtn = false, showOwnerBadge = true } = options;
    const tile = BOARD_TILES[tileId];
    if (!tile) return "";
    const state = this.engine.board[tileId];
    const owner =
      state && state.owner !== null ? this.engine.players[state.owner] : null;
    const group = COLOR_GROUPS[tile.group];

    const closeBtnHTML = includeCloseBtn
      ? `<button class="deed-card-close" id="deedCloseCrossBtn" title="Close">✕</button>`
      : "";

    if (tile.type === "property") {
      const isLight =
        tile.group === "YELLOW" ||
        tile.group === "LIGHT_BLUE" ||
        tile.group === "ORANGE";
      const headerTextColor = isLight ? "#000000" : "#ffffff";

      return `
        <div class="deed-card-view">
          ${closeBtnHTML}
          <div class="deed-header" style="background-color: ${group?.hex || "#333"}; color: ${headerTextColor};">
            <div class="subtitle">TITLE DEED</div>
            <div class="title">${tile.name.toUpperCase()}</div>
          </div>
          
          <div class="deed-rent-headline">RENT $${tile.rent[0]}.</div>

          <table class="rent-table">
            <tr><td>With 1 House</td><td>$ ${tile.rent[1]}.</td></tr>
            <tr><td>With 2 Houses</td><td>$ ${tile.rent[2]}.</td></tr>
            <tr><td>With 3 Houses</td><td>$ ${tile.rent[3]}.</td></tr>
            <tr><td>With 4 Houses</td><td>$ ${tile.rent[4]}.</td></tr>
          </table>

          <div class="deed-hotel-row">With 1 HOTEL $${tile.rent[5]}.</div>
          ${
            gameSettings.allowDoubleHotels !== false
              ? `<div class="deed-hotel-row deed-hotel-row-secondary">With 2 HOTELS $${Math.round(tile.rent[5] * 1.5)}.</div>`
              : ""
          }

          <div class="deed-footer-stats">
            <div>Mortgage Value $${tile.mortgage}.</div>
            <div>Houses cost $${tile.houseCost}. each</div>
            <div>1st Hotel, $${tile.houseCost}. plus 4 houses</div>
            <div>2nd Hotel, $${tile.houseCost}. (direct cash)</div>
          </div>

          <div class="deed-rule-note">
            If a player owns ALL the Lots of any Color-Group, the rent is Doubled on Unimproved Lots in that group.
          </div>

          ${
            showOwnerBadge
              ? `
            <div class="deed-owner-badge" style="background: ${owner ? owner.color : "#f1f5f9"}; color: ${owner ? "#ffffff" : "#1e293b"}; border: 1px solid ${owner ? "transparent" : "#cbd5e1"};">
              ${owner ? `Owner: ${owner.name}` : `Price: $${tile.price} • Unowned`} ${state?.mortgaged ? " • MORTGAGED" : ""}
            </div>
          `
              : ""
          }
        </div>
      `;
    } else if (tile.type === "railroad") {
      const bRent = gameSettings.stationBaseRent || 50;
      const sRent = gameSettings.stationStepRent || 50;
      const isClassicBoard = this.engine.getBoardLength() === 40;
      const rentSchedule = isClassicBoard
        ? tile.rent || [25, 50, 100, 200]
        : [bRent, bRent + sRent, bRent + sRent * 2, bRent + sRent * 3];
      const stationLabel = isClassicBoard ? "Railroads" : "Stations";
      const railroadArtwork = CLASSIC_RAILROAD_ARTWORK[tile.name];
      return `
        <div class="deed-card-view${railroadArtwork ? " deed-railroad-card" : ""}">
          ${closeBtnHTML}
          ${
            railroadArtwork
              ? `<div class="deed-railroad-hero"><img src="${railroadArtwork.src}" alt="${railroadArtwork.alt}" width="1200" height="800" decoding="async"></div>`
              : `<div class="deed-silhouette-icon">${getIcon(tile.iconKey || "TRAIN")}</div>`
          }
          <div class="deed-railroad-body">
            <div class="deed-railroad-title">${tile.name.toUpperCase()}</div>

            <table class="rent-table">
              <tr><td>Rent</td><td>$ ${rentSchedule[0]}.</td></tr>
              <tr><td>If 2 ${stationLabel} are owned</td><td>$ ${rentSchedule[1]}.</td></tr>
              <tr><td>If 3 ${stationLabel} are owned</td><td>$ ${rentSchedule[2]}.</td></tr>
              <tr><td>If 4 ${stationLabel} are owned</td><td>$ ${rentSchedule[3]}.</td></tr>
            </table>

            <div class="deed-footer-stats" style="margin-top: 14px;">
              <div>Mortgage Value $${tile.mortgage}.</div>
            </div>

            ${
              showOwnerBadge
                ? `
              <div class="deed-owner-badge" style="background: ${owner ? owner.color : "#f1f5f9"}; color: ${owner ? "#ffffff" : "#1e293b"}; border: 1px solid ${owner ? "transparent" : "#cbd5e1"};">
                ${owner ? `Owner: ${owner.name}` : `Price: $${tile.price} • Unowned`} ${state?.mortgaged ? " • MORTGAGED" : ""}
              </div>
            `
                : ""
            }
          </div>
        </div>
      `;
    } else {
      return `
        <div class="deed-card-view">
          ${closeBtnHTML}
          <div class="deed-silhouette-icon">${getIcon(tile.iconKey || "SOLAR")}</div>
          <div class="deed-railroad-title">${tile.name.toUpperCase()}</div>

          <div class="deed-utility-copy">
            If one "Utility" is owned rent is <strong>4 times</strong> amount shown on dice.<br><br>
            If both "Utilities" are owned rent is <strong>10 times</strong> amount shown on dice.
          </div>

          <div class="deed-footer-stats" style="margin-top: 14px;">
            <div>Mortgage Value $${tile.mortgage}.</div>
          </div>

          ${
            showOwnerBadge
              ? `
            <div class="deed-owner-badge" style="background: ${owner ? owner.color : "#f1f5f9"}; color: ${owner ? "#ffffff" : "#1e293b"}; border: 1px solid ${owner ? "transparent" : "#cbd5e1"};">
              ${owner ? `Owner: ${owner.name}` : `Price: $${tile.price} • Unowned`} ${state?.mortgaged ? " • MORTGAGED" : ""}
            </div>
          `
              : ""
          }
        </div>
      `;
    }
  }
  getLocalPlayer() {
    if (
      this.app?.multiplayer?.isOnline &&
      this.app.multiplayer.localPlayerId !== null &&
      this.app.multiplayer.localPlayerId !== undefined
    ) {
      return (
        this.engine.players[this.app.multiplayer.localPlayerId] ||
        this.engine.getCurrentPlayer()
      );
    }
    const current = this.engine.getCurrentPlayer();
    if (current && !current.isAi) {
      return current;
    }
    const human = this.engine.players.find((p) => !p.isAi && !p.bankrupt);
    if (human) return human;
    return current || this.engine.players[0];
  }
  showDeedModal(tileId) {
    const tile = BOARD_TILES[tileId];
    if (!tile) return;

    sounds.playCard();

    if (this.modalCard) this.modalCard.classList.add("naked-modal");
    this.modalTitle.innerHTML = "";
    this.modalFooter.innerHTML = "";

    const state = this.engine.board[tileId];
    const owner =
      state && state.owner !== null && state.owner !== undefined
        ? this.engine.players[state.owner]
        : null;
    const viewerPlayer = this.getLocalPlayer();

    let floatingActionsHTML = "";

    if (!owner) {
      // Unowned: purely inspecting. No action buttons, pure authentic card!
      floatingActionsHTML = "";
    } else if (viewerPlayer && owner.id === viewerPlayer.id) {
      // Owned by viewer (You): ALWAYS show "You own this property" & "Manage Property".
      // NEVER show "Propose Trade" against yourself!
      const unmortgageCost = state?.mortgaged
        ? Math.round(tile.mortgage * 1.1)
        : 0;
      const canUnmortgage =
        state?.mortgaged && this.engine.canUnmortgage(viewerPlayer.id, tile.id);
      floatingActionsHTML = `
        <div class="deed-floating-bar">
          <div class="deed-owner-pill" style="border-color: var(--gold); background: rgba(212, 175, 55, 0.12);">
            <span class="icon-wrap gold-icon" style="width: 16px; height: 16px;">${getIcon("STAR")}</span>
            <span style="color: var(--gold-light);">You own this property</span>
            ${state?.mortgaged ? '<span style="color: #ef4444; font-size: 0.75rem; margin-left: 4px;">(MORTGAGED)</span>' : ""}
          </div>
          <div class="deed-actions-row">
            ${
              state?.mortgaged
                ? `
              <button class="btn-unmortgage-card" id="deedUnmortgageActionBtn" ${!canUnmortgage || this.engine.gameOver ? "disabled" : ""}>
                <span class="icon-wrap" style="width: 16px; height: 16px;">${getIcon("CHECK")}</span>
                <span>Unmortgage ($${unmortgageCost})</span>
              </button>
            `
                : ""
            }
            <button class="btn-manage-card" id="deedManageActionBtn">
              <span class="icon-wrap" style="width: 16px; height: 16px;">${getIcon("HOUSE")}</span>
              <span>Manage Property</span>
            </button>
          </div>
        </div>
      `;
    } else {
      // Owned by another player: Show Owner pill & Propose Trade button!
      floatingActionsHTML = `
        <div class="deed-floating-bar">
          <div class="deed-owner-pill" style="border-color: ${owner.color}66;">
            <span class="owner-token-badge" style="background: ${owner.color}; color: #ffffff;">
              ${getIcon(owner.token || "USER", "icon-emoji")}
            </span>
            <span>Owned by <strong>${owner.name}</strong></span>
            ${state?.mortgaged ? '<span style="color: #ef4444; font-size: 0.75rem; margin-left: 4px;">(MORTGAGED)</span>' : ""}
          </div>
          <div class="deed-actions-row">
            <button class="btn-trade" id="deedTradeActionBtn" ${this.engine.gameOver || viewerPlayer?.bankrupt ? "disabled" : ""}>
              <span class="icon-wrap" style="width: 16px; height: 16px;">${getIcon("HANDSHAKE")}</span>
              <span>Propose Trade</span>
            </button>
          </div>
        </div>
      `;
    }

    this.modalBody.innerHTML = `
      <div class="deed-container">
        ${this.renderTitleDeedCardHTML(tileId, { includeCloseBtn: true, showOwnerBadge: !floatingActionsHTML })}
        ${floatingActionsHTML}
      </div>
    `;

    const closeBtn = document.getElementById("deedCloseCrossBtn");
    if (closeBtn) closeBtn.onclick = () => this.closeModal();

    const tradeBtn = document.getElementById("deedTradeActionBtn");
    if (tradeBtn) {
      tradeBtn.onclick = () => {
        this.closeModal();
        if (viewerPlayer && owner && viewerPlayer.id !== owner.id) {
          const cb =
            this.onTradeProposalCallback || this.ui?.onTradeProposalCallback;
          this.showTradeModal(viewerPlayer, cb, owner.id, tile.id);
        }
      };
    }

    const manageBtn = document.getElementById("deedManageActionBtn");
    if (manageBtn) {
      manageBtn.onclick = () => {
        this.closeModal();
        this.showPropertyManagementModal(viewerPlayer || owner);
      };
    }

    const unmortgageBtn = document.getElementById("deedUnmortgageActionBtn");
    if (unmortgageBtn) {
      unmortgageBtn.onclick = () => {
        if (
          !viewerPlayer ||
          !this.engine.unmortgageProperty(viewerPlayer.id, tileId)
        )
          return;
        this.updateBoardState();
        this.updateHUD();
        if (this.app?.syncGameState) this.app.syncGameState();
        this.showDeedModal(tileId);
      };
    }

    this.isInspectModal = true;
    this.modalOverlay.classList.add("active");
  }
  showBuyPrompt(tile, player, onBuy, onPass) {
    if (this.modalCard) this.modalCard.classList.add("naked-modal");
    this.modalTitle.innerHTML = "";
    this.modalFooter.innerHTML = "";
    this.isInspectModal = false;

    const canAfford = player.cash >= tile.price;
    const remainingCash = player.cash - tile.price;

    this.modalBody.innerHTML = `
      <div class="deed-container">
        ${this.renderTitleDeedCardHTML(tile.id, { includeCloseBtn: true, showOwnerBadge: false })}

        <div class="deed-floating-bar">
          <div class="deed-buy-info">
            <div class="deed-buy-row">
              <span class="buy-label">Your Cash:</span>
              <span class="buy-val">$${player.cash}</span>
            </div>
            <div class="deed-buy-row">
              <span class="buy-label">Property Price:</span>
              <span class="buy-val price">$${tile.price}</span>
            </div>
            <div class="deed-buy-row total-row">
              <span class="buy-label">Remaining:</span>
              <span class="buy-val" style="color: ${canAfford ? "#38bdf8" : "#ef4444"}; font-weight: 900;">$${remainingCash}</span>
            </div>
          </div>

          <div class="deed-actions-row">
            <button class="btn-buy" id="confirmBuyBtn" ${!canAfford ? "disabled" : ""}>
              <span class="icon-wrap" style="width: 16px; height: 16px;">${getIcon("CHECK")}</span>
              <span>Buy Property ($${tile.price})</span>
            </button>
            <button class="btn-pass" id="passBuyBtn">
              <span class="icon-wrap" style="width: 16px; height: 16px;">${getIcon("CLOSE")}</span>
              <span>Pass</span>
            </button>
          </div>
        </div>
      </div>
    `;

    let purchaseDecisionMade = false;
    document.getElementById("confirmBuyBtn").onclick = async (event) => {
      const button = event.currentTarget;
      if (purchaseDecisionMade || button.disabled) return;
      purchaseDecisionMade = true;
      this.clearModalTimer();
      button.disabled = true;
      button.classList.add("is-confirming");
      button.querySelector("span:last-child").textContent =
        "Adding to portfolio…";
      await new Promise((resolve) => setTimeout(resolve, 420));
      this.closeModal();
      onBuy();
    };
    document.getElementById("passBuyBtn").onclick = () => {
      if (purchaseDecisionMade) return;
      purchaseDecisionMade = true;
      this.closeModal();
      onPass();
    };

    const crossBtn = document.getElementById("deedCloseCrossBtn");
    if (crossBtn) {
      crossBtn.onclick = () => {
        if (purchaseDecisionMade) return;
        purchaseDecisionMade = true;
        this.closeModal();
        onPass();
      };
    }

    const timerSec = gameSettings.approvalTimerSeconds || 15;
    this.startModalTimer(
      timerSec,
      () => {
        if (purchaseDecisionMade) return;
        purchaseDecisionMade = true;
        this.engine.log(
          `⏱️ [TIME'S UP] ${player.name} did not decide on ${tile.name} in time (Passed).`,
          "warning",
        );
        this.closeModal();
        onPass();
      },
      "Auto-pass in",
    );

    this.modalOverlay.classList.add("active");
  }
  showCardModal(cardType, card, onContinue) {
    sounds.playCard();
    if (this.modalCard) this.modalCard.classList.add("naked-modal");

    const isChance = cardType === "chance";
    const iconKey = isChance ? "CHANCE" : "CHEST";
    const cat = (card.category || "EVENT").toLowerCase();
    const impactPositive = !card.badge || !card.badge.includes("-");
    const cardArt = (() => {
      switch (card.action?.type) {
        case "CASH":
          return impactPositive
            ? { icon: "COIN", label: "BANK REWARD" }
            : { icon: "TAX", label: "EXPENSE" };
        case "MOVE_TO":
          return card.action.target === 0
            ? { icon: "START_ARROW", label: "BACK TO START" }
            : { icon: "PLANE", label: "ADVANCE" };
        case "MOVE_RELATIVE":
          return { icon: "LIGHTNING", label: "MOVE" };
        case "MOVE_NEAREST_RAILROAD":
          return { icon: "TRAIN", label: "TRANSIT" };
        case "GO_TO_JAIL":
          return { icon: "JAIL", label: "DETENTION" };
        case "GET_OUT_OF_JAIL":
          return { icon: "KEY", label: "GET OUT" };
        case "PAY_PLAYERS":
          return { icon: "HANDSHAKE", label: "PAY THE TABLE" };
        case "COLLECT_FROM_PLAYERS":
          return { icon: "TROPHY", label: "COLLECT" };
        case "REPAIRS":
          return { icon: "HOUSE", label: "PROPERTY REPAIRS" };
        default:
          return { icon: iconKey, label: isChance ? "CHANCE" : "COMMUNITY" };
      }
    })();

    this.modalTitle.innerHTML = `<span class="icon-wrap gold-icon">${getIcon(iconKey)}</span> <span>${isChance ? "CHANCE" : "COMMUNITY CHEST"}</span>`;

    this.modalBody.innerHTML = `
      <div class="luxury-card-scene">
        <div class="luxury-card ${isChance ? "card-chance" : "card-chest"}">
          <button class="deed-card-close" id="cardCloseCrossBtn" title="Close">✕</button>
          <div class="card-inner-frame">
            <div class="card-top-row">
              <span class="card-deck-tag">${isChance ? "CHANCE" : "COMMUNITY CHEST"}</span>
              <span class="card-cat-pill ${cat}">${card.category || "EVENT"}</span>
            </div>

            <div class="card-title-banner">
              <h3>${card.title || (isChance ? "CHANCE" : "COMMUNITY CHEST")}</h3>
            </div>

            <div class="card-art-container card-art-${cat}" aria-label="${cardArt.label}">
              <span class="card-art-orbit" aria-hidden="true"></span>
              <span class="card-art-mark">${getIcon(cardArt.icon)}</span>
              <span class="card-art-caption">${cardArt.label}</span>
            </div>

            <div class="card-desc-box">
              <p>${card.text}</p>
            </div>

            ${
              card.badge
                ? `
              <div class="card-impact-pill ${impactPositive ? "positive" : "negative"}">
                <span class="icon-wrap" style="width: 14px; height: 14px;">${getIcon(impactPositive ? "SPARKLE" : "WARNING")}</span>
                <span>${card.badge}</span>
              </div>
            `
                : ""
            }

            <button class="btn-luxury-card-continue" id="cardContinueBtn">
              <span>Continue</span>
              <span class="icon-wrap" style="width: 14px; height: 14px;">${getIcon("CHECK")}</span>
            </button>
          </div>
        </div>
      </div>
    `;

    let resolved = false;
    const handleContinue = () => {
      if (resolved) return;
      resolved = true;
      this._onCardModalClose = null;
      this.closeModal(true);
      if (onContinue) onContinue();
    };

    this._onCardModalClose = handleContinue;

    const crossBtn = document.getElementById("cardCloseCrossBtn");
    if (crossBtn) crossBtn.onclick = handleContinue;

    const continueBtn = document.getElementById("cardContinueBtn");
    if (continueBtn) continueBtn.onclick = handleContinue;

    this.startModalTimer(10, handleContinue, "Auto-continue in");

    this.isInspectModal = true;
    this.modalOverlay.classList.add("active");
  }
  showPropertyManagementModal(player, restoreScrollTop = 0) {
    if (this.modalCard) {
      this.modalCard.classList.remove("naked-modal", "setup-modal");
      this.modalCard.classList.add("property-management-modal");
    }
    this.modalTitle.innerHTML = `<span class="icon-wrap gold-icon">${getIcon("HOUSE")}</span> <span>Property Portfolio</span>`;
    const props = this.engine.getPlayerProperties(player.id);

    if (props.length === 0) {
      this.modalBody.innerHTML = `<div class="mgmt-empty-state"><span class="icon-wrap">${getIcon("HOUSE")}</span><strong>No properties yet</strong><span>Buy a property to start building your portfolio.</span></div>`;
      this.modalFooter.innerHTML = `<button class="btn-primary" id="closeManageBtn">Close</button>`;
      document.getElementById("closeManageBtn").onclick = () =>
        this.closeModal();
      this.modalOverlay.classList.add("active");
      return;
    }

    // Group properties by their color group or category
    const grouped = {};
    props.forEach((tile) => {
      const gKey = tile.group || "OTHER";
      if (!grouped[gKey]) grouped[gKey] = [];
      grouped[gKey].push(tile);
    });

    const monopolyCount = [
      ...new Set(
        props
          .filter((tile) => tile.type === "property")
          .map((tile) => tile.group),
      ),
    ].filter((groupKey) => this.engine.hasMonopoly(player.id, groupKey)).length;
    const developedCount = props.filter(
      (tile) => (this.engine.board[tile.id]?.houses || 0) > 0,
    ).length;
    const nw = this.engine.getPlayerNetWorth(player.id);
    let html = `
      <div class="property-management-content">
        <section class="mgmt-overview" aria-label="Portfolio overview">
          <div class="mgmt-stat"><span title="${escapeHtml(nw.breakdownText)}" style="cursor: help;">Total net worth</span><strong class="mgmt-cash" style="color: var(--gold);">$${nw.total.toLocaleString()}</strong></div>
          <div class="mgmt-stat"><span>Available cash</span><strong class="mgmt-cash">$${player.cash.toLocaleString()}</strong></div>
          <div class="mgmt-stat"><span>Properties</span><strong>${props.length}</strong></div>
          <div class="mgmt-stat"><span>Monopolies · developed</span><strong>${monopolyCount} · ${developedCount}</strong></div>
          <div class="mgmt-bank-stock"><span>Bank inventory</span><strong>${this.engine.bank.houses} houses</strong><strong>${this.engine.bank.hotels} hotels</strong></div>
        </section>
        <div id="mgmtNoticeBanner" class="mgmt-notice" role="status" aria-live="polite"></div>
        <nav class="mgmt-group-nav" aria-label="Jump to property group">
          ${Object.keys(grouped)
            .map((groupKey) => {
              const groupConfig = COLOR_GROUPS[groupKey];
              return `<button type="button" class="mgmt-group-chip" data-mgmt-target="mgmt-group-${groupKey}" style="--group-color:${groupConfig?.hex || "#64748b"}">${groupConfig?.name || groupKey}<span>${grouped[groupKey].length}</span></button>`;
            })
            .join("")}
        </nav>
        <div class="mgmt-groups">
    `;

    Object.keys(grouped).forEach((groupKey) => {
      const groupTiles = grouped[groupKey];
      const groupConfig = COLOR_GROUPS[groupKey];
      const isMonopoly = this.engine.hasMonopoly(player.id, groupKey);
      const allCategoryTiles = BOARD_TILES.filter((t) => t.group === groupKey);
      const isDevelopable = groupTiles[0].type === "property";

      html += `
        <section class="mgmt-group" id="mgmt-group-${groupKey}" style="--group-color:${groupConfig?.hex || "#64748b"}">
          <div class="mgmt-group-heading">
            <div class="mgmt-group-title">
              <span class="mgmt-color-swatch" aria-hidden="true"></span>
              <span>${groupConfig?.name || groupKey}</span>
              <span class="mgmt-group-count">${groupTiles.length} of ${allCategoryTiles.length}</span>
            </div>
            <div class="mgmt-group-status">
              ${
                isDevelopable
                  ? isMonopoly
                    ? '<span style="background: rgba(16,185,129,0.2); color: #34d399; border: 1px solid rgba(16,185,129,0.4); padding: 2px 8px; border-radius: 6px; font-size: 0.72rem; font-weight: 800;">⭐ FULL MONOPOLY (Building Allowed)</span>'
                    : `<span style="background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.3); padding: 2px 8px; border-radius: 6px; font-size: 0.72rem; font-weight: 700;">⚠️ Incomplete (${groupTiles.length}/${allCategoryTiles.length}) — Cannot Build</span>`
                  : '<span style="background: rgba(56,189,248,0.15); color: #38bdf8; border: 1px solid rgba(56,189,248,0.3); padding: 2px 8px; border-radius: 6px; font-size: 0.72rem; font-weight: 700;">Commercial Property</span>'
              }
            </div>
          </div>

          <div class="mgmt-property-list">
      `;

      groupTiles.forEach((tile) => {
        const state = this.engine.board[tile.id];
        const rent = this.engine.calculateRent(tile.id);
        const canSell = this.engine.canSellHouse(player.id, tile.id);
        const canMort = this.engine.canMortgage(player.id, tile.id);
        const canUnmort = this.engine.canUnmortgage(player.id, tile.id);

        let levelBadge = "";
        if (tile.type === "property") {
          if (state.houses === 0) {
            levelBadge =
              '<span style="color: #94a3b8; font-size: 0.78rem;">No Houses (0/4)</span>';
          } else if (state.houses >= 1 && state.houses <= 3) {
            levelBadge = `<span style="color: #38bdf8; font-size: 0.78rem; font-weight: 700;">🏠 ${state.houses}/4 Houses</span>`;
          } else if (state.houses === 4) {
            levelBadge =
              '<span style="color: #fbbf24; font-size: 0.78rem; font-weight: 800;">⭐ 4/4 Houses (Ready for Hotel!)</span>';
          } else if (state.houses === 5) {
            levelBadge =
              '<span style="color: #f87171; font-size: 0.78rem; font-weight: 800;">🏨 1 Hotel</span>';
          } else if (state.houses === 6) {
            levelBadge =
              '<span style="color: #f59e0b; font-size: 0.78rem; font-weight: 900;">👑 2 Hotels (MAX LEVEL)</span>';
          }
        } else {
          levelBadge =
            '<span style="color: #94a3b8; font-size: 0.78rem;">Commercial</span>';
        }

        if (state.mortgaged) {
          levelBadge +=
            ' • <span style="color: #ef4444; font-weight: 800; font-size: 0.78rem;">🔒 Mortgaged</span>';
        }

        html += `
          <article class="mgmt-property-row">
            <div class="mgmt-property-copy">
              <div class="mgmt-property-name">${tile.name}</div>
              <div class="mgmt-property-meta">
                ${levelBadge}
                <span style="color: #64748b; font-size: 0.76rem;">•</span>
                <span style="color: #34d399; font-size: 0.78rem; font-family: var(--font-mono); font-weight: 700;">Rent: $${rent}</span>
              </div>
            </div>

            <div class="mgmt-property-actions">
        `;

        if (tile.type === "property") {
          // 1. House Construction Button (if < 4 houses)
          if (state.houses < 4) {
            html += `
              <button class="btn-secondary" style="padding: 6px 10px; font-size: 0.78rem; font-weight: 700;" id="build-house-${tile.id}" ${!isMonopoly ? 'title="Monopoly Required"' : ""}>
                + House ($${tile.houseCost})
              </button>
            `;
          }

          // 2. Hotel Button:
          if (state.houses < 4) {
            html += `
              <button class="btn-secondary" style="padding: 6px 10px; font-size: 0.78rem; opacity: 0.85;" id="build-hotel-attempt-${tile.id}">
                🏨 Build Hotel
              </button>
            `;
          } else if (state.houses === 4) {
            html += `
              <button class="btn-primary" style="padding: 6px 10px; font-size: 0.78rem; font-weight: 800; background: linear-gradient(135deg, #ef4444, #b91c1c); border-color: #ef4444;" id="build-hotel1-${tile.id}">
                🏨 Upgrade to Hotel ($${tile.houseCost})
              </button>
            `;
          } else if (state.houses === 5) {
            html += `
              <button class="btn-primary" style="padding: 6px 10px; font-size: 0.78rem; font-weight: 800; background: linear-gradient(135deg, #f59e0b, #d97706); border-color: #fbbf24;" id="build-hotel2-${tile.id}">
                🏨 +2nd Hotel Cash ($${tile.houseCost})
              </button>
            `;
          } else if (state.houses === 6) {
            html += `
              <span style="font-size: 0.74rem; font-weight: 800; color: #fbbf24; padding: 4px 8px; background: rgba(251,191,36,0.15); border: 1px solid rgba(251,191,36,0.4); border-radius: 4px;">👑 MAX HOTEL</span>
            `;
          }

          // 3. Sell / Downgrade Button
          if (canSell) {
            const refund = Math.floor(tile.houseCost / 2);
            let sellText = `- House ($${refund})`;
            if (state.houses === 6) sellText = `- 2nd Hotel ($${refund})`;
            else if (state.houses === 5) sellText = `- Hotel ($${refund})`;

            html += `
              <button class="btn-secondary" style="padding: 6px 10px; font-size: 0.78rem; color: #f87171; border-color: rgba(239,68,68,0.4);" id="sell-${tile.id}">
                ${sellText}
              </button>
            `;
          }
        }

        // Mortgage / Unmortgage Button
        if (state.mortgaged) {
          html += `
            <button class="btn-primary" style="padding: 6px 10px; font-size: 0.78rem;" id="unmort-${tile.id}" ${canUnmort ? "" : "disabled"}>
              Unmortgage ($${Math.round(tile.mortgage * 1.1)})
            </button>
          `;
        } else {
          html += `
            <button class="btn-secondary" style="padding: 6px 10px; font-size: 0.78rem;" id="mort-${tile.id}" ${canMort ? "" : "disabled"}>
              Mortgage (+$${tile.mortgage})
            </button>
          `;
        }

        html += `
            </div>
          </article>
        `;
      });

      html += `
          </div>
        </section>
      `;
    });

    html += `</div></div>`;
    this.modalBody.innerHTML = html;
    this.modalFooter.innerHTML = `<span class="mgmt-footer-hint">Changes apply immediately and sync to the table.</span><button class="btn-primary" id="closeManageBtn">Done</button>`;
    requestAnimationFrame(() => {
      this.modalBody.scrollTop = restoreScrollTop;
    });

    this.modalBody.querySelectorAll("[data-mgmt-target]").forEach((button) => {
      button.onclick = () => {
        const target = document.getElementById(button.dataset.mgmtTarget);
        if (target)
          target.scrollIntoView({ behavior: "smooth", block: "start" });
      };
    });

    const showNotice = (msg, isError = true) => {
      const banner = document.getElementById("mgmtNoticeBanner");
      if (banner) {
        banner.style.display = "block";
        banner.style.background = isError
          ? "rgba(239, 68, 68, 0.2)"
          : "rgba(16, 185, 129, 0.2)";
        banner.style.border = isError
          ? "1px solid #ef4444"
          : "1px solid #10b981";
        banner.style.color = isError ? "#fca5a5" : "#6ee7b7";
        banner.innerHTML = msg;
        banner.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    };

    // Bind event handlers
    props.forEach((tile) => {
      // House building
      const hBtn = document.getElementById(`build-house-${tile.id}`);
      if (hBtn) {
        hBtn.onclick = () => {
          const status = this.engine.getBuildStatus(player.id, tile.id);
          if (!status.canBuild) {
            showNotice(`⚠️ Denied: ${status.reason}`, true);
            sounds.playBuzzer();
            return;
          }
          this.engine.buildHouse(player.id, tile.id);
          this.updateBoardState();
          this.updateHUD();
          if (this.app?.syncGameState) this.app.syncGameState();
          this.showPropertyManagementModal(player, this.modalBody.scrollTop);
        };
      }

      // Hotel attempt when < 4 houses
      const attemptBtn = document.getElementById(
        `build-hotel-attempt-${tile.id}`,
      );
      if (attemptBtn) {
        attemptBtn.onclick = () => {
          const state = this.engine.board[tile.id];
          sounds.playBuzzer();
          if (!this.engine.hasMonopoly(player.id, tile.group)) {
            showNotice(
              `⚠️ Denied: You must own all properties in the ${tile.group} group (Monopoly) to build a Hotel!`,
              true,
            );
          } else {
            showNotice(
              `⚠️ Denied: You must build 4 houses on this property before building a Hotel! (Currently: ${state.houses}/4 houses)`,
              true,
            );
          }
        };
      }

      // Upgrade to 1st Hotel
      const h1Btn = document.getElementById(`build-hotel1-${tile.id}`);
      if (h1Btn) {
        h1Btn.onclick = () => {
          const status = this.engine.getBuildStatus(player.id, tile.id);
          if (!status.canBuild) {
            showNotice(`⚠️ Denied: ${status.reason}`, true);
            sounds.playBuzzer();
            return;
          }
          this.engine.buildHouse(player.id, tile.id);
          this.updateBoardState();
          this.updateHUD();
          if (this.app?.syncGameState) this.app.syncGameState();
          this.showPropertyManagementModal(player, this.modalBody.scrollTop);
        };
      }

      // Buy 2nd Hotel directly with cash
      const h2Btn = document.getElementById(`build-hotel2-${tile.id}`);
      if (h2Btn) {
        h2Btn.onclick = () => {
          const status = this.engine.getBuildStatus(player.id, tile.id);
          if (!status.canBuild) {
            showNotice(`⚠️ Denied: ${status.reason}`, true);
            sounds.playBuzzer();
            return;
          }
          this.engine.buildHouse(player.id, tile.id);
          this.updateBoardState();
          this.updateHUD();
          if (this.app?.syncGameState) this.app.syncGameState();
          this.showPropertyManagementModal(player, this.modalBody.scrollTop);
        };
      }

      // Sell / Downgrade
      const sBtn = document.getElementById(`sell-${tile.id}`);
      if (sBtn) {
        sBtn.onclick = () => {
          this.engine.sellHouse(player.id, tile.id);
          this.updateBoardState();
          this.updateHUD();
          if (this.app?.syncGameState) this.app.syncGameState();
          this.showPropertyManagementModal(player, this.modalBody.scrollTop);
        };
      }

      // Mortgage
      const mBtn = document.getElementById(`mort-${tile.id}`);
      if (mBtn) {
        mBtn.onclick = () => {
          this.engine.mortgageProperty(player.id, tile.id);
          this.updateBoardState();
          this.updateHUD();
          if (this.app?.syncGameState) this.app.syncGameState();
          this.showPropertyManagementModal(player, this.modalBody.scrollTop);
        };
      }

      // Unmortgage
      const uBtn = document.getElementById(`unmort-${tile.id}`);
      if (uBtn) {
        uBtn.onclick = () => {
          this.engine.unmortgageProperty(player.id, tile.id);
          this.updateBoardState();
          this.updateHUD();
          if (this.app?.syncGameState) this.app.syncGameState();
          this.showPropertyManagementModal(player, this.modalBody.scrollTop);
        };
      }
    });

    document.getElementById("closeManageBtn").onclick = () => this.closeModal();
    this.modalOverlay.classList.add("active");
  }
  showGeminiAdvisorModal(player) {
    this.modalTitle.innerHTML = `<span class="icon-wrap gold-icon">${getIcon("BRAIN")}</span> <span>Gemini AI Tactical Advisor</span>`;
    this.modalBody.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 14px;">
        <div style="background: rgba(124, 58, 237, 0.15); border: 1px solid rgba(124, 58, 237, 0.4); padding: 16px; border-radius: 10px;">
          <div style="font-weight: 800; color: #a78bfa; margin-bottom: 8px;">Analyzing position for ${player.name} ($${player.cash})...</div>
          <div id="geminiOutput" style="line-height: 1.55; font-size: 0.95rem; color: #e2e8f0;">Thinking...</div>
        </div>
        
        <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 12px;">
          <label style="font-size: 0.8rem; color: #94a3b8; display: block; margin-bottom: 6px;">Optional: Enter Google Gemini API Key for live LLM reasoning (or leave blank to use built-in Grandmaster Heuristic AI):</label>
          <div style="display: flex; gap: 10px;">
            <input type="password" id="geminiApiKeyInput" class="input-text" style="flex: 1;" placeholder="AIzaSy..." value="${geminiAdvisor.getApiKey()}" />
            <button class="btn-secondary" id="saveApiKeyBtn">Save Key</button>
          </div>
        </div>
      </div>
    `;

    this.modalFooter.innerHTML = `<button class="btn-primary" id="closeGeminiBtn">Got It</button>`;

    document.getElementById("saveApiKeyBtn").onclick = () => {
      const key = document.getElementById("geminiApiKeyInput").value;
      geminiAdvisor.setApiKey(key);
      alert(
        key
          ? "Gemini API key saved!"
          : "API key cleared. Using offline Heuristic AI.",
      );
    };

    document.getElementById("closeGeminiBtn").onclick = () => this.closeModal();
    this.modalOverlay.classList.add("active");

    geminiAdvisor.getAdvice(this.engine, player).then((advice) => {
      const outEl = document.getElementById("geminiOutput");
      if (outEl) outEl.innerHTML = advice.replace(/\n/g, "<br>");
    });
  }
  showDebtResolutionModal(player, onResolved, onBankrupt) {
    this.isDebtModal = true;
    if (this.modalCard) this.modalCard.classList.remove("naked-modal");
    this.modalTitle.innerHTML = `<span class="icon-wrap" style="color: #ef4444;">${getIcon("WARNING")}</span> <span style="color: #f87171;">MANDATORY DEBT RESOLUTION</span>`;

    const renderDebtBody = () => {
      const deficit = Math.abs(Math.min(0, player.cash));
      const isCleared = player.cash >= 0;

      // 1. Properties with houses that can be sold
      const propsWithHouses = this.engine
        .getPlayerProperties(player.id)
        .filter((p) => this.engine.board[p.id]?.houses > 0);

      // 2. Properties that can be mortgaged
      const propsCanMortgage = this.engine
        .getPlayerProperties(player.id)
        .filter((p) => this.engine.canMortgage(player.id, p.id));

      const totalLiquidatable = this.engine.getLiquidatableAssets(player.id);
      const canEverClear = player.cash + totalLiquidatable >= 0;

      let html = `
        <div style="display: flex; flex-direction: column; gap: 14px; max-height: 480px; overflow-y: auto; padding-right: 4px;">
          
          <div style="background: ${isCleared ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)"}; border: 1.5px solid ${isCleared ? "#10b981" : "#ef4444"}; border-radius: 12px; padding: 14px 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
              <div>
                <div style="font-size: 0.78rem; text-transform: uppercase; font-weight: 800; color: ${isCleared ? "#34d399" : "#fca5a5"};">
                  ${isCleared ? "Debt Cleared" : "Insolvency Notice"}
                </div>
                <div style="font-size: 1.35rem; font-weight: 900; font-family: var(--font-mono); color: ${isCleared ? "#34d399" : "#ef4444"}; margin-top: 2px;">
                  ${isCleared ? `Current Balance: +$${player.cash}` : `Deficit Owed: -$${deficit}`}
                </div>
              </div>
              <div style="text-align: right; font-size: 0.8rem; color: #cbd5e1;">
                ${
                  isCleared
                    ? '<span style="color: #34d399; font-weight: 800;">✓ Ready to continue turn</span>'
                    : `Liquidatable Value: <strong style="color: var(--gold);">$${totalLiquidatable}</strong>`
                }
              </div>
            </div>
            <div style="font-size: 0.82rem; color: #cbd5e1; margin-top: 8px; line-height: 1.45;">
              ${
                isCleared
                  ? "Your balance is now non-negative. You have satisfied your obligations and may continue your turn."
                  : "Under Monopoly rules, you cannot remain in debt. Sell houses back to the bank for a 50% refund or mortgage unencumbered properties to raise the required cash."
              }
            </div>
          </div>

          <!-- Section 1: Sell Houses & Hotels -->
          <div>
            <div style="font-weight: 800; font-size: 0.88rem; color: #fff; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
              <span class="icon-wrap gold-icon" style="width: 16px; height: 16px;">${getIcon("HOUSE")}</span>
              <span>1. Sell Houses & Hotels to Bank (50% Refund)</span>
            </div>
            ${
              propsWithHouses.length === 0
                ? '<div style="background: rgba(255,255,255,0.03); border: 1px dashed rgba(255,255,255,0.1); border-radius: 8px; padding: 12px; font-size: 0.82rem; color: #94a3b8; text-align: center;">No houses or hotels currently built to sell.</div>'
                : `
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  ${propsWithHouses
                    .map((p) => {
                      const st = this.engine.board[p.id];
                      const canSell = this.engine.canSellHouse(player.id, p.id);
                      const refund = Math.floor(p.houseCost / 2);
                      const levelLabel =
                        st.houses === 6
                          ? "2nd Hotel"
                          : st.houses === 5
                            ? "1 Hotel"
                            : `${st.houses} Houses`;
                      return `
                      <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; gap: 10px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                          <div style="width: 8px; height: 28px; border-radius: 4px; background: ${COLOR_GROUPS[p.group]?.hex || "#fff"};"></div>
                          <div>
                            <div style="font-weight: 800; font-size: 0.88rem; color: #fff;">${p.name}</div>
                            <div style="font-size: 0.75rem; color: #94a3b8;">${levelLabel} • House Cost: $${p.houseCost}</div>
                          </div>
                        </div>
                        <button class="btn-sell-house-debt" data-tile-id="${p.id}" ${!canSell ? 'disabled title="Even building rule: sell highest house in group first"' : ""} style="background: #e11d48; color: #fff; border: none; font-weight: 800; font-size: 0.8rem; padding: 7px 12px; border-radius: 6px; cursor: ${canSell ? "pointer" : "not-allowed"}; opacity: ${canSell ? "1" : "0.5"};">
                          Sell 1 House (+ $${refund})
                        </button>
                      </div>
                    `;
                    })
                    .join("")}
                </div>
              `
            }
          </div>

          <!-- Section 2: Mortgage Properties -->
          <div>
            <div style="font-weight: 800; font-size: 0.88rem; color: #fff; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
              <span class="icon-wrap gold-icon" style="width: 16px; height: 16px;">${getIcon("STAR")}</span>
              <span>2. Mortgage Properties (Immediate Cash)</span>
            </div>
            ${
              propsCanMortgage.length === 0
                ? '<div style="background: rgba(255,255,255,0.03); border: 1px dashed rgba(255,255,255,0.1); border-radius: 8px; padding: 12px; font-size: 0.82rem; color: #94a3b8; text-align: center;">No eligible properties available to mortgage (must sell all houses in group first).</div>'
                : `
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  ${propsCanMortgage
                    .map(
                      (p) => `
                    <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; gap: 10px;">
                      <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 8px; height: 28px; border-radius: 4px; background: ${COLOR_GROUPS[p.group]?.hex || "#fff"};"></div>
                        <div>
                          <div style="font-weight: 800; font-size: 0.88rem; color: #fff;">${p.name}</div>
                          <div style="font-size: 0.75rem; color: #94a3b8;">Mortgage Value: $${p.mortgage}</div>
                        </div>
                      </div>
                      <button class="btn-mortgage-debt" data-tile-id="${p.id}" style="background: #d97706; color: #fff; border: none; font-weight: 800; font-size: 0.8rem; padding: 7px 12px; border-radius: 6px; cursor: pointer;">
                        Mortgage (+ $${p.mortgage})
                      </button>
                    </div>
                  `,
                    )
                    .join("")}
                </div>
              `
            }
          </div>

        </div>
      `;

      this.modalBody.innerHTML = html;

      // Bind liquidation buttons
      this.modalBody.querySelectorAll(".btn-sell-house-debt").forEach((btn) => {
        btn.onclick = () => {
          const tId = parseInt(btn.getAttribute("data-tile-id"), 10);
          this.engine.sellHouse(player.id, tId);
          this.updateBoardState();
          this.updateHUD();
          if (this.app?.syncGameState) this.app.syncGameState();
          renderDebtBody();
        };
      });

      this.modalBody.querySelectorAll(".btn-mortgage-debt").forEach((btn) => {
        btn.onclick = () => {
          const tId = parseInt(btn.getAttribute("data-tile-id"), 10);
          this.engine.mortgageProperty(player.id, tId);
          this.updateBoardState();
          this.updateHUD();
          if (this.app?.syncGameState) this.app.syncGameState();
          renderDebtBody();
        };
      });

      // Footer
      if (isCleared) {
        this.modalFooter.innerHTML = `
          <button class="btn-primary" id="confirmDebtClearedBtn" style="width: 100%; justify-content: center; background: #10b981; border-color: #059669;">
            <span class="icon-wrap" style="width: 16px; height: 16px;">${getIcon("CHECK")}</span>
            <span>Continue Turn (Debt Cleared)</span>
          </button>
        `;
        document.getElementById("confirmDebtClearedBtn").onclick = () => {
          this.isDebtModal = false;
          this.closeModal(true);
          if (onResolved) onResolved();
        };
      } else if (!canEverClear) {
        this.modalFooter.innerHTML = `
          <button class="btn-primary" id="declareBankruptDebtBtn" style="width: 100%; justify-content: center; background: #ef4444; border-color: #dc2626;">
            <span class="icon-wrap" style="width: 16px; height: 16px;">${getIcon("CLOSE")}</span>
            <span>Declare Bankruptcy (Assets Insufficient)</span>
          </button>
        `;
        document.getElementById("declareBankruptDebtBtn").onclick = () => {
          this.isDebtModal = false;
          this.closeModal(true);
          this.engine.declareBankruptcy(player);
          if (onBankrupt) onBankrupt();
        };
      } else {
        this.modalFooter.innerHTML = `
          <button class="btn-secondary" disabled style="width: 100%; justify-content: center; opacity: 0.6; cursor: not-allowed;">
            Must raise $${deficit} more by selling houses or mortgaging
          </button>
        `;
      }
    };

    renderDebtBody();
    this.modalOverlay.classList.add("active");
  }
  showTradeModal(
    currentPlayer,
    onTradeConfirmed,
    preselectedTargetPlayerId,
    preselectedPropId,
  ) {
    if (!currentPlayer) {
      currentPlayer = this.getLocalPlayer() || this.engine?.getCurrentPlayer();
    }
    if (!currentPlayer) return;

    this.modalTitle.innerHTML = `<span class="icon-wrap gold-icon">${getIcon("HANDSHAKE")}</span> <span>Tycoon Trade Exchange Desk</span>`;

    // Safety check: Cannot target yourself in trade
    if (preselectedTargetPlayerId === currentPlayer.id) {
      preselectedTargetPlayerId = null;
    }
    // Safety check: Cannot request a property that currentPlayer already owns
    if (preselectedPropId !== undefined && preselectedPropId !== null) {
      if (this.engine.board[preselectedPropId]?.owner === currentPlayer.id) {
        preselectedPropId = null;
      }
    }

    const otherPlayers = this.engine
      .getActivePlayers()
      .filter((p) => p.id !== currentPlayer.id);

    if (otherPlayers.length === 0) {
      this.showTradeResultModal(
        false,
        currentPlayer,
        "No other active tycoons available to trade with.",
      );
      return;
    }

    let targetPlayer = otherPlayers[0];
    if (
      preselectedTargetPlayerId !== undefined &&
      preselectedTargetPlayerId !== null
    ) {
      const found = otherPlayers.find(
        (p) => p.id === preselectedTargetPlayerId,
      );
      if (found) targetPlayer = found;
    }

    const offeredProps = new Set();
    const requestedProps = new Set();
    if (preselectedPropId !== undefined && preselectedPropId !== null) {
      requestedProps.add(preselectedPropId);
    }
    let offeredCash = 0;
    let requestedCash = 0;

    const wouldCompleteMonopoly = (playerId, prop) => {
      if (prop.type !== "property") return false;
      const groupTiles = BOARD_TILES.filter((t) => t.group === prop.group);
      const owned = groupTiles.filter(
        (t) => this.engine.board[t.id]?.owner === playerId,
      ).length;
      return owned === groupTiles.length - 1;
    };

    const renderTradeBody = () => {
      const myProps = this.engine.getPlayerProperties(currentPlayer.id);
      const theirProps = this.engine.getPlayerProperties(targetPlayer.id);

      const renderPropList = (props, selectedSet, isMine) => {
        if (props.length === 0) {
          return `<div style="color: #64748b; font-size: 0.82rem; text-align: center; padding: 24px 0;">No properties in portfolio</div>`;
        }

        return props
          .map((p) => {
            const isSelected = selectedSet.has(p.id);
            const group = COLOR_GROUPS[p.group];
            const completesForTarget =
              isMine && wouldCompleteMonopoly(targetPlayer.id, p);
            const completesForMe =
              !isMine && wouldCompleteMonopoly(currentPlayer.id, p);

            return `
            <div class="trade-prop-card ${isSelected ? "selected" : ""}" data-prop-id="${p.id}" data-is-mine="${isMine}">
              <div class="trade-prop-color" style="background-color: ${group?.hex || "#475569"};"></div>
              <div class="trade-prop-info">
                <div class="trade-prop-name">${p.name}</div>
                <div class="trade-prop-meta">Val $${p.price} • Rent $${p.rent ? p.rent[0] : 25}</div>
              </div>
              ${completesForTarget ? '<span class="trade-badge-synergy">⭐ Partner Set</span>' : ""}
              ${completesForMe ? '<span class="trade-badge-synergy" style="color: #34d399; border-color: #10b981; background: rgba(16,185,129,0.2);">👑 Your Set</span>' : ""}
              <div class="trade-card-checkbox">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
            </div>
          `;
          })
          .join("");
      };

      this.modalBody.innerHTML = `
        <div class="trade-desk-container">
          <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.35); padding: 10px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08);">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="icon-wrap gold-icon" style="width: 18px; height: 18px;">${getIcon("USERS")}</span>
              <span style="font-size: 0.85rem; font-weight: 800; color: #94a3b8;">Trading Partner:</span>
            </div>
            <select class="select-ctrl" id="tradePartnerSelect" style="min-width: 220px;">
              ${otherPlayers
                .map(
                  (p) => `
                <option value="${p.id}" ${p.id === targetPlayer.id ? "selected" : ""}>
                  ${p.name} ($${p.cash}, ${this.engine.getPlayerProperties(p.id).length} props)
                </option>
              `,
                )
                .join("")}
            </select>
          </div>

          <div class="trade-columns-grid">
            <!-- Left Column: You Offer -->
            <div class="trade-column-box">
              <div class="trade-column-header">
                <span style="color: var(--gold);">You Offer (${currentPlayer.name})</span>
                <span style="font-size: 0.76rem; color: #94a3b8; font-family: var(--font-mono);">$${currentPlayer.cash} Avail</span>
              </div>
              
              <div class="trade-cash-row">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <span style="font-size: 0.72rem; color: #94a3b8; font-weight: 700;">OFFER CASH ($):</span>
                  <div class="trade-quick-cash-btns">
                    <button class="trade-quick-btn" id="offerQuick50">+50</button>
                    <button class="trade-quick-btn" id="offerQuick100">+100</button>
                    <button class="trade-quick-btn" id="offerQuickAll">All</button>
                    <button class="trade-quick-btn" id="offerQuickClear">0</button>
                  </div>
                </div>
                <input type="number" id="offerCashInput" class="input-text" style="width: 100%; font-family: var(--font-mono); font-weight: 800;" min="0" max="${currentPlayer.cash}" value="${offeredCash}" />
              </div>

              <div>
                <div style="font-size: 0.72rem; color: #94a3b8; font-weight: 700; margin-bottom: 6px; text-transform: uppercase;">Your Properties:</div>
                <div class="trade-props-list" id="myPropsList">
                  ${renderPropList(myProps, offeredProps, true)}
                </div>
              </div>
            </div>

            <!-- Right Column: You Request -->
            <div class="trade-column-box">
              <div class="trade-column-header">
                <span style="color: #38bdf8;">You Request (${targetPlayer.name})</span>
                <span style="font-size: 0.76rem; color: #94a3b8; font-family: var(--font-mono);">$${targetPlayer.cash} Avail</span>
              </div>

              <div class="trade-cash-row">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <span style="font-size: 0.72rem; color: #94a3b8; font-weight: 700;">REQUEST CASH ($):</span>
                  <div class="trade-quick-cash-btns">
                    <button class="trade-quick-btn" id="reqQuick50">+50</button>
                    <button class="trade-quick-btn" id="reqQuick100">+100</button>
                    <button class="trade-quick-btn" id="reqQuickAll">All</button>
                    <button class="trade-quick-btn" id="reqQuickClear">0</button>
                  </div>
                </div>
                <input type="number" id="requestCashInput" class="input-text" style="width: 100%; font-family: var(--font-mono); font-weight: 800;" min="0" max="${targetPlayer.cash}" value="${requestedCash}" />
              </div>

              <div>
                <div style="font-size: 0.72rem; color: #94a3b8; font-weight: 700; margin-bottom: 6px; text-transform: uppercase;">Their Properties:</div>
                <div class="trade-props-list" id="theirPropsList">
                  ${renderPropList(theirProps, requestedProps, false)}
                </div>
              </div>
            </div>
          </div>

          <!-- Live Deal Valuation Summary Bar -->
          <div class="trade-summary-bar">
            <div class="trade-summary-side">
              <div class="trade-summary-label">Your Outgoing Value</div>
              <div class="trade-summary-value" id="tradeSummaryOffVal">$0</div>
            </div>

            <div id="tradeDealStatusContainer"></div>

            <div class="trade-summary-side" style="text-align: right;">
              <div class="trade-summary-label">Your Incoming Value</div>
              <div class="trade-summary-value" id="tradeSummaryReqVal">$0</div>
            </div>
          </div>
        </div>
      `;

      initCustomSelects(this.modalBody);

      // Partner selector
      document.getElementById("tradePartnerSelect").onchange = (e) => {
        targetPlayer = this.engine.players[parseInt(e.target.value, 10)];
        requestedProps.clear();
        requestedCash = 0;
        renderTradeBody();
      };

      // Property card click selection (no full rebuild, ultra snappy)
      document.querySelectorAll(".trade-prop-card").forEach((card) => {
        card.onclick = () => {
          const propId = parseInt(card.dataset.propId, 10);
          const isMine = card.dataset.isMine === "true";
          const set = isMine ? offeredProps : requestedProps;
          if (set.has(propId)) {
            set.delete(propId);
            card.classList.remove("selected");
          } else {
            set.add(propId);
            card.classList.add("selected");
          }
          updateTradeSummary();
        };
      });

      // Cash input handlers
      const offInput = document.getElementById("offerCashInput");
      if (offInput) {
        offInput.oninput = (e) => {
          let val = parseInt(e.target.value, 10) || 0;
          val = Math.max(0, Math.min(val, currentPlayer.cash));
          offeredCash = val;
          updateTradeSummary();
        };
      }

      const reqInput = document.getElementById("requestCashInput");
      if (reqInput) {
        reqInput.oninput = (e) => {
          let val = parseInt(e.target.value, 10) || 0;
          val = Math.max(0, Math.min(val, targetPlayer.cash));
          requestedCash = val;
          updateTradeSummary();
        };
      }

      // Quick cash buttons
      const setOfferCash = (amt) => {
        offeredCash = Math.max(0, Math.min(amt, currentPlayer.cash));
        if (offInput) offInput.value = offeredCash;
        updateTradeSummary();
      };
      document.getElementById("offerQuick50").onclick = () =>
        setOfferCash(offeredCash + 50);
      document.getElementById("offerQuick100").onclick = () =>
        setOfferCash(offeredCash + 100);
      document.getElementById("offerQuickAll").onclick = () =>
        setOfferCash(currentPlayer.cash);
      document.getElementById("offerQuickClear").onclick = () =>
        setOfferCash(0);

      const setReqCash = (amt) => {
        requestedCash = Math.max(0, Math.min(amt, targetPlayer.cash));
        if (reqInput) reqInput.value = requestedCash;
        updateTradeSummary();
      };
      document.getElementById("reqQuick50").onclick = () =>
        setReqCash(requestedCash + 50);
      document.getElementById("reqQuick100").onclick = () =>
        setReqCash(requestedCash + 100);
      document.getElementById("reqQuickAll").onclick = () =>
        setReqCash(targetPlayer.cash);
      document.getElementById("reqQuickClear").onclick = () => setReqCash(0);

      updateTradeSummary();
    };

    const updateTradeSummary = () => {
      let offVal = offeredCash;
      let reqVal = requestedCash;
      offeredProps.forEach((id) => {
        offVal += BOARD_TILES[id]?.price || 0;
      });
      requestedProps.forEach((id) => {
        reqVal += BOARD_TILES[id]?.price || 0;
      });

      const hasAnyItem =
        offeredProps.size > 0 ||
        requestedProps.size > 0 ||
        offeredCash > 0 ||
        requestedCash > 0;

      const offEl = document.getElementById("tradeSummaryOffVal");
      const reqEl = document.getElementById("tradeSummaryReqVal");
      const statusEl = document.getElementById("tradeDealStatusContainer");
      const sendBtn = document.getElementById("sendTradeBtn");

      if (offEl)
        offEl.innerHTML = `$${offVal} <span style="font-size: 0.72rem; font-weight: normal; color: #94a3b8;">($${offeredCash} + ${offeredProps.size} props)</span>`;
      if (reqEl)
        reqEl.innerHTML = `$${reqVal} <span style="font-size: 0.72rem; font-weight: normal; color: #94a3b8;">($${requestedCash} + ${requestedProps.size} props)</span>`;

      if (statusEl) {
        if (!hasAnyItem) {
          statusEl.innerHTML = `<span class="trade-deal-status neutral">Select items or cash to begin</span>`;
        } else if (targetPlayer.isAi) {
          const aiEvaluator = this.ai || this.engine.ai || window.aiPlayerRef;
          if (aiEvaluator) {
            const evalResult = aiEvaluator.evaluateTradeOffer(
              targetPlayer,
              currentPlayer,
              Array.from(offeredProps),
              offeredCash,
              Array.from(requestedProps),
              requestedCash,
            );
            if (evalResult?.accepted) {
              statusEl.innerHTML = `<span class="trade-deal-status acceptable">✓ AI Appraisal: Deal likely accepted</span>`;
            } else {
              const reasonText = evalResult?.reason || "Terms not agreeable";
              statusEl.innerHTML = `<span class="trade-deal-status declined" title="${reasonText}">✗ AI Appraisal: Inadequate terms</span>`;
            }
          } else {
            statusEl.innerHTML = `<span class="trade-deal-status neutral">Deal Ready</span>`;
          }
        } else {
          const diff = offVal - reqVal;
          if (Math.abs(diff) < 50) {
            statusEl.innerHTML = `<span class="trade-deal-status acceptable">Balanced Exchange</span>`;
          } else if (diff > 0) {
            statusEl.innerHTML = `<span class="trade-deal-status neutral">+$${diff} Partner Favor</span>`;
          } else {
            statusEl.innerHTML = `<span class="trade-deal-status neutral">+$${Math.abs(diff)} Your Favor</span>`;
          }
        }
      }

      if (sendBtn) {
        sendBtn.disabled = !hasAnyItem;
      }
    };

    this.modalFooter.innerHTML = `
      <button class="btn-primary" id="sendTradeBtn" disabled>Propose Trade</button>
      <button class="btn-secondary" id="cancelTradeBtn">Cancel</button>
    `;

    const tradeCb =
      onTradeConfirmed ||
      this.onTradeProposalCallback ||
      this.ui?.onTradeProposalCallback;
    document.getElementById("sendTradeBtn").onclick = () => {
      this.closeModal();
      if (tradeCb) {
        tradeCb(
          currentPlayer,
          targetPlayer,
          Array.from(offeredProps),
          offeredCash,
          Array.from(requestedProps),
          requestedCash,
        );
      }
    };

    document.getElementById("cancelTradeBtn").onclick = () => this.closeModal();

    renderTradeBody();
    this.modalOverlay.classList.add("active");
  }
  showWaitingModal(title, message) {
    this.modalTitle.innerHTML = `<span class="icon-wrap gold-icon">${getIcon("HOURGLASS")}</span> <span>${escapeHtml(title)}</span>`;
    this.modalBody.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; text-align: center; gap: 14px; padding: 24px 8px;">
        <div style="font-size: 2.5rem; animation: pulseArrow 1.5s infinite ease-in-out;">
          ${getIcon("HOURGLASS")}
        </div>
        <div style="font-size: 1rem; color: #f8fafc; font-weight: 600; line-height: 1.5;">
          ${escapeHtml(message)}
        </div>
      </div>
    `;
    this.modalFooter.innerHTML = `
      <button class="btn-secondary" id="cancelWaitingModalBtn" style="width: 100%; justify-content: center;">Dismiss</button>
    `;
    document.getElementById("cancelWaitingModalBtn").onclick = () =>
      this.closeModal();
    this.modalOverlay.classList.add("active");
  }
  showTradeResultModal(accepted, responder, reason, onClose) {
    this.modalTitle.innerHTML = accepted
      ? `<span class="icon-wrap gold-icon">${getIcon("HANDSHAKE")}</span> <span>Trade Agreement Finalized</span>`
      : `<span class="icon-wrap" style="color: #ef4444;">${getIcon("CLOSE")}</span> <span>Trade Offer Declined</span>`;

    this.modalBody.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; text-align: center; gap: 14px; padding: 12px 6px;">
        <div style="width: 60px; height: 60px; border-radius: 50%; background: ${accepted ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)"}; border: 2px solid ${accepted ? "#10b981" : "#ef4444"}; display: flex; align-items: center; justify-content: center; color: ${accepted ? "#10b981" : "#ef4444"}; font-size: 1.8rem;">
          ${accepted ? getIcon("HANDSHAKE") : getIcon("CLOSE")}
        </div>
        <div>
          <div style="font-size: 1.2rem; font-weight: 900; font-family: var(--font-display); color: ${accepted ? "#34d399" : "#f87171"};">
            ${accepted ? "AGREEMENT SIGNED!" : "PROPOSAL DECLINED"}
          </div>
          <div style="font-size: 0.92rem; color: #f8fafc; margin-top: 4px; font-weight: 700;">
            ${responder.name} ${accepted ? "agreed to the trade terms" : "declined the negotiation"}
          </div>
        </div>
        <div style="background: rgba(0, 0, 0, 0.35); border-left: 3px solid ${accepted ? "var(--gold)" : "#ef4444"}; padding: 12px 16px; border-radius: 6px; font-style: italic; color: #cbd5e1; font-size: 0.88rem; width: 100%; box-sizing: border-box;">
          "${reason || (accepted ? "This trade creates mutual value for both empires." : "Offer rejected: terms do not meet portfolio requirements.")}"
        </div>
      </div>
    `;

    this.modalFooter.innerHTML = `
      <button class="btn-primary" id="closeTradeResultBtn" style="width: 100%; justify-content: center;">Continue</button>
    `;

    document.getElementById("closeTradeResultBtn").onclick = () => {
      this.closeModal();
      if (onClose) onClose();
    };

    this.modalOverlay.classList.add("active");
  }
  showTradeOfferModal(
    offeringPlayer,
    targetPlayer,
    offeredProps,
    offeredCash,
    requestedProps,
    requestedCash,
    onAccept,
    onDecline,
    attemptNote = null,
  ) {
    this.modalTitle.innerHTML = `<span class="icon-wrap gold-icon">${getIcon("HANDSHAKE")}</span> <span>Incoming Trade Proposal</span>`;

    const offPropTiles = offeredProps.map((id) => BOARD_TILES[id]);
    const reqPropTiles = requestedProps.map((id) => BOARD_TILES[id]);

    this.modalBody.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 14px;">
        ${
          attemptNote
            ? `<div style="text-align: center; margin-bottom: 2px;">
                 <span style="background: rgba(16, 185, 129, 0.2); border: 1px solid #10b981; color: #34d399; padding: 4px 12px; border-radius: 8px; font-size: 0.8rem; font-weight: 800; display: inline-block;">
                   ${attemptNote}
                 </span>
               </div>`
            : ""
        }
        <div style="text-align: center; font-size: 0.95rem; color: #f8fafc;">
          <strong style="color: var(--gold);">${offeringPlayer.name}</strong> proposes a trade with <strong style="color: #38bdf8;">${targetPlayer.name}</strong>:
        </div>

        <div class="trade-columns-grid">
          <div class="trade-column-box">
            <div class="trade-column-header" style="color: #34d399;">You Will Receive:</div>
            ${offeredCash > 0 ? `<div style="font-family: var(--font-mono); font-weight: 800; color: #34d399; font-size: 0.95rem;">+ $${offeredCash} Cash</div>` : ""}
            <div style="font-size: 0.84rem; display: flex; flex-direction: column; gap: 4px; max-height: 160px; overflow-y: auto;">
              ${
                offPropTiles.length === 0 && offeredCash === 0
                  ? '<div style="color: #64748b;">Nothing</div>'
                  : offPropTiles
                      .map(
                        (p) => `
                <div style="background: rgba(255,255,255,0.06); padding: 5px 8px; border-radius: 4px; border-left: 4px solid ${COLOR_GROUPS[p.group]?.hex || "#fff"}; font-weight: 700;">
                  ${p.name} ($${p.price})
                </div>
              `,
                      )
                      .join("")
              }
            </div>
          </div>

          <div class="trade-column-box">
            <div class="trade-column-header" style="color: #f87171;">You Will Give:</div>
            ${requestedCash > 0 ? `<div style="font-family: var(--font-mono); font-weight: 800; color: #f87171; font-size: 0.95rem;">- $${requestedCash} Cash</div>` : ""}
            <div style="font-size: 0.84rem; display: flex; flex-direction: column; gap: 4px; max-height: 160px; overflow-y: auto;">
              ${
                reqPropTiles.length === 0 && requestedCash === 0
                  ? '<div style="color: #64748b;">Nothing</div>'
                  : reqPropTiles
                      .map(
                        (p) => `
                <div style="background: rgba(255,255,255,0.06); padding: 5px 8px; border-radius: 4px; border-left: 4px solid ${COLOR_GROUPS[p.group]?.hex || "#fff"}; font-weight: 700;">
                  ${p.name} ($${p.price})
                </div>
              `,
                      )
                      .join("")
              }
            </div>
          </div>
        </div>
      </div>
    `;

    this.modalFooter.innerHTML = `
      <button class="btn-primary" id="acceptTradeOfferBtn" style="background: #10b981; border-color: #059669;">Accept Deal</button>
      <button class="btn-secondary" id="declineTradeOfferBtn">Decline Deal</button>
    `;

    document.getElementById("acceptTradeOfferBtn").onclick = () => {
      this.closeModal();
      if (onAccept) onAccept();
    };

    document.getElementById("declineTradeOfferBtn").onclick = () => {
      this.closeModal();
      if (onDecline) onDecline();
    };

    const timerSec = (gameSettings.approvalTimerSeconds || 15) + 5;
    this.startModalTimer(
      timerSec,
      () => {
        this.engine.log(
          `⏱️ [TIME'S UP] ${targetPlayer.name} did not respond to trade proposal in time (Declined).`,
          "warning",
        );
        this.closeModal();
        if (onDecline) onDecline();
      },
      "Auto-decline in",
    );

    this.modalOverlay.classList.add("active");
  }
  celebrateMonopoly(player, groupKey) {
    const group = COLOR_GROUPS[groupKey];
    const groupColor = group?.hex || "#d4af37";
    const groupName = group?.name || groupKey;

    // 1. Shimmer/glow each tile in this color group on the board in its authentic color
    const groupTiles = BOARD_TILES.filter((t) => t.group === groupKey);
    groupTiles.forEach((t) => {
      const tileEl = document.getElementById(`tile-${t.id}`);
      if (tileEl) {
        tileEl.style.setProperty("--monopoly-glow", groupColor);
        tileEl.classList.remove("tile-monopoly-glow");
        void tileEl.offsetWidth; // force browser reflow
        tileEl.classList.add("tile-monopoly-glow");
        setTimeout(() => {
          tileEl.classList.remove("tile-monopoly-glow");
        }, 2500);
      }
    });

    // 2. Play celebratory sound (level-up.mp3 - 2.47s)
    sounds.playUpgrade(player);

    // 3. Log monopoly completion to game log
    this.engine.log(
      `👑 [MONOPOLY!] ${player.name} completed the ${groupName} set! All unimproved rents are DOUBLED!`,
      "success",
    );

    // 4. Unlock achievement if human player
    if (!player.isAi) {
      achievements.unlock("monopoly_boss");
    }

    // 5. Show banner celebration toast
    this.showMonopolyCelebrationToast(player, groupName, groupColor);
  }
  showMonopolyCelebrationToast(player, groupName, groupColor) {
    let toast = document.getElementById("monopolyToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "monopolyToast";
      toast.className = "monopoly-celebration-toast";
      document.body.appendChild(toast);
    }

    toast.style.setProperty("--monopoly-glow", groupColor);
    toast.style.borderColor = groupColor;
    toast.innerHTML = `
      <div style="font-size: 2rem;">👑</div>
      <div>
        <div style="font-weight: 900; font-size: 1.15rem; font-family: var(--font-display); color: #fff; letter-spacing: 0.5px;">MONOPOLY ASSEMBLED!</div>
        <div style="font-size: 0.88rem; color: #cbd5e1; margin-top: 2px;">
          <strong style="color: ${player.color};">${player.name}</strong> completed the <strong style="color: ${groupColor}; font-weight: 900;">${groupName}</strong> color set! Rents doubled!
        </div>
      </div>
    `;

    toast.classList.add("show");
    clearTimeout(this._monopolyToastTimer);
    this._monopolyToastTimer = setTimeout(() => {
      toast.classList.remove("show");
    }, 2470); // Synchronized with 2.47s level-up chime
  }

  showToast(message, type = "info") {
    let toast = document.getElementById("gameUniversalToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "gameUniversalToast";
      toast.className = "game-universal-toast";
      document.body.appendChild(toast);
    }

    const iconsByType = {
      success: getIcon("CHECK"),
      danger: getIcon("WARNING"),
      info: getIcon("SPARKLE"),
    };

    const iconHtml = iconsByType[type] || getIcon("SPARKLE");
    toast.className = `game-universal-toast toast-${type} show`;
    toast.innerHTML = `
      <span class="universal-toast-icon">${iconHtml}</span>
      <span class="universal-toast-text">${escapeHtml(message)}</span>
    `;

    clearTimeout(this._universalToastTimer);
    this._universalToastTimer = setTimeout(() => {
      toast.classList.remove("show");
    }, 3200);
  }
  showJailToast(player) {
    let toast = document.getElementById("jailToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "jailToast";
      toast.className = "jail-celebration-toast";
      document.body.appendChild(toast);
    }

    toast.innerHTML = `
      <div style="font-size: 2rem;">🔒</div>
      <div>
        <div style="font-weight: 900; font-size: 1.15rem; font-family: var(--font-display); color: #ef4444; letter-spacing: 0.5px;">SENT TO JAIL! (ARRESTED)</div>
        <div style="font-size: 0.88rem; color: #cbd5e1; margin-top: 2px;">
          <strong style="color: ${player.color};">${player.name}</strong> was sent directly to Jail! Bail fee: <strong>$${gameSettings.jailBailFee}</strong>
        </div>
      </div>
    `;

    toast.classList.add("show");
    clearTimeout(this._jailToastTimer);
    this._jailToastTimer = setTimeout(() => {
      toast.classList.remove("show");
    }, 6340); // Synchronized with 6.34s jail-door sound
  }
  showBankruptcyToast(player) {
    let toast = document.getElementById("bankruptcyToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "bankruptcyToast";
      toast.className = "bankruptcy-celebration-toast";
      document.body.appendChild(toast);
    }

    toast.innerHTML = `
      <div style="font-size: 2rem;">💸</div>
      <div>
        <div style="font-weight: 900; font-size: 1.15rem; font-family: var(--font-display); color: #f87171; letter-spacing: 0.5px;">BANKRUPT!</div>
        <div style="font-size: 0.88rem; color: #cbd5e1; margin-top: 2px;">
          <strong style="color: ${player.color};">${player.name}</strong> has lost all assets and is eliminated from the game!
        </div>
      </div>
    `;

    toast.classList.add("show");
    clearTimeout(this._bankruptToastTimer);
    this._bankruptToastTimer = setTimeout(() => {
      toast.classList.remove("show");
    }, 5260); // Synchronized with 5.26s sad-trombone sound
  }
  showGameOverModal(winner) {
    if (this.modalCard) {
      this.modalCard.classList.remove("naked-modal", "setup-modal", "property-management-modal", "rules-modal");
      this.modalCard.classList.add("game-over-modal-card");
    }
    this.modalTitle.innerHTML = `<span class="icon-wrap gold-icon">${getIcon("TROPHY")}</span> <span>MATCH COMPLETE</span>`;

    // Confetti rain bursts synchronized with victory-fanfare.mp3 (6.72s)
    particles.burstConfetti();
    const confettiInterval = setInterval(() => {
      particles.burstConfetti();
    }, 750);
    setTimeout(() => {
      clearInterval(confettiInterval);
    }, 6720);

    const summary = this.engine.getMatchSummary();
    const st = summary.standings;
    const winnerEntry = st.find((s) => s.isWinner) || st[0];
    const winnerName = winnerEntry ? winnerEntry.name : "Champion";
    const winnerColor = winnerEntry ? winnerEntry.color : "#d4af37";

    // ── Rank Badges ──
    const rankBadge = (rank) => {
      if (rank === 1) return `<span class="go-rank go-rank-gold">🥇</span>`;
      if (rank === 2) return `<span class="go-rank go-rank-silver">🥈</span>`;
      if (rank === 3) return `<span class="go-rank go-rank-bronze">🥉</span>`;
      return `<span class="go-rank">#${rank}</span>`;
    };

    // ── Helper: stat card ──
    const statCard = (label, value, color = "#e2e8f0", icon = "") => `
      <div class="go-stat-card">
        ${icon ? `<div class="go-stat-icon">${icon}</div>` : ""}
        <div class="go-stat-value" style="color:${color}">${value}</div>
        <div class="go-stat-label">${label}</div>
      </div>`;

    // ════════════════════════════════════════════════════
    // TAB 1: STANDINGS
    // ════════════════════════════════════════════════════
    const standingsRows = st
      .map(
        (p) => `
      <tr class="${p.isWinner ? "go-winner-row" : ""} ${p.bankrupt ? "go-bankrupt-row" : ""}">
        <td>${rankBadge(p.rank)}</td>
        <td>
          <span class="go-player-dot" style="background:${p.color}"></span>
          <span class="go-player-name">${escapeHtml(p.name)}</span>
          ${p.isAi ? '<span class="go-ai-badge">AI</span>' : ""}
          ${p.isWinner ? '<span class="go-winner-badge">CHAMPION</span>' : ""}
          ${p.bankrupt ? '<span class="go-bankrupt-badge">BANKRUPT</span>' : ""}
        </td>
        <td class="go-td-mono">$${p.netWorth.toLocaleString()}</td>
        <td class="go-td-mono">$${p.finalCash.toLocaleString()}</td>
        <td class="go-td-mono">${p.propertiesCount}</td>
      </tr>`,
      )
      .join("");

    const tab1 = `
      <div class="go-tab-content" id="goTabStandings">
        <div class="go-champion-banner">
          <div class="go-trophy-glow">🏆</div>
          <div class="go-champion-title">MONOPOLY CHAMPION</div>
          <div class="go-champion-name" style="color:${winnerColor}">${escapeHtml(winnerName)}</div>
          <div class="go-champion-subtitle">All opponents eliminated — Total economic domination!</div>
        </div>

        <div class="go-meta-bar">
          ${statCard("Duration", summary.durationFormatted, "#fbbf24", "⏱️")}
          ${statCard("Rounds", summary.totalRounds, "#60a5fa", "🔄")}
          ${statCard("Turns", summary.totalTurns, "#a78bfa", "🎲")}
        </div>

        <div class="go-standings-table-wrap">
          <table class="go-standings-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th>Net Worth</th>
                <th>Cash</th>
                <th>Props</th>
              </tr>
            </thead>
            <tbody>${standingsRows}</tbody>
          </table>
        </div>

        ${
          summary.globalCrownJewel
            ? `<div class="go-crown-jewel">
                <span>👑</span>
                <span><strong>Crown Jewel:</strong> ${escapeHtml(summary.globalCrownJewel.name)} — earned $${summary.globalCrownJewel.rentCollected.toLocaleString()} in rent for ${escapeHtml(summary.globalCrownJewel.ownerName)}</span>
              </div>`
            : ""
        }
      </div>`;

    // ════════════════════════════════════════════════════
    // TAB 2: ANALYTICS
    // ════════════════════════════════════════════════════
    const analyticsPlayerChips = st
      .map(
        (p, i) => `
      <button class="go-analytics-chip ${i === 0 ? "active" : ""}" data-player-idx="${i}">
        <span class="go-player-dot" style="background:${p.color}"></span>
        ${escapeHtml(p.name)}
      </button>`,
      )
      .join("");

    const analyticsContents = st
      .map((p, i) => {
        const s = p.stats;
        const totalIncome =
          s.rentCollected + s.salaryCollected + s.cardEarnings;
        const totalExpenses =
          s.rentPaid +
          s.taxesPaid +
          s.cardPenalties +
          s.buildingSpend +
          s.propertySpend +
          s.jailBailPaid;
        const netProfit = totalIncome - totalExpenses;
        const doublesPercent =
          s.diceRolls > 0
            ? ((s.doublesRolled / s.diceRolls) * 100).toFixed(1)
            : "0.0";

        return `
        <div class="go-analytics-panel ${i === 0 ? "active" : ""}" id="goAnalyticsPanel${i}">
          <div class="go-section-title">💰 Financial Flow</div>
          <div class="go-analytics-grid">
            ${statCard("Rent Collected", "$" + s.rentCollected.toLocaleString(), "#34d399")}
            ${statCard("Rent Paid", "$" + s.rentPaid.toLocaleString(), "#f87171")}
            ${statCard("GO Salary", "$" + s.salaryCollected.toLocaleString(), "#fbbf24")}
            ${statCard("Taxes Paid", "$" + s.taxesPaid.toLocaleString(), "#fb923c")}
            ${statCard("Card Earnings", "$" + s.cardEarnings.toLocaleString(), "#4ade80")}
            ${statCard("Card Penalties", "$" + s.cardPenalties.toLocaleString(), "#f472b6")}
          </div>

          <div class="go-profit-bar ${netProfit >= 0 ? "positive" : "negative"}">
            <span>Net Profit</span>
            <strong>${netProfit >= 0 ? "+" : ""}$${netProfit.toLocaleString()}</strong>
          </div>

          <div class="go-section-title">🏗️ Construction Portfolio</div>
          <div class="go-analytics-grid">
            ${statCard("Houses Built", s.housesBuilt, "#60a5fa")}
            ${statCard("Hotels Built", s.hotelsBuilt, "#c084fc")}
            ${statCard("Building Spend", "$" + s.buildingSpend.toLocaleString(), "#fb923c")}
            ${statCard("Properties Bought", s.propertiesBought, "#2dd4bf")}
            ${statCard("Property Spend", "$" + s.propertySpend.toLocaleString(), "#fbbf24")}
            ${statCard("Crown Jewel", p.crownJewelName || "None", "#d4af37")}
          </div>

          <div class="go-section-title">🎲 Activity Metrics</div>
          <div class="go-analytics-grid">
            ${statCard("Dice Rolls", s.diceRolls, "#818cf8")}
            ${statCard("Doubles Rate", doublesPercent + "%", "#a78bfa")}
            ${statCard("Laps Completed", s.lapsCompleted, "#38bdf8")}
            ${statCard("Jail Visits", s.jailVisits, "#94a3b8")}
            ${statCard("Bail Paid", "$" + s.jailBailPaid.toLocaleString(), "#f59e0b")}
            ${statCard("Peak Net Worth", "$" + (s.peakNetWorth || 0).toLocaleString(), "#d4af37")}
          </div>

          <div class="go-totals-bar">
            <div><span>Total Income:</span> <strong style="color:#34d399">$${totalIncome.toLocaleString()}</strong></div>
            <div><span>Total Expenses:</span> <strong style="color:#f87171">$${totalExpenses.toLocaleString()}</strong></div>
            <div><span>Peak Cash:</span> <strong style="color:#fbbf24">$${(s.peakCash || 0).toLocaleString()}</strong></div>
          </div>
        </div>`;
      })
      .join("");

    const tab2 = `
      <div class="go-tab-content" id="goTabAnalytics" style="display:none">
        <div class="go-analytics-chips">${analyticsPlayerChips}</div>
        ${analyticsContents}
      </div>`;

    // ════════════════════════════════════════════════════
    // TAB 3: CERTIFICATE
    // ════════════════════════════════════════════════════
    const certPlayerChips = st
      .map(
        (p, i) => `
      <button class="go-cert-chip ${i === 0 ? "active" : ""}" data-cert-idx="${i}">
        <span class="go-player-dot" style="background:${p.color}"></span>
        ${escapeHtml(p.name)}
      </button>`,
      )
      .join("");

    const today = new Date();
    const dateStr = today.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const certificates = st
      .map((p, i) => {
        const s = p.stats;
        return `
        <div class="go-cert-panel ${i === 0 ? "active" : ""}" id="goCertPanel${i}">
          <div class="tycoon-certificate" id="tycoonCert${i}">
            <div class="cert-corner cert-corner-tl"></div>
            <div class="cert-corner cert-corner-tr"></div>
            <div class="cert-corner cert-corner-bl"></div>
            <div class="cert-corner cert-corner-br"></div>

            <div class="cert-header">CERTIFICATE OF ACHIEVEMENT</div>
            <div class="cert-divider">✦ ✦ ✦</div>

            <div class="cert-body">
              <div class="cert-presented">This is to certify that</div>
              <div class="cert-player-name" style="color:${p.color}">${escapeHtml(p.name)}</div>
              <div class="cert-title-banner">
                <span class="cert-grade">${p.grade}</span>
                <span class="cert-title-text">${p.title}</span>
              </div>

              <div class="cert-stats-grid">
                <div class="cert-stat"><span class="cert-stat-val">$${p.netWorth.toLocaleString()}</span><span class="cert-stat-lbl">Net Worth</span></div>
                <div class="cert-stat"><span class="cert-stat-val">${p.propertiesCount}</span><span class="cert-stat-lbl">Properties</span></div>
                <div class="cert-stat"><span class="cert-stat-val">${s.housesBuilt + s.hotelsBuilt}</span><span class="cert-stat-lbl">Buildings</span></div>
                <div class="cert-stat"><span class="cert-stat-val">${s.lapsCompleted}</span><span class="cert-stat-lbl">Laps</span></div>
              </div>

              <div class="cert-highlight">
                <span>🏅 Finished Rank #${p.rank}</span>
                <span>•</span>
                <span>${summary.durationFormatted} Match</span>
                <span>•</span>
                <span>${s.diceRolls} Dice Rolls</span>
              </div>
            </div>

            <div class="cert-footer">
              <div class="cert-seal">
                <div class="cert-seal-inner">
                  <div class="cert-seal-icon">🏛️</div>
                  <div class="cert-seal-text">OFFICIAL</div>
                </div>
              </div>
              <div class="cert-date">
                <div class="cert-date-label">Issued</div>
                <div class="cert-date-value">${dateStr}</div>
              </div>
              <div class="cert-signature">
                <div class="cert-sig-line"></div>
                <div class="cert-sig-label">Monopoly Master™</div>
              </div>
            </div>
          </div>
        </div>`;
      })
      .join("");

    const tab3 = `
      <div class="go-tab-content" id="goTabCertificate" style="display:none">
        <div class="go-cert-chips">${certPlayerChips}</div>
        ${certificates}
        <button class="go-print-btn" id="goPrintCertBtn">
          🖨️ Print Certificate
        </button>
      </div>`;

    // ════════════════════════════════════════════════════
    // COMPOSE MODAL
    // ════════════════════════════════════════════════════
    this.modalBody.innerHTML = `
      <div class="go-tabs-bar">
        <button class="go-tab-btn active" data-tab="goTabStandings">🏆 Standings</button>
        <button class="go-tab-btn" data-tab="goTabAnalytics">📊 Analytics</button>
        <button class="go-tab-btn" data-tab="goTabCertificate">📜 Certificate</button>
      </div>
      ${tab1}${tab2}${tab3}
    `;

    this.modalFooter.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 9px; width: 100%;">
        <button class="btn-primary" id="downloadGameOverMatchLogBtn" style="width: 100%; justify-content: center; background: linear-gradient(135deg, #0284c7, #2563eb); border: 1px solid rgba(56, 189, 248, 0.45); box-shadow: 0 4px 14px rgba(2, 132, 199, 0.35);">
          <span class="icon-wrap" style="width: 18px; height: 18px;">${getIcon("DOWNLOAD")}</span>
          <span>Download Match Log (.JSON)</span>
        </button>
        <button class="btn-primary" id="restartNewGameBtn" style="width: 100%; justify-content: center;">
          <span class="icon-wrap" style="width: 18px; height: 18px;">${getIcon("REFRESH")}</span>
          <span>Start New Game</span>
        </button>
      </div>
    `;

    // ── Tab Switching ──
    this.modalBody.querySelectorAll(".go-tab-btn").forEach((btn) => {
      btn.onclick = () => {
        this.modalBody
          .querySelectorAll(".go-tab-btn")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.modalBody
          .querySelectorAll(".go-tab-content")
          .forEach((c) => (c.style.display = "none"));
        const target = document.getElementById(btn.dataset.tab);
        if (target) target.style.display = "block";
      };
    });

    // ── Analytics Player Chips ──
    this.modalBody.querySelectorAll(".go-analytics-chip").forEach((chip) => {
      chip.onclick = () => {
        this.modalBody
          .querySelectorAll(".go-analytics-chip")
          .forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        this.modalBody
          .querySelectorAll(".go-analytics-panel")
          .forEach((p) => p.classList.remove("active"));
        const panel = document.getElementById(
          `goAnalyticsPanel${chip.dataset.playerIdx}`,
        );
        if (panel) panel.classList.add("active");
      };
    });

    // ── Certificate Player Chips ──
    this.modalBody.querySelectorAll(".go-cert-chip").forEach((chip) => {
      chip.onclick = () => {
        this.modalBody
          .querySelectorAll(".go-cert-chip")
          .forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        this.modalBody
          .querySelectorAll(".go-cert-panel")
          .forEach((p) => p.classList.remove("active"));
        const panel = document.getElementById(
          `goCertPanel${chip.dataset.certIdx}`,
        );
        if (panel) panel.classList.add("active");
      };
    });

    // ── Print Certificate ──
    const printBtn = document.getElementById("goPrintCertBtn");
    if (printBtn) {
      printBtn.onclick = () => {
        const activeCert = this.modalBody.querySelector(
          ".go-cert-panel.active .tycoon-certificate",
        );
        if (activeCert) {
          activeCert.classList.add("printing");
          window.print();
          setTimeout(() => activeCert.classList.remove("printing"), 500);
        }
      };
    }

    // ── Footer Buttons ──
    document.getElementById("downloadGameOverMatchLogBtn").onclick = () => {
      this.downloadMatchLogJSON();
    };

    document.getElementById("restartNewGameBtn").onclick = () => {
      if (this.modalCard) this.modalCard.classList.remove("game-over-modal-card");
      this.closeModal();
      if (this.app) {
        this.app.showSetupModal();
      }
    };

    this.modalOverlay.classList.add("active");
  }
  showLobbyModal(multiplayerManager) {
    this.modalTitle.innerHTML = `<span class="icon-wrap gold-icon">${getIcon("REFRESH")}</span> <span>Multiplayer Room: ${multiplayerManager.roomCode}</span>`;
    this.modalBody.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 16px; text-align: center;">
        <div style="background: rgba(212, 175, 55, 0.15); border: 2px dashed var(--gold); padding: 18px; border-radius: 14px;">
          <div style="font-size: 0.85rem; color: var(--gold); text-transform: uppercase; font-weight: 800;">Share this Room Code with friends:</div>
          <div style="font-size: 2.8rem; font-weight: 900; letter-spacing: 6px; color: #fff; margin: 8px 0; font-family: var(--font-mono);">${multiplayerManager.roomCode}</div>
          <div style="font-size: 0.75rem; color: #94a3b8;">Friends can open this app on their PCs or browser and enter this code!</div>
        </div>

        <div style="text-align: left;">
          <div style="font-weight: 800; margin-bottom: 8px;">Connected Players:</div>
          <div id="lobbyPlayersList" style="display: flex; flex-direction: column; gap: 8px;"></div>
        </div>
      </div>
    `;

    this.modalFooter.innerHTML = multiplayerManager.isHost
      ? `<button class="btn-primary" id="startLobbyGameBtn" style="width: 100%; justify-content: center;">Start Match Now</button>`
      : `<div style="color: #94a3b8; font-size: 0.85rem; width: 100%; text-align: center;">Waiting for host to start game...</div>`;

    if (multiplayerManager.isHost) {
      document.getElementById("startLobbyGameBtn").onclick = () => {
        multiplayerManager.startRoomGame();
      };
    }

    this.updateLobbyList(multiplayerManager.players, multiplayerManager.isHost);
    this.modalOverlay.classList.add("active");
  }
  updateLobbyList(players, isHost) {
    const listEl = document.getElementById("lobbyPlayersList");
    if (!listEl) return;
    listEl.innerHTML = "";
    players.forEach((p) => {
      const item = document.createElement("div");
      item.style.cssText =
        "background: rgba(255,255,255,0.06); padding: 10px 14px; border-radius: 8px; display: flex; align-items: center; justify-content: space-between;";
      item.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 24px; height: 24px;">${getIcon(p.token || "TOP_HAT")}</div>
          <span style="font-weight: 800;">${escapeHtml(p.name)}</span>
          ${p.isHost ? '<span style="background: var(--gold); color: #000; font-size: 0.65rem; padding: 2px 7px; border-radius: 4px; font-weight: 900;">HOST</span>' : ""}
        </div>
        <div style="width: 16px; height: 16px; border-radius: 50%; background-color: ${p.color}; border: 1.5px solid #fff;"></div>
      `;
      listEl.appendChild(item);
    });
  }
  showAchievementsModal() {
    this.modalTitle.innerHTML = `<span class="icon-wrap gold-icon">${getIcon("TROPHY")}</span> <span>Tycoon Achievements</span>`;
    const list = Object.values(ACHIEVEMENTS_LIST);
    const unlockedSet = achievements.unlocked;

    let itemsHtml = list
      .map((item) => {
        const isUnlocked = unlockedSet.has(item.id);
        return `
        <div style="display: flex; align-items: center; gap: 14px; padding: 12px 14px; border-radius: 10px; background: ${isUnlocked ? "rgba(56, 189, 248, 0.12)" : "rgba(255, 255, 255, 0.03)"}; border: 1px solid ${isUnlocked ? "#38bdf8" : "rgba(255, 255, 255, 0.08)"}; opacity: ${isUnlocked ? "1" : "0.55"};">
          <div style="width: 44px; height: 44px; border-radius: 8px; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; padding: 8px; color: ${isUnlocked ? "var(--gold)" : "#64748b"};">
            ${getIcon(item.iconKey || "TROPHY")}
          </div>
          <div style="flex: 1;">
            <div style="font-weight: 800; color: ${isUnlocked ? "#f8fafc" : "#94a3b8"}; font-size: 0.96rem;">${item.title}</div>
            <div style="font-size: 0.76rem; color: #94a3b8; margin-top: 2px;">${item.desc}</div>
          </div>
          ${isUnlocked ? `<span style="color: #38bdf8; font-size: 0.75rem; font-weight: 800; background: rgba(56,189,248,0.15); padding: 3px 8px; border-radius: 6px;">UNLOCKED</span>` : `<span style="color: #64748b; font-size: 0.75rem;">LOCKED</span>`}
        </div>
      `;
      })
      .join("");

    this.modalBody.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 10px; max-height: 460px; overflow-y: auto; padding-right: 6px;">
        ${itemsHtml}
      </div>
    `;

    this.modalFooter.innerHTML = `<button class="btn-primary" id="closeAchievementsBtn">Close</button>`;
    document.getElementById("closeAchievementsBtn").onclick = () =>
      this.closeModal();
    this.modalOverlay.classList.add("active");
  }
  showExitConfirmationModal(options = {}, onConfirm, onCancel) {
    this.closeModal(true);
    this.isExitModal = true;
    if (this.modalCard) this.modalCard.classList.add("exit-modal");

    let isReload = false;
    let confirmCb = onConfirm;
    let cancelCb = onCancel;
    if (typeof options === "object" && options !== null) {
      isReload = Boolean(options.isReload);
      confirmCb = options.onConfirm || onConfirm;
      cancelCb = options.onCancel || onCancel;
    } else {
      isReload = Boolean(options);
    }

    const titleText = isReload ? "Reload Game Session?" : "Exit Current Match?";
    const iconName = isReload ? "WARNING" : "EXIT";

    this.modalTitle.innerHTML = `<span class="icon-wrap" style="color: #f59e0b;">${getIcon(iconName)}</span> <span>${titleText}</span>`;
    
    const heading = isReload ? "Unsaved Match Progress" : "Abandon Active Match?";
    const message = isReload
      ? "Are you sure you want to refresh the page? Your ongoing match, player turns, and board progress will be lost."
      : "Are you sure you want to exit the current match? Any in-progress board states, properties, and cash balances will be discarded.";

    this.modalBody.innerHTML = `
      <div class="exit-modal-card">
        <div class="exit-modal-glow-badge">
          <span class="icon-wrap">${getIcon(iconName)}</span>
        </div>
        <h4 class="exit-modal-title">${heading}</h4>
        <p class="exit-modal-message">${message}</p>
        <div class="exit-modal-notice">
          <span class="icon-wrap">${getIcon("ALERT_CIRCLE")}</span>
          <span>Active property deeds, cash balances, and match history will be discarded.</span>
        </div>
      </div>
    `;

    const confirmLabel = isReload ? "Reload Anyway" : "Exit to Menu";
    this.modalFooter.innerHTML = `
      <button class="btn-secondary" id="exitCancelBtn" style="flex: 1; justify-content: center;">
        Stay in Game
      </button>
      <button class="btn-primary btn-danger-action" id="exitConfirmBtn" style="flex: 1; justify-content: center;">
        ${confirmLabel}
      </button>
    `;

    document.getElementById("exitCancelBtn").onclick = () => {
      this.closeModal(true);
      if (typeof cancelCb === "function") cancelCb();
    };

    document.getElementById("exitConfirmBtn").onclick = () => {
      this.closeModal(true);
      if (typeof confirmCb === "function") confirmCb();
    };

    this.modalOverlay.classList.add("active");
  }
  showRulesModal() {
    this.closeModal(true);
    if (this.modalCard) this.modalCard.classList.add("rules-modal");

    this.modalTitle.innerHTML = "";
    if (this.closeModalCrossBtn) this.closeModalCrossBtn.style.display = "flex";

    const isClassicBoard = this.engine.getBoardLength() === 40;
    const cornerStartLabel = isClassicBoard ? "GO" : "START";
    const cornerFreeLabel = isClassicBoard ? "FREE PARKING" : "SAFE ZONE";
    const boardEditionLabel = isClassicBoard ? "40-Tile Classic Atlantic City" : "36-Tile World Mega-Cities";

    const sections = {
      overview: `
        <div class="rules-card rules-card-gold">
          <div class="rules-card-title"><span class="icon-wrap gold-icon">${getIcon("TROPHY")}</span> <span>Object of the Game</span></div>
          <p>The objective of MONOPOLY is to become the wealthiest player through buying, renting, and trading properties until all opponents are driven into bankruptcy.</p>
        </div>

        <div class="rules-card">
          <div class="rules-card-title"><span class="icon-wrap gold-icon">${getIcon("COIN")}</span> <span>Standard Equipment & Starting Bankroll</span></div>
          <p>Each tycoon starts the match with exactly <strong>$1,500 cash</strong> distributed in standard denominations:</p>
          <table class="rules-table">
            <thead>
              <tr><th>Denomination</th><th>Count</th><th>Total Value</th></tr>
            </thead>
            <tbody>
              <tr><td>$500 Bills</td><td>2</td><td>$1,000</td></tr>
              <tr><td>$100 Bills</td><td>2</td><td>$200</td></tr>
              <tr><td>$50 Bills</td><td>2</td><td>$100</td></tr>
              <tr><td>$20 Bills</td><td>6</td><td>$120</td></tr>
              <tr><td>$10 Bills</td><td>5</td><td>$50</td></tr>
              <tr><td>$5 Bills</td><td>5</td><td>$25</td></tr>
              <tr><td>$1 Bills</td><td>5</td><td>$5</td></tr>
              <tr style="font-weight: 800; color: var(--gold-light);"><td>Total Capital</td><td>27 Bills</td><td>$1,500</td></tr>
            </tbody>
          </table>
        </div>

        <div class="rules-card">
          <div class="rules-card-title"><span class="icon-wrap gold-icon">${getIcon("HOUSE")}</span> <span>The Banker & The Treasury</span></div>
          <p>The Bank holds all Title Deed cards, houses, and hotels prior to player purchase. The Bank never "goes broke" — if physical cash runs low, it issues credit IOUs until funds are replenished.</p>
        </div>
      `,

      corners: `
        <div class="rules-card rules-card-gold">
          <div class="rules-card-title"><span class="icon-wrap gold-icon">${getIcon("DICE")}</span> <span>Turn Cycle & Doubles Rule</span></div>
          <p>Players throw 2 dice and advance clockwise. Throwing <strong>Doubles</strong> grants an immediate bonus turn. However, rolling doubles <strong>3 times in succession</strong> results in immediate arrest: move directly to JAIL (turn ends, do not pass GO, do not collect $200 salary).</p>
        </div>

        <div class="rules-card">
          <div class="rules-card-title"><span class="icon-wrap gold-icon">${getIcon("START_ARROW")}</span> <span>Corner 0: ${cornerStartLabel}</span></div>
          <p>Collect <strong>$${gameSettings.goReward || 200} salary</strong> each time your token lands on or passes ${cornerStartLabel}.</p>
          <div style="margin-top: 6px; font-size: 0.82rem; color: #94a3b8;">
            <strong style="color: var(--gold);">Official Rule Nuance:</strong> If you pass GO on a dice roll and land on Chance or Chest, drawing an "Advance to GO" card, you collect $200 twice ($400 total)!
          </div>
        </div>

        <div class="rules-card">
          <div class="rules-card-title"><span class="icon-wrap" style="color: #60a5fa;">${getIcon("JAIL")}</span> <span>Corner 1: JAIL & JUST VISITING</span></div>
          <p>Landing on this space through normal dice movement is strictly <strong>JUST VISITING</strong> — you incur zero penalty and move ahead as usual on your next turn. You only go to Jail if sent there by "Go to Jail", drawing an arrest card, or rolling 3 consecutive doubles.</p>
        </div>

        <div class="rules-card">
          <div class="rules-card-title"><span class="icon-wrap" style="color: #34d399;">${getIcon("SAFE_ZONE")}</span> <span>Corner 2: ${cornerFreeLabel}</span></div>
          <p>An official resting haven. Players landing here receive no special reward and pay no fines. (Standard Hasbro rules specify zero jackpot money on Free Parking).</p>
        </div>

        <div class="rules-card">
          <div class="rules-card-title"><span class="icon-wrap" style="color: #ef4444;">${getIcon("POLICE")}</span> <span>Corner 3: GO TO JAIL</span></div>
          <p>Immediate arrest! Your token moves directly to the Jail cell. Your turn ends immediately and you do NOT collect any salary from passing ${cornerStartLabel}.</p>
        </div>
      `,

      properties: `
        <div class="rules-card rules-card-gold">
          <div class="rules-card-title"><span class="icon-wrap gold-icon">${getIcon("LAUREL")}</span> <span>Monopolies & Double Rent</span></div>
          <p>Holding all Title Deeds in a color-group constitutes a <strong>MONOPOLY</strong>. This automatically <strong>DOUBLES</strong> the base rent on all unimproved properties in that set. This rule applies even if another property in that color-group is mortgaged!</p>
        </div>

        <div class="rules-card">
          <div class="rules-card-title"><span class="icon-wrap gold-icon">${getIcon("TRAIN")}</span> <span>Railroad & Transit Stations</span></div>
          <p>Rent depends on how many stations are owned by that tycoon:</p>
          <table class="rules-table">
            <thead>
              <tr><th>Stations Owned</th><th>Classic Rent</th><th>Custom World Rent</th></tr>
            </thead>
            <tbody>
              <tr><td>1 Station</td><td>$25</td><td>$50</td></tr>
              <tr><td>2 Stations</td><td>$50</td><td>$100</td></tr>
              <tr><td>3 Stations</td><td>$100</td><td>$150</td></tr>
              <tr><td>4 Stations</td><td>$200</td><td>$200</td></tr>
            </tbody>
          </table>
        </div>

        <div class="rules-card">
          <div class="rules-card-title"><span class="icon-wrap gold-icon">${getIcon("LIGHTNING")}</span> <span>Utilities (Electric & Water)</span></div>
          <p>If 1 Utility is owned, rent is <strong>4x the dice roll</strong>. If both Utilities are owned by the same tycoon, rent increases to <strong>10x the dice roll</strong>!</p>
        </div>
      `,

      houses: `
        <div class="rules-card rules-card-gold">
          <div class="rules-card-title"><span class="icon-wrap gold-icon">${getIcon("HOUSE")}</span> <span>The Uniform Building Rule</span></div>
          <p>Houses must be built evenly across a complete color-group! You cannot construct a 2nd house on any property until every property in that set has at least 1 house. Similarly, you cannot build a 3rd house until all have 2 houses.</p>
          <div style="margin-top: 8px; font-size: 0.84rem; color: #fca5a5;">
            ⚠️ <strong>Mortgage Restriction:</strong> You cannot construct houses if ANY property in that color-group is mortgaged!
          </div>
        </div>

        <div class="rules-card">
          <div class="rules-card-title"><span class="icon-wrap gold-icon">${getIcon("HOTEL")}</span> <span>Hotels & Upgrades</span></div>
          <p>Once you hold 4 houses on every property in a color-group, you may turn in 4 houses to the Bank and pay the hotel price to construct a <strong>Hotel</strong>.</p>
          <p style="margin-top: 6px;">
            <span class="rules-badge-official">Hasbro Standard</span> Max 1 Hotel per lot.<br/>
            <span class="rules-badge-master" style="margin-top: 4px; display: inline-block;">Master Deluxe</span> Allows an optional 2nd "Grand Luxury Hotel" (Level 6) with a 50% rent premium!
          </p>
        </div>

        <div class="rules-card">
          <div class="rules-card-title"><span class="icon-wrap gold-icon">${getIcon("REFRESH")}</span> <span>Selling Buildings</span></div>
          <p>Houses and hotels may be sold back to the Bank at any time for <strong>half their purchase price (50%)</strong>. Selling must also be done evenly in reverse order across the color group.</p>
        </div>
      `,

      jail: `
        <div class="rules-card rules-card-gold">
          <div class="rules-card-title"><span class="icon-wrap gold-icon">${getIcon("JAIL")}</span> <span>Escaping from Jail</span></div>
          <p>While locked in Jail, you can get out using one of four official methods:</p>
          <ul style="padding-left: 20px; margin-top: 6px; display: flex; flex-direction: column; gap: 6px;">
            <li><strong>1. Roll Doubles:</strong> Attempt to roll matching dice on any of your next 3 turns. If successful, you escape free and immediately advance the rolled amount (no extra roll).</li>
            <li><strong>2. Pay Bail:</strong> Pay the bail fine ($${gameSettings.jailBailFee || 50}) before rolling on turn 1 or 2, then roll and move.</li>
            <li><strong>3. VIP Golden Ticket:</strong> Use a "Get Out of Jail Free" card (held or purchased from another tycoon).</li>
            <li><strong>4. Mandatory 3rd Turn Release:</strong> If you fail to roll doubles on your 3rd turn, you MUST pay the bail fine and advance the spaces shown on that throw.</li>
          </ul>
        </div>

        <div class="rules-card">
          <div class="rules-card-title"><span class="icon-wrap gold-icon">${getIcon("CHECK")}</span> <span>Actions Allowed While in Jail</span></div>
          <p>Even while serving time in Jail, players <strong>CAN</strong> continue to collect rent from opponents, build houses, trade properties, and arrange mortgages!</p>
        </div>
      `,

      finance: `
        <div class="rules-card rules-card-gold">
          <div class="rules-card-title"><span class="icon-wrap gold-icon">${getIcon("COIN")}</span> <span>Mortgages</span></div>
          <p>Any unimproved property can be mortgaged to the Bank for <strong>50% of its face value</strong>. All buildings on that color-group must be sold to the Bank at half price before mortgaging.</p>
          <div style="margin-top: 8px; font-size: 0.84rem;">
            <div>• Mortgaged properties collect <strong>$0 rent</strong> from opponents.</div>
            <div style="margin-top: 4px;">• Unmortgaging requires repaying the loan principal plus <strong>10% interest</strong> to the Bank.</div>
          </div>
        </div>

        <div class="rules-card">
          <div class="rules-card-title"><span class="icon-wrap gold-icon">${getIcon("HANDSHAKE")}</span> <span>Trading Properties</span></div>
          <p>Tycoons can propose private trades on their turn for any combination of properties, cash, and VIP escape cards.</p>
          <div style="margin-top: 8px; font-size: 0.84rem; color: #fca5a5;">
            ⚠️ <strong>Official Building Constraint:</strong> No property may be traded if any buildings stand on that color-group! All buildings must be sold to the Bank first.
          </div>
          <div style="margin-top: 8px; font-size: 0.84rem; color: #6ee7b7;">
            ✨ <strong>Deluxe Trade Feature:</strong> In Monopoly Master, mortgaged properties traded between players automatically have their mortgages cleared upon transfer so the buyer receives active deeds!
          </div>
        </div>
      `,

      variants: `
        <div class="rules-card rules-card-gold">
          <div class="rules-card-title"><span class="icon-wrap gold-icon">${getIcon("WARNING")}</span> <span>Bankruptcy & Liquidation</span></div>
          <p>If you owe more than your liquid assets can cover:
          <ul style="padding-left: 20px; margin-top: 6px; display: flex; flex-direction: column; gap: 6px;">
            <li><strong>Debt to Player:</strong> All cash, unencumbered properties, and escape cards are transferred to the creditor. Buildings are sold to Bank at 50% and cash given to the creditor.</li>
            <li><strong>Debt to Bank:</strong> The Bank seizes all assets and immediately auctions the properties to the highest bidders.</li>
          </ul>
          </p>
        </div>

        <div class="rules-card">
          <div class="rules-card-title"><span class="icon-wrap gold-icon">${getIcon("CLOCK")}</span> <span>Official Short Game (60-90 Mins)</span></div>
          <p>Official Hasbro rules include an abridged edition:</p>
          <ul style="padding-left: 20px; margin-top: 6px; display: flex; flex-direction: column; gap: 4px;">
            <li>1. Banker deals 3 random Title Deeds to each player for free during setup.</li>
            <li>2. Only 3 houses are required per lot before buying a Hotel.</li>
            <li>3. The match ends when the FIRST player goes bankrupt. Remaining players calculate their total net worth (cash + properties + buildings), and the wealthiest player is crowned champion!</li>
          </ul>
        </div>
      `
    };

    this.modalBody.innerHTML = `
      <div class="rules-hero-header">
        <img src="images/main-logo.webp" alt="Monopoly Master" class="rules-hero-logo" />
        <div class="rules-hero-text">
          <h2 class="rules-hero-title">OFFICIAL RULEBOOK & MASTER GUIDE</h2>
          <div class="rules-hero-sub">Standard Hasbro Ruleset & Monopoly Master Deluxe Regulations (${boardEditionLabel})</div>
        </div>
      </div>

      <div class="rules-tab-bar" id="rulesTabBar">
        <button class="rules-tab-btn active" data-tab="overview"><span class="icon-wrap">${getIcon("BOOK")}</span> Overview</button>
        <button class="rules-tab-btn" data-tab="corners"><span class="icon-wrap">${getIcon("DICE")}</span> Movement & Corners</button>
        <button class="rules-tab-btn" data-tab="properties"><span class="icon-wrap">${getIcon("LAUREL")}</span> Properties & Rent</button>
        <button class="rules-tab-btn" data-tab="houses"><span class="icon-wrap">${getIcon("HOUSE")}</span> Houses & Hotels</button>
        <button class="rules-tab-btn" data-tab="jail"><span class="icon-wrap">${getIcon("JAIL")}</span> Jail & Bail</button>
        <button class="rules-tab-btn" data-tab="finance"><span class="icon-wrap">${getIcon("HANDSHAKE")}</span> Mortgages & Trade</button>
        <button class="rules-tab-btn" data-tab="variants"><span class="icon-wrap">${getIcon("TROPHY")}</span> Bankruptcy & Variants</button>
      </div>

      <div class="rules-scroll-body" id="rulesScrollContent">
        ${sections.overview}
      </div>
    `;

    const tabBtns = this.modalBody.querySelectorAll(".rules-tab-btn");
    const contentEl = document.getElementById("rulesScrollContent");

    tabBtns.forEach((btn) => {
      btn.onclick = () => {
        tabBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const tabKey = btn.getAttribute("data-tab");
        if (contentEl && sections[tabKey]) {
          contentEl.innerHTML = sections[tabKey];
          contentEl.scrollTop = 0;
        }
      };
    });

    this.modalFooter.innerHTML = `<button class="btn-primary" id="closeRulesBtn" style="width: 100%; justify-content: center;">Understood, Let's Play!</button>`;
    document.getElementById("closeRulesBtn").onclick = () => this.closeModal();
    this.modalOverlay.classList.add("active");
  }
  closeModal(force = false) {
    if (
      !force &&
      this.isDebtModal &&
      (this.engine.getCurrentPlayer()?.cash < 0 ||
        this.getLocalPlayer()?.cash < 0)
    ) {
      sounds.playBuzzer();
      return;
    }
    if (this._onCardModalClose) {
      const cb = this._onCardModalClose;
      this._onCardModalClose = null;
      cb();
      return;
    }
    this.isDebtModal = false;
    this.isExitModal = false;
    this.clearModalTimer();
    this.isStartingSelector = false;
    if (this.closeModalCrossBtn) this.closeModalCrossBtn.style.display = "";
    this.isInspectModal = false;
    this.modalOverlay.classList.remove("active");
    if (this.modalCard)
      this.modalCard.classList.remove(
        "naked-modal",
        "setup-modal",
        "property-management-modal",
        "rules-modal",
        "exit-modal",
      );
  }
}
