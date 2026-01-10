document.addEventListener('DOMContentLoaded', () => {
  initClockAndMoon();
  initParticles();
  initBackgroundShapes();
  initScrollAnimations();
  initDarknessOverlay();
});

// ===== 定数 =====
const SYNODIC_MONTH = 29.530588853;
const FULL_MOON_2026 = new Date(Date.UTC(2026, 0, 3, 10, 4, 0));
const FULL_MOON_AGE = 14.77;

const MOON_PHASES = [
  { threshold: 0.0625, name: '新月' },
  { threshold: 0.1875, name: '三日月' },
  { threshold: 0.3125, name: '上弦' },
  { threshold: 0.4375, name: '十三夜' },
  { threshold: 0.5625, name: '満月' },
  { threshold: 0.6875, name: '十八夜' },
  { threshold: 0.8125, name: '下弦' },
  { threshold: 0.9375, name: '二十六夜' },
  { threshold: 1, name: '新月' }
];

const CRATERS = [
  // 大きな海（暗い部分）
  { x: -0.3, y: -0.25, r: 0.35, depth: 0.15, type: 'mare' },
  { x: 0.25, y: -0.1, r: 0.25, depth: 0.12, type: 'mare' },
  { x: 0.1, y: 0.25, r: 0.2, depth: 0.1, type: 'mare' },
  { x: -0.15, y: 0.1, r: 0.18, depth: 0.1, type: 'mare' },
  { x: 0.4, y: -0.3, r: 0.15, depth: 0.08, type: 'mare' },
  // クレーター
  { x: -0.55, y: 0.65, r: 0.12, depth: 0.2, type: 'crater' },
  { x: 0.35, y: 0.55, r: 0.08, depth: 0.18, type: 'crater' },
  { x: -0.2, y: -0.55, r: 0.07, depth: 0.15, type: 'crater' },
  { x: 0.5, y: 0.1, r: 0.06, depth: 0.12, type: 'crater' },
  { x: -0.4, y: 0.35, r: 0.05, depth: 0.1, type: 'crater' },
  { x: 0.15, y: -0.45, r: 0.05, depth: 0.1, type: 'crater' },
  { x: -0.6, y: -0.1, r: 0.04, depth: 0.08, type: 'crater' },
  { x: 0.55, y: -0.5, r: 0.04, depth: 0.08, type: 'crater' },
  { x: -0.35, y: -0.4, r: 0.03, depth: 0.06, type: 'crater' },
  { x: 0.3, y: 0.35, r: 0.03, depth: 0.06, type: 'crater' }
];

const PARTICLE_CONFIG = {
  count: 40,
  connectionDistance: 120,
  fadeInDuration: 60,
  fadeOutDuration: 60,
  maxOpacity: 0.6
};

// ===== 時計と月齢表示 =====
function initClockAndMoon() {
  const timeEl = document.getElementById('current-time');
  const dateEl = document.getElementById('obs-date');
  const moonCanvas = document.getElementById('moon-canvas');
  const moonPhaseEl = document.getElementById('moon-phase');
  const moonAgeEl = document.getElementById('moon-age');

  if (!timeEl || !moonCanvas) return;

  const moonCtx = moonCanvas.getContext('2d');
  const size = 140;
  const center = size / 2;
  const radius = 55;

  function updateClock() {
    const now = new Date();
    timeEl.textContent = formatTime(now);
    if (dateEl) dateEl.textContent = formatDate(now);

    const moonAge = getMoonAge(now);
    drawMoon(moonCtx, size, center, radius, moonAge);

    if (moonPhaseEl) moonPhaseEl.textContent = getMoonPhaseName(moonAge);
    if (moonAgeEl) moonAgeEl.textContent = `Moon Age: ${moonAge.toFixed(1)}`;
  }

  updateClock();
  setInterval(updateClock, 1000);
}

function formatTime(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function formatDate(date) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${days[date.getDay()]} · ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function getMoonAge(date) {
  const diffDays = (date.getTime() - FULL_MOON_2026.getTime()) / 864e5;
  let age = (FULL_MOON_AGE + diffDays) % SYNODIC_MONTH;
  return age < 0 ? age + SYNODIC_MONTH : age;
}

function getMoonPhaseName(age) {
  const phase = age / SYNODIC_MONTH;
  for (const p of MOON_PHASES) {
    if (phase < p.threshold) return p.name;
  }
  return '新月';
}

function getCraterEffect(nx, ny) {
  let darkening = 0;
  for (const c of CRATERS) {
    const dx = nx - c.x;
    const dy = ny - c.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < c.r) {
      const normalizedDist = dist / c.r;
      if (c.type === 'mare') {
        darkening += c.depth * (1 - normalizedDist * 0.3);
      } else {
        darkening += c.depth * (1 - Math.sin(normalizedDist * Math.PI));
      }
    }
  }
  return Math.min(darkening, 0.4);
}

function drawMoon(ctx, size, center, radius, age) {
  ctx.clearRect(0, 0, size, size);
  const phase = (age / SYNODIC_MONTH) % 1;

  // グロー効果
  const glowGrad = ctx.createRadialGradient(center, center, radius * 0.9, center, center, radius + 8);
  glowGrad.addColorStop(0, 'rgba(255, 255, 230, 0.05)');
  glowGrad.addColorStop(1, 'rgba(255, 255, 230, 0)');
  ctx.beginPath();
  ctx.arc(center, center, radius + 8, 0, Math.PI * 2);
  ctx.fillStyle = glowGrad;
  ctx.fill();

  // ピクセル単位で月面を描画
  const imageData = ctx.createImageData(size, size);
  const data = imageData.data;
  const lightAngle = phase * 2 * Math.PI;
  const lightX = Math.sin(lightAngle);
  const lightZ = -Math.cos(lightAngle);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= radius) {
        const idx = (y * size + x) * 4;
        const nx = dx / radius;
        const ny = dy / radius;
        const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));

        const dotProduct = nx * lightX + nz * lightZ;
        const lightFactor = Math.max(0, Math.min(1, (dotProduct + 0.1) / 0.2));
        const craterDark = getCraterEffect(nx, ny);
        const edgeDarkening = 1 - (dist / radius) * 0.15;
        const surfaceBrightness = (1 - craterDark) * edgeDarkening;

        const lightR = 210 * surfaceBrightness;
        const lightG = 208 * surfaceBrightness;
        const lightB = 195 * surfaceBrightness;

        data[idx] = Math.floor(18 + (lightR - 18) * lightFactor);
        data[idx + 1] = Math.floor(20 + (lightG - 20) * lightFactor);
        data[idx + 2] = Math.floor(32 + (lightB - 32) * lightFactor);
        data[idx + 3] = 255;
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

// ===== パーティクル背景 =====
function initParticles() {
  const canvas = document.getElementById('particles-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let particles = [];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function createParticle() {
    return {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      radius: Math.random() * 2 + 1,
      life: 0,
      maxLife: Math.random() * 300 + 200,
      opacity: 0
    };
  }

  function init() {
    resize();
    particles = [];
    for (let i = 0; i < PARTICLE_CONFIG.count; i++) {
      const p = createParticle();
      p.life = Math.random() * p.maxLife;
      particles.push(p);
    }
  }

  function updateParticleOpacity(p) {
    const { fadeInDuration, fadeOutDuration, maxOpacity } = PARTICLE_CONFIG;
    const fadeOutStart = p.maxLife - fadeOutDuration;

    if (p.life < fadeInDuration) {
      return (p.life / fadeInDuration) * maxOpacity;
    }
    if (p.life > fadeOutStart) {
      return ((p.maxLife - p.life) / fadeOutDuration) * maxOpacity;
    }
    return maxOpacity;
  }

  function drawConnections() {
    const { connectionDistance } = PARTICLE_CONFIG;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < connectionDistance) {
          const baseOpacity = Math.min(particles[i].opacity, particles[j].opacity);
          const opacity = (1 - distance / connectionDistance) * 0.3 * baseOpacity;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawConnections();

    particles.forEach((p, index) => {
      // 描画
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
      ctx.fill();

      // 更新
      p.x += p.vx;
      p.y += p.vy;
      p.life++;
      p.opacity = updateParticleOpacity(p);

      if (p.life >= p.maxLife) {
        particles[index] = createParticle();
      }
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
    });

    requestAnimationFrame(animate);
  }

  window.addEventListener('resize', init);
  init();
  animate();
}

// ===== 背景シェイプアニメーション =====
function initBackgroundShapes() {
  if (typeof anime === 'undefined') return;

  const shapeConfigs = [
    { selector: '.shape-1', translateX: ['-30%', '30%'], translateY: ['-20%', '40%'], scale: [1, 1.2, 0.9, 1.1, 1], duration: 25000 },
    { selector: '.shape-2', translateX: ['30%', '-30%'], translateY: ['30%', '-20%'], scale: [1.1, 0.9, 1.2, 1], duration: 30000 },
    { selector: '.shape-3', translateX: ['-20%', '20%'], translateY: ['20%', '-30%'], scale: [0.9, 1.3, 1], duration: 20000 }
  ];

  shapeConfigs.forEach(config => {
    anime.animate(config.selector, {
      translateX: config.translateX,
      translateY: config.translateY,
      scale: config.scale,
      duration: config.duration,
      easing: 'easeInOutSine',
      loop: true,
      alternate: true
    });
  });
}

// ===== スクロールアニメーション =====
function initScrollAnimations() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const fadeInObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const delay = el.dataset.delay || 0;
        setTimeout(() => el.classList.add('is-visible'), delay);
        fadeInObserver.unobserve(el);
      }
    });
  }, observerOptions);

  function observeElements(selector, delayMultiplier = 100) {
    document.querySelectorAll(selector).forEach((el, i) => {
      el.dataset.delay = i * delayMultiplier;
      fadeInObserver.observe(el);
    });
  }

  observeElements('.sns-icon-large', 100);
  observeElements('.post-card', 120);

  const postsTitle = document.querySelector('.posts-section-title');
  if (postsTitle) fadeInObserver.observe(postsTitle);
}

// ===== スクロールで暗くなるエフェクト =====
function initDarknessOverlay() {
  const darknessOverlay = document.querySelector('.darkness-overlay');
  if (!darknessOverlay) return;

  window.addEventListener('scroll', () => {
    const opacity = Math.min(window.scrollY / window.innerHeight, 1);
    darknessOverlay.style.opacity = opacity;
  });
}
