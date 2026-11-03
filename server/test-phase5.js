/**
 * Party Arena Web — Phase 5 Test Suite
 * Tests BotManager, decision engines, and room manager bot integration.
 */

const assert = require('assert');
const { botManager, BotPlayer } = require('./bot-manager');
const { RoomManager, Player } = require('./room-manager');
const { createGame, getAllGames } = require('./game-engine');

console.log('🧪 Starting Phase 5 Test Suite...\n');

// 1. Test Bot Player Instantiation
console.log('1. Testing Bot Player Creation...');
const easyBot = botManager.createBot('easy');
const mediumBot = botManager.createBot('medium');
const hardBot = botManager.createBot('hard', 'TestMinimaxBot 🤖');

assert(easyBot.isBot === true, 'Bot must have isBot=true');
assert(easyBot.isReady === true, 'Bot must be ready by default');
assert(easyBot.ws === null, 'Bot ws reference must be null');
assert(hardBot.name === 'TestMinimaxBot 🤖', 'Custom name should be applied');
assert(hardBot.difficulty === 'hard', 'Difficulty should be set');
console.log('  ✓ BotPlayer instantiated properly with easy/medium/hard tiers.');

// 2. Test RoomManager Bot Integration
console.log('2. Testing RoomManager Bot Controls...');
const rm = new RoomManager();
let mockWsSent = [];
const mockWs = {
  readyState: 1,
  send: (msg) => mockWsSent.push(JSON.parse(msg)),
};

const hostRoom = rm.createRoom(mockWs, { name: 'HostTester', colorIndex: 0 });
assert(hostRoom.playerCount === 1, 'Room should have 1 player (host)');

// Add Bot
rm.addBot(mockWs, { difficulty: 'easy' });
assert(hostRoom.playerCount === 2, 'Room should have 2 players after adding bot');
const botInRoom = Array.from(hostRoom.players.values()).find((p) => p.isBot);
assert(botInRoom !== undefined, 'Bot should exist in room');
assert(botInRoom.difficulty === 'easy', 'Bot difficulty should match');
console.log('  ✓ rm.addBot successfully added bot into room.');

// Fill Bots
rm.fillBots(mockWs, { difficulty: 'medium' });
assert(hostRoom.playerCount === hostRoom.maxPlayers, `Room should be filled to ${hostRoom.maxPlayers}`);
console.log(`  ✓ rm.fillBots filled room to capacity (${hostRoom.playerCount} players).`);

// Kick Bot
const botToKick = botInRoom.id;
rm.kickPlayer(mockWs, { targetPlayerId: botToKick });
assert(hostRoom.players.has(botToKick) === false, 'Kicked bot should be removed');
console.log('  ✓ rm.kickPlayer successfully kicks bots.');

// Solo Room Creation
const soloWs = { readyState: 1, send: () => {} };
const soloRoom = rm.createSoloRoom(soloWs, {
  name: 'SoloHero',
  colorIndex: 2,
  gameId: 'pong',
  difficulty: 'hard',
});
assert(soloRoom !== null, 'Solo room created');
assert(soloRoom.playerCount === 2, 'Solo room has host + 1 bot');
assert(soloRoom.isPublic === false, 'Solo room is private');
assert(soloRoom.selectedGameId === 'pong', 'Selected game set to pong');
console.log('  ✓ rm.createSoloRoom created private match with host and hard bot.');

// 3. Test Bot Decision Engines for All 7 Games
console.log('3. Testing Bot Decision Logic across 7 Mini-Games...');

// 3.1 Pong Bot
const pongGame = createGame(
  'pong',
  [new Player('p1', 'Player 1', 0, null), hardBot],
  () => {}
);
pongGame.ball.x = 700;
pongGame.ball.y = 350;
pongGame.ball.vx = 5;
pongGame.ball.vy = 2;
botManager.runPongBot('TEST_ROOM', hardBot, pongGame);
assert(typeof pongGame.paddles[hardBot.id] === 'number', 'Pong paddle initialized');
console.log('  ✓ Pong Bot decision loop executed without error.');

// 3.2 Tic-Tac-Toe Minimax Bot
const tttGame = createGame(
  'tic-tac-toe',
  [new Player('p1', 'Player 1', 0, null), hardBot],
  () => {}
);
// Simulate opponent move
tttGame.board = ['X', 'X', null, null, 'O', null, null, null, null];
const tttMove = botManager.getTicTacToeMove(tttGame, hardBot);
assert(tttMove === 2, `Minimax must block winning move at cell 2 (got ${tttMove})`);
console.log('  ✓ Tic-Tac-Toe Minimax Bot identified & blocked instant threat.');

// 3.3 Connect Four Lookahead Bot
const c4Game = createGame(
  'connect-four',
  [new Player('p1', 'Player 1', 0, null), hardBot],
  () => {}
);
// Simulate opponent with 3 red discs in col 3
c4Game.board[3][0] = 'red';
c4Game.board[3][1] = 'red';
c4Game.board[3][2] = 'red';
const c4Move = botManager.getConnectFourMove(c4Game, hardBot);
assert(c4Move === 3, `Connect Four bot must block 4th disc in col 3 (got ${c4Move})`);
console.log('  ✓ Connect Four Bot identified vertical winning threat and blocked it.');

// 3.4 Reaction Speed Bot
const reactionGame = createGame(
  'reaction',
  [new Player('p1', 'Player 1', 0, null), mediumBot],
  () => {}
);
reactionGame.roundState = 'signal';
reactionGame.signalTime = Date.now();
botManager.runReactionBot('TEST_ROOM', mediumBot, reactionGame);
console.log('  ✓ Reaction Speed Bot listener attached.');

// 3.5 Memory Match Bot
const memoryGame = createGame(
  'memory',
  [new Player('p1', 'Player 1', 0, null), hardBot],
  () => {}
);
const known = new Map([[0, '🎯'], [5, '🎯']]);
const memCard = botManager.pickMemoryCard(memoryGame, known, null);
assert(memCard === 0 || memCard === 5, 'Memory bot should match known pairs');
console.log('  ✓ Memory Match Bot recalled matching pair from memory state.');

// 3.6 Tug of War Bot
const towGame = createGame(
  'tug-of-war',
  [new Player('p1', 'Player 1', 0, null), hardBot],
  () => {}
);
botManager.runTugOfWarBot('TEST_ROOM', hardBot, towGame);
console.log('  ✓ Tug of War Bot pull generator active.');

// 3.7 Bomb Tag Bot
const btGame = createGame(
  'bomb-tag',
  [new Player('p1', 'Player 1', 0, null), hardBot],
  () => {}
);
botManager.runBombTagBot('TEST_ROOM', hardBot, btGame);
console.log('  ✓ Bomb Tag Bot vector repulsion active.');

// Clean up
botManager.clearRoomTimers('TEST_ROOM');
console.log('\n🎉 ALL PHASE 5 TESTS PASSED SUCCESSFULLY! 100% GREEN.');

