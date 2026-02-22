import { useState, type FormEvent } from 'react';
import { useSpotify } from '../../context/SpotifyContext';
import styles from './ContactPage.module.css';

export default function ContactPage() {
  const { artist } = useSpotify();
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSent(true);
    setTimeout(() => setSent(false), 3000);
  };

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.left}>
          <span className={styles.label}>Get in touch</span>
          <h1 className={styles.title}>contact</h1>
          <p className={styles.desc}>
            For bookings, collaborations, or inquiries about physical releases.
          </p>

          <div className={styles.links}>
            <div className={styles.linkGroup}>
              <span className={styles.linkLabel}>telegram</span>
              <a href="https://t.me/suicoree" className={styles.link}>
                @suicoree
              </a>
            </div>

            {artist?.spotifyUrl && (
              <div className={styles.linkGroup}>
                <span className={styles.linkLabel}>spotify</span>
                <a
                  href={artist.spotifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.link}
                >
                  Open Profile →
                </a>
              </div>
            )}

            <div className={styles.linkGroup}>
              <span className={styles.linkLabel}>bandcamp</span>
              <a
                href="https://suicore.bandcamp.com"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.link}
              >
                suicore.bandcamp.com
              </a>
            </div>

            <div className={styles.linkGroup}>
              <span className={styles.linkLabel}>soundcloud</span>
              <a
                href="https://soundcloud.com/suicore"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.link}
              >
                soundcloud.com/suicore
              </a>
            </div>
          </div>
        </div>

        <div className={styles.right}>
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="name">
                Name
              </label>
              <input
                id="name"
                type="text"
                className={styles.input}
                placeholder="Your name"
                required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="email">
                Telegram
              </label>
              <input
                id="email"
                type="email"
                className={styles.input}
                placeholder="@suicorefan"
                required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="message">
                Message
              </label>
              <textarea
                id="message"
                className={styles.textarea}
                placeholder="Your message..."
                rows={5}
                required
              />
            </div>

            <button type="submit" className={styles.submitBtn} disabled={sent}>
              {sent ? 'Sent' : 'Send Message'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
