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
  function showCountdown(seconds, onComplete, label = 'Game Starting...') {
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

  function showInArenaCountdown(seconds, onComplete) {
    const overlay = document.getElementById('in-arena-countdown');
    if (!overlay) {
      if (onComplete) onComplete();
      return;
    }

    const titleEl = overlay.querySelector('.in-arena-countdown-title');
    const numEl = overlay.querySelector('.in-arena-countdown-num');
    overlay.classList.remove('hidden');

    let count = seconds;
    if (titleEl) titleEl.textContent = 'GET READY!';
    if (numEl) {
      numEl.textContent = count;
      numEl.style.color = '#FFD700';
      numEl.style.animation = 'none';
      void numEl.offsetWidth;
      numEl.style.animation = 'countdownPop 0.5s var(--ease-bounce)';
    }

    if (typeof Sound !== 'undefined' && Sound.playCountdown) {
      Sound.playCountdown(false);
    }

    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        if (numEl) {
          numEl.textContent = count;
          numEl.style.animation = 'none';
          void numEl.offsetWidth;
          numEl.style.animation = 'countdownPop 0.5s var(--ease-bounce)';
        }
        if (typeof Sound !== 'undefined' && Sound.playCountdown) {
          Sound.playCountdown(false);
        }
      } else {
        if (titleEl) titleEl.textContent = '';
        if (numEl) {
          numEl.textContent = 'GO!';
          numEl.style.color = 'var(--success)';
          numEl.style.animation = 'none';
          void numEl.offsetWidth;
          numEl.style.animation = 'countdownPop 0.5s var(--ease-bounce)';
        }
        if (typeof Sound !== 'undefined' && Sound.playCountdown) {
          Sound.playCountdown(true);
        }
        clearInterval(interval);
        setTimeout(() => {
          overlay.classList.add('hidden');
          if (onComplete) onComplete();
        }, 650);
      }
    }, 950);
  }

  // ─── HTML Helpers ───────────────────────────────────────────────
  function getPlayerColor(colorIndex) {
    return PLAYER_COLORS[colorIndex % PLAYER_COLORS.length];
  }

  function getPlayerColorName(colorIndex) {
    return PLAYER_COLOR_NAMES[colorIndex % PLAYER_COLOR_NAMES.length];
  }

  function renderPlayerAvatar(name, colorIndex, avatarChar) {
    const color = getPlayerColor(colorIndex);
    const content = avatarChar || (name ? name[0].toUpperCase() : '?');
    return `<div class="player-avatar" style="background: ${color}">${content}</div>`;
  }

  function renderPlayerItem(player, isLocal = false, showKick = false) {
    const readyClass = player.isReady ? 'ready' : 'not-ready';
    const readyText = player.isReady ? '✓ Ready' : 'Not Ready';
    const title = typeof Profile !== 'undefined' ? Profile.getTitle(player.wins || 0) : '';

    return `
      <div class="player-item cursor-pointer" id="player-${player.id}" onclick="Profile.showPlayerInspectModal({ name: '${escapeHTML(player.name)}', avatar: '${player.avatar || '👾'}', isHost: ${Boolean(player.isHost)}, isReady: ${Boolean(player.isReady)}, wins: ${player.wins || 0}, isBot: ${Boolean(player.isBot)}, difficulty: '${player.difficulty || ''}' })" title="Click to view player stats">
        ${renderPlayerAvatar(player.name, player.colorIndex, player.avatar)}
        <div style="flex:1">
          <div class="player-name">
            ${escapeHTML(player.name)}${isLocal ? ' <span class="badge" style="font-size:0.7rem;background:rgba(0,240,255,0.2);color:#00F0FF">You</span>' : ''}
            ${player.isBot ? `<span class="badge" style="font-size:0.7rem;background:rgba(255,183,3,0.18);color:#FFB703;border:1px solid rgba(255,183,3,0.3);margin-left:4px">🤖 ${(player.difficulty || 'BOT').toUpperCase()}</span>` : ''}
          </div>
          <div class="flex items-center gap-xs">
            ${player.isHost ? '<div class="player-host-badge">★ HOST</div>' : ''}
            ${title && !player.isBot ? `<span class="body-sm text-muted" style="font-size:0.75rem">${title}</span>` : ''}
            ${player.isBot ? `<span class="body-sm text-muted" style="font-size:0.75rem">AI Bot</span>` : ''}
          </div>
        </div>
        <span class="player-ready-badge ${readyClass}">${readyText}</span>
        ${showKick && !player.isHost ? `<button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); Room.kickPlayer('${player.id}')">✕</button>` : ''}
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
    showInArenaCountdown,
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
