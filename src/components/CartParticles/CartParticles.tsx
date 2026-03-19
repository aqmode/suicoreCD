import { useState, useCallback } from 'react';
import styles from './CartParticles.module.css';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  angle: number;
  distance: number;
  rotation: number;
  shape: 'square' | 'circle' | 'line';
  delay: number;
}

let nextId = 0;

function generateParticles(count: number): Particle[] {
  const shapes: Particle['shape'][] = ['square', 'circle', 'line'];
  return Array.from({ length: count }, () => {
    const angle = Math.random() * 360;
    const distance = 40 + Math.random() * 60;
    return {
      id: nextId++,
      x: 0,
      y: 0,
      size: 3 + Math.random() * 5,
      angle,
      distance,
      rotation: Math.random() * 360,
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      delay: Math.random() * 0.08,
    };
  });
}

interface Burst {
  id: number;
  x: number;
  y: number;
  particles: Particle[];
}

let burstId = 0;

/**
 * Call `triggerAt(x, y)` to spawn particles at a given screen position.
 * Typically called from a button's onClick with the button's bounding rect center.
 */
export function useCartParticles() {
  const [bursts, setBursts] = useState<Burst[]>([]);

  const triggerAt = useCallback((x: number, y: number) => {
    const burst: Burst = {
      id: burstId++,
      x,
      y,
      particles: generateParticles(12),
    };
    setBursts((prev) => [...prev, burst]);
    setTimeout(() => {
      setBursts((prev) => prev.filter((b) => b.id !== burst.id));
    }, 700);
  }, []);

  const triggerFromEvent = useCallback(
    (e: React.MouseEvent) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      triggerAt(rect.left + rect.width / 2, rect.top + rect.height / 2);
    },
    [triggerAt]
  );

  return { bursts, triggerAt, triggerFromEvent };
}

export default function CartParticles({ bursts }: { bursts: Burst[] }) {
  return (
    <div className={styles.container} aria-hidden>
      {bursts.map((burst) => (
        <div
          key={burst.id}
          className={styles.burst}
          style={{ left: burst.x, top: burst.y }}
        >
          {burst.particles.map((p) => (
            <span
              key={p.id}
              className={`${styles.particle} ${styles[p.shape]}`}
              style={{
                '--angle': `${p.angle}deg`,
                '--distance': `${p.distance}px`,
                '--rotation': `${p.rotation}deg`,
                '--size': `${p.size}px`,
                '--delay': `${p.delay}s`,
              } as React.CSSProperties}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
