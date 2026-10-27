/**
 * Party Arena Web — Network Protocol
 * Defines all message types and encoding/decoding utilities.
 * Mirrors the original Flutter app's protocol.dart
 */

const MessageType = {
  // Room lifecycle
  CREATE_ROOM: 'createRoom',
  JOIN_ROOM: 'joinRoom',
  LEAVE_ROOM: 'leaveRoom',
  ROOM_CREATED: 'roomCreated',
  ROOM_JOINED: 'roomJoined',
  ROOM_ERROR: 'roomError',
  LOBBY_UPDATE: 'lobbyUpdate',
  PLAYER_READY: 'playerReady',
  KICK_PLAYER: 'kickPlayer',
  CHAT_MESSAGE: 'chatMessage',

  // Game lifecycle
  SELECT_GAME: 'selectGame',
  GAME_START: 'gameStart',
  GAME_INPUT: 'gameInput',
  GAME_STATE: 'gameState',
  GAME_END: 'gameEnd',
  GAME_COUNTDOWN: 'gameCountdown',

  // Tournament
  TOURNAMENT_SETUP: 'tournamentSetup',
  TOURNAMENT_START: 'tournamentStart',
  TOURNAMENT_UPDATE: 'tournamentUpdate',
  TOURNAMENT_NEXT_GAME: 'tournamentNextGame',
  TOURNAMENT_END: 'tournamentEnd',

  // System
  PING: 'ping',
  PONG: 'pong',
  ERROR: 'error',
};

const RoomState = {
  WAITING: 'waiting',
  READY: 'ready',
  IN_GAME: 'inGame',
  TOURNAMENT: 'tournament',
};

const TournamentMode = {
  INDIVIDUAL: 'individual',
  TEAM: 'team',
  KNOCKOUT: 'knockout',
};

const TournamentState = {
  SETUP: 'setup',
  IN_PROGRESS: 'inProgress',
  COMPLETED: 'completed',
};

// Scoring constants (matching original Flutter app)
const POINTS = {
  FIRST: 3,
  SECOND: 2,
  THIRD: 1,
  OTHER: 0,
};

/**
 * Creates a protocol message object.
 * @param {string} type - MessageType constant
 * @param {object} payload - Message data
 * @returns {string} JSON-encoded message
 */
function createMessage(type, payload = {}) {
  return JSON.stringify({ type, payload, timestamp: Date.now() });
}

/**
 * Parses a raw WebSocket message string into a protocol message.
 * @param {string} raw - Raw message string
 * @returns {{ type: string, payload: object, timestamp: number } | null}
 */
function parseMessage(raw) {
  try {
    const msg = JSON.parse(raw);
    if (!msg.type) return null;
    return {
      type: msg.type,
      payload: msg.payload || {},
      timestamp: msg.timestamp || Date.now(),
    };
  } catch {
    return null;
  }
}

/**
 * Generates a random room code (4 uppercase alphanumeric characters).
 * Avoids ambiguous characters (0/O, 1/I/L) for readability.
 */
function generateRoomCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

module.exports = {
  MessageType,
  RoomState,
  TournamentMode,
  TournamentState,
  POINTS,
  createMessage,
  parseMessage,
  generateRoomCode,
};
