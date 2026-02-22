export interface Artist {
  id: string;
  name: string;
  image: string;
  genres: string[];
  followers: number;
  spotifyUrl: string;
}

export interface Release {
  id: string;
  name: string;
  type: 'album' | 'single';
  coverUrl: string;
  releaseDate: string;
  totalTracks: number;
  spotifyUrl: string;
  tracks?: Track[];
}

export interface Track {
  id: string;
  name: string;
  trackNumber: number;
  durationMs: number;
  previewUrl: string;
  spotifyUrl: string;
}
