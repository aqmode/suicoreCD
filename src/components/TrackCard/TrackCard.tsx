import { useState, useRef, useEffect } from 'react';
import styles from './TrackCard.module.css';
import type { Track } from '../../types';
import { formatRub, getDiscountPercent, getPriceWithDiscount } from '../../lib/prices';

interface Props {
  track: Track;
  coverUrl: string;
  albumName: string;
  artistName: string;
  priceRub?: number;
  onAddToCart?: () => void;
  onRemoveFromCart?: () => void;
  inCart?: boolean;
  previewPlayingId?: string | null;
  onPreviewPlay?: (trackId: string) => void;
  onPreviewStop?: () => void;
}

function formatDuration(ms: number): string {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function TrackCard({
  track,
  coverUrl,
  albumName,
  artistName,
  priceRub,
  onAddToCart,
  onRemoveFromCart,
  inCart = false,
  previewPlayingId = null,
  onPreviewPlay,
  onPreviewStop,
}: Props) {
  const handleCartClick = inCart ? onRemoveFromCart : onAddToCart;
  const [isPlaying, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canPreview = Boolean(track.previewUrl);
  const isActive = previewPlayingId === track.id;

  useEffect(() => {
    if (previewPlayingId !== null && previewPlayingId !== track.id && audioRef.current) {
      audioRef.current.pause();
      setPlaying(false);
    }
  }, [previewPlayingId, track.id]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const handlePreviewClick = () => {
    if (!track.previewUrl) return;
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setPlaying(false);
      onPreviewStop?.();
      return;
    }
    if (!audioRef.current) {
      const audio = new Audio(track.previewUrl);
      audioRef.current = audio;
      audio.addEventListener('ended', () => {
        setPlaying(false);
        onPreviewStop?.();
      });
    }
    audioRef.current.play();
    setPlaying(true);
    onPreviewPlay?.(track.id);
  };

  const isSummerDelight = track.name.toLowerCase().includes('summer delight');
  return (
    <div className={styles.row} data-onboarding={isSummerDelight ? 'track-summer-delight' : undefined}>
      <span className={styles.number}>
        {track.trackNumber.toString().padStart(2, '0')}
      </span>

      <div className={styles.coverMini}>
        <img src={coverUrl} alt={track.name} draggable={false} />
      </div>

      {canPreview && (
        <button
          type="button"
          className={styles.previewBtn}
          onClick={handlePreviewClick}
          aria-label={isActive && isPlaying ? 'Остановить превью' : 'Слушать превью (30 сек)'}
          title="Превью 30 сек"
        >
          {isActive && isPlaying ? (
            <span className={styles.iconPause} />
          ) : (
            <span className={styles.iconPlay} />
          )}
        </button>
      )}

      <div className={styles.trackInfo}>
        <span className={styles.trackName}>{track.name}</span>
        <span className={styles.albumArtist}>
          {albumName} · {artistName} · 85г ·   физический CD носитель
        </span>
      </div>

      <span className={styles.duration}>{formatDuration(track.durationMs)}</span>

      <div className={styles.buyCell}>
        <button
          type="button"
          className={styles.buyBtn}
          onClick={handleCartClick}
          disabled={!handleCartClick}
          data-onboarding={isSummerDelight ? 'track-summer-delight-cart' : undefined}
        >
          {inCart
            ? 'В корзине'
            : priceRub != null
              ? getDiscountPercent() > 0
                ? (
                    <span className={styles.priceWrap}>
                      <span className={styles.priceOld}>{formatRub(priceRub)}</span>
                      <span>{formatRub(getPriceWithDiscount(priceRub))}</span>
                    </span>
                  )
                : formatRub(priceRub)
              : '—'}
        </button>
        {!inCart && priceRub != null && getDiscountPercent() > 0 && (
          <span className={styles.discountBadge}>−{getDiscountPercent()}%</span>
        )}
      </div>
    </div>
  );
}
