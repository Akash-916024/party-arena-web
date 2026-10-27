/**
 * Party Arena Web — Tournament Manager
 * Manages tournament lifecycle: setup, game progression, scoring, brackets.
 * Mirrors the original Flutter app's tournament.dart
 */

const {
  MessageType,
  TournamentMode,
  TournamentState,
  POINTS,
  createMessage,
} = require('./protocol');
const { v4: uuidv4 } = require('uuid');

class Tournament {
  constructor(mode, gameIds, players, numberOfGames = 3) {
    this.id = uuidv4();
    this.mode = mode;
    this.state = TournamentState.SETUP;
    this.gameIds = gameIds; // Array of game IDs to play
    this.currentGameIndex = 0;
    this.numberOfGames = numberOfGames;

    // Players array: [{ id, name, colorIndex, teamId }]
    this.players = players.map((p) => ({ ...p }));

    // Scores: playerId -> total tournament points
    this.playerScores = {};
    for (const p of this.players) {
      this.playerScores[p.id] = 0;
    }

    // Match history
    this.matchResults = [];

    // Teams (for team/knockout modes)
    this.teams = [];

    // Knockout bracket
    this.bracket = null;
  }

  get isComplete() {
    return this.currentGameIndex >= this.gameIds.length;
  }

  get currentGameId() {
    return this.currentGameIndex < this.gameIds.length
      ? this.gameIds[this.currentGameIndex]
      : null;
  }

  get totalGames() {
    return this.gameIds.length;
  }

  get gamesPlayed() {
    return this.currentGameIndex;
  }

  /**
   * Records the result of a completed match and advances the tournament.
   * @param {{ scores: object, ranking: string[] }} result
   */
  recordMatchResult(result) {
    const { scores, ranking } = result;

    // Award tournament points based on ranking
    ranking.forEach((playerId, index) => {
      let points;
      switch (index) {
        case 0:
          points = POINTS.FIRST;
          break;
        case 1:
          points = POINTS.SECOND;
          break;
        case 2:
          points = POINTS.THIRD;
          break;
        default:
          points = POINTS.OTHER;
      }
      this.playerScores[playerId] =
        (this.playerScores[playerId] || 0) + points;
    });

    this.matchResults.push({
      gameId: this.gameIds[this.currentGameIndex],
      gameIndex: this.currentGameIndex,
      scores,
      ranking,
      playedAt: new Date().toISOString(),
    });

    this.currentGameIndex++;

    // Check if tournament is complete
    if (this.isComplete) {
      this.state = TournamentState.COMPLETED;
    }
  }

  /**
   * Gets the final tournament rankings.
   * @returns {Array<{ playerId: string, totalScore: number, rank: number }>}
   */
  getFinalRankings() {
    return Object.entries(this.playerScores)
      .sort((a, b) => b[1] - a[1])
      .map(([playerId, totalScore], idx) => ({
        playerId,
        totalScore,
        rank: idx + 1,
        player: this.players.find((p) => p.id === playerId),
      }));
  }

  /**
   * Sets up teams for team mode.
   * @param {Array<{ teamId: string, name: string, playerIds: string[] }>} teams
   */
  setupTeams(teams) {
    this.teams = teams;
    for (const team of teams) {
      for (const pid of team.playerIds) {
        const player = this.players.find((p) => p.id === pid);
        if (player) player.teamId = team.teamId;
      }
    }
  }

  toJSON() {
    return {
      id: this.id,
      mode: this.mode,
      state: this.state,
      gameIds: this.gameIds,
      currentGameIndex: this.currentGameIndex,
      currentGameId: this.currentGameId,
      totalGames: this.totalGames,
      gamesPlayed: this.gamesPlayed,
      playerScores: this.playerScores,
      matchResults: this.matchResults,
      teams: this.teams,
      players: this.players,
      isComplete: this.isComplete,
      rankings: this.getFinalRankings(),
    };
  }
}

class TournamentManager {
  /**
   * Creates a new tournament for a room.
   * @param {object} config - { mode, gameIds, players, numberOfGames }
   * @returns {Tournament}
   */
  static createTournament(config) {
    const tournament = new Tournament(
      config.mode || TournamentMode.INDIVIDUAL,
      config.gameIds || [],
      config.players || [],
      config.numberOfGames || 3
    );
    tournament.state = TournamentState.IN_PROGRESS;
    return tournament;
  }
}

module.exports = { Tournament, TournamentManager };
