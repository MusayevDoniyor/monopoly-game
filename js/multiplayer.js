// Client WebSocket Multiplayer Manager with Reconnection & Heartbeat
export class MultiplayerManager {
  constructor(app) {
    this.app = app;
    this.ws = null;
    this.isOnline = false;
    this.roomCode = null;
    this.localPlayerId = null;
    this.localPlayerName = '';
    this.isHost = false;
    this.players = [];
    this.pingInterval = null;
    this.reconnectTimer = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.isReconnecting = false;
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;

      try {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('[Multiplayer] Connected to Monopoly Server');
          this.reconnectAttempts = 0;
          this.isReconnecting = false;
          this.startHeartbeat();

          if (this.roomCode && this.localPlayerId !== null) {
            this.send({
              type: 'RECONNECT_ROOM',
              roomCode: this.roomCode,
              playerId: this.localPlayerId,
              name: this.localPlayerName
            });
          }

          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleServerMessage(data);
          } catch (err) {
            console.error('[Multiplayer] Failed to parse server message:', err, event.data);
          }
        };

        this.ws.onerror = (err) => {
          console.warn('[Multiplayer] WebSocket connection error:', err);
          reject(err);
        };

        this.ws.onclose = () => {
          console.log('[Multiplayer] Disconnected from Server');
          this.stopHeartbeat();
          if (this.isOnline && this.roomCode) {
            this.scheduleReconnect();
          } else {
            this.isOnline = false;
          }
        };
      } catch (e) {
        reject(e);
      }
    });
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: 'PING' }));
        } catch {
          // ignore
        }
      }
    }, 15000);
  }

  stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  scheduleReconnect() {
    if (this.isReconnecting || this.reconnectAttempts >= this.maxReconnectAttempts) return;
    this.isReconnecting = true;
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 8000);
    console.log(`[Multiplayer] Attempting reconnect in ${delay}ms (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(() => {
        this.isReconnecting = false;
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        } else {
          this.isOnline = false;
        }
      });
    }, delay);
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(data));
        return true;
      } catch (err) {
        console.warn('[Multiplayer] Send error:', err);
        return false;
      }
    }
    return false;
  }

  async createRoom(name, token, color, edition = 'world') {
    this.localPlayerName = name;
    await this.connect();
    this.send({
      type: 'CREATE_ROOM',
      name,
      token,
      color,
      edition
    });
  }

  async joinRoom(roomCode, name, token, color) {
    this.localPlayerName = name;
    await this.connect();
    this.send({
      type: 'JOIN_ROOM',
      roomCode,
      name,
      token,
      color
    });
  }

  startRoomGame(playerConfigs) {
    if (!this.ws || !this.isHost) return;
    this.send({
      type: 'START_ROOM_GAME',
      playerConfigs
    });
  }

  syncAction(action, payload) {
    if (!this.isOnline) return;
    this.send({
      type: 'SYNC_ACTION',
      action,
      payload
    });
  }

  sendTradeOffer(p1Id, p2Id, offeredProps, offeredCash, reqProps, reqCash) {
    this.syncAction('TRADE_OFFER', {
      proposerId: p1Id,
      targetId: p2Id,
      offeredProps: Array.from(offeredProps || []),
      offeredCash: Number(offeredCash) || 0,
      reqProps: Array.from(reqProps || []),
      reqCash: Number(reqCash) || 0
    });
  }

  sendTradeResponse(proposerId, targetId, accepted, reason = '') {
    this.syncAction('TRADE_RESPONSE', {
      proposerId,
      targetId,
      accepted: !!accepted,
      reason
    });
  }

  sendChat(text) {
    if (!this.isOnline) return;
    const localPlayer = this.app.engine.players[this.localPlayerId];
    this.send({
      type: 'CHAT_MESSAGE',
      sender: localPlayer ? localPlayer.name : 'Player',
      text
    });
  }

  handleServerMessage(msg) {
    if (!msg || !msg.type) return;

    switch (msg.type) {
      case 'PONG':
        break;

      case 'ROOM_CREATED':
        this.isOnline = true;
        this.isHost = true;
        this.roomCode = msg.roomCode;
        this.localPlayerId = msg.playerId;
        this.players = msg.players;
        this.app.ui.showLobbyModal(this);
        break;

      case 'ROOM_JOINED':
        this.isOnline = true;
        this.isHost = false;
        this.roomCode = msg.roomCode;
        this.localPlayerId = msg.playerId;
        this.players = msg.players;
        this.app.ui.showLobbyModal(this);
        break;

      case 'ROOM_RECONNECTED':
        this.isOnline = true;
        this.roomCode = msg.roomCode;
        this.localPlayerId = msg.playerId;
        console.log(`[Multiplayer] Reconnected to room ${msg.roomCode} as Player ${msg.playerId}`);
        if (msg.lastGameState) {
          this.app.handleRemoteAction('GAME_STATE', msg.lastGameState);
        }
        break;

      case 'PLAYER_RECONNECTED':
        if (this.app?.engine?.log) {
          this.app.engine.log(`🟢 ${msg.name} reconnected to match.`, 'success');
        }
        break;

      case 'PLAYER_DISCONNECTED':
        if (this.app?.engine?.log) {
          this.app.engine.log(`⚠️ ${msg.name} disconnected. Waiting for reconnection...`, 'warning');
        }
        break;

      case 'LOBBY_UPDATE':
      case 'PLAYER_LEFT':
        this.players = msg.players;
        this.app.ui.updateLobbyList(this.players, this.isHost);
        break;

      case 'GAME_STARTED':
        this.app.ui.closeModal();
        this.app.startOnlineMatch(msg.theme, msg.playerConfigs, this.localPlayerId, msg.startingPlayerIndex);
        break;

      case 'SYNC_ACTION':
        this.app.handleRemoteAction(msg.action, msg.payload);
        break;

      case 'CHAT_MESSAGE':
        this.app.engine.log(`[CHAT] [${msg.sender}]: ${msg.text}`, 'info');
        this.app.ui.updateHUD();
        break;

      case 'ERROR':
        alert(msg.message);
        break;
    }
  }
}
