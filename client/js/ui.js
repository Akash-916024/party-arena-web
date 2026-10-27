/**
 * Party Arena Web — UI Utilities
 * Toast notifications, modals, countdown overlay, and HTML helpers.
 */

const UI = (() => {
  // ─── Player Colors (matching server/Flutter) ────────────────────
  const PLAYER_COLORS = [
    '#FF4B5C', '#4B8BFF', '#2ECC71', '#FFD93D',
    '#A855F7', '#FF8C42', '#FF6B9D', '#00D4AA',
    '#C4E538', '#FF6F61',
  ];

  const PLAYER_COLOR_NAMES = [
    'Red', 'Blue', 'Green', 'Yellow',
    'Purple', 'Orange', 'Pink', 'Cyan',
    'Lime', 'Coral',
  ];

  // ─── Toast Notifications ────────────────────────────────────────
  function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-exit');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // ─── Modal ──────────────────────────────────────────────────────
  function showModal(contentHTML) {
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    content.innerHTML = contentHTML;
    overlay.classList.remove('hidden');

    // Close on overlay click
    overlay.onclick = (e) => {
      if (e.target === overlay) hideModal();
    };
  }

  function hideModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
  }

  // ─── Countdown Overlay ─────────────────────────────────────────
  function showCountdown(seconds, onComplete) {
    const overlay = document.getElementById('countdown-overlay');
    const numberEl = document.getElementById('countdown-number');
    overlay.classList.remove('hidden');

    let count = seconds;
    numberEl.textContent = count;
    numberEl.style.animation = 'none';
    void numberEl.offsetWidth; // Trigger reflow
    numberEl.style.animation = 'countdownPop 0.5s var(--ease-bounce)';

    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        numberEl.textContent = count;
        numberEl.style.animation = 'none';
        void numberEl.offsetWidth;
        numberEl.style.animation = 'countdownPop 0.5s var(--ease-bounce)';
      } else {
        numberEl.textContent = 'GO!';
        numberEl.style.color = 'var(--success)';
        numberEl.style.animation = 'none';
        void numberEl.offsetWidth;
        numberEl.style.animation = 'countdownPop 0.5s var(--ease-bounce)';
        setTimeout(() => {
          overlay.classList.add('hidden');
          numberEl.style.color = '';
          if (onComplete) onComplete();
        }, 800);
        clearInterval(interval);
      }
    }, 1000);
  }

  // ─── HTML Helpers ───────────────────────────────────────────────
  function getPlayerColor(colorIndex) {
    return PLAYER_COLORS[colorIndex % PLAYER_COLORS.length];
  }

  function getPlayerColorName(colorIndex) {
    return PLAYER_COLOR_NAMES[colorIndex % PLAYER_COLOR_NAMES.length];
  }

  function renderPlayerAvatar(name, colorIndex) {
    const color = getPlayerColor(colorIndex);
    const initial = name ? name[0].toUpperCase() : '?';
    return `<div class="player-avatar" style="background: ${color}">${initial}</div>`;
  }

  function renderPlayerItem(player, isLocal = false, showKick = false) {
    const readyClass = player.isReady ? 'ready' : 'not-ready';
    const readyText = player.isReady ? '✓ Ready' : 'Not Ready';

    return `
      <div class="player-item" id="player-${player.id}">
        ${renderPlayerAvatar(player.name, player.colorIndex)}
        <div style="flex:1">
          <div class="player-name">${escapeHTML(player.name)}${isLocal ? ' (You)' : ''}</div>
          ${player.isHost ? '<div class="player-host-badge">★ HOST</div>' : ''}
        </div>
        <span class="player-ready-badge ${readyClass}">${readyText}</span>
        ${showKick && !player.isHost ? `<button class="btn btn-sm btn-secondary" onclick="Room.kickPlayer('${player.id}')">✕</button>` : ''}
      </div>
    `;
  }

  function renderGameCard(game, selected = false) {
    return `
      <div class="game-card ${selected ? 'selected' : ''}" 
           style="--card-accent: ${game.color}"
           onclick="Room.selectGame('${game.id}')"
           id="game-card-${game.id}">
        <div class="game-card-icon">${game.icon}</div>
        <div class="game-card-name">${escapeHTML(game.name)}</div>
        <div class="game-card-desc">${escapeHTML(game.description)}</div>
        <div class="game-card-meta">
          <span>${game.minPlayers}-${game.maxPlayers} Players</span>
          <span>${game.type === 'realtime' ? '⚡ Real-time' : game.type === 'turnbased' ? '♟ Turn-based' : '🎯 Simultaneous'}</span>
        </div>
      </div>
    `;
  }

  function renderRoomCode(code) {
    return `
      <div class="room-code-display">
        ${code.split('').map((c) => `<div class="room-code-char">${c}</div>`).join('')}
      </div>
    `;
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ─── Staggered animation helper ─────────────────────────────────
  function staggerChildren(parentSelector, delay = 80) {
    const parent = document.querySelector(parentSelector);
    if (!parent) return;
    Array.from(parent.children).forEach((child, i) => {
      child.style.opacity = '0';
      child.style.animation = `slideInUp 0.4s var(--ease-bounce) ${i * delay}ms forwards`;
    });
  }

  return {
    PLAYER_COLORS,
    PLAYER_COLOR_NAMES,
    showToast,
    showModal,
    hideModal,
    showCountdown,
    getPlayerColor,
    getPlayerColorName,
    renderPlayerAvatar,
    renderPlayerItem,
    renderGameCard,
    renderRoomCode,
    escapeHTML,
    staggerChildren,
  };
})();
