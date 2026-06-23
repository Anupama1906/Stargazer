import { settings } from '../utils/settings.js';
import { Starfield } from '../utils/starfield.js';

export default class MainMenu {
  constructor(container, navigate) {
    this.container  = container;
    this.navigate   = navigate;
    this.raf        = null;
    this.t          = 0;
    this.starfield  = new Starfield();
    this.buttons    = [];
    this.hovered    = null;   // button id under mouse
    this.focusedIdx = 0;      // keyboard-focused button index (clockwise from top)
    this.orbitR     = 0;
    this._showingHelp = false;
    this._onResize  = this._resize.bind(this);
    this._onClick   = this._click.bind(this);
    this._onMove    = this._move.bind(this);
    this._onKey     = this._key.bind(this);
    this._init();
  }

  _init() {
    this.container.innerHTML = `
      <div class="screen" id="mm-screen">
        <span class="menu-title">STARGAZER</span>
        <canvas id="mm-canvas" class="layer"></canvas>
        <span class="menu-play-label">PLAY</span>
      </div>`;

    this.canvas = document.getElementById('mm-canvas');
    this.ctx    = this.canvas.getContext('2d');

    this._resize();
    window.addEventListener('resize',   this._onResize);
    window.addEventListener('keydown',  this._onKey);
    this.canvas.addEventListener('click',     this._onClick);
    this.canvas.addEventListener('mousemove', this._onMove);

    requestAnimationFrame(() =>
      document.getElementById('mm-screen').classList.add('active'));

    this._loop();
  }

  // ── layout ───────────────────────────────────────────────────────────
  // Buttons ordered CLOCKWISE starting from top (so ← = ccw, → = cw)
  // 0=Play(top)  1=Help(right)  2=Quit(bottom)  3=Settings(left)

  _resize() {
    const W = this.canvas.width  = window.innerWidth;
    const H = this.canvas.height = window.innerHeight;
    const cx = W / 2, cy = H / 2;
    this.orbitR = Math.min(W, H) * 0.265;

    this.buttons = [
      { id:'play',     angle: -Math.PI / 2, icon:'▶', action: () => this.navigate('galaxy-select') },
      { id:'help',     angle:  0,           icon:'?', action: () => this._help() },
      { id:'quit',     angle:  Math.PI / 2, icon:'✕', action: () => window.close() },
      { id:'settings', angle:  Math.PI,     icon:'✦', action: () => this.navigate('settings') },
    ].map(b => ({
      ...b,
      x: cx + this.orbitR * Math.cos(b.angle),
      y: cy + this.orbitR * Math.sin(b.angle),
      r: 21,
    }));

    this.starfield.resize(W, H);
  }

  // ── interaction ──────────────────────────────────────────────────────

  _hitBtn(mx, my) {
    return this.buttons.findIndex(b => {
      const dx = mx - b.x, dy = my - b.y;
      return Math.sqrt(dx * dx + dy * dy) <= b.r + 6;
    });
  }

  _click(e) {
    const rc  = this.canvas.getBoundingClientRect();
    const idx = this._hitBtn(e.clientX - rc.left, e.clientY - rc.top);
    if (idx !== -1) { this.focusedIdx = idx; this.buttons[idx].action(); }
  }

  _move(e) {
    const rc  = this.canvas.getBoundingClientRect();
    const idx = this._hitBtn(e.clientX - rc.left, e.clientY - rc.top);
    this.hovered = idx !== -1 ? this.buttons[idx].id : null;
    this.canvas.style.cursor = idx !== -1 ? 'pointer' : 'default';
  }

  _key(e) {
    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        this.focusedIdx = (this.focusedIdx + 1) % 4;
        break;
      case 'ArrowLeft':
        e.preventDefault();
        this.focusedIdx = (this.focusedIdx - 1 + 4) % 4;
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        this.buttons[this.focusedIdx].action();
        break;
    }
  }

  _help() {
    this._showingHelp = !this._showingHelp;
  }

  // ── drawing ──────────────────────────────────────────────────────────

  _draw() {
    const { ctx, canvas, t } = this;
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;
    const theme = settings.getTheme();

    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, W, H);

    this.starfield.draw(ctx, theme);

    const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W, H) * 0.45);
    rg.addColorStop(0, theme.bgGradStart);
    rg.addColorStop(1, theme.bgGradEnd);
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);

    // Orbit ring
    ctx.beginPath();
    ctx.arc(cx, cy, this.orbitR, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${theme.primary}, 0.12)`;
    ctx.lineWidth   = 0.8;
    ctx.stroke();

    // Central Star
    this._drawStar(cx, cy, Math.min(W, H) * 0.08, t * 0.05, theme);

    // Nodes
    this.buttons.forEach((b, i) => this._drawNode(b, i, t, theme));

    // Help panel
    if (this._showingHelp) this._drawHelp(cx, cy, W, H);

    // Keyboard hint
    this._drawKeyHint(W, H);

    // Update bottom label text
    const labelEl = document.querySelector('.menu-play-label');
    if (labelEl) {
      if (this.hovered !== null) {
        labelEl.textContent = this.buttons[this.hovered].id.toUpperCase();
      } else {
        labelEl.textContent = this.buttons[this.focusedIdx].id.toUpperCase();
      }
    }
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
    ctx.font         = `${b.id === 'help' ? '14px' : '11px'} 'Exo 2', sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(b.icon, b.x, b.y + 0.5);
    ctx.restore();
  }

  _drawHelp(cx, cy, W, H) {
    const ctx = this.ctx;
    const pw = Math.min(W * 0.85, 360), ph = 200;
    const px = cx - pw / 2, py = cy + this.orbitR * 0.55;
    ctx.save();
    ctx.fillStyle   = 'rgba(8,12,31,0.94)';
    ctx.strokeStyle = 'rgba(200,220,255,0.14)';
    ctx.lineWidth   = 1;
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeRect(px, py, pw, ph);
    const lines = [
      'HOW TO PLAY',
      '',
      'Move the glowing electron to the amber goal cell.',
      'Click adjacent highlighted cells to move.',
      '← → moves along orbit  ·  ↑ ↓ jumps between rings',
      'Reach the goal in the fewest moves for max stars.',
    ];
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    lines.forEach((line, i) => {
      ctx.font      = i === 0 ? "600 11px 'Orbitron',monospace" : "300 12px 'Exo 2',sans-serif";
      ctx.fillStyle = i === 0 ? '#c8ba8a' : 'rgba(200,216,240,0.65)';
      ctx.fillText(line, cx, py + 22 + i * 24);
    });
    ctx.restore();
  }

  _drawKeyHint(W, H) {
    const ctx = this.ctx;
    ctx.save();
    ctx.font         = "300 9px 'Orbitron', monospace";
    ctx.fillStyle    = 'rgba(200,216,240,0.22)';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('← → NAVIGATE   ENTER SELECT', W / 2, H - 18);
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
