/**
 * Zero-asset WebAudio Synthesizer for Ember Yard.
 * Pure procedural synthesis for thruster rumble, metallic impacts, weld snaps, and structural fracture.
 */

class YardSoundEngine {
  private ctx: AudioContext | null = null;
  private thrusterGain: GainNode | null = null;
  private thrusterOsc: OscillatorNode | null = null;
  private thrusterNoiseGain: GainNode | null = null;
  private isInitialized = false;

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public init() {
    if (this.isInitialized) return;
    const ctx = this.getContext();
    if (!ctx) return;
    this.isInitialized = true;
  }

  /**
   * Snappy electric arc weld + mechanical lock sound
   */
  public playWeld() {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // High arc spark noise
    const bufferSize = ctx.sampleRate * 0.08;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.setValueAtTime(2400, now);
    noiseFilter.Q.setValueAtTime(4.0, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.35, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);

    // Metallic clamp ping
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.12);

    oscGain.gain.setValueAtTime(0.25, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  /**
   * Catastrophic structural fracture tear + metallic boom
   */
  public playFracture(intensity = 1.0) {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const scale = Math.min(2.0, Math.max(0.5, intensity / 50));

    // Deep sub boom
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = "triangle";
    subOsc.frequency.setValueAtTime(140, now);
    subOsc.frequency.exponentialRampToValueAtTime(32, now + 0.35);

    subGain.gain.setValueAtTime(0.4 * scale, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.35);

    // High metallic tear burst
    const dur = 0.22;
    const bufSize = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 1.8);
    }
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buf;

    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(1800, now);
    filter.frequency.exponentialRampToValueAtTime(400, now + dur);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3 * scale, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noiseSource.start(now);
  }

  /**
   * Heavy hammer drop / metallic collision impact
   */
  public playImpact(speed: number, isHammer = false) {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const volume = Math.min(0.6, Math.max(0.05, speed / 18));

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = isHammer ? "triangle" : "sine";
    const startFreq = isHammer ? 95 : 220 + Math.random() * 80;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + (isHammer ? 0.28 : 0.12));

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isHammer ? 0.28 : 0.12));

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + (isHammer ? 0.28 : 0.12));
  }

  /**
   * Magnetic snap candidate found
   */
  public playSnap() {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.setValueAtTime(780, now + 0.03);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  /**
   * Grab part / Drop part
   */
  public playGrab(grab = true) {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(grab ? 320 : 440, now);
    osc.frequency.exponentialRampToValueAtTime(grab ? 440 : 280, now + 0.06);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  /**
   * Continuous engine/thruster roar with pitch modulation
   */
  public setThruster(active: boolean, speed = 1.0) {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (!active) {
      if (this.thrusterGain) {
        this.thrusterGain.gain.setTargetAtTime(0.0001, now, 0.1);
      }
      return;
    }

    if (!this.thrusterGain || !this.thrusterOsc) {
      this.thrusterGain = ctx.createGain();
      this.thrusterGain.gain.setValueAtTime(0.001, now);
      this.thrusterGain.connect(ctx.destination);

      this.thrusterOsc = ctx.createOscillator();
      this.thrusterOsc.type = "sawtooth";
      this.thrusterOsc.frequency.setValueAtTime(65, now);

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(280, now);

      this.thrusterOsc.connect(filter);
      filter.connect(this.thrusterGain);
      this.thrusterOsc.start(now);
    }

    const targetFreq = 55 + Math.min(180, speed * 25);
    const targetGain = Math.min(0.2, 0.04 + speed * 0.02);

    this.thrusterOsc.frequency.setTargetAtTime(targetFreq, now, 0.05);
    this.thrusterGain.gain.setTargetAtTime(targetGain, now, 0.05);
  }
}

export const yardSound = new YardSoundEngine();
