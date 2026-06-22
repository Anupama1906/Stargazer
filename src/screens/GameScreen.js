import { levels }       from '../game/levels.js';
import { CircularGrid } from '../game/CircularGrid.js';
import { Renderer }     from '../game/Renderer.js';
import { playMove, playWin, playInvalid } from '../utils/audio.js';

const ANIM_MS = 200; // movement animation duration

export default class GameScreen {
  constructor(container, navigate, data) {
    this.container = container;
    this.navigate  = navigate;
    this.levelId   = data.levelId || 1;
    this.lvl       = levels.find(l => l.id === this.levelId);

    // Game state
    this.grid     = new CircularGrid(this.lvl.rings, this.lvl.sectors, this.lvl.blocked || []);
    this.pPos     = [...this.lvl.playerStart];
    
    this.mode     = 'navigate'; // 'navigate' | 'draw'
    this.activePair = -1;
    this.paths    = this.lvl.pairs.map(() => []);
    this.connections = this.lvl.pairs.map(() => false);
    
    this.won      = false;

    // Animation
    this.anim     = null; // { from, to, start, progress }

    // Canvas/render
    this.raf      = null;
    this.time     = 0;
    this.stars    = [];
    this.ctx      = null;
    this.renderer = null;

    // Bound handlers
    this._onResize = this._resize.bind(this);
    this._onKey    = this._key.bind(this);

    this._init();
  }

  // ── init ─────────────────────────────────────────────────────────────

  _init() {
    const nextLevel = levels.find(l => l.galaxyId === this.lvl.galaxyId && l.id > this.lvl.id);
    const hasNext = !!nextLevel;

    this.container.innerHTML = `
      <div class="screen" id="gs-screen">
        <!-- HUD -->
        <div class="game-hud">
          <button class="hud-back" id="gs-back">← BACK</button>
          <div class="hud-center">
            <div class="hud-level-name">${this.lvl.name}</div>
            <div class="hud-level-num">LEVEL ${(this.lvl.id - 1) % 10 + 1} / 10</div>
          </div>
          <div class="hud-moves">
            <div class="hud-moves-label" id="gs-status">NAVIGATE</div>
          </div>
        </div>

        <!-- Canvas -->
        <canvas id="gs-canvas" class="layer"></canvas>

        <!-- Tooltip -->
        <div class="game-tip" id="gs-tip">← → orbit &nbsp;·&nbsp; ↑ outer ring &nbsp;·&nbsp; ↓ inner ring &nbsp;·&nbsp; ENTER select/connect &nbsp;·&nbsp; ESC cancel/back</div>

        <!-- Win overlay -->
        <div class="win-overlay" id="gs-win">
          <div class="win-modal">
            <div class="win-title">SOLVED</div>
            <div class="win-btns">
              <button class="win-btn" id="ws-retry">RETRY</button>
              ${hasNext ? '<button class="win-btn primary" id="ws-next">NEXT</button>' : ''}
              <button class="win-btn" id="ws-levels">LEVELS</button>
            </div>
          </div>
        </div>
      </div>`;

    this.canvas = document.getElementById('gs-canvas');
    this.ctx    = this.canvas.getContext('2d');

    this._resize();
    window.addEventListener('resize',  this._onResize);
    window.addEventListener('keydown', this._onKey);

    document.getElementById('gs-back').addEventListener('click', () => this.navigate('level-select', { galaxyId: this.lvl.galaxyId }));
    document.getElementById('ws-retry').addEventListener('click', () => this.navigate('game', { levelId: this.levelId }));
    document.getElementById('ws-levels').addEventListener('click', () => this.navigate('level-select', { galaxyId: this.lvl.galaxyId }));
    if (hasNext) {
      document.getElementById('ws-next').addEventListener('click', () => this.navigate('game', { levelId: nextLevel.id }));
    }

    this._genStars();

    requestAnimationFrame(() =>
      document.getElementById('gs-screen').classList.add('active'));

    this._loop();
  }

  // ── resize / renderer ─────────────────────────────────────────────────

  _resize() {
    const W = this.canvas.width  = window.innerWidth;
    const H = this.canvas.height = window.innerHeight;

    const hudH      = Math.min(H * 0.14, 90);
    const avail     = Math.min(W, H - hudH) * 0.6; // Reduced from 0.84 to make grid smaller
    const ringWidth = avail / (this.lvl.rings * 2);
    const baseRadius = ringWidth * 1.5;

    this.renderer = new Renderer(this.canvas, {
      baseRadius,
      ringWidth,
    });

    this._genStars();
  }

  _genStars() {
    const W = this.canvas.width, H = this.canvas.height;
    this.stars = Array.from({ length: 250 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.2 + 0.2,
      o: Math.random() * 0.7 + 0.1,
      ph: Math.random() * Math.PI * 2,
      spd: Math.random() * 0.03 + 0.005,
    }));
  }

  // ── game logic ────────────────────────────────────────────────────────

  _updateStatus() {
    const statusEl = document.getElementById('gs-status');
    if (this.mode === 'draw') {
      statusEl.textContent = 'DRAWING';
      statusEl.style.color = this.lvl.pairs[this.activePair].color;
    } else {
      statusEl.textContent = 'NAVIGATE';
      statusEl.style.color = '#fff';
    }
  }

  _getPairAt(r, s) {
    for (let i = 0; i < this.lvl.pairs.length; i++) {
      const p = this.lvl.pairs[i];
      if ((p.src[0] === r && p.src[1] === s) || (p.tgt[0] === r && p.tgt[1] === s)) {
        return { index: i, type: (p.src[0] === r && p.src[1] === s) ? 'src' : 'tgt' };
      }
    }
    return null;
  }

  _isNodeUsed(r, s, ignorePair = -1) {
    for (let i = 0; i < this.paths.length; i++) {
      if (i === ignorePair) continue;
      // Is it a special node for another pair?
      const p = this.lvl.pairs[i];
      if ((p.src[0] === r && p.src[1] === s) || (p.tgt[0] === r && p.tgt[1] === s)) return true;
      // Is it in another pair's path?
      if (this.paths[i].some(([pr, ps]) => pr === r && ps === s)) return true;
    }
    return false;
  }

  // ── keyboard control ───────────────────────────────────────────────

  _key(e) {
    if (this.anim) return;

    if (this.won) {
      const btns = Array.from(document.querySelectorAll('.win-btn'));
      if (!btns.length || !document.getElementById('gs-win').classList.contains('show')) return;
      
      let focusedIdx = btns.findIndex(b => document.activeElement === b);
      if (focusedIdx === -1) {
        // default focus
        const nextBtn = document.getElementById('ws-next');
        focusedIdx = nextBtn ? btns.indexOf(nextBtn) : 0;
      }
      
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        btns[(focusedIdx + 1) % btns.length].focus();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        btns[(focusedIdx - 1 + btns.length) % btns.length].focus();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        btns[focusedIdx].click();
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      if (this.mode === 'draw') {
        // Cancel draw
        this.paths[this.activePair] = [];
        this.activePair = -1;
        this.mode = 'navigate';
        this._updateStatus();
        playInvalid();
      } else {
        this.navigate('level-select', { galaxyId: this.lvl.galaxyId });
      }
      return;
    }

    const [r, s] = this.pPos;

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (this.mode === 'navigate') {
        const pairInfo = this._getPairAt(r, s);
        // Can only start drawing from a Source node
        if (pairInfo && pairInfo.type === 'src') {
          this.mode = 'draw';
          this.activePair = pairInfo.index;
          this.paths[this.activePair] = [[r, s]];
          this.connections[this.activePair] = false;
          this._updateStatus();
          playMove();
        } else {
          playInvalid();
        }
      } else if (this.mode === 'draw') {
        const p = this.lvl.pairs[this.activePair];
        if (p.tgt[0] === r && p.tgt[1] === s) {
          // Connect!
          this.connections[this.activePair] = true;
          this.mode = 'navigate';
          this.activePair = -1;
          this._updateStatus();
          playWin();
          this._checkWin();
        } else {
          // Erase
          this.paths[this.activePair] = [];
          this.activePair = -1;
          this.mode = 'navigate';
          this._updateStatus();
          playInvalid();
        }
      }
      return;
    }

    let targetR = r, targetS = s;

    if (e.key === 'ArrowRight') targetS = (s + 1) % this.lvl.sectors;
    else if (e.key === 'ArrowLeft')  targetS = (s - 1 + this.lvl.sectors) % this.lvl.sectors;
    else if (e.key === 'ArrowUp')    targetR = r + 1;  // outer ring
    else if (e.key === 'ArrowDown')  targetR = r - 1;  // inner ring
    else return;

    e.preventDefault();

    if (!this.grid.isValid(targetR, targetS)) {
      playInvalid();
      return;
    }

    if (this.mode === 'draw') {
      const currentPath = this.paths[this.activePair];
      // Check backtracking
      if (currentPath.length >= 2) {
        const prev = currentPath[currentPath.length - 2];
        if (prev[0] === targetR && prev[1] === targetS) {
          // Backtrack
          currentPath.pop();
          this._startAnim(this.pPos, [targetR, targetS]);
          return;
        }
      }
      
      // Check collision with other paths/nodes
      if (this._isNodeUsed(targetR, targetS, this.activePair)) {
        playInvalid();
        return;
      }
      
      // Check self intersection
      if (currentPath.some(([pr, ps]) => pr === targetR && ps === targetS)) {
        playInvalid();
        return;
      }

      currentPath.push([targetR, targetS]);
    }

    this._startAnim(this.pPos, [targetR, targetS]);
  }

  // ── animation ─────────────────────────────────────────────────────────

  _startAnim(from, to) {
    this.anim = { from: [...from], to: [...to], start: performance.now() };
    const tip = document.getElementById('gs-tip');
    if (tip) tip.classList.add('hidden');
  }

  _tickAnim() {
    if (!this.anim) return;
    const elapsed = performance.now() - this.anim.start;
    const raw     = Math.min(elapsed / ANIM_MS, 1);
    const ease    = raw < 0.5 ? 4 * raw * raw * raw : 1 - Math.pow(-2 * raw + 2, 3) / 2;
    this.anim.progress = ease;

    if (raw >= 1) {
      this.pPos = [...this.anim.to];
      this.anim = null;
      playMove();
    }
  }

  _playerScreenPos() {
    if (!this.anim) {
      return this.renderer.getNodeCenter(...this.pPos, this.lvl.sectors);
    }
    const { from, to, progress } = this.anim;
    const fromC = this.renderer.getNodeCenter(...from, this.lvl.sectors);
    const toC   = this.renderer.getNodeCenter(...to,   this.lvl.sectors);

    if (from[0] === to[0]) {
      // Arc
      const ring = from[0];
      const sa = this.renderer.opt.rotation + from[1] * (2 * Math.PI) / this.lvl.sectors;
      const ea = this.renderer.opt.rotation + to[1] * (2 * Math.PI) / this.lvl.sectors;
      let diff = ea - sa;
      if (diff >  Math.PI) diff -= 2 * Math.PI;
      if (diff < -Math.PI) diff += 2 * Math.PI;
      const angle = sa + diff * progress;
      const radius = this.renderer.opt.baseRadius + ring * this.renderer.opt.ringWidth;
      return { x: this.renderer.cx + radius * Math.cos(angle),
               y: this.renderer.cy + radius * Math.sin(angle) };
    }
    return {
      x: fromC.x + (toC.x - fromC.x) * progress,
      y: fromC.y + (toC.y - fromC.y) * progress,
    };
  }

  // ── win ───────────────────────────────────────────────────────────────

  _checkWin() {
    if (this.connections.every(c => c)) {
      this._win();
    }
  }

  _win() {
    this.won = true;
    playWin();

    try {
      const p = JSON.parse(localStorage.getItem('sg-progress') || '{}');
      p[this.levelId] = { stars: 3 };
      localStorage.setItem('sg-progress', JSON.stringify(p));
    } catch {}

    setTimeout(() => {
      document.getElementById('gs-win').classList.add('show');
      const nextBtn = document.getElementById('ws-next');
      if (nextBtn) nextBtn.focus();
      else document.getElementById('ws-levels').focus();
    }, 650);
  }

  // ── draw ──────────────────────────────────────────────────────────────

  _draw() {
    const ctx = this.ctx;
    const W   = this.canvas.width, H = this.canvas.height;

    ctx.fillStyle = '#080c1f';
    ctx.fillRect(0, 0, W, H);

    // Stars
    this.stars.forEach(s => {
      s.ph += s.spd;
      const o = s.o * (0.5 + 0.5 * Math.sin(s.ph));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,220,255,${o})`;
      ctx.fill();
    });

    // Grid
    this.renderer.drawGrid(this.lvl.rings, this.lvl.sectors);

    // Paths
    for (let i = 0; i < this.paths.length; i++) {
      let pathToDraw = this.paths[i];
      // If currently drawing, append the animated player position to the path visually
      if (this.mode === 'draw' && this.activePair === i && this.anim) {
         // The player is moving to anim.to, path has already had anim.to pushed
         // For smooth drawing, we can let path just draw to the node, the player will lead it.
      }
      this.renderer.drawPath(pathToDraw, this.lvl.sectors, this.lvl.pairs[i].color);
    }

    // Nodes
    this.renderer.drawNodes(this.lvl.pairs, this.connections, this.lvl.sectors);

    // Obstacles
    this.renderer.drawObstacles(this.lvl.blocked, this.lvl.sectors);

    // Player
    if (this.anim) {
       // Just draw a white circle at the interpolated pos while moving
       const ep = this._playerScreenPos();
       ctx.save();
       ctx.translate(ep.x, ep.y);
       ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
       ctx.shadowBlur = 15;
       ctx.fillStyle = '#ffffff';
       ctx.beginPath();
       ctx.arc(0, 0, 10, 0, Math.PI * 2);
       ctx.fill();
       ctx.restore();
    } else {
       this.renderer.drawPlayer(this.pPos[0], this.pPos[1], this.lvl.sectors, this.time * 2.2);
    }

    // Advance animation
    this._tickAnim();
  }

  _loop() {
    this.time += 0.016;
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
