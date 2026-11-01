// Dev loop: Vite's server for the renderer (hot reload), Electron pointed at it.
// Extra arguments go to Electron: `npm run dev -- --mock`.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { createServer } from 'vite';

const require = createRequire(import.meta.url);
const server = await createServer({ configFile: new URL('../vite.config.ts', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1') });
await server.listen();
const url = 'http://localhost:5173/';
const electron = require('electron'); // the path to its binary
const child = spawn(electron, ['.', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, QUARRY_DEV_URL: url },
});
child.on('exit', async (code) => {
  await server.close();
  process.exit(code ?? 0);
});
