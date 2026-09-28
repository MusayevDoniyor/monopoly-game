import { UIComponent } from "./uiComponent.js";
import { sounds } from "../audio.js";
import { getIcon } from "../icons.js";

export class TokenAnimator extends UIComponent {
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
    this.syncTokenStacks();
  }
  syncTokenStacks() {
    document.querySelectorAll(".tokens-container").forEach((container) => {
      const count = container.querySelectorAll(".player-token").length;
      container.dataset.tokenCount = String(count);
    });
  }
  async animateMovement(
    player,
    targetPos,
    onFinish,
    backwards = false,
    startPosOverride = null,
  ) {
    const startPos = Number.isInteger(startPosOverride)
      ? startPosOverride
      : player.position;
    const total = this.engine.getBoardLength();
    const tokenEl = this.tokenElements[player.id];

    if (!tokenEl || startPos === targetPos) {
      if (onFinish) onFinish();
      return;
    }

    const speed = Math.max(1, Number(this.app?.gameSpeed) || 1);
    const wait = (ms) =>
      new Promise((resolve) => setTimeout(resolve, ms / speed));
    const step = (container) => {
      if (!container) return;
      container.appendChild(tokenEl);
      this.syncTokenStacks();
      tokenEl.classList.remove("step-pop");
      void tokenEl.offsetWidth;
      tokenEl.classList.add("step-pop");
      sounds.playStep(player);
    };

    tokenEl.classList.add("moving");

    if (backwards) {
      const totalSteps = (startPos - targetPos + total) % total;
      let current = startPos;
      for (let i = 0; i < totalSteps; i++) {
        current = (current - 1 + total) % total;
        const container = document.getElementById(`tokens-${current}`);
        step(container);
        const progress = (i + 1) / totalSteps;
        await wait(330 + Math.floor(progress * 180));
      }
    } else {
      const totalSteps = (targetPos - startPos + total) % total;
      let current = startPos;
      for (let i = 0; i < totalSteps; i++) {
        current = (current + 1) % total;
        const container = document.getElementById(`tokens-${current}`);
        step(container);
        // Let each square read as a deliberate move, with a gentle deceleration
        // toward the destination. Fast/Turbo settings remain proportionally faster.
        const progress = (i + 1) / totalSteps;
        await wait(330 + Math.floor(progress * 180));
      }
    }

    await wait(420);

    tokenEl.classList.remove("moving", "step-pop");
    player.position = targetPos;
    this.syncTokenStacks();
    if (onFinish) onFinish();
  }
}
