import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { createSpotifyMiddleware } from './server/spotify';
import fs from 'node:fs';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      {
        name: 'spa-fallback',
        enforce: 'pre',
        configureServer(server) {
          const fallback = (req: { method?: string; url?: string }, res: { statusCode: number; setHeader: (a: string, b: string) => void; end: (s: string) => void }, next: () => void) => {
            if (req.url == null) return next();
            const method = (req.method ?? 'GET').toUpperCase();
            if (method !== 'GET' && method !== 'POST') return next();
            const pathname = req.url.split('?')[0];
            if (pathname.startsWith('/api') || pathname.startsWith('/@') || pathname.includes('.')) return next();
            const index = path.resolve(server.config.root, 'index.html');
            const html = fs.readFileSync(index, 'utf-8');
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/html');
            server.transformIndexHtml(req.url, html).then((out: string) => res.end(out)).catch((e) => { console.error(e); next(); });
          };
          server.middlewares.use(fallback);
        },
      },
      react(),
      {
        name: 'spotify-api',
        configureServer(server) {
          server.middlewares.use('/api/spotify', createSpotifyMiddleware(env));
        },
      },
    ],
    server: {
      host: '127.0.0.1', // ОСТАВЛЯЕМ ТАК (это сработало!)
      port: 8080,        // ОСТАВЛЯЕМ ТАК (совпадает с туннелем)
      strictPort: true,
      allowedHosts: true, // КРИТИЧНО для работы через IP сервера
      cors: true,
      hmr: false,         // ЛУЧШЕ ВЫКЛЮЧИТЬ (туннели плохо дружат с обновлением «на лету»)
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          bypass: (req) => (req.url?.startsWith('/api/spotify') ? req.url : null),
        },
      },
    },
  };
});