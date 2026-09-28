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

export const buildRoomInvite = (roomCode, origin = "", pathname = "") => {
  const code = String(roomCode || "").trim().toUpperCase();
  const base = origin ? `${origin}${pathname || "/"}` : "";
  const url = base ? `${base}${base.includes("?") ? "&" : "?"}room=${encodeURIComponent(code)}` : "";
  return {
    code,
    url,
    title: "Monopoly Master Multiplayer",
    text: url
      ? `Join my Monopoly Master game!\nRoom Code: ${code}\nPlay at: ${url}`
      : `Join my Monopoly Master game!\nRoom Code: ${code}`,
  };
};

export const parseRoomParam = (search) => {
  if (!search) return null;
  try {
    const params = new URLSearchParams(search);
    const room = params.get("room") || params.get("join");
    return room ? room.trim().toUpperCase().slice(0, 4) : null;
  } catch (_) {
    return null;
  }
};
