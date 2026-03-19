import { useState, useEffect, useRef } from "react";
import styles from "./CursorFollower.module.css";

const LERP = 0.020;
const REACH_THRESHOLD = 28;
const FLOAT_EXIT_DISTANCE = 150;
const FLOAT_RADIUS = 18;
const FLOAT_SPEED = 0.0003;

function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(bx - ax, by - ay);
}

export default function CursorFollower() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
  const targetRef = useRef({ x: 0, y: 0 });
  const isFloatingRef = useRef(false);
  const floatCenterRef = useRef({ x: 0, y: 0 });
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      targetRef.current = { x: e.clientX, y: e.clientY };
      setCursorPos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", onMove, { passive: true });

    const tick = () => {
      const target = targetRef.current;
      timeRef.current += 16;

      setPos((prev) => {
        if (isFloatingRef.current) {
          const cursorLeftArea = dist(target.x, target.y, floatCenterRef.current.x, floatCenterRef.current.y);
          if (cursorLeftArea > FLOAT_EXIT_DISTANCE) {
            isFloatingRef.current = false;
          }
          const t = timeRef.current * FLOAT_SPEED;
          const dx = Math.cos(t) * FLOAT_RADIUS;
          const dy = Math.sin(t * 1.3) * FLOAT_RADIUS;
          return {
            x: floatCenterRef.current.x + dx,
            y: floatCenterRef.current.y + dy,
          };
        }

        const nextX = prev.x + (target.x - prev.x) * LERP;
        const nextY = prev.y + (target.y - prev.y) * LERP;
        const nextD = dist(nextX, nextY, target.x, target.y);

        if (nextD < REACH_THRESHOLD) {
          isFloatingRef.current = true;
          floatCenterRef.current = { x: target.x, y: target.y };
          const t = timeRef.current * FLOAT_SPEED;
          const dx = Math.cos(t) * FLOAT_RADIUS;
          const dy = Math.sin(t * 1.3) * FLOAT_RADIUS;
          return { x: target.x + dx, y: target.y + dy };
        }

        return { x: nextX, y: nextY };
      });

      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <>
      {/* Small precise cursor dot */}
      <div
        className={styles.cursorDot}
        style={{
          transform: `translate(calc(${cursorPos.x}px - 50%), calc(${cursorPos.y}px - 50%))`,
        }}
        aria-hidden
      />
      {/* Large floating follower */}
      <div
        className={styles.circle}
        style={{
          transform: `translate(calc(${pos.x}px - 50%), calc(${pos.y}px - 50%))`,
        }}
        aria-hidden
      />
    </>
  );
}
