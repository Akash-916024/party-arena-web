/**
 * Party Arena Web — Tournament Client
 * Tracks tournament state on the client side.
 */

const TournamentClient = (() => {
  let tournament = null;

  function setTournament(data) {
    tournament = data;
  }

  function getTournament() {
    return tournament;
  }

  function clear() {
    tournament = null;
  }

  function renderTournamentResults(data) {
    const rankings = data.rankings || [];
    const matchResults = data.matchResults || [];

    const rankItems = rankings
      .map((r, i) => {
        const medals = ['🥇', '🥈', '🥉'];
        const medal = medals[i] || `#${i + 1}`;
        const player = r.player || {};
        const color = UI.getPlayerColor(player.colorIndex || 0);
        return `
        <div class="results-rank-item" style="animation-delay:${i * 100}ms">
          <div class="results-rank-number">${medal}</div>
          <div class="player-avatar" style="background:${color};width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:0.9rem;font-weight:800">
            ${(player.name || '?')[0].toUpperCase()}
          </div>
          <div class="results-rank-name">${UI.escapeHTML(player.name || 'Player')}</div>
          <div class="results-rank-score">${r.totalScore} pts</div>
        </div>
      `;
      })
      .join('');

    const matchHistory = matchResults
      .map((m, i) => {
        const game = Room.GAMES.find((g) => g.id === m.gameId);
        return `
        <div class="card" style="padding:12px 16px;margin-top:8px">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span>${game?.icon || '🎮'} ${game?.name || m.gameId}</span>
            <span class="body-sm">Game ${i + 1}</span>
          </div>
        </div>
      `;
      })
      .join('');

    return `
      <div class="page">
        <div class="page-content">
          <div class="results-trophy">🏆</div>
          <div class="heading-lg text-center text-gold mt-m">Tournament Complete!</div>
          <div class="body-md text-center mt-s">
            ${data.mode === 'individual' ? 'Individual Points' : data.mode === 'team' ? 'Team Battle' : 'Knockout'} 
            · ${data.totalGames} Games
          </div>

          <div class="results-rank-list mt-l">
            ${rankItems}
          </div>

          <div class="mt-l">
            <div class="heading-sm mb-s">Match History</div>
            ${matchHistory}
          </div>

          <button class="btn btn-primary btn-full mt-xl" onclick="App.navigate('lobby')">
            Back to Lobby
          </button>
        </div>
      </div>
    `;
  }

  return {
    setTournament,
    getTournament,
    clear,
    renderTournamentResults,
  };
})();
