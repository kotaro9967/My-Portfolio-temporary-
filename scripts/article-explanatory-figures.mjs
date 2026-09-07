import { createHash } from 'node:crypto';
import { escapeHtml, uploadImage } from './article-visuals.mjs';

// No AI-authored attributes, scripts, remote images or styles enter the renderer.
export function figureDocument(figure) {
  const allowed = new Set(['figure', 'figcaption', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'ol', 'ul', 'li', 'p', 'strong', 'em', 'br', 'a']);
  const inert = figure.replace(/<\/?([a-z][a-z0-9-]*)\b[^>]*>/gi, (tag, name) => {
    name = name.toLowerCase();
    if (!allowed.has(name)) throw new Error(`図表で使用できないタグ: ${name}`);
    if (name === 'a') return ''; // Citation numbers stay visible; links stay in article caption.
    return `<${tag.startsWith('</') ? '/' : ''}${name}>`;
  });
  return `<!doctype html><html lang="ja"><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
<style>*{box-sizing:border-box}body{margin:0;padding:32px;background:#eef3f8;color:#15293d;font:24px/1.6 sans-serif}figure{margin:0;padding:32px;background:white;border-radius:18px;border-top:8px solid #236b80}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{padding:18px;border:2px solid #d7e3eb;overflow-wrap:anywhere;text-align:left}th{background:#e3f1f4}tbody tr:nth-child(even){background:#f5f8fb}ol,ul{margin:0;padding-left:38px}li{padding:14px 18px;margin-bottom:14px;background:#edf5f7;border-radius:10px}li::marker{color:#236b80;font-weight:bold}figcaption{margin-top:24px;padding-top:18px;border-top:2px solid #d7e3eb;font-size:20px;color:#344b60}p{margin:8px 0}</style>${inert}</html>`;
}

export function selectExplanatoryFigures(body) {
  const figures = [...body.matchAll(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi)].map(match => match[0]);
  return figures.filter(figure =>
    /<(?:table|ol|ul)\b/i.test(figure) &&
    /<figcaption\b[^>]*>[\s\S]*?<\/figcaption>/i.test(figure)
  ).slice(0, 2);
}

export async function attachExplanatoryFigures(article, config, { browserType, request = fetch } = {}) {
  const figures = selectExplanatoryFigures(article.body);
  if (!figures.length) return article;
  const chromium = browserType || (await import('playwright')).chromium;
  const browser = await chromium.launch({ headless: true });
  let body = article.body;
  try {
    for (const [index, original] of figures.entries()) {
      const caption = original.match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i)?.[1];
      const context = await browser.newContext({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 1, javaScriptEnabled: false, serviceWorkers: 'block' });
      try {
        await context.route('**/*', route => route.abort());
        const page = await context.newPage();
        await page.setContent(figureDocument(original), { waitUntil: 'load' });
        const target = page.locator('figure');
        const box = await target.boundingBox();
        if (!box || box.height > 2600) throw new Error('説明図が長すぎます。項目を短くしてください。');
        const bytes = await target.screenshot({ type: 'png', animations: 'disabled' });
        const digest = createHash('sha256').update(original).digest('hex').slice(0, 16);
        const url = await uploadImage(bytes, `explanation-${digest}-${index}.png`, config, request);
        // Preserve semantic table/list and working source links for accessibility.
        const replacement = `<figure><img src="${escapeHtml(url)}" alt="本文の比較・手順を整理した説明図。詳細は直後のテキスト版に記載。" width="${Math.ceil(box.width)}" height="${Math.ceil(box.height)}" loading="lazy" decoding="async"><figcaption>${caption}</figcaption></figure><details><summary>図表のテキスト版を読む</summary>${original}</details>`;
        body = body.replace(original, () => replacement);
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
  return { ...article, body };
}
