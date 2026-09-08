import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const result = spawnSync(process.platform === 'win32' ? 'supabase.exe' : 'supabase', ['gen', 'types', 'typescript', '--local', '--schema', 'public'], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
if (result.error) throw result.error;
if (result.status !== 0) { process.stderr.write(result.stderr); process.exit(result.status ?? 1); }
mkdirSync('types', { recursive: true });
writeFileSync('types/database.ts', result.stdout.replace(/^\/\/.*\r?\n/gm, ''));
