import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

// In Electron the preload provides window.lode. In a plain browser (the web
// preview) a stand-in with made-up rows takes its place.
if (!window.lode) await import('./web/mockLode');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
