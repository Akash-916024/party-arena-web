/**
 * Party Arena Web — Bomb Tag (Hot Potato) Game Renderer
 * Real-time 2-8 player tag game in a 2D arena.
 * Run away from the ticking bomb or chase opponents to pass it before detonation!
 */

class BombTagGameRenderer extends BaseGameRenderer {
  constructor(container, players, localPlayerId) {
    super(container, players, localPlayerId);
    this.canvas = null;
    this.ctx = null;
    this.keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, w: false, s: false, a: false, d: false };
    this.lastBombHolder = null;
    this.lastSecond = null;
    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundKeyUp = this.handleKeyUp.bind(this);
    this.boundPointerMove = this.handlePointerMove.bind(this);
    this.inputInterval = null;
  }

  init() {
    this.container.innerHTML = `
      <div class="game-container">
        <div id="bomb-header" class="w-full text-center"></div>

        <div class="game-canvas-wrapper" style="max-width:800px">
          <canvas id="bomb-canvas" width="800" height="500"></canvas>
        </div>

        <div class="body-sm text-muted text-center mt-s">
          Move with <strong>WASD / Arrow Keys</strong> or <strong>tap / drag anywhere</strong> on the arena!
        </div>
      </div>
    `;

    this.canvas = document.getElementById('bomb-canvas');
    this.ctx = this.canvas.getContext('2d');

    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
    this.canvas.addEventListener('pointermove', this.boundPointerMove);
    this.canvas.addEventListener('pointerdown', this.boundPointerMove);

    // Continuous input loop
    this.inputInterval = setInterval(() => {
      let vx = 0;
      let vy = 0;
      if (this.keys.ArrowLeft || this.keys.a || this.keys.A) vx -= 1;
      if (this.keys.ArrowRight || this.keys.d || this.keys.D) vx += 1;
      if (this.keys.ArrowUp || this.keys.w || this.keys.W) vy -= 1;
      if (this.keys.ArrowDown || this.keys.s || this.keys.S) vy += 1;

      if (vx !== 0 || vy !== 0) {
        this.sendInput({ vx, vy });
      }
    }, 1000 / 30);

    this.loop();
  }

  handleKeyDown(e) {
    if (this.keys.hasOwnProperty(e.key)) {
      this.keys[e.key] = true;
      e.preventDefault();
    }
  }

  handleKeyUp(e) {
    if (this.keys.hasOwnProperty(e.key)) {
      this.keys[e.key] = false;
    }
  }

  handlePointerMove(e) {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = 800 / rect.width;
    const scaleY = 500 / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const targetX = (clientX - rect.left) * scaleX;
    const targetY = (clientY - rect.top) * scaleY;

    this.sendInput({ targetX, targetY });
  }

  onStateUpdate(state) {
    super.onStateUpdate(state);

    const header = document.getElementById('bomb-header');
    if (header) {
      header.innerHTML = this.renderScoreboard();
    }

    // Audio triggers
    if (state.bombHolder !== this.lastBombHolder) {
      this.lastBombHolder = state.bombHolder;
      if (state.bombHolder === this.localPlayerId) {
        Sound.playBuzzer();
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      } else {
        Sound.playFlip();
      }
    }

    const sec = Math.ceil(state.bombTimer || 0);
    if (sec !== this.lastSecond && sec <= 5 && sec > 0) {
      this.lastSecond = sec;
      Sound.playTick();
    }
  }

  loop() {
    if (this.destroyed) return;
    this.render();
    this.animationFrameId = requestAnimationFrame(() => this.loop());
  }

  render() {
    if (!this.ctx || !this.state) return;
    const ctx = this.ctx;
    const s = this.state;
    const w = 800;
    const h = 500;

    // Arena Background
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, w, h);

    // Hazard Border
    ctx.strokeStyle = s.bombTimer <= 4 ? 'rgba(255, 75, 92, 0.8)' : 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 6;
    ctx.strokeRect(15, 15, w - 30, h - 30);

    // Timer & Status banner in center arena
    const isHolder = s.bombHolder === this.localPlayerId;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 48px Outfit, sans-serif';
    ctx.fillStyle = s.bombTimer <= 4 ? '#FF4B5C' : '#FFFFFF';
    ctx.shadowColor = s.bombTimer <= 4 ? '#FF4B5C' : 'transparent';
    ctx.shadowBlur = 20;
    ctx.fillText(`${(s.bombTimer || 0).toFixed(1)}s`, w / 2, 60);

    ctx.font = '600 16px Inter, sans-serif';
    ctx.fillStyle = isHolder ? '#FF4B5C' : 'rgba(255,255,255,0.7)';
    ctx.fillText(
      isHolder ? '🔥 YOU HAVE THE BOMB! PASS IT QUICK! 🔥' : 'RUN AWAY FROM THE BOMB! 💣',
      w / 2,
      95
    );
    ctx.restore();

    // Render Players
    const active = s.activePlayers || [];
    const positions = s.positions || {};

    active.forEach((pid) => {
      const pos = positions[pid];
      if (!pos) return;

      const p = this.getPlayer(pid);
      const isBomb = pid === s.bombHolder;
      const isLocal = pid === this.localPlayerId;
      const color = UI.getPlayerColor(p.colorIndex || 0);
      const r = s.playerRadius || 18;

      ctx.save();
      // Outer aura
      if (isBomb) {
        ctx.shadowColor = '#FF4B5C';
        ctx.shadowBlur = 24;
        ctx.fillStyle = 'rgba(255, 75, 92, 0.3)';
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r + 10, 0, Math.PI * 2);
        ctx.fill();
      } else if (isLocal) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 16;
      }

      // Player circle
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      ctx.fill();

      // Border
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Name label
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.fillText(p.name + (isLocal ? ' (You)' : ''), pos.x, pos.y + r + 16);

      // Bomb indicator over head
      if (isBomb) {
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('💣', pos.x, pos.y - r - 6);
      }

      ctx.restore();
    });
  }

  destroy() {
    super.destroy();
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
    if (this.inputInterval) clearInterval(this.inputInterval);
  }
}

window.BombTagGameRenderer = BombTagGameRenderer;
