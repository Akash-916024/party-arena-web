/**
 * Party Arena Web — Bot Manager & AI Decision Engines
 * Handles virtual AI players, difficulty tiers, and decision loops
 * for all 7 party mini-games.
 */

const { v4: uuidv4 } = require('uuid');

const BOT_NAMES = [
  'AlphaBot 🤖',
  'Nexus ⚡',
  'CyberSamurai 🥷',
  'PixelKing 👑',
  'ViperAI 🐍',
  'Sparky 🚀',
  'Quantum 👾',
  'MechaCat 🐱',
];

const BOT_AVATARS = ['🤖', '👾', '🥷', '⚡', '👑', '🚀', '🐱', '🎮'];

class BotPlayer {
  constructor(difficulty = 'medium', customName = null) {
    this.id = `bot_${uuidv4().slice(0, 8)}`;
    this.name = customName || BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
    this.avatar = BOT_AVATARS[Math.floor(Math.random() * BOT_AVATARS.length)];
    this.colorIndex = Math.floor(Math.random() * 8);
    this.isHost = false;
    this.isReady = true;
    this.isBot = true;
    this.difficulty = difficulty; // 'easy', 'medium', 'hard'
    this.ws = null;
    this.score = 0;
    this.teamId = null;
    this.joinedAt = Date.now();
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      avatar: this.avatar,
      colorIndex: this.colorIndex,
      isHost: false,
      isReady: true,
      isBot: true,
      difficulty: this.difficulty,
      score: this.score,
      teamId: this.teamId,
    };
  }
}

class BotManager {
  constructor() {
    /** @type {Map<string, Array<any>>} roomCode -> array of timers/intervals */
    this.roomTimers = new Map();
    /** @type {Map<string, Map<string, any>>} roomCode -> (botId -> memoryState) */
    this.botStates = new Map();
  }

  createBot(difficulty = 'medium', customName = null) {
    return new BotPlayer(difficulty, customName);
  }

  addTimer(roomCode, timer) {
    if (!this.roomTimers.has(roomCode)) {
      this.roomTimers.set(roomCode, []);
    }
    this.roomTimers.get(roomCode).push(timer);
  }

  clearRoomTimers(roomCode) {
    const timers = this.roomTimers.get(roomCode) || [];
    timers.forEach((t) => {
      clearInterval(t);
      clearTimeout(t);
    });
    this.roomTimers.delete(roomCode);
    this.botStates.delete(roomCode);
  }

  /**
   * Initializes AI loops for any bots in the current active game.
   */
  onGameStart(room, game) {
    this.clearRoomTimers(room.code);
    const bots = Array.from(room.players.values()).filter((p) => p.isBot);
    if (bots.length === 0) return;

    bots.forEach((bot) => {
      switch (game.id) {
        case 'pong':
          this.runPongBot(room.code, bot, game);
          break;
        case 'tic-tac-toe':
          this.runTicTacToeBot(room.code, bot, game);
          break;
        case 'reaction':
          this.runReactionBot(room.code, bot, game);
          break;
        case 'connect-four':
          this.runConnectFourBot(room.code, bot, game);
          break;
        case 'memory':
          this.runMemoryBot(room.code, bot, game);
          break;
        case 'tug-of-war':
          this.runTugOfWarBot(room.code, bot, game);
          break;
        case 'bomb-tag':
          this.runBombTagBot(room.code, bot, game);
          break;
      }
    });
  }

  onGameEnd(room) {
    this.clearRoomTimers(room.code);
  }

  // ─── 1. PONG BOT ──────────────────────────────────────────────────
  runPongBot(roomCode, bot, game) {
    const interval = setInterval(() => {
      if (game.isOver) {
        clearInterval(interval);
        return;
      }

      const ball = game.ball;
      const side = game.playerSide[bot.id]; // 'left' or 'right'
      const isBallHeadingTowardsBot =
        (side === 'left' && ball.vx < 0) || (side === 'right' && ball.vx > 0);

      const currentY = game.paddles[bot.id] || game.canvasHeight / 2;
      let targetY = currentY;

      if (bot.difficulty === 'easy') {
        // Only react when ball is close, with slow speed & error margin
        const threshold = side === 'left' ? game.canvasWidth * 0.45 : game.canvasWidth * 0.55;
        const inZone = side === 'left' ? ball.x < threshold : ball.x > threshold;
        if (isBallHeadingTowardsBot && inZone) {
          targetY = ball.y + (Math.random() * 40 - 20);
        } else {
          targetY = game.canvasHeight / 2;
        }
        const maxStep = 3.8;
        const diff = targetY - currentY;
        const step = Math.max(-maxStep, Math.min(maxStep, diff));
        game.handleInput(bot.id, { y: currentY + step });
      } else if (bot.difficulty === 'medium') {
        // Reacts when ball moves towards it, steady tracking
        if (isBallHeadingTowardsBot) {
          targetY = ball.y + (Math.random() * 16 - 8);
        } else {
          targetY = game.canvasHeight / 2;
        }
        const maxStep = 5.8;
        const diff = targetY - currentY;
        const step = Math.max(-maxStep, Math.min(maxStep, diff));
        game.handleInput(bot.id, { y: currentY + step });
      } else {
        // Hard / Pro: Predicts ball trajectory and wall bounces
        if (isBallHeadingTowardsBot) {
          let simX = ball.x;
          let simY = ball.y;
          let simVy = ball.vy;
          const targetX = side === 'left' ? 30 : game.canvasWidth - 30;

          // Simple bounce simulation
          while ((side === 'left' && simX > targetX) || (side === 'right' && simX < targetX)) {
            simX += ball.vx;
            simY += simVy;
            if (simY <= game.ballRadius || simY >= game.canvasHeight - game.ballRadius) {
              simVy = -simVy;
            }
          }
          targetY = simY;
        } else {
          targetY = game.canvasHeight / 2;
        }
        const maxStep = 8.5;
        const diff = targetY - currentY;
        const step = Math.max(-maxStep, Math.min(maxStep, diff));
        game.handleInput(bot.id, { y: currentY + step });
      }
    }, 1000 / 30);

    this.addTimer(roomCode, interval);
  }

  // ─── 2. TIC-TAC-TOE BOT ───────────────────────────────────────────
  runTicTacToeBot(roomCode, bot, game) {
    const checkTurn = () => {
      if (game.isOver) return;

      const currentTurnPlayer = game.players[game.currentTurn]?.id;
      if (currentTurnPlayer === bot.id) {
        const delay = 400 + Math.random() * 400;
        const timer = setTimeout(() => {
          if (game.isOver || game.players[game.currentTurn]?.id !== bot.id) return;
          const cell = this.getTicTacToeMove(game, bot);
          if (cell !== null && cell !== undefined) {
            game.handleInput(bot.id, { cell });
          }
        }, delay);
        this.addTimer(roomCode, timer);
      }
    };

    // Check periodically on turn transitions
    const poller = setInterval(checkTurn, 300);
    this.addTimer(roomCode, poller);
    checkTurn();
  }

  getTicTacToeMove(game, bot) {
    const board = game.board;
    const mySymbol = game.playerSymbol[bot.id];
    const opponentSymbol = mySymbol === 'X' ? 'O' : 'X';
    const emptyCells = [];
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) emptyCells.push(i);
    }
    if (emptyCells.length === 0) return null;

    if (bot.difficulty === 'easy') {
      // 70% random, 30% take winning move if right in front
      if (Math.random() < 0.7) {
        return emptyCells[Math.floor(Math.random() * emptyCells.length)];
      }
    }

    if (bot.difficulty === 'medium' || bot.difficulty === 'easy') {
      // Check immediate win
      for (const cell of emptyCells) {
        board[cell] = mySymbol;
        if (game.checkWin(mySymbol)) {
          board[cell] = null;
          return cell;
        }
        board[cell] = null;
      }
      // Check immediate block
      for (const cell of emptyCells) {
        board[cell] = opponentSymbol;
        if (game.checkWin(opponentSymbol)) {
          board[cell] = null;
          return cell;
        }
        board[cell] = null;
      }
      // Prefer center
      if (board[4] === null) return 4;
      return emptyCells[Math.floor(Math.random() * emptyCells.length)];
    }

    // Hard / Pro: Full Minimax (unbeatable)
    let bestScore = -Infinity;
    let bestMove = emptyCells[0];

    for (const cell of emptyCells) {
      board[cell] = mySymbol;
      const score = this.minimaxTicTacToe(game, board, 0, false, mySymbol, opponentSymbol);
      board[cell] = null;
      if (score > bestScore) {
        bestScore = score;
        bestMove = cell;
      }
    }
    return bestMove;
  }

  minimaxTicTacToe(game, board, depth, isMaximizing, mySymbol, oppSymbol) {
    if (game.checkWin(mySymbol)) return 10 - depth;
    if (game.checkWin(oppSymbol)) return depth - 10;
    if (board.every((c) => c !== null)) return 0;
    if (depth >= 6) return 0;

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (board[i] === null) {
          board[i] = mySymbol;
          const evaluation = this.minimaxTicTacToe(game, board, depth + 1, false, mySymbol, oppSymbol);
          board[i] = null;
          maxEval = Math.max(maxEval, evaluation);
        }
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (let i = 0; i < 9; i++) {
        if (board[i] === null) {
          board[i] = oppSymbol;
          const evaluation = this.minimaxTicTacToe(game, board, depth + 1, true, mySymbol, oppSymbol);
          board[i] = null;
          minEval = Math.min(minEval, evaluation);
        }
      }
      return minEval;
    }
  }

  // ─── 3. REACTION SPEED BOT ────────────────────────────────────────
  runReactionBot(roomCode, bot, game) {
    let lastRound = -1;
    let clickedThisRound = false;

    const poller = setInterval(() => {
      if (game.isOver) {
        clearInterval(poller);
        return;
      }

      if (game.currentRound !== lastRound) {
        lastRound = game.currentRound;
        clickedThisRound = false;

        // Occasional false start on Easy mode (5% chance)
        if (bot.difficulty === 'easy' && Math.random() < 0.05) {
          const falseStartDelay = 800 + Math.random() * 1200;
          const fsTimer = setTimeout(() => {
            if (!game.isOver && game.roundState === 'waiting' && !clickedThisRound) {
              game.handleInput(bot.id, { action: 'click' });
            }
          }, falseStartDelay);
          this.addTimer(roomCode, fsTimer);
        }
      }

      if (game.roundState === 'signal' && !clickedThisRound) {
        clickedThisRound = true;
        let reflexDelay = 300;

        if (bot.difficulty === 'easy') {
          reflexDelay = 420 + Math.random() * 140; // 420 - 560ms
        } else if (bot.difficulty === 'medium') {
          reflexDelay = 260 + Math.random() * 90;  // 260 - 350ms
        } else {
          reflexDelay = 165 + Math.random() * 55;  // 165 - 220ms
        }

        const clickTimer = setTimeout(() => {
          if (!game.isOver && game.roundState === 'signal') {
            game.handleInput(bot.id, { action: 'click' });
          }
        }, reflexDelay);

        this.addTimer(roomCode, clickTimer);
      }
    }, 50);

    this.addTimer(roomCode, poller);
  }

  // ─── 4. CONNECT FOUR BOT ──────────────────────────────────────────
  runConnectFourBot(roomCode, bot, game) {
    const checkTurn = () => {
      if (game.isOver) return;

      const currentTurnPlayer = game.players[game.currentTurn]?.id;
      if (currentTurnPlayer === bot.id) {
        const delay = 500 + Math.random() * 400;
        const timer = setTimeout(() => {
          if (game.isOver || game.players[game.currentTurn]?.id !== bot.id) return;
          const col = this.getConnectFourMove(game, bot);
          if (col !== null && col !== undefined) {
            game.handleInput(bot.id, { col });
          }
        }, delay);
        this.addTimer(roomCode, timer);
      }
    };

    const poller = setInterval(checkTurn, 350);
    this.addTimer(roomCode, poller);
    checkTurn();
  }

  getConnectFourMove(game, bot) {
    const validCols = [];
    for (let c = 0; c < game.cols; c++) {
      if (game.board[c].indexOf(null) !== -1) validCols.push(c);
    }
    if (validCols.length === 0) return null;

    const myDisc = game.playerDisc[bot.id];
    const opponentDisc = myDisc === 'red' ? 'yellow' : 'red';

    if (bot.difficulty === 'easy') {
      if (Math.random() < 0.6) {
        return validCols[Math.floor(Math.random() * validCols.length)];
      }
    }

    // 1-ply winning move check
    for (const c of validCols) {
      const r = game.board[c].indexOf(null);
      game.board[c][r] = myDisc;
      const win = game.checkWin(c, r, myDisc);
      game.board[c][r] = null;
      if (win) return c;
    }

    // 1-ply blocking opponent win check
    for (const c of validCols) {
      const r = game.board[c].indexOf(null);
      game.board[c][r] = opponentDisc;
      const block = game.checkWin(c, r, opponentDisc);
      game.board[c][r] = null;
      if (block) return c;
    }

    if (bot.difficulty === 'medium' || bot.difficulty === 'easy') {
      // Prefer center columns (3, 2, 4)
      const centerOrder = [3, 2, 4, 1, 5, 0, 6];
      for (const col of centerOrder) {
        if (validCols.includes(col)) return col;
      }
      return validCols[Math.floor(Math.random() * validCols.length)];
    }

    // Hard / Pro: Lookahead depth 3 evaluation
    let bestScore = -Infinity;
    let bestCol = validCols[0];

    for (const col of validCols) {
      const row = game.board[col].indexOf(null);
      game.board[col][row] = myDisc;
      const score = this.evaluateConnectFourBoard(game, myDisc, opponentDisc, 3, false, -Infinity, Infinity);
      game.board[col][row] = null;
      if (score > bestScore) {
        bestScore = score;
        bestCol = col;
      }
    }
    return bestCol;
  }

  evaluateConnectFourBoard(game, myDisc, oppDisc, depth, isMaximizing, alpha, beta) {
    if (depth === 0) return 0;
    const validCols = [];
    for (let c = 0; c < game.cols; c++) {
      if (game.board[c].indexOf(null) !== -1) validCols.push(c);
    }
    if (validCols.length === 0) return 0;

    if (isMaximizing) {
      let maxScore = -Infinity;
      for (const c of validCols) {
        const r = game.board[c].indexOf(null);
        game.board[c][r] = myDisc;
        if (game.checkWin(c, r, myDisc)) {
          game.board[c][r] = null;
          return 1000 + depth;
        }
        const evalScore = this.evaluateConnectFourBoard(game, myDisc, oppDisc, depth - 1, false, alpha, beta);
        game.board[c][r] = null;
        maxScore = Math.max(maxScore, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (beta <= alpha) break;
      }
      return maxScore;
    } else {
      let minScore = Infinity;
      for (const c of validCols) {
        const r = game.board[c].indexOf(null);
        game.board[c][r] = oppDisc;
        if (game.checkWin(c, r, oppDisc)) {
          game.board[c][r] = null;
          return -1000 - depth;
        }
        const evalScore = this.evaluateConnectFourBoard(game, myDisc, oppDisc, depth - 1, true, alpha, beta);
        game.board[c][r] = null;
        minScore = Math.min(minScore, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break;
      }
      return minScore;
    }
  }

  // ─── 5. MEMORY MATCH BOT ──────────────────────────────────────────
  runMemoryBot(roomCode, bot, game) {
    // Memory cache for this bot: Map<cardIndex, emoji>
    const knownCards = new Map();

    const checkTurn = () => {
      if (game.isOver || game.isProcessing) return;

      // Track any cards currently exposed
      for (let i = 0; i < game.totalCards; i++) {
        if (game.revealed[i] && !game.matched[i] && game.cards[i]) {
          knownCards.set(i, game.cards[i]);
        }
        if (game.matched[i]) {
          knownCards.delete(i);
        }
      }

      // Memory decay based on difficulty
      if (bot.difficulty === 'easy' && knownCards.size > 2) {
        const keys = Array.from(knownCards.keys());
        if (Math.random() < 0.4) knownCards.delete(keys[0]);
      } else if (bot.difficulty === 'medium' && knownCards.size > 6) {
        const keys = Array.from(knownCards.keys());
        knownCards.delete(keys[0]);
      }

      const currentTurnPlayer = game.players[game.currentTurn]?.id;
      if (currentTurnPlayer === bot.id && game.flippedCards.length === 0) {
        // Step 1: Pick first card
        const delay1 = 600 + Math.random() * 300;
        const timer1 = setTimeout(() => {
          if (game.isOver || game.isProcessing || game.players[game.currentTurn]?.id !== bot.id) return;
          const firstCard = this.pickMemoryCard(game, knownCards, null);
          if (firstCard !== null) {
            game.handleInput(bot.id, { cardIndex: firstCard });
            knownCards.set(firstCard, game.cards[firstCard]);

            // Step 2: Pick second card
            const delay2 = 700 + Math.random() * 300;
            const timer2 = setTimeout(() => {
              if (game.isOver || game.isProcessing || game.players[game.currentTurn]?.id !== bot.id) return;
              const secondCard = this.pickMemoryCard(game, knownCards, firstCard);
              if (secondCard !== null) {
                game.handleInput(bot.id, { cardIndex: secondCard });
              }
            }, delay2);
            this.addTimer(roomCode, timer2);
          }
        }, delay1);
        this.addTimer(roomCode, timer1);
      }
    };

    const poller = setInterval(checkTurn, 400);
    this.addTimer(roomCode, poller);
    checkTurn();
  }

  pickMemoryCard(game, knownCards, excludeIndex) {
    const unrevealed = [];
    for (let i = 0; i < game.totalCards; i++) {
      if (!game.matched[i] && !game.revealed[i] && i !== excludeIndex) {
        unrevealed.push(i);
      }
    }
    if (unrevealed.length === 0) return null;

    // If second card: do we know a card that matches excludeIndex?
    if (excludeIndex !== null) {
      const targetEmoji = game.cards[excludeIndex];
      for (const [idx, emoji] of knownCards.entries()) {
        if (idx !== excludeIndex && emoji === targetEmoji && !game.matched[idx]) {
          return idx;
        }
      }
    }

    // If first card: do we know any complete pair in knownCards?
    if (excludeIndex === null) {
      const emojiToIdx = new Map();
      for (const [idx, emoji] of knownCards.entries()) {
        if (!game.matched[idx]) {
          if (emojiToIdx.has(emoji)) {
            return emojiToIdx.get(emoji);
          }
          emojiToIdx.set(emoji, idx);
        }
      }
    }

    // Fallback: pick unknown random card
    return unrevealed[Math.floor(Math.random() * unrevealed.length)];
  }

  // ─── 6. TUG OF WAR BOT ────────────────────────────────────────────
  runTugOfWarBot(roomCode, bot, game) {
    let fatigue = 0;
    const interval = setInterval(() => {
      if (game.isOver) {
        clearInterval(interval);
        return;
      }

      fatigue++;
      let shouldPull = false;

      if (bot.difficulty === 'easy') {
        // ~5 pulls/sec, pauses every 25 ticks
        shouldPull = Math.random() < 0.28 && fatigue % 30 < 22;
      } else if (bot.difficulty === 'medium') {
        // ~8 pulls/sec
        shouldPull = Math.random() < 0.44;
      } else {
        // Hard: 11-13 pulls/sec, surges if opponent is pulling ahead
        const side = game.playerSide[bot.id];
        const isLosing = (side === 'left' && game.ropePosition > 20) || (side === 'right' && game.ropePosition < -20);
        shouldPull = Math.random() < (isLosing ? 0.75 : 0.60);
      }

      if (shouldPull) {
        game.handleInput(bot.id, { action: 'pull' });
      }
    }, 60);

    this.addTimer(roomCode, interval);
  }

  // ─── 7. BOMB TAG BOT ──────────────────────────────────────────────
  runBombTagBot(roomCode, bot, game) {
    let tickCount = 0;
    const interval = setInterval(() => {
      if (game.isOver || !game.activePlayerIds.has(bot.id)) {
        return;
      }

      tickCount++;
      // Adjust reaction tick frequency by difficulty
      const cadence = bot.difficulty === 'easy' ? 4 : bot.difficulty === 'medium' ? 2 : 1;
      if (tickCount % cadence !== 0) return;

      const myPos = game.positions[bot.id];
      if (!myPos) return;

      const isBombHolder = game.bombHolder === bot.id;

      if (isBombHolder) {
        // Chase nearest non-bomb player
        let nearestPid = null;
        let minDist = Infinity;

        for (const pid of game.activePlayerIds) {
          if (pid !== bot.id && game.positions[pid]) {
            const p = game.positions[pid];
            const dist = Math.hypot(p.x - myPos.x, p.y - myPos.y);
            if (dist < minDist) {
              minDist = dist;
              nearestPid = pid;
            }
          }
        }

        if (nearestPid && game.positions[nearestPid]) {
          const target = game.positions[nearestPid];
          const dx = target.x - myPos.x;
          const dy = target.y - myPos.y;
          game.handleInput(bot.id, { vx: dx, vy: dy });
        }
      } else {
        // Flee from bomb holder & walls
        const bombPos = game.positions[game.bombHolder];
        let repX = 0;
        let repY = 0;

        if (bombPos) {
          const dist = Math.hypot(myPos.x - bombPos.x, myPos.y - bombPos.y) || 1;
          repX += ((myPos.x - bombPos.x) / dist) * 10;
          repY += ((myPos.y - bombPos.y) / dist) * 10;
        }

        // Arena wall repulsion (bounds: 800 x 500, margin 50)
        if (myPos.x < 70) repX += 6;
        if (myPos.x > 730) repX -= 6;
        if (myPos.y < 70) repY += 6;
        if (myPos.y > 430) repY -= 6;

        // Add small random wander if bomb is far
        if (!bombPos || Math.hypot(myPos.x - bombPos.x, myPos.y - bombPos.y) > 260) {
          repX += Math.cos(tickCount * 0.2) * 2;
          repY += Math.sin(tickCount * 0.2) * 2;
        }

        game.handleInput(bot.id, { vx: repX, vy: repY });
      }
    }, 60);

    this.addTimer(roomCode, interval);
  }
}

module.exports = {
  BotPlayer,
  BotManager,
  botManager: new BotManager(),
};
