import { useState, useRef, useEffect } from 'react';
import styles from './FloatingCharacter.module.css';

export default function FloatingCharacter() {
  const [useHoverImage, setUseHoverImage] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const el = wrapperRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const inBounds =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      const topThirdBottom = rect.top + rect.height / 3;
      const inTopThird = inBounds && e.clientY < topThirdBottom;
      setUseHoverImage(inTopThird);
    };
    window.addEventListener('mousemove', handleMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      <img
        src={useHoverImage ? '/cover_hover.png' : '/suicore.png'}
        alt=""
        className={styles.image}
        draggable={false}
      />
    </div>
  );
}
