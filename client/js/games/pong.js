/**
 * Party Arena Web — Pong Game Renderer
 * Real-time 2-player arcade paddle match with canvas rendering,
 * glowing neon effects, ball motion trails, and mobile touch support.
 */

class PongGameRenderer extends BaseGameRenderer {
  constructor(container, players, localPlayerId) {
    super(container, players, localPlayerId);
    this.canvas = null;
    this.ctx = null;
    this.lastSentY = null;
    this.currentPaddleY = 250;
    this.trail = [];
    this.boundPointerMove = this.handlePointerMove.bind(this);
    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.keyState = { up: false, down: false };
    this.inputInterval = null;
  }

  init() {
    this.container.innerHTML = `
      <div class="game-container">
        <div id="pong-header" class="w-full text-center"></div>
        <div class="game-canvas-wrapper" id="pong-wrapper">
          <canvas id="pong-canvas" width="800" height="500"></canvas>
        </div>
        <div class="body-sm text-muted text-center">
          Move your mouse / touch anywhere to slide your paddle · Arrow keys / W & S also work
        </div>
      </div>
    `;

    this.canvas = document.getElementById('pong-canvas');
    this.ctx = this.canvas.getContext('2d');

    // Controls
    window.addEventListener('pointermove', this.boundPointerMove, { passive: false });
    window.addEventListener('touchmove', this.boundPointerMove, { passive: false });
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') this.keyState.up = false;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') this.keyState.down = false;
    });

    // Keyboard loop
    this.inputInterval = setInterval(() => {
      if (this.keyState.up) {
        this.currentPaddleY = Math.max(40, this.currentPaddleY - 12);
        this.emitPaddleY(this.currentPaddleY);
      } else if (this.keyState.down) {
        this.currentPaddleY = Math.min(460, this.currentPaddleY + 12);
        this.emitPaddleY(this.currentPaddleY);
      }
    }, 1000 / 60);

    this.loop();
  }

  handleKeyDown(e) {
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      this.keyState.up = true;
      e.preventDefault();
    }
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
      this.keyState.down = true;
      e.preventDefault();
    }
  }

  handlePointerMove(e) {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    // Scale clientY into canvas 0..500 space
    const scaleY = 500 / rect.height;
    const targetY = (clientY - rect.top) * scaleY;
    const clampedY = Math.max(40, Math.min(460, targetY));
    
    this.currentPaddleY = clampedY;
    this.emitPaddleY(clampedY);
  }

  emitPaddleY(y) {
    const rounded = Math.round(y);
    if (this.lastSentY === null || Math.abs(rounded - this.lastSentY) >= 3) {
      this.lastSentY = rounded;
      this.sendInput({ y: rounded });
    }
  }

  onStateUpdate(state) {
    if (this.state && state.scores) {
      const oldTotal = Object.values(this.state.scores || {}).reduce((a, b) => a + b, 0);
      const newTotal = Object.values(state.scores || {}).reduce((a, b) => a + b, 0);
      if (newTotal > oldTotal) {
        Sound.playScore();
      } else if (this.state.ball && state.ball) {
        if (Math.sign(this.state.ball.vx) !== Math.sign(state.ball.vx)) {
          Sound.playPaddleHit();
        } else if (Math.sign(this.state.ball.vy) !== Math.sign(state.ball.vy)) {
          Sound.playWallBounce();
        }
      }
    }
    super.onStateUpdate(state);
    const header = document.getElementById('pong-header');
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
    if (!this.ctx || !this.state) return;
    const ctx = this.ctx;
    const s = this.state;
    const w = s.canvasWidth || 800;
    const h = s.canvasHeight || 500;

    // Background court
    ctx.fillStyle = '#0c0d1e';
    ctx.fillRect(0, 0, w, h);

    // Subtle court grid/ambient
    const grad = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, 450);
    grad.addColorStop(0, 'rgba(30, 35, 75, 0.4)');
    grad.addColorStop(1, 'rgba(12, 13, 30, 0.9)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Court border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, w - 20, h - 20);

    // Center dotted line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 12]);
    ctx.beginPath();
    ctx.moveTo(w / 2, 15);
    ctx.lineTo(w / 2, h - 15);
    ctx.stroke();
    ctx.setLineDash([]);

    // Ball trail
    if (s.ball) {
      this.trail.push({ x: s.ball.x, y: s.ball.y, alpha: 0.6 });
      if (this.trail.length > 8) this.trail.shift();

      for (let i = 0; i < this.trail.length; i++) {
        const t = this.trail[i];
        t.alpha *= 0.85;
        const radius = Math.max(2, (s.ballRadius || 8) * (i / this.trail.length));
        ctx.beginPath();
        ctx.arc(t.x, t.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(233, 69, 96, ${t.alpha * 0.4})`;
        ctx.fill();
      }
    }

    // Paddles
    if (s.paddles && this.players.length >= 2) {
      const p1 = this.players[0];
      const p2 = this.players[1];
      const pw = s.paddleWidth || 12;
      const ph = s.paddleHeight || 80;

      // Player 1 (Left)
      const p1Y = (s.paddles[p1.id] ?? 250) - ph / 2;
      const p1Color = UI.getPlayerColor(p1.colorIndex || 0);
      this.drawPaddle(ctx, 20, p1Y, pw, ph, p1Color, p1.id === this.localPlayerId);

      // Player 2 (Right)
      const p2Y = (s.paddles[p2.id] ?? 250) - ph / 2;
      const p2Color = UI.getPlayerColor(p2.colorIndex || 1);
      this.drawPaddle(ctx, w - 20 - pw, p2Y, pw, ph, p2Color, p2.id === this.localPlayerId);
    }

    // Ball
    if (s.ball) {
      ctx.save();
      ctx.shadowColor = '#FF6B8A';
      ctx.shadowBlur = 18;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(s.ball.x, s.ball.y, s.ballRadius || 8, 0, Math.PI * 2);
      ctx.fill();

      // Inner glowing core
      ctx.fillStyle = '#FF4B5C';
      ctx.beginPath();
      ctx.arc(s.ball.x, s.ball.y, (s.ballRadius || 8) * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawPaddle(ctx, x, y, w, h, color, isLocal) {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = isLocal ? 20 : 10;
    ctx.fillStyle = color;

    // Rounded paddle
    const r = w / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();

    // Inner highlight stripe
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fillRect(x + w * 0.3, y + 6, w * 0.4, h - 12);
    ctx.restore();
  }

  destroy() {
    super.destroy();
    window.removeEventListener('pointermove', this.boundPointerMove);
    window.removeEventListener('touchmove', this.boundPointerMove);
    window.removeEventListener('keydown', this.boundKeyDown);
    if (this.inputInterval) clearInterval(this.inputInterval);
  }
}

window.PongGameRenderer = PongGameRenderer;
