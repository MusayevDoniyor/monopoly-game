import { gameSettings } from "./boardData.js?v=8.2";
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
    this.isExitModal = false;
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
  renderDice(...args) { return this.diceRenderer.renderDice(...args); }
  renderDiePips(...args) { return this.diceRenderer.renderDiePips(...args); }

  // --- TokenAnimator Delegation ---
  initTokens(...args) { return this.tokenAnimator.initTokens(...args); }
  syncTokenStacks(...args) { return this.tokenAnimator.syncTokenStacks(...args); }
  animateMovement(...args) { return this.tokenAnimator.animateMovement(...args); }

  // --- BoardRenderer Delegation ---
  getTileGridPosition(...args) { return this.boardRenderer.getTileGridPosition(...args); }
  toggleHeatmap(...args) { return this.boardRenderer.toggleHeatmap(...args); }
  getHeatmapColor(...args) { return this.boardRenderer.getHeatmapColor(...args); }
  renderBoard(...args) { return this.boardRenderer.renderBoard(...args); }
  updateBoardState(...args) { return this.boardRenderer.updateBoardState(...args); }

  // --- ActivityFeed Delegation ---
  initActivityFeedControls(...args) { return this.activityFeed.initActivityFeedControls(...args); }
  showJumpToLatest(...args) { return this.activityFeed.showJumpToLatest(...args); }
  hideJumpToLatest(...args) { return this.activityFeed.hideJumpToLatest(...args); }
  createLogEntryElement(...args) { return this.activityFeed.createLogEntryElement(...args); }
  renderActivityFeed(...args) { return this.activityFeed.renderActivityFeed(...args); }
  downloadMatchLogJSON(...args) { return this.activityFeed.downloadMatchLogJSON(...args); }

  // --- HudController Delegation ---
  initStaticIcons(...args) { return this.hudController.initStaticIcons(...args); }
  bindDrawerEvents(...args) { return this.hudController.bindDrawerEvents(...args); }
  openMenuDrawer(...args) { return this.hudController.openMenuDrawer(...args); }
  closeMenuDrawer(...args) { return this.hudController.closeMenuDrawer(...args); }
  updateMatchTimer(...args) { return this.hudController.updateMatchTimer(...args); }
  updateTurnTimer(...args) { return this.hudController.updateTurnTimer(...args); }
  setTurnTimerAiThinking(...args) { return this.hudController.setTurnTimerAiThinking(...args); }
  hideTurnTimer(...args) { return this.hudController.hideTurnTimer(...args); }
  updateHUD(...args) { return this.hudController.updateHUD(...args); }

  // --- ModalManager Delegation ---
  startModalTimer(...args) { return this.modalManager.startModalTimer(...args); }
  clearModalTimer(...args) { return this.modalManager.clearModalTimer(...args); }
  showStartingPlayerSelector(...args) { return this.modalManager.showStartingPlayerSelector(...args); }
  showArrestModal(...args) { return this.modalManager.showArrestModal(...args); }
  showJailOptionsModal(...args) { return this.modalManager.showJailOptionsModal(...args); }
  renderTitleDeedCardHTML(...args) { return this.modalManager.renderTitleDeedCardHTML(...args); }
  getLocalPlayer(...args) { return this.modalManager.getLocalPlayer(...args); }
  showDeedModal(...args) { return this.modalManager.showDeedModal(...args); }
  showBuyPrompt(...args) { return this.modalManager.showBuyPrompt(...args); }
  showCardModal(...args) { return this.modalManager.showCardModal(...args); }
  showPropertyManagementModal(...args) { return this.modalManager.showPropertyManagementModal(...args); }
  showGeminiAdvisorModal(...args) { return this.modalManager.showGeminiAdvisorModal(...args); }
  showDebtResolutionModal(...args) { return this.modalManager.showDebtResolutionModal(...args); }
  showTradeModal(...args) { return this.modalManager.showTradeModal(...args); }
  showWaitingModal(...args) { return this.modalManager.showWaitingModal(...args); }
  showTradeResultModal(...args) { return this.modalManager.showTradeResultModal(...args); }
  showTradeOfferModal(...args) { return this.modalManager.showTradeOfferModal(...args); }
  celebrateMonopoly(...args) { return this.modalManager.celebrateMonopoly(...args); }
  showToast(...args) { return this.modalManager.showToast(...args); }
  showMonopolyCelebrationToast(...args) { return this.modalManager.showMonopolyCelebrationToast(...args); }
  showJailToast(...args) { return this.modalManager.showJailToast(...args); }
  showBankruptcyToast(...args) { return this.modalManager.showBankruptcyToast(...args); }
  showGameOverModal(...args) { return this.modalManager.showGameOverModal(...args); }
  showLobbyModal(...args) { return this.modalManager.showLobbyModal(...args); }
  updateLobbyList(...args) { return this.modalManager.updateLobbyList(...args); }
  showAchievementsModal(...args) { return this.modalManager.showAchievementsModal(...args); }
  get isExitModal() { return Boolean(this._isExitModal || this.modalManager?.isExitModal); }
  set isExitModal(v) {
    this._isExitModal = Boolean(v);
    if (this.modalManager) this.modalManager.isExitModal = Boolean(v);
  }
  showExitConfirmationModal(...args) { return this.modalManager.showExitConfirmationModal(...args); }
  showRulesModal(...args) { return this.modalManager.showRulesModal(...args); }
  downloadCertificatePNG(...args) { return this.modalManager.downloadCertificatePNG(...args); }
  closeModal(...args) { return this.modalManager.closeModal(...args); }
}

registerDelegates([
  "renderDice", "renderDiePips", "initTokens", "syncTokenStacks", "animateMovement",
  "getTileGridPosition", "toggleHeatmap", "getHeatmapColor", "renderBoard", "updateBoardState",
  "initActivityFeedControls", "showJumpToLatest", "hideJumpToLatest", "createLogEntryElement",
  "renderActivityFeed", "downloadMatchLogJSON", "downloadCertificatePNG", "initStaticIcons", "bindDrawerEvents",
  "openMenuDrawer", "closeMenuDrawer", "updateMatchTimer", "updateTurnTimer",
  "setTurnTimerAiThinking", "hideTurnTimer", "updateHUD", "startModalTimer", "clearModalTimer",
  "showStartingPlayerSelector", "showArrestModal", "showJailOptionsModal", "renderTitleDeedCardHTML",
  "getLocalPlayer", "showDeedModal", "showBuyPrompt", "showCardModal",
  "showPropertyManagementModal", "showGeminiAdvisorModal", "showDebtResolutionModal",
  "showTradeModal", "showWaitingModal", "showTradeResultModal", "showTradeOfferModal",
  "celebrateMonopoly", "showToast", "showMonopolyCelebrationToast", "showJailToast", "showBankruptcyToast",
  "showGameOverModal", "showLobbyModal", "updateLobbyList", "showAchievementsModal",
  "showExitConfirmationModal", "showRulesModal", "closeModal"
]);
