/**
 * Party Arena Web — In-Lobby & In-Game Full Text Chat
 * Real-time text messaging with player color tags, timestamps, and unread badges.
 */

const Chat = (() => {
  let messages = [];
  let isOpen = false;
  let unreadCount = 0;

  function init() {
    Network.on(Network.MessageType.CHAT_MESSAGE, (data) => {
      if (data.message) {
        messages.push({
          playerId: data.playerId,
          playerName: data.playerName,
          colorIndex: data.colorIndex,
          text: data.message,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });

        if (!isOpen) {
          unreadCount++;
          updateBadge();
        }

        renderMessages();
      }
    });
  }

  function toggle() {
    isOpen = !isOpen;
    if (isOpen) unreadCount = 0;
    updateBadge();

    const drawer = document.getElementById('chat-drawer');
    if (drawer) {
      drawer.classList.toggle('open', isOpen);
      if (isOpen) {
        setTimeout(() => {
          const input = document.getElementById('chat-input-field');
          if (input) input.focus();
          scrollBottom();
        }, 150);
      }
    }
  }

  function updateBadge() {
    const badges = document.querySelectorAll('.chat-badge');
    badges.forEach((b) => {
      b.textContent = unreadCount;
      b.style.display = unreadCount > 0 ? 'inline-flex' : 'none';
    });
  }

  function send() {
    const input = document.getElementById('chat-input-field');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    Sound.playClick();
    Network.send(Network.MessageType.CHAT_MESSAGE, { message: text });
    input.value = '';
    scrollBottom();
  }

  function scrollBottom() {
    const list = document.getElementById('chat-messages-list');
    if (list) {
      list.scrollTop = list.scrollHeight;
    }
  }

  function renderMessages() {
    const list = document.getElementById('chat-messages-list');
    if (!list) return;

    if (messages.length === 0) {
      list.innerHTML = `<div class="text-center text-muted body-sm p-m">No messages yet. Say hi! 👋</div>`;
      return;
    }

    list.innerHTML = messages
      .map((m) => {
        const isLocal = m.playerId === Room.localPlayerId;
        const color = UI.getPlayerColor(m.colorIndex || 0);

        return `
          <div class="chat-msg ${isLocal ? 'local' : ''}" style="display:flex;flex-direction:column;align-items:${isLocal ? 'flex-end' : 'flex-start'};margin-bottom:8px">
            <div style="font-size:0.75rem;font-weight:700;color:${color};margin-bottom:2px">
              ${UI.escapeHTML(m.playerName)}${isLocal ? ' (You)' : ''} <span style="color:var(--text-muted);font-weight:400;font-size:0.65rem">${m.time}</span>
            </div>
            <div style="background:${isLocal ? 'var(--accent)' : 'var(--surface-light)'};color:#ffffff;padding:8px 12px;border-radius:${isLocal ? '14px 14px 2px 14px' : '14px 14px 14px 2px'};max-width:85%;word-break:break-word;font-size:0.9rem">
              ${UI.escapeHTML(m.text)}
            </div>
          </div>
        `;
      })
      .join('');

    scrollBottom();
  }

  function renderDrawer() {
    return `
      <!-- Chat Toggle Floating Button -->
      <button class="chat-toggle-btn" onclick="Chat.toggle()" title="Open Chat" id="chat-toggle-button">
        💬
        <span class="chat-badge" style="display:none">0</span>
      </button>

      <!-- Chat Drawer -->
      <div class="chat-drawer" id="chat-drawer">
        <div class="chat-drawer-header">
          <div class="heading-xs flex flex-center gap-s">
            <span>💬</span> Room Chat
          </div>
          <button class="btn btn-secondary btn-sm" onclick="Chat.toggle()" style="padding:4px 8px">✕</button>
        </div>

        <div class="chat-messages-list" id="chat-messages-list">
          <!-- Populated dynamically -->
        </div>

        <div class="chat-drawer-input">
          <input type="text" class="input" id="chat-input-field" placeholder="Type a message..." maxlength="100" onkeydown="if(event.key==='Enter') Chat.send()">
          <button class="btn btn-primary btn-sm" onclick="Chat.send()">Send</button>
        </div>
      </div>
    `;
  }

  return {
    init,
    toggle,
    send,
    renderDrawer,
    renderMessages,
    clear: () => {
      messages = [];
      unreadCount = 0;
    },
  };
})();

Chat.init();
