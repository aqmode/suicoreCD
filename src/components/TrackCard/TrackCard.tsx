import styles from './TrackCard.module.css';
import type { Track } from '../../types';
import { formatRub } from '../../lib/prices';

interface Props {
  track: Track;
  coverUrl: string;
  albumName: string;
  artistName: string;
  priceRub?: number;
  onAddToCart?: () => void;
  onRemoveFromCart?: () => void;
  inCart?: boolean;
}

function formatDuration(ms: number): string {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function TrackCard({ track, coverUrl, albumName, artistName, priceRub, onAddToCart, onRemoveFromCart, inCart = false }: Props) {
  const handleCartClick = inCart ? onRemoveFromCart : onAddToCart;

  return (
    <div className={styles.row}>
      <span className={styles.number}>
        {track.trackNumber.toString().padStart(2, '0')}
      </span>

      <div className={styles.coverMini}>
        <img src={coverUrl} alt={track.name} draggable={false} />
      </div>

      <div className={styles.trackInfo}>
        <span className={styles.trackName}>{track.name}</span>
        <span className={styles.albumArtist}>
          {albumName} · {artistName}
        </span>
      </div>

      <span className={styles.duration}>{formatDuration(track.durationMs)}</span>

      <button
        type="button"
        className={styles.buyBtn}
        onClick={handleCartClick}
        disabled={!handleCartClick}
      >
        {inCart ? 'В корзине' : (priceRub != null ? formatRub(priceRub) : '—')}
      </button>
    </div>
  );
}
