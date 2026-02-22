import { useEffect, useRef, useState } from "react";
import styles from "./TruckOnRoad.module.css";

const MIN_X = -28;
const MAX_X = 28;
const MIN_SPEED = 0.08;
const MAX_SPEED = 0.22;
const RANDOMIZE_INTERVAL_MS = 800;

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function randomVelocity() {
  const speed = rand(MIN_SPEED, MAX_SPEED);
  return Math.random() > 0.5 ? speed : -speed;
}

interface Props {
  className?: string;
}

export default function TruckOnRoad({ className }: Props) {
  const [x, setX] = useState(0);
  const velRef = useRef(randomVelocity());
  const nextRandomizeRef = useRef(RANDOMIZE_INTERVAL_MS);

  useEffect(() => {
    let rafId: number;
    let last = performance.now();

    const tick = (now: number) => {
      const elapsedMs = now - last;
      last = now;
      nextRandomizeRef.current -= elapsedMs;
      if (nextRandomizeRef.current <= 0) {
        velRef.current = randomVelocity();
        nextRandomizeRef.current = rand(RANDOMIZE_INTERVAL_MS * 0.7, RANDOMIZE_INTERVAL_MS * 1.4);
      }
      const dt = Math.min(elapsedMs / 16, 2);
      setX((prev) => {
        let next = prev + velRef.current * dt;
        if (next <= MIN_X) {
          next = MIN_X;
          velRef.current = rand(MIN_SPEED, MAX_SPEED);
        }
        if (next >= MAX_X) {
          next = MAX_X;
          velRef.current = rand(-MAX_SPEED, -MIN_SPEED);
        }
        return next;
      });
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div className={className ? `${styles.wrap} ${className}` : styles.wrap} aria-hidden>
      <div className={styles.track}>
        <div
          className={styles.truckWrap}
          style={{ transform: `translateX(${x}px)` }}
        >
          <img src="/gruz.png" alt="" className={styles.truckImg} />
          <div className={styles.speedLines} aria-hidden>
            <span className={styles.speedLine} />
            <span className={styles.speedLine} />
            <span className={styles.speedLine} />
          </div>
        </div>
      </div>
    </div>
  );
}
