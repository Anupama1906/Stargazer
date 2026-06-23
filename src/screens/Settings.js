import { settings } from '../utils/settings.js';
import { Starfield } from '../utils/starfield.js';

export default class Settings {
  constructor(container, navigate) {
    this.container  = container;
    this.navigate   = navigate;
    this.raf        = null;
    this.t          = 0;
    this.starfield  = new Starfield();
    this.nodes      = [];
    this.hovered    = null;     // nodeIdx under mouse, or -1
    this.focusedIdx = 0;        // keyboard-focused node index (0-1)
    
    this._onResize  = this._resize.bind(this);
    this._onClick   = this._click.bind(this);
    this._onMove    = this._move.bind(this);
    this._onKey     = this._key.bind(this);
    this._init();
  }

  _init() {
    this.container.innerHTML = `
      <div class="screen" id="settings-screen">
        <span class="level-title">SETTINGS</span>
        <canvas id="settings-canvas" class="layer"></canvas>
      </div>`;

    this.canvas = document.getElementById('settings-canvas');
    this.ctx    = this.canvas.getContext('2d');

    this._resize();
    window.addEventListener('resize',  this._onResize);
    window.addEventListener('keydown', this._onKey);
    this.canvas.addEventListener('click',     this._onClick);
    this.canvas.addEventListener('mousemove', this._onMove);

    requestAnimationFrame(() =>
      document.getElementById('settings-screen').classList.add('active'));

    this._loop();
  }

  _resize() {
    const W  = this.canvas.width  = window.innerWidth;
    const H  = this.canvas.height = window.innerHeight;
    const cx = W / 2, cy = H / 2;
    this.orbitR = Math.min(W, H) * 0.265;

    this.nodes = [
      { id: 'sound', angle: Math.PI, title: 'SOUND', r: 35 },
      { id: 'theme', angle: 0, title: 'THEME', r: 35 }
    ].map(b => ({
      ...b,
      x: cx + this.orbitR * Math.cos(b.angle),
      y: cy + this.orbitR * Math.sin(b.angle)
    }));

    this.starfield.resize(W, H);
  }

  _hitNode(mx, my) {
    return this.nodes.findIndex(n => {
      const dx = mx - n.x, dy = my - n.y;
      return Math.sqrt(dx * dx + dy * dy) <= n.r + 15;
    });
  }

  _click(e) {
    const rc  = this.canvas.getBoundingClientRect();
    const idx = this._hitNode(e.clientX - rc.left, e.clientY - rc.top);
    if (idx !== -1) {
      this.focusedIdx = idx;
      this._activateNode(idx);
    } else if (e.clientX < 110 && e.clientY < 70) {
      this.navigate('main-menu');
    }
  }

  _move(e) {
    const rc  = this.canvas.getBoundingClientRect();
    const idx = this._hitNode(e.clientX - rc.left, e.clientY - rc.top);
    this.hovered = idx;
    this.canvas.style.cursor = (idx !== -1) ? 'pointer' : 'default';
  }

  _activateNode(idx) {
    if (idx === 0) {
      settings.toggleSound();
    } else if (idx === 1) {
      settings.cycleTheme();
    }
  }

  _key(e) {
    let next = this.focusedIdx;

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        next = (this.focusedIdx + 1) % this.nodes.length;
        break;

      case 'ArrowLeft':
        e.preventDefault();
        next = (this.focusedIdx - 1 + this.nodes.length) % this.nodes.length;
        break;

      case 'Enter':
      case ' ':
        e.preventDefault();
        this._activateNode(this.focusedIdx);
        break;

      case 'Escape':
        e.preventDefault();
        this.navigate('main-menu');
        break;

      default: return;
    }

    this.focusedIdx = next;
  }

  _draw() {
    const { ctx, canvas, t } = this;
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;
    const theme = settings.getTheme();

    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, W, H);

    this.starfield.draw(ctx, theme);

    const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.5);
    rg.addColorStop(0, theme.bgGradStart);
    rg.addColorStop(1, theme.bgGradEnd);
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);

    // Orbit ring
    ctx.beginPath();
    ctx.arc(cx, cy, this.orbitR, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${theme.primary}, 0.12)`;
    ctx.lineWidth   = 0.8;
    ctx.stroke();

    // Central Star
    this._drawStar(cx, cy, Math.min(W, H) * 0.08, t * 0.05, theme);

    // Nodes
    this.nodes.forEach((n, i) => this._drawNode(n, i, t, theme));

    // Back
    ctx.save();
    ctx.font = "300 10px 'Orbitron',monospace";
    ctx.fillStyle = `rgba(${theme.primary}, 0.38)`;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('← BACK', 28, 38);
    ctx.restore();

    // Selected Info (bottom text)
    const activeIdx = (this.hovered !== null && this.hovered !== -1) ? this.hovered : this.focusedIdx;
    const activeNode = this.nodes[activeIdx];
    let info = '';
    if (activeNode.id === 'sound') {
      info = settings.soundEnabled ? 'SOUND: ON' : 'SOUND: OFF';
    } else {
      info = `THEME: ${theme.name}`;
    }

    ctx.save();
    ctx.font      = "400 16px 'Orbitron',monospace";
    ctx.fillStyle = `rgba(${theme.primary}, 0.9)`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.letterSpacing = '3px';
    ctx.fillText(info.toUpperCase(), W / 2, H - 28);
    
    // Controls hint
    ctx.font = "300 9px 'Orbitron',monospace";
    ctx.fillStyle = `rgba(${theme.primary}, 0.22)`;
    ctx.letterSpacing = 'normal';
    ctx.fillText('← → NAVIGATE   ENTER TOGGLE   ESC BACK', W / 2, H - 12);
    ctx.restore();
  }

  _drawNode(b, idx, t, theme) {
    const ctx       = this.ctx;
    const isFocused = idx === this.focusedIdx;
    const isHov     = this.hovered === idx;
    const pulse     = 1 + 0.05 * Math.sin(t * 1.2 + idx);
    const r         = b.r * (isFocused ? 1.15 : 1) * pulse;

    // Outer glow
    ctx.save();
    ctx.shadowColor = isFocused ? 'rgba(255,255,255,0.7)' : (isHov ? `rgba(${theme.highlight}, 0.6)` : 'transparent');
    ctx.shadowBlur  = 20;
    
    // Orbit dot
    ctx.beginPath();
    ctx.arc(b.x, b.y, r + 6, 0, Math.PI * 2);
    ctx.strokeStyle = isFocused ? 'rgba(255,255,255,0.5)' : (isHov ? `rgba(${theme.highlight}, 0.4)` : `rgba(${theme.primary}, 0.08)`);
    ctx.lineWidth   = isFocused ? 1.5 : 1;
    ctx.stroke();
    ctx.restore();

    // Node body
    ctx.beginPath();
    ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
    ctx.fillStyle = isFocused ? 'rgba(255,255,255,0.9)' : (isHov ? `rgba(${theme.highlight}, 0.15)` : 'rgba(10,14,38,0.85)');
    ctx.fill();
    ctx.strokeStyle = isFocused ? 'rgba(255,255,255,0.9)' : (isHov ? `rgba(${theme.highlight}, 0.7)` : `rgba(${theme.primary}, 0.25)`);
    ctx.lineWidth = 1;
    ctx.stroke();

    // Icon — dark on focused (white bg), bright otherwise
    ctx.save();
    ctx.fillStyle    = isFocused ? 'rgba(8,12,31,0.9)' : (isHov ? `rgba(${theme.highlight}, 1)` : `rgba(${theme.primary}, 0.72)`);
    ctx.font         = `14px sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    const icon = b.id === 'sound' ? (settings.soundEnabled ? '🔊' : '🔇') : '✦';
    ctx.fillText(icon, b.x, b.y + 0.5);
    ctx.restore();
  }

  _drawStar(cx, cy, size, rot, theme) {
    const ctx = this.ctx, pts = 8;
    const pulse = 1 + 0.1 * Math.sin(rot * 15);
    
    ctx.save();
    
    // Outer high-tech dashed ring
    ctx.beginPath();
    ctx.arc(cx, cy, size * 1.3, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${theme.primary}, 0.15)`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 12]);
    ctx.lineDashOffset = -rot * 40;
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Glowing aura
    ctx.shadowColor = `rgba(${theme.highlight}, 0.6)`;
    ctx.shadowBlur  = 35 * pulse;
    
    // Star gradient
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.5, 'rgba(220, 240, 255, 0.9)');
    grad.addColorStop(1, 'rgba(150, 200, 255, 0.4)');
    
    ctx.beginPath();
    for (let i = 0; i < pts * 2; i++) {
      const a = rot + (i * Math.PI) / pts;
      const r = i % 2 === 0 ? size : size * 0.35;
      if (i === 0) ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
      else         ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
    }
    ctx.closePath();
    
    // Inner rotating octagon hole
    const hR = size * 0.25;
    const innerRot = -rot * 1.5;
    ctx.moveTo(cx + hR * Math.cos(innerRot), cy + hR * Math.sin(innerRot));
    for (let i = 1; i <= 8; i++) {
      const a = innerRot + (i / 8) * Math.PI * 2;
      ctx.lineTo(cx + hR * Math.cos(a), cy + hR * Math.sin(a));
    }
    ctx.closePath();
    
    ctx.fillStyle = grad;
    ctx.fill('evenodd');
    
    // Inner diamond core
    ctx.shadowBlur = 10 * pulse;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = rot * 2 + (i * Math.PI) / 2;
      const r = size * 0.15;
      if (i === 0) ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
      else         ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fill();

    ctx.restore();
  }

  _loop() {
    this.t += 0.016;
    this._draw();
    this.raf = requestAnimationFrame(() => this._loop());
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize',  this._onResize);
    window.removeEventListener('keydown', this._onKey);
    this.container.innerHTML = '';
  }
}
