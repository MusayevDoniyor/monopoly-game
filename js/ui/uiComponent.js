export class UIComponent {
  constructor(ui) {
    this.ui = ui;
  }
}

const COMMON_PROPS = [
  "engine", "app", "boardEl", "modalOverlay", "modalCard", "modalTitle",
  "modalBody", "modalFooter", "closeModalCrossBtn", "tokenElements",
  "showHeatmap", "modalTimerInterval", "modalTimerRemaining",
  "isDebtModal", "isStartingSelector", "isInspectModal", "_onCardModalClose",
  "dice1El", "dice2El", "rollBtn", "endTurnBtn", "managePropsBtn", "tradeBtn",
  "editionTagEl", "boardEditionSubtitleEl", "boardRulesDescEl",
  "turnPlayerNameEl", "turnPlayerTokenEl", "turnStatusEl", "playersListEl",
  "logBoxEl", "logCountPill", "btnExportFeedJson", "logJumpLatestBtn",
  "logUnreadCount", "_lastRenderedLogCount", "_userScrolledUp", "_unreadLogCount",
  "turnTimerBadge", "turnTimerIcon", "turnTimerCount", "turnTimerBar",
  "matchTimerBadge", "matchTimerText", "matchTimerIcon",
  "menuDrawer", "menuDrawerBackdrop", "gameMenuBtn", "closeDrawerBtn",
  "diceRenderer", "tokenAnimator", "boardRenderer", "activityFeed",
  "hudController", "modalManager"
];

for (const prop of COMMON_PROPS) {
  Object.defineProperty(UIComponent.prototype, prop, {
    get() { return this.ui ? this.ui[prop] : undefined; },
    set(v) { if (this.ui) this.ui[prop] = v; },
    configurable: true,
  });
}

export function registerDelegates(methods) {
  for (const m of methods) {
    if (!UIComponent.prototype[m]) {
      UIComponent.prototype[m] = function(...args) {
        if (this.ui && typeof this.ui[m] === "function") {
          return this.ui[m](...args);
        }
      };
    }
  }
}
