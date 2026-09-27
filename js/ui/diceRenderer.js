import { UIComponent } from "./uiComponent.js";

export class DiceRenderer extends UIComponent {
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
      `rotateX(${rot1.x}deg) rotateY(${rot1.y}deg)`,
    );
    this.dice2El.style.setProperty(
      "--target-rot",
      `rotateX(${rot2.x}deg) rotateY(${rot2.y}deg)`,
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
}
