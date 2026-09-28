import http from "http";
import { randomInt } from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer, WebSocket } from "ws";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
};

const PUBLIC_ROOTS = new Set(["css", "images", "js", "sound-effects"]);

function setSecurityHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
}

const server = http.createServer((req, res) => {
  setSecurityHeaders(res);

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD", "Cache-Control": "no-store" });
    res.end("Method Not Allowed");
    return;
  }

  let url;
  try {
    url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  } catch {
    res.writeHead(400, { "Cache-Control": "no-store" });
    res.end("Bad Request");
    return;
  }

  let reqPath;
  try {
    reqPath = decodeURIComponent(url.pathname);
  } catch {
    res.writeHead(400, { "Cache-Control": "no-store" });
    res.end("Bad Request");
    return;
  }

  if (reqPath === "/health") {
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[".json"],
      "Cache-Control": "no-store",
    });
    res.end(
      req.method === "HEAD" ? undefined : JSON.stringify({ status: "ok" }),
    );
    return;
  }

  if (reqPath === "/" || reqPath === "") reqPath = "/index.html";
  const segments = reqPath.split("/").filter(Boolean);
  const isPublicFile =
    reqPath === "/index.html" ||
    ["robots.txt", "sitemap.xml"].includes(reqPath.slice(1)) ||
    (segments.length >= 2 && PUBLIC_ROOTS.has(segments[0]));

  if (!isPublicFile || segments.some((segment) => segment.startsWith("."))) {
    res.writeHead(404, {
      "Content-Type": MIME_TYPES[".txt"],
      "Cache-Control": "no-store",
    });
    res.end("404 Not Found");
    return;
  }

  const filePath = path.resolve(PUBLIC_DIR, `.${reqPath}`);
  if (!filePath.startsWith(`${PUBLIC_DIR}${path.sep}`)) {
    res.writeHead(404, {
      "Content-Type": MIME_TYPES[".txt"],
      "Cache-Control": "no-store",
    });
    res.end("404 Not Found");
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  const cacheControl =
    ext === ".html" || ext === ".js" || ext === ".css"
      ? "no-cache, must-revalidate"
      : "public, max-age=86400, stale-while-revalidate=604800";

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === "ENOENT") {
        res.writeHead(404, {
          "Content-Type": MIME_TYPES[".txt"],
          "Cache-Control": "no-store",
        });
        res.end("404 Not Found");
      } else {
        res.writeHead(500, {
          "Content-Type": MIME_TYPES[".txt"],
          "Cache-Control": "no-store",
        });
        res.end("Internal Server Error");
      }
    } else {
      res.writeHead(200, {
        "Content-Type": contentType,
        "Cache-Control": cacheControl,
        "Content-Length": content.length,
      });
      res.end(req.method === "HEAD" ? undefined : content);
    }
  });
});

const wss = new WebSocketServer({ server, maxPayload: 1024 * 1024 });
const rooms = new Map();

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(randomInt(chars.length));
  }
  return code;
}

function broadcastToRoom(roomCode, data, excludeWs = null) {
  const room = rooms.get(roomCode);
  if (!room) return;
  const payload = JSON.stringify(data);
  room.players.forEach((p) => {
    if (p.ws && p.ws !== excludeWs && p.ws.readyState === WebSocket.OPEN) {
      try {
        p.ws.send(payload);
      } catch (err) {
        console.warn(`[Broadcast error to player ${p.id}]:`, err);
      }
    }
  });
}

// 25-Second Heartbeat to prevent socket drops
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      return ws.terminate();
    }
    ws.isAlive = false;
    try {
      ws.ping();
    } catch {
      ws.terminate();
    }
  });
}, 25000);

wss.on("close", () => {
  clearInterval(heartbeatInterval);
});

wss.on("connection", (ws) => {
  let currentRoomCode = null;
  let playerId = null;
  ws.isAlive = true;

  ws.on("pong", () => {
    ws.isAlive = true;
  });

  ws.on("message", (message) => {
    try {
      const msg = JSON.parse(message);

      switch (msg.type) {
        case "PING": {
          ws.send(JSON.stringify({ type: "PONG" }));
          break;
        }

        case "CREATE_ROOM": {
          let roomCode;
          do {
            roomCode = generateRoomCode();
          } while (rooms.has(roomCode));
          playerId = 0;
          currentRoomCode = roomCode;

          const hostPlayer = {
            id: playerId,
            name: msg.name || "Host",
            token: msg.token || "TOP_HAT",
            color: msg.color || "#3b82f6",
            isHost: true,
            connected: true,
            ws,
          };

          rooms.set(roomCode, {
            code: roomCode,
            theme: msg.theme || "world",
            hostWs: ws,
            players: [hostPlayer],
            started: false,
            lastGameState: null,
            playerConfigs: null,
            cleanupTimer: null,
          });

          ws.send(
            JSON.stringify({
              type: "ROOM_CREATED",
              roomCode,
              playerId,
              players: [
                {
                  id: hostPlayer.id,
                  name: hostPlayer.name,
                  token: hostPlayer.token,
                  color: hostPlayer.color,
                  isHost: true,
                },
              ],
            }),
          );
          console.log(`[Room ${roomCode}] Created by ${hostPlayer.name}`);
          break;
        }

        case "JOIN_ROOM": {
          const roomCode = (msg.roomCode || "").toUpperCase().trim();
          const room = rooms.get(roomCode);

          if (!room) {
            ws.send(
              JSON.stringify({
                type: "ERROR",
                message: `Room ${roomCode} does not exist.`,
              }),
            );
            return;
          }

          if (room.started) {
            // Check if this is an existing player rejoining
            const existing = room.players.find(
              (p) =>
                p.name.toLowerCase() === (msg.name || "").toLowerCase() &&
                !p.connected,
            );
            if (existing) {
              existing.connected = true;
              existing.ws = ws;
              playerId = existing.id;
              currentRoomCode = roomCode;
              if (room.cleanupTimer) {
                clearTimeout(room.cleanupTimer);
                room.cleanupTimer = null;
              }
              ws.send(
                JSON.stringify({
                  type: "ROOM_RECONNECTED",
                  roomCode,
                  playerId: existing.id,
                  theme: room.theme,
                  playerConfigs: room.playerConfigs,
                  lastGameState: room.lastGameState,
                }),
              );
              broadcastToRoom(
                roomCode,
                {
                  type: "PLAYER_RECONNECTED",
                  playerId: existing.id,
                  name: existing.name,
                },
                ws,
              );
              console.log(
                `[Room ${roomCode}] ${existing.name} reconnected (ID: ${existing.id})`,
              );
              return;
            }

            ws.send(
              JSON.stringify({
                type: "ERROR",
                message: "Game has already started in this room.",
              }),
            );
            return;
          }

          if (room.players.length >= 4) {
            ws.send(
              JSON.stringify({
                type: "ERROR",
                message: "Room is already full (max 4 players).",
              }),
            );
            return;
          }

          playerId = room.players.length;
          currentRoomCode = roomCode;

          const newPlayer = {
            id: playerId,
            name: msg.name || `Player ${playerId + 1}`,
            token: msg.token || "CAR",
            color: msg.color || "#ef4444",
            isHost: false,
            connected: true,
            ws,
          };

          room.players.push(newPlayer);

          ws.send(
            JSON.stringify({
              type: "ROOM_JOINED",
              roomCode,
              playerId,
              theme: room.theme,
              players: room.players.map((p) => ({
                id: p.id,
                name: p.name,
                token: p.token,
                color: p.color,
                isHost: p.isHost,
              })),
            }),
          );

          broadcastToRoom(roomCode, {
            type: "LOBBY_UPDATE",
            players: room.players.map((p) => ({
              id: p.id,
              name: p.name,
              token: p.token,
              color: p.color,
              isHost: p.isHost,
            })),
          });

          console.log(
            `[Room ${roomCode}] ${newPlayer.name} joined. Total: ${room.players.length}`,
          );
          break;
        }

        case "RECONNECT_ROOM": {
          const roomCode = (msg.roomCode || "").toUpperCase().trim();
          const targetPlayerId = msg.playerId;
          const room = rooms.get(roomCode);

          if (!room) {
            ws.send(
              JSON.stringify({
                type: "ERROR",
                message: `Room ${roomCode} no longer exists.`,
              }),
            );
            return;
          }

          let playerEntry = room.players.find((p) => p.id === targetPlayerId);
          if (!playerEntry && typeof msg.name === "string") {
            playerEntry = room.players.find(
              (p) => p.name.toLowerCase() === msg.name.toLowerCase(),
            );
          }

          if (playerEntry) {
            playerEntry.connected = true;
            playerEntry.ws = ws;
            playerId = playerEntry.id;
            currentRoomCode = roomCode;
            if (room.cleanupTimer) {
              clearTimeout(room.cleanupTimer);
              room.cleanupTimer = null;
            }
            ws.send(
              JSON.stringify({
                type: "ROOM_RECONNECTED",
                roomCode,
                playerId: playerEntry.id,
                theme: room.theme,
                playerConfigs: room.playerConfigs,
                lastGameState: room.lastGameState,
              }),
            );
            broadcastToRoom(
              roomCode,
              {
                type: "PLAYER_RECONNECTED",
                playerId: playerEntry.id,
                name: playerEntry.name,
              },
              ws,
            );
            console.log(
              `[Room ${roomCode}] ${playerEntry.name} resumed connection`,
            );
          } else {
            ws.send(
              JSON.stringify({
                type: "ERROR",
                message: "Could not re-identify player in room.",
              }),
            );
          }
          break;
        }

        case "START_ROOM_GAME": {
          const room = rooms.get(currentRoomCode);
          if (!room || ws !== room.hostWs) return;

          if (room.players.length < 2) {
            ws.send(
              JSON.stringify({
                type: "ERROR",
                message: "Cannot start game with fewer than 2 players.",
              }),
            );
            return;
          }

          room.started = true;
          const playerConfigs =
            msg.playerConfigs ||
            room.players.map((p) => ({
              id: p.id,
              name: p.name,
              token: p.token,
              color: p.color,
              isAi: false,
            }));
          room.playerConfigs = playerConfigs;
          const startingPlayerIndex = randomInt(playerConfigs.length);
          broadcastToRoom(currentRoomCode, {
            type: "GAME_STARTED",
            theme: room.theme,
            playerConfigs,
            startingPlayerIndex,
          });
          console.log(`[Room ${currentRoomCode}] Game Started!`);
          break;
        }

        case "SYNC_ACTION": {
          if (!currentRoomCode) return;
          const room = rooms.get(currentRoomCode);
          if (room && msg.action === "GAME_STATE" && msg.payload) {
            room.lastGameState = msg.payload;
          }
          broadcastToRoom(
            currentRoomCode,
            {
              type: "SYNC_ACTION",
              action: msg.action,
              payload: msg.payload,
            },
            ws,
          );
          break;
        }

        case "CHAT_MESSAGE": {
          if (!currentRoomCode) return;
          broadcastToRoom(currentRoomCode, {
            type: "CHAT_MESSAGE",
            sender: msg.sender,
            text: msg.text,
            time: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          });
          break;
        }
      }
    } catch (e) {
      console.error("WebSocket parse error:", e);
    }
  });

  ws.on("close", () => {
    if (currentRoomCode) {
      const room = rooms.get(currentRoomCode);
      if (room) {
        const p = room.players.find((x) => x.id === playerId);
        // A superseded socket can close after this player has reconnected.
        // It must not mark the replacement connection as disconnected.
        if (p?.ws && p.ws !== ws) return;
        if (p) {
          p.connected = false;
          p.ws = null;
        }

        if (!room.started) {
          // Lobby stage: remove completely
          const wasHost = p?.isHost || ws === room.hostWs;
          room.players = room.players.filter((x) => x.id !== playerId);
          if (room.players.length === 0) {
            rooms.delete(currentRoomCode);
            console.log(`[Room ${currentRoomCode}] Deleted (empty lobby)`);
          } else {
            if (wasHost) {
              room.players[0].isHost = true;
              room.hostWs = room.players[0].ws;
              console.log(
                `[Room ${currentRoomCode}] Host migrated to ${room.players[0].name}`,
              );
            }
            broadcastToRoom(currentRoomCode, {
              type: "PLAYER_LEFT",
              playerId,
              players: room.players.map((x) => ({
                id: x.id,
                name: x.name,
                token: x.token,
                color: x.color,
                isHost: x.isHost,
              })),
            });
          }
        } else {
          // In active match: keep room alive for reconnection
          broadcastToRoom(currentRoomCode, {
            type: "PLAYER_DISCONNECTED",
            playerId,
            name: p?.name || "Player",
          });

          const anyConnected = room.players.some((x) => x.connected);
          if (!anyConnected && !room.cleanupTimer) {
            // All players disconnected: wait 5 minutes before deleting room
            room.cleanupTimer = setTimeout(() => {
              rooms.delete(currentRoomCode);
              console.log(
                `[Room ${currentRoomCode}] Cleaned up after 5 min idle`,
              );
            }, 300000);
          }
        }
      }
    }
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(
    `================================================================`,
  );
  console.log(`[MONOPOLY MASTER] Server running on http://localhost:${PORT}`);
  console.log(`[MULTIPLAYER] WebSocket Engine ready for room connections`);
  console.log(
    `================================================================`,
  );
});
