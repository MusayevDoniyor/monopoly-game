// Client WebSocket Multiplayer Manager
export class MultiplayerManager {
  constructor(app) {
    this.app = app;
    this.ws = null;
    this.isOnline = false;
    this.roomCode = null;
    this.localPlayerId = null;
    this.isHost = false;
    this.players = [];
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
          console.log('Connected to Monopoly Multiplayer Server');
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleServerMessage(JSON.parse(event.data));
        };

        this.ws.onerror = (err) => {
          console.warn('WebSocket connection failed:', err);
          reject(err);
        };

        this.ws.onclose = () => {
          console.log('Disconnected from Multiplayer Server');
          this.isOnline = false;
        };
      } catch (e) {
        reject(e);
      }
    });
  }

  async createRoom(name, token, color, edition = 'world') {
    await this.connect();
    this.ws.send(JSON.stringify({
      type: 'CREATE_ROOM',
      name,
      token,
      color,
      edition
    }));
  }

  async joinRoom(roomCode, name, token, color) {
    await this.connect();
    this.ws.send(JSON.stringify({
      type: 'JOIN_ROOM',
      roomCode,
      name,
      token,
      color
    }));
  }

  startRoomGame(playerConfigs) {
    if (!this.ws || !this.isHost) return;
    this.ws.send(JSON.stringify({
      type: 'START_ROOM_GAME',
      playerConfigs
    }));
  }

  syncAction(action, payload) {
    if (!this.isOnline || !this.ws) return;
    this.ws.send(JSON.stringify({
      type: 'SYNC_ACTION',
      action,
      payload
    }));
  }

  sendChat(text) {
    if (!this.isOnline || !this.ws) return;
    const localPlayer = this.app.engine.players[this.localPlayerId];
    this.ws.send(JSON.stringify({
      type: 'CHAT_MESSAGE',
      sender: localPlayer ? localPlayer.name : 'Player',
      text
    }));
  }

  handleServerMessage(msg) {
    switch (msg.type) {
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
