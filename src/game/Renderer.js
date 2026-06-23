export class Renderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.opt = {
      baseRadius:      options.baseRadius      ?? 55,
      ringWidth:       options.ringWidth       ?? 50,
      rotation:        -Math.PI / 2,                       // 0° at top
    };
  }

  get cx() { return this.canvas.width  / 2; }
  get cy() { return this.canvas.height / 2; }

  // ── geometry ─────────────────────────────────────────────────────────

  getNodeCenter(ring, sector, sectors) {
    const { baseRadius, ringWidth, rotation } = this.opt;
    const r = baseRadius + ring * ringWidth;
    const angle = rotation + sector * (2 * Math.PI) / sectors;
    return {
      x: this.cx + r * Math.cos(angle),
      y: this.cy + r * Math.sin(angle),
    };
  }

  // ── hit-test ──────────────────────────────────────────────────────────

  hitTest(mx, my, rings, sectors) {
    const dx   = mx - this.cx;
    const dy   = my - this.cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const { baseRadius, ringWidth, rotation } = this.opt;

    let closestR = -1;
    let minRDist = Infinity;
    for (let r = 0; r < rings; r++) {
      const radius = baseRadius + r * ringWidth;
      const d = Math.abs(dist - radius);
      if (d < minRDist) {
        minRDist = d;
        closestR = r;
      }
    }

    if (minRDist > ringWidth * 0.4) return null; // Too far from any ring

    let angle = Math.atan2(dy, dx) - rotation;
    angle = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    
    const sectorAngle = (2 * Math.PI) / sectors;
    let closestS = Math.round(angle / sectorAngle) % sectors;
    
    const c = this.getNodeCenter(closestR, closestS, sectors);
    const cdx = mx - c.x;
    const cdy = my - c.y;
    if (Math.sqrt(cdx * cdx + cdy * cdy) > ringWidth * 0.4) return null; // Too far from node

    return [closestR, closestS];
  }

  // ── drawing ─────────────────────────────────────────────────────────────

  drawGrid(rings, sectors, theme) {
    const { baseRadius, ringWidth, rotation } = this.opt;
    const ctx = this.ctx;

    ctx.strokeStyle = `rgba(${theme.primary}, 0.20)`;
    ctx.lineWidth = 1;

    // Rings
    for (let r = 0; r < rings; r++) {
      const radius = baseRadius + r * ringWidth;
      ctx.beginPath();
      ctx.arc(this.cx, this.cy, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Spokes
    const sectorAngle = (2 * Math.PI) / sectors;
    for (let s = 0; s < sectors; s++) {
      const a = rotation + s * sectorAngle;
      const inner = baseRadius;
      const outer = baseRadius + (rings - 1) * ringWidth;
      ctx.beginPath();
      ctx.moveTo(this.cx + inner * Math.cos(a), this.cy + inner * Math.sin(a));
      ctx.lineTo(this.cx + outer * Math.cos(a), this.cy + outer * Math.sin(a));
      ctx.stroke();
    }

    // Regular nodes (dots)
    ctx.fillStyle = `rgba(${theme.primary}, 0.4)`;
    for (let r = 0; r < rings; r++) {
      for (let s = 0; s < sectors; s++) {
        const c = this.getNodeCenter(r, s, sectors);
        ctx.beginPath();
        ctx.arc(c.x, c.y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  drawPath(path, sectors, color) {
    if (path.length < 2) return;
    const ctx = this.ctx;
    const { baseRadius, ringWidth, rotation } = this.opt;

    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;

    ctx.beginPath();
    let [r, s] = path[0];
    let c = this.getNodeCenter(r, s, sectors);
    ctx.moveTo(c.x, c.y);

    for (let i = 1; i < path.length; i++) {
      const [nr, ns] = path[i];
      if (nr === r) { // arc
        const radius = baseRadius + r * ringWidth;
        const sa = rotation + s * (2 * Math.PI) / sectors;
        const ea = rotation + ns * (2 * Math.PI) / sectors;
        
        let diff = ea - sa;
        if (diff > Math.PI) diff -= 2 * Math.PI;
        if (diff < -Math.PI) diff += 2 * Math.PI;
        
        // draw arc
        const ccw = diff < 0;
        ctx.arc(this.cx, this.cy, radius, sa, sa + diff, ccw);
      } else { // line
        c = this.getNodeCenter(nr, ns, sectors);
        ctx.lineTo(c.x, c.y);
      }
      r = nr;
      s = ns;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  drawNodes(pairs, connections, sectors) {
    const ctx = this.ctx;
    
    for (let i = 0; i < pairs.length; i++) {
      const p = pairs[i];
      const isConnected = connections[i];
      
      const srcC = this.getNodeCenter(p.src[0], p.src[1], sectors);
      const tgtC = this.getNodeCenter(p.tgt[0], p.tgt[1], sectors);

      ctx.save();
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;

      if (isConnected) {
        // Connected Source
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(srcC.x, srcC.y, 8, 0, Math.PI * 2);
        ctx.fill();

        // Connected Target
        ctx.translate(tgtC.x, tgtC.y);
        ctx.rotate(Math.PI / 4);
        ctx.beginPath();
        ctx.roundRect(-7, -7, 14, 14, 2);
        ctx.fill();
        ctx.restore();
      } else {
        // Unconnected Source (Double Circle)
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(srcC.x, srcC.y, 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(srcC.x, srcC.y, 3, 0, Math.PI * 2);
        ctx.stroke();

        // Unconnected Target (Hollow Diamond)
        ctx.translate(tgtC.x, tgtC.y);
        ctx.rotate(Math.PI / 4);
        ctx.beginPath();
        ctx.rect(-6, -6, 12, 12);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  drawPulse(path, t, color, sectors) {
    if (path.length < 2) return;
    const ctx = this.ctx;
    const { baseRadius, ringWidth, rotation } = this.opt;
    
    const idx = Math.floor(t);
    const frac = t - idx;
    
    if (idx >= path.length - 1) return;
    
    const [r1, s1] = path[idx];
    const [r2, s2] = path[idx + 1];
    
    let x, y;
    
    if (r1 === r2) {
      const radius = baseRadius + r1 * ringWidth;
      const sa = rotation + s1 * (2 * Math.PI) / sectors;
      const ea = rotation + s2 * (2 * Math.PI) / sectors;
      
      let diff = ea - sa;
      if (diff > Math.PI) diff -= 2 * Math.PI;
      if (diff < -Math.PI) diff += 2 * Math.PI;
      
      const angle = sa + diff * frac;
      x = this.cx + radius * Math.cos(angle);
      y = this.cy + radius * Math.sin(angle);
    } else {
      const p1 = this.getNodeCenter(r1, s1, sectors);
      const p2 = this.getNodeCenter(r2, s2, sectors);
      x = p1.x + (p2.x - p1.x) * frac;
      y = p1.y + (p2.y - p1.y) * frac;
    }
    
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.shadowColor = color;
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.restore();
  }

  drawPlayer(ring, sector, sectors, pulse) {
    const ctx = this.ctx;
    const c = this.getNodeCenter(ring, sector, sectors);
    const { rotation } = this.opt;
    const angle = rotation + sector * (2 * Math.PI) / sectors;

    ctx.save();
    ctx.translate(c.x, c.y);

    // Glow
    ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
    ctx.shadowBlur = 15 + 5 * Math.sin(pulse);
    
    // Outer Circle
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();

    // Inner Triangle pointing towards center
    // Direction vector towards center
    ctx.rotate(angle + Math.PI); // point inwards
    
    ctx.fillStyle = '#000'; // Make it black inside so it works with any theme
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(5, 0); // Tip
    ctx.lineTo(-3, 4);
    ctx.lineTo(-3, -4);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  drawObstacles(blockedArray, sectors) {
    if (!blockedArray || !blockedArray.length) return;
    
    const ctx = this.ctx;
    ctx.save();
    
    ctx.shadowColor = 'rgba(255, 60, 60, 0.8)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = 'rgba(255, 60, 60, 0.9)';
    ctx.strokeStyle = 'rgba(255, 100, 100, 1)';
    ctx.lineWidth = 1;

    for (const [r, s] of blockedArray) {
      const c = this.getNodeCenter(r, s, sectors);
      const angleOffset = this.opt.rotation + s * (2 * Math.PI) / sectors;
      
      ctx.translate(c.x, c.y);
      ctx.rotate(angleOffset); // align with spoke
      
      // Draw hexagon
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const hexAngle = (i * Math.PI) / 3;
        const hx = 6 * Math.cos(hexAngle);
        const hy = 6 * Math.sin(hexAngle);
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      ctx.rotate(-angleOffset);
      ctx.translate(-c.x, -c.y);
    }
    
    ctx.restore();
  }
}
