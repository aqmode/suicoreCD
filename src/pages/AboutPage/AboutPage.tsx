import { useSpotify } from '../../context/SpotifyContext';
import SectionScroll from '../../components/SectionScroll/SectionScroll';
import { useIsMobile } from '../../hooks/useMediaQuery';
import styles from './AboutPage.module.css';

export default function AboutPage() {
  const { artist, releases } = useSpotify();
  const isMobile = useIsMobile();

  const heroSection = (
    <div className={styles.heroInner}>
      <div className={styles.portrait}>
        <img src="/suicore.png" alt="suicore" draggable={false} />
      </div>
      <div className={styles.heroText}>
        <span className={styles.label}>Artist</span>
        <h1 className={styles.name}>{artist?.name || 'suicore'}</h1>
        <p className={styles.genre}>
          {artist?.genres?.length
            ? artist.genres.join(' · ')
            : 'Breakcore · Experimental'}
        </p>
        {artist?.followers !== undefined && artist.followers > 0 && (
          <p className={styles.followers}>
            {artist.followers.toLocaleString()} followers on Spotify
          </p>
        )}
      </div>
    </div>
  );

  const bioSection = (
    <div className={styles.bioInner}>
      <div className={styles.bioBlock}>
        <h2 className={styles.bioTitle}>About</h2>
        <p className={styles.bioText}>
        suicore is an electronic artist pushing the boundaries of Breakcore, Jungle, and Atmospheric DnB. With four years of production under his belt, his journey has been one of constant evolution—moving through the shadows of Ambient, Phonk, and Witch House. Before settling on suicore, he experimented with various identities including SNXSESSQ, socks5, and un!son.
        </p>
        <p className={styles.bioText}>
        After exploding onto the scene via viral TikTok hits, suicore has built a dedicated global following. His live sets are a high-energy journey featuring his biggest tracks, curated underground anthems, and exclusive unreleased material.
        </p>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{releases.length || '—'}</span>
          <span className={styles.statLabel}>Releases</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>
            {releases.filter((r) => r.type === 'album').length || '—'}
          </span>
          <span className={styles.statLabel}>Albums</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>
            {releases.filter((r) => r.type === 'single').length || '—'}
          </span>
          <span className={styles.statLabel}>Singles</span>
        </div>
      </div>

      {artist?.spotifyUrl && (
        <a
          href={artist.spotifyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.spotifyLink}
        >
          Listen on Spotify →
        </a>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <div className={styles.mobileScroll}>
        <div className={styles.mobileSection}>{heroSection}</div>
        <div className={styles.mobileSection}>{bioSection}</div>
      </div>
    );
  }

  return (
    <SectionScroll>
      {[heroSection, bioSection]}
    </SectionScroll>
  );
}
