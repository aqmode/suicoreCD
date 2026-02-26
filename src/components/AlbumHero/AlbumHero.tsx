import styles from './AlbumHero.module.css';
import type { Release } from '../../types';
import ArrowButton from '../ArrowButton/ArrowButton';
import { formatRub, getDiscountPercent, getPriceWithDiscount } from '../../lib/prices';

function formatDuration(ms: number): string {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface Props {
  release: Release;
  /** Длительность трека в мс — только для синглов, показывается под названием */
  singleTrackDurationMs?: number;
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
  singleTrackDurationMs,
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
  const isSingle = release.type === 'single';
  const handleCartClick = inCart ? onRemoveFromCart : onAddToCart;
  const showPurchase = priceRub != null && (onAddToCart || onRemoveFromCart);
  const showSingleDetails = isSingle && singleTrackDurationMs != null;

  return (
    <div className={styles.hero}>
      <div className={styles.arrowLeftDesktop}>
        {hasPrev && onPrev && <ArrowButton direction="left" onClick={onPrev} />}
      </div>

      <div className={styles.content}>
        <div className={styles.coverArrowsWrap}>
          <div className={styles.arrowLeftMobile}>
            {hasPrev && onPrev && <ArrowButton direction="left" onClick={onPrev} />}
          </div>
          <div className={styles.coverWrapper}>
            <img
              src={release.coverUrl}
              alt={release.name}
              className={styles.cover}
              draggable={false}
            />
            <div className={styles.coverShine} />
          </div>
          <div className={styles.arrowRightMobile}>
            {hasNext && onNext && <ArrowButton direction="right" onClick={onNext} />}
          </div>
        </div>

        <div className={styles.meta}>
          <span className={styles.type}>
            {release.type === 'album' ? 'Album' : 'Single'}
          </span>
          <h1 className={styles.name}>{release.name}</h1>
          {showSingleDetails && (
            <p className={styles.singleDetails}>
              85г · физический CD носитель · {formatDuration(singleTrackDurationMs)}
            </p>
          )}

          {showPurchase && (
            <>
              <div className={styles.divider} />
              <div className={styles.purchase}>
                {getDiscountPercent() > 0 ? (
                  <span className={styles.priceWrap}>
                    <span className={styles.priceOld}>{formatRub(priceRub)}</span>
                    <span className={styles.price}>{formatRub(getPriceWithDiscount(priceRub))}</span>
                  </span>
                ) : (
                  <span className={styles.price}>{formatRub(priceRub)}</span>
                )}
                <div className={styles.purchaseActions}>
                  <button
                    type="button"
                    className={styles.buyButton}
                    onClick={handleCartClick}
                    disabled={!handleCartClick}
                  >
                    {inCart ? 'В корзине' : 'Add to Cart'}
                  </button>
                  {getDiscountPercent() > 0 && (
                    <span className={styles.discountBadge}>−{getDiscountPercent()}%</span>
                  )}
                </div>
              </div>
            </>
          )}

          {isAlbum && onScrollDown && (
            <div className={styles.arrowDownInFlow} data-onboarding="scroll-to-tracks">
              <ArrowButton direction="down" onClick={onScrollDown} label="tracks" />
            </div>
          )}
        </div>
      </div>

      <div className={styles.arrowRightDesktop}>
        {hasNext && onNext && <ArrowButton direction="right" onClick={onNext} />}
      </div>
    </div>
  );
}
