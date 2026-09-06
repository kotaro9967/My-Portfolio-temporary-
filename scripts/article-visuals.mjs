import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Render text into our own inert template, never execute AI-authored HTML or JS.
export function sampleHtml(keyword, wireframe = false) {
  const recruitment = /採用|求人|人材/.test(keyword);
  const heading = recruitment ? '仕事と職場の魅力を伝える' : '企業の魅力を、わかりやすく';
  const cards = recruitment ? ['仕事内容', '働く環境', '応募の流れ'] : ['サービス紹介', '企業情報', 'お問い合わせ'];
  return `<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; font-src data:">
  <style>*{box-sizing:border-box}body{margin:0;background:#f4f6fc;color:#273251;font:18px/1.8 sans-serif}header,main,footer{padding:24px 6%}header{background:white;border-bottom:1px solid #c9d0e3;display:flex;justify-content:space-between;gap:20px}small{font-size:14px}main{max-width:1100px;margin:auto}.hero{padding:40px 0}h1{font-size:38px;line-height:1.5;margin:14px 0}h2{font-size:22px}.label{color:#5149bf;font-weight:bold}.cta{display:inline-block;padding:10px 24px;background:#5149bf;color:white;border-radius:8px}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}.card{padding:24px;background:white;border:1px solid #c9d0e3;border-radius:12px}.line{height:10px;background:#dfe4f1;margin:14px 0;max-width:90%}footer{font-size:14px;border-top:1px solid #c9d0e3;margin-top:40px}@media(max-width:600px){h1{font-size:28px}.cards{grid-template-columns:1fr}.hero{padding:20px 0}header{font-size:16px}}${wireframe ? 'body{background:white;color:#333}.card{border:2px dashed #999;border-radius:0}.cta{background:#666;border-radius:0}.label{color:#555}' : ''}</style>
  <header><strong>SAMPLE COMPANY</strong><small>${wireframe ? 'ワイヤーフレーム・設計例' : '自作サンプル・架空の企業'}</small></header>
  <main><section class="hero"><p class="label">${escapeHtml(keyword.slice(0, 80))}</p><h1>${heading}</h1><p>何を提供し、どのような会社なのか。<br>必要な情報を整理して届ける構成例です。</p><span class="cta">${recruitment ? '募集内容を見る' : 'サービスを見る'}</span></section><section class="cards">${cards.map((h) => `<article class="card"><h2>${h}</h2><div class="line"></div><div class="line"></div><p>ここに説明を掲載します。</p></article>`).join('')}</section></main>
  <footer>説明用サンプルです。実在企業のサイト・受託実績ではありません。</footer></html>`;
}

export function validateMediaUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.hostname !== 'images.microcms-assets.io' || url.username || url.password) throw new Error('画像URLがmicroCMSの画像配信URLではありません。');
  return url.href;
}

export async function uploadImage(bytes, name, config, request = fetch) {
  if (!/^[a-z0-9-]+$/.test(config.serviceDomain)) throw new Error('microCMSサービスIDが不正です。');
  if (!bytes.length || bytes.length > 5 * 1024 * 1024) throw new Error('画像サイズが不正です（上限5MB）。');
  const form = new FormData();
  form.append('file', new Blob([bytes], { type: 'image/png' }), name);
  const response = await request(`https://${config.serviceDomain}.microcms-management.io/api/v1/media`, {
    method: 'POST', headers: { 'X-MICROCMS-API-KEY': config.microCMSApiKey }, body: form,
    signal: AbortSignal.timeout(60000), redirect: 'error',
  });
  if (!response.ok) throw new Error(`画像アップロード失敗 (${response.status})。「メディアのアップロード」権限を確認してください。`);
  return validateMediaUrl((await response.json()).url);
}

export function visualFigure(url, caption, width, height) {
  return `<figure><img src="${escapeHtml(validateMediaUrl(url))}" alt="${escapeHtml(caption)}" width="${width}" height="${height}" loading="lazy" decoding="async"><figcaption>${escapeHtml(caption)}</figcaption></figure>`;
}

export async function attachArticleVisuals(article, config, { browserType, request = fetch } = {}) {
  const chromium = browserType || (await import('playwright')).chromium;
  const browser = await chromium.launch({ headless: true });
  const digest = createHash('sha256').update(article.keyword).digest('hex').slice(0, 12);
  const directory = resolve('.article-work', digest);
  await mkdir(directory, { recursive: true });
  const assets = [];
  try {
    for (const preset of [
      { name: 'wireframe', width: 1200, height: 820, wireframe: true, label: 'PC向けのワイヤーフレーム（設計例）' },
      { name: 'sample-pc', width: 1200, height: 820, wireframe: false, label: '自作サンプルのPC表示（幅1200px）' },
      { name: 'sample-mobile', width: 390, height: 1200, wireframe: false, label: '同じ自作サンプルのスマホ表示（幅390px）' },
    ]) {
      const context = await browser.newContext({ viewport: { width: preset.width, height: preset.height }, deviceScaleFactor: 1, locale: 'ja-JP', reducedMotion: 'reduce', serviceWorkers: 'block' });
      try {
        await context.route('**/*', (route) => route.abort());
        const page = await context.newPage();
        await page.setContent(sampleHtml(article.keyword, preset.wireframe), { waitUntil: 'load' });
        await page.evaluate(() => document.fonts.ready);
        const bytes = await page.screenshot({ type: 'png', animations: 'disabled', fullPage: false });
        // Only synthetic screenshots go on disk. No authenticated pages or cookies.
        await writeFile(resolve(directory, `${preset.name}.png`), bytes);
        const url = await uploadImage(bytes, `${digest}-${preset.name}.png`, config, request);
        assets.push({ ...preset, url });
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
  let figures = assets.map((a) => visualFigure(a.url, a.label, a.width, a.height)).join('\n');
  // Optional, explicitly reviewed asset. Never export a browser login session to CI.
  if (/microcms|cms|更新/i.test(article.keyword) && process.env.MICROCMS_REVIEWED_IMAGE_URL) {
    figures += visualFigure(process.env.MICROCMS_REVIEWED_IMAGE_URL, 'microCMSの記事一覧。識別情報・本文などをマスクした確認済みの画面例。', 1363, 936);
  }
  const section = `<h2>画面で見る構成例</h2><p>以下は記事のテーマを説明するための設計例と自作サンプルです。実在企業の制作実績や改善効果を示すものではありません。</p>${figures}`;
  const summary = /<h2\b[^>]*>\s*まとめ\s*<\/h2>/i;
  const body = summary.test(article.body) ? article.body.replace(summary, (m) => `${section}\n${m}`) : `${article.body}\n${section}`;
  return { ...article, body };
}
