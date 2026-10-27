/**
 * Party Arena Web — Tug of War Game Renderer
 * Real-time 2-player rapid button-masher with physics rope tension,
 * center flag tracker, and tactile pull mechanics.
 */

class TugOfWarGameRenderer extends BaseGameRenderer {
  constructor(container, players, localPlayerId) {
    super(container, players, localPlayerId);
    this.canvas = null;
    this.ctx = null;
    this.pullCount = 0;
    this.boundKeyDown = this.handleKeyDown.bind(this);
  }

  init() {
    const isPlayer1 = this.players[0]?.id === this.localPlayerId;
    const mySide = isPlayer1 ? 'LEFT' : 'RIGHT';

    this.container.innerHTML = `
      <div class="game-container">
        <div id="tow-header" class="w-full text-center"></div>

        <div class="game-canvas-wrapper" style="max-width:800px">
          <canvas id="tow-canvas" width="800" height="340"></canvas>
        </div>

        <!-- Masher Button -->
        <div class="mt-m flex flex-col flex-center gap-s">
          <button class="btn btn-primary" id="tow-pull-btn" style="font-size:1.6rem;padding:20px 48px;border-radius:var(--radius-full);box-shadow:var(--shadow-glow-accent);user-select:none;-webkit-user-select:none">
            ⚡ PULL! ⚡
          </button>
          <div class="body-sm text-muted">
            Tap the button or press Spacebar as fast as you can! (Your side: <strong style="color:var(--accent)">${mySide}</strong>)
          </div>
        </div>
      </div>
    `;

    this.canvas = document.getElementById('tow-canvas');
    this.ctx = this.canvas.getContext('2d');

    const pullBtn = document.getElementById('tow-pull-btn');
    const triggerPull = (e) => {
      e.preventDefault();
      this.handlePull();
    };

    pullBtn.addEventListener('pointerdown', triggerPull);
    window.addEventListener('keydown', this.boundKeyDown);

    this.loop();
  }

  handleKeyDown(e) {
    if (e.code === 'Space' && !e.repeat) {
      e.preventDefault();
      this.handlePull();
    }
  }

  handlePull() {
    if (!this.state || this.state.isOver) return;

    this.pullCount++;
    Sound.playTug();
    if (navigator.vibrate) navigator.vibrate(25);

    // Button tactile bounce
    const btn = document.getElementById('tow-pull-btn');
    if (btn) {
      btn.style.transform = 'scale(0.93)';
      setTimeout(() => {
        btn.style.transform = 'scale(1)';
      }, 70);
    }

    this.sendInput({ action: 'pull' });
  }

  onStateUpdate(state) {
    super.onStateUpdate(state);
    const header = document.getElementById('tow-header');
    if (header) {
      header.innerHTML = this.renderScoreboard();
    }
  }

  loop() {
    if (this.destroyed) return;
    this.render();
    this.animationFrameId = requestAnimationFrame(() => this.loop());
  }

  render() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const w = 800;
    const h = 340;

    // Background Arena
    ctx.fillStyle = '#0c0d1e';
    ctx.fillRect(0, 0, w, h);

    // Mud/Dirt pit gradient
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, 'rgba(233, 69, 96, 0.15)');
    grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.03)');
    grad.addColorStop(1, 'rgba(75, 139, 255, 0.15)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Goal Threshold Lines
    const leftGoalX = 140;
    const rightGoalX = w - 140;

    // Left Goal
    ctx.strokeStyle = 'rgba(233, 69, 96, 0.4)';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(leftGoalX, 20);
    ctx.lineTo(leftGoalX, h - 20);
    ctx.stroke();

    // Right Goal
    ctx.strokeStyle = 'rgba(75, 139, 255, 0.4)';
    ctx.beginPath();
    ctx.moveTo(rightGoalX, 20);
    ctx.lineTo(rightGoalX, h - 20);
    ctx.stroke();

    // Center Line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(w / 2, 20);
    ctx.lineTo(w / 2, h - 20);
    ctx.stroke();

    // Rope Position (-100 to +100 scaled to pixel space)
    const ropePos = this.state ? this.state.ropePosition || 0 : 0;
    const maxOffset = rightGoalX - w / 2;
    const flagX = w / 2 + (ropePos / 100) * maxOffset;
    const ropeY = h / 2;

    // Draw Braided Rope
    ctx.save();
    ctx.strokeStyle = '#D4A373';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(40, ropeY);

    // Subtle catenary curve based on tension
    const tension = Math.abs(ropePos) / 100;
    const sag = (1 - tension * 0.8) * 12;
    ctx.quadraticCurveTo(w / 2, ropeY + sag, w - 40, ropeY);
    ctx.stroke();

    // Rope Texture Strands
    ctx.strokeStyle = '#99582A';
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Center Ribbon / Flag
    ctx.save();
    ctx.fillStyle = '#FFD93D';
    ctx.shadowColor = '#FFD93D';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.moveTo(flagX, ropeY - 24);
    ctx.lineTo(flagX + 18, ropeY - 14);
    ctx.lineTo(flagX, ropeY);
    ctx.closePath();
    ctx.fill();

    // Flag pole
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(flagX, ropeY - 28);
    ctx.lineTo(flagX, ropeY + 12);
    ctx.stroke();
    ctx.restore();

    // Draw Left Player Avatar & Tag
    if (this.players[0]) {
      const p1 = this.players[0];
      const p1Color = UI.getPlayerColor(p1.colorIndex || 0);
      this.drawTugger(ctx, 80, ropeY, p1Color, p1.name, 'left', p1.id === this.localPlayerId);
    }

    // Draw Right Player Avatar & Tag
    if (this.players[1]) {
      const p2 = this.players[1];
      const p2Color = UI.getPlayerColor(p2.colorIndex || 1);
      this.drawTugger(ctx, w - 80, ropeY, p2Color, p2.name, 'right', p2.id === this.localPlayerId);
    }
  }

  drawTugger(ctx, x, y, color, name, side, isLocal) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = isLocal ? 18 : 8;

    // Body circle
    ctx.beginPath();
    ctx.arc(x, y - 10, 24, 0, Math.PI * 2);
    ctx.fill();

    // Initial
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((name || '?')[0].toUpperCase(), x, y - 10);

    // Name tag
    ctx.font = '13px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText(name + (isLocal ? ' (You)' : ''), x, y + 32);
    ctx.restore();
  }

  destroy() {
    super.destroy();
    window.removeEventListener('keydown', this.boundKeyDown);
  }
}

window.TugOfWarGameRenderer = TugOfWarGameRenderer;
