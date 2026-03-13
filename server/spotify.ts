import { ProxyAgent, fetch as proxyFetch } from 'undici';
import type { ServerResponse } from 'node:http';
import type { IncomingMessage } from 'node:http';

// ===================== Spotify helpers =====================

interface TokenData {
  token: string;
  expiresAt: number;
}

let cached: TokenData | null = null;

async function getAccessToken(
  clientId: string,
  clientSecret: string,
  dispatcher?: ProxyAgent,
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
  const text = await res.text();
  let data: { access_token: string; expires_in: number };
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Spotify token: non-JSON (${res.status}): "${text.slice(0, 120)}"`);
  }
  if (!res.ok || !data.access_token) {
    throw new Error(`Spotify token error ${res.status}: ${text.slice(0, 200)}`);
  }
  cached = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 120) * 1000,
  };
  return cached.token;
}

async function spotifyGet(
  path: string,
  token: string,
  dispatcher?: ProxyAgent,
): Promise<unknown> {
  const opts: Parameters<typeof proxyFetch>[1] = {
    headers: { Authorization: `Bearer ${token}` },
  };
  if (dispatcher) opts.dispatcher = dispatcher;
  const res = await proxyFetch(`https://api.spotify.com/v1${path}`, opts);
  const text = await res.text();
  let data: Record<string, unknown> & {
    error?: { status: number; message: string };
  };
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `Spotify API non-JSON (${res.status}): "${text.slice(0, 120)}"`,
    );
  }
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || `Spotify API ${res.status}`);
  }
  return data;
}

// ===================== iTunes / Apple Music helpers =====================

const ITUNES_SEARCH = 'https://itunes.apple.com/search';
const ITUNES_LOOKUP = 'https://itunes.apple.com/lookup';
const ITUNES_ARTIST_ID_DEFAULT = '1854816148'; // suicore

interface ITunesAlbumResult {
  wrapperType: string;
  collectionType?: string;
  artistId: number;
  collectionId: number;
  artistName: string;
  collectionName: string;
  collectionViewUrl: string;
  artworkUrl100: string;
  trackCount: number;
  releaseDate: string;
  primaryGenreName: string;
}

interface ITunesTrackResult {
  wrapperType: string;
  kind?: string;
  trackId: number;
  trackName: string;
  trackNumber: number;
  trackTimeMillis: number;
  previewUrl?: string;
  trackViewUrl?: string;
  artworkUrl100?: string;
}

function itunesCoverHiRes(url100: string): string {
  return url100.replace(/\/\d+x\d+bb\./, '/600x600bb.');
}

async function itunesFetchJson(url: string): Promise<unknown> {
  const res = await globalThis.fetch(url);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`iTunes non-JSON (${res.status}): ${text.slice(0, 120)}`);
  }
}

async function itunesGetAlbums(artistId: string): Promise<ITunesAlbumResult[]> {
  const url = `${ITUNES_SEARCH}?term=suicore&entity=album&limit=50`;
  const data = (await itunesFetchJson(url)) as {
    results: ITunesAlbumResult[];
  };
  const id = Number(artistId);
  return (data.results || []).filter(
    (r) => r.wrapperType === 'collection' && r.artistId === id,
  );
}

async function itunesGetTracks(
  collectionId: string,
): Promise<ITunesTrackResult[]> {
  const url = `${ITUNES_LOOKUP}?id=${collectionId}&entity=song`;
  const data = (await itunesFetchJson(url)) as {
    results: (ITunesAlbumResult | ITunesTrackResult)[];
  };
  return (data.results || []).filter(
    (r) =>
      r.wrapperType === 'track' && (r as ITunesTrackResult).kind === 'song',
  ) as ITunesTrackResult[];
}

// ===================== Spotify types =====================

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

// ===================== Common state =====================

const ARTIST_NAME = 'suicore';
let SPOTIFY_ARTIST_ID = '2zobmVGWd0dM0Ly5uadjMx';
let ITUNES_ARTIST_ID = ITUNES_ARTIST_ID_DEFAULT;

let artistCache: { artist: unknown; releases: unknown[] } | null = null;
const trackCaches = new Map<string, unknown>();
/** true when init loaded via iTunes (album ids are numeric iTunes collectionIds) */
let usingItunes = false;

/** PROXY=host:port:user:pass -> http://user:pass@host:port */
function proxyEnvToUrl(proxy: string): string {
  const s = proxy.trim();
  if (!s) return '';
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  const parts = s.split(':');
  if (parts.length >= 4) {
    const [host, port, user, ...passParts] = parts;
    const pass = passParts.join(':');
    return `http://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}`;
  }
  if (parts.length >= 2) return `http://${parts[0]}:${parts[1]}`;
  return '';
}

// ===================== Middleware =====================

export function createSpotifyMiddleware(
  env: Record<string, string>,
): (req: IncomingMessage, res: ServerResponse, next: () => void) => void {
  const clientId = env.SPOTIFY_CLIENT_ID || '';
  const clientSecret = env.SPOTIFY_CLIENT_SECRET || '';
  SPOTIFY_ARTIST_ID = env.SPOTIFY_ARTIST_ID || SPOTIFY_ARTIST_ID || '';
  ITUNES_ARTIST_ID = env.ITUNES_ARTIST_ID || ITUNES_ARTIST_ID;

  const proxyUrl =
    proxyEnvToUrl(env.PROXY || '') || env.SPOTIFY_PROXY || '';
  if (proxyUrl) {
    const safe = proxyUrl.replace(/:([^:@]+)@/, ':***@');
    console.log('[Spotify] Using proxy:', safe);
  }

  let dispatcher: ProxyAgent | undefined;
  if (proxyUrl) {
    try {
      const parsed = new URL(proxyUrl);
      const token = Buffer.from(
        `${decodeURIComponent(parsed.username)}:${decodeURIComponent(parsed.password)}`,
      ).toString('base64');
      dispatcher = new ProxyAgent({
        uri: `${parsed.protocol}//${parsed.host}`,
        token: `Basic ${token}`,
      });
    } catch {
      dispatcher = new ProxyAgent(proxyUrl);
    }
  }

  const hasSpotify = !!(clientId && clientSecret);

  return async (
    req: IncomingMessage,
    res: ServerResponse,
    next: () => void,
  ) => {
    const url = req.url || '';

    if (url === '/init') {
      return handleInit(
        hasSpotify ? clientId : '',
        hasSpotify ? clientSecret : '',
        dispatcher,
        res,
      );
    }

    const trackMatch = url.match(/^\/album\/([^/]+)\/tracks$/);
    if (trackMatch) {
      return handleAlbumTracks(
        trackMatch[1],
        hasSpotify ? clientId : '',
        hasSpotify ? clientSecret : '',
        dispatcher,
        res,
      );
    }

    next();
  };
}

// ===================== /init =====================

async function handleInit(
  clientId: string,
  clientSecret: string,
  dispatcher: ProxyAgent | undefined,
  res: ServerResponse,
) {
  try {
    if (artistCache) {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(artistCache));
      return;
    }

    // --- Try Spotify first ---
    if (clientId && clientSecret) {
      try {
        const result = await spotifyInit(clientId, clientSecret, dispatcher);
        if (result) {
          artistCache = result;
          usingItunes = false;
          console.log('[Spotify] Init OK via Spotify API');
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
          return;
        }
      } catch (e) {
        console.warn(
          '[Spotify] API failed, falling back to iTunes:',
          (e as Error).message,
        );
      }
    }

    // --- iTunes fallback ---
    const result = await itunesInit();
    artistCache = result;
    usingItunes = true;
    console.log('[Spotify] Init OK via iTunes API (fallback)');
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result));
  } catch (err) {
    console.error('[Spotify] Init error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error:
          'Failed to fetch releases. ' +
          (err instanceof Error ? err.message : ''),
      }),
    );
  }
}

async function spotifyInit(
  clientId: string,
  clientSecret: string,
  dispatcher: ProxyAgent | undefined,
): Promise<{ artist: unknown; releases: unknown[] } | null> {
  const token = await getAccessToken(clientId, clientSecret, dispatcher);
  let artist: SpotifyArtist | null = null;

  if (SPOTIFY_ARTIST_ID) {
    artist = (await spotifyGet(
      `/artists/${SPOTIFY_ARTIST_ID}`,
      token,
      dispatcher,
    )) as SpotifyArtist;
  }

  if (!artist) {
    const searchData = (await spotifyGet(
      `/search?q=${encodeURIComponent(ARTIST_NAME)}&type=artist&limit=5`,
      token,
      dispatcher,
    )) as { artists: { items: SpotifyArtist[] } };
    artist = searchData.artists?.items?.[0] ?? null;
  }

  if (!artist) return null;
  if (!SPOTIFY_ARTIST_ID && artist.id) SPOTIFY_ARTIST_ID = artist.id;

  const albumsData = (await spotifyGet(
    `/artists/${artist.id}/albums?include_groups=album,single&market=US&limit=50`,
    token,
    dispatcher,
  )) as { items: SpotifyAlbumItem[] };

  const seen = new Set<string>();
  const releases = (albumsData.items || [])
    .filter((a) => {
      const k = a.name.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .map((a) => ({
      id: a.id,
      name: a.name,
      type: a.total_tracks > 1 ? 'album' : ('single' as const),
      coverUrl: a.images?.[0]?.url || '',
      releaseDate: a.release_date,
      totalTracks: a.total_tracks,
      spotifyUrl: a.external_urls?.spotify || '',
    }));

  return {
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
}

async function itunesInit(): Promise<{
  artist: unknown;
  releases: unknown[];
}> {
  const albums = await itunesGetAlbums(ITUNES_ARTIST_ID);
  const cleanName = (n: string) =>
    n.replace(/\s*-\s*Single$/i, '').trim();

  const seen = new Set<string>();
  const releases = albums
    .filter((a) => {
      const k = cleanName(a.collectionName).toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort(
      (a, b) =>
        new Date(b.releaseDate).getTime() -
        new Date(a.releaseDate).getTime(),
    )
    .map((a) => ({
      id: String(a.collectionId),
      name: cleanName(a.collectionName),
      type: a.trackCount > 1 ? 'album' : ('single' as const),
      coverUrl: itunesCoverHiRes(a.artworkUrl100 || ''),
      releaseDate: a.releaseDate?.split('T')[0] || '',
      totalTracks: a.trackCount,
      spotifyUrl: a.collectionViewUrl || '',
    }));

  return {
    artist: {
      id: ITUNES_ARTIST_ID,
      name: 'suicore',
      image: releases[0]?.coverUrl || '',
      genres: ['Electronic'],
      followers: 0,
      spotifyUrl: `https://music.apple.com/us/artist/suicore/${ITUNES_ARTIST_ID}`,
    },
    releases,
  };
}

// ===================== /album/:id/tracks =====================

async function handleAlbumTracks(
  albumId: string,
  clientId: string,
  clientSecret: string,
  dispatcher: ProxyAgent | undefined,
  res: ServerResponse,
) {
  try {
    if (trackCaches.has(albumId)) {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(trackCaches.get(albumId)));
      return;
    }

    // Spotify tracks if init was via Spotify
    if (!usingItunes && clientId && clientSecret) {
      try {
        const result = await spotifyTracks(
          albumId,
          clientId,
          clientSecret,
          dispatcher,
        );
        trackCaches.set(albumId, result);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(result));
        return;
      } catch (e) {
        console.warn(
          '[Spotify] Tracks via Spotify failed, trying iTunes:',
          (e as Error).message,
        );
      }
    }

    // iTunes tracks
    const result = await itunesTracks(albumId);
    trackCaches.set(albumId, result);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result));
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to fetch tracks';
    console.error('[Spotify] Tracks error:', albumId, message);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: message }));
  }
}

async function spotifyTracks(
  albumId: string,
  clientId: string,
  clientSecret: string,
  dispatcher: ProxyAgent | undefined,
): Promise<{ tracks: unknown[] }> {
  const token = await getAccessToken(clientId, clientSecret, dispatcher);
  const data = (await spotifyGet(
    `/albums/${albumId}/tracks?limit=50`,
    token,
    dispatcher,
  )) as { items?: SpotifyTrackItem[] };
  return {
    tracks: (data.items ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      trackNumber: t.track_number,
      durationMs: t.duration_ms,
      previewUrl: t.preview_url || '',
      spotifyUrl: t.external_urls?.spotify || '',
    })),
  };
}

async function itunesTracks(
  collectionId: string,
): Promise<{ tracks: unknown[] }> {
  const items = await itunesGetTracks(collectionId);
  return {
    tracks: items.map((t) => ({
      id: String(t.trackId),
      name: t.trackName,
      trackNumber: t.trackNumber,
      durationMs: t.trackTimeMillis,
      previewUrl: t.previewUrl || '',
      spotifyUrl: t.trackViewUrl || '',
    })),
  };
}
