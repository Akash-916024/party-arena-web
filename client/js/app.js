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
    const userProfile = typeof Profile !== 'undefined' ? Profile.getProfile() : { name: 'Player', avatar: '👾', matchesWon: 0, trophies: { gold: 0 } };
    const name = userProfile.name || Room.localPlayerName || 'Player';
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
          <button class="btn btn-icon btn-secondary mr-s" onclick="Profile.showProfileModal()" title="Player Profile & Stats" id="btn-open-profile" style="font-size:1.1rem;padding:6px 10px">
            👤
          </button>
          <button class="btn btn-icon btn-secondary mr-s" onclick="Settings.showSettingsModal()" title="Settings & Audio" id="btn-open-settings" style="font-size:1.1rem;padding:6px 10px">
            ⚙️
          </button>
          <button class="sound-toggle-btn mr-s" onclick="Sound.toggleMute()" title="Toggle Sound">
            ${Sound.isMuted ? '🔇' : '🔊'}
          </button>
          <div class="connection-status">
            <span class="status-dot ${Network.isConnected ? 'connected' : 'disconnected'}"></span>
            <span id="nav-connection-text">${Network.isConnected ? 'Server Online' : 'Connecting...'}</span>
          </div>
        </div>

        <div class="page-content text-center">
          <div class="hero-icon">⚔️</div>
          <h1 class="hero-title">PARTY ARENA</h1>
          <p class="hero-subtitle">Fast, competitive multiplayer mini-games in your browser</p>

          <!-- Player profile pill with progression -->
          <div class="card p-m mb-l flex flex-center gap-m cursor-pointer" style="max-width:340px;margin-left:auto;margin-right:auto;border:1px solid rgba(255,255,255,0.12)" onclick="Profile.showProfileModal()" id="btn-player-profile-card">
            <div class="player-avatar" style="background:${color};width:46px;height:46px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:1.6rem">
              ${userProfile.avatar || '👾'}
            </div>
            <div style="text-align:left;flex:1">
              <div class="flex items-center gap-xs">
                <span class="heading-xs" style="color:var(--text-primary)">${UI.escapeHTML(name)}</span>
                <span class="badge" style="font-size:0.7rem;background:rgba(255,215,0,0.15);color:#FFD700;border:1px solid rgba(255,215,0,0.3)">${Profile.getTitle(userProfile.matchesWon)}</span>
              </div>
              <div class="body-sm text-muted">Wins: ${userProfile.matchesWon || 0} | Trophies: 🥇${userProfile.trophies?.gold || 0}</div>
            </div>
            <span style="color:var(--accent);font-size:1.2rem">✎</span>
          </div>

          <!-- Cold-start / Server Connecting Alert -->
          <div id="cloud-connecting-banner" class="card p-m mb-m hidden" style="background:rgba(255,183,3,0.12);border:1px solid rgba(255,183,3,0.3);text-align:left;max-width:440px;margin-left:auto;margin-right:auto">
            <div class="flex items-center gap-s mb-xs">
              <span class="pulse-indicator">⏳</span>
              <strong style="color:#FFB703">Waking up free cloud backend...</strong>
            </div>
            <div class="body-sm text-muted">
              Free cloud servers sleep when idle and take ~20-30s to wake up on the first connection. The page will automatically connect as soon as it's ready.
            </div>
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
            <button class="btn btn-accent btn-full" onclick="App.showSoloPracticeModal()" id="btn-solo-practice" style="background:linear-gradient(135deg, #FF9800, #F44336);border:none;box-shadow:0 4px 16px rgba(255,152,0,0.3)">
              🎯 Solo Practice (vs AI)
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
      <div class="page" id="game-page" style="position:relative;overflow:hidden">
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
        <div id="game-mount-point" class="w-full flex-1 flex flex-col flex-center" style="position:relative"></div>
        <div class="mt-s w-full">${Reactions.renderEmoteBar()}</div>

        <!-- In-Arena Stage 2 Countdown Overlay -->
        <div id="in-arena-countdown" class="in-arena-countdown-overlay hidden">
          <div class="in-arena-countdown-title">GET READY!</div>
          <div class="in-arena-countdown-num">3</div>
        </div>

        <!-- In-Game Celebration Banner (Phase 1) -->
        <div id="in-game-celebration-container"></div>

        <!-- Glassmorphic Winner Dialog (Phase 2) -->
        <div id="game-winner-overlay-container"></div>
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

    // Stage 2: In-Arena Countdown with input lock
    if (params.arenaCountdown) {
      activeGame.isLocked = true;
      UI.showInArenaCountdown(params.arenaCountdown, () => {
        if (activeGame) activeGame.isLocked = false;
      });
    }
  }

  function handleGameEnd(data) {
    if (!activeGame) {
      renderResults(data);
      return;
    }

    // Freeze inputs on the active game
    activeGame.isLocked = true;

    const players = Room.currentRoom?.players || [];
    const scores = data.scores || {};
    const ranking = data.ranking || Object.keys(scores);
    const winnerId = ranking[0];
    const winner = players.find((p) => p.id === winnerId) || { name: 'Player' };
    const isLocalWinner = winnerId === Room.localPlayerId;
    const series = data.series || Room.currentRoom?.series;

    // Phase 1: 1.8-second celebration banner over frozen game
    const celebContainer = document.getElementById('in-game-celebration-container');
    if (celebContainer) {
      celebContainer.innerHTML = `
        <div class="in-game-celebration-banner">
          <div class="in-game-celebration-text">
            ${data.reason === 'draw' ? "IT'S A DRAW! 🤝" : isLocalWinner ? '🎉 VICTORY! 🎉' : `👑 ${UI.escapeHTML(winner.name)} WINS! 👑`}
          </div>
          <div class="in-game-celebration-sub">
            ${series ? `Match ${series.gamesPlayed} of Bo${series.targetWins * 2 - 1}` : 'Round Finished'}
          </div>
        </div>
      `;
    }

    // Phase 2: Slide in glassmorphic winner dialog after 1.8 seconds
    setTimeout(() => {
      if (celebContainer) celebContainer.innerHTML = '';
      showWinnerModal(data, winner, isLocalWinner, series, players);
    }, 1800);
  }

  function showWinnerModal(data, winner, isLocalWinner, series, players) {
    const container = document.getElementById('game-winner-overlay-container');
    if (!container) {
      renderResults(data);
      return;
    }

    const scores = data.scores || {};
    const ranking = data.ranking || Object.keys(scores);
    const tournament = Room.currentRoom?.tournament || TournamentClient.getTournament();

    // Build series / tournament badge and stats
    let seriesHTML = '';
    let seriesButtonsHTML = '';

    if (tournament) {
      const isComplete = tournament.isComplete;
      const nextGameId = tournament.currentGameId;
      const nextGame = Room.GAMES.find((g) => g.id === nextGameId);

      seriesHTML = `
        <div class="series-pill-badge">
          <span>🏆 Tournament: Match ${tournament.gamesPlayed} of ${tournament.totalGames}</span>
        </div>
      `;

      if (!isComplete) {
        if (Room.isHost()) {
          seriesButtonsHTML = `
            <button class="btn btn-primary btn-full mb-s" onclick="Room.startTournamentGame()">
              ▶ Start Next Game: ${nextGame?.name || 'Next Match'} (${tournament.gamesPlayed + 1}/${tournament.totalGames})
            </button>
          `;
        } else {
          seriesButtonsHTML = `
            <div class="body-sm text-muted mb-m">Waiting for host to start next game (${tournament.gamesPlayed + 1}/${tournament.totalGames})...</div>
          `;
        }
      } else {
        seriesButtonsHTML = `
          <button class="btn btn-primary btn-full mb-s" onclick="App.navigate('tournament-results', TournamentClient.getTournament() || Room.currentRoom?.tournament)">
            🏆 View Tournament Final Results ▶
          </button>
        `;
      }
    } else if (series) {
      const myId = Room.localPlayerId;
      const opp = players.find((p) => p.id !== myId) || { name: 'Bot' };
      const myScore = series.scores[myId] || 0;
      const oppScore = series.scores[opp.id] || 0;
      const isSeriesComplete = series.isComplete;
      const isSeriesWon = series.winnerId === myId;

      seriesHTML = `
        <div class="series-pill-badge">
          <span>🏆 Best of ${series.targetWins * 2 - 1}</span>
          <span>•</span>
          <span>You ${myScore} - ${oppScore} ${UI.escapeHTML(opp.name)}</span>
        </div>
      `;

      if (!isSeriesComplete) {
        seriesButtonsHTML = `
          <button class="btn btn-primary btn-full mb-s" onclick="App.startNextSeriesRound()">
            Next Round ▶ (${series.gamesPlayed + 1}/${series.targetWins * 2 - 1})
          </button>
        `;
      } else {
        seriesButtonsHTML = `
          <div class="heading-sm mb-s" style="color:${isSeriesWon ? 'var(--success)' : 'var(--accent)'}">
            ${isSeriesWon ? '👑 You Won the Series!' : `${UI.escapeHTML(opp.name)} Won the Series!`}
          </div>
          <button class="btn btn-accent btn-full mb-s" onclick="App.rematchSeries()">
            Rematch Series 🔄
          </button>
        `;
      }
    } else {
      seriesButtonsHTML = `
        <button class="btn btn-primary btn-full mb-s" onclick="App.startNextSeriesRound()">
          Play Again 🔄
        </button>
      `;
    }

    const rankItemsHTML = ranking
      .map((pid, idx) => {
        const p = players.find((pl) => pl.id === pid) || { name: 'Player', colorIndex: 0 };
        const color = UI.getPlayerColor(p.colorIndex || 0);
        const medals = ['🥇', '🥈', '🥉'];
        const medal = medals[idx] || `#${idx + 1}`;
        return `
          <div class="results-rank-item" style="animation-delay:${idx * 100}ms">
            <div class="results-rank-number">${medal}</div>
            <div class="player-avatar" style="background:${color};width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:0.9rem">
              ${p.name[0].toUpperCase()}
            </div>
            <div class="results-rank-name">${UI.escapeHTML(p.name)}${pid === Room.localPlayerId ? ' (You)' : ''}</div>
            <div class="results-rank-score">${scores[pid] ?? 0} pts</div>
          </div>
        `;
      })
      .join('');

    container.innerHTML = `
      <div class="game-winner-overlay">
        <div class="winner-card-glass">
          ${seriesHTML}
          <div style="font-size:3.5rem;line-height:1" class="mb-xs">${isLocalWinner ? '🏆' : '👏'}</div>
          <div class="heading-lg mb-xs">
            ${isLocalWinner ? 'Victory!' : `${UI.escapeHTML(winner.name)} Wins!`}
          </div>
          <div class="body-sm text-muted mb-m">${data.reason === 'draw' ? "It's a tie!" : 'Round Finished'}</div>

          <div class="results-rank-list mb-l" style="max-height:160px;overflow-y:auto">
            ${rankItemsHTML}
          </div>

          <div class="flex-col gap-xs">
            ${seriesButtonsHTML}
            <button class="btn btn-secondary btn-full" onclick="App.navigate('lobby')">
              Back to Lobby 🏠
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function startNextSeriesRound() {
    const container = document.getElementById('game-winner-overlay-container');
    if (container) container.innerHTML = '';
    const celeb = document.getElementById('in-game-celebration-container');
    if (celeb) celeb.innerHTML = '';

    const gameId = Room.currentRoom?.selectedGameId || currentSoloGameId || 'pong';
    if (Room.isHost()) {
      Network.send(Network.MessageType.GAME_START, { gameId });
    }
  }

  function rematchSeries() {
    launchSoloMatch();
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

    Network.on('coldStart', (data) => {
      const banner = document.getElementById('cloud-connecting-banner');
      if (banner) {
        banner.classList.toggle('hidden', !data.isColdStart);
      }
    });

    Network.on('connectionChange', (data) => {
      const banner = document.getElementById('cloud-connecting-banner');
      if (banner && data.connected) {
        banner.classList.add('hidden');
      }
      const navText = document.getElementById('nav-connection-text');
      if (navText) {
        navText.textContent = data.connected ? 'Server Online' : 'Connecting...';
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

  let currentSoloGameId = 'pong';
  let currentSoloDifficulty = 'medium';
  let currentSoloSeriesFormat = 'bo1';

  function showSoloPracticeModal() {
    Room.loadProfile();
    const games = Room.GAMES;
    currentSoloGameId = games[0].id;

    UI.showModal(`
      <div class="solo-modal-content" style="max-width:440px">
        <div class="flex items-center justify-between mb-s">
          <div class="heading-md">🎯 Solo Practice Mode</div>
          <button class="btn btn-icon btn-secondary" onclick="UI.hideModal()" style="font-size:1.2rem">✕</button>
        </div>
        <p class="body-sm text-muted mb-m">Battle algorithmic AI bots with zero waiting!</p>

        <!-- Choose Game -->
        <label class="body-xs text-muted block mb-xs uppercase" style="letter-spacing:0.05em">Select Mini-Game</label>
        <div class="solo-game-selector mb-m" style="display:grid;grid-template-columns:repeat(2, 1fr);gap:8px;max-height:200px;overflow-y:auto;padding-right:4px">
          ${games.map((g, idx) => `
            <div class="card p-s cursor-pointer solo-game-card ${idx === 0 ? 'selected' : ''}" 
                 onclick="App.selectSoloGame('${g.id}', this)" 
                 style="background:var(--surface-light);border:2px solid ${idx === 0 ? 'var(--accent)' : 'transparent'};transition:all 0.2s;text-align:left;display:flex;align-items:center;gap:10px">
              <span style="font-size:1.8rem">${g.icon}</span>
              <div>
                <div class="body-sm" style="font-weight:700">${UI.escapeHTML(g.name)}</div>
                <div class="body-xs text-muted" style="font-size:0.7rem">${g.type}</div>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Choose Difficulty -->
        <label class="body-xs text-muted block mb-xs uppercase" style="letter-spacing:0.05em">AI Difficulty</label>
        <div class="flex gap-s mb-m" id="solo-diff-picker">
          <button class="btn btn-secondary flex-1 solo-diff-btn" onclick="App.selectSoloDiff('easy', this)" style="padding:10px 4px;font-size:0.85rem">
            🌱 Easy
          </button>
          <button class="btn btn-primary flex-1 solo-diff-btn active" onclick="App.selectSoloDiff('medium', this)" style="padding:10px 4px;font-size:0.85rem">
            ⚔️ Medium
          </button>
          <button class="btn btn-secondary flex-1 solo-diff-btn" onclick="App.selectSoloDiff('hard', this)" style="padding:10px 4px;font-size:0.85rem">
            👑 Hard (Pro)
          </button>
        </div>

        <!-- Choose Match Series Format -->
        <label class="body-xs text-muted block mb-xs uppercase" style="letter-spacing:0.05em">Match Series Format</label>
        <div class="flex gap-s mb-l" id="solo-series-picker">
          <button class="btn btn-primary flex-1 solo-series-btn active" onclick="App.selectSoloSeries('bo1', this)" style="padding:10px 4px;font-size:0.85rem">
            ⚡ Single (Bo1)
          </button>
          <button class="btn btn-secondary flex-1 solo-series-btn" onclick="App.selectSoloSeries('bo3', this)" style="padding:10px 4px;font-size:0.85rem">
            🥇 Best of 3
          </button>
          <button class="btn btn-secondary flex-1 solo-series-btn" onclick="App.selectSoloSeries('bo5', this)" style="padding:10px 4px;font-size:0.85rem">
            🏆 Best of 5
          </button>
        </div>

        <button class="btn btn-accent btn-full" id="btn-start-solo-match" onclick="App.launchSoloMatch()" style="background:linear-gradient(135deg, #FF9800, #F44336);border:none;font-weight:700">
          ▶ Start AI Practice
        </button>
      </div>
    `);
  }

  function selectSoloGame(gameId, el) {
    currentSoloGameId = gameId;
    document.querySelectorAll('.solo-game-card').forEach((c) => {
      c.classList.remove('selected');
      c.style.borderColor = 'transparent';
    });
    if (el) {
      el.classList.add('selected');
      el.style.borderColor = 'var(--accent)';
    }
    Sound.playClick();
  }

  function selectSoloDiff(diff, el) {
    currentSoloDifficulty = diff;
    document.querySelectorAll('.solo-diff-btn').forEach((b) => {
      b.classList.remove('btn-primary', 'active');
      b.classList.add('btn-secondary');
    });
    if (el) {
      el.classList.remove('btn-secondary');
      el.classList.add('btn-primary', 'active');
    }
    Sound.playClick();
  }

  function selectSoloSeries(format, el) {
    currentSoloSeriesFormat = format;
    document.querySelectorAll('.solo-series-btn').forEach((b) => {
      b.classList.remove('btn-primary', 'active');
      b.classList.add('btn-secondary');
    });
    if (el) {
      el.classList.remove('btn-secondary');
      el.classList.add('btn-primary', 'active');
    }
    Sound.playClick();
  }

  function launchSoloMatch() {
    UI.hideModal();
    Room.loadProfile();
    const avatar = typeof Profile !== 'undefined' ? Profile.getProfile().avatar : '👾';

    const seriesLabel = currentSoloSeriesFormat === 'bo5' ? 'Best of 5' : currentSoloSeriesFormat === 'bo3' ? 'Best of 3' : 'Single Match';
    UI.showToast(`Starting Solo ${currentSoloGameId.toUpperCase()} vs ${currentSoloDifficulty.toUpperCase()} Bot (${seriesLabel})... 🤖`, 'info');

    const sendSolo = () => {
      Network.send(Network.MessageType.START_SOLO, {
        gameId: currentSoloGameId,
        difficulty: currentSoloDifficulty,
        seriesFormat: currentSoloSeriesFormat,
        name: Room.localPlayerName,
        colorIndex: Room.localColorIndex,
        avatar: avatar,
      });
    };

    if (!Network.isConnected) {
      Network.connect().then(sendSolo).catch(() => {
        UI.showToast('Could not connect to server', 'error');
      });
    } else {
      sendSolo();
    }
  }

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
    showSoloPracticeModal,
    selectSoloGame,
    selectSoloDiff,
    selectSoloSeries,
    launchSoloMatch,
    handleGameEnd,
    startNextSeriesRound,
    rematchSeries,
    installPWA,
    currentSelectedColor: 0,
    get activeGame() { return activeGame; },
    get currentScreen() { return currentScreen; },
  };
})();

// Start application when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  App.start();
});
