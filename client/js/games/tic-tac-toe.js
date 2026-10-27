/**
 * Party Arena Web — Tic-Tac-Toe Game Renderer
 * Turn-based 2-player strategic grid match with turn indicators,
 * neon symbols, and winning line highlights.
 */

class TicTacToeGameRenderer extends BaseGameRenderer {
  constructor(container, players, localPlayerId) {
    super(container, players, localPlayerId);
    this.winningIndices = [];
  }

  init() {
    this.container.innerHTML = `
      <div class="game-container">
        <div id="ttt-header" class="w-full text-center"></div>
        <div id="ttt-turn-wrapper" class="text-center my-s"></div>
        <div class="ttt-board" id="ttt-board">
          ${Array(9)
            .fill(null)
            .map((_, i) => `<div class="ttt-cell" data-cell="${i}" id="ttt-cell-${i}"></div>`)
            .join('')}
        </div>
        <div class="body-sm text-muted text-center mt-m">
          Get 3 of your symbols in a line to win!
        </div>
      </div>
    `;

    const board = document.getElementById('ttt-board');
    board.addEventListener('click', (e) => {
      const cellEl = e.target.closest('.ttt-cell');
      if (!cellEl) return;
      const index = parseInt(cellEl.dataset.cell, 10);
      this.handleCellClick(index);
    });
  }

  handleCellClick(cellIndex) {
    if (!this.state || this.state.isOver) return;
    if (this.state.currentTurnPlayerId !== this.localPlayerId) {
      UI.showToast("It's not your turn!", 'info');
      return;
    }
    if (this.state.board[cellIndex] !== null) return;

    Sound.playPieceDrop();
    this.sendInput({ cell: cellIndex });
  }

  onStateUpdate(state) {
    super.onStateUpdate(state);
    this.render();
  }

  render() {
    if (!this.state) return;
    const s = this.state;

    // Header & scoreboard
    const header = document.getElementById('ttt-header');
    if (header) {
      header.innerHTML = this.renderScoreboard();
    }

    // Turn indicator
    const turnWrapper = document.getElementById('ttt-turn-wrapper');
    if (turnWrapper) {
      const isMyTurn = s.currentTurnPlayerId === this.localPlayerId;
      const turnPlayer = this.getPlayer(s.currentTurnPlayerId);
      const symbol = s.playerSymbol?.[s.currentTurnPlayerId] || '';

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
            ${isMyTurn ? '⚡ Your turn!' : `Waiting for ${UI.escapeHTML(turnPlayer.name)}...`}
            (${symbol})
          </div>
        `;
      }
    }

    // Board cells
    const myTurn = s.currentTurnPlayerId === this.localPlayerId && !s.isOver;
    const winLines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6],
    ];

    let winningCombo = null;
    if (s.winner) {
      const winSymbol = s.playerSymbol?.[s.winner];
      winningCombo = winLines.find((line) => line.every((idx) => s.board[idx] === winSymbol));
    }

    s.board.forEach((val, i) => {
      const cellEl = document.getElementById(`ttt-cell-${i}`);
      if (!cellEl) return;

      cellEl.className = 'ttt-cell';
      if (val !== null) {
        cellEl.classList.add('taken');
        const isX = val === 'X';
        cellEl.innerHTML = `<span class="${isX ? 'x' : 'o'}">${val}</span>`;
      } else {
        cellEl.innerHTML = '';
        if (!myTurn) {
          cellEl.classList.add('taken');
        }
      }

      if (winningCombo && winningCombo.includes(i)) {
        cellEl.classList.add('win-cell');
      }
    });
  }
}

window.TicTacToeGameRenderer = TicTacToeGameRenderer;
