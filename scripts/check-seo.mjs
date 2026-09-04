import assert from 'node:assert/strict';
import { readdir, readFile, access } from 'node:fs/promises';
import { resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { seo, canonicalUrl } from '../config/seo.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../dist');
const titles = new Set();
const errors = [];
const files = await htmlFiles(root);
for (const file of files) {
  const html = await readFile(file, 'utf8');
  const path = '/' + relative(root, file).replaceAll('\\', '/');
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1];
  const canonical = html.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/i)?.[1];
  if (!title || titles.has(title)) errors.push(`${path}: missing/duplicate title`);
  titles.add(title);
  if (!/<meta\b[^>]*name="description"[^>]*content="[^"]+"/i.test(html)) errors.push(`${path}: missing description`);
  if (canonical !== canonicalUrl(path)) errors.push(`${path}: incorrect canonical ${canonical}`);
  if ((html.match(/<h1\b/gi) || []).length !== 1) errors.push(`${path}: expected one H1`);
  if (!/<html\b[^>]*lang="ja"/i.test(html)) errors.push(`${path}: missing language`);
  if (path === '/404.html' && !/content="noindex, follow"/.test(html)) errors.push(`${path}: missing noindex`);
  for (const match of html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    try { JSON.parse(match[1]); } catch { errors.push(`${path}: invalid JSON-LD`); }
  }
  for (const match of html.matchAll(/<a\b[^>]*href="(\/[^"?#]*)[^\"]*"/gi)) {
    let target = match[1];
    if (target.startsWith('//')) continue;
    if (target === seo.pagesBase || target.startsWith(seo.pagesBase + '/')) target = target.slice(seo.pagesBase.length) || '/';
    if (/\.[a-z0-9]+$/i.test(target)) continue;
    try { await access(resolve(root, '.' + target, 'index.html')); }
    catch { errors.push(`${path}: broken internal link ${match[1]}`); }
  }
}
const sitemap = await readFile(resolve(root, 'sitemap-0.xml'), 'utf8');
assert.ok(!sitemap.includes('/404.html'), '404 must not be in sitemap');
assert.ok(!sitemap.includes('github.io'), 'Sitemap and canonical origins must match');
assert.ok(sitemap.includes(canonicalUrl('/services/')), 'Service page missing from sitemap');
for (const file of files) {
  const path = '/' + relative(root, file).replaceAll('\\', '/');
  if (path !== '/404.html' && !sitemap.includes(canonicalUrl(path))) errors.push(`${path}: missing from sitemap`);
}
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(`SEO checks passed: ${files.length} pages (titles, descriptions, canonicals, H1, language, JSON-LD, internal links, sitemap).`);

async function htmlFiles(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) found.push(...await htmlFiles(path));
    else if (entry.name.endsWith('.html')) found.push(path);
  }
  return found;
}
