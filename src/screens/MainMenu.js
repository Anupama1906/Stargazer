export default class MainMenu {
  constructor(container, navigate) {
    this.container  = container;
    this.navigate   = navigate;
    this.raf        = null;
    this.t          = 0;
    this.stars      = [];
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
      { id:'play',     angle: -Math.PI / 2, icon:'▶', action: () => this.navigate('level-select') },
      { id:'help',     angle:  0,           icon:'?', action: () => this._help() },
      { id:'quit',     angle:  Math.PI / 2, icon:'✕', action: () => window.close() },
      { id:'settings', angle:  Math.PI,     icon:'✦', action: () => {} },
    ].map(b => ({
      ...b,
      x: cx + this.orbitR * Math.cos(b.angle),
      y: cy + this.orbitR * Math.sin(b.angle),
      r: 21,
    }));

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

    ctx.fillStyle = '#080c1f';
    ctx.fillRect(0, 0, W, H);

    this.stars.forEach(s => {
      s.ph += s.spd;
      const o = s.o * (0.5 + 0.5 * Math.sin(s.ph));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,220,255,${o})`;
      ctx.fill();
    });

    const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, this.orbitR * 1.5);
    rg.addColorStop(0, 'rgba(18,26,80,0.28)');
    rg.addColorStop(1, 'rgba(8,12,31,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);

    // Orbit ring
    ctx.beginPath();
    ctx.arc(cx, cy, this.orbitR, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(200,220,255,0.22)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // 8-pointed star logo
    this._drawStar(cx, cy, Math.min(W, H) * 0.135, t * 0.04);

    // Buttons
    this.buttons.forEach((b, i) => this._drawBtn(b, i, t));

    // Help panel
    if (this._showingHelp) this._drawHelp(cx, cy, W, H);

    // Keyboard hint
    this._drawKeyHint(W, H);

    // Update bottom label text
    const labelEl = document.querySelector('.menu-play-label');
    if (labelEl) {
      if (this.hovered) {
        labelEl.textContent = this.hovered.toUpperCase();
      } else {
        labelEl.textContent = this.buttons[this.focusedIdx].id.toUpperCase();
      }
    }
  }

  _drawStar(cx, cy, size, rot) {
    const ctx = this.ctx, pts = 8;
    ctx.save();
    ctx.shadowColor = 'rgba(255,255,255,0.12)';
    ctx.shadowBlur  = 28;
    ctx.beginPath();
    for (let i = 0; i < pts * 2; i++) {
      const a = rot + (i * Math.PI) / pts;
      const r = i % 2 === 0 ? size : size * 0.41;
      if (i === 0) ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
      else         ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
    }
    ctx.closePath();
    // Octagon hole
    const hR = size * 0.285;
    ctx.moveTo(cx + hR, cy);
    for (let i = 1; i <= 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.lineTo(cx + hR * Math.cos(a), cy + hR * Math.sin(a));
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.94)';
    ctx.fill('evenodd');
    ctx.restore();
  }

  _drawBtn(btn, idx, t) {
    const ctx       = this.ctx;
    const isFocused = idx === this.focusedIdx;
    const isHov     = this.hovered === btn.id;
    const pulse     = 1 + 0.042 * Math.sin(t * 1.4 + btn.angle);
    const r         = btn.r * (isFocused ? 1.08 : 1) * pulse;

    // Glow ring for focused/hovered
    if (isFocused) {
      ctx.save();
      ctx.shadowColor = 'rgba(255,255,255,0.6)';
      ctx.shadowBlur  = 22;
      ctx.beginPath();
      ctx.arc(btn.x, btn.y, r + 4, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth   = 1.2;
      ctx.stroke();
      ctx.restore();
    } else if (isHov) {
      ctx.save();
      ctx.shadowColor = 'rgba(79,195,247,0.55)';
      ctx.shadowBlur  = 20;
      ctx.beginPath();
      ctx.arc(btn.x, btn.y, r + 3, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(79,195,247,0.5)';
      ctx.lineWidth   = 1;
      ctx.stroke();
      ctx.restore();
    }

    // Circle fill — white for focused, dark for normal
    ctx.beginPath();
    ctx.arc(btn.x, btn.y, r, 0, Math.PI * 2);
    ctx.fillStyle = isFocused
      ? 'rgba(255,255,255,0.95)'
      : (isHov ? 'rgba(79,195,247,0.1)' : 'rgba(10,15,42,0.88)');
    ctx.fill();
    ctx.strokeStyle = isFocused
      ? 'rgba(255,255,255,0.9)'
      : (isHov ? 'rgba(79,195,247,0.55)' : 'rgba(200,220,255,0.28)');
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Icon — dark on focused (white bg), bright otherwise
    ctx.save();
    ctx.fillStyle    = isFocused ? 'rgba(8,12,31,0.9)' : (isHov ? '#4fc3f7' : 'rgba(200,220,255,0.72)');
    ctx.font         = `${btn.id === 'help' ? '14px' : '11px'} 'Exo 2', sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(btn.icon, btn.x, btn.y + 0.5);
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
