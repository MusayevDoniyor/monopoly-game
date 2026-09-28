export class UIComponent {
  constructor(ui) {
    this.ui = ui;
    return new Proxy(this, {
      get(target, prop, receiver) {
        if (prop in target) {
          return Reflect.get(target, prop, receiver);
        }
        if (target.ui && prop in target.ui) {
          const val = target.ui[prop];
          return typeof val === "function" ? val.bind(target.ui) : val;
        }
        return undefined;
      },
      set(target, prop, value, receiver) {
        if (prop in target) {
          return Reflect.set(target, prop, value, receiver);
        }
        if (target.ui) {
          target.ui[prop] = value;
          return true;
        }
        return Reflect.set(target, prop, value, receiver);
      },
    });
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
  "hudController", "modalManager",
  "onTradeProposalCallback", "isExitModal", "ai", "showToast"
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
