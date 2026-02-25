import type { Artist, Release, Track } from '../types';

const API = '/api/spotify';

interface InitResponse {
  artist: Artist;
  releases: Release[];
}

interface TracksResponse {
  tracks: Track[];
}

export async function fetchInitData(): Promise<InitResponse> {
  const res = await fetch(`${API}/init`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = (body as { error?: string })?.error || `Spotify init failed: ${res.status}`;
    throw new Error(msg);
  }
  return res.json();
}

export async function fetchAlbumTracks(albumId: string): Promise<Track[]> {
  const res = await fetch(`${API}/album/${albumId}/tracks`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as { error?: string })?.error || `Tracks fetch failed: ${res.status}`;
    throw new Error(msg);
  }
  return (data as TracksResponse).tracks ?? [];
}
