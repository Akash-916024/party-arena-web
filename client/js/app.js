/**
 * Party Arena Web — Main Application Router & Controller
 * Manages screen transitions, game lifecycles, and auto-connection.
 */

const App = (() => {
  let activeGame = null;
  let currentScreen = 'home';

  // ─── Screen Rendering ───────────────────────────────────────────

  function renderHome() {
    Room.loadProfile();
    const name = Room.localPlayerName || 'Player';
    const color = UI.getPlayerColor(Room.localColorIndex);

    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="page" id="home-page">
        <div class="nav-bar">
          <div class="flex flex-center gap-s">
            <span style="font-size:1.5rem">🎮</span>
            <span class="nav-title">Party Arena</span>
          </div>
          <div class="spacer"></div>
          <button class="sound-toggle-btn" onclick="Sound.toggleMute()" title="Toggle Sound" style="margin-right:12px">
            ${Sound.isMuted ? '🔇' : '🔊'}
          </button>
          <div class="connection-status">
            <span class="status-dot ${Network.isConnected ? 'connected' : 'disconnected'}"></span>
            <span>${Network.isConnected ? 'Server Online' : 'Connecting...'}</span>
          </div>
        </div>

        <div class="page-content text-center">
          <div class="hero-icon">⚔️</div>
          <h1 class="hero-title">PARTY ARENA</h1>
          <p class="hero-subtitle">Fast, competitive multiplayer mini-games in your browser</p>

          <!-- Player profile pill -->
          <div class="card p-m mb-l flex flex-center gap-m" style="cursor:pointer;max-width:320px;margin-left:auto;margin-right:auto" onclick="App.navigate('profile')">
            <div class="player-avatar" style="background:${color};width:42px;height:42px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.2rem">
              ${name[0].toUpperCase()}
            </div>
            <div style="text-align:left;flex:1">
              <div class="heading-xs" style="color:var(--text-primary)">${UI.escapeHTML(name)}</div>
              <div class="body-sm text-muted">Tap to customize avatar</div>
            </div>
            <span style="color:var(--accent);font-size:1.2rem">✎</span>
          </div>

          <!-- PWA Install Banner -->
          <div id="pwa-banner" class="pwa-install-banner">
            <div class="flex flex-center gap-s">
              <span style="font-size:1.4rem">📲</span>
              <span class="body-sm" style="font-weight:600">Install Party Arena App</span>
            </div>
            <button class="btn btn-primary btn-sm" onclick="App.installPWA()">Install</button>
          </div>

          <!-- Main Actions -->
          <div class="flex-col gap-m" style="max-width:360px;margin:0 auto;width:100%">
            <button class="btn btn-primary btn-full" onclick="App.handleCreateRoom()" id="btn-create-room">
              ✨ Create Party Room
            </button>
            <button class="btn btn-secondary btn-full" onclick="PublicRooms.showModal()" id="btn-browse-rooms">
              🌐 Browse Public Rooms
            </button>
            <button class="btn btn-secondary btn-full" onclick="App.navigate('join')" id="btn-join-room">
              🔑 Join with Room Code
            </button>
          </div>

          <!-- Feature Highlights -->
          <div class="mt-xl text-left" style="max-width:440px;margin-left:auto;margin-right:auto">
            <div class="heading-xs text-muted mb-m uppercase" style="letter-spacing:0.1em;text-align:center">Included Games</div>
            <div class="flex flex-center gap-m" style="flex-wrap:wrap;justify-content:center">
              ${Room.GAMES.map(
                (g) => `
                <div class="card p-s flex flex-center gap-s" style="padding:8px 14px;border-radius:var(--radius-full);background:var(--surface-glass)">
                  <span>${g.icon}</span>
                  <span class="body-sm" style="font-weight:600">${g.name}</span>
                </div>
              `
              ).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderProfile(params = {}) {
    Room.loadProfile();
    let selectedColor = Room.localColorIndex;

    const colorsHTML = UI.PLAYER_COLORS.map(
      (c, idx) => `
      <div class="color-swatch ${idx === selectedColor ? 'selected' : ''}" 
           style="background:${c};width:38px;height:38px;border-radius:50%;cursor:pointer;border:3px solid ${idx === selectedColor ? '#fff' : 'transparent'};transition:transform 0.2s"
           onclick="App.selectColor(${idx})"
           data-color-idx="${idx}">
      </div>
    `
    ).join('');

    UI.showModal(`
      <div class="heading-md mb-m">Player Profile</div>
      <div class="mb-m">
        <label class="body-sm text-muted block mb-s">YOUR NAME</label>
        <input type="text" class="input w-full" id="profile-name-input" maxlength="15" value="${UI.escapeHTML(Room.localPlayerName)}" placeholder="Enter your name...">
      </div>
      <div class="mb-l">
        <label class="body-sm text-muted block mb-s">CHOOSE COLOR</label>
        <div class="flex gap-s" style="flex-wrap:wrap" id="color-picker-grid">${colorsHTML}</div>
      </div>
      <div class="flex gap-m">
        <button class="btn btn-secondary flex-1" onclick="UI.hideModal()">Cancel</button>
        <button class="btn btn-primary flex-1" onclick="App.saveProfileAndContinue('${params.returnTo || ''}', '${params.roomCode || ''}')">Save</button>
      </div>
    `);

    // Auto-focus input
    setTimeout(() => {
      const input = document.getElementById('profile-name-input');
      if (input) input.focus();
    }, 100);
  }

  function selectColor(idx) {
    document.querySelectorAll('.color-swatch').forEach((swatch) => {
      const swatchIdx = parseInt(swatch.dataset.colorIdx, 10);
      if (swatchIdx === idx) {
        swatch.style.border = '3px solid #fff';
        swatch.style.transform = 'scale(1.15)';
      } else {
        swatch.style.border = '3px solid transparent';
        swatch.style.transform = 'scale(1)';
      }
    });
    App.currentSelectedColor = idx;
  }

  function saveProfileAndContinue(returnTo, roomCode) {
    const input = document.getElementById('profile-name-input');
    const name = (input ? input.value : '').trim();
    if (!name) {
      UI.showToast('Please enter your player name', 'warning');
      return;
    }

    const colorIdx = App.currentSelectedColor !== undefined ? App.currentSelectedColor : Room.localColorIndex;
    Room.saveProfile(name, colorIdx);
    UI.hideModal();

    if (returnTo === 'create') {
      Room.createRoom();
    } else if (returnTo === 'join' && roomCode) {
      Room.joinRoom(roomCode);
    } else {
      if (currentScreen === 'home') renderHome();
    }
  }

  function renderJoin() {
    UI.showModal(`
      <div class="heading-md mb-m">Join Party Arena</div>
      <div class="body-sm text-muted mb-m">Enter the 4-letter room code from your host:</div>
      <div class="mb-l">
        <input type="text" class="input w-full text-center" id="room-code-input" maxlength="4" placeholder="e.g. ABCD" style="font-size:2rem;letter-spacing:0.3em;text-transform:uppercase;font-family:var(--font-heading);font-weight:900">
      </div>
      <div class="flex gap-m">
        <button class="btn btn-secondary flex-1" onclick="UI.hideModal()">Cancel</button>
        <button class="btn btn-primary flex-1" onclick="App.handleJoinSubmit()">Join</button>
      </div>
    `);

    setTimeout(() => {
      const input = document.getElementById('room-code-input');
      if (input) {
        input.focus();
        input.addEventListener('keyup', (e) => {
          if (e.key === 'Enter') App.handleJoinSubmit();
        });
      }
    }, 100);
  }

  function handleJoinSubmit() {
    const input = document.getElementById('room-code-input');
    const code = (input ? input.value : '').trim().toUpperCase();
    if (code.length !== 4) {
      UI.showToast('Room code must be 4 characters', 'warning');
      return;
    }
    UI.hideModal();
    Room.joinRoom(code);
  }

  function handleCreateRoom() {
    Room.createRoom();
  }

  function renderGame(params) {
    const app = document.getElementById('app');
    const gameInfo = Room.GAMES.find((g) => g.id === params.gameId) || { name: 'Game', icon: '🎮' };

    app.innerHTML = `
      <div class="page" id="game-page">
        <div class="nav-bar">
          <div class="flex flex-center gap-s">
            <span>${gameInfo.icon}</span>
            <span class="nav-title">${gameInfo.name}</span>
          </div>
          <div class="spacer"></div>
          <button class="sound-toggle-btn" onclick="Sound.toggleMute()" title="Toggle Sound" style="margin-right:12px">
            ${Sound.isMuted ? '🔇' : '🔊'}
          </button>
          <button class="btn btn-secondary btn-sm" onclick="Room.leaveRoom()" id="btn-quit-game">Leave</button>
        </div>
        <div id="game-mount-point" class="w-full flex-1 flex flex-col flex-center"></div>
        <div class="mt-s w-full">${Reactions.renderEmoteBar()}</div>
      </div>
    `;

    const mount = document.getElementById('game-mount-point');
    if (activeGame) {
      activeGame.destroy();
      activeGame = null;
    }

    const players = params.players || Room.currentRoom?.players || [];
    const localId = Room.localPlayerId;

    switch (params.gameId) {
      case 'pong':
        activeGame = new PongGameRenderer(mount, players, localId);
        break;
      case 'tic-tac-toe':
        activeGame = new TicTacToeGameRenderer(mount, players, localId);
        break;
      case 'reaction':
        activeGame = new ReactionGameRenderer(mount, players, localId);
        break;
      case 'connect-four':
        activeGame = new ConnectFourGameRenderer(mount, players, localId);
        break;
      case 'memory':
        activeGame = new MemoryGameRenderer(mount, players, localId);
        break;
      case 'tug-of-war':
        activeGame = new TugOfWarGameRenderer(mount, players, localId);
        break;
      case 'bomb-tag':
        activeGame = new BombTagGameRenderer(mount, players, localId);
        break;
      default:
        console.error('Unknown game ID:', params.gameId);
        return;
    }

    activeGame.init();
  }

  function renderResults(data) {
    if (activeGame) {
      activeGame.destroy();
      activeGame = null;
    }

    const app = document.getElementById('app');
    const players = Room.currentRoom?.players || [];
    const scores = data.scores || {};
    const ranking = data.ranking || Object.keys(scores);
    const winnerId = ranking[0];
    const winner = players.find((p) => p.id === winnerId) || { name: 'Player' };
    const isLocalWinner = winnerId === Room.localPlayerId;
    const isTournament = !!Room.currentRoom?.tournament;

    const rankItemsHTML = ranking
      .map((pid, idx) => {
        const p = players.find((pl) => pl.id === pid) || { name: 'Player', colorIndex: 0 };
        const color = UI.getPlayerColor(p.colorIndex || 0);
        const medals = ['🥇', '🥈', '🥉'];
        const medal = medals[idx] || `#${idx + 1}`;

        return `
        <div class="results-rank-item" style="animation-delay:${idx * 120}ms">
          <div class="results-rank-number">${medal}</div>
          <div class="player-avatar" style="background:${color};width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1rem">
            ${p.name[0].toUpperCase()}
          </div>
          <div class="results-rank-name">${UI.escapeHTML(p.name)}${pid === Room.localPlayerId ? ' (You)' : ''}</div>
          <div class="results-rank-score">${scores[pid] ?? 0} pts</div>
        </div>
      `;
      })
      .join('');

    app.innerHTML = `
      <div class="page" id="results-page">
        <div class="page-content text-center">
          <div class="results-trophy">${isLocalWinner ? '🏆' : '👏'}</div>
          <div class="heading-lg mt-m">
            ${isLocalWinner ? 'Victory!' : `${UI.escapeHTML(winner.name)} Wins!`}
          </div>
          <div class="body-md text-muted mt-s">${data.reason === 'draw' ? "It's a tie!" : 'Match Finished'}</div>

          <div class="results-rank-list mt-l" style="max-width:440px;margin-left:auto;margin-right:auto">
            ${rankItemsHTML}
          </div>

          <div class="mt-xl flex flex-center gap-m" style="max-width:400px;margin-left:auto;margin-right:auto">
            ${
              isTournament
                ? `<button class="btn btn-primary btn-full" onclick="App.navigate('lobby')">
                     Continue Tournament ▶
                   </button>`
                : `<button class="btn btn-primary btn-full" onclick="App.navigate('lobby')">
                     Back to Lobby
                   </button>`
            }
          </div>
        </div>
      </div>
    `;
  }

  // ─── Router ─────────────────────────────────────────────────────

  function navigate(screen, data = {}) {
    currentScreen = screen;

    switch (screen) {
      case 'home':
        renderHome();
        break;
      case 'profile':
        renderProfile(data);
        break;
      case 'join':
        renderJoin();
        break;
      case 'lobby':
        Room.renderLobby();
        break;
      case 'game':
        renderGame(data);
        break;
      case 'results':
        renderResults(data);
        break;
      case 'tournament-results':
        const app = document.getElementById('app');
        app.innerHTML = TournamentClient.renderTournamentResults(data);
        break;
      default:
        renderHome();
        break;
    }
  }

  // ─── Initialization ─────────────────────────────────────────────

  async function start() {
    Room.loadProfile();
    Room.setupNetworkListeners();

    // Hook network state updates to active game
    Network.on(Network.MessageType.GAME_STATE, (state) => {
      if (activeGame) {
        activeGame.onStateUpdate(state);
      }
    });

    // Initial render
    navigate('home');

    // Auto connect to WebSocket server
    try {
      const serverUrl = Network.getDefaultServerUrl();
      console.log('[App] Connecting to server at:', serverUrl);
      await Network.connect(serverUrl);
    } catch (err) {
      console.warn('[App] Initial connection failed, will auto-retry in background');
    }

    // Auto-join from URL parameter (e.g. ?room=ABCD)
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    if (roomParam && roomParam.length === 4) {
      setTimeout(() => {
        Room.joinRoom(roomParam.toUpperCase());
      }, 500);
    }

    // Register PWA service worker
    if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  }

  let deferredInstallPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    const banner = document.getElementById('pwa-banner');
    if (banner) banner.style.display = 'flex';
  });

  function installPWA() {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    deferredInstallPrompt.userChoice.then((choice) => {
      if (choice.outcome === 'accepted') {
        const banner = document.getElementById('pwa-banner');
        if (banner) banner.style.display = 'none';
      }
      deferredInstallPrompt = null;
    });
  }

  return {
    start,
    navigate,
    renderHome,
    renderProfile,
    renderJoin,
    selectColor,
    saveProfileAndContinue,
    handleJoinSubmit,
    handleCreateRoom,
    installPWA,
    currentSelectedColor: 0,
    get activeGame() { return activeGame; },
  };
})();

// Start application when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  App.start();
});
