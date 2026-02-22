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
    fetchInitData()
      .then((data) => {
        setArtist(data.artist);
        setReleases(data.releases);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
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
