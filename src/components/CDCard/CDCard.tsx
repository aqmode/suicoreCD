import styles from './CDCard.module.css';

interface Props {
  coverUrl: string;
  trackName: string;
  albumName: string;
  artistName: string;
  price?: string;
  onBuy?: () => void;
  inCart?: boolean;
  compact?: boolean;
}

export default function CDCard({
  coverUrl,
  trackName,
  albumName,
  artistName,
  price = '$14.99',
  onBuy,
  inCart = false,
  compact = false,
}: Props) {
  return (
    <article className={`${styles.card} ${compact ? styles.compact : ''}`}>
      <div className={styles.visual}>
        <div className={styles.disc}>
          <div className={styles.discEdge} />
          <div className={styles.discRim} />
          <div className={styles.discArt}>
            <img src={coverUrl} alt={trackName} draggable={false} />
          </div>
          <div className={styles.discSheen} />
          <div className={styles.discGrooves} />
          <div className={styles.discHub}>
            <div className={styles.discClamp} />
            <div className={styles.discHole} />
          </div>
        </div>

        <div className={styles.jewelCase}>
          <div className={styles.caseSpine} />
          <img
            src={coverUrl}
            alt={`${albumName} — ${artistName}`}
            className={styles.coverImage}
            draggable={false}
          />
          <div className={styles.caseShine} />
          <div className={styles.caseEdge} />
        </div>
      </div>

      <div className={styles.info}>
        <span className={styles.format}>CD / Physical</span>
        <h3 className={styles.trackName}>{trackName}</h3>
        <p className={styles.albumName}>{albumName}</p>
        <p className={styles.artistName}>{artistName}</p>

        <div className={styles.divider} />

        <div className={styles.purchase}>
          <span className={styles.price}>{price}</span>
          <button
            type="button"
            className={styles.buyButton}
            onClick={onBuy}
            disabled={!onBuy}
          >
            {inCart ? 'В корзине' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </article>
  );
}
