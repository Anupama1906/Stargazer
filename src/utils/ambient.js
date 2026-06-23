import { settings } from './settings.js';

let ctx = null;
let masterGain = null;
let isPlaying = false;
let oscillators = [];
let filterLoopId = null;

function initAudio() {
  if (ctx) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  ctx = new AudioContext();
  masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);
  masterGain.gain.value = 0.2;
}

export function startAmbient() {
  if (!settings.soundEnabled || isPlaying) return;
  
  initAudio();
  if (ctx.state === 'suspended') ctx.resume();
  
  isPlaying = true;
  
  // Ambient chords: A minor, E minor
  const baseFreqs = [110, 164.81, 220, 329.63]; 
  
  // Reverb approximation via delays
  const delay1 = ctx.createDelay(); delay1.delayTime.value = 0.6;
  const delay2 = ctx.createDelay(); delay2.delayTime.value = 0.8;
  const fb1 = ctx.createGain(); fb1.gain.value = 0.4;
  const fb2 = ctx.createGain(); fb2.gain.value = 0.4;
  
  delay1.connect(fb1); fb1.connect(delay1);
  delay2.connect(fb2); fb2.connect(delay2);
  delay1.connect(masterGain);
  delay2.connect(masterGain);
  
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 300;
  filter.Q.value = 1;
  filter.connect(masterGain);
  filter.connect(delay1);
  filter.connect(delay2);

  // Sweep the filter slowly
  let t = 0;
  const sweep = () => {
    if (!isPlaying) return;
    t += 0.05;
    const freq = 300 + Math.sin(t) * 150;
    if (ctx && filter) filter.frequency.setTargetAtTime(freq, ctx.currentTime, 0.1);
    filterLoopId = setTimeout(sweep, 50);
  };
  sweep();

  baseFreqs.forEach(freq => {
    // Two oscillators per frequency, slightly detuned
    [0.995, 1.005].forEach(detune => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq * detune;
      
      const gain = ctx.createGain();
      gain.gain.value = 0; // fade in slowly
      gain.gain.linearRampToValueAtTime(0.4 / (baseFreqs.length * 2), ctx.currentTime + 4);
      
      osc.connect(gain);
      gain.connect(filter);
      
      osc.start();
      oscillators.push({ osc, gain });
    });
  });
}

export function stopAmbient() {
  if (!isPlaying) return;
  isPlaying = false;
  clearTimeout(filterLoopId);
  
  oscillators.forEach(({ osc, gain }) => {
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 2);
    setTimeout(() => {
      try { osc.stop(); osc.disconnect(); } catch {}
    }, 2500);
  });
  oscillators = [];
}

export function updateAmbientSettings() {
  if (settings.soundEnabled && !isPlaying) {
    startAmbient();
  } else if (!settings.soundEnabled && isPlaying) {
    stopAmbient();
  }
}
