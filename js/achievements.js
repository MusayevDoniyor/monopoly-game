import { sounds } from './audio.js';
import { ICONS, getIcon } from './icons.js';

export const ACHIEVEMENTS_LIST = {
  first_step: { id: 'first_step', iconKey: 'START_ARROW', title: 'Grand Tour', desc: 'Completed your first lap around the board!' },
  monopoly_boss: { id: 'monopoly_boss', iconKey: 'TROPHY', title: 'City Baron', desc: 'Acquired your first complete color monopoly!' },
  hotel_tycoon: { id: 'hotel_tycoon', iconKey: 'HOTEL', title: '5-Star Hospitality', desc: 'Constructed a luxury Hotel on a property!' },
  jailbreak: { id: 'jailbreak', iconKey: 'JAIL', title: 'The Great Escape', desc: 'Successfully escaped Jail by rolling doubles or bail!' },
  high_roller: { id: 'high_roller', iconKey: 'DIAMOND', title: 'Centibillionaire', desc: 'Accumulated over $3,000 in cash!' },
  ruthless: { id: 'ruthless', iconKey: 'POLICE', title: 'Hostile Takeover', desc: 'Bankrupted an opposing player!' },
  aviation_mogul: { id: 'aviation_mogul', iconKey: 'TRAIN', title: 'Transit Mogul', desc: 'Owned 3 or more Railroad Stations simultaneously!' },
  jackpot_winner: { id: 'jackpot_winner', iconKey: 'CHEST', title: 'Jackpot Strike', desc: 'Won +$250 or more from a single Lucky Chest card!' }
};

export class AchievementManager {
  constructor() {
    let saved = [];
    if (typeof localStorage !== 'undefined') {
      try { saved = JSON.parse(localStorage.getItem('monopoly_achievements') || '[]'); } catch (e) {}
    }
    this.unlocked = new Set(saved);
  }

  unlock(id) {
    if (this.unlocked.has(id)) return;
    const item = ACHIEVEMENTS_LIST[id];
    if (!item) return;

    this.unlocked.add(id);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('monopoly_achievements', JSON.stringify([...this.unlocked]));
    }

    if (typeof document !== 'undefined') {
      this.showSteamToast(item);
    }
    sounds.playUpgrade();
  }

  showSteamToast(item) {
    if (typeof document === 'undefined') return;
    let container = document.getElementById('steamAchievementsContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'steamAchievementsContainer';
      container.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 10000; display: flex; flex-direction: column; gap: 10px; pointer-events: none;';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'steam-achievement-toast';
    toast.innerHTML = `
      <div class="steam-toast-header" style="display: flex; align-items: center; gap: 6px;">
        <span class="icon-wrap" style="width: 0.85rem; height: 0.85rem; color: #38bdf8;">${getIcon('SPARKLE')}</span>
        <span style="font-size: 0.7rem; color: #38bdf8; font-weight: 800; letter-spacing: 1px;">STEAM ACHIEVEMENT UNLOCKED</span>
      </div>
      <div class="steam-toast-body">
        <div class="steam-toast-icon">${getIcon(item.iconKey || 'TROPHY')}</div>
        <div class="steam-toast-text">
          <div class="steam-toast-title">${item.title}</div>
          <div class="steam-toast-desc">${item.desc}</div>
        </div>
      </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 400);
    }, 4500);
  }
}

export const achievements = new AchievementManager();
