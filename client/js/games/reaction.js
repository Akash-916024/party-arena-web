/**
 * Party Arena Web — Reaction Speed Game Renderer
 * High-stakes simultaneous 2-8 player reflex test.
 * Features dramatic screen changes, millisecond timing, and false-start penalty detection.
 */

class ReactionGameRenderer extends BaseGameRenderer {
  constructor(container, players, localPlayerId) {
    super(container, players, localPlayerId);
    this.hasClickedThisRound = false;
    this.lastRoundNumber = 0;
  }

  init() {
    this.container.innerHTML = `
      <div class="game-container">
        <div id="reaction-header" class="w-full text-center"></div>
        <div class="body-md text-muted" id="reaction-round-label">Round 1 of 5</div>

        <div class="reaction-zone waiting" id="reaction-zone">
          <div class="reaction-zone-text" id="reaction-zone-text">Wait for green...</div>
          <div class="body-sm text-muted mt-s" id="reaction-zone-subtext">Clicking early causes a false start!</div>
        </div>

        <div class="w-full max-w-md mt-m" id="reaction-round-results"></div>
      </div>
    `;

    const zone = document.getElementById('reaction-zone');
    const handleClick = (e) => {
      e.preventDefault();
      this.handleZoneClick();
    };

    zone.addEventListener('pointerdown', handleClick);
    // Also spacebar / tap support
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !e.repeat) {
        this.handleZoneClick();
      }
    });
  }

  handleZoneClick() {
    if (!this.state || this.state.isOver) return;

    if (this.hasClickedThisRound) return; // Prevent double sending

    const roundState = this.state.roundState;

    if (roundState === 'waiting') {
      this.hasClickedThisRound = true;
      if (navigator.vibrate) navigator.vibrate(100);
      this.sendInput({ action: 'click' });
    } else if (roundState === 'signal') {
      this.hasClickedThisRound = true;
      if (navigator.vibrate) navigator.vibrate([40, 40, 40]);
      this.sendInput({ action: 'click' });
    }
  }

  onStateUpdate(state) {
    super.onStateUpdate(state);

    if (state.currentRound !== this.lastRoundNumber) {
      this.lastRoundNumber = state.currentRound;
      this.hasClickedThisRound = false;
    }

    this.render();
  }

  render() {
    if (!this.state) return;
    const s = this.state;

    // Header & scoreboard
    const header = document.getElementById('reaction-header');
    if (header) {
      header.innerHTML = this.renderScoreboard();
    }

    const roundLabel = document.getElementById('reaction-round-label');
    if (roundLabel) {
      roundLabel.textContent = `Round ${s.currentRound} of ${s.totalRounds || 5}`;
    }

    const zone = document.getElementById('reaction-zone');
    const zoneText = document.getElementById('reaction-zone-text');
    const zoneSubtext = document.getElementById('reaction-zone-subtext');
    const resultsContainer = document.getElementById('reaction-round-results');

    if (!zone || !zoneText) return;

    if (s.roundState === 'waiting') {
      zone.className = 'reaction-zone waiting';
      const isFalse = s.falseStarters?.includes(this.localPlayerId);
      if (isFalse) {
        zoneText.textContent = '❌ FALSE START!';
        zoneSubtext.textContent = 'You clicked too early! Penalty applied.';
      } else {
        zoneText.textContent = '⏳ WAIT FOR GREEN...';
        zoneSubtext.textContent = 'Do not click or tap yet!';
      }
      if (resultsContainer) resultsContainer.innerHTML = '';
    } else if (s.roundState === 'signal') {
      zone.className = 'reaction-zone signal';
      const myTime = s.roundResults?.[this.localPlayerId];
      if (myTime && myTime > 0) {
        zoneText.textContent = `⚡ ${myTime} ms!`;
        zoneSubtext.textContent = 'Great reflex! Waiting for others...';
      } else {
        zoneText.textContent = '⚡ CLICK NOW! ⚡';
        zoneSubtext.textContent = 'Tap as fast as you can!';
      }
    } else if (s.roundState === 'results') {
      zone.className = 'reaction-zone results';
      const myTime = s.roundResults?.[this.localPlayerId];
      if (myTime === -1) {
        zoneText.textContent = '🚫 False Start!';
      } else if (myTime && myTime < 9000) {
        zoneText.textContent = `⚡ Your Time: ${myTime} ms`;
      } else {
        zoneText.textContent = '⌛ Too Slow!';
      }
      zoneSubtext.textContent = 'Next round starting soon...';

      // Render round times list
      if (resultsContainer && s.roundResults) {
        const sorted = Object.entries(s.roundResults).sort((a, b) => {
          if (a[1] < 0) return 1;
          if (b[1] < 0) return -1;
          return a[1] - b[1];
        });

        resultsContainer.innerHTML = `
          <div class="card p-m">
            <div class="heading-xs text-muted mb-s uppercase">Round ${s.currentRound} Leaderboard</div>
            <div class="flex-col gap-xs">
              ${sorted
                .map(([pid, time], idx) => {
                  const player = this.getPlayer(pid);
                  const isLocal = pid === this.localPlayerId;
                  const color = UI.getPlayerColor(player.colorIndex || 0);
                  let timeStr = `${time} ms`;
                  if (time === -1) timeStr = '❌ False Start';
                  if (time >= 9000) timeStr = '⌛ Time Out';

                  return `
                    <div class="flex flex-between flex-center p-xs" style="border-radius:var(--radius-s);background:${isLocal ? 'rgba(255,255,255,0.06)' : 'transparent'}">
                      <div class="flex flex-center gap-s">
                        <span style="font-weight:700;color:var(--accent);width:20px">#${idx + 1}</span>
                        <span style="color:${color};font-weight:600">${UI.escapeHTML(player.name)}${isLocal ? ' (You)' : ''}</span>
                      </div>
                      <span style="font-family:var(--font-heading);font-weight:700">${timeStr}</span>
                    </div>
                  `;
                })
                .join('')}
            </div>
          </div>
        `;
      }
    }
  }
}

window.ReactionGameRenderer = ReactionGameRenderer;
