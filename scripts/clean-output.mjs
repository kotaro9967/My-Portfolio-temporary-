import { rm, lstat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Only the generated build output is disposable. Never remove source or repository roots.
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(projectRoot, 'dist');
try {
  if ((await lstat(output)).isSymbolicLink()) throw new Error('dist must not be a symbolic link');
  await rm(output, { recursive: true, force: true });
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
