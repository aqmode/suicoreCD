import styles from './FloatingCharacter.module.css';

export default function FloatingCharacter() {
  return (
    <div className={styles.wrapper}>
      <img
        src="/suicore.png"
        alt=""
        className={styles.image}
        draggable={false}
      />
    </div>
  );
}
