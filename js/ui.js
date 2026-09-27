import { gameSettings } from "./boardData.js?v=5.1";
import { registerDelegates } from "./ui/uiComponent.js";
import { DiceRenderer } from "./ui/diceRenderer.js";
import { TokenAnimator } from "./ui/tokenAnimator.js";
import { BoardRenderer } from "./ui/boardRenderer.js";
import { ActivityFeed } from "./ui/activityFeed.js";
import { HudController } from "./ui/hudController.js";
import { ModalManager } from "./ui/modalManager.js";

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
    this.logCountPill = document.getElementById("logCountPill");
    this.btnExportFeedJson = document.getElementById("btnExportFeedJson");
    this.logJumpLatestBtn = document.getElementById("logJumpLatestBtn");
    this.logUnreadCount = document.getElementById("logUnreadCount");
    this._lastRenderedLogCount = 0;
    this._userScrolledUp = false;
    this._unreadLogCount = 0;

    // Menu Drawer
    this.menuDrawer = document.getElementById("menuDrawer");
    this.menuDrawerBackdrop = document.getElementById("menuDrawerBackdrop");
    this.gameMenuBtn = document.getElementById("gameMenuBtn");
    this.closeDrawerBtn = document.getElementById("closeDrawerBtn");

    // Modals
    this.modalOverlay = document.getElementById("modalOverlay");
    this.modalCard = this.modalOverlay?.querySelector(".modal-card");
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

    this.modalTimerInterval = null;
    this.modalTimerRemaining = 0;
    this.isDebtModal = false;
    this.isStartingSelector = false;
    this.isInspectModal = false;
    this._onCardModalClose = null;

    // Initialize submodules
    this.diceRenderer = new DiceRenderer(this);
    this.tokenAnimator = new TokenAnimator(this);
    this.boardRenderer = new BoardRenderer(this);
    this.activityFeed = new ActivityFeed(this);
    this.hudController = new HudController(this);
    this.modalManager = new ModalManager(this);

    // Initial setup
    this.initStaticIcons();
    this.bindDrawerEvents();
    this.initActivityFeedControls();
  }

  // --- DiceRenderer Delegation ---
  renderDice(d1, d2, rolling) { return this.diceRenderer.renderDice(d1, d2, rolling); }
  renderDiePips(dieEl, val) { return this.diceRenderer.renderDiePips(dieEl, val); }

  // --- TokenAnimator Delegation ---
  initTokens() { return this.tokenAnimator.initTokens(); }
  syncTokenStacks() { return this.tokenAnimator.syncTokenStacks(); }
  animateMovement(player, targetPos, onFinish, backwards, startPosOverride) {
    return this.tokenAnimator.animateMovement(player, targetPos, onFinish, backwards, startPosOverride);
  }

  // --- BoardRenderer Delegation ---
  getTileGridPosition(id) { return this.boardRenderer.getTileGridPosition(id); }
  toggleHeatmap() { return this.boardRenderer.toggleHeatmap(); }
  getHeatmapColor(prob) { return this.boardRenderer.getHeatmapColor(prob); }
  renderBoard() { return this.boardRenderer.renderBoard(); }
  updateBoardState() { return this.boardRenderer.updateBoardState(); }

  // --- ActivityFeed Delegation ---
  initActivityFeedControls() { return this.activityFeed.initActivityFeedControls(); }
  showJumpToLatest() { return this.activityFeed.showJumpToLatest(); }
  hideJumpToLatest() { return this.activityFeed.hideJumpToLatest(); }
  createLogEntryElement(log) { return this.activityFeed.createLogEntryElement(log); }
  renderActivityFeed() { return this.activityFeed.renderActivityFeed(); }
  downloadMatchLogJSON() { return this.activityFeed.downloadMatchLogJSON(); }

  // --- HudController Delegation ---
  initStaticIcons() { return this.hudController.initStaticIcons(); }
  bindDrawerEvents() { return this.hudController.bindDrawerEvents(); }
  openMenuDrawer() { return this.hudController.openMenuDrawer(); }
  closeMenuDrawer() { return this.hudController.closeMenuDrawer(); }
  updateMatchTimer(totalSeconds) { return this.hudController.updateMatchTimer(totalSeconds); }
  updateTurnTimer(secondsLeft, maxSeconds, isUrgent) { return this.hudController.updateTurnTimer(secondsLeft, maxSeconds, isUrgent); }
  setTurnTimerAiThinking(isThinking) { return this.hudController.setTurnTimerAiThinking(isThinking); }
  hideTurnTimer() { return this.hudController.hideTurnTimer(); }
  updateHUD() { return this.hudController.updateHUD(); }

  // --- ModalManager Delegation ---
  startModalTimer(duration, onTimeout, label) { return this.modalManager.startModalTimer(duration, onTimeout, label); }
  clearModalTimer() { return this.modalManager.clearModalTimer(); }
  showStartingPlayerSelector(players, onComplete) { return this.modalManager.showStartingPlayerSelector(players, onComplete); }
  showArrestModal(player, onBail) { return this.modalManager.showArrestModal(player, onBail); }
  showJailOptionsModal(player, onBail, onRoll, onCard) { return this.modalManager.showJailOptionsModal(player, onBail, onRoll, onCard); }
  renderTitleDeedCardHTML(tile, owner, player, hasMonopoly) { return this.modalManager.renderTitleDeedCardHTML(tile, owner, player, hasMonopoly); }
  getLocalPlayer() { return this.modalManager.getLocalPlayer(); }
  showDeedModal(tile) { return this.modalManager.showDeedModal(tile); }
  showBuyPrompt(tile, player, onBuy, onDecline) { return this.modalManager.showBuyPrompt(tile, player, onBuy, onDecline); }
  showCardModal(card, player, onDone) { return this.modalManager.showCardModal(card, player, onDone); }
  showPropertyManagementModal(player, activeTab) { return this.modalManager.showPropertyManagementModal(player, activeTab); }
  showGeminiAdvisorModal(promptText) { return this.modalManager.showGeminiAdvisorModal(promptText); }
  showDebtResolutionModal(debtor, creditor, amountOwed, reason, onResolved) { return this.modalManager.showDebtResolutionModal(debtor, creditor, amountOwed, reason, onResolved); }
  showTradeModal() { return this.modalManager.showTradeModal(); }
  showWaitingModal(title, message) { return this.modalManager.showWaitingModal(title, message); }
  showTradeResultModal(isSuccess, message, onDone) { return this.modalManager.showTradeResultModal(isSuccess, message, onDone); }
  showTradeOfferModal(trade, onAccept, onDecline, onCounter) { return this.modalManager.showTradeOfferModal(trade, onAccept, onDecline, onCounter); }
  celebrateMonopoly(colorKey, ownerName, ownerColor) { return this.modalManager.celebrateMonopoly(colorKey, ownerName, ownerColor); }
  showMonopolyCelebrationToast(colorKey, ownerName, ownerColor) { return this.modalManager.showMonopolyCelebrationToast(colorKey, ownerName, ownerColor); }
  showJailToast(player) { return this.modalManager.showJailToast(player); }
  showBankruptcyToast(player) { return this.modalManager.showBankruptcyToast(player); }
  showGameOverModal(winner) { return this.modalManager.showGameOverModal(winner); }
  showLobbyModal(roomId, isHost, players, onStartGame) { return this.modalManager.showLobbyModal(roomId, isHost, players, onStartGame); }
  updateLobbyList(players) { return this.modalManager.updateLobbyList(players); }
  showAchievementsModal() { return this.modalManager.showAchievementsModal(); }
  showExitConfirmationModal(isReload, onConfirm, onCancel) { return this.modalManager.showExitConfirmationModal(isReload, onConfirm, onCancel); }
  showRulesModal() { return this.modalManager.showRulesModal(); }
  closeModal() { return this.modalManager.closeModal(); }
}

registerDelegates([
  "renderDice", "renderDiePips", "initTokens", "syncTokenStacks", "animateMovement",
  "getTileGridPosition", "toggleHeatmap", "getHeatmapColor", "renderBoard", "updateBoardState",
  "initActivityFeedControls", "showJumpToLatest", "hideJumpToLatest", "createLogEntryElement",
  "renderActivityFeed", "downloadMatchLogJSON", "initStaticIcons", "bindDrawerEvents",
  "openMenuDrawer", "closeMenuDrawer", "updateMatchTimer", "updateTurnTimer",
  "setTurnTimerAiThinking", "hideTurnTimer", "updateHUD", "startModalTimer", "clearModalTimer",
  "showStartingPlayerSelector", "showArrestModal", "showJailOptionsModal", "renderTitleDeedCardHTML",
  "getLocalPlayer", "showDeedModal", "showBuyPrompt", "showCardModal",
  "showPropertyManagementModal", "showGeminiAdvisorModal", "showDebtResolutionModal",
  "showTradeModal", "showWaitingModal", "showTradeResultModal", "showTradeOfferModal",
  "celebrateMonopoly", "showMonopolyCelebrationToast", "showJailToast", "showBankruptcyToast",
  "showGameOverModal", "showLobbyModal", "updateLobbyList", "showAchievementsModal",
  "showExitConfirmationModal", "showRulesModal", "closeModal"
]);
