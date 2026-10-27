/**
 * Party Arena Web — Synthesized Sound Engine
 * 100% native Web Audio API synthesizer. Zero heavy audio assets.
 * Handles sound effects for all mini-games, countdowns, and UI clicks.
 */

const Sound = (() => {
  let ctx = null;
  let masterGain = null;
  let isMuted = false;

  function init() {
    isMuted = localStorage.getItem('pa_muted') === 'true';
  }

  function getContext() {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        ctx = new AudioCtx();
        masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(isMuted ? 0 : 0.35, ctx.currentTime);
        masterGain.connect(ctx.destination);
      }
    }
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function toggleMute() {
    isMuted = !isMuted;
    localStorage.setItem('pa_muted', String(isMuted));
    if (masterGain && ctx) {
      masterGain.gain.setValueAtTime(isMuted ? 0 : 0.35, ctx.currentTime);
    }
    updateMuteIcons();
    return isMuted;
  }

  function updateMuteIcons() {
    const icons = document.querySelectorAll('.sound-toggle-btn');
    icons.forEach((btn) => {
      btn.innerHTML = isMuted ? '🔇' : '🔊';
      btn.title = isMuted ? 'Unmute sounds' : 'Mute sounds';
    });
  }

  // ─── Sound Synthesizers ──────────────────────────────────────────

  function playClick() {
    if (isMuted) return;
    const c = getContext();
    if (!c) return;

    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, c.currentTime + 0.04);

    gain.gain.setValueAtTime(0.3, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    osc.stop(c.currentTime + 0.04);
  }

  function playPaddleHit() {
    if (isMuted) return;
    const c = getContext();
    if (!c) return;

    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(420, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(180, c.currentTime + 0.08);

    gain.gain.setValueAtTime(0.5, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    osc.stop(c.currentTime + 0.08);
  }

  function playWallBounce() {
    if (isMuted) return;
    const c = getContext();
    if (!c) return;

    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(140, c.currentTime + 0.06);

    gain.gain.setValueAtTime(0.35, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.06);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    osc.stop(c.currentTime + 0.06);
  }

  function playScore() {
    if (isMuted) return;
    const c = getContext();
    if (!c) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, c.currentTime + idx * 0.07);

      gain.gain.setValueAtTime(0, c.currentTime);
      gain.gain.setValueAtTime(0.35, c.currentTime + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + idx * 0.07 + 0.18);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(c.currentTime + idx * 0.07);
      osc.stop(c.currentTime + idx * 0.07 + 0.18);
    });
  }

  function playPieceDrop() {
    if (isMuted) return;
    const c = getContext();
    if (!c) return;

    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(280, c.currentTime + 0.09);

    gain.gain.setValueAtTime(0.4, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.09);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    osc.stop(c.currentTime + 0.09);
  }

  function playFlip() {
    if (isMuted) return;
    const c = getContext();
    if (!c) return;

    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(350, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(700, c.currentTime + 0.07);

    gain.gain.setValueAtTime(0.25, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.07);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    osc.stop(c.currentTime + 0.07);
  }

  function playMatch() {
    if (isMuted) return;
    const c = getContext();
    if (!c) return;

    const notes = [659.25, 830.61, 987.77, 1318.51];
    notes.forEach((freq, idx) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, c.currentTime + idx * 0.06);

      gain.gain.setValueAtTime(0.3, c.currentTime + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + idx * 0.06 + 0.22);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(c.currentTime + idx * 0.06);
      osc.stop(c.currentTime + idx * 0.06 + 0.22);
    });
  }

  function playCountdown(isGo = false) {
    if (isMuted) return;
    const c = getContext();
    if (!c) return;

    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    const freq = isGo ? 880 : 440;
    const dur = isGo ? 0.35 : 0.15;

    osc.frequency.setValueAtTime(freq, c.currentTime);
    gain.gain.setValueAtTime(0.4, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + dur);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    osc.stop(c.currentTime + dur);
  }

  function playBuzzer() {
    if (isMuted) return;
    const c = getContext();
    if (!c) return;

    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(130, c.currentTime);
    osc.frequency.setValueAtTime(110, c.currentTime + 0.1);

    gain.gain.setValueAtTime(0.4, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    osc.stop(c.currentTime + 0.25);
  }

  function playWin() {
    if (isMuted) return;
    const c = getContext();
    if (!c) return;

    const chords = [
      [523.25, 659.25, 783.99],       // C Major
      [587.33, 739.99, 880.00],       // D Major
      [659.25, 830.61, 987.77],       // E Major
      [783.99, 987.77, 1174.66, 1567.98], // G Major + high G
    ];

    chords.forEach((chord, i) => {
      const time = c.currentTime + i * 0.15;
      chord.forEach((freq) => {
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0.25 / chord.length, time);
        gain.gain.exponentialRampToValueAtTime(0.005, time + (i === chords.length - 1 ? 0.6 : 0.2));

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(time);
        osc.stop(time + (i === chords.length - 1 ? 0.6 : 0.2));
      });
    });
  }

  function playTug() {
    if (isMuted) return;
    const c = getContext();
    if (!c) return;

    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220 + Math.random() * 80, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(140, c.currentTime + 0.06);

    gain.gain.setValueAtTime(0.4, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.06);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    osc.stop(c.currentTime + 0.06);
  }

  function playTick() {
    if (isMuted) return;
    const c = getContext();
    if (!c) return;

    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(950, c.currentTime);
    gain.gain.setValueAtTime(0.18, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.03);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    osc.stop(c.currentTime + 0.03);
  }

  function playExplosion() {
    if (isMuted) return;
    const c = getContext();
    if (!c) return;

    // Noise buffer for blast
    const bufferSize = c.sampleRate * 0.4;
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (c.sampleRate * 0.12));
    }

    const noise = c.createBufferSource();
    noise.buffer = buffer;

    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, c.currentTime);
    filter.frequency.exponentialRampToValueAtTime(80, c.currentTime + 0.4);

    const gain = c.createGain();
    gain.gain.setValueAtTime(0.6, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.4);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    noise.start();
  }

  return {
    init,
    toggleMute,
    updateMuteIcons,
    playClick,
    playPaddleHit,
    playWallBounce,
    playScore,
    playPieceDrop,
    playFlip,
    playMatch,
    playCountdown,
    playBuzzer,
    playWin,
    playTug,
    playTick,
    playExplosion,
    get isMuted() { return isMuted; },
  };
})();

// Initialize sound preferences
Sound.init();

// Unlock audio context on first user interaction
window.addEventListener('pointerdown', () => {
  Sound.playClick();
}, { once: true });
