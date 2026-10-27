/**
 * Party Arena Web — Base Game (Client)
 * Base class for all game UI components & rendering.
 */

class BaseGameRenderer {
  constructor(container, players, localPlayerId) {
    this.container = container;
    this.players = players || [];
    this.localPlayerId = localPlayerId;
    this.state = null;
    this.animationFrameId = null;
    this.destroyed = false;
  }

  init() {
    // Override in subclass
  }

  onStateUpdate(state) {
    this.state = state;
  }

  sendInput(data) {
    Network.send(Network.MessageType.GAME_INPUT, data);
  }

  getPlayer(playerId) {
    return this.players.find((p) => p.id === playerId) || { name: 'Player', colorIndex: 0 };
  }

  renderScoreboard() {
    if (!this.state || !this.state.scores) return '';
    return `
      <div class="game-scoreboard">
        ${this.players
          .map((p) => {
            const score = this.state.scores[p.id] ?? 0;
            const color = UI.getPlayerColor(p.colorIndex || 0);
            const isLocal = p.id === this.localPlayerId;
            return `
              <div class="game-score-item">
                <div class="game-score-name" style="color:${color}">
                  ${UI.escapeHTML(p.name)}${isLocal ? ' (You)' : ''}
                </div>
                <div class="game-score-value" style="color:${color}">${score}</div>
              </div>
            `;
          })
          .join('<div class="game-score-divider">:</div>')}
      </div>
    `;
  }

  destroy() {
    this.destroyed = true;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}

window.BaseGameRenderer = BaseGameRenderer;
