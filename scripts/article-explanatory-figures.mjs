import { createHash } from 'node:crypto';
import { escapeHtml, uploadImage, insertVisualSection } from './article-visuals.mjs';

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
<style>*{box-sizing:border-box}body{margin:0;padding:32px;background:#eef3f8;color:#15293d;font:24px/1.6 "Noto Sans CJK JP","Noto Sans JP","Yu Gothic",Meiryo,sans-serif}figure{margin:0;padding:32px;background:white;border-radius:18px;border-top:8px solid #236b80}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{padding:18px;border:2px solid #d7e3eb;overflow-wrap:anywhere;text-align:left}th{background:#e3f1f4}tbody tr:nth-child(even){background:#f5f8fb}ol,ul{margin:0;padding-left:38px}li{padding:14px 18px;margin-bottom:14px;background:#edf5f7;border-radius:10px}li::marker{color:#236b80;font-weight:bold}figcaption{margin-top:24px;padding-top:18px;border-top:2px solid #d7e3eb;font-size:20px;color:#344b60}p{margin:8px 0}</style>${inert}</html>`;
}

export function validateEvidenceChart(chart, research) {
  if (!chart?.enabled) return null;
  if (chart.type !== 'bar' || !Array.isArray(chart.labels) || !Array.isArray(chart.values) ||
      chart.labels.length < 2 || chart.labels.length > 6 || chart.labels.length !== chart.values.length) return null;
  if (!chart.labels.every(label => typeof label === 'string' && label.trim() && label.length <= 30) ||
      !chart.values.every(value => Number.isFinite(value) && value >= 0 && value <= 1e12)) return null;
  const source = research?.sources?.find(item => item.id === chart.sourceId);
  if (!source || !chart.unit || !chart.context || !chart.title || chart.title.length > 60) return null;
  const clean = value => String(value).normalize('NFKC').replace(/[\s,，]/g, '');
  const evidence = String(research.notes || '').split(/\n+/).find(line =>
    line.includes(`[[${chart.sourceId}]]`) && chart.values.every(value => clean(line).includes(clean(value)))
  );
  return evidence ? { ...chart, source } : null;
}

export function chartDocument(chart) {
  const max = Math.max(...chart.values, 1);
  const rows = chart.labels.map((label, index) => {
    const value = chart.values[index];
    const width = value === 0 ? 0 : Math.max(2, value / max * 100);
    return `<div class="row"><div class="label">${escapeHtml(label)}</div><div class="track"><div class="bar" style="width:${width}%"></div></div><div class="value">${escapeHtml(value)}${escapeHtml(chart.unit)}</div></div>`;
  }).join('');
  return `<!doctype html><html lang="ja"><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
<style>*{box-sizing:border-box}body{margin:0;padding:34px;background:#eef3f8;color:#15293d;font-family:"Noto Sans CJK JP","Noto Sans JP","Yu Gothic",Meiryo,sans-serif}main{width:1032px;padding:38px;background:#fff;border-radius:18px;border-top:8px solid #236b80}h1{margin:0 0 8px;font-size:30px}.context{margin:0 0 28px;color:#53697a;font-size:18px}.row{display:grid;grid-template-columns:190px 1fr 150px;align-items:center;gap:16px;margin:18px 0}.label{font-size:20px;font-weight:700}.track{height:34px;background:#e5edf2;border-radius:6px;overflow:hidden}.bar{height:100%;background:#28788c}.value{font-size:20px;text-align:right;font-variant-numeric:tabular-nums}</style><main><h1>${escapeHtml(chart.title)}</h1><p class="context">${escapeHtml(chart.context)}／単位：${escapeHtml(chart.unit)}</p>${rows}</main></html>`;
}

export function selectExplanatoryFigures(body) {
  const figures = [...body.matchAll(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi)].map(match => match[0]);
  return figures.filter(figure =>
    !/<table\b/i.test(figure) &&
    /<ol\b/i.test(figure) &&
    /<figcaption\b[^>]*>[\s\S]*?<\/figcaption>/i.test(figure)
  ).slice(0, 2);
}

export async function attachExplanatoryFigures(article, config, { research, browserType, request = fetch } = {}) {
  const figures = selectExplanatoryFigures(article.body);
  const chart = validateEvidenceChart(article.chart, research);
  if (!figures.length && !chart) return article;
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
    if (chart) {
      const context = await browser.newContext({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 1, javaScriptEnabled: false, serviceWorkers: 'block' });
      try {
        await context.route('**/*', route => route.abort());
        const page = await context.newPage();
        await page.setContent(chartDocument(chart), { waitUntil: 'load' });
        const target = page.locator('main');
        const box = await target.boundingBox();
        if (!box) throw new Error('グラフを描画できませんでした。');
        const bytes = await target.screenshot({ type: 'png', animations: 'disabled' });
        const digest = createHash('sha256').update(JSON.stringify(chart)).digest('hex').slice(0, 16);
        const url = await uploadImage(bytes, `evidence-chart-${digest}.png`, config, request);
        const number = Number.parseInt(chart.sourceId.slice(1), 10);
        const caption = `${escapeHtml(chart.title)}。${escapeHtml(chart.context)}、単位：${escapeHtml(chart.unit)}。出典：<a href="#source-${chart.sourceId.toLowerCase()}">［${number}］</a>`;
        body = insertVisualSection(body, `<figure><img src="${escapeHtml(url)}" alt="${escapeHtml(chart.title)}を示す棒グラフ" width="${Math.ceil(box.width)}" height="${Math.ceil(box.height)}" loading="lazy" decoding="async"><figcaption>${caption}</figcaption></figure>`);
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
  return { ...article, body };
}
