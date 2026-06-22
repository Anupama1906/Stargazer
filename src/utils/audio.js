// Tiny Web Audio API sound manager
let _ctx = null;
function ac() {
  if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
  return _ctx;
}

export function playMove() {
  try {
    const c = ac();
    const o = c.createOscillator();
    const g = c.createGain();
    o.connect(g); g.connect(c.destination);
    o.type = 'sine';
    o.frequency.setValueAtTime(900, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(600, c.currentTime + 0.12);
    g.gain.setValueAtTime(0.07, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.18);
    o.start(); o.stop(c.currentTime + 0.18);
  } catch {}
}

export function playInvalid() {
  try {
    const c = ac();
    const o = c.createOscillator();
    const g = c.createGain();
    o.connect(g); g.connect(c.destination);
    o.type = 'square';
    o.frequency.value = 110;
    g.gain.setValueAtTime(0.04, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.1);
    o.start(); o.stop(c.currentTime + 0.1);
  } catch {}
}

export function playWin() {
  try {
    const c = ac();
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.connect(g); g.connect(c.destination);
      o.type = 'sine';
      o.frequency.value = freq;
      const t = c.currentTime + i * 0.13;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.07, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      o.start(t); o.stop(t + 0.5);
    });
  } catch {}
}
