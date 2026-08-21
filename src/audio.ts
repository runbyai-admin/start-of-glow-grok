/**
 * Tiny Web Audio bed. Synthesized here - no files, no stock libraries.
 * Starts on the first pointer/key because browsers gate AudioContext.
 * Failures are silent: judging should never hear a broken speaker.
 */

export class GlowAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private started = false;
  private droneGain: GainNode | null = null;

  unlock = (): void => {
    if (this.started) return;
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      if (this.ctx.state === "suspended") void this.ctx.resume();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.22;
      this.master.connect(this.ctx.destination);
      this.startDrone();
      this.started = true;
    } catch {
      this.ctx = null;
    }
  };

  collect(index: number): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const freq = 392 * Math.pow(1.05946, Math.min(index, 12));
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, t + 0.18);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + 0.6);
  }

  pulse(): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.28);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.12, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + 0.4);
  }

  /** The dark is drinking the glow. */
  drain(): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.exponentialRampToValueAtTime(48, t + 0.4);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.08, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + 0.55);
  }

  fail(): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.7);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.14, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + 0.9);
  }

  gate(): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(330, t);
    osc.frequency.exponentialRampToValueAtTime(495, t + 0.35);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.12, t + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + 0.75);
  }

  ending(): void {
    if (!this.ctx || !this.master || !this.droneGain) return;
    const t = this.ctx.currentTime;
    this.droneGain.gain.cancelScheduledValues(t);
    this.droneGain.gain.setValueAtTime(Math.max(this.droneGain.gain.value, 0.0001), t);
    this.droneGain.gain.exponentialRampToValueAtTime(0.16, t + 2.8);
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(392, t);
    osc.frequency.exponentialRampToValueAtTime(523.25, t + 2.2);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.1, t + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 3.4);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + 3.5);
  }

  private startDrone(): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.setValueAtTime(0.0001, t);
    this.droneGain.gain.exponentialRampToValueAtTime(0.09, t + 2.4);
    this.droneGain.connect(this.master);

    for (const freq of [55, 82.4, 164.8]) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = freq < 80 ? "sine" : "triangle";
      osc.frequency.value = freq;
      osc.detune.value = freq === 82.4 ? -7 : 4;
      g.gain.value = freq === 164.8 ? 0.22 : 0.5;
      osc.connect(g);
      g.connect(this.droneGain);
      osc.start();
    }
  }
}
