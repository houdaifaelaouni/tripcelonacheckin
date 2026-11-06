// Short beeps so the driver doesn't have to look at the screen.
let ctx: AudioContext | null = null;

function beep(freqs: number[], duration = 0.12) {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    let t = ctx.currentTime;
    for (const f of freqs) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + duration);
      t += duration;
    }
  } catch {
    /* audio not available */
  }
}

export const sounds = {
  ok: () => beep([660, 990]),
  warn: () => beep([520, 520], 0.15),
  error: () => beep([220], 0.4),
};
