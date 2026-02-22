import { ProxyAgent, fetch as proxyFetch } from 'undici';
import type { Connect } from 'vite';

interface TokenData {
  token: string;
  expiresAt: number;
}

let cached: TokenData | null = null;

async function getAccessToken(
  clientId: string,
  clientSecret: string,
  dispatcher?: ProxyAgent
): Promise<string> {
  if (cached && Date.now() < cached.expiresAt) return cached.token;

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const opts: Parameters<typeof proxyFetch>[1] = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${auth}`,
    },
    body: 'grant_type=client_credentials',
  };
  if (dispatcher) opts.dispatcher = dispatcher;

  const res = await proxyFetch('https://accounts.spotify.com/api/token', opts);

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cached = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 120) * 1000,
  };
  return cached.token;
}

async function spotifyGet(
  path: string,
  token: string,
  dispatcher?: ProxyAgent
): Promise<unknown> {
  const opts: Parameters<typeof proxyFetch>[1] = {
    headers: { Authorization: `Bearer ${token}` },
  };
  if (dispatcher) opts.dispatcher = dispatcher;

  const res = await proxyFetch(`https://api.spotify.com/v1${path}`, opts);
  const data = (await res.json()) as Record<string, unknown> & { error?: { status: number; message: string } };
  if (!res.ok || data.error) {
    const msg = data.error?.message || `Spotify API ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

interface SpotifyImage {
  url: string;
  width: number;
  height: number;
}

interface SpotifyArtist {
  id: string;
  name: string;
  images: SpotifyImage[];
  genres: string[];
  followers: { total: number };
  external_urls: { spotify: string };
}

interface SpotifyAlbumItem {
  id: string;
  name: string;
  album_type: string;
  images: SpotifyImage[];
  release_date: string;
  total_tracks: number;
  external_urls: { spotify: string };
}

interface SpotifyTrackItem {
  id: string;
  name: string;
  track_number: number;
  duration_ms: number;
  preview_url: string | null;
  external_urls: { spotify: string };
}

const ARTIST_NAME = 'suicore';

let artistCache: { artist: unknown; releases: unknown[] } | null = null;
const trackCaches = new Map<string, unknown>();

/** Преобразует PROXY=host:port:user:pass в URL для ProxyAgent (pass может содержать ':') */
function proxyEnvToUrl(proxy: string): string {
  const s = proxy.trim();
  if (!s) return '';
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  const parts = s.split(':');
  if (parts.length >= 4) {
    const [host, port, user, ...passParts] = parts;
    const pass = passParts.join(':');
    const auth = encodeURIComponent(user) + ':' + encodeURIComponent(pass);
    return `http://${auth}@${host}:${port}`;
  }
  if (parts.length >= 2) return `http://${parts[0]}:${parts[1]}`;
  return '';
}

export function createSpotifyMiddleware(env: Record<string, string>): Connect.NextHandleFunction {
  const clientId = env.SPOTIFY_CLIENT_ID || '';
  const clientSecret = env.SPOTIFY_CLIENT_SECRET || '';
  // PROXY=host:port:user:pass имеет приоритет; иначе SPOTIFY_PROXY (полный URL)
  const proxyUrl = proxyEnvToUrl(env.PROXY || '') || env.SPOTIFY_PROXY || '';

  if (proxyUrl) {
    const safe = proxyUrl.replace(/:([^:@]+)@/, ':***@');
    console.log('[Spotify] Using proxy:', safe);
  }
  const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;

  return async (req, res, next) => {
    const url = req.url || '';

    if (url === '/init') {
      return handleInit(clientId, clientSecret, dispatcher, res);
    }

    const trackMatch = url.match(/^\/album\/([^/]+)\/tracks$/);
    if (trackMatch) {
      return handleAlbumTracks(trackMatch[1], clientId, clientSecret, dispatcher, res);
    }

    next();
  };
}

async function handleInit(
  clientId: string,
  clientSecret: string,
  dispatcher: ProxyAgent | undefined,
  res: Connect.ServerResponse
) {
  try {
    if (artistCache) {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(artistCache));
      return;
    }

    const token = await getAccessToken(clientId, clientSecret, dispatcher);

    const searchData = (await spotifyGet(
      `/search?q=${encodeURIComponent(ARTIST_NAME)}&type=artist&limit=5`,
      token,
      dispatcher
    )) as { artists: { items: SpotifyArtist[] } };

    const artist = searchData.artists?.items?.[0];
    if (!artist) {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'Artist not found' }));
      return;
    }

    const albumsData = (await spotifyGet(
      `/artists/${artist.id}/albums?include_groups=album,single&market=US&limit=50`,
      token,
      dispatcher
    )) as { items: SpotifyAlbumItem[] };

    const seen = new Set<string>();
    const releases = (albumsData.items || [])
      .filter((a) => {
        const key = a.name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((a) => ({
        id: a.id,
        name: a.name,
        type: a.total_tracks > 1 ? 'album' : 'single',
        coverUrl: a.images?.[0]?.url || '',
        releaseDate: a.release_date,
        totalTracks: a.total_tracks,
        spotifyUrl: a.external_urls?.spotify || '',
      }));

    const result = {
      artist: {
        id: artist.id,
        name: artist.name,
        image: artist.images?.[0]?.url || '',
        genres: artist.genres || [],
        followers: artist.followers?.total || 0,
        spotifyUrl: artist.external_urls?.spotify || '',
      },
      releases,
    };

    artistCache = result;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result));
  } catch (err) {
    console.error('[Spotify] Init error:', err);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Failed to fetch data from Spotify' }));
  }
}

async function handleAlbumTracks(
  albumId: string,
  clientId: string,
  clientSecret: string,
  dispatcher: ProxyAgent | undefined,
  res: Connect.ServerResponse
) {
  try {
    if (trackCaches.has(albumId)) {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(trackCaches.get(albumId)));
      return;
    }

    const token = await getAccessToken(clientId, clientSecret, dispatcher);
    const data = (await spotifyGet(
      `/albums/${albumId}/tracks?limit=50`,
      token,
      dispatcher
    )) as { items?: SpotifyTrackItem[] };

    const items = data.items ?? [];
    const tracks = items.map((t) => ({
      id: t.id,
      name: t.name,
      trackNumber: t.track_number,
      durationMs: t.duration_ms,
      previewUrl: t.preview_url || '',
      spotifyUrl: t.external_urls?.spotify || '',
    }));

    const result = { tracks };
    trackCaches.set(albumId, result);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch tracks';
    console.error('[Spotify] Tracks error:', albumId, message);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: message }));
  }
}
