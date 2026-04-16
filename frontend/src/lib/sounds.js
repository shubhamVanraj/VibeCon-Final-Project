let audioCtx = null;
let soundEnabled = localStorage.getItem('rinkosh_sounds') === 'true';

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone(freq, duration, vol = 0.04, type = 'sine') {
  if (!soundEnabled) return;
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {}
}

export const sounds = {
  click: () => playTone(800, 0.06, 0.03),
  toggle: () => { playTone(500, 0.04, 0.025); setTimeout(() => playTone(700, 0.06, 0.025), 50); },
  success: () => { playTone(523, 0.08, 0.03); setTimeout(() => playTone(659, 0.08, 0.03), 80); setTimeout(() => playTone(784, 0.12, 0.03), 160); },
  error: () => { playTone(300, 0.15, 0.03, 'square'); },
  hover: () => playTone(1200, 0.03, 0.015),
  tab: () => playTone(600, 0.05, 0.02),
};

export function isSoundEnabled() { return soundEnabled; }
export function setSoundEnabled(v) {
  soundEnabled = v;
  localStorage.setItem('rinkosh_sounds', v ? 'true' : 'false');
}
