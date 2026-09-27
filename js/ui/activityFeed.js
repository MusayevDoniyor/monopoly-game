import { UIComponent } from "./uiComponent.js";
import { getIcon } from "../icons.js?v=5.1";
import { sounds } from "../audio.js?v=5.1";
import { escapeHtml } from "../utils.js";

export class ActivityFeed extends UIComponent {
  initActivityFeedControls() {
    if (this.logBoxEl) {
      this.logBoxEl.addEventListener("scroll", () => {
        const threshold = 40;
        const isNearBottom =
          this.logBoxEl.scrollHeight -
            this.logBoxEl.scrollTop -
            this.logBoxEl.clientHeight <=
          threshold;
        if (isNearBottom) {
          this._userScrolledUp = false;
          this.hideJumpToLatest();
        } else {
          this._userScrolledUp = true;
        }
      });
    }

    if (this.logJumpLatestBtn) {
      this.logJumpLatestBtn.onclick = () => {
        if (this.logBoxEl) {
          this.logBoxEl.scrollTo({
            top: this.logBoxEl.scrollHeight,
            behavior: "smooth",
          });
        }
        this._userScrolledUp = false;
        this.hideJumpToLatest();
      };
    }

    if (this.btnExportFeedJson) {
      this.btnExportFeedJson.onclick = () => {
        this.downloadMatchLogJSON();
      };
    }
  }
  showJumpToLatest(unreadCount) {
    if (!this.logJumpLatestBtn) return;
    this.logJumpLatestBtn.style.display = "inline-flex";
    if (this.logUnreadCount) {
      this.logUnreadCount.textContent = unreadCount > 99 ? "99+" : unreadCount;
    }
  }
  hideJumpToLatest() {
    if (!this.logJumpLatestBtn) return;
    this.logJumpLatestBtn.style.display = "none";
    this._unreadLogCount = 0;
  }
  createLogEntryElement(log) {
    const row = document.createElement("div");
    row.className = `log-entry ${log.type || "info"}`;
    if (log.id) row.setAttribute("data-log-id", String(log.id));

    const meta = document.createElement("div");
    meta.className = "log-entry-meta";

    const time = document.createElement("span");
    time.className = "log-time";
    time.textContent = `[${log.time || "00:00:00"}]`;

    const catClass = `cat-${(log.category || "event").toLowerCase()}`;
    const badge = document.createElement("span");
    badge.className = `log-badge ${catClass}`;
    badge.textContent = log.category || "EVENT";

    meta.append(time, badge);

    const body = document.createElement("div");
    body.className = "log-text";

    let html = escapeHtml(log.text || "");
    // Format positive cash changes (+$$$)
    html = html.replace(/\+\$([0-9,]+)/g, '<span class="log-money-pos">+$1</span>');
    // Format negative cash changes (-$$$)
    html = html.replace(/-\$([0-9,]+)/g, '<span class="log-money-neg">-$1</span>');
    // Format monetary amounts ($$$)
    html = html.replace(/(^|[^\w+-])\$([0-9,]+)/g, '$1<span class="log-money-pos">$$$2</span>');

    if (log.playerName && log.playerColor) {
      const safePName = escapeHtml(log.playerName);
      const playerRegex = new RegExp(`\\b${safePName}\\b`, "g");
      html = html.replace(
        playerRegex,
        `<strong class="log-player" style="color: ${log.playerColor};">${safePName}</strong>`,
      );
    }

    body.innerHTML = html;
    row.append(meta, body);
    return row;
  }
  renderActivityFeed(forceReset = false) {
    if (!this.logBoxEl) return;

    const history =
      this.engine.matchHistory && this.engine.matchHistory.length > 0
        ? this.engine.matchHistory
        : [...this.engine.logs].reverse();

    if (forceReset || history.length < this._lastRenderedLogCount) {
      this.logBoxEl.innerHTML = "";
      this._lastRenderedLogCount = 0;
      this._unreadLogCount = 0;
      this.hideJumpToLatest();
    }

    if (this.logCountPill) {
      this.logCountPill.textContent = String(history.length);
    }

    if (history.length === 0) {
      if (this._lastRenderedLogCount === 0 && !this.logBoxEl.hasChildNodes()) {
        this.logBoxEl.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #64748b; font-size: 0.78rem; text-align: center; gap: 6px; padding: 24px 0;">
            <span style="font-size: 1.4rem; opacity: 0.6;">📜</span>
            <span>No activity recorded yet. Start rolling!</span>
          </div>`;
      }
      return;
    }

    // If previously displayed empty placeholder, clear it
    if (
      this._lastRenderedLogCount === 0 &&
      this.logBoxEl.children.length === 1 &&
      this.logBoxEl.querySelector("span")
    ) {
      this.logBoxEl.innerHTML = "";
    }

    // Skip DOM updates if log list hasn't changed
    if (this._lastRenderedLogCount === history.length) {
      return;
    }

    // Check if user was near the bottom before appending new elements
    const threshold = 50;
    const wasNearBottom =
      !this._userScrolledUp ||
      this.logBoxEl.scrollHeight -
        this.logBoxEl.scrollTop -
        this.logBoxEl.clientHeight <=
        threshold;

    const newEntries = history.slice(this._lastRenderedLogCount);
    const fragment = document.createDocumentFragment();

    newEntries.forEach((entry) => {
      fragment.appendChild(this.createLogEntryElement(entry));
    });

    this.logBoxEl.appendChild(fragment);
    this._lastRenderedLogCount = history.length;

    if (wasNearBottom) {
      this.logBoxEl.scrollTop = this.logBoxEl.scrollHeight;
      this._userScrolledUp = false;
      this.hideJumpToLatest();
    } else {
      this._unreadLogCount += newEntries.length;
      this.showJumpToLatest(this._unreadLogCount);
    }
  }
  downloadMatchLogJSON() {
    try {
      const data = this.engine.getMatchLogExportData();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], {
        type: "application/json;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, 19);
      const filename = `monopoly_match_log_${timestamp}.json`;
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 120);

      this.showToast("Match activity log exported as JSON!", "success");
      sounds.playCash();
    } catch (err) {
      console.error("Failed to export match log:", err);
      this.showToast("Failed to export match log as JSON.", "danger");
    }
  }
}
