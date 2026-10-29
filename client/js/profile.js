/**
 * Party Arena Web — Player Profile & Progression Engine
 * Manages player identity, customizable avatars, stat tracking,
 * tournament trophy cabinets, and match history with localStorage persistence.
 */

const Profile = (() => {
  const AVATARS = ['👾', '🤖', '🐱', '🦊', '🐉', '⚡', '👑', '🚀', '🎮', '🦄', '🍕', '💀', '🥊', '🎯', '🥷', '🧙'];
  const BORDERS = [
    { id: 'border-default', name: 'Clean', color: 'rgba(255,255,255,0.2)' },
    { id: 'border-cyan', name: 'Cyber Cyan', color: '#00F0FF' },
    { id: 'border-purple', name: 'Neon Violet', color: '#8B5CF6' },
    { id: 'border-gold', name: 'Golden Legend', color: '#FFD700' },
    { id: 'border-rainbow', name: 'Hyperdrive', gradient: 'linear-gradient(135deg, #FF0055, #00F0FF, #FFD700)' }
  ];

  const TITLES = [
    { minWins: 50, title: '👑 Legendary' },
    { minWins: 25, title: '🔥 Grandmaster' },
    { minWins: 10, title: '⚡ Party Champion' },
    { minWins: 5,  title: '⚔️ Arena Veteran' },
    { minWins: 1,  title: '🎯 Contender' },
    { minWins: 0,  title: '🌱 Rookie' }
  ];

  function getStorageKey() {
    return 'party_arena_profile_v2';
  }

  function getDefaultStats() {
    return {
      name: localStorage.getItem('party_player_name') || 'Player',
      avatar: localStorage.getItem('party_avatar') || '👾',
      border: localStorage.getItem('party_border') || 'border-default',
      colorIndex: parseInt(localStorage.getItem('party_color_index') || '0', 10),
      matchesPlayed: 0,
      matchesWon: 0,
      currentStreak: 0,
      bestStreak: 0,
      games: {}, // e.g. { pong: { played: 0, won: 0 } }
      trophies: { gold: 0, silver: 0, bronze: 0 },
      history: []
    };
  }

  function getProfile() {
    try {
      const raw = localStorage.getItem(getStorageKey());
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...getDefaultStats(), ...parsed };
      }
    } catch (e) {
      console.warn('Could not parse profile from storage:', e);
    }
    return getDefaultStats();
  }

  function saveProfile(data) {
    try {
      const current = getProfile();
      const updated = { ...current, ...data };
      localStorage.setItem(getStorageKey(), JSON.stringify(updated));
      if (updated.name) localStorage.setItem('party_player_name', updated.name);
      if (updated.avatar) localStorage.setItem('party_avatar', updated.avatar);
      if (updated.border) localStorage.setItem('party_border', updated.border);
      if (typeof updated.colorIndex === 'number') localStorage.setItem('party_color_index', String(updated.colorIndex));
      return updated;
    } catch (e) {
      console.error('Error saving profile:', e);
      return data;
    }
  }

  function getTitle(wins) {
    const total = wins || getProfile().matchesWon || 0;
    for (const t of TITLES) {
      if (total >= t.minWins) return t.title;
    }
    return '🌱 Rookie';
  }

  function recordMatchResult(gameId, gameName, won, scoreDetail) {
    const p = getProfile();
    p.matchesPlayed += 1;
    if (won) {
      p.matchesWon += 1;
      p.currentStreak += 1;
      if (p.currentStreak > p.bestStreak) {
        p.bestStreak = p.currentStreak;
      }
    } else {
      p.currentStreak = 0;
    }

    if (!p.games[gameId]) {
      p.games[gameId] = { played: 0, won: 0 };
    }
    p.games[gameId].played += 1;
    if (won) p.games[gameId].won += 1;

    p.history.unshift({
      gameId,
      gameName: gameName || gameId,
      won: Boolean(won),
      date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      score: scoreDetail || ''
    });

    if (p.history.length > 15) p.history.pop();
    saveProfile(p);
  }

  function recordTournamentResult(rank) {
    const p = getProfile();
    if (rank === 1) p.trophies.gold = (p.trophies.gold || 0) + 1;
    else if (rank === 2) p.trophies.silver = (p.trophies.silver || 0) + 1;
    else if (rank === 3) p.trophies.bronze = (p.trophies.bronze || 0) + 1;
    saveProfile(p);
  }

  function showProfileModal() {
    const profile = getProfile();
    const winRate = profile.matchesPlayed > 0 ? Math.round((profile.matchesWon / profile.matchesPlayed) * 100) : 0;
    const currentTitle = getTitle(profile.matchesWon);

    UI.showModal(`
      <div class="profile-modal-container">
        <div class="flex items-center justify-between mb-m">
          <div class="heading-md">👤 Player Profile</div>
          <button class="btn btn-icon btn-secondary" onclick="UI.hideModal()" style="font-size:1.2rem">×</button>
        </div>

        <!-- Avatar & Title Hero -->
        <div class="card p-m text-center mb-m" style="background:var(--surface-light);position:relative">
          <div class="avatar-preview-wrapper mb-s" style="position:relative;display:inline-block">
            <div id="avatar-preview-display" class="player-avatar-preview" style="font-size:3rem;width:84px;height:84px;line-height:84px;border-radius:50%;background:rgba(255,255,255,0.06);margin:0 auto;box-shadow:0 8px 24px rgba(0,0,0,0.4);border:3px solid #00F0FF">
              ${profile.avatar}
            </div>
          </div>
          <div class="heading-sm" id="profile-display-name">${profile.name}</div>
          <div class="badge mt-xs" style="background:rgba(255,215,0,0.15);color:#FFD700;border:1px solid rgba(255,215,0,0.3)">
            ${currentTitle}
          </div>
        </div>

        <!-- Stats Grid -->
        <div class="stats-overview-grid mb-m">
          <div class="stat-card">
            <div class="stat-value text-accent">${profile.matchesPlayed}</div>
            <div class="stat-label">Matches</div>
          </div>
          <div class="stat-card">
            <div class="stat-value text-success">${profile.matchesWon}</div>
            <div class="stat-label">Victories</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" style="color:#FFB703">${winRate}%</div>
            <div class="stat-label">Win Rate</div>
          </div>
          <div class="stat-card">
            <div class="stat-value text-primary">${profile.bestStreak} 🔥</div>
            <div class="stat-label">Best Streak</div>
          </div>
        </div>

        <!-- Trophy Cabinet -->
        <div class="card p-s mb-m" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08)">
          <div class="flex items-center justify-between">
            <span class="body-sm text-muted">🏆 Tournament Trophies:</span>
            <div class="flex gap-m font-bold">
              <span title="Gold Cups">🥇 ${profile.trophies.gold || 0}</span>
              <span title="Silver Cups">🥈 ${profile.trophies.silver || 0}</span>
              <span title="Bronze Cups">🥉 ${profile.trophies.bronze || 0}</span>
            </div>
          </div>
        </div>

        <!-- Customizer: Name & Avatar -->
        <div class="mb-m">
          <label class="form-label mb-xs">Change Name</label>
          <input type="text" id="profile-edit-name" class="input mb-s" value="${profile.name}" maxlength="14" placeholder="Your Gamer Tag">

          <label class="form-label mb-xs">Choose Avatar</label>
          <div class="avatar-select-grid mb-s">
            ${AVATARS.map((av) => `
              <button type="button" class="avatar-choice-btn ${av === profile.avatar ? 'selected' : ''}" onclick="Profile.selectAvatar('${av}')">
                ${av}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-m">
          <button class="btn btn-secondary flex-1" onclick="UI.hideModal()">Cancel</button>
          <button class="btn btn-primary flex-1" onclick="Profile.saveAndCloseModal()">Save Profile</button>
        </div>
      </div>
    `);
  }

  function selectAvatar(avatarChar) {
    document.querySelectorAll('.avatar-choice-btn').forEach((btn) => {
      btn.classList.toggle('selected', btn.textContent.trim() === avatarChar);
    });
    const preview = document.getElementById('avatar-preview-display');
    if (preview) preview.textContent = avatarChar;
    Sound.playClick();
  }

  function saveAndCloseModal() {
    const nameInput = document.getElementById('profile-edit-name');
    const newName = (nameInput?.value || '').trim() || 'Player';
    const selectedBtn = document.querySelector('.avatar-choice-btn.selected');
    const newAvatar = selectedBtn ? selectedBtn.textContent.trim() : '👾';

    saveProfile({ name: newName, avatar: newAvatar });

    // Update main landing input if present
    const landingInput = document.getElementById('player-name-input');
    if (landingInput) landingInput.value = newName;

    Sound.playClick();
    UI.hideModal();
    UI.showToast('Profile updated! ✨', 'success');

    // Re-render lobby if currently inside a room
    if (typeof Room !== 'undefined' && Room.currentRoom) {
      Room.renderLobby();
    }
  }

  function showPlayerInspectModal(player) {
    if (!player) return;
    const wins = player.wins || 0;
    const title = getTitle(wins);
    UI.showModal(`
      <div class="text-center p-s">
        <div class="player-avatar-preview mb-s" style="font-size:3.5rem;width:80px;height:80px;line-height:80px;border-radius:50%;background:rgba(255,255,255,0.06);margin:0 auto;box-shadow:0 8px 24px rgba(0,0,0,0.4)">
          ${player.avatar || '👾'}
        </div>
        <div class="heading-md">${player.name || 'Player'}</div>
        <div class="badge mt-xs mb-m" style="background:rgba(255,215,0,0.15);color:#FFD700;border:1px solid rgba(255,215,0,0.3)">
          ${title}
        </div>
        <div class="card p-m text-left mb-m" style="background:var(--surface-light)">
          <div class="flex justify-between mb-xs"><span class="text-muted">Total Wins:</span> <strong>${player.wins || 0}</strong></div>
          <div class="flex justify-between mb-xs"><span class="text-muted">Status:</span> <strong>${player.isHost ? '👑 Host' : 'Player'}</strong></div>
          <div class="flex justify-between"><span class="text-muted">Ready State:</span> <strong>${player.isReady ? '✅ Ready' : '⏳ Waiting'}</strong></div>
        </div>
        <button class="btn btn-secondary w-full" onclick="UI.hideModal()">Close</button>
      </div>
    `);
  }

  return {
    AVATARS,
    BORDERS,
    TITLES,
    getProfile,
    saveProfile,
    getTitle,
    recordMatchResult,
    recordTournamentResult,
    showProfileModal,
    selectAvatar,
    saveAndCloseModal,
    showPlayerInspectModal,
  };
})();
