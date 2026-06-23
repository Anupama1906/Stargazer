export class Starfield {
  constructor() {
    this.stars = [];
    this.shootingStars = [];
    this.W = 0;
    this.H = 0;
  }

  resize(W, H) {
    this.W = W;
    this.H = H;
    this.stars = Array.from({ length: 250 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.2 + 0.2,
      o: Math.random() * 0.7 + 0.1,
      ph: Math.random() * Math.PI * 2,
      spd: Math.random() * 0.03 + 0.005,
    }));
  }

  draw(ctx, theme) {
    // Regular stars
    this.stars.forEach(s => {
      s.ph += s.spd;
      const o = s.o * (0.5 + 0.5 * Math.sin(s.ph));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = theme.starBase + o + ')';
      ctx.fill();
    });

    // Spawn shooting star randomly
    if (Math.random() < 0.015 && this.shootingStars.length < 2) {
      this.shootingStars.push({
         x: Math.random() * this.W,
         y: -50,
         vx: (Math.random() * 15 + 10) * (Math.random() > 0.5 ? 1 : -1),
         vy: Math.random() * 10 + 6,
         life: 1.0
      });
    }

    // Draw and update shooting stars
    for (let i = this.shootingStars.length - 1; i >= 0; i--) {
      let ss = this.shootingStars[i];
      ss.x += ss.vx;
      ss.y += ss.vy;
      ss.life -= 0.012; // fade out speed
      
      if (ss.life <= 0 || ss.y > this.H || ss.x < -100 || ss.x > this.W + 100) {
        this.shootingStars.splice(i, 1);
        continue;
      }
      
      ctx.beginPath();
      ctx.moveTo(ss.x, ss.y);
      ctx.lineTo(ss.x - ss.vx * 4, ss.y - ss.vy * 4); // trail length
      
      const grad = ctx.createLinearGradient(ss.x, ss.y, ss.x - ss.vx * 4, ss.y - ss.vy * 4);
      grad.addColorStop(0, `rgba(255, 255, 255, ${Math.max(0, ss.life)})`);
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
}
