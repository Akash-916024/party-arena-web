/**
 * Party Arena Web — Connect Four Game Renderer
 * Turn-based 2-player gravity disc dropper with column hover preview,
 * falling animations, and 4-in-a-row highlight glow.
 */

class ConnectFourGameRenderer extends BaseGameRenderer {
  constructor(container, players, localPlayerId) {
    super(container, players, localPlayerId);
    this.hoverCol = null;
  }

  init() {
    this.container.innerHTML = `
      <div class="game-container">
        <div id="c4-header" class="w-full text-center"></div>
        <div id="c4-turn-wrapper" class="text-center my-s"></div>

        <div class="c4-board" id="c4-board">
          <!-- Populated dynamically -->
        </div>

        <div class="body-sm text-muted text-center mt-m">
          Tap any column to drop your disc · Connect 4 in any direction to win!
        </div>
      </div>
    `;

    const board = document.getElementById('c4-board');
    board.addEventListener('click', (e) => {
      const cellEl = e.target.closest('.c4-cell');
      if (!cellEl) return;
      const col = parseInt(cellEl.dataset.col, 10);
      this.handleColClick(col);
    });
  }

  handleColClick(col) {
    if (!this.state || this.state.isOver) return;
    if (this.state.currentTurnPlayerId !== this.localPlayerId) {
      UI.showToast("It's not your turn!", 'info');
      return;
    }
    // Check if column has room (top row 5 is null)
    if (this.state.board[col]?.[5] !== null) {
      UI.showToast('Column is full!', 'warning');
      return;
    }

    Sound.playPieceDrop();
    this.sendInput({ col });
  }

  onStateUpdate(state) {
    super.onStateUpdate(state);
    this.render();
  }

  render() {
    if (!this.state) return;
    const s = this.state;

    // Header & scoreboard
    const header = document.getElementById('c4-header');
    if (header) {
      header.innerHTML = this.renderScoreboard();
    }

    // Turn indicator
    const turnWrapper = document.getElementById('c4-turn-wrapper');
    if (turnWrapper) {
      const isMyTurn = s.currentTurnPlayerId === this.localPlayerId;
      const turnPlayer = this.getPlayer(s.currentTurnPlayerId);
      const discColor = s.playerDisc?.[s.currentTurnPlayerId] || 'red';

      if (s.isOver) {
        if (s.winner) {
          const winnerPlayer = this.getPlayer(s.winner);
          turnWrapper.innerHTML = `
            <div class="turn-indicator" style="color:var(--success);border-color:var(--success)">
              🏆 ${UI.escapeHTML(winnerPlayer.name)} won!
            </div>
          `;
        } else if (s.isDraw) {
          turnWrapper.innerHTML = `
            <div class="turn-indicator" style="color:var(--warning);border-color:var(--warning)">
              🤝 It's a draw!
            </div>
          `;
        }
      } else {
        turnWrapper.innerHTML = `
          <div class="turn-indicator ${isMyTurn ? 'your-turn' : ''}">
            ${isMyTurn ? '🔴 Your turn!' : `Waiting for ${UI.escapeHTML(turnPlayer.name)}...`}
            (${discColor.toUpperCase()})
          </div>
        `;
      }
    }

    // Board rendering: 7 columns, 6 rows (row 5 is visually top, row 0 is bottom)
    const boardEl = document.getElementById('c4-board');
    if (!boardEl) return;

    let cellsHTML = '';
    const winCells = s.winningCells || [];

    for (let r = 5; r >= 0; r--) {
      for (let c = 0; c < 7; c++) {
        const disc = s.board[c] ? s.board[c][r] : null;
        let classes = 'c4-cell';
        if (disc === 'red') classes += ' red taken';
        if (disc === 'yellow') classes += ' yellow taken';

        // Check if part of winning connection
        const isWin = winCells.some(([wc, wr]) => wc === c && wr === r);
        if (isWin) classes += ' win-cell';

        cellsHTML += `<div class="${classes}" data-col="${c}" data-row="${r}" id="c4-${c}-${r}"></div>`;
      }
    }

    boardEl.innerHTML = cellsHTML;
  }
}

window.ConnectFourGameRenderer = ConnectFourGameRenderer;
