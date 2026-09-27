import { GameEngine } from './gameEngine.js?v=4.16';
import { MonopolyUI } from './ui.js?v=4.16';
import { AiPlayer } from './aiPlayer.js?v=4.16';
import { sounds } from './audio.js?v=4.16';
import { geminiAdvisor } from './geminiAdvisor.js?v=4.16';
import { MultiplayerManager } from './multiplayer.js?v=4.16';
import { COLOR_GROUPS, gameSettings, updateGameSettings, reloadActiveBoard } from './boardData.js?v=4.16';
import { particles } from './particles.js?v=4.16';
import { achievements } from './achievements.js?v=4.16';
import { TOKEN_KEYS, TOKEN_LABELS, getIcon } from './icons.js?v=4.16';

class MonopolyApp {
  constructor() {
    this.engine = new GameEngine();
    this.ui = new MonopolyUI(this.engine);
    this.ui.app = this;
    this.ai = new AiPlayer(this.engine);
    this.ui.ai = this.ai;
    if (typeof window !== 'undefined') window.aiPlayerRef = this.ai;
    this.multiplayer = new MultiplayerManager(this);

    this.engine.onJail = (player) => {
      this.ui.showJailToast(player);
    };
    this.engine.onBankruptcy = (player) => {
      this.ui.showBankruptcyToast(player);
    };
    this.engine.onGameOver = (winner) => {
      this.ui.showGameOverModal(winner);
    };

    this.gameSpeed = 1;
    this.isAiTurnRunning = false;

    this.setupGameLockdown();
    this.bindEvents();
    this.showSetupModal();
  }

  setupGameLockdown() {
    // 1. Disable Right-Click Context Menu completely
    window.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      return false;
    }, { capture: true });

    // 2. Disable dragging on images, links, tokens, and elements
    window.addEventListener('dragstart', (e) => {
      e.preventDefault();
      return false;
    }, { capture: true });

    window.addEventListener('drop', (e) => {
      e.preventDefault();
      return false;
    }, { capture: true });

    // 3. Disable copy, cut, and paste outside of inputs
    window.addEventListener('copy', (e) => {
      if (!['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) {
        e.preventDefault();
      }
    });

    window.addEventListener('cut', (e) => {
      if (!['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) {
        e.preventDefault();
      }
    });

    // 4. Disable developer tools, view source, inspect, and copy keybindings
    window.addEventListener('keydown', (e) => {
      // F12
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }
      // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C (DevTools / Console / Inspect)
      if (e.ctrlKey && e.shiftKey && ['I', 'J', 'C', 'i', 'j', 'c'].includes(e.key)) {
        e.preventDefault();
        return false;
      }
      // Ctrl+U (View Source)
      if (e.ctrlKey && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
        return false;
      }
      // Ctrl+S (Save Page)
      if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        return false;
      }
      // Ctrl+P (Print Page)
      if (e.ctrlKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        return false;
      }
      // Ctrl+A outside of inputs (Select All)
      if (e.ctrlKey && (e.key === 'a' || e.key === 'A') && !['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) {
        e.preventDefault();
        return false;
      }
      // Ctrl+C outside of inputs (Copy)
      if (e.ctrlKey && (e.key === 'c' || e.key === 'C') && !['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) {
        e.preventDefault();
        return false;
      }
    }, { capture: true });
  }

  bindEvents() {
    const oldCloseModal = this.ui.closeModal.bind(this.ui);
    this.ui.closeModal = () => {
      oldCloseModal();
      this.resumeTurnTimerIfNeeded();
    };

    // Header Quick Toggles
    const muteBtn = document.getElementById('muteBtn');
    const musicBtn = document.getElementById('musicBtn');
    const refreshAudioButtons = () => {
      const sfxMuted = Boolean(sounds.sfxMuted);
      const musicEnabled = Boolean(sounds.musicEnabled);
      const muteIcon = document.getElementById('muteIconWrap');

      if (muteIcon) muteIcon.innerHTML = getIcon(sfxMuted ? 'MUTE' : 'SPEAKER');
      if (muteBtn) {
        muteBtn.classList.toggle('audio-muted', sfxMuted);
        muteBtn.setAttribute('aria-pressed', String(sfxMuted));
        muteBtn.title = sfxMuted ? 'Sound FX: Off' : 'Sound FX: On';
      }

      if (musicBtn) {
        musicBtn.classList.toggle('audio-on', musicEnabled);
        musicBtn.setAttribute('aria-pressed', String(musicEnabled));
        musicBtn.title = musicEnabled ? 'Jazz Music: On' : 'Jazz Music: Off';
      }
    };

    if (muteBtn) {
      muteBtn.onclick = () => {
        sounds.toggleMute();
        refreshAudioButtons();
      };
    }

    if (musicBtn) {
      musicBtn.onclick = () => {
        sounds.toggleMusic();
        refreshAudioButtons();
      };
    }

    refreshAudioButtons();

    const rulesHeaderBtn = document.getElementById('rulesHeaderBtn');
    if (rulesHeaderBtn) {
      rulesHeaderBtn.onclick = () => {
        this.ui.showRulesModal();
      };
    }

    const fullscreenBtn = document.getElementById('fullscreenBtn');
    if (fullscreenBtn) {
      fullscreenBtn.onclick = () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      };
    }

    // Drawer Items
    const drawerRules = document.getElementById('drawerRulesBtn');
    if (drawerRules) {
      drawerRules.onclick = () => {
        this.ui.closeMenuDrawer();
        this.ui.showRulesModal();
      };
    }

    const drawerGemini = document.getElementById('drawerGeminiBtn');
    if (drawerGemini) {
      drawerGemini.onclick = () => {
        this.ui.closeMenuDrawer();
        const player = this.engine.getCurrentPlayer();
        if (player) this.ui.showGeminiAdvisorModal(player);
      };
    }

    const drawerHeatmap = document.getElementById('drawerHeatmapBtn');
    if (drawerHeatmap) {
      drawerHeatmap.onclick = () => {
        this.ui.toggleHeatmap();
      };
    }

    const drawerSpeed = document.getElementById('drawerSpeedBtn');
    if (drawerSpeed) {
      drawerSpeed.onclick = () => {
        if (this.gameSpeed === 1) {
          this.gameSpeed = 2;
        } else if (this.gameSpeed === 2) {
          this.gameSpeed = 4;
        } else {
          this.gameSpeed = 1;
        }
        const speedTitle = document.getElementById('speedDrawerTitle');
        if (speedTitle) {
          speedTitle.innerText = `Game Speed: ${this.gameSpeed}x (${this.gameSpeed === 1 ? 'Normal' : this.gameSpeed === 2 ? 'Fast' : 'Turbo'})`;
        }
      };
    }

    const drawerSettings = document.getElementById('drawerSettingsBtn');
    if (drawerSettings) {
      drawerSettings.onclick = () => {
        this.ui.closeMenuDrawer();
        this.showSettingsModal();
      };
    }

    const drawerNewGame = document.getElementById('drawerNewGameBtn');
    if (drawerNewGame) {
      drawerNewGame.onclick = () => {
        this.ui.closeMenuDrawer();
        this.showSetupModal();
      };
    }

    const drawerAchievements = document.getElementById('drawerAchievementsBtn');
    if (drawerAchievements) {
      drawerAchievements.onclick = () => {
        this.ui.closeMenuDrawer();
        this.ui.showAchievementsModal();
      };
    }

    // Board Arena Buttons
    this.ui.onTradeProposalCallback = (p1, p2, offProps, offCash, reqProps, reqCash) => {
      this.handleTradeProposal(p1, p2, offProps, offCash, reqProps, reqCash);
    };

    if (this.ui.tradeBtn) {
      this.ui.tradeBtn.onclick = () => {
        const player = this.ui.getLocalPlayer();
        if (player && !player.bankrupt && !this.engine.gameOver) {
          this.stopTurnTimer();
          this.ui.showTradeModal(player, this.ui.onTradeProposalCallback);
        }
      };
    }

    if (this.ui.managePropsBtn) {
      this.ui.managePropsBtn.onclick = () => {
        const player = this.ui.getLocalPlayer();
        if (player && !player.bankrupt && !this.engine.gameOver) {
          this.stopTurnTimer();
          this.ui.showPropertyManagementModal(player);
        }
      };
    }

    if (this.ui.rollBtn) {
      this.ui.rollBtn.onclick = () => {
        if (this.ui.rollBtn.disabled || this._isRollingAnimation) return;
        this.ui.rollBtn.disabled = true;
        this.stopTurnTimer();
        this.handleRollDice();
      };
    }
    if (this.ui.endTurnBtn) {
      this.ui.endTurnBtn.onclick = () => {
        this.stopTurnTimer();
        this.handleEndTurn();
      };
    }
  }

  showSettingsModal() {
    this.ui.modalTitle.innerHTML = `<span class="icon-wrap gold-icon">${getIcon('GEAR')}</span> <span>Game Rules & Settings</span>`;
    this.ui.modalBody.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 14px;">
        <div>
          <label style="font-size: 0.85rem; color: #94a3b8; display: block; margin-bottom: 4px;">Board Theme & Layout:</label>
          <select class="select-ctrl" id="settingTheme" style="width: 100%;">
            <option value="classic" ${gameSettings.boardTheme === 'classic' ? 'selected' : ''}>Classic Atlantic City (GO, Jail, Free Parking - 40 Tiles)</option>
            <option value="world" ${gameSettings.boardTheme === 'world' ? 'selected' : ''}>World Mega-Cities (Cairo, Tokyo, Monaco - 36 Tiles)</option>
          </select>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div>
            <label style="font-size: 0.85rem; color: #94a3b8; display: block; margin-bottom: 4px;">Jail Bail Fee ($):</label>
            <input type="number" id="settingBail" class="input-text" style="width: 100%;" value="${gameSettings.jailBailFee}" step="25" />
          </div>
          <div>
            <label style="font-size: 0.85rem; color: #94a3b8; display: block; margin-bottom: 4px;">Starting Cash ($):</label>
            <input type="number" id="settingStartingCash" class="input-text" style="width: 100%;" value="${gameSettings.startingCash}" step="100" />
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div>
            <label style="font-size: 0.85rem; color: #94a3b8; display: block; margin-bottom: 4px;">Station Base Rent ($):</label>
            <input type="number" id="settingStationBase" class="input-text" style="width: 100%;" value="${gameSettings.stationBaseRent}" step="10" />
          </div>
          <div>
            <label style="font-size: 0.85rem; color: #94a3b8; display: block; margin-bottom: 4px;">Station Step Rent (+$/station):</label>
            <input type="number" id="settingStationStep" class="input-text" style="width: 100%;" value="${gameSettings.stationStepRent}" step="10" />
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div>
            <label style="font-size: 0.85rem; color: #94a3b8; display: block; margin-bottom: 4px;">Player Turn Timer:</label>
            <select class="select-ctrl" id="settingTurnTimer" style="width: 100%;">
              <option value="15" ${gameSettings.turnTimerSeconds === 15 ? 'selected' : ''}>15s (Blitz)</option>
              <option value="25" ${gameSettings.turnTimerSeconds === 25 ? 'selected' : ''}>25s (Default)</option>
              <option value="40" ${gameSettings.turnTimerSeconds === 40 ? 'selected' : ''}>40s (Standard)</option>
              <option value="60" ${gameSettings.turnTimerSeconds === 60 ? 'selected' : ''}>60s (Casual)</option>
              <option value="0" ${gameSettings.turnTimerSeconds === 0 ? 'selected' : ''}>Off (Unlimited)</option>
            </select>
          </div>
          <div>
            <label style="font-size: 0.85rem; color: #94a3b8; display: block; margin-bottom: 4px;">Approval Prompt Timer:</label>
            <select class="select-ctrl" id="settingApprovalTimer" style="width: 100%;">
              <option value="10" ${gameSettings.approvalTimerSeconds === 10 ? 'selected' : ''}>10s (Fast)</option>
              <option value="15" ${gameSettings.approvalTimerSeconds === 15 ? 'selected' : ''}>15s (Default)</option>
              <option value="25" ${gameSettings.approvalTimerSeconds === 25 ? 'selected' : ''}>25s (Relaxed)</option>
              <option value="0" ${gameSettings.approvalTimerSeconds === 0 ? 'selected' : ''}>Off (Unlimited)</option>
            </select>
          </div>
        </div>

        <div>
          <label style="font-size: 0.85rem; color: #94a3b8; display: block; margin-bottom: 4px;">START Reward ($):</label>
          <input type="number" id="settingGoReward" class="input-text" style="width: 100%;" value="${gameSettings.goReward}" step="50" />
        </div>
      </div>
    `;

    this.ui.modalFooter.innerHTML = `
      <button class="btn-primary" id="saveSettingsBtn">Save & Apply</button>
      <button class="btn-secondary" id="cancelSettingsBtn">Close</button>
    `;

    document.getElementById('saveSettingsBtn').onclick = () => {
      const newSettings = {
        boardTheme: document.getElementById('settingTheme').value,
        jailBailFee: parseInt(document.getElementById('settingBail').value, 10) || 150,
        startingCash: parseInt(document.getElementById('settingStartingCash').value, 10) || 1500,
        stationBaseRent: parseInt(document.getElementById('settingStationBase').value, 10) || 50,
        stationStepRent: parseInt(document.getElementById('settingStationStep').value, 10) || 50,
        goReward: parseInt(document.getElementById('settingGoReward').value, 10) || 200,
        turnTimerSeconds: parseInt(document.getElementById('settingTurnTimer').value, 10),
        approvalTimerSeconds: parseInt(document.getElementById('settingApprovalTimer').value, 10)
      };

      const matchInProgress = this.engine.players.length > 0 && (
        this.engine.turnCount > 0 ||
        this.engine.currentTurn.hasRolled ||
        this.engine.currentTurn.awaitingAction
      );
      if (matchInProgress && newSettings.boardTheme !== gameSettings.boardTheme) {
        newSettings.boardTheme = gameSettings.boardTheme;
        this.engine.log('Board edition changes apply to the next match. The current board was kept safe.', 'warning');
      }

      updateGameSettings(newSettings);
      reloadActiveBoard();
      this.ui.closeModal();
      this.ui.renderBoard();
      this.ui.updateBoardState();
      this.ui.updateHUD();
      this.stopTurnTimer();
      this.resumeTurnTimerIfNeeded();
    };

    document.getElementById('cancelSettingsBtn').onclick = () => this.ui.closeModal();
    this.ui.modalOverlay.classList.add('active');
  }

  showSetupModal() {
    this.ui.modalTitle.innerHTML = `<span class="icon-wrap gold-icon">${getIcon('REFRESH')}</span> <span>Monopoly Master - Game Setup</span>`;

    const tokenOptionsHtml = (selected) => TOKEN_KEYS.map(k => `<option value="${k}" ${k === selected ? 'selected' : ''}>${TOKEN_LABELS[k]}</option>`).join('');

    this.ui.modalBody.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 14px;">
        
        <div class="tab-row">
          <button class="tab-btn active" id="tabLocal">Local / AI Match</button>
          <button class="tab-btn" id="tabHost">Host Online Room</button>
          <button class="tab-btn" id="tabJoin">Join Room</button>
        </div>

        <div>
          <label style="font-size: 0.85rem; color: #94a3b8; display: block; margin-bottom: 4px;">Select Board Edition:</label>
          <select class="select-ctrl" id="boardEditionSelect" style="width: 100%; font-weight: bold;">
            <option value="classic" ${gameSettings.boardTheme === 'classic' ? 'selected' : ''}>Classic Atlantic City (GO, Jail, Free Parking - 40 Tiles)</option>
            <option value="world" ${gameSettings.boardTheme === 'world' ? 'selected' : ''}>World Mega-Cities (Cairo, Tokyo, Paris, Monaco - 36 Tiles)</option>
          </select>
        </div>

        <div id="sectionLocal" style="display: flex; flex-direction: column; gap: 10px;">
          <p style="font-size: 0.85rem; color: #cbd5e1;">Configure players (Play hot-seat with friends or solo with AI bots):</p>
          
          <div class="player-config-row">
            <select class="select-ctrl" id="token-0">${tokenOptionsHtml('TOP_HAT')}</select>
            <input type="text" class="input-text" id="name-0" value="You" />
            <select class="select-ctrl" id="type-0"><option value="human">Human</option><option value="ai">AI Bot</option></select>
            <input type="color" value="#3b82f6" id="color-0" class="color-picker-input" />
          </div>

          <div class="player-config-row">
            <select class="select-ctrl" id="token-1">${tokenOptionsHtml('CAR')}</select>
            <input type="text" class="input-text" id="name-1" value="Tycoon Bot" />
            <select class="select-ctrl" id="type-1"><option value="ai">AI Bot</option><option value="human">Human</option></select>
            <input type="color" value="#ef4444" id="color-1" class="color-picker-input" />
          </div>

          <div class="player-config-row">
            <select class="select-ctrl" id="token-2">${tokenOptionsHtml('DOG')}</select>
            <input type="text" class="input-text" id="name-2" value="WallStreet Bot" />
            <select class="select-ctrl" id="type-2"><option value="ai">AI Bot</option><option value="human">Human</option></select>
            <input type="color" value="#10b981" id="color-2" class="color-picker-input" />
          </div>

          <div class="player-config-row">
            <select class="select-ctrl" id="token-3">${tokenOptionsHtml('PLANE')}</select>
            <input type="text" class="input-text" id="name-3" value="Banker Bot" />
            <select class="select-ctrl" id="type-3"><option value="ai">AI Bot</option><option value="human">Human</option></select>
            <input type="color" value="#f59e0b" id="color-3" class="color-picker-input" />
          </div>

          <div style="font-size: 0.8rem; color: #94a3b8; margin-top: 4px;">Player count:</div>
          <select class="select-ctrl" id="playerCountSelect" style="font-weight: bold;">
            <option value="4">4 Players</option>
            <option value="3">3 Players</option>
            <option value="2">2 Players</option>
          </select>
        </div>

        <div id="sectionHost" style="display: none; flex-direction: column; gap: 12px;">
          <p style="font-size: 0.85rem; color: #cbd5e1;">Create a room so friends can join from other devices or browsers:</p>
          <div style="display: grid; grid-template-columns: 1fr 130px; gap: 8px;">
            <input type="text" class="input-text" id="hostPlayerName" placeholder="Your Name" value="Host Player" />
            <select class="select-ctrl" id="hostPlayerToken">${tokenOptionsHtml('TOP_HAT')}</select>
          </div>
          <button class="btn-primary" id="btnCreateRoomSubmit">Create Multiplayer Room</button>
        </div>

        <div id="sectionJoin" style="display: none; flex-direction: column; gap: 12px;">
          <p style="font-size: 0.85rem; color: #cbd5e1;">Enter the 4-letter room code shared by your friend:</p>
          <input type="text" class="input-text" id="joinRoomCodeInput" placeholder="e.g. PARK" maxlength="4" style="text-transform: uppercase; font-size: 1.4rem; letter-spacing: 4px; text-align: center;" />
          <div style="display: grid; grid-template-columns: 1fr 130px; gap: 8px;">
            <input type="text" class="input-text" id="joinPlayerName" placeholder="Your Name" value="Guest Player" />
            <select class="select-ctrl" id="joinPlayerToken">${tokenOptionsHtml('CAR')}</select>
          </div>
          <button class="btn-primary" id="btnJoinRoomSubmit">Connect to Room</button>
        </div>

      </div>
    `;

    this.ui.modalFooter.innerHTML = `
      <button class="btn-secondary" id="setupViewRulesBtn">Rules & Guide</button>
      <button class="btn-primary" id="startGameBtn" style="flex: 1;">Start Match</button>
    `;

    document.getElementById('setupViewRulesBtn').onclick = () => this.ui.showRulesModal();

    const tabLocal = document.getElementById('tabLocal');
    const tabHost = document.getElementById('tabHost');
    const tabJoin = document.getElementById('tabJoin');
    const secLocal = document.getElementById('sectionLocal');
    const secHost = document.getElementById('sectionHost');
    const secJoin = document.getElementById('sectionJoin');
    const footerBtn = document.getElementById('startGameBtn');

    tabLocal.onclick = () => {
      tabLocal.classList.add('active'); tabHost.classList.remove('active'); tabJoin.classList.remove('active');
      secLocal.style.display = 'flex'; secHost.style.display = 'none'; secJoin.style.display = 'none';
      footerBtn.style.display = 'block';
    };

    tabHost.onclick = () => {
      tabHost.classList.add('active'); tabLocal.classList.remove('active'); tabJoin.classList.remove('active');
      secHost.style.display = 'flex'; secLocal.style.display = 'none'; secJoin.style.display = 'none';
      footerBtn.style.display = 'none';
    };

    tabJoin.onclick = () => {
      tabJoin.classList.add('active'); tabLocal.classList.remove('active'); tabHost.classList.remove('active');
      secJoin.style.display = 'flex'; secLocal.style.display = 'none'; secHost.style.display = 'none';
      footerBtn.style.display = 'none';
    };

    document.getElementById('btnCreateRoomSubmit').onclick = () => {
      const name = document.getElementById('hostPlayerName').value.trim() || 'Host';
      const token = document.getElementById('hostPlayerToken').value;
      const theme = document.getElementById('boardEditionSelect').value;
      updateGameSettings({ boardTheme: theme });
      this.multiplayer.createRoom(name, token, '#3b82f6', theme);
    };

    document.getElementById('btnJoinRoomSubmit').onclick = () => {
      const code = document.getElementById('joinRoomCodeInput').value.trim();
      const name = document.getElementById('joinPlayerName').value.trim() || 'Player';
      const token = document.getElementById('joinPlayerToken').value;
      if (!code) { alert('Please enter room code'); return; }
      this.multiplayer.joinRoom(code, name, token, '#ef4444');
    };

    footerBtn.onclick = () => {
      const theme = document.getElementById('boardEditionSelect').value;
      updateGameSettings({ boardTheme: theme });
      reloadActiveBoard();

      const count = parseInt(document.getElementById('playerCountSelect').value, 10);
      const configs = [];
      for (let i = 0; i < count; i++) {
        configs.push({
          name: document.getElementById(`name-${i}`).value.trim() || `Player ${i + 1}`,
          token: document.getElementById(`token-${i}`).value,
          isAi: document.getElementById(`type-${i}`).value === 'ai',
          color: document.getElementById(`color-${i}`).value
        });
      }
      this.startNewGame(configs);
    };

    this.ui.modalOverlay.classList.add('active');
  }

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

  startTurnTimer(player, phase = 'roll') {
    this.stopTurnTimer();
    if (!player || player.isAi || this.engine.gameOver) {
      this.ui.hideTurnTimer();
      return;
    }

    const totalSec = phase === 'roll'
      ? (gameSettings.turnTimerSeconds || 25)
      : Math.min(15, gameSettings.turnTimerSeconds || 15);

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

    if (phase === 'roll') {
      if (!this.engine.currentTurn.hasRolled && !player.inJail) {
        this.engine.log(`⏱️ [TURN TIMEOUT] ${player.name} ran out of time! Auto-rolling dice...`, 'warning');
        this.handleRollDice(false);
      }
    } else if (phase === 'end_turn') {
      if (this.engine.currentTurn.hasRolled) {
        this.engine.log(`⏱️ [TURN TIMEOUT] ${player.name} ran out of time! Auto-passing turn...`, 'warning');
        this.handleEndTurn();
      }
    }
  }

  resumeTurnTimerIfNeeded() {
    if (this.engine.gameOver) return;
    const player = this.engine.getCurrentPlayer();
    if (player && !player.isAi && !this.ui.modalOverlay.classList.contains('active')) {
      const phase = this.engine.currentTurn.hasRolled ? 'end_turn' : 'roll';
      this.startTurnTimer(player, phase);
    }
  }

  startNewGame(configs, startingPlayerIndex = null) {
    this.ui.closeModal();
    this.engine.reset();
    if (this.ai?.reset) this.ai.reset();
    this.engine.initPlayers(configs);

    this.ui.renderBoard();
    this.ui.initTokens();
    this.ui.renderDice(1, 1);
    this.ui.updateBoardState();
    this.ui.updateHUD();

    const selectedIndex = Number.isInteger(startingPlayerIndex)
      ? startingPlayerIndex
      : this.engine.getRandomInt(0, Math.max(0, configs.length - 1));

    sounds.playStartingSelector();
    this.ui.showStartingPlayerSelector(this.engine.players, selectedIndex, () => {
      this.engine.currentTurn.playerIndex = selectedIndex;
      this.engine.log(`${this.engine.players[selectedIndex].name} was selected to roll first.`, 'success');
      this.startMatchClock();
      this.ui.updateHUD();
      this.triggerTurnStart();
    });
  }

  startOnlineMatch(theme, playerConfigs, localPlayerId, startingPlayerIndex = null) {
    updateGameSettings({ boardTheme: theme });
    reloadActiveBoard();
    this.startNewGame(playerConfigs, startingPlayerIndex);
  }

  triggerTurnStart() {
    this.ui.updateHUD();
    const player = this.engine.getCurrentPlayer();
    if (!player || this.engine.gameOver) {
      this.stopTurnTimer();
      return;
    }

    if (player.inJail) {
      if (player.isAi) {
        this.ui.setTurnTimerAiThinking();
        this.runAiTurn(player);
      } else {
        this.stopTurnTimer();
        this.ui.showJailOptionsModal(
          player,
          async () => {
            this.engine.payJailBail(player);
            this.ui.updateBoardState();
            this.ui.updateHUD();
            await this.handleRollDice();
          },
          async () => {
            this.engine.useJailCard(player);
            this.ui.updateBoardState();
            this.ui.updateHUD();
            await this.handleRollDice();
          },
          async () => {
            await this.handleRollDice();
          }
        );
      }
      return;
    }

    if (player.isAi) {
      this.ui.setTurnTimerAiThinking();
      this.runAiTurn(player);
    } else {
      this.startTurnTimer(player, 'roll');
    }
  }

  async runAiTurn(player) {
    if (this.isAiTurnRunning) return;
    this.isAiTurnRunning = true;

    const delay = ms => new Promise(r => setTimeout(r, ms / this.gameSpeed));
    await delay(1200);

    if (player.inJail) {
      const decision = this.ai.decideJailAction(player);
      if (decision === 'card') {
        this.engine.useJailCard(player);
      } else if (decision === 'pay') {
        this.engine.payJailBail(player);
      }
      this.ui.updateHUD();
      await delay(400);
    }

    await this.handleRollDice(true);
    await delay(1000);

    this.ai.tryUpgrading(player);
    this.ui.updateBoardState();
    this.ui.updateHUD();

    // AI proactively scans for strategic trades
    await this.ai.considerProactiveTrade(player, this);

    await delay(1200);

    if (this.engine.currentTurn.canRollAgain && !player.inJail) {
      this.isAiTurnRunning = false;
      await delay(600);
      this.runAiTurn(player);
    } else {
      this.isAiTurnRunning = false;
      this.handleEndTurn();
    }
  }

  async handleRollDice(isAi = false) {
    const player = this.engine.getCurrentPlayer();
    if (!player || player.bankrupt || player.cash < 0 || this.engine.currentTurn.hasRolled || this._isRollingAnimation) return;
    if (this.multiplayer.isOnline && this.multiplayer.localPlayerId !== player.id && !isAi) return;

    this._isRollingAnimation = true;
    if (this.ui.rollBtn) this.ui.rollBtn.disabled = true;
    this.stopTurnTimer();

    try {
      sounds.playDice();
      this.ui.renderDice(1, 1, true);
      await new Promise(r => setTimeout(r, 1390 / this.gameSpeed));

      const { d1, d2, sum, isDoubles } = this.engine.rollDice();
      this.ui.renderDice(d1, d2, false);

      this.multiplayer.syncAction('ROLL_DICE', { d1, d2, sum, isDoubles, playerId: player.id });

      // Jail escape on roll
      if (player.inJail) {
        if (isDoubles) {
          player.inJail = false;
          player.jailTurns = 0;
          this.engine.log(`[ESCAPE] ${player.name} rolled DOUBLES (${d1}, ${d2}) and escaped Jail!`, 'success');
        } else {
          player.jailTurns++;
          this.engine.log(`${player.name} rolled ${d1} & ${d2} (no doubles). Remains in Jail (${player.jailTurns}/3).`, 'info');
          if (player.jailTurns >= 3) {
            const bail = gameSettings.jailBailFee || 150;
            player.cash -= bail;
            player.inJail = false;
            player.jailTurns = 0;
            this.engine.log(`${player.name} paid $${bail} mandatory bail after 3 turns.`, 'warning');
          } else {
            this.engine.currentTurn.hasRolled = true;
            this.engine.currentTurn.canRollAgain = false;
            this.ui.updateBoardState();
            this.ui.updateHUD();
            if (!player.isAi) {
              this.startTurnTimer(player, 'end_turn');
            }
            return;
          }
        }
      } else {
        if (this.engine.currentTurn.doublesCount >= 3) {
          this.engine.log(`[SPEEDING] ${player.name} rolled 3 doubles in a row and was sent to JAIL!`, 'danger');
          geminiAdvisor.getCommentary('speeding', player).then(msg => this.engine.log(`[AI Advisor] "${msg}"`, 'info'));
          this.engine.sendToJail(player);
          this.ui.updateBoardState();
          this.ui.updateHUD();
          if (!player.isAi) {
            this.startTurnTimer(player, 'end_turn');
          }
          return;
        }
      }

      const total = this.engine.getBoardLength();
      const oldPos = player.position;
      const targetPos = (oldPos + sum) % total;

      // Pass START check
      const landedOnGo = targetPos === 0 && oldPos !== 0;
      if ((targetPos < oldPos || landedOnGo) && !player.inJail) {
        const goReward = gameSettings.goReward || 200;
        player.cash += goReward;
        this.engine.log(`[START] ${player.name} passed START and collected $${goReward}!`, 'success');
        sounds.playCash();
        if (!player.isAi) achievements.unlock('first_step');
      }

      await new Promise(resolve => {
        this.ui.animateMovement(player, targetPos, resolve);
      });

      await new Promise(resolve => {
        this.engine.handleTileLanding(player, () => {
          this.checkActionModal(isAi, resolve);
        });
        if (this.engine.currentTurn.awaitingAction) {
          this.checkActionModal(isAi, resolve);
        }
      });

      if (player.cash < 0) {
        if (isAi) {
          this.engine.autoLiquidateForPlayer(player);
          if (player.cash < 0) {
            this.engine.declareBankruptcy(player);
          }
        } else {
          const debtStatus = this.engine.checkBankruptcy(player);
          if (debtStatus.inDebt) {
            this.stopTurnTimer();
            await new Promise(resolve => {
              this.ui.showDebtResolutionModal(player, resolve, resolve);
            });
          }
        }
      }

      if (isDoubles && !player.inJail && !player.bankrupt) {
        this.engine.currentTurn.hasRolled = false;
        this.engine.currentTurn.canRollAgain = true;
        this.engine.log(`[DOUBLES] ${player.name} rolled DOUBLES (${d1}, ${d2})! Roll dice again.`, 'success');
        if (!player.isAi) {
          this.startTurnTimer(player, 'roll');
        }
      } else {
        this.engine.currentTurn.hasRolled = true;
        this.engine.currentTurn.canRollAgain = false;
        if (!player.isAi) {
          this.startTurnTimer(player, 'end_turn');
        }
      }
    } finally {
      this._isRollingAnimation = false;
      this.ui.updateBoardState();
      this.ui.updateHUD();
      this.syncGameState();
    }
  }

  syncGameState() {
    if (!this.multiplayer?.isOnline) return;
    this.multiplayer.syncAction('GAME_STATE', {
      players: this.engine.players,
      board: this.engine.board,
      bank: this.engine.bank,
      currentTurn: this.engine.currentTurn,
      turnCount: this.engine.turnCount,
      roundCount: this.engine.roundCount,
      gameOver: this.engine.gameOver,
      winnerId: this.engine.winner?.id ?? null,
      logs: this.engine.logs
    });
  }

  checkActionModal(isAi, onComplete) {
    const action = this.engine.currentTurn.awaitingAction;
    if (!action) {
      if (onComplete) onComplete();
      return;
    }

    if (action.type === 'buy_prompt') {
      if (isAi) {
        const wantsToBuy = this.ai.decideBuyProperty(action.player, action.tile);
        if (wantsToBuy) {
          const group = action.tile.group;
          const hadMonopoly = this.engine.hasMonopoly(action.player.id, group);
          action.onBuy();
          if (!hadMonopoly && this.engine.hasMonopoly(action.player.id, group)) {
            this.ui.celebrateMonopoly(action.player, group);
            geminiAdvisor.getCommentary('monopoly_completed', action.player).then(m => this.engine.log(`[AI Advisor] "${m}"`, 'success'));
          }
        } else {
          action.onPass();
        }
        if (onComplete) onComplete();
      } else {
        this.ui.showBuyPrompt(action.tile, action.player, () => {
          const group = action.tile.group;
          const hadMonopoly = this.engine.hasMonopoly(action.player.id, group);
          action.onBuy();
          if (!hadMonopoly && this.engine.hasMonopoly(action.player.id, group)) {
            this.ui.celebrateMonopoly(action.player, group);
            geminiAdvisor.getCommentary('monopoly_completed', action.player).then(m => this.engine.log(`[AI Advisor] "${m}"`, 'success'));
          }
          this.ui.updateBoardState();
          this.ui.updateHUD();
          if (onComplete) onComplete();
        }, () => {
          action.onPass();
          this.ui.updateHUD();
          if (onComplete) onComplete();
        });
      }
    } else if (action.type === 'card_drawn') {
      const drawnCard = action.card;
      const cardPlayer = action.player || this.engine.getCurrentPlayer();
      if (isAi) {
        const oldPos = cardPlayer.position;
        action.onResolve();
        const newPos = cardPlayer.position;
        if (newPos !== oldPos) {
          const isBackwards = drawnCard.action?.type === 'MOVE_RELATIVE' && drawnCard.action?.steps < 0;
          this.ui.animateMovement(cardPlayer, newPos, () => {
            this.checkActionModal(true, onComplete);
          }, isBackwards, oldPos);
        } else {
          if (onComplete) onComplete();
        }
      } else {
        this.ui.showCardModal(action.cardType, drawnCard, async () => {
          const oldPos = cardPlayer.position;
          action.onResolve();
          const newPos = cardPlayer.position;

          if (newPos !== oldPos) {
            const isBackwards = drawnCard.action?.type === 'MOVE_RELATIVE' && drawnCard.action?.steps < 0;
            await new Promise(res => {
              this.ui.animateMovement(cardPlayer, newPos, res, isBackwards, oldPos);
            });
            this.checkActionModal(false, () => {
              this.ui.updateBoardState();
              this.ui.updateHUD();
              if (onComplete) onComplete();
            });
          } else {
            this.ui.updateBoardState();
            this.ui.updateHUD();
            if (onComplete) onComplete();
          }
        });
      }
    } else if (action.type === 'jailed') {
      if (isAi) {
        action.onResolve();
        if (onComplete) onComplete();
      } else {
        this.ui.showArrestModal(action.player, () => {
          action.onResolve();
          this.ui.updateBoardState();
          this.ui.updateHUD();
          if (onComplete) onComplete();
        });
      }
    }
  }

  handleTradeProposal(p1, p2, offProps, offCash, reqProps, reqCash) {
    const getMonopolies = (player) => {
      const groups = new Set();
      Object.keys(COLOR_GROUPS).forEach(g => {
        if (this.engine.hasMonopoly(player.id, g)) groups.add(g);
      });
      return groups;
    };

    const p1Before = getMonopolies(p1);
    const p2Before = getMonopolies(p2);

    const onTradeExecuted = () => {
      this.engine.executeTrade(p1.id, p2.id, offProps, offCash, reqProps, reqCash);
      sounds.playCash();

      // Check for newly completed monopolies
      const p1After = getMonopolies(p1);
      const p2After = getMonopolies(p2);

      p1After.forEach(g => {
        if (!p1Before.has(g)) {
          this.ui.celebrateMonopoly(p1, g);
          geminiAdvisor.getCommentary('monopoly_completed', p1).then(m => this.engine.log(`[AI Advisor] "${m}"`, 'success'));
        }
      });

      p2After.forEach(g => {
        if (!p2Before.has(g)) {
          this.ui.celebrateMonopoly(p2, g);
          geminiAdvisor.getCommentary('monopoly_completed', p2).then(m => this.engine.log(`[AI Advisor] "${m}"`, 'success'));
        }
      });

      this.ui.updateBoardState();
      this.ui.updateHUD();
    };

    if (p2.isAi) {
      const evalResult = this.ai.evaluateTradeOffer(p2, p1, offProps, offCash, reqProps, reqCash);
      const isAccepted = typeof evalResult === 'object' ? evalResult.accepted : !!evalResult;
      const reason = typeof evalResult === 'object' ? evalResult.reason : (isAccepted ? 'Trade terms agreed.' : 'Trade declined.');

      if (isAccepted) {
        onTradeExecuted();
        this.ui.showTradeResultModal(true, p2, reason, () => {
          this.ui.updateBoardState();
          this.ui.updateHUD();
        });
      } else {
        this.engine.log(`${p2.name} declined trade proposal from ${p1.name}.`, 'warning');
        this.ui.showTradeResultModal(false, p2, reason, () => {
          this.ui.updateBoardState();
          this.ui.updateHUD();
        });
      }
    } else {
      this.ui.showTradeOfferModal(p1, p2, offProps, offCash, reqProps, reqCash, () => {
        onTradeExecuted();
      }, () => {
        this.engine.log(`${p2.name} declined trade proposal from ${p1.name}.`, 'warning');
        this.ui.updateBoardState();
        this.ui.updateHUD();
      });
    }
  }

  handleEndTurn() {
    const current = this.engine.getCurrentPlayer();
    if (this.multiplayer.isOnline && current && this.multiplayer.localPlayerId !== current.id) return;
    if (current && current.cash < 0 && !current.bankrupt) {
      if (!current.isAi) {
        this.stopTurnTimer();
        this.ui.showDebtResolutionModal(current, () => {
          this.handleEndTurn();
        }, () => {
          this.handleEndTurn();
        });
        return;
      } else {
        this.engine.autoLiquidateForPlayer(current);
        if (current.cash < 0) {
          this.engine.declareBankruptcy(current);
        }
      }
    }

    this.stopTurnTimer();
    this.engine.endTurn();
    this.ui.updateHUD();
    this.triggerTurnStart();
    this.syncGameState();
  }

  handleRemoteAction(action, payload) {
    if (action === 'ROLL_DICE') {
      this.ui.renderDice(payload.d1, payload.d2, false);
    } else if (action === 'GAME_STATE' && payload) {
      this.engine.players = payload.players || this.engine.players;
      this.engine.board = payload.board || this.engine.board;
      this.engine.bank = payload.bank || this.engine.bank;
      this.engine.currentTurn = payload.currentTurn || this.engine.currentTurn;
      this.engine.turnCount = payload.turnCount ?? this.engine.turnCount;
      this.engine.roundCount = payload.roundCount ?? this.engine.roundCount;
      this.engine.gameOver = !!payload.gameOver;
      this.engine.winner = Number.isInteger(payload.winnerId)
        ? this.engine.players[payload.winnerId]
        : null;
      this.engine.logs = payload.logs || this.engine.logs;
      this.ui.updateBoardState();
      this.ui.updateHUD();
    }
  }
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => {
      new MonopolyApp();
    });
  } else {
    new MonopolyApp();
  }
}
