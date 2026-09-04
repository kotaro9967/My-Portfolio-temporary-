import { copyFile, cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = resolve(projectRoot, 'dist');

await mkdir(outputDir, { recursive: true });
let homeHtml = await readFile(resolve(projectRoot, 'index.html'), 'utf8');
// Pages preview commits its generated homepage into the repository root.
// Strip its repository prefix when that homepage is reused by Netlify.
// Only local quoted URLs are changed; external URLs and page design stay intact.
if (process.env.GITHUB_PAGES !== 'true') {
  homeHtml = homeHtml
    .replace(/(["'`])\/My-Portfolio-temporary-\//g, '$1/')
    .replace(/(["'`])\/My-Portfolio-temporary-(?=["'`?#])/g, '$1/');
}
await writeFile(resolve(outputDir, 'index.html'), homeHtml);
await copyFile(resolve(projectRoot, 'support.js'), resolve(outputDir, 'support.js'));
await cp(resolve(projectRoot, 'assets'), resolve(outputDir, 'assets'), {
  recursive: true,
  force: true,
});

console.log('旧トップページのデザインをdistへ復元しました。');
