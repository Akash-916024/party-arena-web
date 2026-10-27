/**
 * Party Arena Web — Memory Match Game Renderer
 * Turn-based 2-4 player card pairing game with 3D flip animations,
 * anti-cheat server sync, and pair score tracking.
 */

class MemoryGameRenderer extends BaseGameRenderer {
  constructor(container, players, localPlayerId) {
    super(container, players, localPlayerId);
  }

  init() {
    this.container.innerHTML = `
      <div class="game-container">
        <div id="memory-header" class="w-full text-center"></div>
        <div id="memory-turn-wrapper" class="text-center my-s"></div>

        <div class="memory-board" id="memory-board">
          <!-- Populated dynamically -->
        </div>

        <div class="body-sm text-muted text-center mt-m">
          Find matching pairs by flipping two cards on your turn!
        </div>
      </div>
    `;

    const board = document.getElementById('memory-board');
    board.addEventListener('click', (e) => {
      const cardEl = e.target.closest('.memory-card');
      if (!cardEl) return;
      const index = parseInt(cardEl.dataset.index, 10);
      this.handleCardClick(index);
    });
  }

  handleCardClick(index) {
    if (!this.state || this.state.isOver) return;
    if (this.state.currentTurnPlayerId !== this.localPlayerId) {
      UI.showToast("It's not your turn!", 'info');
      return;
    }
    if (this.state.matched[index] || this.state.revealed[index]) return;
    if (this.state.flippedCards && this.state.flippedCards.length >= 2) return;

    Sound.playFlip();
    this.sendInput({ cardIndex: index });
  }

  onStateUpdate(state) {
    if (this.state) {
      const oldPairs = Object.values(this.state.pairs || {}).reduce((a, b) => a + b, 0);
      const newPairs = Object.values(state.pairs || {}).reduce((a, b) => a + b, 0);
      if (newPairs > oldPairs) {
        Sound.playMatch();
      }
    }
    super.onStateUpdate(state);
    this.render();
  }

  render() {
    if (!this.state) return;
    const s = this.state;

    // Header & scoreboard
    const header = document.getElementById('memory-header');
    if (header) {
      header.innerHTML = this.renderScoreboard();
    }

    // Turn indicator
    const turnWrapper = document.getElementById('memory-turn-wrapper');
    if (turnWrapper) {
      const isMyTurn = s.currentTurnPlayerId === this.localPlayerId;
      const turnPlayer = this.getPlayer(s.currentTurnPlayerId);

      if (s.isOver) {
        let maxPairs = -1;
        let winners = [];
        for (const [pid, pairs] of Object.entries(s.pairs || {})) {
          if (pairs > maxPairs) {
            maxPairs = pairs;
            winners = [pid];
          } else if (pairs === maxPairs) {
            winners.push(pid);
          }
        }
        const winnerNames = winners.map((id) => this.getPlayer(id).name).join(' & ');
        turnWrapper.innerHTML = `
          <div class="turn-indicator" style="color:var(--success);border-color:var(--success)">
            🏆 Winner: ${UI.escapeHTML(winnerNames)} (${maxPairs} pairs)!
          </div>
        `;
      } else {
        turnWrapper.innerHTML = `
          <div class="turn-indicator ${isMyTurn ? 'your-turn' : ''}">
            ${isMyTurn ? '🧠 Your turn to flip!' : `Waiting for ${UI.escapeHTML(turnPlayer.name)}...`}
          </div>
        `;
      }
    }

    // Grid rendering
    const boardEl = document.getElementById('memory-board');
    if (!boardEl) return;

    boardEl.className = `memory-board size-${s.totalCards || 16}`;

    let cardsHTML = '';
    for (let i = 0; i < s.totalCards; i++) {
      const isRevealed = s.revealed?.[i];
      const isMatched = s.matched?.[i];
      const symbol = s.cards?.[i] || '?';

      let cardClasses = 'memory-card';
      if (isRevealed) cardClasses += ' revealed';
      if (isMatched) cardClasses += ' matched';

      cardsHTML += `
        <div class="${cardClasses}" data-index="${i}">
          <div class="memory-card-inner">
            <div class="memory-card-front">❓</div>
            <div class="memory-card-back">${symbol !== null ? symbol : ''}</div>
          </div>
        </div>
      `;
    }

    boardEl.innerHTML = cardsHTML;
  }
}

window.MemoryGameRenderer = MemoryGameRenderer;
