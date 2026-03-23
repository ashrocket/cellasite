/**
 * CELLA Portrait Particle System
 *
 * Loads the portrait image, samples dark pixels as particle positions,
 * and animates from scattered random positions to photo positions
 * driven by scroll progress (0 = scattered, 1 = full portrait).
 */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initPortraitParticles(canvasEl) {
  const ctx = canvasEl.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  // Sizing
  const canvasWidth = 500;
  const canvasHeight = 600;
  canvasEl.width = canvasWidth * dpr;
  canvasEl.height = canvasHeight * dpr;
  canvasEl.style.width = canvasWidth + 'px';
  canvasEl.style.height = canvasHeight + 'px';
  ctx.scale(dpr, dpr);

  const particles = [];
  let progress = { value: 0 };

  // Load portrait and sample pixels
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = '/images/portrait.jpg';

  img.onload = () => {
    // Draw image to offscreen canvas to sample pixels
    const offscreen = document.createElement('canvas');
    const offCtx = offscreen.getContext('2d');

    // Scale image to fit our canvas
    const scale = Math.min(canvasWidth / img.width, canvasHeight / img.height) * 0.85;
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const offsetX = (canvasWidth - drawW) / 2;
    const offsetY = (canvasHeight - drawH) / 2;

    offscreen.width = canvasWidth;
    offscreen.height = canvasHeight;
    offCtx.drawImage(img, offsetX, offsetY, drawW, drawH);

    const imageData = offCtx.getImageData(0, 0, canvasWidth, canvasHeight);
    const data = imageData.data;

    // Sample dark pixels as particle targets
    const step = 3; // Sample every Nth pixel
    for (let y = 0; y < canvasHeight; y += step) {
      for (let x = 0; x < canvasWidth; x += step) {
        const i = (y * canvasWidth + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        // Only create particles for dark pixels (the stipple dots)
        const brightness = (r + g + b) / 3;
        if (a > 128 && brightness < 180) {
          // Darker pixels = larger particles
          const size = gsap.utils.mapRange(0, 180, 2.0, 0.5, brightness);

          particles.push({
            // Target position (where the particle belongs in the photo)
            tx: x,
            ty: y,
            // Current position (starts scattered)
            x: Math.random() * canvasWidth,
            y: Math.random() * canvasHeight,
            // Random scatter position
            sx: Math.random() * canvasWidth,
            sy: Math.random() * canvasHeight,
            // Properties
            size: size,
            opacity: gsap.utils.mapRange(0, 180, 1.0, 0.3, brightness),
          });
        }
      }
    }

    // Set up scroll-driven animation
    ScrollTrigger.create({
      trigger: '.hero',
      start: 'top top',
      end: 'bottom top',
      scrub: 0.5,
      onUpdate: (self) => {
        progress.value = self.progress;
      }
    });

    // Render loop
    function render() {
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      const p = progress.value;
      // Ease the progress for a more organic feel
      const easedP = gsap.parseEase('power2.inOut')(p);

      for (let i = 0; i < particles.length; i++) {
        const particle = particles[i];

        // Lerp from scatter position to target position
        particle.x = gsap.utils.interpolate(particle.sx, particle.tx, easedP);
        particle.y = gsap.utils.interpolate(particle.sy, particle.ty, easedP);

        // Particle opacity increases as they converge
        const alpha = gsap.utils.interpolate(0.15, particle.opacity, easedP);

        // Draw particle
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(30, 30, 30, ${alpha})`;
        ctx.fill();
      }

      requestAnimationFrame(render);
    }

    render();
  };
}
