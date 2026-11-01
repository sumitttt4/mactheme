import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

// In Electron the preload provides window.quarry and the launcher is the whole
// window. In a plain browser (the Cloudflare site) a stand-in with sample
// data takes its place, and the launcher sits inside the landing page.
let page: ReactNode = <App />;
if (!window.quarry) {
  await import('./web/mockQuarry');
  const { Landing } = await import('./web/Landing');
  page = <Landing />;
}

createRoot(document.getElementById('root')!).render(<StrictMode>{page}</StrictMode>);
