import { readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = resolve(projectRoot, 'dist');
const basePath = '/My-Portfolio-temporary-';
const escapedBase = basePath.slice(1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const rootUrlPattern = new RegExp(`(href|src)="/(?!/|${escapedBase}/)`, 'g');

for (const file of await findHtmlFiles(outputDir)) {
  const html = await readFile(file, 'utf8');
  const rewritten = html
    .replace(rootUrlPattern, `$1="${basePath}/`)
    .replace(/(['"`])\/(works|news|blog)(?=\/|['"`])/g, `$1${basePath}/$2`);
  if (rewritten !== html) await writeFile(file, rewritten);
}

const robotsPath = resolve(outputDir, 'robots.txt');
const robots = await readFile(robotsPath, 'utf8');
await writeFile(
  robotsPath,
  robots.replace(
    'https://kotaro-ozawa-portfolio.netlify.app/sitemap-index.xml',
    'https://kotaro9967.github.io/My-Portfolio-temporary-/sitemap-index.xml'
  )
);

console.log('GitHub Pagesのサブディレクトリ用URLへ変換しました。');

async function findHtmlFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await findHtmlFiles(path)));
    if (entry.isFile() && entry.name.endsWith('.html')) files.push(path);
  }
  return files;
}