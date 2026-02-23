import styles from './AlbumHero.module.css';
import type { Release } from '../../types';
import ArrowButton from '../ArrowButton/ArrowButton';
import { formatRub } from '../../lib/prices';

interface Props {
  release: Release;
  onPrev?: () => void;
  onNext?: () => void;
  onScrollDown?: () => void;
  onAddToCart?: () => void;
  onRemoveFromCart?: () => void;
  inCart?: boolean;
  priceRub?: number;
  hasPrev: boolean;
  hasNext: boolean;
}

export default function AlbumHero({
  release,
  onPrev,
  onNext,
  onScrollDown,
  onAddToCart,
  onRemoveFromCart,
  inCart = false,
  priceRub,
  hasPrev,
  hasNext,
}: Props) {
  const isAlbum = release.type === 'album';
  const handleCartClick = inCart ? onRemoveFromCart : onAddToCart;
  const showPurchase = priceRub != null && (onAddToCart || onRemoveFromCart);

  return (
    <div className={styles.hero}>
      {hasPrev && onPrev && (
        <div className={styles.arrowLeft}>
          <ArrowButton direction="left" onClick={onPrev} />
        </div>
      )}

      <div className={styles.content}>
        <div className={styles.coverWrapper}>
          <img
            src={release.coverUrl}
            alt={release.name}
            className={styles.cover}
            draggable={false}
          />
          <div className={styles.coverShine} />
        </div>

        <div className={styles.meta}>
          <span className={styles.type}>
            {release.type === 'album' ? 'Album' : 'Single'}
          </span>
          <h1 className={styles.name}>{release.name}</h1>
          <p className={styles.details}>
            {release.releaseDate?.slice(0, 4)}
            {isAlbum && ` · ${release.totalTracks} tracks`}
          </p>

          {showPurchase && (
            <>
              <div className={styles.divider} />
              <div className={styles.purchase}>
                <span className={styles.price}>{formatRub(priceRub)}</span>
                <button
                  type="button"
                  className={styles.buyButton}
                  onClick={handleCartClick}
                  disabled={!handleCartClick}
                >
                  {inCart ? 'В корзине' : 'Add to Cart'}
                </button>
              </div>
            </>
          )}

          {isAlbum && onScrollDown && (
            <div className={styles.arrowDownInFlow}>
              <ArrowButton direction="down" onClick={onScrollDown} label="tracks" />
            </div>
          )}
        </div>
      </div>

      {hasNext && onNext && (
        <div className={styles.arrowRight}>
          <ArrowButton direction="right" onClick={onNext} />
        </div>
      )}
    </div>
  );
}
