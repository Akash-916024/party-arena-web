/**
 * Party Arena Web — Room Manager (Client)
 * Handles room state, lobby UI, game selection, and player management.
 * Mirrors the Flutter app's room_manager.dart
 */

const Room = (() => {
  // ─── State ──────────────────────────────────────────────────────
  let currentRoom = null;
  let localPlayerId = null;
  let localPlayerName = '';
  let localColorIndex = 0;

  // Game definitions (fetched from server or hardcoded fallback)
  const GAMES = [
    { id: 'pong', name: 'Pong', description: 'Classic paddle battle! First to 7 points wins.', icon: '🏓', minPlayers: 2, maxPlayers: 2, type: 'realtime', color: '#4CAF50' },
    { id: 'tic-tac-toe', name: 'Tic-Tac-Toe', description: 'Get three in a row to win!', icon: '❌', minPlayers: 2, maxPlayers: 2, type: 'turnbased', color: '#2196F3' },
    { id: 'reaction', name: 'Reaction Speed', description: 'Click the fastest when the signal appears!', icon: '⚡', minPlayers: 2, maxPlayers: 8, type: 'simultaneous', color: '#FF9800' },
    { id: 'connect-four', name: 'Connect Four', description: 'Drop discs and get four in a row!', icon: '🔴', minPlayers: 2, maxPlayers: 2, type: 'turnbased', color: '#F44336' },
    { id: 'memory', name: 'Memory Match', description: 'Flip cards and find matching pairs!', icon: '🧠', minPlayers: 2, maxPlayers: 4, type: 'turnbased', color: '#9C27B0' },
    { id: 'tug-of-war', name: 'Tug of War', description: 'Rapid tap masher! Pull the rope across the center line.', icon: '🪢', minPlayers: 2, maxPlayers: 2, type: 'realtime', color: '#E91E63' },
    { id: 'bomb-tag', name: 'Bomb Tag', description: 'Pass the ticking bomb before it explodes! Last survivor wins.', icon: '💣', minPlayers: 2, maxPlayers: 8, type: 'realtime', color: '#FF5722' },
  ];

  // ─── Load saved profile ─────────────────────────────────────────
  function loadProfile() {
    localPlayerName = localStorage.getItem('pa_name') || '';
    localColorIndex = parseInt(localStorage.getItem('pa_color') || '0', 10);
  }

  function saveProfile(name, colorIndex) {
    localPlayerName = name;
    localColorIndex = colorIndex;
    localStorage.setItem('pa_name', name);
    localStorage.setItem('pa_color', String(colorIndex));
  }

  // ─── Network Event Handlers ─────────────────────────────────────
  function setupNetworkListeners() {
    Network.on(Network.MessageType.ROOM_CREATED, (data) => {
      localPlayerId = data.playerId;
      currentRoom = data.room;
      App.navigate('lobby');
    });

    Network.on(Network.MessageType.ROOM_JOINED, (data) => {
      localPlayerId = data.playerId;
      currentRoom = data.room;
      App.navigate('lobby');
    });

    Network.on(Network.MessageType.ROOM_ERROR, (data) => {
      UI.showToast(data.error || 'Room error', 'error');
      if (data.kicked) {
        currentRoom = null;
        localPlayerId = null;
        App.navigate('home');
      }
    });

    Network.on(Network.MessageType.LOBBY_UPDATE, (data) => {
      currentRoom = data;
      renderLobby();
    });

    Network.on(Network.MessageType.GAME_COUNTDOWN, (data) => {
      Sound.playCountdown(data.seconds === 0);
      UI.showCountdown(data.seconds);
    });

    Network.on(Network.MessageType.GAME_START, (data) => {
      Sound.playCountdown(true);
      App.navigate('game', {
        gameId: data.gameId,
        players: data.players,
      });
    });

    Network.on(Network.MessageType.GAME_END, (data) => {
      Sound.playWin();
      if (typeof Profile !== 'undefined') {
        const gameId = (currentRoom && currentRoom.selectedGameId) || data.gameId || 'game';
        const gameInfo = GAMES.find((g) => g.id === gameId);
        const won = data.winnerId === localPlayerId;
        Profile.recordMatchResult(gameId, gameInfo ? gameInfo.name : gameId, won);
      }
      App.navigate('results', data);
    });

    Network.on(Network.MessageType.TOURNAMENT_UPDATE, (data) => {
      TournamentClient.setTournament(data);
      renderLobby(); // Update lobby tournament info
    });

    Network.on(Network.MessageType.TOURNAMENT_END, (data) => {
      TournamentClient.setTournament(data);
      if (typeof Profile !== 'undefined' && data.standings) {
        const myIndex = data.standings.findIndex((s) => s.playerId === localPlayerId || s.name === localPlayerName);
        if (myIndex >= 0) {
          Profile.recordTournamentResult(myIndex + 1);
        }
      }
      App.navigate('tournament-results', data);
    });

    Network.on('connectionChange', (data) => {
      updateConnectionStatus(data.connected);
    });
  }

  // ─── Actions ────────────────────────────────────────────────────
  function createRoom() {
    loadProfile();
    if (!localPlayerName) {
      App.navigate('profile', { returnTo: 'create' });
      return;
    }
    const avatar = typeof Profile !== 'undefined' ? Profile.getProfile().avatar : '👾';
    Network.send(Network.MessageType.CREATE_ROOM, {
      name: localPlayerName,
      colorIndex: localColorIndex,
      avatar: avatar,
    });
  }

  function joinRoom(code) {
    loadProfile();
    if (!localPlayerName) {
      App.navigate('profile', { returnTo: 'join', roomCode: code });
      return;
    }
    const avatar = typeof Profile !== 'undefined' ? Profile.getProfile().avatar : '👾';
    Network.send(Network.MessageType.JOIN_ROOM, {
      roomCode: code.toUpperCase(),
      name: localPlayerName,
      colorIndex: localColorIndex,
      avatar: avatar,
    });
  }

  function leaveRoom() {
    Network.send(Network.MessageType.LEAVE_ROOM, {});
    currentRoom = null;
    localPlayerId = null;
    App.navigate('home');
  }

  function toggleReady() {
    if (!currentRoom || !localPlayerId) return;
    const localPlayer = currentRoom.players.find((p) => p.id === localPlayerId);
    if (!localPlayer) return;
    Network.send(Network.MessageType.PLAYER_READY, {
      isReady: !localPlayer.isReady,
    });
  }

  function selectGame(gameId) {
    if (!isHost()) return;
    Network.send(Network.MessageType.SELECT_GAME, { gameId });
  }

  function startGame() {
    if (!isHost()) return;
    Network.send(Network.MessageType.GAME_START, {
      gameId: currentRoom.selectedGameId,
    });
  }

  function kickPlayer(targetPlayerId) {
    if (!isHost()) return;
    Network.send(Network.MessageType.KICK_PLAYER, { targetPlayerId });
  }

  // ─── Queries ────────────────────────────────────────────────────
  function isHost() {
    return currentRoom && localPlayerId === currentRoom.hostId;
  }

  function getLocalPlayer() {
    if (!currentRoom || !localPlayerId) return null;
    return currentRoom.players.find((p) => p.id === localPlayerId);
  }

  function allReady() {
    if (!currentRoom || currentRoom.players.length < 2) return false;
    return currentRoom.players.every((p) => p.isReady || p.id === currentRoom.hostId);
  }

  function canStartGame() {
    if (!isHost() || !currentRoom.selectedGameId) return false;
    const game = GAMES.find((g) => g.id === currentRoom.selectedGameId);
    if (!game) return false;
    const count = currentRoom.players.length;
    return count >= game.minPlayers && count <= game.maxPlayers && allReady();
  }

  // ─── Rendering ──────────────────────────────────────────────────
  function renderLobby() {
    if (!currentRoom) return;
    const app = document.getElementById('app');
    const _isHost = isHost();
    const _canStart = canStartGame();
    const tournament = currentRoom.tournament;

    app.innerHTML = `
      <div class="page" id="lobby-page">
        <div class="nav-bar">
          <button class="nav-back" onclick="Room.leaveRoom()" id="btn-leave-room">←</button>
          <span class="nav-title">${UI.escapeHTML(currentRoom.roomName || 'Party Room')}</span>
          <div class="spacer"></div>
          <button class="sound-toggle-btn mr-s" onclick="Sound.toggleMute()" title="Toggle Sound">
            ${Sound.isMuted ? '🔇' : '🔊'}
          </button>
          <div class="connection-status">
            <span class="status-dot ${Network.isConnected ? 'connected' : 'disconnected'}"></span>
            <span>${Network.isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>

        <div class="page-content-wide">
          <!-- Room Code & Sharing -->
          <div class="text-center mb-m">
            <div class="flex flex-center gap-s mb-s">
              <span class="body-sm text-muted" style="text-transform:uppercase;letter-spacing:0.15em">Room Code</span>
              ${_isHost ? `
                <button class="privacy-toggle ${currentRoom.isPublic ? 'public' : 'private'}" onclick="Room.togglePrivacy()" title="Click to toggle public/private">
                  ${currentRoom.isPublic ? '🌐 Public Room' : '🔒 Private Room'}
                </button>
              ` : `
                <span class="privacy-toggle ${currentRoom.isPublic ? 'public' : 'private'}">
                  ${currentRoom.isPublic ? '🌐 Public' : '🔒 Private'}
                </span>
              `}
            </div>
            ${UI.renderRoomCode(currentRoom.roomCode)}
            <div class="mt-s flex flex-center gap-s" style="flex-wrap:wrap">
              <button class="btn btn-secondary btn-sm" onclick="QRCodeHelper.showShareModal('${currentRoom.roomCode}')" id="btn-share-qr">
                📱 QR Code & Share
              </button>
              <button class="btn btn-secondary btn-sm" onclick="QRCodeHelper.copyInviteLink('${currentRoom.roomCode}')" id="btn-copy-link">
                📋 Copy Link
              </button>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-l);align-items:start" class="lobby-grid">
            <!-- Left: Players -->
            <div>
              <div class="heading-sm mb-m">Players (${currentRoom.players.length}/${currentRoom.maxPlayers})</div>
              <div class="player-list" id="player-list">
                ${currentRoom.players
                  .map((p) =>
                    UI.renderPlayerItem(p, p.id === localPlayerId, _isHost)
                  )
                  .join('')}
              </div>

              <div class="mt-l flex gap-m" style="flex-wrap:wrap">
                ${!_isHost
                  ? `<button class="btn ${getLocalPlayer()?.isReady ? 'btn-secondary' : 'btn-success'}" 
                       onclick="Room.toggleReady()" id="btn-toggle-ready">
                       ${getLocalPlayer()?.isReady ? '✓ Ready' : 'Ready Up'}
                     </button>`
                  : ''}
                ${_isHost && currentRoom.selectedGameId
                  ? `<button class="btn btn-primary ${_canStart ? '' : 'disabled'}" 
                       onclick="Room.startGame()" ${_canStart ? '' : 'disabled'}
                       id="btn-start-game">
                       🎮 Start Game
                     </button>`
                  : ''}
                ${_isHost
                  ? `<button class="btn btn-secondary" onclick="Room.showTournamentSetup()" id="btn-tournament-setup">
                       🏆 Tournament
                     </button>`
                  : ''}
              </div>

              ${tournament
                ? `<div class="card mt-l">
                     <div class="heading-sm">🏆 Tournament</div>
                     <div class="body-sm mt-s">Mode: ${tournament.mode}</div>
                     <div class="body-sm">Game ${tournament.gamesPlayed + 1} of ${tournament.totalGames}</div>
                     <div class="tournament-progress mt-m">
                       ${tournament.gameIds.map((_, i) =>
                         `<div class="tournament-dot ${i < tournament.gamesPlayed ? 'completed' : i === tournament.gamesPlayed ? 'current' : ''}"></div>`
                       ).join('')}
                     </div>
                     ${_isHost
                       ? `<button class="btn btn-primary btn-sm mt-m" onclick="Room.startTournamentGame()">
                            ▶ Start Next Game
                          </button>`
                       : ''}
                   </div>`
                : ''}
            </div>

            <!-- Right: Game Selection -->
            <div>
              <div class="heading-sm mb-m">${_isHost ? 'Select Game' : 'Selected Game'}</div>
              ${_isHost
                ? `<div class="game-grid" style="grid-template-columns:1fr" id="game-grid">
                     ${GAMES.map((g) => UI.renderGameCard(g, g.id === currentRoom.selectedGameId)).join('')}
                   </div>`
                : currentRoom.selectedGameId
                  ? `<div class="card">
                       <div style="font-size:3rem;margin-bottom:var(--space-s)">
                         ${GAMES.find((g) => g.id === currentRoom.selectedGameId)?.icon || '🎮'}
                       </div>
                       <div class="heading-md">${GAMES.find((g) => g.id === currentRoom.selectedGameId)?.name || 'Unknown'}</div>
                       <div class="body-md mt-s">${GAMES.find((g) => g.id === currentRoom.selectedGameId)?.description || ''}</div>
                     </div>`
                  : '<div class="card"><div class="body-md text-center">Waiting for host to select a game...</div></div>'}
            </div>
          </div>

          <!-- Social Emotes -->
          <div class="mt-l">
            ${Reactions.renderEmoteBar()}
          </div>
        </div>

        <!-- Chat Drawer -->
        ${Chat.renderDrawer()}
      </div>
    `;
  }

  function showTournamentSetup() {
    if (!isHost()) return;
    const gameCheckboxes = GAMES.map(
      (g) => `
      <label style="display:flex;align-items:center;gap:var(--space-s);cursor:pointer;padding:8px 0;">
        <input type="checkbox" value="${g.id}" class="tournament-game-check" checked>
        <span>${g.icon} ${g.name}</span>
      </label>
    `
    ).join('');

    UI.showModal(`
      <div class="heading-md mb-l">🏆 Tournament Setup</div>
      <div class="mb-m">
        <label class="body-sm" style="display:block;margin-bottom:var(--space-s)">MODE</label>
        <select class="input" id="tournament-mode">
          <option value="individual">Individual (Points)</option>
          <option value="team">Team (2 Teams)</option>
          <option value="knockout">Knockout (Bracket)</option>
        </select>
      </div>
      <div class="mb-m">
        <label class="body-sm" style="display:block;margin-bottom:var(--space-s)">GAMES</label>
        <div id="tournament-games">${gameCheckboxes}</div>
      </div>
      <div class="flex gap-m mt-l">
        <button class="btn btn-secondary" onclick="UI.hideModal()">Cancel</button>
        <button class="btn btn-primary" onclick="Room.createTournament()">Start Tournament</button>
      </div>
    `);
  }

  function createTournament() {
    const mode = document.getElementById('tournament-mode').value;
    const checkboxes = document.querySelectorAll('.tournament-game-check:checked');
    const gameIds = Array.from(checkboxes).map((cb) => cb.value);

    if (gameIds.length < 2) {
      UI.showToast('Select at least 2 games', 'error');
      return;
    }

    Network.send(Network.MessageType.TOURNAMENT_SETUP, {
      mode,
      gameIds,
      numberOfGames: gameIds.length,
    });

    UI.hideModal();
    UI.showToast('Tournament created!', 'success');
  }

  function startTournamentGame() {
    if (!isHost() || !currentRoom.tournament) return;
    Network.send(Network.MessageType.TOURNAMENT_START, {});
  }

  function togglePrivacy() {
    if (!isHost() || !currentRoom) return;
    const newStatus = !currentRoom.isPublic;
    Network.send(Network.MessageType.TOGGLE_PUBLIC, { isPublic: newStatus });
    if (typeof Sound !== 'undefined' && Sound.playClick) {
      Sound.playClick();
    }
  }

  function updateConnectionStatus(connected) {
    const dots = document.querySelectorAll('.status-dot');
    dots.forEach((dot) => {
      dot.className = `status-dot ${connected ? 'connected' : 'disconnected'}`;
    });
  }

  return {
    GAMES,
    loadProfile,
    saveProfile,
    setupNetworkListeners,
    createRoom,
    joinRoom,
    leaveRoom,
    toggleReady,
    selectGame,
    startGame,
    kickPlayer,
    isHost,
    getLocalPlayer,
    allReady,
    canStartGame,
    renderLobby,
    showTournamentSetup,
    createTournament,
    startTournamentGame,
    togglePrivacy,
    get currentRoom() { return currentRoom; },
    get localPlayerId() { return localPlayerId; },
    get localPlayerName() { return localPlayerName; },
    get localColorIndex() { return localColorIndex; },
  };
})();
