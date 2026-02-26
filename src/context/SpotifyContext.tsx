import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { fetchInitData, fetchAlbumTracks } from '../api/spotify';
import type { Artist, Release, Track } from '../types';

interface SpotifyState {
  artist: Artist | null;
  releases: Release[];
  loading: boolean;
  error: string | null;
  getAlbumTracks: (albumId: string) => Promise<Track[]>;
}

const SpotifyContext = createContext<SpotifyState>({
  artist: null,
  releases: [],
  loading: true,
  error: null,
  getAlbumTracks: async () => [],
});

export function SpotifyProvider({ children }: { children: ReactNode }) {
  const [artist, setArtist] = useState<Artist | null>(null);
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trackCache, setTrackCache] = useState<Record<string, Track[]>>({});

  useEffect(() => {
    const TIMEOUT_MS = 10000;
    let cancelled = false;
    const timeoutId = setTimeout(() => {
      if (cancelled) return;
      setError(
        'Превышено время ожидания. Проверьте, что API запущен (npm run api), и перезагрузите страницу.'
      );
      setLoading(false);
    }, TIMEOUT_MS);

    fetchInitData()
      .then((data) => {
        if (cancelled) return;
        setArtist(data.artist);
        setReleases(data.releases);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) {
          clearTimeout(timeoutId);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, []);

  const getAlbumTracks = useCallback(
    async (albumId: string) => {
      if (trackCache[albumId]) return trackCache[albumId];
      const tracks = await fetchAlbumTracks(albumId);
      setTrackCache((prev) => ({ ...prev, [albumId]: tracks }));
      return tracks;
    },
    [trackCache]
  );

  return (
    <SpotifyContext.Provider value={{ artist, releases, loading, error, getAlbumTracks }}>
      {children}
    </SpotifyContext.Provider>
  );
}

export function useSpotify() {
  return useContext(SpotifyContext);
}
