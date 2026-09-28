import { UIComponent } from "./uiComponent.js";
import { BOARD_TILES, COLOR_GROUPS, TILE_PROBABILITIES, gameSettings } from "../boardData.js?v=8.1";
import { getIcon } from "../icons.js?v=8.1";
import { CLASSIC_RAILROAD_ARTWORK } from "./railroadArtwork.js";
import { escapeHtml } from "../utils.js";

export class BoardRenderer extends UIComponent {
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
  getHeatmapColor(prob) {
    if (prob >= 3.2) return "rgba(239, 68, 68, 0.9)";
    if (prob >= 2.8) return "rgba(245, 158, 11, 0.9)";
    if (prob >= 2.4) return "rgba(234, 179, 8, 0.9)";
    return "rgba(59, 130, 246, 0.85)";
  }
  renderBoard() {
    const total = this.engine.getBoardLength();
    const isClassicBoard = total === 40;
    this.boardEl.className = `board-container ${total === 36 ? "grid-10" : "grid-11"}`;

    if (this.editionTagEl) {
      this.editionTagEl.innerText = `${gameSettings.boardTheme === "classic" ? "Classic Atlantic" : "World Mega-Cities"} (${total} Tiles)`;
    }
    const editionLabel =
      total === 40 ? "Classic 40-Tile Rules" : "World 36-Tile Rules";
    if (this.boardEditionSubtitleEl)
      this.boardEditionSubtitleEl.innerText = editionLabel;
    if (this.boardRulesDescEl) {
      this.boardRulesDescEl.innerText =
        total === 40
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
          <div class="corner-topline"><span class="corner-kicker">THE STARTING LINE</span><span class="corner-number">01</span></div>
          <div class="start-emblem">
            <span class="start-arrow-svg">${getIcon("START_ARROW")}</span>
            <span class="start-wordmark">${tile.name}</span>
          </div>
          <div class="start-reward"><span>COLLECT AS YOU PASS</span><strong>$${gameSettings.goReward}</strong></div>
        `;
      } else if (tile.name.includes("JAIL") && !tile.name.includes("GO TO")) {
        tileEl.classList.add("corner-jail");
        innerHTML = `
          <div class="jail-visiting-zone">
            <span class="corner-kicker">A MOMENT TO PAUSE</span>
            <span class="corner-number">02</span>
            <strong>JUST<br>VISITING</strong>
            <span class="jail-visiting-note">NO PENALTY</span>
          </div>
          <div class="jail-cell">
            <span class="jail-cell-bars" aria-hidden="true"></span>
            <div class="jail-cell-icon">${getIcon("JAIL")}</div>
            <strong>IN JAIL</strong>
            <span class="jail-bail-label">BAIL $${gameSettings.jailBailFee}</span>
          </div>
        `;
      } else if (
        tile.name.includes("FREE") ||
        tile.name.includes("SAFE") ||
        (this.engine.getBoardLength() === 36 && tile.id === 18)
      ) {
        tileEl.classList.add("corner-free-parking");
        const isSafe =
          tile.name.includes("SAFE") ||
          (this.engine.getBoardLength() === 36 && tile.id === 18);
        const titleMarkup = isSafe ? "SAFE<br>ZONE" : "FREE<br>PARKING";
        const captionMarkup = isSafe
          ? "NO FEE <span>•</span> SAFE HAVEN"
          : "NO FEE <span>•</span> TAKE A BREATHER";
        innerHTML = `
          <div class="free-parking-art">
            <div class="corner-topline"><span class="corner-kicker">REST STOP</span><span class="corner-number">03</span></div>
            <div class="free-parking-title">${titleMarkup}</div>
            <div class="free-parking-chip">$</div>
            <div class="free-parking-caption">${captionMarkup}</div>
          </div>
        `;
      } else if (tile.name.includes("GO TO JAIL")) {
        tileEl.classList.add("corner-go-to-jail");
        innerHTML = `
          <div class="go-to-jail-art">
            <div class="corner-topline"><span class="corner-kicker">DIRECT TO</span><span class="corner-number">04</span></div>
            <div class="go-to-jail-emblem"><span class="go-to-jail-icon">${getIcon("POLICE")}</span><span class="go-to-jail-arrow">↘</span></div>
            <strong class="go-to-jail-title">GO TO<br>JAIL</strong>
            <span class="go-to-jail-note">DO NOT PASS START</span>
          </div>
        `;
      } else if (tile.type === "chance" || tile.type === "community-chest") {
        const eventClass =
          tile.type === "chance" ? "event-tile-chance" : "event-tile-chest";
        innerHTML = `
          <div class="tile-content event-tile ${eventClass}">
            <div class="tile-name event-tile-name">${tile.name}</div>
            <div class="tile-subtext event-tile-subtext">${tile.subtext || ""}</div>
          </div>
        `;
      } else if (tile.type === "railroad") {
        const railroadArtwork = CLASSIC_RAILROAD_ARTWORK[tile.name];
        const railroadVisual = railroadArtwork
          ? `<img class="tile-railroad-art" src="${railroadArtwork.tileSrc}" alt="${railroadArtwork.alt}" decoding="async">`
          : `<div class="tile-icon-svg">${getIcon(tile.iconKey || "TRAIN")}</div>`;
        innerHTML += `
          <div class="tile-content tile-railroad-content">
            ${railroadVisual}
            <div class="tile-name">${tile.name}</div>
            ${tile.price ? `<div class="tile-price">$${tile.price}</div>` : ""}
          </div>
        `;
      } else {
        const iconSvg = getIcon(tile.iconKey || "DIAMOND");
        innerHTML = `
          <div class="tile-content">
            <div class="tile-icon-svg">${iconSvg}</div>
            <div class="tile-name">${tile.name}</div>
            ${tile.price && !tile.amount ? `<div class="tile-price">$${tile.price}</div>` : ""}
            ${tile.amount ? `<div class="tile-price">PAY $${tile.amount}</div>` : ""}
            ${tile.subtext && !tile.amount ? `<div class="tile-subtext">${tile.subtext}</div>` : ""}
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
}
