import { levels } from '../game/levels.js';
import { settings } from '../utils/settings.js';

// Inner orbit: levels 1-5 (nodeIdx 0-4)
// Outer orbit: levels 6-10 (nodeIdx 5-9)
// Each orbit has 5 positions arranged at equal angles, starting from top.

export default class LevelSelect {
  constructor(container, navigate, data = {}) {
    this.container  = container;
    this.navigate   = navigate;
    this.galaxyId   = data.galaxyId || 1;
    this.galaxyLevels = levels.filter(l => l.galaxyId === this.galaxyId);
    this.raf        = null;
    this.t          = 0;
    this.stars      = [];
    this.nodes      = [];
    this.hovered    = null;     // nodeIdx under mouse, or -1
    this.focusedIdx = 0;        // keyboard-focused node index (0-9)
    this.innerR     = 0;
    this.outerR     = 0;
    this.progress   = this._loadProgress();
    this._onResize  = this._resize.bind(this);
    this._onClick   = this._click.bind(this);
    this._onMove    = this._move.bind(this);
    this._onKey     = this._key.bind(this);
    this._init();
  }

  _loadProgress() {
    try { return JSON.parse(localStorage.getItem('sg-progress') || '{}'); }
    catch { return {}; }
  }

  _init() {
    this.container.innerHTML = `
      <div class="screen" id="ls-screen">
        <span class="level-title">SELECT LEVEL</span>
        <canvas id="ls-canvas" class="layer"></canvas>
      </div>`;

    this.canvas = document.getElementById('ls-canvas');
    this.ctx    = this.canvas.getContext('2d');

    this._resize();
    window.addEventListener('resize',  this._onResize);
    window.addEventListener('keydown', this._onKey);
    this.canvas.addEventListener('click',     this._onClick);
    this.canvas.addEventListener('mousemove', this._onMove);

    requestAnimationFrame(() =>
      document.getElementById('ls-screen').classList.add('active'));

    this._loop();
  }

  // ── layout ───────────────────────────────────────────────────────────

  _resize() {
    const W  = this.canvas.width  = window.innerWidth;
    const H  = this.canvas.height = window.innerHeight;
    const cx = W / 2, cy = H / 2;
    const md = Math.min(W, H);
    this.innerR = md * 0.19;
    this.outerR = md * 0.36;

    this.nodes = this.galaxyLevels.map((lvl, i) => {
      const onInner = i < 5;
      const posIdx  = i % 5;            // 0-4 within its orbit
      const r       = onInner ? this.innerR : this.outerR;
      const angle   = (posIdx / 5) * Math.PI * 2 - Math.PI / 2;
      const prog    = this.progress[lvl.id] || { stars: 0 };
      
      // Determine if unlocked: it's unlocked if it's the first level of the game (id 1) 
      // or if the previous level has > 0 stars. For galaxy 2, level 11 is unlocked if level 10 has stars?
      // Or just if it's the first level of the galaxy (i===0) or previous level has stars.
      const unlocked = i === 0 || (this.progress[this.galaxyLevels[i - 1].id]?.stars > 0);
      
      return {
        lvl, i,
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
        r: 23, angle, posIdx,
        onInner, stars: prog.stars, unlocked,
      };
    });

    this._genStars(W, H);
  }

  _genStars(W, H) {
    this.stars = Array.from({ length: 250 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.2 + 0.2,
      o: Math.random() * 0.7 + 0.1,
      ph: Math.random() * Math.PI * 2,
      spd: Math.random() * 0.03 + 0.005,
    }));
  }

  // ── interaction ──────────────────────────────────────────────────────

  _hitNode(mx, my) {
    return this.nodes.findIndex(n => {
      const dx = mx - n.x, dy = my - n.y;
      return Math.sqrt(dx * dx + dy * dy) <= n.r + 5;
    });
  }

  _click(e) {
    const rc  = this.canvas.getBoundingClientRect();
    const idx = this._hitNode(e.clientX - rc.left, e.clientY - rc.top);
    if (idx !== -1) {
      this.focusedIdx = idx;
      const n = this.nodes[idx];
      if (n.unlocked) this.navigate('game', { levelId: n.lvl.id });
    } else if (e.clientX < 110 && e.clientY < 70) {
      this.navigate('galaxy-select');
    }
  }

  _move(e) {
    const rc  = this.canvas.getBoundingClientRect();
    const idx = this._hitNode(e.clientX - rc.left, e.clientY - rc.top);
    this.hovered = idx;
    const n = idx !== -1 ? this.nodes[idx] : null;
    this.canvas.style.cursor = (n && n.unlocked) ? 'pointer' : 'default';
  }

  _key(e) {
    const cur = this.nodes[this.focusedIdx];
    let next  = this.focusedIdx;

    switch (e.key) {
      case 'ArrowRight':
        // Clockwise within same orbit
        e.preventDefault();
        if (cur.onInner) next = (cur.posIdx + 1) % 5;
        else             next = 5 + (cur.posIdx + 1) % 5;
        break;

      case 'ArrowLeft':
        // Counter-clockwise within same orbit
        e.preventDefault();
        if (cur.onInner) next = (cur.posIdx - 1 + 5) % 5;
        else             next = 5 + (cur.posIdx - 1 + 5) % 5;
        break;

      case 'ArrowUp':
        // Jump to outer orbit (same position index)
        e.preventDefault();
        if (cur.onInner) next = 5 + cur.posIdx;  // inner → outer
        // already outer: no change
        break;

      case 'ArrowDown':
        // Jump to inner orbit (same position index)
        e.preventDefault();
        if (!cur.onInner) next = cur.posIdx;      // outer → inner
        // already inner: no change
        break;

      case 'Enter':
      case ' ':
        e.preventDefault();
        if (cur.unlocked) this.navigate('game', { levelId: cur.lvl.id });
        break;

      case 'Escape':
        e.preventDefault();
        this.navigate('galaxy-select');
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

    this.stars.forEach(s => {
      s.ph += s.spd;
      const o = s.o * (0.5 + 0.5 * Math.sin(s.ph));
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = theme.starBase + o + ')'; ctx.fill();
    });

    const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, this.outerR * 1.4);
    rg.addColorStop(0, theme.bgGradStart);
    rg.addColorStop(1, theme.bgGradEnd);
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);

    // Orbit rings and spokes
    ctx.strokeStyle = `rgba(${theme.primary}, 0.12)`;
    ctx.lineWidth   = 0.8;
    [this.innerR, this.outerR].forEach(r => {
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    });
    
    // Spokes
    for (let s = 0; s < 5; s++) {
      const angle = (s / 5) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx + this.innerR * Math.cos(angle), cy + this.innerR * Math.sin(angle));
      ctx.lineTo(cx + this.outerR * Math.cos(angle), cy + this.outerR * Math.sin(angle));
      ctx.stroke();
    }

    // Connecting lines between levels
    ctx.beginPath();
    this.nodes.forEach((n, i) => {
      if (i === 0) ctx.moveTo(n.x, n.y);
      else ctx.lineTo(n.x, n.y);
    });
    ctx.strokeStyle = `rgba(${theme.primary}, 0.2)`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Nucleus
    this._miniStar(cx, cy, Math.min(W, H) * 0.052, t * 0.03, theme);

    // Level nodes
    this.nodes.forEach((n, i) => this._drawNode(n, i, t, theme));

    // Back
    ctx.save();
    ctx.font = "300 10px 'Orbitron',monospace";
    ctx.fillStyle = `rgba(${theme.primary}, 0.38)`;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('← BACK', 28, 38);
    ctx.restore();

    // Selected Level Name (bottom text)
    const activeIdx = (this.hovered !== null && this.hovered !== -1) ? this.hovered : this.focusedIdx;
    const activeLevel = this.nodes[activeIdx]?.lvl?.name || '';
    ctx.save();
    ctx.font      = "400 14px 'Orbitron',monospace";
    ctx.fillStyle = `rgba(${theme.primary}, 0.8)`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.letterSpacing = '2px';
    ctx.fillText(activeLevel.toUpperCase(), W / 2, H - 24);
    
    // Controls hint
    ctx.font = "300 9px 'Orbitron',monospace";
    ctx.fillStyle = `rgba(${theme.primary}, 0.22)`;
    ctx.letterSpacing = 'normal';
    ctx.fillText('ENTER SELECT   ESC BACK', W / 2, H - 10);
    ctx.restore();
  }

  _miniStar(cx, cy, size, rot, theme) {
    const ctx = this.ctx, pts = 8;
    ctx.save();
    ctx.shadowColor = `rgba(${theme.primary}, 0.1)`; ctx.shadowBlur = 18;
    ctx.beginPath();
    for (let i = 0; i < pts * 2; i++) {
      const a = rot + (i * Math.PI) / pts;
      const r = i % 2 === 0 ? size : size * 0.4;
      if (i === 0) ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
      else         ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fill();
    ctx.restore();
  }

  _drawNode(node, idx, t, theme) {
    const ctx       = this.ctx;
    const isFocused = idx === this.focusedIdx;
    const isHov     = this.hovered === idx;
    const pulse     = 1 + 0.045 * Math.sin(t * 1.3 + node.angle);
    const r         = node.r * (isFocused ? 1.1 : 1) * pulse;

    if (!node.unlocked) {
      ctx.beginPath(); ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
      ctx.fillStyle   = 'rgba(10,14,38,0.7)'; ctx.fill();
      ctx.strokeStyle = `rgba(${theme.primary}, 0.08)`; ctx.lineWidth = 0.7; ctx.stroke();
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = `rgba(${theme.primary}, 0.18)`;
      ctx.fillText('⬤', node.x, node.y);
      return;
    }

    // Focused: white ring + glow
    if (isFocused) {
      ctx.save();
      ctx.shadowColor = 'rgba(255,255,255,0.65)';
      ctx.shadowBlur  = 22;
      ctx.beginPath(); ctx.arc(node.x, node.y, r + 4, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth   = 1.2; ctx.stroke();
      ctx.restore();
    } else if (isHov) {
      ctx.save();
      ctx.shadowColor = `rgba(${theme.highlight}, 0.55)`; ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.arc(node.x, node.y, r + 4, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${theme.highlight}, 0.45)`; ctx.lineWidth = 1; ctx.stroke();
      ctx.restore();
    }

    // Main circle
    ctx.beginPath(); ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
    const hasStars = node.stars > 0;
    ctx.fillStyle = isFocused
      ? 'rgba(255,255,255,0.92)'
      : (hasStars ? 'rgba(255,209,102,0.1)' : (isHov ? `rgba(${theme.highlight}, 0.1)` : 'rgba(10,14,38,0.85)'));
    ctx.fill();
    ctx.strokeStyle = isFocused
      ? 'rgba(255,255,255,0.85)'
      : (hasStars ? `rgba(255,209,102,${isHov ? 0.6 : 0.35})` : (isHov ? `rgba(${theme.highlight}, 0.6)` : `rgba(${theme.primary}, 0.24)`));
    ctx.lineWidth = 0.8; ctx.stroke();

    // Level number
    ctx.save();
    ctx.font         = "700 11px 'Orbitron',monospace";
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = isFocused
      ? 'rgba(8,12,31,0.9)'
      : (hasStars ? '#ffd166' : (isHov ? `rgb(${theme.highlight})` : `rgba(${theme.primary}, 0.8)`));
    // Display 1-10 regardless of actual level ID
    ctx.fillText((idx % 10 + 1).toString(), node.x, hasStars ? node.y - 5 : node.y);
    ctx.restore();

    // Star dots
    if (hasStars) {
      const dotR = 2.2, span = 2 * 8, sx = node.x - span / 2;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.arc(sx + i * 8, node.y + 8, dotR, 0, Math.PI * 2);
        ctx.fillStyle = isFocused
          ? (i < node.stars ? 'rgba(8,12,31,0.8)' : 'rgba(8,12,31,0.25)')
          : (i < node.stars ? 'rgba(255,209,102,0.85)' : 'rgba(255,209,102,0.18)');
        ctx.fill();
      }
    }
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
