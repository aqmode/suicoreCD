import {
  useState,
  useEffect,
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle,
  type ReactNode,
} from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSpotify } from '../../context/SpotifyContext';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { getPriceRub } from '../../lib/prices';
import { useSectionScroll } from '../../hooks/useSectionScroll';
import { useIsMobile } from '../../hooks/useMediaQuery';
import AlbumHero from '../../components/AlbumHero/AlbumHero';
import TrackCard from '../../components/TrackCard/TrackCard';
import ArrowButton from '../../components/ArrowButton/ArrowButton';
import sStyles from '../../components/SectionScroll/SectionScroll.module.css';
import type { Track } from '../../types';
import styles from './HomePage.module.css';

interface ScrollHandle {
  scrollTo: (i: number) => void;
}

const SectionScrollWithRef = forwardRef<ScrollHandle, { children: ReactNode[] }>(
  function SectionScrollInner({ children }, ref) {
    const sections = Array.isArray(children) ? children : [children];
    const { current, containerRef, scrollTo } = useSectionScroll(sections.length);

    useImperativeHandle(ref, () => ({ scrollTo }), [scrollTo]);

    return (
      <div ref={containerRef} className={sStyles.container}>
        <div
          className={sStyles.track}
          style={{ transform: `translateY(-${current * 100}vh)` }}
        >
          {sections.map((child, i) => (
            <section key={i} className={sStyles.section}>
              {child}
            </section>
          ))}
        </div>

        {sections.length > 1 && (
          <div className={sStyles.dots}>
            {sections.map((_, i) => (
              <button
                key={i}
                className={`${sStyles.dot} ${i === current ? sStyles.dotActive : ''}`}
                onClick={() => scrollTo(i)}
                aria-label={`Section ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    );
  }
);

const SWIPE_THRESHOLD = 60;

export default function HomePage() {
  const { releaseId } = useParams();
  const navigate = useNavigate();
  const { releases, loading, error, getAlbumTracks } = useSpotify();
  const { user } = useAuth();
  const { addItem, removeItem, items } = useCart();
  const isMobile = useIsMobile();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [tracksError, setTracksError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollHandle>(null);
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const release = releases[currentIndex];
  const isAlbum = release?.type === 'album';
  const releaseInCart = release ? items.some((i) => i.release_id === release.id && !i.track_id) : false;
  const getCartItemForTrack = (trackId: string) =>
    items.find((i) => i.release_id === release?.id && i.track_id === trackId);

  useEffect(() => {
    if (!releases.length) return;
    if (releaseId) {
      const idx = releases.findIndex((r) => r.id === releaseId);
      if (idx >= 0) setCurrentIndex(idx);
    }
  }, [releaseId, releases]);

  const loadTracks = useCallback(async () => {
    const rel = releases[currentIndex];
    if (!rel || rel.type !== 'album') return;
    setTracksLoading(true);
    setTracksError(null);
    try {
      const t = await getAlbumTracks(rel.id);
      setTracks(t);
    } catch (e) {
      setTracks([]);
      setTracksError(e instanceof Error ? e.message : 'Ошибка загрузки треков');
    } finally {
      setTracksLoading(false);
    }
  }, [releases, currentIndex, getAlbumTracks]);

  useEffect(() => {
    if (isAlbum) loadTracks();
    else setTracks([]);
    setTracksError(null);
  }, [isAlbum, loadTracks]);

  const goTo = (idx: number) => {
    if (idx < 0 || idx >= releases.length) return;
    setCurrentIndex(idx);
    scrollRef.current?.scrollTo(0);
    const r = releases[idx];
    if (r) navigate(`/release/${r.id}`, { replace: true });
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      touchEndX.current = e.changedTouches[0].clientX;
      const diff = touchStartX.current - touchEndX.current;
      if (Math.abs(diff) < SWIPE_THRESHOLD) return;
      if (diff > 0) goTo(currentIndex + 1);
      else goTo(currentIndex - 1);
    },
    [currentIndex, goTo]
  );

  if (loading) {
    return (
      <div className={styles.loading}>
        <span className={styles.spinner} />
      </div>
    );
  }

  if (error || !releases.length) {
    return (
      <div className={styles.loading}>
        <p className={styles.errorText}>{error || 'No releases found'}</p>
      </div>
    );
  }

  const priceRub = getPriceRub(release.name);
  const handleAddReleaseToCart = () => {
    if (!user) return;
    addItem(
      { id: release.id, name: release.name, coverUrl: release.coverUrl },
      priceRub
    );
  };
  const handleRemoveReleaseFromCart = () => {
    const item = items.find((i) => i.release_id === release.id && !i.track_id);
    if (item) removeItem(item.id);
  };
  const handleAddTrackToCart = (track: Track) => {
    if (!user) return;
    addItem(
      { id: release.id, name: release.name, coverUrl: release.coverUrl },
      priceRub,
      { id: track.id, name: track.name }
    );
  };
  const handleRemoveTrackFromCart = (trackId: string) => {
    const item = getCartItemForTrack(trackId);
    if (item) removeItem(item.id);
  };

  const heroSection = (
    <div
      key={`hero-wrap-${release.id}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={isMobile ? { touchAction: 'pan-y' } : undefined}
    >
      <AlbumHero
        key={`hero-${release.id}`}
        release={release}
        hasPrev={currentIndex > 0}
        hasNext={currentIndex < releases.length - 1}
        onPrev={() => goTo(currentIndex - 1)}
        onNext={() => goTo(currentIndex + 1)}
        onScrollDown={
          isAlbum
            ? () => {
                if (isMobile && mobileScrollRef.current) {
                  const second = mobileScrollRef.current.children[1];
                  if (second) {
                    (second as HTMLElement).scrollIntoView({
                      behavior: 'smooth',
                      block: 'start',
                    });
                  }
                } else {
                  scrollRef.current?.scrollTo(1);
                }
              }
            : undefined
        }
        onAddToCart={!isAlbum && user ? handleAddReleaseToCart : undefined}
        onRemoveFromCart={!isAlbum ? handleRemoveReleaseFromCart : undefined}
        inCart={!isAlbum && releaseInCart}
        priceRub={isAlbum ? undefined : priceRub}
      />
    </div>
  );

  const trackSection = isAlbum ? (
    <div className={styles.trackSection} key={`tracks-${release.id}`}>
      <div className={styles.trackHeader}>
        <h2 className={styles.trackTitle}>{release.name}</h2>
        <p className={styles.trackSubtitle}>
          {release.totalTracks} tracks · {release.releaseDate?.slice(0, 4)}
        </p>
      </div>

      {tracksLoading ? (
        <div className={styles.trackLoading}>
          <span className={styles.spinner} />
        </div>
      ) : tracks.length > 0 ? (
        <>
          <div className={styles.trackList}>
            {tracks.map((track) => {
              const cartItem = getCartItemForTrack(track.id);
              const inCartTrack = !!cartItem;
              return (
                <TrackCard
                  key={track.id}
                  track={track}
                  coverUrl={release.coverUrl}
                  albumName={release.name}
                  artistName="suicore"
                  priceRub={priceRub}
                  onAddToCart={() => handleAddTrackToCart(track)}
                  onRemoveFromCart={() => handleRemoveTrackFromCart(track.id)}
                  inCart={inCartTrack}
                />
              );
            })}
          </div>
        </>
      ) : (
        <div className={styles.noTracks}>
          <p>{tracksError || 'No tracks available'}</p>
        </div>
      )}

      <div className={styles.arrowUpWrap}>
        <ArrowButton
          direction="up"
          onClick={() => {
            if (isMobile) {
              mobileScrollRef.current?.scrollTo?.({ top: 0, behavior: 'smooth' });
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
              scrollRef.current?.scrollTo(0);
            }
          }}
          label="back"
        />
      </div>
    </div>
  ) : null;

  const sections = trackSection ? [heroSection, trackSection] : [heroSection];

  if (isMobile) {
    return (
      <div ref={mobileScrollRef} className={styles.mobileScroll} key={release?.id}>
        <div className={styles.mobileSection}>{heroSection}</div>
        {trackSection && (
          <div className={styles.mobileSection}>{trackSection}</div>
        )}
      </div>
    );
  }

  return (
    <SectionScrollWithRef ref={scrollRef} key={release?.id}>
      {sections}
    </SectionScrollWithRef>
  );
}
