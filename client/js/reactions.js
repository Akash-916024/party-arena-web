/**
 * Party Arena Web — Floating Emoji Reactions & Quick-Chat
 * Enables real-time social emotes and floating bubbles during lobby & matches.
 */

const Reactions = (() => {
  const EMOTES = ['🔥', '💀', '😂', '👏', '😱', '🏆', '🎯', '⚡'];
  const QUICK_CHATS = ['Good luck! 🍀', 'Nice move! 👏', 'So close! 😱', 'Rematch! ⚔️', 'GG! 🏆'];

  let containerEl = null;

  function init() {
    createFloatingContainer();

    // Listen for incoming chat/reaction messages
    Network.on(Network.MessageType.CHAT_MESSAGE, (data) => {
      handleIncomingReaction(data);
    });
  }

  function createFloatingContainer() {
    if (document.getElementById('floating-reactions-layer')) return;
    containerEl = document.createElement('div');
    containerEl.id = 'floating-reactions-layer';
    containerEl.style.cssText = `
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 8000;
      overflow: hidden;
    `;
    document.body.appendChild(containerEl);
  }

  function sendEmote(emoji) {
    if (!Network.isConnected) return;
    Sound.playClick();
    Network.send(Network.MessageType.CHAT_MESSAGE, { emoji });
  }

  function sendQuickChat(message) {
    if (!Network.isConnected) return;
    Sound.playClick();
    Network.send(Network.MessageType.CHAT_MESSAGE, { message });
    UI.hideModal();
  }

  function handleIncomingReaction(data) {
    createFloatingContainer();
    if (!containerEl) return;

    const el = document.createElement('div');
    const playerColor = UI.getPlayerColor(data.colorIndex || 0);

    // Random horizontal start within middle 60% of screen
    const startX = 20 + Math.random() * 60;

    el.className = 'floating-reaction';
    el.style.cssText = `
      position: absolute;
      bottom: 80px;
      left: ${startX}%;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      animation: floatUp 2.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
      pointer-events: none;
    `;

    if (data.emoji) {
      el.innerHTML = `
        <span style="font-size:2.8rem;filter:drop-shadow(0 4px 12px rgba(0,0,0,0.5))">${data.emoji}</span>
        <span style="background:rgba(20,20,35,0.85);backdrop-filter:blur(8px);color:${playerColor};font-size:0.75rem;font-weight:700;padding:2px 8px;border-radius:12px;border:1px solid rgba(255,255,255,0.1)">
          ${UI.escapeHTML(data.playerName || 'Player')}
        </span>
      `;
    } else if (data.message) {
      el.innerHTML = `
        <div style="background:rgba(20,20,35,0.9);backdrop-filter:blur(12px);border:1px solid ${playerColor};padding:8px 14px;border-radius:16px;box-shadow:0 8px 24px rgba(0,0,0,0.4);display:flex;flex-direction:column;align-items:center;gap:2px">
          <span style="color:${playerColor};font-size:0.7rem;font-weight:700">${UI.escapeHTML(data.playerName || 'Player')}</span>
          <span style="color:#ffffff;font-size:0.95rem;font-weight:600">${UI.escapeHTML(data.message)}</span>
        </div>
      `;
    }

    containerEl.appendChild(el);

    // Clean up when animation finishes
    setTimeout(() => {
      el.remove();
    }, 2800);
  }

  function renderEmoteBar() {
    return `
      <div class="emote-bar" id="emote-bar">
        <div class="flex flex-center gap-xs" style="background:var(--surface-glass);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,0.08);border-radius:var(--radius-full);padding:6px 12px;box-shadow:var(--shadow-soft)">
          ${EMOTES.map(
            (e) => `
            <button class="emote-btn" onclick="Reactions.sendEmote('${e}')" style="background:none;border:none;font-size:1.4rem;cursor:pointer;padding:4px 6px;border-radius:8px;transition:transform 0.15s">
              ${e}
            </button>
          `
          ).join('')}
          <div style="width:1px;height:20px;background:rgba(255,255,255,0.15);margin:0 4px"></div>
          <button class="btn btn-secondary btn-sm" onclick="Reactions.showQuickChatModal()" style="padding:4px 10px;font-size:0.8rem;border-radius:var(--radius-full)">
            💬 Chat
          </button>
        </div>
      </div>
    `;
  }

  function showQuickChatModal() {
    UI.showModal(`
      <div class="heading-md mb-m">Quick Chat</div>
      <div class="flex-col gap-s mb-l">
        ${QUICK_CHATS.map(
          (qc) => `
          <button class="btn btn-secondary text-left w-full" onclick="Reactions.sendQuickChat('${qc}')" style="justify-content:flex-start;padding:12px 18px;font-size:1rem">
            ${qc}
          </button>
        `
        ).join('')}
      </div>
      <button class="btn btn-secondary btn-full" onclick="UI.hideModal()">Close</button>
    `);
  }

  return {
    init,
    sendEmote,
    sendQuickChat,
    renderEmoteBar,
    showQuickChatModal,
  };
})();

// Initialize reactions
Reactions.init();
