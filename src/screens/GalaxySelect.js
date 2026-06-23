import { galaxies } from '../game/levels.js';
import { settings } from '../utils/settings.js';
import { Starfield } from '../utils/starfield.js';

export default class GalaxySelect {
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
      <div class="screen" id="gs-select-screen">
        <span class="level-title">SELECT GALAXY</span>
        <canvas id="gs-select-canvas" class="layer"></canvas>
      </div>`;

    this.canvas = document.getElementById('gs-select-canvas');
    this.ctx    = this.canvas.getContext('2d');

    this._resize();
    window.addEventListener('resize',  this._onResize);
    window.addEventListener('keydown', this._onKey);
    this.canvas.addEventListener('click',     this._onClick);
    this.canvas.addEventListener('mousemove', this._onMove);

    requestAnimationFrame(() =>
      document.getElementById('gs-select-screen').classList.add('active'));

    this._loop();
  }

  // ── layout ───────────────────────────────────────────────────────────

  _resize() {
    const W  = this.canvas.width  = window.innerWidth;
    const H  = this.canvas.height = window.innerHeight;
    const cx = W / 2, cy = H / 2;
    const spread = Math.min(W, H) * 0.35;

    this.nodes = galaxies.map((galaxy, i) => {
      // 0 = left, 1 = right
      const x = i === 0 ? cx - spread : cx + spread;
      return {
        galaxy, i,
        x: x,
        y: cy,
        r: 35,
      };
    });

    this.starfield.resize(W, H);
  }

  // ── interaction ──────────────────────────────────────────────────────

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
      const n = this.nodes[idx];
      this.navigate('level-select', { galaxyId: n.galaxy.id });
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
        const cur = this.nodes[this.focusedIdx];
        this.navigate('level-select', { galaxyId: cur.galaxy.id });
        break;

      case 'Escape':
        e.preventDefault();
        this.navigate('main-menu');
        break;

      default: return;
    }

    this.focusedIdx = next;
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

    const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.5);
    rg.addColorStop(0, theme.bgGradStart);
    rg.addColorStop(1, theme.bgGradEnd);
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);

    // Connecting line between galaxies
    ctx.beginPath();
    this.nodes.forEach((n, i) => {
      if (i === 0) ctx.moveTo(n.x, n.y);
      else ctx.lineTo(n.x, n.y);
    });
    ctx.strokeStyle = `rgba(${theme.primary}, 0.15)`;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Galaxy nodes
    this.nodes.forEach((n, i) => this._drawNode(n, i, t, theme));

    // Back
    ctx.save();
    ctx.font = "300 10px 'Orbitron',monospace";
    ctx.fillStyle = `rgba(${theme.primary}, 0.38)`;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('← BACK', 28, 38);
    ctx.restore();

    // Selected Galaxy Name (bottom text)
    const activeIdx = (this.hovered !== null && this.hovered !== -1) ? this.hovered : this.focusedIdx;
    const activeGalaxy = this.nodes[activeIdx]?.galaxy?.name || '';
    ctx.save();
    ctx.font      = "400 16px 'Orbitron',monospace";
    ctx.fillStyle = `rgba(${theme.primary}, 0.9)`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.letterSpacing = '3px';
    ctx.fillText(activeGalaxy.toUpperCase(), W / 2, H - 28);
    
    // Controls hint
    ctx.font = "300 9px 'Orbitron',monospace";
    ctx.fillStyle = `rgba(${theme.primary}, 0.22)`;
    ctx.letterSpacing = 'normal';
    ctx.fillText('← → NAVIGATE   ENTER SELECT   ESC BACK', W / 2, H - 12);
    ctx.restore();
  }

  _drawNode(node, idx, t, theme) {
    const ctx       = this.ctx;
    const isFocused = idx === this.focusedIdx;
    const isHov     = this.hovered === idx;
    const pulse     = 1 + 0.08 * Math.sin(t * 1.5 + idx * Math.PI);
    const r         = node.r * (isFocused ? 1.15 : 1) * pulse;

    // Orbits
    ctx.beginPath();
    ctx.arc(node.x, node.y, r * 1.6, 0, Math.PI * 2);
    ctx.arc(node.x, node.y, r * 2.3, 0, Math.PI * 2);
    ctx.strokeStyle = isFocused ? 'rgba(255,255,255,0.25)' : `rgba(${theme.primary}, 0.1)`;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Planets
    ctx.beginPath();
    const p1 = t * (0.8 + idx * 0.3);
    ctx.arc(node.x + r * 1.6 * Math.cos(p1), node.y + r * 1.6 * Math.sin(p1), 2.5, 0, Math.PI * 2);
    const p2 = t * (0.5 + idx * 0.2) + Math.PI;
    ctx.arc(node.x + r * 2.3 * Math.cos(p2), node.y + r * 2.3 * Math.sin(p2), 1.5, 0, Math.PI * 2);
    ctx.fillStyle = isFocused ? 'rgba(255,255,255,0.8)' : `rgba(${theme.primary}, 0.4)`;
    ctx.fill();

    // Glowing aura
    ctx.save();
    ctx.shadowColor = isFocused ? 'rgba(255,255,255,0.8)' : (isHov ? `rgba(${theme.highlight}, 0.8)` : `rgba(${theme.primary}, 0.4)`);
    ctx.shadowBlur  = isFocused ? 40 : 25;
    
    // Core star
    this._miniStar(node.x, node.y, r, t * (0.02 + idx * 0.01), isFocused, theme);
    
    ctx.restore();
  }

  _miniStar(cx, cy, size, rot, isFocused, theme) {
    const ctx = this.ctx, pts = 8;
    ctx.beginPath();
    for (let i = 0; i < pts * 2; i++) {
      const a = rot + (i * Math.PI) / pts;
      const r = i % 2 === 0 ? size : size * 0.4;
      if (i === 0) ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
      else         ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
    }
    ctx.closePath();
    ctx.fillStyle = isFocused ? 'rgba(255,255,255,0.95)' : `rgba(${theme.primary}, 0.8)`;
    ctx.fill();
    
    // Inner glow
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
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
