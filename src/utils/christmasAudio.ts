// Tender emotional Christmas piano & chime Web Audio synthesizer
const FREQ: Record<string, number> = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.0, B5: 987.77,
  C6: 1046.5, D6: 1174.66, E6: 1318.51, G6: 1567.98,
};

interface PianoStep {
  notes: string[];
  beats: number;
  accent?: number;
}

// Emotional warm winter nocturne (slow piano + music-box overtones, 78 BPM)
const NOCTURNE_SCORE: PianoStep[] = [
  { notes: ['E5', 'C3', 'G3', 'E4'], beats: 1.5, accent: 1.0 },
  { notes: ['G5'], beats: 0.5, accent: 0.85 },
  { notes: ['C6', 'G4'], beats: 1.0, accent: 1.05 },
  { notes: ['B5'], beats: 1.0, accent: 0.9 },

  { notes: ['A5', 'A3', 'E4'], beats: 1.5, accent: 0.95 },
  { notes: ['G5'], beats: 0.5, accent: 0.8 },
  { notes: ['E5', 'C4'], beats: 2.0, accent: 0.88 },

  { notes: ['F5', 'F3', 'C4', 'A4'], beats: 1.5, accent: 0.96 },
  { notes: ['G5'], beats: 0.5, accent: 0.85 },
  { notes: ['A5', 'C4'], beats: 1.0, accent: 1.0 },
  { notes: ['G5'], beats: 1.0, accent: 0.88 },

  { notes: ['E5', 'G3', 'D4', 'B4'], beats: 2.0, accent: 0.92 },
  { notes: ['D5', 'G4'], beats: 2.0, accent: 0.84 },

  { notes: ['E5', 'C3', 'G3', 'E4'], beats: 1.0, accent: 0.95 },
  { notes: ['G5'], beats: 1.0, accent: 0.92 },
  { notes: ['D6', 'G4'], beats: 1.5, accent: 1.05 },
  { notes: ['C6'], beats: 0.5, accent: 0.9 },

  { notes: ['B5', 'A3', 'E4'], beats: 1.5, accent: 0.96 },
  { notes: ['A5'], beats: 0.5, accent: 0.85 },
  { notes: ['G5', 'E4'], beats: 2.0, accent: 0.9 },

  { notes: ['A5', 'F3', 'C4'], beats: 1.0, accent: 0.95 },
  { notes: ['G5'], beats: 1.0, accent: 0.88 },
  { notes: ['E5', 'G3', 'D4'], beats: 1.0, accent: 0.9 },
  { notes: ['D5'], beats: 1.0, accent: 0.84 },

  { notes: ['C5', 'C3', 'G3', 'E4'], beats: 4.0, accent: 0.96 },
];

class ChristmasAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private timerId: number | null = null;
  private stepIdx = 0;
  private playing = false;
  private muted = false;

  private ensureAudio(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;

    if (!this.ctx) {
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.0001;

      // Lush warm concert hall impulse response for dreamy emotional resonance
      const rate = this.ctx.sampleRate;
      const length = Math.floor(rate * 2.4);
      const impulse = this.ctx.createBuffer(2, length, rate);
      for (let ch = 0; ch < 2; ch++) {
        const data = impulse.getChannelData(ch);
        for (let i = 0; i < length; i++) {
          const decay = Math.pow(1 - i / length, 2.8);
          data[i] = (Math.random() * 2 - 1) * decay * 0.35;
        }
      }
      this.reverbNode = this.ctx.createConvolver();
      this.reverbNode.buffer = impulse;

      const wetGain = this.ctx.createGain();
      wetGain.gain.value = 0.42;

      this.masterGain.connect(this.ctx.destination);
      this.masterGain.connect(this.reverbNode);
      this.reverbNode.connect(wetGain);
      wetGain.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private playWarmPianoTone(freq: number, velocity: number, isBass: boolean) {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;

    const oscMain = this.ctx.createOscillator();
    const oscOver = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const env = this.ctx.createGain();

    oscMain.type = 'triangle';
    oscOver.type = 'sine';
    oscMain.frequency.setValueAtTime(freq, now);
    oscOver.frequency.setValueAtTime(freq * 2, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isBass ? 950 : 2800, now);
    filter.frequency.exponentialRampToValueAtTime(isBass ? 360 : 920, now + 2.2);

    const overGain = this.ctx.createGain();
    overGain.gain.setValueAtTime(isBass ? 0.08 : 0.22, now);
    overGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    const peak = (isBass ? 0.11 : 0.17) * velocity;
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(peak, now + 0.018);
    env.gain.exponentialRampToValueAtTime(0.0008, now + (isBass ? 3.2 : 2.6));

    oscMain.connect(filter);
    oscOver.connect(overGain);
    overGain.connect(filter);
    filter.connect(env);
    env.connect(this.masterGain);

    oscMain.start(now);
    oscOver.start(now);
    oscMain.stop(now + 3.4);
    oscOver.stop(now + 3.4);
  }

  public startMusic() {
    const ctx = this.ensureAudio();
    if (!ctx || !this.masterGain) return;
    if (this.playing) return;

    this.playing = true;
    this.muted = false;
    this.stepIdx = 0;

    const now = ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(0.001, now);
    this.masterGain.gain.linearRampToValueAtTime(0.62, now + 1.2);

    const tempo = 78;
    const schedule = () => {
      if (!this.playing) return;
      const step = NOCTURNE_SCORE[this.stepIdx % NOCTURNE_SCORE.length];
      step.notes.forEach((n, idx) => {
        const f = FREQ[n];
        if (f) this.playWarmPianoTone(f, step.accent ?? 0.9, idx > 0);
      });
      this.stepIdx++;
      const ms = (60 / tempo) * step.beats * 1000;
      this.timerId = window.setTimeout(schedule, ms);
    };

    schedule();
  }

  public playUnsealChime() {
    const ctx = this.ensureAudio();
    if (!ctx || !this.masterGain || this.muted) return;
    const notes = ['C5', 'E5', 'G5', 'B5', 'D6', 'G6'];
    notes.forEach((n, idx) => {
      const f = FREQ[n];
      if (!f) return;
      window.setTimeout(() => this.playWarmPianoTone(f, 0.72, false), idx * 75);
    });
  }

  public playApexIgnitionChord() {
    const ctx = this.ensureAudio();
    if (!ctx || !this.masterGain || this.muted) return;
    const notes = ['C4', 'G4', 'C5', 'E5', 'G5', 'B5', 'D6', 'G6'];
    notes.forEach((n, idx) => {
      const f = FREQ[n];
      if (!f) return;
      window.setTimeout(() => this.playWarmPianoTone(f, 0.9, idx < 2), idx * 42);
    });
  }

  public playRipplePluck() {
    const ctx = this.ensureAudio();
    if (!ctx || !this.masterGain || this.muted) return;
    const choices = ['E5', 'G5', 'B5', 'C6', 'D6', 'E6'];
    const pick = choices[Math.floor(Math.random() * choices.length)];
    const f = FREQ[pick];
    if (f) this.playWarmPianoTone(f, 0.65, false);
  }

  public setMuted(mute: boolean) {
    this.muted = mute;
    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(mute ? 0.0001 : 0.62, now, 0.14);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public stop() {
    this.playing = false;
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }
  }
}

export const christmasAudio = new ChristmasAudioEngine();
