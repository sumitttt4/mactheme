// identity.json (repo root) is the one place the project's name and
// identifiers live; the bridge's CMake reads it too. This writes the shell's copy.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const identity = JSON.parse(readFileSync(join(here, '..', '..', 'identity.json'), 'utf8'));
const out = `// Generated from identity.json by scripts/sync-identity.mjs. Do not edit.
export const identity = ${JSON.stringify(identity, null, 2)} as const;
`;
writeFileSync(join(here, '..', 'shared', 'identity.ts'), out);
