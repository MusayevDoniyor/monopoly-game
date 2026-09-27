import {
  BOARD_TILES,
  COLOR_GROUPS,
  TILE_PROBABILITIES,
  gameSettings,
} from "./boardData.js?v=5.1";
import { sounds } from "./audio.js?v=5.1";
import { geminiAdvisor } from "./geminiAdvisor.js?v=5.1";
import { ICONS, TOKEN_KEYS, TOKEN_LABELS, getIcon } from "./icons.js?v=5.1";
import { ACHIEVEMENTS_LIST, achievements } from "./achievements.js?v=5.1";
import { particles } from "./particles.js?v=5.1";

const escapeHtml = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/\"/g, "&quot;")
  .replace(/'/g, "&#039;");

export class MonopolyUI {
  constructor(engine) {
    this.engine = engine;
    this.boardEl = document.getElementById("boardContainer");
    this.dice1El = document.getElementById("die1");
    this.dice2El = document.getElementById("die2");
    this.rollBtn = document.getElementById("rollDiceBtn");
    this.endTurnBtn = document.getElementById("endTurnBtn");
    this.managePropsBtn = document.getElementById("managePropsBtn");
    this.tradeBtn = document.getElementById("tradeBtn");
    this.editionTagEl = document.getElementById("editionTag");
    this.boardEditionSubtitleEl = document.getElementById("boardEditionSubtitle");
    this.boardRulesDescEl = document.getElementById("boardRulesDesc");

    this.turnPlayerNameEl = document.getElementById("turnPlayerName");
    this.turnPlayerTokenEl = document.getElementById("turnPlayerToken");
    this.turnStatusEl = document.getElementById("turnStatus");
    this.playersListEl = document.getElementById("playersList");
    this.logBoxEl = document.getElementById("logBox");

    // Menu Drawer
    this.menuDrawer = document.getElementById("menuDrawer");
    this.menuDrawerBackdrop = document.getElementById("menuDrawerBackdrop");
    this.gameMenuBtn = document.getElementById("gameMenuBtn");
    this.closeDrawerBtn = document.getElementById("closeDrawerBtn");

    // Modals
    this.modalOverlay = document.getElementById("modalOverlay");
    this.modalCard = this.modalOverlay.querySelector(".modal-card");
    this.modalTitle = document.getElementById("modalTitle");
    this.modalBody = document.getElementById("modalBody");
    this.modalFooter = document.getElementById("modalFooter");
    this.closeModalCrossBtn = document.getElementById("closeModalCrossBtn");

    this.tokenElements = {};
    this.showHeatmap = false;

    // Timers
    this.matchTimerBadge = document.getElementById("matchTimerBadge");
    this.matchTimerText = document.getElementById("matchTimerText");
    this.matchTimerIcon = document.getElementById("matchTimerIcon");

    this.turnTimerBadge = document.getElementById("turnTimerBadge");
    this.turnTimerIcon = document.getElementById("turnTimerIcon");
    this.turnTimerCount = document.getElementById("turnTimerCount");
    this.turnTimerBar = document.getElementById("turnTimerBar");

    this.initStaticIcons();
    this.bindDrawerEvents();
  }

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

    // HUD Titles
    setIcon("tycoonsTitleIcon", "USER");
    setIcon("logTitleIcon", "BOOK");
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

  getTileGridPosition(id) {
    const total = this.engine.getBoardLength();

    if (total === 36) {
      // 10x10 Grid (4 corners, 8 between each)
      if (id === 0) return { row: 10, col: 10 }; // START
      if (id >= 1 && id <= 8) return { row: 10, col: 10 - id }; // Bottom
      if (id === 9) return { row: 10, col: 1 }; // JAIL
      if (id >= 10 && id <= 17) return { row: 10 - (id - 9), col: 1 }; // Left
      if (id === 18) return { row: 1, col: 1 }; // FREE STOP
      if (id >= 19 && id <= 26) return { row: 1, col: 1 + (id - 18) }; // Top
      if (id === 27) return { row: 1, col: 10 }; // GO TO JAIL
      if (id >= 28 && id <= 35) return { row: 1 + (id - 27), col: 10 }; // Right
      return { row: 10, col: 10 };
    } else {
      // 11x11 Grid (40 tiles)
      if (id === 0) return { row: 11, col: 11 };
      if (id > 0 && id < 10) return { row: 11, col: 11 - id };
      if (id === 10) return { row: 11, col: 1 };
      if (id > 10 && id < 20) return { row: 11 - (id - 10), col: 1 };
      if (id === 20) return { row: 1, col: 1 };
      if (id > 20 && id < 30) return { row: 1, col: 1 + (id - 20) };
      if (id === 30) return { row: 1, col: 11 };
      if (id > 30 && id < 40) return { row: 1 + (id - 30), col: 11 };
      return { row: 11, col: 11 };
    }
  }

  toggleHeatmap() {
    this.showHeatmap = !this.showHeatmap;
    this.boardEl.classList.toggle("show-heatmap", this.showHeatmap);
    const titleEl = document.getElementById("heatmapDrawerTitle");
    if (titleEl) {
      titleEl.innerText = this.showHeatmap
        ? "Heatmap: ACTIVE"
        : "Strategic Heatmap";
    }
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
    const wheelStops = players.map((player, index) => {
      const start = (index * segmentAngle).toFixed(2);
      const end = ((index + 1) * segmentAngle).toFixed(2);
      const color = safePlayerColor(player.color);
      return `${color} ${start}deg ${end}deg`;
    }).join(", ");

    const tokenMarkup = players.map((player, index) => {
      const angle = segmentAngle * index - 90;
      const radius = count === 2 ? 34 : 38;
      const x = 50 + Math.cos(angle * Math.PI / 180) * radius;
      const y = 50 + Math.sin(angle * Math.PI / 180) * radius;
      const playerColor = safePlayerColor(player.color);
      return `
        <div class="start-selector-token" data-player-index="${index}" style="left: ${x}%; top: ${y}%; --player-color: ${playerColor};">
          <div class="start-selector-token-icon">${getIcon(player.token || "TOP_HAT")}</div>
          <span>${escapeHtml(player.name)}</span>
        </div>
      `;
    }).join("");

    this.modalBody.innerHTML = `
      <div class="starting-player-selector">
        <div class="selector-subtitle">The wheel will choose who rolls first.</div>
        <div class="selector-arena selector-count-${count}">
          <div class="selector-wheel" id="selectorWheel" style="--segment-angle: ${segmentAngle.toFixed(2)}deg; --wheel-gradient: conic-gradient(from -90deg, ${wheelStops});">
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
    const status = document.getElementById("startingSelectorStatus");
    const winnerToken = this.modalBody.querySelector(`[data-player-index="${winnerIndex}"]`);
    const totalRotation = 360 * 5 - segmentAngle * winnerIndex;

    requestAnimationFrame(() => {
      if (arena) arena.classList.add("is-spinning");
      if (wheel) wheel.style.transform = `rotate(${totalRotation}deg)`;
    });

    window.setTimeout(() => {
      arena?.classList.remove("is-spinning");
      winnerToken?.classList.add("winner");
      if (status) status.innerHTML = `<strong style="color: var(--gold);">${escapeHtml(players[winnerIndex].name)}</strong> will roll first!`;
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

  getHeatmapColor(prob) {
    if (prob >= 3.2) return "rgba(239, 68, 68, 0.9)";
    if (prob >= 2.8) return "rgba(245, 158, 11, 0.9)";
    if (prob >= 2.4) return "rgba(234, 179, 8, 0.9)";
    return "rgba(59, 130, 246, 0.85)";
  }

  renderBoard() {
    const total = this.engine.getBoardLength();
    this.boardEl.className = `board-container ${total === 36 ? "grid-10" : "grid-11"}`;

    if (this.editionTagEl) {
      this.editionTagEl.innerText = `${gameSettings.boardTheme === "classic" ? "Classic Atlantic" : "World Mega-Cities"} (${total} Tiles)`;
    }
    const editionLabel = total === 40 ? "Classic 40-Tile Rules" : "World 36-Tile Rules";
    if (this.boardEditionSubtitleEl) this.boardEditionSubtitleEl.innerText = editionLabel;
    if (this.boardRulesDescEl) {
      this.boardRulesDescEl.innerText = total === 40
        ? "40-tile classic layout, $150 bail, official railroad rents"
        : "36-tile world layout, $150 bail, linear station rents";
    }

    // Clean existing tiles
    const existingTiles = this.boardEl.querySelectorAll(".tile");
    existingTiles.forEach((el) => el.remove());

    BOARD_TILES.forEach((tile) => {
      const tileEl = document.createElement("div");
      tileEl.className = "tile";
      tileEl.id = `tile-${tile.id}`;

      const { row, col } = this.getTileGridPosition(tile.id);
      tileEl.style.gridRow = row;
      tileEl.style.gridColumn = col;

      const maxDim = total === 36 ? 10 : 11;
      if (row === maxDim && col > 1 && col < maxDim)
        tileEl.classList.add("tile-bottom");
      else if (row === 1 && col > 1 && col < maxDim)
        tileEl.classList.add("tile-top");
      else if (col === 1 && row > 1 && row < maxDim)
        tileEl.classList.add("tile-left");
      else if (col === maxDim && row > 1 && row < maxDim)
        tileEl.classList.add("tile-right");
      else tileEl.classList.add("corner");

      let innerHTML = "";

      if (tile.type === "property") {
        const group = COLOR_GROUPS[tile.group];
        innerHTML += `
          <div class="color-bar" style="background-color: ${group?.hex || "#333"};">
            <div class="house-container" id="houses-${tile.id}"></div>
          </div>
          <div class="tile-content">
            ${tile.country ? `<div class="tile-country">${tile.country}</div>` : ""}
            <div class="tile-name">${tile.name}</div>
            <div class="tile-price">$${tile.price}</div>
          </div>
        `;
      } else if (tile.id === 0) {
        tileEl.classList.add("corner-start");
        innerHTML = `
          <div class="tile-name" style="font-size: 1.15rem; color: #dc2626; font-weight: 900;">${tile.name}</div>
          <div class="start-arrow-svg">${getIcon("START_ARROW")}</div>
          <div style="font-size: 0.64rem; font-weight: 900; color: #166534;">COLLECT $${gameSettings.goReward}</div>
        `;
      } else if (tile.name.includes("JAIL") && !tile.name.includes("GO TO")) {
        tileEl.classList.add("corner-jail");
        innerHTML = `
          <div class="just-visiting-tag bottom">JAIL</div>
          <div class="just-visiting-tag left">JAIL</div>
          <div class="jail-cell">
            <div class="jail-cell-icon">${getIcon("JAIL")}</div>
            <div>IN JAIL</div>
            <div style="font-size: 0.55rem;">Bail: $${gameSettings.jailBailFee}</div>
          </div>
        `;
      } else if (tile.name.includes("FREE")) {
        tileEl.classList.add("corner-free-parking");
        innerHTML = `
          <div class="free-parking-art" aria-label="Free Parking">
            <div class="free-parking-title">FREE<br>PARKING</div>
            <div class="free-parking-chip">$</div>
            <div class="free-parking-caption">NO FEE</div>
          </div>
        `;
      } else if (tile.name.includes("SAFE") || (this.engine.getBoardLength() === 36 && tile.id === 18)) {
        tileEl.classList.add("corner-safe-zone");
        innerHTML = `
          <div class="safe-zone-wrapper">
            <img src="images/safe-zone.webp" alt="Free Parking" class="safe-zone-img" loading="lazy" decoding="async" />
          </div>
        `;
      } else if (tile.name.includes("GO TO JAIL")) {
        innerHTML = `
          <div class="tile-content" style="gap: 5px;">
            <div class="tile-icon-svg" style="color: #dc2626; width: auto; height: auto; font-size: 1.8rem; line-height: 1;">${getIcon("POLICE")}</div>
            <div class="tile-name" style="color: #dc2626; font-size: 0.75rem; font-weight: 900; line-height: 1;">GO TO<br>JAIL</div>
          </div>
        `;
      } else if (tile.type === "chance" || tile.type === "community-chest") {
        const eventClass = tile.type === "chance" ? "event-tile-chance" : "event-tile-chest";
        innerHTML = `
          <div class="tile-content event-tile ${eventClass}">
            <div class="tile-name event-tile-name">${tile.name}</div>
            <div class="tile-subtext event-tile-subtext">${tile.subtext || ""}</div>
          </div>
        `;
      } else {
        const iconSvg = getIcon(tile.iconKey || "DIAMOND");
        innerHTML = `
          <div class="tile-content">
            <div class="tile-icon-svg">${iconSvg}</div>
            <div class="tile-name">${tile.name}</div>
            ${tile.price ? `<div class="tile-price">$${tile.price}</div>` : ""}
            ${tile.amount ? `<div class="tile-price">PAY $${tile.amount}</div>` : ""}
            ${tile.subtext ? `<div class="tile-subtext">${tile.subtext}</div>` : ""}
          </div>
        `;
      }

      // Owner Ribbon Indicator
      innerHTML += `<div class="tile-owner-indicator" id="owner-indicator-${tile.id}"></div>`;

      // Heatmap badge
      const prob = TILE_PROBABILITIES[tile.id] || 2.7;
      innerHTML += `
        <div class="heatmap-badge" style="background-color: ${this.getHeatmapColor(prob)};">
          ${prob.toFixed(1)}%
        </div>
      `;

      innerHTML += `<div class="tokens-container" id="tokens-${tile.id}"></div>`;
      tileEl.innerHTML = innerHTML;

      tileEl.addEventListener("click", () => {
        if (
          tile.type === "property" ||
          tile.type === "railroad" ||
          tile.type === "utility"
        ) {
          this.showDeedModal(tile.id);
        }
      });

      this.boardEl.appendChild(tileEl);
    });
  }

  initTokens() {
    this.tokenElements = {};
    this.engine.players.forEach((player) => {
      const tokenEl = document.createElement("div");
      tokenEl.className = "player-token";
      tokenEl.id = `token-${player.id}`;
      tokenEl.style.backgroundColor = player.color;
      tokenEl.innerHTML = getIcon(player.token || "TOP_HAT");
      tokenEl.title = player.name;

      this.tokenElements[player.id] = tokenEl;
      const targetContainer = document.getElementById(
        `tokens-${player.position}`,
      );
      if (targetContainer) targetContainer.appendChild(tokenEl);
    });
  }

  async animateMovement(player, targetPos, onFinish, backwards = false, startPosOverride = null) {
    const startPos = Number.isInteger(startPosOverride) ? startPosOverride : player.position;
    const total = this.engine.getBoardLength();
    const tokenEl = this.tokenElements[player.id];

    if (!tokenEl || startPos === targetPos) {
      if (onFinish) onFinish();
      return;
    }

    tokenEl.classList.add("moving");

    if (backwards) {
      const totalSteps = (startPos - targetPos + total) % total;
      let current = startPos;
      for (let i = 0; i < totalSteps; i++) {
        current = (current - 1 + total) % total;
        const container = document.getElementById(`tokens-${current}`);
        if (container) {
          container.appendChild(tokenEl);
          sounds.playStep(player);
        }
        await new Promise((r) => setTimeout(r, 260));
      }
    } else {
      const totalSteps = (targetPos - startPos + total) % total;
      let current = startPos;
      for (let i = 0; i < totalSteps; i++) {
        current = (current + 1) % total;
        const container = document.getElementById(`tokens-${current}`);
        if (container) {
          container.appendChild(tokenEl);
          sounds.playStep(player);
        }
        // Smooth eased movement: start fast, slow down at end (like real board game piece sliding)
        const progress = i / totalSteps;
        const baseDelay = 240;
        const easeDelay = baseDelay + Math.floor(progress * 160);
        await new Promise((r) => setTimeout(r, easeDelay));
      }
    }

    // Brief dramatic pause on landing tile
    await new Promise((r) => setTimeout(r, 300));

    tokenEl.classList.remove("moving");
    player.position = targetPos;
    if (onFinish) onFinish();
  }

  renderDice(d1, d2, rolling = false) {
    if (!this.dice1El || !this.dice2El) return;

    const scene1 = document.getElementById("dieScene1");
    const scene2 = document.getElementById("dieScene2");

    if (rolling) {
      this.dice1El.classList.remove("dice-settle");
      this.dice2El.classList.remove("dice-settle");
      this.dice1El.classList.add("rolling-3d-1");
      this.dice2El.classList.add("rolling-3d-2");
      if (scene1) scene1.classList.add("rolling");
      if (scene2) scene2.classList.add("rolling");
      return;
    }

    this.dice1El.classList.remove("rolling-3d-1");
    this.dice2El.classList.remove("rolling-3d-2");
    if (scene1) scene1.classList.remove("rolling");
    if (scene2) scene2.classList.remove("rolling");

    const DICE_ROTATIONS = {
      1: { x: 0, y: 0 },
      2: { x: -90, y: 0 },
      3: { x: 0, y: -90 },
      4: { x: 0, y: 90 },
      5: { x: 90, y: 0 },
      6: { x: 0, y: 180 },
    };

    const rot1 = DICE_ROTATIONS[d1] || DICE_ROTATIONS[1];
    const rot2 = DICE_ROTATIONS[d2] || DICE_ROTATIONS[1];

    this.dice1El.style.setProperty(
      "--target-rot",
      `rotateX(${rot1.x}deg) rotateY(${rot1.y}deg)`
    );
    this.dice2El.style.setProperty(
      "--target-rot",
      `rotateX(${rot2.x}deg) rotateY(${rot2.y}deg)`
    );

    // Realistic bounce and settle impact
    this.dice1El.classList.add("dice-settle");
    this.dice2El.classList.add("dice-settle");
    setTimeout(() => {
      this.dice1El?.classList.remove("dice-settle");
      this.dice2El?.classList.remove("dice-settle");
    }, 450);
  }

  renderDiePips(dieEl, val) {
    // Retained for backward compatibility
  }

  updateBoardState() {
    BOARD_TILES.forEach((tile) => {
      const tileState = this.engine.board[tile.id];
      const tileEl = document.getElementById(`tile-${tile.id}`);
      if (!tileEl) return;

      // Update Owner Empire Indicator Ribbon
      const ownerIndicator = document.getElementById(
        `owner-indicator-${tile.id}`,
      );
      if (ownerIndicator) {
        if (tileState && tileState.owner !== null) {
          const owner = this.engine.players[tileState.owner];
          if (owner) {
            ownerIndicator.style.display = "flex";
            ownerIndicator.style.backgroundColor = owner.color;
            ownerIndicator.innerHTML = getIcon(
              owner.token || "TOP_HAT",
              "owner-icon-svg",
            );
            ownerIndicator.title = `Owned by ${owner.name}`;
          }
        } else {
          ownerIndicator.style.display = "none";
          ownerIndicator.innerHTML = "";
        }
      }

      // Mortgage Stripe
      let mortgageStripe = tileEl.querySelector(".mortgage-stripe");
      if (tileState?.mortgaged) {
        if (!mortgageStripe) {
          mortgageStripe = document.createElement("div");
          mortgageStripe.className = "mortgage-stripe";
          tileEl.appendChild(mortgageStripe);
        }
      } else if (mortgageStripe) {
        mortgageStripe.remove();
      }

      // Houses / Hotel Markers
      const housesContainer = document.getElementById(`houses-${tile.id}`);
      if (housesContainer) {
        housesContainer.innerHTML = "";
        if (tileState?.houses === 6) {
          const hotel1 = document.createElement("div");
          hotel1.className = "hotel-marker";
          hotel1.title = "1-Hotel";
          const hotel2 = document.createElement("div");
          hotel2.className = "hotel-marker";
          hotel2.style.borderColor = "#fbbf24";
          hotel2.style.boxShadow = "0 0 6px rgba(251,191,36,0.8)";
          hotel2.title = "2-Hotel (Grand Luxury)";
          housesContainer.appendChild(hotel1);
          housesContainer.appendChild(hotel2);
        } else if (tileState?.houses === 5) {
          const hotel = document.createElement("div");
          hotel.className = "hotel-marker";
          hotel.title = "1-Hotel";
          housesContainer.appendChild(hotel);
        } else if (tileState) {
          for (let i = 0; i < tileState.houses; i++) {
            const house = document.createElement("div");
            house.className = "house-marker";
            house.title = `House ${i + 1}`;
            housesContainer.appendChild(house);
          }
        }
      }
    });

    // Ensure all player tokens are physically in the container of their current position
    this.engine.players.forEach((p) => {
      const tokenEl = this.tokenElements?.[p.id];
      const container = document.getElementById(`tokens-${p.position}`);
      if (tokenEl && container && tokenEl.parentElement !== container) {
        tokenEl.classList.remove("moving");
        container.appendChild(tokenEl);
      }
    });
  }

  updateHUD() {
    const current = this.engine.getCurrentPlayer();
    if (current) {
      this.turnPlayerNameEl.innerText = current.name;
      this.turnPlayerTokenEl.innerHTML = getIcon(current.token || "TOP_HAT");
      this.turnPlayerTokenEl.style.borderColor = current.color;
      this.turnPlayerTokenEl.style.backgroundColor = `${current.color}25`;

      const isRolling = !!(this.app?._isRollingAnimation);
      const isOnline = !!this.app?.multiplayer?.isOnline;
      const isLocalTurn = !isOnline || this.app.multiplayer.localPlayerId === current.id;

      if (this.engine.gameOver) {
        this.turnStatusEl.innerText = `Champion: ${this.engine.winner?.name || "Game Over"}`;
        this.rollBtn.disabled = true;
        this.endTurnBtn.disabled = true;
      } else if (!isLocalTurn) {
        const actionDesc = this.engine.currentTurn?.awaitingActionDesc;
        if (actionDesc?.type === 'buy_prompt') {
          this.turnStatusEl.innerText = `${current.name} is deciding whether to buy ${actionDesc.tileName || 'Property'} ($${actionDesc.tilePrice || ''})...`;
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
      if (rollIcon && (!rollIcon.innerHTML || rollIcon.innerText === "Roll Dice")) {
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

      // Calculate Net Worth
      let netWorth = p.cash;
      props.forEach((prop) => {
        netWorth += prop.price || 0;
        const st = this.engine.board[prop.id];
        if (st && st.houses) {
          netWorth += st.houses * (prop.houseCost || 50);
        }
      });

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
          <div class="player-cash-badge" style="${p.cash < 0 ? 'color: #ef4444; border-color: #ef4444; background: rgba(239,68,68,0.18);' : ''}">
            <span class="icon-wrap" style="width: 1.1rem; height: 1.1rem; color: ${p.cash < 0 ? '#ef4444' : '#34d399'};">${getIcon("COIN")}</span>
            <span>$${p.cash}</span>
          </div>
        </div>

        <div class="player-stats-subrow">
          <span>Net Worth: <strong>$${netWorth}</strong></span>
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

    // Logs
    this.logBoxEl.innerHTML = "";
    this.engine.logs.forEach((log) => {
      const row = document.createElement("div");
      row.className = `log-entry ${log.type}`;
      const time = document.createElement("span");
      time.className = "log-time";
      time.textContent = `[${log.time}]`;
      const text = document.createElement("span");
      text.textContent = ` ${log.text}`;
      row.append(time, text);
      this.logBoxEl.appendChild(row);
    });

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
        ? (tile.rent || [25, 50, 100, 200])
        : [bRent, bRent + sRent, bRent + sRent * 2, bRent + sRent * 3];
      const stationLabel = isClassicBoard ? "Railroads" : "Airports / Stations";
      return `
        <div class="deed-card-view">
          ${closeBtnHTML}
          <div class="deed-silhouette-icon">${getIcon(tile.iconKey || "PLANE")}</div>
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
    if (this.app?.multiplayer?.isOnline && this.app.multiplayer.localPlayerId !== null && this.app.multiplayer.localPlayerId !== undefined) {
      return this.engine.players[this.app.multiplayer.localPlayerId] || this.engine.getCurrentPlayer();
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
    const owner = state && state.owner !== null && state.owner !== undefined ? this.engine.players[state.owner] : null;
    const viewerPlayer = this.getLocalPlayer();

    let floatingActionsHTML = "";

    if (!owner) {
      // Unowned: purely inspecting. No action buttons, pure authentic card!
      floatingActionsHTML = "";
    } else if (viewerPlayer && owner.id === viewerPlayer.id) {
      // Owned by viewer (You): ALWAYS show "You own this property" & "Manage Property".
      // NEVER show "Propose Trade" against yourself!
      floatingActionsHTML = `
        <div class="deed-floating-bar">
          <div class="deed-owner-pill" style="border-color: var(--gold); background: rgba(212, 175, 55, 0.12);">
            <span class="icon-wrap gold-icon" style="width: 16px; height: 16px;">${getIcon("STAR")}</span>
            <span style="color: var(--gold-light);">You own this property</span>
            ${state?.mortgaged ? '<span style="color: #ef4444; font-size: 0.75rem; margin-left: 4px;">(MORTGAGED)</span>' : ''}
          </div>
          <div class="deed-actions-row">
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
            ${state?.mortgaged ? '<span style="color: #ef4444; font-size: 0.75rem; margin-left: 4px;">(MORTGAGED)</span>' : ''}
          </div>
          <div class="deed-actions-row">
            <button class="btn-trade" id="deedTradeActionBtn" ${this.engine.gameOver || viewerPlayer?.bankrupt ? 'disabled' : ''}>
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
          this.showTradeModal(viewerPlayer, null, owner.id, tile.id);
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

    document.getElementById("confirmBuyBtn").onclick = () => {
      this.closeModal();
      onBuy();
    };
    document.getElementById("passBuyBtn").onclick = () => {
      this.closeModal();
      onPass();
    };

    const crossBtn = document.getElementById("deedCloseCrossBtn");
    if (crossBtn) {
      crossBtn.onclick = () => {
        this.closeModal();
        onPass();
      };
    }

    const timerSec = gameSettings.approvalTimerSeconds || 15;
    this.startModalTimer(
      timerSec,
      () => {
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

    this.modalTitle.innerHTML = `<span class="icon-wrap gold-icon">${getIcon(iconKey)}</span> <span>${isChance ? "SURPRISE CHANCE" : "LUCKY CHEST"}</span>`;

    this.modalBody.innerHTML = `
      <div class="luxury-card-scene">
        <div class="luxury-card ${isChance ? "card-chance" : "card-chest"}">
          <button class="deed-card-close" id="cardCloseCrossBtn" title="Close">✕</button>
          <div class="card-inner-frame">
            <div class="card-top-row">
              <span class="card-deck-tag">${isChance ? "SURPRISE CHANCE" : "LUCKY CHEST"}</span>
              <span class="card-cat-pill ${cat}">${card.category || "EVENT"}</span>
            </div>

            <div class="card-title-banner">
              <h3>${card.title || (isChance ? "FATE STRIKES" : "TREASURY ORDER")}</h3>
            </div>

            <div class="card-art-container">
              ${getIcon(iconKey)}
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

    this.startModalTimer(
      10,
      handleContinue,
      "Auto-continue in",
    );

    this.isInspectModal = true;
    this.modalOverlay.classList.add("active");
  }

  showPropertyManagementModal(player) {
    this.modalTitle.innerHTML = `<span class="icon-wrap gold-icon">${getIcon("HOUSE")}</span> <span>Property & Building Management: ${player.name}</span>`;
    const props = this.engine.getPlayerProperties(player.id);

    if (props.length === 0) {
      this.modalBody.innerHTML = `<div style="text-align: center; color: #94a3b8; padding: 28px;">You don't own any properties yet.</div>`;
      this.modalFooter.innerHTML = `<button class="btn-primary" id="closeManageBtn">Close</button>`;
      document.getElementById("closeManageBtn").onclick = () => this.closeModal();
      this.modalOverlay.classList.add("active");
      return;
    }

    // Group properties by their color group or category
    const grouped = {};
    props.forEach(tile => {
      const gKey = tile.group || 'OTHER';
      if (!grouped[gKey]) grouped[gKey] = [];
      grouped[gKey].push(tile);
    });

    let html = `
      <div style="display: flex; flex-direction: column; gap: 12px; max-height: 480px; overflow-y: auto; padding-right: 6px;">
        <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.35); padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); flex-wrap: wrap; gap: 6px;">
          <div style="font-size: 0.85rem; color: #cbd5e1;">Funds: <strong style="color: var(--gold); font-family: var(--font-mono); font-size: 0.95rem;">$${player.cash}</strong></div>
          <div style="font-size: 0.8rem; color: #94a3b8;">
            Bank Inventory: <strong style="color: #34d399;">${this.engine.bank.houses}</strong> houses, <strong style="color: #f87171;">${this.engine.bank.hotels}</strong> hotels remaining
          </div>
        </div>
        <div id="mgmtNoticeBanner" style="display: none; padding: 10px 14px; border-radius: 8px; font-size: 0.85rem; font-weight: 600; line-height: 1.4;"></div>
    `;

    Object.keys(grouped).forEach(groupKey => {
      const groupTiles = grouped[groupKey];
      const groupConfig = COLOR_GROUPS[groupKey];
      const isMonopoly = this.engine.hasMonopoly(player.id, groupKey);
      const allCategoryTiles = BOARD_TILES.filter(t => t.group === groupKey);
      const isDevelopable = groupTiles[0].type === 'property';

      html += `
        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; overflow: hidden;">
          <div style="background: rgba(0,0,0,0.35); border-left: 6px solid ${groupConfig?.hex || '#64748b'}; padding: 8px 14px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;">
            <div style="font-weight: 800; font-size: 0.88rem; color: #f8fafc; display: flex; align-items: center; gap: 6px;">
              <span>${groupConfig?.name || groupKey}</span>
              <span style="font-size: 0.76rem; color: #94a3b8; font-weight: 600;">(${groupTiles.length}/${allCategoryTiles.length})</span>
            </div>
            <div>
              ${isDevelopable ? (
                isMonopoly
                  ? '<span style="background: rgba(16,185,129,0.2); color: #34d399; border: 1px solid rgba(16,185,129,0.4); padding: 2px 8px; border-radius: 6px; font-size: 0.72rem; font-weight: 800;">⭐ FULL MONOPOLY (Building Allowed)</span>'
                  : `<span style="background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.3); padding: 2px 8px; border-radius: 6px; font-size: 0.72rem; font-weight: 700;">⚠️ Incomplete (${groupTiles.length}/${allCategoryTiles.length}) — Cannot Build</span>`
              ) : '<span style="background: rgba(56,189,248,0.15); color: #38bdf8; border: 1px solid rgba(56,189,248,0.3); padding: 2px 8px; border-radius: 6px; font-size: 0.72rem; font-weight: 700;">Commercial Property</span>'}
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px; padding: 10px 12px;">
      `;

      groupTiles.forEach(tile => {
        const state = this.engine.board[tile.id];
        const rent = this.engine.calculateRent(tile.id);
        const canSell = this.engine.canSellHouse(player.id, tile.id);
        const canMort = this.engine.canMortgage(player.id, tile.id);
        const canUnmort = this.engine.canUnmortgage(player.id, tile.id);

        let levelBadge = '';
        if (tile.type === 'property') {
          if (state.houses === 0) {
            levelBadge = '<span style="color: #94a3b8; font-size: 0.78rem;">No Houses (0/4)</span>';
          } else if (state.houses >= 1 && state.houses <= 3) {
            levelBadge = `<span style="color: #38bdf8; font-size: 0.78rem; font-weight: 700;">🏠 ${state.houses}/4 Houses</span>`;
          } else if (state.houses === 4) {
            levelBadge = '<span style="color: #fbbf24; font-size: 0.78rem; font-weight: 800;">⭐ 4/4 Houses (Ready for Hotel!)</span>';
          } else if (state.houses === 5) {
            levelBadge = '<span style="color: #f87171; font-size: 0.78rem; font-weight: 800;">🏨 1 Hotel</span>';
          } else if (state.houses === 6) {
            levelBadge = '<span style="color: #f59e0b; font-size: 0.78rem; font-weight: 900;">👑 2 Hotels (MAX LEVEL)</span>';
          }
        } else {
          levelBadge = '<span style="color: #94a3b8; font-size: 0.78rem;">Commercial</span>';
        }

        if (state.mortgaged) {
          levelBadge += ' • <span style="color: #ef4444; font-weight: 800; font-size: 0.78rem;">🔒 Mortgaged</span>';
        }

        html += `
          <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 10px 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <div>
              <div style="font-weight: 800; font-size: 0.94rem; color: #fff;">${tile.name}</div>
              <div style="margin-top: 3px; display: flex; align-items: center; gap: 8px;">
                ${levelBadge}
                <span style="color: #64748b; font-size: 0.76rem;">•</span>
                <span style="color: #34d399; font-size: 0.78rem; font-family: var(--font-mono); font-weight: 700;">Rent: $${rent}</span>
              </div>
            </div>

            <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
        `;

        if (tile.type === 'property') {
          // 1. House Construction Button (if < 4 houses)
          if (state.houses < 4) {
            html += `
              <button class="btn-secondary" style="padding: 6px 10px; font-size: 0.78rem; font-weight: 700;" id="build-house-${tile.id}" ${!isMonopoly ? 'title="Monopoly Required"' : ''}>
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
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;
    });

    html += `</div>`;
    this.modalBody.innerHTML = html;
    this.modalFooter.innerHTML = `<button class="btn-primary" id="closeManageBtn">Done (Close)</button>`;

    const showNotice = (msg, isError = true) => {
      const banner = document.getElementById("mgmtNoticeBanner");
      if (banner) {
        banner.style.display = "block";
        banner.style.background = isError ? "rgba(239, 68, 68, 0.2)" : "rgba(16, 185, 129, 0.2)";
        banner.style.border = isError ? "1px solid #ef4444" : "1px solid #10b981";
        banner.style.color = isError ? "#fca5a5" : "#6ee7b7";
        banner.innerHTML = msg;
        banner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    };

    // Bind event handlers
    props.forEach(tile => {
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
          this.showPropertyManagementModal(player);
        };
      }

      // Hotel attempt when < 4 houses
      const attemptBtn = document.getElementById(`build-hotel-attempt-${tile.id}`);
      if (attemptBtn) {
        attemptBtn.onclick = () => {
          const state = this.engine.board[tile.id];
          sounds.playBuzzer();
          if (!this.engine.hasMonopoly(player.id, tile.group)) {
            showNotice(`⚠️ Denied: You must own all properties in the ${tile.group} group (Monopoly) to build a Hotel!`, true);
          } else {
            showNotice(`⚠️ Denied: You must build 4 houses on this property before building a Hotel! (Currently: ${state.houses}/4 houses)`, true);
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
          this.showPropertyManagementModal(player);
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
          this.showPropertyManagementModal(player);
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
          this.showPropertyManagementModal(player);
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
          this.showPropertyManagementModal(player);
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
          this.showPropertyManagementModal(player);
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
      const propsWithHouses = this.engine.getPlayerProperties(player.id)
        .filter(p => this.engine.board[p.id]?.houses > 0);

      // 2. Properties that can be mortgaged
      const propsCanMortgage = this.engine.getPlayerProperties(player.id)
        .filter(p => this.engine.canMortgage(player.id, p.id));

      const totalLiquidatable = this.engine.getLiquidatableAssets(player.id);
      const canEverClear = (player.cash + totalLiquidatable) >= 0;

      let html = `
        <div style="display: flex; flex-direction: column; gap: 14px; max-height: 480px; overflow-y: auto; padding-right: 4px;">
          
          <div style="background: ${isCleared ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}; border: 1.5px solid ${isCleared ? '#10b981' : '#ef4444'}; border-radius: 12px; padding: 14px 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
              <div>
                <div style="font-size: 0.78rem; text-transform: uppercase; font-weight: 800; color: ${isCleared ? '#34d399' : '#fca5a5'};">
                  ${isCleared ? 'Debt Cleared' : 'Insolvency Notice'}
                </div>
                <div style="font-size: 1.35rem; font-weight: 900; font-family: var(--font-mono); color: ${isCleared ? '#34d399' : '#ef4444'}; margin-top: 2px;">
                  ${isCleared ? `Current Balance: +$${player.cash}` : `Deficit Owed: -$${deficit}`}
                </div>
              </div>
              <div style="text-align: right; font-size: 0.8rem; color: #cbd5e1;">
                ${isCleared
                  ? '<span style="color: #34d399; font-weight: 800;">✓ Ready to continue turn</span>'
                  : `Liquidatable Value: <strong style="color: var(--gold);">$${totalLiquidatable}</strong>`}
              </div>
            </div>
            <div style="font-size: 0.82rem; color: #cbd5e1; margin-top: 8px; line-height: 1.45;">
              ${isCleared
                ? 'Your balance is now non-negative. You have satisfied your obligations and may continue your turn.'
                : 'Under Monopoly rules, you cannot remain in debt. Sell houses back to the bank for a 50% refund or mortgage unencumbered properties to raise the required cash.'}
            </div>
          </div>

          <!-- Section 1: Sell Houses & Hotels -->
          <div>
            <div style="font-weight: 800; font-size: 0.88rem; color: #fff; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
              <span class="icon-wrap gold-icon" style="width: 16px; height: 16px;">${getIcon("HOUSE")}</span>
              <span>1. Sell Houses & Hotels to Bank (50% Refund)</span>
            </div>
            ${propsWithHouses.length === 0
              ? '<div style="background: rgba(255,255,255,0.03); border: 1px dashed rgba(255,255,255,0.1); border-radius: 8px; padding: 12px; font-size: 0.82rem; color: #94a3b8; text-align: center;">No houses or hotels currently built to sell.</div>'
              : `
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  ${propsWithHouses.map(p => {
                    const st = this.engine.board[p.id];
                    const canSell = this.engine.canSellHouse(player.id, p.id);
                    const refund = Math.floor(p.houseCost / 2);
                    const levelLabel = st.houses === 6 ? '2nd Hotel' : st.houses === 5 ? '1 Hotel' : `${st.houses} Houses`;
                    return `
                      <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; gap: 10px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                          <div style="width: 8px; height: 28px; border-radius: 4px; background: ${COLOR_GROUPS[p.group]?.hex || '#fff'};"></div>
                          <div>
                            <div style="font-weight: 800; font-size: 0.88rem; color: #fff;">${p.name}</div>
                            <div style="font-size: 0.75rem; color: #94a3b8;">${levelLabel} • House Cost: $${p.houseCost}</div>
                          </div>
                        </div>
                        <button class="btn-sell-house-debt" data-tile-id="${p.id}" ${!canSell ? 'disabled title="Even building rule: sell highest house in group first"' : ''} style="background: #e11d48; color: #fff; border: none; font-weight: 800; font-size: 0.8rem; padding: 7px 12px; border-radius: 6px; cursor: ${canSell ? 'pointer' : 'not-allowed'}; opacity: ${canSell ? '1' : '0.5'};">
                          Sell 1 House (+ $${refund})
                        </button>
                      </div>
                    `;
                  }).join('')}
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
            ${propsCanMortgage.length === 0
              ? '<div style="background: rgba(255,255,255,0.03); border: 1px dashed rgba(255,255,255,0.1); border-radius: 8px; padding: 12px; font-size: 0.82rem; color: #94a3b8; text-align: center;">No eligible properties available to mortgage (must sell all houses in group first).</div>'
              : `
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  ${propsCanMortgage.map(p => `
                    <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; gap: 10px;">
                      <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 8px; height: 28px; border-radius: 4px; background: ${COLOR_GROUPS[p.group]?.hex || '#fff'};"></div>
                        <div>
                          <div style="font-weight: 800; font-size: 0.88rem; color: #fff;">${p.name}</div>
                          <div style="font-size: 0.75rem; color: #94a3b8;">Mortgage Value: $${p.mortgage}</div>
                        </div>
                      </div>
                      <button class="btn-mortgage-debt" data-tile-id="${p.id}" style="background: #d97706; color: #fff; border: none; font-weight: 800; font-size: 0.8rem; padding: 7px 12px; border-radius: 6px; cursor: pointer;">
                        Mortgage (+ $${p.mortgage})
                      </button>
                    </div>
                  `).join('')}
                </div>
              `
            }
          </div>

        </div>
      `;

      this.modalBody.innerHTML = html;

      // Bind liquidation buttons
      this.modalBody.querySelectorAll(".btn-sell-house-debt").forEach(btn => {
        btn.onclick = () => {
          const tId = parseInt(btn.getAttribute("data-tile-id"), 10);
          this.engine.sellHouse(player.id, tId);
          this.updateBoardState();
          this.updateHUD();
          if (this.app?.syncGameState) this.app.syncGameState();
          renderDebtBody();
        };
      });

      this.modalBody.querySelectorAll(".btn-mortgage-debt").forEach(btn => {
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

  showTradeModal(currentPlayer, onTradeConfirmed, preselectedTargetPlayerId, preselectedPropId) {
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
    if (preselectedTargetPlayerId !== undefined && preselectedTargetPlayerId !== null) {
      const found = otherPlayers.find((p) => p.id === preselectedTargetPlayerId);
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

    const tradeCb = onTradeConfirmed || this.onTradeProposalCallback;
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
    document.getElementById("cancelWaitingModalBtn").onclick = () => this.closeModal();
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
    attemptNote = null
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
    if (this.modalCard) this.modalCard.classList.remove("naked-modal");
    this.modalTitle.innerHTML = `<span class="icon-wrap gold-icon">${getIcon("TROPHY")}</span> <span>VICTORY & CHAMPION!</span>`;

    // Confetti rain bursts synchronized with victory-fanfare.mp3 (6.72s)
    particles.burstConfetti();
    const confettiInterval = setInterval(() => {
      particles.burstConfetti();
    }, 750);
    setTimeout(() => {
      clearInterval(confettiInterval);
    }, 6720);

    const winnerName = winner ? winner.name : "Champion";
    const winnerColor = winner ? winner.color : "#d4af37";
    const winnerCash = winner ? winner.cash : 0;
    const propsOwned = winner ? this.engine.getPlayerProperties(winner.id).length : 0;

    this.modalBody.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; text-align: center; gap: 16px; padding: 12px 0;">
        <div style="font-size: 3.5rem; filter: drop-shadow(0 0 20px rgba(212,175,55,0.7));">🏆</div>
        <div>
          <div style="font-size: 1.6rem; font-weight: 900; font-family: var(--font-display); color: var(--gold); letter-spacing: 1px;">
            MONOPOLY CHAMPION!
          </div>
          <div style="font-size: 1.25rem; font-weight: 800; color: ${winnerColor}; margin-top: 6px;">
            ${winnerName}
          </div>
          <div style="font-size: 0.9rem; color: #94a3b8; margin-top: 4px;">
            All opponents have gone bankrupt! Complete economic domination!
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; width: 100%; max-width: 320px; margin-top: 8px;">
          <div style="background: rgba(255,255,255,0.05); padding: 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1);">
            <div style="font-size: 0.75rem; color: #94a3b8; text-transform: uppercase;">Final Cash</div>
            <div style="font-size: 1.25rem; font-weight: 800; color: #34d399; font-family: var(--font-mono);">$${winnerCash}</div>
          </div>
          <div style="background: rgba(255,255,255,0.05); padding: 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1);">
            <div style="font-size: 0.75rem; color: #94a3b8; text-transform: uppercase;">Properties</div>
            <div style="font-size: 1.25rem; font-weight: 800; color: #60a5fa; font-family: var(--font-mono);">${propsOwned}</div>
          </div>
        </div>
      </div>
    `;

    this.modalFooter.innerHTML = `
      <button class="btn-primary" id="restartNewGameBtn" style="width: 100%; justify-content: center;">
        <span class="icon-wrap" style="width: 18px; height: 18px;">${getIcon("REFRESH")}</span>
        <span>Start New Game (Play Again)</span>
      </button>
    `;

    document.getElementById("restartNewGameBtn").onclick = () => {
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

  showRulesModal() {
    const isClassicBoard = this.engine.getBoardLength() === 40;
    const cornerStartLabel = isClassicBoard ? "GO" : "START";
    const cornerFreeLabel = isClassicBoard ? "FREE PARKING" : "SAFE ZONE";
    const boardEditionLabel = isClassicBoard ? "40-Tile Classic Edition" : "36-Tile Custom Edition";
    this.modalTitle.innerHTML = `<span class="icon-wrap gold-icon">${getIcon("BOOK")}</span> <span>Official Rules & Master Guide</span>`;
    this.modalBody.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 16px; max-height: 490px; overflow-y: auto; padding-right: 6px; font-size: 0.9rem; line-height: 1.55; color: #cbd5e1;">
        
        <div style="background: rgba(212, 175, 55, 0.12); border-left: 4px solid var(--gold); padding: 12px 16px; border-radius: 6px;">
          <div style="font-weight: 900; color: var(--gold); font-size: 1rem; font-family: var(--font-display);">Goal of the Game</div>
          <div>${isClassicBoard ? "Buy properties and railroads" : "Buy world mega-cities and international airports"}, collect rent from opponents, build complete monopolies with hotels, and bankrupt all rival tycoons!</div>
        </div>

        <div>
          <div style="font-weight: 900; color: #fff; margin-bottom: 6px; font-size: 0.96rem;">1. The 4 Iconic Corners (${boardEditionLabel})</div>
          <ul style="padding-left: 20px; display: flex; flex-direction: column; gap: 5px;">
            <li><strong>${cornerStartLabel}:</strong> Collect $${gameSettings.goReward} every time you land on or pass ${isClassicBoard ? "GO" : "START"}.</li>
            <li><strong>JAIL (Corner 1):</strong> Landing here sends you to Jail in this edition. On your <em>next turn</em>, you can pay <strong>$${gameSettings.jailBailFee} Bail</strong> to be released immediately, use a <strong>VIP Golden Ticket</strong>, or roll for doubles. If doubles are rolled, you escape for free and advance.</li>
            <li><strong>${cornerFreeLabel} (Corner 2):</strong> Safe resting haven. Take a break without any penalties or rent.</li>
            <li><strong>GO TO JAIL (Corner 3):</strong> Arrested! Sent straight to the Jail cell without passing ${isClassicBoard ? "GO" : "START"}.</li>
          </ul>
        </div>

        <div>
          <div style="font-weight: 900; color: #fff; margin-bottom: 6px; font-size: 0.96rem;">2. ${isClassicBoard ? "Railroads" : "International Airports / Stations"} (Rent Schedule)</div>
          <ul style="padding-left: 20px; display: flex; flex-direction: column; gap: 5px;">
            <li>1 ${isClassicBoard ? "Railroad" : "Airport / Station"} Owned: <strong>$${isClassicBoard ? 25 : 50} Rent</strong></li>
            <li>2 Owned: <strong>$${isClassicBoard ? 50 : 100} Rent</strong></li>
            <li>3 Owned: <strong>$${isClassicBoard ? 100 : 150} Rent</strong></li>
            <li>4 Owned: <strong>$200 Rent</strong></li>
          </ul>
        </div>

        <div>
          <div style="font-weight: 900; color: #fff; margin-bottom: 6px; font-size: 0.96rem;">3. Monopolies, Houses & Hotels</div>
          <ul style="padding-left: 20px; display: flex; flex-direction: column; gap: 5px;">
            <li>Owning all properties in a color group grants a <strong>MONOPOLY</strong>, doubling base rent.</li>
            <li>Once you hold a monopoly, build houses evenly (up to 4 houses, then upgrade to 1 Hotel).</li>
            <li><strong>Even Building Rule:</strong> You cannot construct a 2nd house on a city until all cities in that group have at least 1 house.</li>
          </ul>
        </div>

        <div>
          <div style="font-weight: 900; color: #fff; margin-bottom: 6px; font-size: 0.96rem;">4. Lucky Chest & Surprise Chance Decks (40+ Dynamic Cards)</div>
          <ul style="padding-left: 20px; display: flex; flex-direction: column; gap: 5px;">
            <li><strong>Benefits:</strong> Win Mega Lotteries (+$300), stock dividends, or birthday gifts from every player ($20).</li>
            <li><strong>Penalties:</strong> Pay speeding tickets, emergency clinic bills, or host gala parties ($20 each).</li>
            <li><strong>Warps & Tickets:</strong> Teleport to ${isClassicBoard ? "GO" : "START"}, travel to the nearest ${isClassicBoard ? "Railroad" : "Airport"}, or collect VIP Jail Escape tickets.</li>
          </ul>
        </div>

        <div>
          <div style="font-weight: 900; color: #fff; margin-bottom: 6px; font-size: 0.96rem;">5. Trading & Mortgaging</div>
          <ul style="padding-left: 20px; display: flex; flex-direction: column; gap: 5px;">
            <li>Click <strong>Propose Trade</strong> on your turn to swap properties and cash with players or AI bots.</li>
            <li>Mortgage unmonopolized properties for 50% face value if cash is tight. Mortgaged properties collect $0 rent.</li>
          </ul>
        </div>

      </div>
    `;

    this.modalFooter.innerHTML = `<button class="btn-primary" id="closeRulesBtn" style="width: 100%; justify-content: center;">Understood, Let's Play!</button>`;
    document.getElementById("closeRulesBtn").onclick = () => this.closeModal();
    this.modalOverlay.classList.add("active");
  }

  closeModal(force = false) {
    if (!force && this.isDebtModal && (this.engine.getCurrentPlayer()?.cash < 0 || this.getLocalPlayer()?.cash < 0)) {
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
    this.clearModalTimer();
    this.isStartingSelector = false;
    if (this.closeModalCrossBtn) this.closeModalCrossBtn.style.display = "";
    this.isInspectModal = false;
    this.modalOverlay.classList.remove("active");
    if (this.modalCard) this.modalCard.classList.remove("naked-modal");
  }
}
