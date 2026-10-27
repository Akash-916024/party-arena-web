/**
 * Party Arena Web — Network Client
 * WebSocket connection manager with reconnection logic.
 * Mirrors the Flutter app's network_service.dart
 */

const Network = (() => {
  // ─── Protocol Constants (shared with server) ────────────────────
  const MessageType = {
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
    GET_ROOMS: 'getRooms',
    ROOMS_LIST: 'roomsList',
    TOGGLE_PUBLIC: 'togglePublic',
    SELECT_GAME: 'selectGame',
    GAME_START: 'gameStart',
    GAME_INPUT: 'gameInput',
    GAME_STATE: 'gameState',
    GAME_END: 'gameEnd',
    GAME_COUNTDOWN: 'gameCountdown',
    TOURNAMENT_SETUP: 'tournamentSetup',
    TOURNAMENT_START: 'tournamentStart',
    TOURNAMENT_UPDATE: 'tournamentUpdate',
    TOURNAMENT_NEXT_GAME: 'tournamentNextGame',
    TOURNAMENT_END: 'tournamentEnd',
    PING: 'ping',
    PONG: 'pong',
    ERROR: 'error',
  };

  // ─── State ──────────────────────────────────────────────────────
  let ws = null;
  let serverUrl = '';
  let isConnected = false;
  let reconnectTimer = null;
  let reconnectAttempts = 0;
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_BASE_DELAY = 1000;

  /** @type {Map<string, Set<Function>>} */
  const listeners = new Map();

  // ─── Public API ─────────────────────────────────────────────────

  /**
   * Connects to the WebSocket server.
   * @param {string} url - WebSocket URL (ws:// or wss://)
   * @returns {Promise<void>}
   */
  function connect(url) {
    return new Promise((resolve, reject) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      serverUrl = url;
      reconnectAttempts = 0;

      try {
        ws = new WebSocket(url);
      } catch (err) {
        reject(new Error('Failed to create WebSocket connection'));
        return;
      }

      ws.onopen = () => {
        isConnected = true;
        reconnectAttempts = 0;
        console.log('[Network] Connected to', url);
        emit('connectionChange', { connected: true });
        resolve();
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type) {
            emit(msg.type, msg.payload || {});
          }
        } catch (err) {
          console.error('[Network] Parse error:', err);
        }
      };

      ws.onclose = (event) => {
        isConnected = false;
        console.log('[Network] Disconnected', event.code, event.reason);
        emit('connectionChange', { connected: false });

        // Auto-reconnect unless intentionally closed
        if (event.code !== 1000 && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          scheduleReconnect();
        }
      };

      ws.onerror = (err) => {
        console.error('[Network] Error:', err);
        if (!isConnected) {
          reject(new Error('WebSocket connection failed'));
        }
      };
    });
  }

  /**
   * Disconnects from the server.
   */
  function disconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    reconnectAttempts = MAX_RECONNECT_ATTEMPTS; // Prevent auto-reconnect
    if (ws) {
      ws.close(1000, 'Client disconnect');
      ws = null;
    }
    isConnected = false;
    emit('connectionChange', { connected: false });
  }

  /**
   * Sends a message to the server.
   * @param {string} type - MessageType constant
   * @param {object} payload - Message data
   */
  function send(type, payload = {}) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn('[Network] Cannot send, not connected');
      return false;
    }
    ws.send(JSON.stringify({ type, payload, timestamp: Date.now() }));
    return true;
  }

  /**
   * Subscribes to a message type.
   * @param {string} type - Event/message type
   * @param {Function} callback
   * @returns {Function} Unsubscribe function
   */
  function on(type, callback) {
    if (!listeners.has(type)) {
      listeners.set(type, new Set());
    }
    listeners.get(type).add(callback);

    // Return unsubscribe function
    return () => {
      const set = listeners.get(type);
      if (set) set.delete(callback);
    };
  }

  /**
   * Removes a listener.
   */
  function off(type, callback) {
    const set = listeners.get(type);
    if (set) set.delete(callback);
  }

  /**
   * Removes all listeners for a type (or all types if no type given).
   */
  function removeAllListeners(type) {
    if (type) {
      listeners.delete(type);
    } else {
      listeners.clear();
    }
  }

  // ─── Internal ───────────────────────────────────────────────────

  function emit(type, data) {
    const set = listeners.get(type);
    if (set) {
      set.forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error(`[Network] Listener error for '${type}':`, err);
        }
      });
    }
  }

  function scheduleReconnect() {
    reconnectAttempts++;
    const delay = RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttempts - 1);
    console.log(
      `[Network] Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`
    );
    emit('connectionChange', { connected: false, reconnecting: true });
    reconnectTimer = setTimeout(() => {
      connect(serverUrl).catch(() => {
        // Will retry via onclose handler
      });
    }, delay);
  }

  // ─── Auto-detect server URL ─────────────────────────────────────
  function getDefaultServerUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = window.location.port || (protocol === 'wss:' ? '443' : '80');

    // If running from file:// or GitHub Pages, use the deployed Render URL
    if (
      window.location.protocol === 'file:' ||
      host.includes('github.io') ||
      host.includes('netlify.app') ||
      host.includes('vercel.app')
    ) {
      // TODO: Replace with your actual Render deployment URL
      return 'wss://party-arena-web.onrender.com';
    }

    // Local development
    return `${protocol}//${host}:${port}`;
  }

  return {
    MessageType,
    connect,
    disconnect,
    send,
    on,
    off,
    removeAllListeners,
    getDefaultServerUrl,
    get isConnected() { return isConnected; },
  };
})();
