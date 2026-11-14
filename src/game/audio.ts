export interface AudioSettings {
  sfxEnabled: boolean;
  musicEnabled: boolean;
  volume: number;
}

const STORAGE_KEY = 'desert_runner_audio_v1';

/**
 * Motor de audio procedimental basado en Web Audio API.
 * Genera efectos 16-bit originales y música ambiental estilo western norteño
 * sin depender de archivos externos con derechos de autor.
 */
export class SoundEngine {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private musicTimer: number | null = null;
  private musicStep = 0;
  private settings: AudioSettings;

  // Escala menor armónica / dórica con aire western norteño (Re menor / La)
  private readonly melodyNotes = [
    293.66, 0, 349.23, 440.0, 415.3, 440.0, 349.23, 293.66,
    261.63, 293.66, 329.63, 0, 293.66, 220.0, 261.63, 220.0,
    293.66, 0, 349.23, 440.0, 523.25, 493.88, 440.0, 349.23,
    329.63, 349.23, 329.63, 261.63, 220.0, 0, 220.0, 0,
  ];
  private readonly bassNotes = [
    146.83, 0, 110.0, 0, 146.83, 0, 110.0, 0,
    130.81, 0, 98.0, 0, 110.0, 0, 110.0, 0,
    146.83, 0, 110.0, 0, 174.61, 0, 130.81, 0,
    164.81, 0, 130.81, 0, 110.0, 0, 110.0, 0,
  ];

  constructor() {
    this.settings = this.loadSettings();
  }

  private loadSettings(): AudioSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AudioSettings>;
        return {
          sfxEnabled: parsed.sfxEnabled ?? true,
          musicEnabled: parsed.musicEnabled ?? true,
          volume: typeof parsed.volume === 'number' ? parsed.volume : 0.45,
        };
      }
    } catch {
      // Ignorar errores de almacenamiento en modo privado
    }
    return { sfxEnabled: true, musicEnabled: true, volume: 0.45 };
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // Ignorar errores de almacenamiento
    }
  }

  getSettings(): AudioSettings {
    return { ...this.settings };
  }

  setSfxEnabled(enabled: boolean): void {
    this.settings.sfxEnabled = enabled;
    this.saveSettings();
  }

  setMusicEnabled(enabled: boolean): void {
    this.settings.musicEnabled = enabled;
    this.saveSettings();
    if (enabled) {
      this.startMusic();
    } else {
      this.stopMusic();
    }
  }

  unlock(): void {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.noiseBuffer = this.createNoiseBuffer(this.ctx);
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    if (this.settings.musicEnabled && this.musicTimer === null) {
      this.startMusic();
    }
  }

  private createNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const length = ctx.sampleRate * 0.5;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private masterGain(scale: number = 1): number {
    return Math.max(0.001, this.settings.volume * scale);
  }

  playShoot(isShotgun: boolean = false): void {
    if (!this.settings.sfxEnabled) return;
    this.unlock();
    if (!this.ctx || !this.noiseBuffer) return;

    const now = this.ctx.currentTime;

    // Estallido seco de pólvora
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(isShotgun ? 750 : 1200, now);
    filter.Q.setValueAtTime(1.1, now);

    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(this.masterGain(isShotgun ? 0.52 : 0.36), now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + (isShotgun ? 0.14 : 0.085));

    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.ctx.destination);
    noise.start(now);
    noise.stop(now + (isShotgun ? 0.15 : 0.09));

    // Golpe metálico del revólver
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isShotgun ? 240 : 420, now);
    osc.frequency.exponentialRampToValueAtTime(75, now + 0.07);

    const oGain = this.ctx.createGain();
    oGain.gain.setValueAtTime(this.masterGain(0.32), now);
    oGain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

    osc.connect(oGain);
    oGain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  playReload(): void {
    if (!this.settings.sfxEnabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const clicks = [0, 0.09, 0.18];
    clicks.forEach((offset, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(780 + idx * 140, now + offset);
      osc.frequency.exponentialRampToValueAtTime(320, now + offset + 0.035);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(this.masterGain(0.14), now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.04);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.045);
    });
  }

  playHit(): void {
    if (!this.settings.sfxEnabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.055);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(this.masterGain(0.16), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.065);
  }

  playEnemyKill(isBoss: boolean = false): void {
    if (!this.settings.sfxEnabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(isBoss ? 280 : 340, now);
    osc.frequency.exponentialRampToValueAtTime(isBoss ? 48 : 80, now + (isBoss ? 0.45 : 0.14));

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(this.masterGain(isBoss ? 0.36 : 0.2), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isBoss ? 0.48 : 0.15));

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + (isBoss ? 0.5 : 0.16));
  }

  playPickup(isRare: boolean = false): void {
    if (!this.settings.sfxEnabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = isRare ? [523.25, 659.25, 783.99, 1046.5] : [587.33, 880.0];
    notes.forEach((freq, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.055);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(this.masterGain(0.22), now + i * 0.055);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.055 + 0.11);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + i * 0.055);
      osc.stop(now + i * 0.055 + 0.12);
    });
  }

  playPlayerDamage(): void {
    if (!this.settings.sfxEnabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.linearRampToValueAtTime(55, now + 0.22);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(this.masterGain(0.35), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  playRattle(): void {
    if (!this.settings.sfxEnabled || !this.ctx || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    for (let i = 0; i < 4; i++) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(3400, now + i * 0.035);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(this.masterGain(0.11), now + i * 0.035);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.035 + 0.025);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      src.start(now + i * 0.035);
      src.stop(now + i * 0.035 + 0.028);
    }
  }

  playWaveStart(isBossWave: boolean = false): void {
    if (!this.settings.sfxEnabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const fanfare = isBossWave ? [220, 261.63, 220, 196] : [293.66, 349.23, 440, 587.33];
    fanfare.forEach((freq, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      osc.type = isBossWave ? 'sawtooth' : 'square';
      osc.frequency.setValueAtTime(freq, now + i * 0.09);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(this.masterGain(0.16), now + i * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.16);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + i * 0.09);
      osc.stop(now + i * 0.09 + 0.17);
    });
  }

  startMusic(): void {
    if (!this.settings.musicEnabled || !this.ctx || this.musicTimer !== null) return;
    this.musicTimer = window.setInterval(() => {
      if (!this.ctx || this.ctx.state !== 'running' || !this.settings.musicEnabled) return;
      const now = this.ctx.currentTime;
      const idx = this.musicStep % this.melodyNotes.length;
      const lead = this.melodyNotes[idx];
      const bass = this.bassNotes[idx];

      if (lead > 0) {
        const osc = this.ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(lead, now);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(this.masterGain(0.085), now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.19);
      }

      if (bass > 0) {
        const bOsc = this.ctx.createOscillator();
        bOsc.type = 'sine';
        bOsc.frequency.setValueAtTime(bass, now);
        const bGain = this.ctx.createGain();
        bGain.gain.setValueAtTime(this.masterGain(0.11), now);
        bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        bOsc.connect(bGain);
        bGain.connect(this.ctx.destination);
        bOsc.start(now);
        bOsc.stop(now + 0.21);
      }

      // Percusión suave de paso norteño en contratiempo
      if (this.noiseBuffer && idx % 2 === 1) {
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const hp = this.ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.setValueAtTime(4500, now);
        const pGain = this.ctx.createGain();
        pGain.gain.setValueAtTime(this.masterGain(0.025), now);
        pGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        src.connect(hp);
        hp.connect(pGain);
        pGain.connect(this.ctx.destination);
        src.start(now);
        src.stop(now + 0.035);
      }

      this.musicStep++;
    }, 210);
  }

  stopMusic(): void {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}
