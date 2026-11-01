import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

// The page's Content-Security-Policy: strict in a build (everything from the
// app's own files, nothing remote, no inline script); the dev server needs
// inline styles and its websocket for hot reload. One inline style is let in
// by its hash: the canvas layout Paper Shaders injects (landing page only;
// @paper-design/shaders 0.0.81, shader-mount.js `defaultStyle`). A new
// version of the library may change it: the console then names the new hash.
const PAPER_SHADERS_STYLE = "'sha256-bcX2M6hOeEgeI9Ttj3KtXWZuoRsKenyQAlXswSnLakA='";
function csp(): Plugin {
  return {
    name: 'quarry-csp',
    transformIndexHtml(html, ctx) {
      const dev = !!ctx.server;
      const policy = [
        "default-src 'none'",
        "script-src 'self'",
        dev ? "style-src 'self' 'unsafe-inline'" : `style-src 'self' ${PAPER_SHADERS_STYLE}`,
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
