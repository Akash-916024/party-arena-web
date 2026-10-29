/**
 * Party Arena Web — Room Manager
 * Handles room lifecycle: creation, joining, leaving, state transitions.
 * Mirrors the original Flutter app's room_manager.dart
 */

const { v4: uuidv4 } = require('uuid');
const {
  MessageType,
  RoomState,
  createMessage,
  generateRoomCode,
} = require('./protocol');

class Player {
  constructor(id, name, colorIndex, ws, avatar = '👾') {
    this.id = id;
    this.name = name;
    this.colorIndex = colorIndex;
    this.avatar = avatar;
    this.isHost = false;
    this.isReady = false;
    this.ws = ws; // WebSocket connection reference
    this.score = 0;
    this.teamId = null;
    this.joinedAt = Date.now();
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      colorIndex: this.colorIndex,
      avatar: this.avatar,
      isHost: this.isHost,
      isReady: this.isReady,
      score: this.score,
      teamId: this.teamId,
    };
  }
}

class Room {
  constructor(hostPlayer) {
    this.id = uuidv4();
    this.code = '';
    this.name = `${hostPlayer.name}'s Room`;
    this.state = RoomState.WAITING;
    this.maxPlayers = 8;
    this.players = new Map();
    this.spectators = new Map();
    this.hostId = hostPlayer.id;
    this.selectedGameId = null;
    this.currentGame = null;
    this.tournament = null;
    this.isPublic = true;
    this.createdAt = Date.now();

    // Add host
    hostPlayer.isHost = true;
    hostPlayer.isReady = true;
    this.players.set(hostPlayer.id, hostPlayer);
  }

  get playerCount() {
    return this.players.size;
  }

  get isFull() {
    return this.playerCount >= this.maxPlayers;
  }

  get allReady() {
    for (const player of this.players.values()) {
      if (!player.isReady && !player.isHost) return false;
    }
    return this.playerCount >= 2;
  }

  get host() {
    return this.players.get(this.hostId);
  }

  addPlayer(player) {
    if (this.isFull) return false;
    if (this.state !== RoomState.WAITING) return false;
    this.players.set(player.id, player);
    return true;
  }

  removePlayer(playerId) {
    const player = this.players.get(playerId);
    if (!player) return false;
    this.players.delete(playerId);

    // If host left, promote next player or close room
    if (playerId === this.hostId && this.playerCount > 0) {
      const nextHost = this.players.values().next().value;
      nextHost.isHost = true;
      nextHost.isReady = true;
      this.hostId = nextHost.id;
      this.name = `${nextHost.name}'s Room`;
    }

    return true;
  }

  getPlayersArray() {
    return Array.from(this.players.values()).map((p) => p.toJSON());
  }

  toLobbyJSON() {
    return {
      roomCode: this.code,
      roomName: this.name,
      state: this.state,
      hostId: this.hostId,
      maxPlayers: this.maxPlayers,
      selectedGameId: this.selectedGameId,
      isPublic: this.isPublic,
      spectatorsCount: this.spectators.size,
      players: this.getPlayersArray(),
      tournament: this.tournament ? this.tournament.toJSON() : null,
    };
  }

  toPublicJSON() {
    return {
      roomCode: this.code,
      roomName: this.name,
      hostName: this.host ? this.host.name : 'Host',
      playerCount: this.playerCount,
      maxPlayers: this.maxPlayers,
      selectedGameId: this.selectedGameId,
      state: this.state,
      createdAt: this.createdAt,
    };
  }
}

class RoomManager {
  constructor() {
    /** @type {Map<string, Room>} roomCode -> Room */
    this.rooms = new Map();

    /** @type {Map<string, string>} playerId -> roomCode */
    this.playerRooms = new Map();

    /** @type {Map<WebSocket, string>} ws -> playerId */
    this.wsToPlayer = new Map();
  }

  /**
   * Creates a new room with the given player as host.
   * @param {WebSocket} ws - Host's WebSocket
   * @param {object} payload - { name, colorIndex }
   * @returns {Room}
   */
  createRoom(ws, payload) {
    const isPublic = payload.isPublic !== undefined ? !!payload.isPublic : true;
    const playerId = uuidv4();
    const player = new Player(
      playerId,
      payload.name || 'Player',
      payload.colorIndex || 0,
      ws,
      payload.avatar || '👾'
    );

    const room = new Room(player);

    // Generate unique room code
    let code;
    do {
      code = generateRoomCode();
    } while (this.rooms.has(code));
    room.code = code;

    room.isPublic = isPublic;
    this.rooms.set(code, room);
    this.playerRooms.set(playerId, code);
    this.wsToPlayer.set(ws, playerId);

    // Notify the host
    ws.send(
      createMessage(MessageType.ROOM_CREATED, {
        roomCode: code,
        playerId: playerId,
        room: room.toLobbyJSON(),
      })
    );

    console.log(`[Room] Created room ${code} by ${player.name} (${playerId})`);
    return room;
  }

  /**
   * Joins a player into an existing room by room code.
   * @param {WebSocket} ws - Joiner's WebSocket
   * @param {object} payload - { roomCode, name, colorIndex }
   */
  joinRoom(ws, payload) {
    const code = (payload.roomCode || '').toUpperCase();
    const room = this.rooms.get(code);

    if (!room) {
      ws.send(
        createMessage(MessageType.ROOM_ERROR, {
          error: 'Room not found. Check the code and try again.',
        })
      );
      return;
    }

    // Check reconnection
    if (payload.playerId && room.players.has(payload.playerId)) {
      const existing = room.players.get(payload.playerId);
      if (existing.disconnectTimer) {
        clearTimeout(existing.disconnectTimer);
        existing.disconnectTimer = null;
      }
      existing.ws = ws;
      existing.isDisconnected = false;
      this.playerRooms.set(payload.playerId, code);
      this.wsToPlayer.set(ws, payload.playerId);

      ws.send(
        createMessage(MessageType.ROOM_JOINED, {
          roomCode: code,
          playerId: payload.playerId,
          room: room.toLobbyJSON(),
          isSpectator: false,
        })
      );
      this.broadcastLobbyUpdate(room);
      return;
    }

    // Determine if joining as spectator or active player
    const isSpectator = room.isFull || room.state !== RoomState.WAITING;

    // Check if this colorIndex is already taken, auto-assign next available
    let colorIndex = payload.colorIndex || 0;
    const takenColors = new Set(
      Array.from(room.players.values()).map((p) => p.colorIndex)
    );
    while (takenColors.has(colorIndex) && colorIndex < 10) {
      colorIndex++;
    }

    const playerId = uuidv4();
    const player = new Player(
      playerId,
      payload.name || 'Player',
      colorIndex,
      ws,
      payload.avatar || '👾'
    );
    player.isSpectator = isSpectator;

    if (isSpectator) {
      room.spectators.set(playerId, player);
    } else {
      if (!room.addPlayer(player)) {
        ws.send(
          createMessage(MessageType.ROOM_ERROR, {
            error: 'Could not join room.',
          })
        );
        return;
      }
    }

    this.playerRooms.set(playerId, code);
    this.wsToPlayer.set(ws, playerId);

    // Notify the joiner
    ws.send(
      createMessage(MessageType.ROOM_JOINED, {
        roomCode: code,
        playerId: playerId,
        room: room.toLobbyJSON(),
        isSpectator,
      })
    );

    // Broadcast lobby update to all players in room
    this.broadcastLobbyUpdate(room);

    console.log(
      `[Room] ${player.name} joined room ${code} as ${isSpectator ? 'spectator' : 'player'} (${room.playerCount}/${room.maxPlayers})`
    );
  }

  /**
   * Handles a player disconnection.
   * @param {WebSocket} ws
   */
  handleDisconnect(ws) {
    const playerId = this.wsToPlayer.get(ws);
    if (!playerId) return;

    const roomCode = this.playerRooms.get(playerId);
    if (!roomCode) return;

    const room = this.rooms.get(roomCode);
    if (!room) return;

    // Check if spectator
    if (room.spectators.has(playerId)) {
      room.spectators.delete(playerId);
      this.playerRooms.delete(playerId);
      this.wsToPlayer.delete(ws);
      return;
    }

    const player = room.players.get(playerId);
    const playerName = player ? player.name : 'Unknown';

    // If game in progress, grant a 25-second reconnect grace period
    if (room.state === RoomState.IN_GAME && player) {
      player.isDisconnected = true;
      this.wsToPlayer.delete(ws);

      console.log(`[Room] ${playerName} disconnected during match. Holding slot for 25s...`);
      player.disconnectTimer = setTimeout(() => {
        if (player.isDisconnected) {
          room.removePlayer(playerId);
          this.playerRooms.delete(playerId);
          if (room.playerCount === 0) {
            this.rooms.delete(roomCode);
          } else {
            this.broadcastLobbyUpdate(room);
          }
        }
      }, 25000);
      return;
    }

    room.removePlayer(playerId);
    this.playerRooms.delete(playerId);
    this.wsToPlayer.delete(ws);

    console.log(`[Room] ${playerName} left room ${roomCode}`);

    // Clean up empty rooms
    if (room.playerCount === 0) {
      this.rooms.delete(roomCode);
      console.log(`[Room] Room ${roomCode} deleted (empty)`);
      return;
    }

    // If game was in progress and not enough players, end it
    if (
      room.state === RoomState.IN_GAME &&
      room.currentGame &&
      room.playerCount < room.currentGame.minPlayers
    ) {
      room.state = RoomState.WAITING;
      room.currentGame = null;
    }

    this.broadcastLobbyUpdate(room);
  }

  /**
   * Toggles a player's ready state.
   * @param {WebSocket} ws
   * @param {object} payload - { isReady }
   */
  setPlayerReady(ws, payload) {
    const playerId = this.wsToPlayer.get(ws);
    if (!playerId) return;

    const roomCode = this.playerRooms.get(playerId);
    const room = this.rooms.get(roomCode);
    if (!room) return;

    const player = room.players.get(playerId);
    if (!player) return;

    player.isReady = payload.isReady !== false;
    this.broadcastLobbyUpdate(room);
  }

  /**
   * Host selects a game for the room.
   * @param {WebSocket} ws
   * @param {object} payload - { gameId }
   */
  selectGame(ws, payload) {
    const playerId = this.wsToPlayer.get(ws);
    if (!playerId) return;

    const roomCode = this.playerRooms.get(playerId);
    const room = this.rooms.get(roomCode);
    if (!room) return;

    // Only host can select game
    if (playerId !== room.hostId) return;

    room.selectedGameId = payload.gameId;
    this.broadcastLobbyUpdate(room);
  }

  /**
   * Kicks a player from the room (host only).
   * @param {WebSocket} ws
   * @param {object} payload - { targetPlayerId }
   */
  kickPlayer(ws, payload) {
    const playerId = this.wsToPlayer.get(ws);
    if (!playerId) return;

    const roomCode = this.playerRooms.get(playerId);
    const room = this.rooms.get(roomCode);
    if (!room || playerId !== room.hostId) return;

    const target = room.players.get(payload.targetPlayerId);
    if (!target || target.isHost) return;

    // Notify kicked player
    if (target.ws && target.ws.readyState === 1) {
      target.ws.send(
        createMessage(MessageType.ROOM_ERROR, {
          error: 'You have been kicked from the room.',
          kicked: true,
        })
      );
    }

    room.removePlayer(payload.targetPlayerId);
    this.playerRooms.delete(payload.targetPlayerId);
    this.wsToPlayer.delete(target.ws);

    this.broadcastLobbyUpdate(room);
  }

  /**
   * Gets the room for a given WebSocket connection.
   * @param {WebSocket} ws
   * @returns {{ room: Room, playerId: string } | null}
   */
  getRoomForWs(ws) {
    const playerId = this.wsToPlayer.get(ws);
    if (!playerId) return null;

    const roomCode = this.playerRooms.get(playerId);
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    return { room, playerId };
  }

  /**
   * Broadcasts lobby state to all connected players in a room.
   * @param {Room} room
   */
  broadcastLobbyUpdate(room) {
    const msg = createMessage(MessageType.LOBBY_UPDATE, room.toLobbyJSON());
    for (const player of room.players.values()) {
      if (player.ws && player.ws.readyState === 1) {
        player.ws.send(msg);
      }
    }
    for (const spectator of room.spectators.values()) {
      if (spectator.ws && spectator.ws.readyState === 1) {
        spectator.ws.send(msg);
      }
    }
  }

  /**
   * Broadcasts a message to all players in a room.
   * @param {Room} room
   * @param {string} message - Pre-encoded message string
   */
  broadcastToRoom(room, message) {
    for (const player of room.players.values()) {
      if (player.ws && player.ws.readyState === 1) {
        player.ws.send(message);
      }
    }
    for (const spectator of room.spectators.values()) {
      if (spectator.ws && spectator.ws.readyState === 1) {
        spectator.ws.send(message);
      }
    }
  }

  /**
   * Sends a message to a specific player by ID.
   * @param {Room} room
   * @param {string} playerId
   * @param {string} message - Pre-encoded message string
   */
  sendToPlayer(room, playerId, message) {
    const player = room.players.get(playerId);
    if (player && player.ws && player.ws.readyState === 1) {
      player.ws.send(message);
    }
  }

  getPublicRooms() {
    const list = [];
    for (const room of this.rooms.values()) {
      if (room.isPublic && room.playerCount > 0 && !room.isFull) {
        list.push(room.toPublicJSON());
      }
    }
    return list;
  }

  toggleRoomPublic(ws, payload) {
    const ctx = this.getRoomForWs(ws);
    if (!ctx) return;
    const { room, playerId } = ctx;
    if (playerId !== room.hostId) return;
    if (typeof payload.isPublic === 'boolean') {
      room.isPublic = payload.isPublic;
      this.broadcastLobbyUpdate(room);
    }
  }

  getStats() {
    return {
      rooms: this.rooms.size,
      players: this.wsToPlayer.size,
    };
  }
}

module.exports = { RoomManager, Room, Player };
