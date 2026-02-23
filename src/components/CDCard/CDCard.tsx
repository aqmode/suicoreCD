import styles from './CDCard.module.css';

interface Props {
  coverUrl: string;
  trackName?: string;
  albumName?: string;
  artistName?: string;
  price?: string;
  onBuy?: () => void;
  inCart?: boolean;
  compact?: boolean;
  /** Only the disc visual, no jewel case and no track name (legacy, prefer visualOnly for track section) */
  discOnly?: boolean;
  /** Full visual (disc + jewel case), but no track name / info block */
  visualOnly?: boolean;
}

export default function CDCard({
  coverUrl,
  trackName = '',
  albumName = '',
  artistName = '',
  price = '$14.99',
  onBuy,
  inCart = false,
  compact = false,
  discOnly = false,
  visualOnly = false,
}: Props) {
  if (discOnly) {
    return (
      <article className={`${styles.card} ${styles.discOnly}`}>
        <div className={styles.visual}>
          <div className={styles.disc}>
            <div className={styles.discEdge} />
            <div className={styles.discRim} />
            <div className={styles.discArt}>
              <img src={coverUrl} alt="" draggable={false} />
            </div>
            <div className={styles.discSheen} />
            <div className={styles.discGrooves} />
            <div className={styles.discHub}>
              <div className={styles.discClamp} />
              <div className={styles.discHole} />
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className={`${styles.card} ${compact ? styles.compact : ''} ${visualOnly ? styles.visualOnly : ''}`}>
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

      {!visualOnly && (
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
      )}
    </article>
  );
}
