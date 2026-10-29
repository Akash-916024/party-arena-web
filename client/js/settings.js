/**
 * Party Arena Web — Settings & Customization Engine
 * Manages audio volume, visual themes (Cyberpunk, Retro Arcade, Midnight OLED),
 * and custom cloud WebSocket server endpoint configuration.
 */

const Settings = (() => {
  const STORAGE_KEY = 'party_arena_settings_v1';

  const THEMES = [
    { id: 'cyberpunk', name: '⚡ Cyberpunk (Default)', desc: 'Neon Cyan & Electric Violet' },
    { id: 'arcade', name: '🕹️ Retro Arcade', desc: 'Phosphor Green & 80s Amber' },
    { id: 'midnight', name: '🌌 Midnight OLED', desc: 'True Black & Sapphire Blue' }
  ];

  function getDefaultSettings() {
    return {
      masterVolume: 80,
      sfxEnabled: true,
      hapticsEnabled: true,
      theme: 'cyberpunk',
      customServerUrl: localStorage.getItem('party_custom_server_url') || '',
    };
  }

  function getSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return { ...getDefaultSettings(), ...JSON.parse(raw) };
      }
    } catch (e) {
      console.warn('Could not read settings from storage:', e);
    }
    return getDefaultSettings();
  }

  function saveSettings(data) {
    try {
      const current = getSettings();
      const updated = { ...current, ...data };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      if (typeof updated.customServerUrl === 'string') {
        localStorage.setItem('party_custom_server_url', updated.customServerUrl.trim());
      }
      applySettings(updated);
      return updated;
    } catch (e) {
      console.error('Error saving settings:', e);
      return data;
    }
  }

  function applySettings(settings) {
    const s = settings || getSettings();

    // 1. Apply theme
    document.documentElement.setAttribute('data-theme', s.theme || 'cyberpunk');

    // 2. Apply master volume to Sound engine if available
    if (typeof Sound !== 'undefined' && Sound.setMasterVolume) {
      Sound.setMasterVolume(s.sfxEnabled ? s.masterVolume / 100 : 0);
    }
  }

  function showSettingsModal() {
    const s = getSettings();
    const currentServer = s.customServerUrl || (typeof Network !== 'undefined' ? Network.getServerUrl() : 'Auto');

    UI.showModal(`
      <div class="settings-modal-container">
        <div class="flex items-center justify-between mb-m">
          <div class="heading-md">⚙️ Settings</div>
          <button class="btn btn-icon btn-secondary" onclick="UI.hideModal()" style="font-size:1.2rem">×</button>
        </div>

        <!-- Audio Settings -->
        <div class="card p-m mb-m" style="background:var(--surface-light)">
          <div class="heading-sm mb-s">🔊 Audio & Feedback</div>

          <div class="flex items-center justify-between mb-s">
            <span class="body-md">Sound Effects</span>
            <label class="switch">
              <input type="checkbox" id="setting-sfx-toggle" ${s.sfxEnabled ? 'checked' : ''} onchange="Settings.onVolumeChange()">
              <span class="slider round"></span>
            </label>
          </div>

          <div class="mb-s">
            <div class="flex justify-between body-sm mb-xs">
              <span class="text-muted">Master Volume</span>
              <strong id="volume-val-display">${s.masterVolume}%</strong>
            </div>
            <input type="range" id="setting-volume-slider" min="0" max="100" value="${s.masterVolume}" class="w-full" oninput="Settings.onVolumeChange()" style="cursor:pointer">
          </div>
        </div>

        <!-- Visual Theme -->
        <div class="card p-m mb-m" style="background:var(--surface-light)">
          <div class="heading-sm mb-s">🎨 Visual Theme</div>
          <div class="theme-select-list">
            ${THEMES.map((th) => `
              <div class="card p-s mb-xs cursor-pointer flex items-center justify-between ${s.theme === th.id ? 'theme-active' : ''}" style="border:1px solid ${s.theme === th.id ? 'var(--accent)' : 'rgba(255,255,255,0.08)'}" onclick="Settings.selectTheme('${th.id}')">
                <div>
                  <div class="body-md font-bold">${th.name}</div>
                  <div class="body-sm text-muted">${th.desc}</div>
                </div>
                ${s.theme === th.id ? '<span class="text-accent" style="font-size:1.2rem">✓</span>' : ''}
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Cloud Backend Server Configuration -->
        <div class="card p-m mb-m" style="background:var(--surface-light)">
          <div class="heading-sm mb-xs">☁️ Cloud Backend Server</div>
          <div class="body-sm text-muted mb-s">Default connects to local server or auto-detects cloud backend. Enter custom Render WebSocket URL if running independently:</div>

          <div class="flex gap-s mb-s">
            <input type="text" id="setting-server-url" class="input flex-1 font-mono" style="font-size:0.85rem" placeholder="wss://your-app.onrender.com" value="${s.customServerUrl}">
            <button class="btn btn-secondary" onclick="Settings.testServerConnection()" title="Test server health">Ping 📡</button>
          </div>
          <div id="server-ping-result" class="body-sm text-muted"></div>
        </div>

        <!-- Actions -->
        <div class="flex gap-m">
          <button class="btn btn-secondary flex-1" onclick="UI.hideModal()">Close</button>
          <button class="btn btn-primary flex-1" onclick="Settings.saveFromModal()">Save Changes</button>
        </div>
      </div>
    `);
  }

  function onVolumeChange() {
    const sfxToggle = document.getElementById('setting-sfx-toggle');
    const slider = document.getElementById('setting-volume-slider');
    const display = document.getElementById('volume-val-display');

    const volume = slider ? parseInt(slider.value, 10) : 80;
    const enabled = sfxToggle ? sfxToggle.checked : true;

    if (display) display.textContent = `${volume}%`;

    if (typeof Sound !== 'undefined' && Sound.setMasterVolume) {
      Sound.setMasterVolume(enabled ? volume / 100 : 0);
      Sound.playClick();
    }
  }

  function selectTheme(themeId) {
    saveSettings({ theme: themeId });
    showSettingsModal();
    Sound.playClick();
  }

  function testServerConnection() {
    const input = document.getElementById('setting-server-url');
    const resultEl = document.getElementById('server-ping-result');
    const rawUrl = (input?.value || '').trim();

    let httpUrl = '';
    if (!rawUrl) {
      httpUrl = `${window.location.origin}/health`;
    } else {
      httpUrl = rawUrl.replace(/^ws:\/\//, 'http://').replace(/^wss:\/\//, 'https://') + '/health';
    }

    if (resultEl) {
      resultEl.innerHTML = '<span class="text-accent">Pinging server... ⏳</span>';
    }

    const start = performance.now();
    fetch(httpUrl, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const ms = Math.round(performance.now() - start);
        if (resultEl) {
          resultEl.innerHTML = `<span class="text-success">✅ Connected! Ping: ${ms}ms | Server Uptime: ${Math.round(data.uptime || 0)}s</span>`;
        }
        Sound.playClick();
      })
      .catch((err) => {
        if (resultEl) {
          resultEl.innerHTML = `<span class="text-danger">⚠️ Server unreachable (${err.message}). If using Render free tier, server may be waking up (~30s).</span>`;
        }
      });
  }

  function saveFromModal() {
    const sfxToggle = document.getElementById('setting-sfx-toggle');
    const slider = document.getElementById('setting-volume-slider');
    const serverInput = document.getElementById('setting-server-url');

    const masterVolume = slider ? parseInt(slider.value, 10) : 80;
    const sfxEnabled = sfxToggle ? sfxToggle.checked : true;
    const customServerUrl = (serverInput?.value || '').trim();

    saveSettings({ masterVolume, sfxEnabled, customServerUrl });

    UI.hideModal();
    UI.showToast('Settings saved! ⚙️', 'success');
    Sound.playClick();

    // Reconnect network if server URL changed
    if (typeof Network !== 'undefined' && customServerUrl) {
      Network.setCustomServerUrl(customServerUrl);
    }
  }

  // Initialize on script load
  applySettings();

  return {
    THEMES,
    getSettings,
    saveSettings,
    applySettings,
    showSettingsModal,
    onVolumeChange,
    selectTheme,
    testServerConnection,
    saveFromModal,
  };
})();
