import { copyFile, cp, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = resolve(projectRoot, 'dist');

await mkdir(outputDir, { recursive: true });
await copyFile(resolve(projectRoot, 'index.html'), resolve(outputDir, 'index.html'));
await copyFile(resolve(projectRoot, 'support.js'), resolve(outputDir, 'support.js'));
await cp(resolve(projectRoot, 'assets'), resolve(outputDir, 'assets'), {
  recursive: true,
  force: true,
});

console.log('旧トップページのデザインをdistへ復元しました。');
