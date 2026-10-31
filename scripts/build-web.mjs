// Cloudflare's build: the launcher's UI as a static web preview (mock data,
// nothing opens), into shell/dist-web, which wrangler.jsonc serves.
// Electron's binary is not needed for that, so it is not downloaded.
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const shell = join(dirname(fileURLToPath(import.meta.url)), '..', 'shell');
const env = { ...process.env, ELECTRON_SKIP_BINARY_DOWNLOAD: '1' };
const run = (cmd) => execSync(cmd, { cwd: shell, env, stdio: 'inherit' });
run('npm ci --no-audit --no-fund');
run('npm run identity');
run('npm run build:web');
