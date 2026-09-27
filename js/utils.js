/**
 * Common Utility Functions
 */

export const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

export const formatMoney = (amount) => {
  const num = Math.round(Number(amount) || 0);
  return `$${num.toLocaleString()}`;
};

export const formatTime = (totalSeconds) => {
  const secs = Math.max(0, Math.floor(totalSeconds || 0));
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

export const delay = (ms, speed = 1) => {
  const adjusted = Math.max(10, Math.round(ms / Math.max(0.1, speed)));
  return new Promise((resolve) => setTimeout(resolve, adjusted));
};
