import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

// The page's Content-Security-Policy: strict in a build (everything from the
// app's own files, nothing remote, no inline script); the dev server needs
// inline styles and its websocket for hot reload.
function csp(): Plugin {
  return {
    name: 'lode-csp',
    transformIndexHtml(html, ctx) {
      const dev = !!ctx.server;
      const policy = [
        "default-src 'none'",
        "script-src 'self'",
        dev ? "style-src 'self' 'unsafe-inline'" : "style-src 'self'",
        "img-src 'self' data:",
        "font-src 'self'",
        dev ? "connect-src 'self' ws://localhost:5173" : "connect-src 'none'",
        "base-uri 'none'",
        "form-action 'none'",
        "frame-src 'none'",
        "object-src 'none'",
      ].join('; ');
      return html.replace('%CSP%', policy);
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), csp()],
  server: { port: 5173, strictPort: true, host: 'localhost' },
  build: { outDir: 'dist', emptyOutDir: true, target: 'es2022', modulePreload: { polyfill: false } },
});
