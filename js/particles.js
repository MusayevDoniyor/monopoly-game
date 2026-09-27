// 2D Particle Engine for AAA Game Feedback (Gold Coins, Confetti, Screen Shake)
export class ParticleEngine {
  constructor() {
    this.particles = [];
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    this.canvas = document.createElement('canvas');
    this.canvas.id = 'particleCanvas';
    this.canvas.style.cssText = 'position: fixed; inset: 0; pointer-events: none; z-index: 9999; width: 100vw; height: 100vh;';
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.loop();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  // Explode golden coins at screen location
  burstCoins(x = window.innerWidth / 2, y = window.innerHeight / 2, count = 28) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 8;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        size: 7 + Math.random() * 5,
        color: Math.random() > 0.3 ? '#fbbf24' : '#f59e0b',
        border: '#d97706',
        alpha: 1,
        life: 0.02 + Math.random() * 0.015,
        type: 'coin',
        rotation: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 0.2
      });
    }
  }

  // Confetti rain across entire screen on victory / major milestones
  burstConfetti() {
    const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
    for (let i = 0; i < 90; i++) {
      this.particles.push({
        x: Math.random() * window.innerWidth,
        y: -20,
        vx: (Math.random() - 0.5) * 4,
        vy: 2 + Math.random() * 5,
        size: 6 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        life: 0.008 + Math.random() * 0.006,
        type: 'confetti',
        rotation: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 0.15
      });
    }
  }

  // Floating floating money chip text
  floatText(text, x, y, isGain = true) {
    const el = document.createElement('div');
    el.className = 'floating-money';
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.color = isGain ? '#34d399' : '#ef4444';
    el.style.textShadow = '0 2px 8px rgba(0,0,0,0.8)';
    el.innerText = text;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  }

  // Screen shake
  screenShake(intensity = 8, duration = 300) {
    const appEl = document.querySelector('.app-container');
    if (!appEl) return;
    const start = performance.now();

    const shake = (now) => {
      const elapsed = now - start;
      if (elapsed < duration) {
        const decay = 1 - elapsed / duration;
        const dx = (Math.random() - 0.5) * intensity * decay;
        const dy = (Math.random() - 0.5) * intensity * decay;
        appEl.style.transform = `translate(${dx}px, ${dy}px)`;
        requestAnimationFrame(shake);
      } else {
        appEl.style.transform = 'none';
      }
    };
    requestAnimationFrame(shake);
  }

  loop() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.25; // gravity
      p.rotation += p.vRot;
      p.alpha -= p.life;

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.globalAlpha = p.alpha;
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.rotation);

      if (p.type === 'coin') {
        this.ctx.fillStyle = p.color;
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, p.size, p.size * 0.7, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = p.border;
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();
      } else {
        this.ctx.fillStyle = p.color;
        this.ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      }

      this.ctx.restore();
    }

    requestAnimationFrame(() => this.loop());
  }
}

export const particles = new ParticleEngine();
