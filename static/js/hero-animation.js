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

// 月テクスチャ（リアルな月面画像を使用）
let moonTexture = null;
let moonTextureData = null;

function loadMoonTexture() {
  return new Promise((resolve) => {
    const img = new Image();
    // crossOrigin を外す（ローカル開発時の問題回避）
    img.onload = () => {
      console.log('Moon texture loaded:', img.width, 'x', img.height);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      moonTextureData = ctx.getImageData(0, 0, img.width, img.height);
      moonTexture = img;
      console.log('Moon texture data ready, sample pixel:',
        moonTextureData.data[0], moonTextureData.data[1], moonTextureData.data[2]);
      resolve();
    };
    img.onerror = (e) => {
      console.error('Failed to load moon texture:', e);
      resolve();
    };
    // baseURL を考慮したパス（/blog/ サブディレクトリ対応）
    img.src = '/blog/images/moon-texture.jpg';
  });
}

const PARTICLE_CONFIG = {
  count: 40,
  connectionDistance: 120,
  fadeInDuration: 60,
  fadeOutDuration: 60,
  maxOpacity: 0.6
};

// ===== 時計と月齢表示 =====
async function initClockAndMoon() {
  const timeEl = document.getElementById('current-time');
  const dateEl = document.getElementById('obs-date');
  const moonCanvas = document.getElementById('moon-canvas');
  const moonPhaseEl = document.getElementById('moon-phase');
  const moonAgeEl = document.getElementById('moon-age');

  if (!timeEl || !moonCanvas) return;

  // テクスチャを読み込む
  await loadMoonTexture();

  const moonCtx = moonCanvas.getContext('2d');

  // 高DPIディスプレイ対応（さらに3倍のスーパーサンプリング）
  const dpr = (window.devicePixelRatio || 1) * 3;
  const displaySize = 200; // CSS上のサイズ
  const size = displaySize * dpr; // 実際の描画サイズ

  // Canvas の実サイズを大きくし、CSSで縮小表示
  moonCanvas.width = size;
  moonCanvas.height = size;
  moonCanvas.style.width = displaySize + 'px';
  moonCanvas.style.height = displaySize + 'px';

  const center = size / 2;
  const radius = (displaySize / 2 - 15) * dpr; // 余白を考慮

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

// テクスチャからピクセルを取得（球面マッピング）
function getTexturePixel(nx, ny) {
  if (!moonTextureData) return { r: 180, g: 178, b: 165 }; // フォールバック

  const texWidth = moonTextureData.width;
  const texHeight = moonTextureData.height;

  // 月は常に同じ面を地球に向けているので、シンプルな正射影マッピング
  // nx, ny は -1 〜 1 の範囲なので、0 〜 1 に変換
  const u = (nx + 1) / 2;
  const v = (ny + 1) / 2;

  const texX = Math.floor(u * texWidth * 0.5 + texWidth * 0.25) % texWidth;
  const texY = Math.floor(v * texHeight) % texHeight;
  const texIdx = (texY * texWidth + texX) * 4;

  return {
    r: moonTextureData.data[texIdx],
    g: moonTextureData.data[texIdx + 1],
    b: moonTextureData.data[texIdx + 2]
  };
}

function drawMoon(ctx, size, center, radius, age) {
  ctx.clearRect(0, 0, size, size);
  const phase = (age / SYNODIC_MONTH) % 1;

  // 多層グロー効果（よりリアルな光芒）
  const glowLayers = [
    { radiusMultiplier: 1.25, opacity: 0.03 },
    { radiusMultiplier: 1.15, opacity: 0.05 },
    { radiusMultiplier: 1.08, opacity: 0.08 }
  ];

  glowLayers.forEach(layer => {
    const glowGrad = ctx.createRadialGradient(
      center, center, radius * 0.95,
      center, center, radius * layer.radiusMultiplier
    );
    glowGrad.addColorStop(0, `rgba(255, 252, 240, ${layer.opacity})`);
    glowGrad.addColorStop(0.5, `rgba(255, 250, 230, ${layer.opacity * 0.5})`);
    glowGrad.addColorStop(1, 'rgba(255, 248, 220, 0)');
    ctx.beginPath();
    ctx.arc(center, center, radius * layer.radiusMultiplier, 0, Math.PI * 2);
    ctx.fillStyle = glowGrad;
    ctx.fill();
  });

  // ピクセル単位で月面を描画
  const imageData = ctx.createImageData(size, size);
  const data = imageData.data;

  // 光源の方向（月齢に基づく）
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

        // 正規化された球面座標
        const nx = dx / radius;
        const ny = dy / radius;
        const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));

        // テクスチャからピクセル取得
        const texColor = getTexturePixel(nx, ny);

        // 光の計算
        const dotProduct = nx * lightX + nz * lightZ;

        // よりリアルな陰影（ソフトターミネーター）
        const terminator = 0.12;
        let lightFactor = (dotProduct + terminator) / (2 * terminator);
        lightFactor = Math.max(0, Math.min(1, lightFactor));
        // 滑らかな遷移
        lightFactor = lightFactor * lightFactor * (3 - 2 * lightFactor);

        // 陰影部分の環境光（地球照など）
        const ambientLight = 0.08;

        // リムダークニング（縁が暗くなる効果）- 控えめに
        const limbDarkening = 0.85 + 0.15 * nz;

        // 最終的な明るさ
        const brightness = (ambientLight + (1 - ambientLight) * lightFactor) * limbDarkening;

        // 暗部は少し青みがかる（地球照効果）
        const shadowTint = 1 - lightFactor;
        const earthshineR = texColor.r * brightness * (1 - shadowTint * 0.05);
        const earthshineG = texColor.g * brightness;
        const earthshineB = texColor.b * brightness * (1 + shadowTint * 0.1);

        data[idx] = Math.floor(Math.min(255, earthshineR));
        data[idx + 1] = Math.floor(Math.min(255, earthshineG));
        data[idx + 2] = Math.floor(Math.min(255, earthshineB));
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
