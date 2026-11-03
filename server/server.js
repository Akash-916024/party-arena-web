/**
 * Party Arena Web — WebSocket Server
 * Main entry point. Handles connections, routes messages,
 * and orchestrates rooms, games, and tournaments.
 */

const http = require('http');
const { WebSocketServer } = require('ws');
const fs = require('fs');
const path = require('path');

const {
  MessageType,
  RoomState,
  createMessage,
  parseMessage,
} = require('./protocol');
const { RoomManager } = require('./room-manager');
const { createGame, getAllGames, getGameById } = require('./game-engine');
const { TournamentManager } = require('./tournament-manager');
const { botManager } = require('./bot-manager');

const PORT = process.env.PORT || 3000;

// ─── HTTP Server (serves static client files in development) ────────
const server = http.createServer((req, res) => {
  // CORS headers for cross-origin WebSocket
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // Health check endpoint
  if (pathname === '/health') {
    const stats = roomManager.getStats();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'ok',
        uptime: process.uptime(),
        ...stats,
      })
    );
    return;
  }

  // Games list API endpoint
  if (pathname === '/api/games') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getAllGames()));
    return;
  }

  // Public rooms API endpoint
  if (pathname === '/api/rooms') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(roomManager.getPublicRooms()));
    return;
  }

  // Serve static files from client directory (development mode)
  const clientDir = path.join(__dirname, '..', 'client');
  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.join(clientDir, filePath);

  // Security: prevent path traversal
  if (!filePath.startsWith(clientDir)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const extname = path.extname(filePath);
  const contentTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
  };

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentTypes[extname] || 'application/octet-stream',
    });
    res.end(data);
  });
});

// ─── WebSocket Server ───────────────────────────────────────────────
const wss = new WebSocketServer({ server });
const roomManager = new RoomManager();

// Heartbeat: detect dead connections
const HEARTBEAT_INTERVAL = 30000;

function heartbeat() {
  this.isAlive = true;
}

const heartbeatTimer = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      console.log('[WS] Terminating dead connection');
      roomManager.handleDisconnect(ws);
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, HEARTBEAT_INTERVAL);

wss.on('close', () => {
  clearInterval(heartbeatTimer);
});

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', heartbeat);

  console.log(`[WS] New connection (total: ${wss.clients.size})`);

  ws.on('message', (rawData) => {
    const msg = parseMessage(rawData.toString());
    if (!msg) return;

    try {
      handleMessage(ws, msg);
    } catch (err) {
      console.error('[WS] Error handling message:', err);
      ws.send(
        createMessage(MessageType.ERROR, {
          error: 'Internal server error.',
        })
      );
    }
  });

  ws.on('close', () => {
    console.log(`[WS] Connection closed (total: ${wss.clients.size})`);
    roomManager.handleDisconnect(ws);
  });

  ws.on('error', (err) => {
    console.error('[WS] Connection error:', err.message);
  });
});

// ─── Message Router ─────────────────────────────────────────────────
function handleMessage(ws, msg) {
  switch (msg.type) {
    // ─── Room ─────────────────────────────────────────
    case MessageType.CREATE_ROOM:
      roomManager.createRoom(ws, msg.payload);
      break;

    case MessageType.JOIN_ROOM:
      roomManager.joinRoom(ws, msg.payload);
      break;

    case MessageType.LEAVE_ROOM:
      roomManager.handleDisconnect(ws);
      break;

    case MessageType.PLAYER_READY:
      roomManager.setPlayerReady(ws, msg.payload);
      break;

    case MessageType.SELECT_GAME:
      handleSelectGame(ws, msg.payload);
      break;

    case MessageType.KICK_PLAYER:
      roomManager.kickPlayer(ws, msg.payload);
      break;

    case MessageType.CHAT_MESSAGE:
      handleChatMessage(ws, msg.payload);
      break;

    case MessageType.GET_ROOMS:
      ws.send(
        createMessage(MessageType.ROOMS_LIST, {
          rooms: roomManager.getPublicRooms(),
        })
      );
      break;

    case MessageType.TOGGLE_PUBLIC:
      roomManager.toggleRoomPublic(ws, msg.payload);
      break;

    case MessageType.ADD_BOT:
      roomManager.addBot(ws, msg.payload);
      break;

    case MessageType.REMOVE_BOT:
      roomManager.removeBot(ws, msg.payload);
      break;

    case MessageType.FILL_BOTS:
      roomManager.fillBots(ws, msg.payload);
      break;

    case MessageType.START_SOLO:
      handleStartSolo(ws, msg.payload);
      break;

    // ─── Game ─────────────────────────────────────────
    case MessageType.GAME_START:
      handleGameStart(ws, msg.payload);
      break;

    case MessageType.GAME_INPUT:
      handleGameInput(ws, msg.payload);
      break;

    // ─── Tournament ───────────────────────────────────
    case MessageType.TOURNAMENT_SETUP:
      handleTournamentSetup(ws, msg.payload);
      break;

    case MessageType.TOURNAMENT_START:
      handleTournamentStart(ws, msg.payload);
      break;

    // ─── System ───────────────────────────────────────
    case MessageType.PING:
      ws.send(createMessage(MessageType.PONG, { time: Date.now() }));
      break;

    default:
      console.log(`[WS] Unknown message type: ${msg.type}`);
  }
}

// ─── Chat / Emote Handler ───────────────────────────────────────────
function handleChatMessage(ws, payload) {
  const ctx = roomManager.getRoomForWs(ws);
  if (!ctx) return;
  const { room, playerId } = ctx;
  const player = room.players.get(playerId);
  if (!player) return;

  roomManager.broadcastToRoom(
    room,
    createMessage(MessageType.CHAT_MESSAGE, {
      playerId,
      playerName: player.name,
      colorIndex: player.colorIndex,
      emoji: payload.emoji || null,
      message: payload.message ? String(payload.message).slice(0, 50) : null,
      timestamp: Date.now(),
    })
  );
}

// ─── Game Handlers ──────────────────────────────────────────────────
function handleSelectGame(ws, payload) {
  const ctx = roomManager.getRoomForWs(ws);
  if (!ctx) return;

  const { room, playerId } = ctx;
  if (playerId !== room.hostId) return;

  room.selectedGameId = payload.gameId;
  roomManager.broadcastLobbyUpdate(room);
}

function handleGameStart(ws, payload) {
  const ctx = roomManager.getRoomForWs(ws);
  if (!ctx) return;

  const { room, playerId } = ctx;
  if (playerId !== room.hostId) return;

  const gameId = room.selectedGameId || payload.gameId;
  if (!gameId) return;

  const gameDef = getGameById(gameId);
  if (!gameDef) {
    ws.send(createMessage(MessageType.ROOM_ERROR, { error: 'Unknown game.' }));
    return;
  }

  // Get player list for the game
  const gamePlayers = room.getPlayersArray();
  if (gamePlayers.length < gameDef.minPlayers) {
    ws.send(
      createMessage(MessageType.ROOM_ERROR, {
        error: `At least ${gameDef.minPlayers} players needed to start ${gameDef.name}.`,
      })
    );
    return;
  }

  // Create game instance
  const broadcastFn = (message) => {
    roomManager.broadcastToRoom(room, message);
  };

  const game = createGame(gameId, gamePlayers, broadcastFn);
  if (!game) {
    ws.send(
      createMessage(MessageType.ROOM_ERROR, {
        error: 'Unknown game.',
      })
    );
    return;
  }

  game.series = room.series;

  // Wire up game end handler
  const originalEnd = game.end.bind(game);
  game.end = function (reason) {
    if (room.series) {
      const ranking = Object.entries(game.scores)
        .sort((a, b) => b[1] - a[1])
        .map(([id]) => id);
      const winnerId = ranking[0];
      if (winnerId) {
        room.series.scores[winnerId] = (room.series.scores[winnerId] || 0) + 1;
        room.series.gamesPlayed++;
        if (room.series.scores[winnerId] >= room.series.targetWins) {
          room.series.isComplete = true;
          room.series.winnerId = winnerId;
        }
      }
      game.series = room.series;
    }

    const result = originalEnd(reason);

    // Record result in tournament if active
    if (room.tournament) {
      room.tournament.recordMatchResult(result);

      if (room.tournament.isComplete) {
        // Tournament complete
        roomManager.broadcastToRoom(
          room,
          createMessage(MessageType.TOURNAMENT_END, room.tournament.toJSON())
        );
        room.tournament = null;
        room.state = RoomState.WAITING;
      } else {
        // Next tournament game
        roomManager.broadcastToRoom(
          room,
          createMessage(
            MessageType.TOURNAMENT_UPDATE,
            room.tournament.toJSON()
          )
        );
      }
    } else {
      room.state = RoomState.WAITING;
    }

    // Clean up
    botManager.onGameEnd(room);
    if (room.currentGame) {
      room.currentGame.destroy();
      room.currentGame = null;
    }

    // Reset ready states
    for (const p of room.players.values()) {
      if (!p.isHost) p.isReady = false;
    }

    roomManager.broadcastLobbyUpdate(room);
    return result;
  };

  room.currentGame = game;
  room.state = RoomState.IN_GAME;

  // Stage 1: Send lobby loading countdown
  roomManager.broadcastToRoom(
    room,
    createMessage(MessageType.GAME_COUNTDOWN, {
      gameId,
      seconds: 3,
      stage: 'loading',
      players: gamePlayers,
    })
  );

  // Transition to game arena after Stage 1 (3500ms)
  setTimeout(() => {
    roomManager.broadcastToRoom(
      room,
      createMessage(MessageType.GAME_START, {
        gameId,
        players: gamePlayers,
        series: room.series,
        arenaCountdown: 3,
      })
    );

    // Broadcast initial state so canvas renders paddles/rope in center
    game.broadcastState();

    // Stage 2: In-arena countdown (3000ms delay before physics and bot decision loops activate)
    setTimeout(() => {
      game.start();
      botManager.onGameStart(room, game);
    }, 3000);
  }, 3500);

  console.log(`[Game] Starting ${gameId} in room ${room.code}`);
}

function handleGameInput(ws, payload) {
  const ctx = roomManager.getRoomForWs(ws);
  if (!ctx) return;

  const { room, playerId } = ctx;
  if (!room.currentGame) return;

  room.currentGame.handleInput(playerId, payload);
}

function handleStartSolo(ws, payload) {
  const room = roomManager.createSoloRoom(ws, payload);
  if (!room) return;

  setTimeout(() => {
    handleGameStart(ws, { gameId: payload.gameId });
  }, 450);
}

// ─── Tournament Handlers ────────────────────────────────────────────
function handleTournamentSetup(ws, payload) {
  const ctx = roomManager.getRoomForWs(ws);
  if (!ctx) return;

  const { room, playerId } = ctx;
  if (playerId !== room.hostId) return;

  if (room.players.size < 2) {
    ws.send(
      createMessage(MessageType.ROOM_ERROR, {
        error: 'At least 2 players are needed for a tournament.',
      })
    );
    return;
  }

  const tournament = TournamentManager.createTournament({
    mode: payload.mode,
    gameIds: payload.gameIds,
    players: room.getPlayersArray(),
    numberOfGames: payload.numberOfGames,
  });

  room.tournament = tournament;
  room.state = RoomState.TOURNAMENT;

  roomManager.broadcastToRoom(
    room,
    createMessage(MessageType.TOURNAMENT_UPDATE, tournament.toJSON())
  );

  roomManager.broadcastLobbyUpdate(room);

  console.log(
    `[Tournament] Created ${payload.mode} tournament in room ${room.code} with ${payload.gameIds.length} games`
  );
}

function handleTournamentStart(ws, payload) {
  const ctx = roomManager.getRoomForWs(ws);
  if (!ctx) return;

  const { room, playerId } = ctx;
  if (playerId !== room.hostId || !room.tournament) return;

  // Start the first game
  const gameId = room.tournament.currentGameId;
  if (gameId) {
    room.selectedGameId = gameId;
    handleGameStart(ws, { gameId });
  }
}

// ─── Start Server ───────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║      🎮 Party Arena Web Server 🎮       ║
║                                          ║
║   HTTP + WS on port ${String(PORT).padEnd(19)}║
║   Health: http://localhost:${PORT}/health   ║
║                                          ║
╚══════════════════════════════════════════╝
  `);
});
