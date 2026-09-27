import http from 'http';
import { randomInt } from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

  const filePath = path.join(PUBLIC_DIR, reqPath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
      res.end(content, 'utf-8');
    }
  });
});

const wss = new WebSocketServer({ server });
const rooms = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function broadcastToRoom(roomCode, data, excludeWs = null) {
  const room = rooms.get(roomCode);
  if (!room) return;
  const payload = JSON.stringify(data);
  room.players.forEach(p => {
    if (p.ws && p.ws !== excludeWs && p.ws.readyState === WebSocket.OPEN) {
      p.ws.send(payload);
    }
  });
}

wss.on('connection', ws => {
  let currentRoomCode = null;
  let playerId = null;

  ws.on('message', message => {
    try {
      const msg = JSON.parse(message);

      switch (msg.type) {
        case 'CREATE_ROOM': {
          const roomCode = generateRoomCode();
          playerId = 0;
          currentRoomCode = roomCode;

          const hostPlayer = {
            id: playerId,
            name: msg.name || 'Host',
            token: msg.token || 'TOP_HAT',
            color: msg.color || '#3b82f6',
            isHost: true,
            ws
          };

          rooms.set(roomCode, {
            code: roomCode,
            theme: msg.theme || 'world',
            hostWs: ws,
            players: [hostPlayer],
            started: false
          });

          ws.send(JSON.stringify({
            type: 'ROOM_CREATED',
            roomCode,
            playerId,
            players: [{ id: hostPlayer.id, name: hostPlayer.name, token: hostPlayer.token, color: hostPlayer.color, isHost: true }]
          }));
          console.log(`[Room ${roomCode}] Created by ${hostPlayer.name}`);
          break;
        }

        case 'JOIN_ROOM': {
          const roomCode = (msg.roomCode || '').toUpperCase().trim();
          const room = rooms.get(roomCode);

          if (!room) {
            ws.send(JSON.stringify({ type: 'ERROR', message: `Room ${roomCode} does not exist.` }));
            return;
          }

          if (room.started) {
            ws.send(JSON.stringify({ type: 'ERROR', message: 'Game has already started in this room.' }));
            return;
          }

          if (room.players.length >= 4) {
            ws.send(JSON.stringify({ type: 'ERROR', message: 'Room is already full (max 4 players).' }));
            return;
          }

          playerId = room.players.length;
          currentRoomCode = roomCode;

          const newPlayer = {
            id: playerId,
            name: msg.name || `Player ${playerId + 1}`,
            token: msg.token || 'CAR',
            color: msg.color || '#ef4444',
            isHost: false,
            ws
          };

          room.players.push(newPlayer);

          ws.send(JSON.stringify({
            type: 'ROOM_JOINED',
            roomCode,
            playerId,
            theme: room.theme,
            players: room.players.map(p => ({ id: p.id, name: p.name, token: p.token, color: p.color, isHost: p.isHost }))
          }));

          broadcastToRoom(roomCode, {
            type: 'LOBBY_UPDATE',
            players: room.players.map(p => ({ id: p.id, name: p.name, token: p.token, color: p.color, isHost: p.isHost }))
          });

          console.log(`[Room ${roomCode}] ${newPlayer.name} joined. Total: ${room.players.length}`);
          break;
        }

        case 'START_ROOM_GAME': {
          const room = rooms.get(currentRoomCode);
          if (!room || ws !== room.hostWs) return;

          room.started = true;
          const playerConfigs = msg.playerConfigs || room.players.map(p => ({
            id: p.id,
            name: p.name,
            token: p.token,
            color: p.color,
            isAi: false
          }));
          const startingPlayerIndex = randomInt(playerConfigs.length);
          broadcastToRoom(currentRoomCode, {
            type: 'GAME_STARTED',
            theme: room.theme,
            playerConfigs,
            startingPlayerIndex
          });
          console.log(`[Room ${currentRoomCode}] Game Started!`);
          break;
        }

        case 'SYNC_ACTION': {
          if (!currentRoomCode) return;
          broadcastToRoom(currentRoomCode, {
            type: 'SYNC_ACTION',
            action: msg.action,
            payload: msg.payload
          }, ws);
          break;
        }

        case 'CHAT_MESSAGE': {
          if (!currentRoomCode) return;
          broadcastToRoom(currentRoomCode, {
            type: 'CHAT_MESSAGE',
            sender: msg.sender,
            text: msg.text,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });
          break;
        }
      }
    } catch (e) {
      console.error('WebSocket parse error:', e);
    }
  });

  ws.on('close', () => {
    if (currentRoomCode) {
      const room = rooms.get(currentRoomCode);
      if (room) {
        room.players = room.players.filter(p => p.ws !== ws);
        if (room.players.length === 0) {
          rooms.delete(currentRoomCode);
          console.log(`[Room ${currentRoomCode}] Deleted (empty)`);
        } else {
          broadcastToRoom(currentRoomCode, {
            type: 'PLAYER_LEFT',
            playerId,
            players: room.players.map(p => ({ id: p.id, name: p.name, token: p.token, color: p.color, isHost: p.isHost }))
          });
        }
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`================================================================`);
  console.log(`[MONOPOLY MASTER] Server running on http://localhost:${PORT}`);
  console.log(`[MULTIPLAYER] WebSocket Engine ready for room connections`);
  console.log(`================================================================`);
});
