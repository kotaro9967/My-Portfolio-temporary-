import { escapeHtml, uploadImage, visualFigure, insertVisualSection } from './article-visuals.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const SITE = 'https://kotaro.tokyo/';
export const WEBSITE_ID = '761c9463-2d4a-4f2d-b25e-075c0bac91d2';
export function metricTopics(article) {
  const topic = `${article.keyword || ''} ${article.title || ''}`;
  return { speed: /pagespeed|表示速度|読み込み速度|ページ速度|高速化|core web vitals|lighthouse/i.test(topic),
    analytics: /umami|アクセス解析|アクセス数|閲覧数|流入|効果測定|ブログ運用|ブログ更新|ブログ.*効果|アクセス.*改善/i.test(topic) };
}
export function period28(now = Date.now()) {
  const day = 86400000, offset = 9 * 3600000;
  const end = Math.floor((now + offset) / day) * day - offset;
  return { start: end - 28 * day, end: end - 1,
    label: `${new Date(end - 28 * day + offset).toISOString().slice(0, 10)}〜${new Date(end - 1 + offset).toISOString().slice(0, 10)}（日本時間）` };
}
function number(value, label, integer = false) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || (integer && !Number.isSafeInteger(value))) throw new Error(`${label}の数値が不正です`);
  return value;
}
async function getJson(url, headers, request, label, timeout = 45000) {
  let response;
  try { response = await request(url, { headers, redirect: 'error', signal: AbortSignal.timeout(timeout) }); }
  catch { throw new Error(`${label}への接続に失敗しました`); }
  if (!response.ok) throw new Error(`${label}: HTTP ${response.status}`);
  try { return await response.json(); } catch { throw new Error(`${label}の応答が不正です`); }
}
export function parseSpeed(payload, strategy) {
  const l = payload.lighthouseResult;
  if (!l || l.runtimeError || !Number.isFinite(Date.parse(l.fetchTime))) throw new Error('PageSpeedの計測が完了していません');
  const final = new URL(l.finalDisplayedUrl || l.finalUrl);
  if (final.origin !== new URL(SITE).origin || final.pathname !== '/') throw new Error('PageSpeedの計測先が対象サイトと異なります');
  const score = number(l.categories?.performance?.score, 'スコア');
  if (score > 1) throw new Error('PageSpeedスコアの範囲が不正です');
  const metric = key => number(l.audits?.[key]?.numericValue, key);
  return { strategy, score: Math.round(score * 100), measuredAt: l.fetchTime,
    lcpMs: metric('largest-contentful-paint'), cls: metric('cumulative-layout-shift'), tbtMs: metric('total-blocking-time'), version: String(l.lighthouseVersion || '不明'),
    warningCount: Array.isArray(l.runWarnings) ? l.runWarnings.length : 0 };
}
export async function fetchSpeed(env = process.env, request = fetch) {
  return Promise.all(['mobile', 'desktop'].map(async strategy => {
    const url = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
    url.searchParams.set('url', SITE); url.searchParams.set('strategy', strategy); url.searchParams.set('category', 'performance');
    if (env.PAGESPEED_API_KEY?.trim()) url.searchParams.set('key', env.PAGESPEED_API_KEY.trim());
    return parseSpeed(await getJson(url, {}, request, 'PageSpeed', 120000), strategy);
  }));
}
export function parseUmami(stats, series, period) {
  // Cloud currently returns numbers; older installations used { value: number }.
  const count = key => number(typeof stats[key] === 'object' && stats[key] !== null ? stats[key].value : stats[key], key, true);
  if (!Array.isArray(series.pageviews) || series.pageviews.length > 28) throw new Error('Umamiの日別データが不正です');
  const days = series.pageviews.map(row => {
    if (typeof row.x !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(row.x)) throw new Error('Umamiの集計日が不正です');
    const date = row.x.slice(0, 10);
    const startDate = new Date(period.start + 9 * 3600000).toISOString().slice(0, 10);
    const endDate = new Date(period.end + 9 * 3600000).toISOString().slice(0, 10);
    if (!Number.isFinite(Date.parse(date)) || date < startDate || date > endDate) throw new Error('Umamiの集計期間が一致しません');
    return { date, value: number(row.y, '日別閲覧数', true) };
  }).sort((a, b) => a.date.localeCompare(b.date));
  if (new Set(days.map(d => d.date)).size !== days.length) throw new Error('Umamiの集計日が重複しています');
  return { period, pageviews: count('pageviews'), visitors: count('visitors'), days };
}
export async function fetchUmami(env = process.env, request = fetch, now = Date.now()) {
  if (!env.UMAMI_API_KEY?.trim()) throw new Error('Umami Cloud無料プランではAPIキーを利用できないため省略します');
  const period = period28(now);
  const headers = { Authorization: `Bearer ${env.UMAMI_API_KEY.trim()}`, Accept: 'application/json' };
  const read = async endpoint => {
    const url = new URL(`https://api.umami.is/v1/websites/${WEBSITE_ID}/${endpoint}`);
    url.searchParams.set('startAt', String(period.start)); url.searchParams.set('endAt', String(period.end));
    // The same tracker can run on preview domains. Only publish production data.
    url.searchParams.set('hostname', 'kotaro.tokyo');
    if (endpoint === 'pageviews') { url.searchParams.set('unit', 'day'); url.searchParams.set('timezone', 'Asia/Tokyo'); }
    return getJson(url, headers, request, 'Umami');
  };
  const [stats, series] = await Promise.all([read('stats'), read('pageviews')]);
  return parseUmami(stats, series, period);
}
const table = (headers, rows) => `<table><thead><tr>${headers.map(v => `<th>${escapeHtml(v)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(v => `<td>${escapeHtml(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
export function speedFigure(results) {
  const label = s => s === 'mobile' ? 'スマホ' : 'PC';
  return { title: '自サイトの表示速度を計測',
    caption: '出典：Google PageSpeed Insights API。kotaro.tokyoトップページを各条件1回計測したラボデータです。実際の利用者全体の速度や改善効果を示すものではなく、実行ごとに変動します。',
    rows: results.map(r => ({ label: label(r.strategy), value: r.score })), maximum: 100, unit: '点 / 100',
    detail: table(['環境', 'Performance', 'LCP（秒）', 'CLS', 'TBT（ms）', '計測日時（UTC）', 'Lighthouse'], results.map(r => [label(r.strategy), `${r.score}/100`, (r.lcpMs / 1000).toFixed(2), r.cls.toFixed(3), Math.round(r.tbtMs), r.measuredAt, r.version])) +
      `<p>計測時の警告：${results.reduce((n, r) => n + r.warningCount, 0)}件。SEOの検索順位を採点した数値ではありません。</p><p><a href="https://pagespeed.web.dev/analysis?url=https%3A%2F%2Fkotaro.tokyo%2F">PageSpeedで再計測する</a></p>` };
}
export function umamiFigure(data) {
  return { title: '自サイトの閲覧数を確認',
    caption: `出典：Umami Cloudのkotaro.tokyo集計。期間：${data.period.label}。当日分は含みません。自サイトの運用例であり、顧客実績・問い合わせ件数・SEO施策の因果効果ではありません。計測を遮断したアクセスなどは含まれない場合があります。`,
    rows: data.days.map(d => ({ label: d.date, value: d.value })), maximum: Math.max(1, ...data.days.map(d => d.value)), unit: 'PV',
    detail: `<p>期間内の閲覧数：${data.pageviews} PV／訪問者数：${data.visitors}（Umamiの定義による集計値）</p>` +
      (data.days.length ? table(['日付（日本時間）', '閲覧数（PV）'], data.days.map(d => [d.date, d.value])) : '<p>この期間の日別データはありません。</p>') +
      '<p>データがない日や導入前の期間の値は推定していません。訪問者数は日別の値を合計していません。</p>' };
}
export function chartHtml(figure) {
  return `<!doctype html><html lang="ja"><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><style>*{box-sizing:border-box}body{margin:0;padding:44px;background:#f5f7fc;color:#26324b;font:19px/1.6 sans-serif}h1{font-size:30px;margin:0 0 24px}.row{display:grid;grid-template-columns:150px 1fr 110px;gap:18px;align-items:center;margin:12px 0}.track{background:#e2e7f1;height:22px;border-radius:5px}.bar{background:#5149bf;height:100%;border-radius:5px}p{font-size:16px;margin-top:28px}small{font-size:16px}</style><h1>${escapeHtml(figure.title)}</h1><small>kotaro.tokyo ／ ${escapeHtml(figure.unit)} ／ 横軸は0から${figure.maximum}</small>${figure.rows.map(r => `<div class="row"><span>${escapeHtml(r.label)}</span><div class="track"><div class="bar" style="width:${Math.max(0, Math.min(100, r.value / figure.maximum * 100))}%"></div></div><strong>${r.value}</strong></div>`).join('')}<p>${escapeHtml(figure.caption)}</p></html>`;
}
async function renderChart(figure, config, request, browserType) {
  const chromium = browserType || (await import('playwright')).chromium;
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 800 }, deviceScaleFactor: 1, locale: 'ja-JP' });
    await page.route('**/*', route => route.abort());
    await page.setContent(chartHtml(figure));
    await page.evaluate(() => document.fonts.ready);
    const bytes = await page.screenshot({ type: 'png', fullPage: true, animations: 'disabled' });
    const height = await page.evaluate(() => Math.max(innerHeight, document.documentElement.scrollHeight));
    const digest = createHash('sha256').update(bytes).digest('hex').slice(0, 16);
    const url = await uploadImage(bytes, `metrics-${digest}.png`, config, request);
    return visualFigure(url, figure.caption, 1100, height);
  } finally { await browser.close(); }
}
export async function attachMetrics(article, config, { env = process.env, request = fetch, browserType, now = Date.now() } = {}) {
  const topics = metricTopics(article);
  const sections = [];
  for (const kind of ['speed', 'analytics']) {
    if (!topics[kind]) continue;
    try {
      const data = kind === 'speed' ? await fetchSpeed(env, request) : await fetchUmami(env, request, now);
      const figure = kind === 'speed' ? speedFigure(data) : umamiFigure(data);
      // Archive only the aggregate values used in the article, never raw API payloads/keys.
      await mkdir('.article-work/metrics', { recursive: true });
      await writeFile(`.article-work/metrics/${kind}-${now}.json`, JSON.stringify(data, null, 2));
      let image = '';
      if (figure.rows.length) {
        try { image = await renderChart(figure, config, request, browserType); }
        catch { console.log(`計測素材: ${kind}の画像作成に失敗したため実データの表のみ挿入`); }
      }
      sections.push(`<h2>${escapeHtml(figure.title)}</h2>${image}<figure>${figure.detail}<figcaption>${escapeHtml(figure.caption)}</figcaption></figure>`);
      console.log(`計測素材: ${kind}の実データを挿入`);
    } catch (error) { console.log(`計測素材: ${kind}は未挿入 — ${error.message}`); }
  }
  return { ...article, body: sections.length ? insertVisualSection(article.body, sections.join('\n')) : article.body };
}
