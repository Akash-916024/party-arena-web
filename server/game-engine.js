/**
 * Party Arena Web — Game Engine
 * Server-authoritative game logic for all mini-games.
 * Each game has its own state machine, input handler, and tick loop.
 */

const { MessageType, createMessage, POINTS } = require('./protocol');

// ─── Game Definitions ───────────────────────────────────────────────
const GAMES = {
  pong: {
    id: 'pong',
    name: 'Pong',
    description: 'Classic paddle battle! First to 7 points wins.',
    icon: '🏓',
    minPlayers: 2,
    maxPlayers: 2,
    type: 'realtime',
    color: '#4CAF50',
  },
  'tic-tac-toe': {
    id: 'tic-tac-toe',
    name: 'Tic-Tac-Toe',
    description: 'Get three in a row to win!',
    icon: '❌',
    minPlayers: 2,
    maxPlayers: 2,
    type: 'turnbased',
    color: '#2196F3',
  },
  reaction: {
    id: 'reaction',
    name: 'Reaction Speed',
    description: 'Click the fastest when the signal appears!',
    icon: '⚡',
    minPlayers: 2,
    maxPlayers: 8,
    type: 'simultaneous',
    color: '#FF9800',
  },
  'connect-four': {
    id: 'connect-four',
    name: 'Connect Four',
    description: 'Drop discs and get four in a row!',
    icon: '🔴',
    minPlayers: 2,
    maxPlayers: 2,
    type: 'turnbased',
    color: '#F44336',
  },
  memory: {
    id: 'memory',
    name: 'Memory Match',
    description: 'Flip cards and find matching pairs!',
    icon: '🧠',
    minPlayers: 2,
    maxPlayers: 4,
    type: 'turnbased',
    color: '#9C27B0',
  },
};

function getAllGames() {
  return Object.values(GAMES);
}

function getGameById(id) {
  return GAMES[id] || null;
}

// ─── Base Game Class ────────────────────────────────────────────────
class BaseGame {
  constructor(gameId, players, broadcastFn) {
    this.gameId = gameId;
    this.info = GAMES[gameId];
    this.players = players; // Array of { id, name, colorIndex }
    this.broadcast = broadcastFn;
    this.isOver = false;
    this.scores = {};
    this.tickInterval = null;
    this.startTime = Date.now();

    // Initialize scores
    for (const p of players) {
      this.scores[p.id] = 0;
    }
  }

  start() {
    // Override in subclass
  }

  handleInput(playerId, input) {
    // Override in subclass
  }

  tick() {
    // Override in subclass for real-time games
  }

  getState() {
    return {
      gameId: this.gameId,
      isOver: this.isOver,
      scores: this.scores,
    };
  }

  end(reason = 'complete') {
    this.isOver = true;
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }

    // Calculate rankings
    const ranking = Object.entries(this.scores)
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id);

    this.broadcast(
      createMessage(MessageType.GAME_END, {
        gameId: this.gameId,
        reason,
        scores: this.scores,
        ranking,
      })
    );

    return { scores: this.scores, ranking };
  }

  broadcastState() {
    this.broadcast(
      createMessage(MessageType.GAME_STATE, this.getState())
    );
  }

  destroy() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }
}

// ─── Pong Game ──────────────────────────────────────────────────────
class PongGame extends BaseGame {
  constructor(players, broadcastFn) {
    super('pong', players, broadcastFn);

    this.canvasWidth = 800;
    this.canvasHeight = 500;
    this.paddleHeight = 80;
    this.paddleWidth = 12;
    this.ballRadius = 8;
    this.winScore = 7;
    this.baseSpeed = 5;

    // Paddle positions (Y center)
    this.paddles = {
      [players[0].id]: this.canvasHeight / 2,
      [players[1].id]: this.canvasHeight / 2,
    };

    // Ball state
    this.ball = {
      x: this.canvasWidth / 2,
      y: this.canvasHeight / 2,
      vx: this.baseSpeed * (Math.random() > 0.5 ? 1 : -1),
      vy: this.baseSpeed * (Math.random() * 2 - 1) * 0.5,
    };

    this.playerSide = {
      [players[0].id]: 'left',
      [players[1].id]: 'right',
    };
  }

  start() {
    this.resetBall();
    // 60 FPS tick rate for smooth pong
    this.tickInterval = setInterval(() => this.tick(), 1000 / 60);
    this.broadcastState();
  }

  handleInput(playerId, input) {
    if (this.isOver) return;
    // Input: { y: number } — paddle target Y position (0 to canvasHeight)
    if (typeof input.y === 'number') {
      const halfPaddle = this.paddleHeight / 2;
      this.paddles[playerId] = Math.max(
        halfPaddle,
        Math.min(this.canvasHeight - halfPaddle, input.y)
      );
    }
  }

  tick() {
    if (this.isOver) return;

    // Move ball
    this.ball.x += this.ball.vx;
    this.ball.y += this.ball.vy;

    // Top/bottom wall bounce
    if (this.ball.y <= this.ballRadius) {
      this.ball.y = this.ballRadius;
      this.ball.vy = Math.abs(this.ball.vy);
    }
    if (this.ball.y >= this.canvasHeight - this.ballRadius) {
      this.ball.y = this.canvasHeight - this.ballRadius;
      this.ball.vy = -Math.abs(this.ball.vy);
    }

    // Left paddle collision
    const leftPlayer = this.players[0].id;
    const rightPlayer = this.players[1].id;
    const leftPaddleY = this.paddles[leftPlayer];
    const rightPaddleY = this.paddles[rightPlayer];

    // Left paddle
    if (
      this.ball.x - this.ballRadius <= this.paddleWidth + 20 &&
      this.ball.vx < 0
    ) {
      if (
        this.ball.y >= leftPaddleY - this.paddleHeight / 2 &&
        this.ball.y <= leftPaddleY + this.paddleHeight / 2
      ) {
        this.ball.x = this.paddleWidth + 20 + this.ballRadius;
        const hitPos =
          (this.ball.y - leftPaddleY) / (this.paddleHeight / 2);
        this.ball.vx = Math.abs(this.ball.vx) * 1.05;
        this.ball.vy = hitPos * this.baseSpeed;
        // Cap speed
        const speed = Math.sqrt(
          this.ball.vx ** 2 + this.ball.vy ** 2
        );
        if (speed > this.baseSpeed * 3) {
          this.ball.vx *= (this.baseSpeed * 3) / speed;
          this.ball.vy *= (this.baseSpeed * 3) / speed;
        }
      }
    }

    // Right paddle
    if (
      this.ball.x + this.ballRadius >= this.canvasWidth - this.paddleWidth - 20 &&
      this.ball.vx > 0
    ) {
      if (
        this.ball.y >= rightPaddleY - this.paddleHeight / 2 &&
        this.ball.y <= rightPaddleY + this.paddleHeight / 2
      ) {
        this.ball.x =
          this.canvasWidth - this.paddleWidth - 20 - this.ballRadius;
        const hitPos =
          (this.ball.y - rightPaddleY) / (this.paddleHeight / 2);
        this.ball.vx = -Math.abs(this.ball.vx) * 1.05;
        this.ball.vy = hitPos * this.baseSpeed;
        const speed = Math.sqrt(
          this.ball.vx ** 2 + this.ball.vy ** 2
        );
        if (speed > this.baseSpeed * 3) {
          this.ball.vx *= (this.baseSpeed * 3) / speed;
          this.ball.vy *= (this.baseSpeed * 3) / speed;
        }
      }
    }

    // Scoring
    if (this.ball.x < 0) {
      this.scores[rightPlayer]++;
      if (this.scores[rightPlayer] >= this.winScore) {
        this.end();
        return;
      }
      this.resetBall();
    } else if (this.ball.x > this.canvasWidth) {
      this.scores[leftPlayer]++;
      if (this.scores[leftPlayer] >= this.winScore) {
        this.end();
        return;
      }
      this.resetBall();
    }

    this.broadcastState();
  }

  resetBall() {
    this.ball.x = this.canvasWidth / 2;
    this.ball.y = this.canvasHeight / 2;
    this.ball.vx = this.baseSpeed * (Math.random() > 0.5 ? 1 : -1);
    this.ball.vy = this.baseSpeed * (Math.random() * 2 - 1) * 0.3;
  }

  getState() {
    return {
      ...super.getState(),
      canvasWidth: this.canvasWidth,
      canvasHeight: this.canvasHeight,
      ball: { ...this.ball },
      paddles: { ...this.paddles },
      paddleHeight: this.paddleHeight,
      paddleWidth: this.paddleWidth,
      ballRadius: this.ballRadius,
      playerSide: this.playerSide,
      winScore: this.winScore,
    };
  }
}

// ─── Tic-Tac-Toe Game ───────────────────────────────────────────────
class TicTacToeGame extends BaseGame {
  constructor(players, broadcastFn) {
    super('tic-tac-toe', players, broadcastFn);

    this.board = Array(9).fill(null); // null, 'X', or 'O'
    this.currentTurn = 0; // Index into this.players
    this.playerSymbol = {
      [players[0].id]: 'X',
      [players[1].id]: 'O',
    };
    this.winner = null;
    this.isDraw = false;
  }

  start() {
    this.broadcastState();
  }

  handleInput(playerId, input) {
    if (this.isOver) return;

    // Check it's this player's turn
    if (this.players[this.currentTurn].id !== playerId) return;

    const { cell } = input; // 0-8
    if (typeof cell !== 'number' || cell < 0 || cell > 8) return;
    if (this.board[cell] !== null) return;

    // Place piece
    this.board[cell] = this.playerSymbol[playerId];

    // Check win
    if (this.checkWin(this.playerSymbol[playerId])) {
      this.winner = playerId;
      this.scores[playerId] = 1;
      this.broadcastState();
      this.end();
      return;
    }

    // Check draw
    if (this.board.every((c) => c !== null)) {
      this.isDraw = true;
      this.broadcastState();
      this.end('draw');
      return;
    }

    // Next turn
    this.currentTurn = (this.currentTurn + 1) % 2;
    this.broadcastState();
  }

  checkWin(symbol) {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
      [0, 4, 8], [2, 4, 6],             // diags
    ];
    return lines.some((line) =>
      line.every((i) => this.board[i] === symbol)
    );
  }

  getState() {
    return {
      ...super.getState(),
      board: [...this.board],
      currentTurnPlayerId: this.players[this.currentTurn].id,
      playerSymbol: this.playerSymbol,
      winner: this.winner,
      isDraw: this.isDraw,
    };
  }
}

// ─── Reaction Speed Game ────────────────────────────────────────────
class ReactionGame extends BaseGame {
  constructor(players, broadcastFn) {
    super('reaction', players, broadcastFn);

    this.totalRounds = 5;
    this.currentRound = 0;
    this.roundState = 'waiting'; // waiting, signal, results
    this.signalTime = null;
    this.roundResults = {}; // playerId -> reactionTimeMs
    this.allRoundResults = []; // Array of { round, results }
    this.roundTimeout = null;
    this.signalTimeout = null;
    this.falseStarters = new Set();
  }

  start() {
    this.startRound();
  }

  startRound() {
    this.currentRound++;
    this.roundState = 'waiting';
    this.roundResults = {};
    this.falseStarters.clear();
    this.signalTime = null;

    this.broadcastState();

    // Random delay 2-6 seconds before showing signal
    const delay = 2000 + Math.random() * 4000;
    this.signalTimeout = setTimeout(() => {
      this.roundState = 'signal';
      this.signalTime = Date.now();
      this.broadcastState();

      // Auto-end round after 5 seconds if not all clicked
      this.roundTimeout = setTimeout(() => {
        this.endRound();
      }, 5000);
    }, delay);
  }

  handleInput(playerId, input) {
    if (this.isOver) return;

    if (input.action === 'click') {
      if (this.roundState === 'waiting') {
        // False start!
        this.falseStarters.add(playerId);
        this.roundResults[playerId] = -1; // penalty
        this.broadcastState();
        return;
      }

      if (this.roundState === 'signal' && !this.roundResults[playerId]) {
        const reactionTime = Date.now() - this.signalTime;
        this.roundResults[playerId] = reactionTime;

        // Check if all players have clicked
        const responded = Object.keys(this.roundResults).length;
        if (responded >= this.players.length) {
          this.endRound();
        } else {
          this.broadcastState();
        }
      }
    }
  }

  endRound() {
    if (this.roundTimeout) clearTimeout(this.roundTimeout);
    if (this.signalTimeout) clearTimeout(this.signalTimeout);

    this.roundState = 'results';

    // Players who didn't click get a penalty time
    for (const p of this.players) {
      if (!this.roundResults[p.id]) {
        this.roundResults[p.id] = 9999; // timeout penalty
      }
    }

    // Award points: fastest gets most points
    const sortedResults = Object.entries(this.roundResults)
      .filter(([, time]) => time > 0) // exclude false starts
      .sort((a, b) => a[1] - b[1]);

    const pointsTable = [5, 3, 2, 1];
    sortedResults.forEach(([pid], idx) => {
      this.scores[pid] = (this.scores[pid] || 0) + (pointsTable[idx] || 1);
    });

    this.allRoundResults.push({
      round: this.currentRound,
      results: { ...this.roundResults },
    });

    this.broadcastState();

    // Next round or end game
    if (this.currentRound >= this.totalRounds) {
      setTimeout(() => this.end(), 3000);
    } else {
      setTimeout(() => this.startRound(), 3000);
    }
  }

  getState() {
    return {
      ...super.getState(),
      totalRounds: this.totalRounds,
      currentRound: this.currentRound,
      roundState: this.roundState,
      roundResults: this.roundResults,
      falseStarters: Array.from(this.falseStarters),
      allRoundResults: this.allRoundResults,
    };
  }

  destroy() {
    super.destroy();
    if (this.roundTimeout) clearTimeout(this.roundTimeout);
    if (this.signalTimeout) clearTimeout(this.signalTimeout);
  }
}

// ─── Connect Four Game ──────────────────────────────────────────────
class ConnectFourGame extends BaseGame {
  constructor(players, broadcastFn) {
    super('connect-four', players, broadcastFn);

    this.cols = 7;
    this.rows = 6;
    // Board: board[col][row], bottom row = 0
    this.board = Array.from({ length: this.cols }, () =>
      Array(this.rows).fill(null)
    );
    this.currentTurn = 0;
    this.playerDisc = {
      [players[0].id]: 'red',
      [players[1].id]: 'yellow',
    };
    this.winner = null;
    this.winningCells = null;
    this.isDraw = false;
    this.lastMove = null;
  }

  start() {
    this.broadcastState();
  }

  handleInput(playerId, input) {
    if (this.isOver) return;
    if (this.players[this.currentTurn].id !== playerId) return;

    const { col } = input;
    if (typeof col !== 'number' || col < 0 || col >= this.cols) return;

    // Find lowest empty row in column
    const column = this.board[col];
    const row = column.indexOf(null);
    if (row === -1) return; // Column full

    // Place disc
    column[row] = this.playerDisc[playerId];
    this.lastMove = { col, row, playerId };

    // Check win
    const winCells = this.checkWin(col, row, this.playerDisc[playerId]);
    if (winCells) {
      this.winner = playerId;
      this.winningCells = winCells;
      this.scores[playerId] = 1;
      this.broadcastState();
      this.end();
      return;
    }

    // Check draw
    if (this.board.every((col) => col.every((cell) => cell !== null))) {
      this.isDraw = true;
      this.broadcastState();
      this.end('draw');
      return;
    }

    this.currentTurn = (this.currentTurn + 1) % 2;
    this.broadcastState();
  }

  checkWin(col, row, disc) {
    const directions = [
      [0, 1],  // vertical
      [1, 0],  // horizontal
      [1, 1],  // diagonal right
      [1, -1], // diagonal left
    ];

    for (const [dc, dr] of directions) {
      const cells = [[col, row]];

      // Check both directions
      for (const sign of [1, -1]) {
        for (let i = 1; i < 4; i++) {
          const c = col + dc * sign * i;
          const r = row + dr * sign * i;
          if (
            c >= 0 && c < this.cols &&
            r >= 0 && r < this.rows &&
            this.board[c][r] === disc
          ) {
            cells.push([c, r]);
          } else {
            break;
          }
        }
      }

      if (cells.length >= 4) return cells;
    }

    return null;
  }

  getState() {
    return {
      ...super.getState(),
      board: this.board.map((col) => [...col]),
      cols: this.cols,
      rows: this.rows,
      currentTurnPlayerId: this.players[this.currentTurn].id,
      playerDisc: this.playerDisc,
      winner: this.winner,
      winningCells: this.winningCells,
      isDraw: this.isDraw,
      lastMove: this.lastMove,
    };
  }
}

// ─── Memory Match Game ──────────────────────────────────────────────
class MemoryGame extends BaseGame {
  constructor(players, broadcastFn) {
    super('memory', players, broadcastFn);

    const pairCount = players.length <= 2 ? 8 : 12;
    this.pairCount = pairCount;
    this.totalCards = pairCount * 2;

    // Generate card values and shuffle
    const values = [];
    const emojis = ['🎮', '🎲', '🎯', '🎪', '🎨', '🎭', '🎸', '🎹', '🎺', '🎻', '🏆', '⭐'];
    for (let i = 0; i < pairCount; i++) {
      values.push(emojis[i % emojis.length], emojis[i % emojis.length]);
    }
    this.cards = this.shuffle(values);
    this.revealed = Array(this.totalCards).fill(false);
    this.matched = Array(this.totalCards).fill(false);

    this.currentTurn = 0;
    this.flippedCards = []; // Indices of currently flipped cards (max 2)
    this.pairs = {}; // playerId -> number of pairs found
    this.flipTimeout = null;
    this.isProcessing = false;

    for (const p of players) {
      this.pairs[p.id] = 0;
    }
  }

  shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  start() {
    this.broadcastState();
  }

  handleInput(playerId, input) {
    if (this.isOver || this.isProcessing) return;
    if (this.players[this.currentTurn].id !== playerId) return;

    const { cardIndex } = input;
    if (
      typeof cardIndex !== 'number' ||
      cardIndex < 0 ||
      cardIndex >= this.totalCards
    )
      return;

    // Can't flip already matched or revealed card
    if (this.matched[cardIndex] || this.revealed[cardIndex]) return;

    // Flip card
    this.revealed[cardIndex] = true;
    this.flippedCards.push(cardIndex);
    this.broadcastState();

    // If two cards flipped, check match
    if (this.flippedCards.length === 2) {
      this.isProcessing = true;
      const [first, second] = this.flippedCards;

      if (this.cards[first] === this.cards[second]) {
        // Match found!
        this.matched[first] = true;
        this.matched[second] = true;
        this.pairs[playerId]++;
        this.scores[playerId] = this.pairs[playerId];
        this.flippedCards = [];
        this.isProcessing = false;

        // Check if all pairs found
        if (this.matched.every((m) => m)) {
          this.broadcastState();
          this.end();
          return;
        }

        this.broadcastState();
      } else {
        // No match — flip back after delay
        this.flipTimeout = setTimeout(() => {
          this.revealed[first] = false;
          this.revealed[second] = false;
          this.flippedCards = [];
          this.currentTurn = (this.currentTurn + 1) % this.players.length;
          this.isProcessing = false;
          this.broadcastState();
        }, 1200);
      }
    }
  }

  getState() {
    // Only send card values for revealed/matched cards (prevent cheating)
    const visibleCards = this.cards.map((val, i) =>
      this.revealed[i] || this.matched[i] ? val : null
    );

    return {
      ...super.getState(),
      totalCards: this.totalCards,
      pairCount: this.pairCount,
      cards: visibleCards,
      revealed: [...this.revealed],
      matched: [...this.matched],
      currentTurnPlayerId: this.players[this.currentTurn].id,
      pairs: { ...this.pairs },
      flippedCards: [...this.flippedCards],
    };
  }

  destroy() {
    super.destroy();
    if (this.flipTimeout) clearTimeout(this.flipTimeout);
  }
}

// ─── Game Factory ───────────────────────────────────────────────────
function createGame(gameId, players, broadcastFn) {
  switch (gameId) {
    case 'pong':
      return new PongGame(players, broadcastFn);
    case 'tic-tac-toe':
      return new TicTacToeGame(players, broadcastFn);
    case 'reaction':
      return new ReactionGame(players, broadcastFn);
    case 'connect-four':
      return new ConnectFourGame(players, broadcastFn);
    case 'memory':
      return new MemoryGame(players, broadcastFn);
    default:
      return null;
  }
}

module.exports = {
  GAMES,
  getAllGames,
  getGameById,
  createGame,
  BaseGame,
};
