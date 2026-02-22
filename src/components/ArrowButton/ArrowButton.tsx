import styles from './ArrowButton.module.css';

interface Props {
  direction: 'up' | 'down' | 'left' | 'right';
  onClick: () => void;
  label?: string;
  className?: string;
}

const arrows: Record<string, string> = {
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
};

export default function ArrowButton({ direction, onClick, label, className }: Props) {
  const isVertical = direction === 'up' || direction === 'down';

  return (
    <button
      className={`${styles.button} ${styles[direction]} ${isVertical ? styles.vertical : styles.horizontal} ${className || ''}`}
      onClick={onClick}
      aria-label={label || `Navigate ${direction}`}
    >
      <span className={styles.arrow}>{arrows[direction]}</span>
      {label && <span className={styles.label}>{label}</span>}
    </button>
  );
}
