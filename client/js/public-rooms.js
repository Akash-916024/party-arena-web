/**
 * Party Arena Web — Public Room Browser
 * Discovers and joins open public multiplayer rooms worldwide.
 */

const PublicRooms = (() => {
  let roomsCache = [];

  function fetchRooms() {
    // If WS connected, request live list
    if (Network.isConnected) {
      Network.send(Network.MessageType.GET_ROOMS, {});
    }

    // Also fetch from HTTP API fallback
    const origin = window.location.origin;
    fetch(`${origin}/api/rooms`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        roomsCache = data;
        renderList(data);
      })
      .catch(() => {});
  }

  function init() {
    Network.on(Network.MessageType.ROOMS_LIST, (data) => {
      roomsCache = data.rooms || [];
      renderList(roomsCache);
    });
  }

  function showModal() {
    Sound.playClick();
    UI.showModal(`
      <div class="public-rooms-modal">
        <div class="flex flex-between flex-center mb-m">
          <div class="heading-md">🌐 Public Rooms</div>
          <button class="btn btn-secondary btn-sm" onclick="PublicRooms.fetchRooms()" title="Refresh room list">
            🔄 Refresh
          </button>
        </div>
        <div class="body-sm text-muted mb-m">
          Join an open lobby or spectate an active match worldwide:
        </div>

        <div id="public-rooms-container" style="max-height:360px;overflow-y:auto;display:flex;flex-direction:column;gap:8px">
          <div class="p-l text-center text-muted">Scanning for open rooms...</div>
        </div>

        <div class="mt-l flex gap-m">
          <button class="btn btn-secondary flex-1" onclick="UI.hideModal()">Close</button>
          <button class="btn btn-primary flex-1" onclick="UI.hideModal(); App.handleCreateRoom()">
            ✨ Host New Room
          </button>
        </div>
      </div>
    `);

    fetchRooms();
  }

  function renderList(rooms) {
    const container = document.getElementById('public-rooms-container');
    if (!container) return;

    if (!rooms || rooms.length === 0) {
      container.innerHTML = `
        <div class="card p-l text-center">
          <div style="font-size:2.5rem;margin-bottom:8px">🏝️</div>
          <div class="heading-xs" style="color:var(--text-secondary)">No open public rooms found</div>
          <div class="body-sm text-muted mt-s">Be the first to create one and invite players!</div>
        </div>
      `;
      return;
    }

    container.innerHTML = rooms
      .map((r) => {
        const game = Room.GAMES.find((g) => g.id === r.selectedGameId) || { name: 'Any Game', icon: '🎮' };
        const isInGame = r.state === 'inGame';

        return `
          <div class="card p-m flex flex-between flex-center" style="background:var(--surface-light);border:1px solid rgba(255,255,255,0.08);border-radius:var(--radius-m);transition:transform 0.2s">
            <div class="flex flex-center gap-m">
              <div style="font-size:2rem;background:rgba(255,255,255,0.06);width:50px;height:50px;border-radius:12px;display:flex;align-items:center;justify-content:center">
                ${game.icon}
              </div>
              <div>
                <div class="heading-xs" style="color:var(--text-primary)">${UI.escapeHTML(r.roomName || 'Party Room')}</div>
                <div class="body-sm text-muted">
                  Host: <strong>${UI.escapeHTML(r.hostName || 'Player')}</strong> · ${game.name}
                </div>
              </div>
            </div>

            <div class="flex flex-center gap-s">
              <span class="body-xs" style="padding:4px 10px;border-radius:var(--radius-full);background:${isInGame ? 'rgba(255,152,0,0.2)' : 'rgba(46,204,113,0.2)'};color:${isInGame ? 'var(--warning)' : 'var(--success)'};font-weight:700">
                ${isInGame ? 'Playing' : `${r.playerCount}/${r.maxPlayers}`}
              </span>
              <button class="btn ${isInGame ? 'btn-secondary' : 'btn-success'} btn-sm" onclick="PublicRooms.join('${r.roomCode}')">
                ${isInGame ? 'Spectate' : 'Join'}
              </button>
            </div>
          </div>
        `;
      })
      .join('');
  }

  function join(roomCode) {
    Sound.playClick();
    UI.hideModal();
    Room.joinRoom(roomCode);
  }

  return {
    init,
    showModal,
    fetchRooms,
    join,
  };
})();

// Initialize public rooms network listeners
PublicRooms.init();
