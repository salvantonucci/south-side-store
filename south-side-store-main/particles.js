class Particle {
  constructor(canvas) {
    this.canvas = canvas;
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.size = Math.random() * 3 + 1;
    this.speedX = Math.random() * 2 - 1;
    this.speedY = Math.random() * 2 - 1;
    this.color = '#ffffffff';
    this.opacity = Math.random() * 0.5 + 0.2;
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;

    if (this.x > this.canvas.width || this.x < 0) this.speedX *= -1;
    if (this.y > this.canvas.height || this.y < 0) this.speedY *= -1;
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.globalAlpha = this.opacity;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

class ParticleSystem {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.particleCount = 50;
    this.init();
  }

  init() {
    // Setup canvas
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.pointerEvents = 'none';
  // Put canvas behind content
  this.canvas.style.zIndex = '0';
    document.body.insertBefore(this.canvas, document.body.firstChild);

    // Handle resize
    window.addEventListener('resize', () => this.resize());
    this.resize();

    // mouse interaction state
    this.mouse = { x: null, y: null, radius: Math.min(window.innerWidth, window.innerHeight) * 0.12 };

    // capture mouse move on window (canvas is pointer-events: none)
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });

    window.addEventListener('mouseleave', () => {
      this.mouse.x = null;
      this.mouse.y = null;
    });

    // brief repulsion on click
    window.addEventListener('click', (e) => {
      const cx = e.clientX; const cy = e.clientY;
      const repulseRadius = Math.min(200, this.mouse.radius * 1.2);
      const force = 6; // tweak for strength
      for (let p of this.particles) {
        const dx = p.x - cx;
        const dy = p.y - cy;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < repulseRadius && dist > 0.1) {
          const effect = (1 - dist / repulseRadius) * force;
          p.speedX += (dx / dist) * effect;
          p.speedY += (dy / dist) * effect;
        }
      }
    });

    // Create particles
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push(new Particle(this.canvas));
    }

    this.animate();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.particles.forEach(particle => {
      // apply subtle attraction toward mouse when present
      if (this.mouse.x !== null && this.mouse.y !== null) {
        const dx = this.mouse.x - particle.x;
        const dy = this.mouse.y - particle.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const max = this.mouse.radius;
        if (dist < max && dist > 0.1) {
          // attraction strength decreases with distance
          const strength = 0.03 * (1 - dist / max);
          particle.speedX += (dx / dist) * strength;
          particle.speedY += (dy / dist) * strength;
          // limit speeds for stability
          particle.speedX = Math.max(Math.min(particle.speedX, 2.5), -2.5);
          particle.speedY = Math.max(Math.min(particle.speedY, 2.5), -2.5);
        }
      }
      particle.update();
      particle.draw(this.ctx);
    });

    // Connect particles that are close to each other
    this.connectParticles();

    requestAnimationFrame(() => this.animate());
  }

  connectParticles() {
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const dx = this.particles[i].x - this.particles[j].x;
        const dy = this.particles[i].y - this.particles[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 100) {
          this.ctx.beginPath();
          this.ctx.strokeStyle = '#ffffffff';
          this.ctx.globalAlpha = 0.2 * (1 - distance / 100);
          this.ctx.lineWidth = 1;
          this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
          this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
          this.ctx.stroke();
          this.ctx.globalAlpha = 1;
        }
      }
    }
  }
}