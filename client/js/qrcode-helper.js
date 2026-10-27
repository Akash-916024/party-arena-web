/**
 * Party Arena Web — QR Code & Share Helper
 * Generates instant client-side QR codes for phone camera scanning
 * and provides 1-click invite link copying & native mobile sharing.
 */

const QRCodeHelper = (() => {
  function getInviteUrl(roomCode) {
    const origin = window.location.origin;
    const pathname = window.location.pathname.replace(/\/$/, '');
    return `${origin}${pathname}/?room=${encodeURIComponent(roomCode.toUpperCase())}`;
  }

  function render(canvas, text, size = 200) {
    if (!canvas || !window.QRious) return null;
    return new window.QRious({
      element: canvas,
      value: text,
      size: size,
      background: '#FFFFFF',
      foreground: '#0A0A1A',
      level: 'M',
      padding: 12,
    });
  }

  function copyInviteLink(roomCode) {
    const url = getInviteUrl(roomCode);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        Sound.playClick();
        UI.showToast('Invite link copied to clipboard! 📋', 'success');
      }).catch(() => {
        fallbackCopy(url);
      });
    } else {
      fallbackCopy(url);
    }
  }

  function fallbackCopy(text) {
    const input = document.createElement('input');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    input.remove();
    Sound.playClick();
    UI.showToast('Invite link copied! 📋', 'success');
  }

  function shareNative(roomCode) {
    const url = getInviteUrl(roomCode);
    if (navigator.share) {
      navigator.share({
        title: 'Join my Party Arena room!',
        text: `Play multiplayer party games with me on Party Arena! Room code: ${roomCode}`,
        url: url,
      }).catch(() => {});
    } else {
      copyInviteLink(roomCode);
    }
  }

  function showShareModal(roomCode) {
    const url = getInviteUrl(roomCode);
    const hasNativeShare = typeof navigator.share === 'function';

    UI.showModal(`
      <div class="text-center">
        <div class="heading-md mb-s">📱 Scan to Join</div>
        <div class="body-sm text-muted mb-m">Scan this QR code with any smartphone camera to jump right in:</div>

        <div style="background:#ffffff;padding:12px;border-radius:16px;display:inline-block;box-shadow:0 8px 30px rgba(0,0,0,0.5)">
          <canvas id="share-qr-canvas" width="200" height="200"></canvas>
        </div>

        <div class="mt-m p-s card text-center" style="background:var(--surface-light);word-break:break-all;font-size:0.85rem">
          <span class="text-muted">Code: </span><strong style="color:var(--accent);letter-spacing:0.1em;font-size:1.1rem">${roomCode}</strong>
        </div>

        <div class="flex gap-m mt-l">
          <button class="btn btn-secondary flex-1" onclick="QRCodeHelper.copyInviteLink('${roomCode}')">
            📋 Copy Link
          </button>
          ${
            hasNativeShare
              ? `<button class="btn btn-primary flex-1" onclick="QRCodeHelper.shareNative('${roomCode}')">
                   📤 Share App
                 </button>`
              : `<button class="btn btn-primary flex-1" onclick="UI.hideModal()">
                   Done
                 </button>`
          }
        </div>
      </div>
    `);

    setTimeout(() => {
      const canvas = document.getElementById('share-qr-canvas');
      if (canvas) {
        render(canvas, url, 200);
      }
    }, 50);
  }

  return {
    getInviteUrl,
    render,
    copyInviteLink,
    shareNative,
    showShareModal,
  };
})();
