// High-Fidelity Audio Manager with Authentic MP3 Sound Effects & Background Lounge Jazz
class SoundEffects {
  constructor() {
    this.ctx = null;
    // Music and sound effects are deliberately independent channels.
    // Keep `muted` as a compatibility alias for older callers, but only use
    // it for the SFX channel — it must never pause or gate background music.
    this.sfxMuted = false;
    this.muted = false;
    this.musicEnabled = false;
    this.botSfxEnabled = this.readBotSfxPreference();
    this.sfxGain = null;
    this.sfxMasterVolume = 0.7;
    this.activeSfx = new Set();

    // Track audio files and exact durations (in seconds)
    this.audioFiles = {
      dice: { src: 'sound-effects/roll-dice.mp3', duration: 1.39, volume: 0.85 },
      cash: { src: 'sound-effects/cash-register.mp3', duration: 3.19, volume: 0.75 },
      upgrade: { src: 'sound-effects/level-up.mp3', duration: 2.47, volume: 0.8 },
      card: { src: 'sound-effects/card-sound.mp3', duration: 0.43, volume: 0.85 },
      jail: { src: 'sound-effects/jail-door.mp3', duration: 6.34, volume: 0.85 },
      sad: { src: 'sound-effects/sad-trombone.mp3', duration: 5.26, volume: 0.8 },
      victory: { src: 'sound-effects/victory-fanfare.mp3', duration: 6.72, volume: 0.9 },
      music: { src: 'sound-effects/jazz-lounge.mp3', duration: 141.74, volume: 0.28 }
    };

    this.bgMusic = null;
    this.audioElements = {};
    this.initAudioElements();
  }

  initAudioElements() {
    if (typeof window === 'undefined') return;
    try {
      this.bgMusic = new Audio();
      this.bgMusic.preload = 'none';
      this.bgMusic.src = this.audioFiles.music.src;
      this.bgMusic.loop = true;
      this.bgMusic.volume = this.audioFiles.music.volume;

      Object.entries(this.audioFiles).forEach(([key, info]) => {
        if (key !== 'music') {
          const el = new Audio();
          // Keep the multi-megabyte audio files off the initial page load.
          el.preload = 'none';
          el.src = info.src;
          el.muted = this.sfxMuted;
          this.audioElements[key] = el;
        }
      });
    } catch (e) {
      console.warn('Audio preloading error:', e);
    }
  }

  init() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.setValueAtTime(
          this.sfxMuted ? 0 : this.sfxMasterVolume,
          this.ctx.currentTime,
        );
        this.sfxGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  readBotSfxPreference() {
    if (typeof localStorage === 'undefined') return false;
    try {
      return localStorage.getItem('monopoly_bot_sfx') === 'true';
    } catch (e) {
      return false;
    }
  }

  setBotSfxEnabled(enabled) {
    this.botSfxEnabled = Boolean(enabled);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('monopoly_bot_sfx', String(this.botSfxEnabled));
      } catch (e) {
        // Audio preferences are optional; keep the in-memory setting active.
      }
    }
    return this.botSfxEnabled;
  }

  shouldPlayFor(actor) {
    return !actor?.isAi || this.botSfxEnabled;
  }

  playAudioFile(key, actor = null) {
    if (!this.shouldPlayFor(actor) || this.sfxMuted || typeof window === 'undefined' || typeof Audio === 'undefined') return;
    try {
      const info = this.audioFiles[key];
      if (!info) return;

      if (this.activeSfx.size >= 10) {
        const oldest = this.activeSfx.values().next().value;
        if (oldest) {
          try {
            oldest.pause();
            oldest.src = "";
          } catch (_) {}
          this.activeSfx.delete(oldest);
        }
      }

      const template = this.audioElements[key];
      const audio = template ? template.cloneNode() : new Audio(info.src);
      audio.volume = info.volume;
      audio.muted = false;
      this.activeSfx.add(audio);
      const cleanup = () => {
        this.activeSfx.delete(audio);
        try { audio.src = ""; } catch (_) {}
      };
      audio.addEventListener('ended', cleanup, { once: true });
      audio.addEventListener('error', cleanup, { once: true });
      audio.play().catch(() => {});
      return audio;
    } catch (e) {
      console.warn('Audio playback error:', e);
    }
  }

  toggleMute() {
    this.setSfxMuted(!this.sfxMuted);
    return this.sfxMuted;
  }

  setSfxMuted(muted) {
    this.sfxMuted = Boolean(muted);
    this.muted = this.sfxMuted;

    // Mute currently playing file-based effects immediately, without
    // touching the independent background music element.
    this.activeSfx.forEach((audio) => {
      audio.muted = this.sfxMuted;
    });

    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(
        this.sfxMuted ? 0 : this.sfxMasterVolume,
        this.ctx.currentTime,
        0.015,
      );
    }

    return this.sfxMuted;
  }

  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    if (this.musicEnabled) {
      this.startMusic();
    } else {
      this.stopMusic();
    }
    return this.musicEnabled;
  }

  startMusic() {
    if (!this.musicEnabled || !this.bgMusic) return;
    this.bgMusic.muted = false;
    this.bgMusic.volume = this.audioFiles.music.volume;
    this.bgMusic.play().catch(err => {
      console.warn('Background jazz playback blocked until user gesture:', err);
    });
  }

  stopMusic() {
    if (this.bgMusic) {
      this.bgMusic.pause();
    }
  }

  // Real Authentic Sound Effects
  playCash(actor = null) {
    this.playAudioFile('cash', actor); // 3.19s
  }

  playUpgrade(actor = null) {
    this.playAudioFile('upgrade', actor); // 2.47s
  }

  playCard(actor = null) {
    this.playAudioFile('card', actor); // 0.43s
  }

  playJail(actor = null) {
    this.playAudioFile('jail', actor); // 6.34s
  }

  playBankrupt(actor = null) {
    this.playAudioFile('sad', actor); // 5.26s
  }

  playPay(actor = null) {
    this.playAudioFile('sad', actor); // 5.26s
  }

  playBuzzer(actor = null) {
    this.playAudioFile('sad', actor);
  }

  playVictory(actor = null) {
    this.playAudioFile('victory', actor); // 6.72s
  }

  playDice(actor = null) {
    this.playAudioFile('dice', actor); // 1.39s
  }

  playStartingSelector(duration = 2.4) {
    if (this.sfxMuted) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const start = this.ctx.currentTime + 0.02;
    const steps = 12;
    for (let i = 0; i < steps; i++) {
      const at = start + (i / (steps - 1)) * duration;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220 + i * 18, at);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.11, at + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.11);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(at);
      osc.stop(at + 0.12);
    }

    const finalOsc = this.ctx.createOscillator();
    const finalGain = this.ctx.createGain();
    finalOsc.type = 'sine';
    finalOsc.frequency.setValueAtTime(440, start + duration);
    finalOsc.frequency.exponentialRampToValueAtTime(660, start + duration + 0.18);
    finalGain.gain.setValueAtTime(0.0001, start + duration);
    finalGain.gain.exponentialRampToValueAtTime(0.2, start + duration + 0.02);
    finalGain.gain.exponentialRampToValueAtTime(0.0001, start + duration + 0.42);
    finalOsc.connect(finalGain);
    finalGain.connect(this.sfxGain);
    finalOsc.start(start + duration);
    finalOsc.stop(start + duration + 0.45);
  }

  playStep(actor = null) {
    if (!this.shouldPlayFor(actor) || this.sfxMuted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, this.ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }
}

export const sounds = new SoundEffects();
