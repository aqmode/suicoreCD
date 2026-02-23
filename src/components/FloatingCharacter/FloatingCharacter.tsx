import { useState, useEffect } from 'react';
import styles from './FloatingCharacter.module.css';

function isCursorInTopThird(clientY: number): boolean {
  return typeof window !== 'undefined' && clientY < window.innerHeight / 3;
}

export default function FloatingCharacter() {
  const [useHoverImage, setUseHoverImage] = useState(false);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      setUseHoverImage(isCursorInTopThird(e.clientY));
    };
    window.addEventListener('mousemove', handleMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  return (
    <div className={styles.wrapper}>
      <img
        src={useHoverImage ? '/cover_hover.png' : '/suicore.png'}
        alt=""
        className={styles.image}
        draggable={false}
      />
    </div>
  );
}
