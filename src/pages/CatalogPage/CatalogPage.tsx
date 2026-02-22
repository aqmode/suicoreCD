import { useNavigate } from 'react-router-dom';
import { useSpotify } from '../../context/SpotifyContext';
import styles from './CatalogPage.module.css';

export default function CatalogPage() {
  const { releases, loading } = useSpotify();
  const navigate = useNavigate();

  const albums = releases.filter((r) => r.type === 'album');
  const singles = releases.filter((r) => r.type === 'single');

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h1 className={styles.title}>catalog</h1>
        <p className={styles.subtitle}>all releases by suicore</p>

        {loading ? (
          <div className={styles.loadingWrap}>
            <span className={styles.spinner} />
          </div>
        ) : (
          <>
            {albums.length > 0 && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Albums / EPs</h2>
                <div className={styles.grid}>
                  {albums.map((r) => (
                    <button
                      key={r.id}
                      className={styles.card}
                      onClick={() => navigate(`/release/${r.id}`)}
                    >
                      <div className={styles.cardCover}>
                        <img src={r.coverUrl} alt={r.name} draggable={false} />
                        <div className={styles.cardOverlay} />
                      </div>
                      <div className={styles.cardMeta}>
                        <span className={styles.cardName}>{r.name}</span>
                        <span className={styles.cardYear}>
                          {r.releaseDate?.slice(0, 4)} · {r.totalTracks} tracks
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {singles.length > 0 && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Singles</h2>
                <div className={styles.grid}>
                  {singles.map((r) => (
                    <button
                      key={r.id}
                      className={styles.card}
                      onClick={() => navigate(`/release/${r.id}`)}
                    >
                      <div className={styles.cardCover}>
                        <img src={r.coverUrl} alt={r.name} draggable={false} />
                        <div className={styles.cardOverlay} />
                      </div>
                      <div className={styles.cardMeta}>
                        <span className={styles.cardName}>{r.name}</span>
                        <span className={styles.cardYear}>
                          {r.releaseDate?.slice(0, 4)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {!albums.length && !singles.length && (
              <p className={styles.empty}>No releases found.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
