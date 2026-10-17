import { useEffect, useRef } from 'react';
import styles from './LoadingAnimation.module.css';
import type { BaseLoaderProps } from './types';

export function CanvasAILoader({ size = 'md', label, className = '' }: BaseLoaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let primaryColor = 'currentColor';
    
    const updateThemeColor = () => {
      const rootStyle = getComputedStyle(document.documentElement);
      const tokenValue = rootStyle.getPropertyValue('--sf-color-primary').trim();
      if (tokenValue) {
        primaryColor = tokenValue;
      }
    };
    updateThemeColor();

    const observer = new MutationObserver(updateThemeColor);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    let animationFrameId: number | null = null;
    let time = 0;

    const resizeCanvas = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
      }
    };

    const drawWave = (offset: number, amplitude: number, color: string) => {
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);
      const centerY = height / 2;

      ctx.beginPath();
      for (let i = 0; i < width; i += 2) {
        const y = centerY + Math.sin(i * 0.05 + offset) * amplitude;
        if (i === 0) ctx.moveTo(i, y);
        else ctx.lineTo(i, y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    const render = () => {
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);
      ctx.clearRect(0, 0, width, height);

      const amplitude = height * 0.25 * (Math.sin(time * 0.5) * 0.5 + 0.5);

      drawWave(time, amplitude, primaryColor);
      ctx.globalAlpha = 0.5;
      drawWave(time + Math.PI, amplitude * 0.6, primaryColor);
      ctx.globalAlpha = 1.0;

      time += 0.05;
      animationFrameId = requestAnimationFrame(render);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    if (mediaQuery.matches) {
      drawWave(0, canvas.height * 0.2, primaryColor);
    } else {
      render();
    }
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      observer.disconnect();
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  return (
    <div className={`${styles.container} ${className}`.trim()} role="status" aria-label={label || 'AI is processing'}>
      <div className={`${styles.canvasWrapper} ${styles[`size-${size}`]}`}>
        <canvas ref={canvasRef} className={styles.canvasEl} />
      </div>
      {label && <p className={styles.label}>{label}</p>}
    </div>
  );
}
