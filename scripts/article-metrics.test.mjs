import test from 'node:test';
import assert from 'node:assert/strict';
import { metricTopics, period28, parseSpeed, parseUmami, fetchSpeed, fetchUmami, speedFigure, umamiFigure, chartHtml, attachMetrics } from './article-metrics.mjs';
const now = Date.parse('2026-09-06T02:00:00Z');
const period = period28(now);
const speed = () => ({ lighthouseResult: { fetchTime: '2026-09-06T01:00:00Z', finalUrl: 'https://kotaro.tokyo/', lighthouseVersion: '12.0.0', categories: { performance: { score: 0.83 } }, audits: { 'largest-contentful-paint': { numericValue: 2410 }, 'cumulative-layout-shift': { numericValue: 0.032 }, 'total-blocking-time': { numericValue: 140 } } } });
test('only relevant topics request metrics', () => {
  assert.deepEqual(metricTopics({ keyword: '葛飾区 町工場 ホームページ制作' }), { speed: false, analytics: false });
  assert.ok(metricTopics({ keyword: '表示速度 改善' }).speed);
  assert.ok(metricTopics({ title: 'Umamiでアクセス解析' }).analytics);
});
test('period covers 28 complete JST days without today', () => {
  assert.equal(period.label, '2026-08-09〜2026-09-05（日本時間）');
  assert.equal(period.end - period.start + 1, 28 * 86400000);
});
test('reject missing score, wrong target and runtime errors rather than invent zeros', () => {
  assert.equal(parseSpeed(speed(), 'mobile').score, 83);
  for (const mutate of [p => p.lighthouseResult.categories.performance.score = null, p => p.lighthouseResult.runtimeError = { code: 'FAIL' }, p => p.lighthouseResult.finalUrl = 'https://other.test/', p => p.lighthouseResult.categories.performance.score = 2]) {
    const p = speed(); mutate(p); assert.throws(() => parseSpeed(p, 'mobile'));
  }
});
test('Umami preserves true zero counts and validates dates and numeric types', () => {
  assert.equal(parseUmami({ pageviews: 0, visitors: 0 }, { pageviews: [] }, period).pageviews, 0);
  assert.equal(parseUmami({ pageviews: { value: 3 }, visitors: { value: 1 } }, { pageviews: [{ x: '2026-09-05', y: 3 }] }, period).pageviews, 3);
  assert.throws(() => parseUmami({}, { pageviews: [] }, period));
  assert.throws(() => parseUmami({ pageviews: 3, visitors: 1 }, { pageviews: [{ x: '2026-09-06', y: 3 }] }, period));
});
test('API calls use production filter and fixed hosts; errors do not expose credentials', async () => {
  const seen = [];
  await fetchUmami({ UMAMI_API_KEY: 'secret' }, async (url, options) => {
    seen.push(url);
    assert.equal(url.hostname, 'api.umami.is');
    assert.equal(url.searchParams.get('hostname'), 'kotaro.tokyo');
    assert.equal(options.headers.Authorization, 'Bearer secret');
    assert.equal(options.redirect, 'error');
    return { ok: true, json: async () => url.pathname.endsWith('/stats') ? { pageviews: 0, visitors: 0 } : { pageviews: [] } };
  }, now);
  assert.equal(seen.length, 2);
  await assert.rejects(fetchUmami({}, () => { throw Error('must not call'); }), /無料プラン/);
  await assert.rejects(fetchSpeed({ PAGESPEED_API_KEY: 'secret' }, async () => { throw Error('url?key=secret'); }), e => !e.message.includes('secret'));
});
test('no API calls for irrelevant articles, missing Umami preserves article', async () => {
  const article = { keyword: '採用ページ 内容', body: '<h2>まとめ</h2>' };
  const r = await attachMetrics(article, {}, { request: () => { throw Error('unexpected'); } });
  assert.equal(r.body, article.body);
  const missing = await attachMetrics({ ...article, keyword: 'Umami' }, {}, { env: {} });
  assert.equal(missing.body, article.body);
});
test('figures contain units, measured times, sources and escaped labels', () => {
  const f = speedFigure([parseSpeed(speed(), 'mobile')]);
  assert.match(f.detail, /2.41/); assert.match(f.detail, /2026-09-06/);
  assert.match(f.caption, /各条件1回/);
  assert.match(chartHtml({ ...f, title: '<script>' }), /&lt;script&gt;/);
  const u = umamiFigure(parseUmami({ pageviews: 0, visitors: 0 }, { pageviews: [] }, period));
  assert.match(u.detail, /日別データはありません/);
});
test('real browser renders both measurement charts with mocked APIs and uploads', { skip: process.env.VISUAL_BROWSER_TEST !== 'true' }, async () => {
  let uploads = 0;
  const request = async (input, options) => {
    const url = new URL(input);
    if (url.hostname === 'www.googleapis.com') return { ok: true, json: async () => speed() };
    if (url.hostname === 'api.umami.is') return { ok: true, json: async () => url.pathname.endsWith('/stats') ? { pageviews: 12, visitors: 3 } : { pageviews: [{ x: '2026-09-04', y: 4 }, { x: '2026-09-05', y: 8 }] } };
    assert.equal(url.hostname, 'test.microcms-management.io');
    const bytes = Buffer.from(await options.body.get('file').arrayBuffer());
    assert.equal(bytes.subarray(1, 4).toString(), 'PNG'); assert.ok(bytes.length > 5000);
    uploads++;
    return { ok: true, json: async () => ({ url: `https://images.microcms-assets.io/metrics-${uploads}.png` }) };
  };
  const r = await attachMetrics({ keyword: 'Umami 表示速度', body: '<h2>まとめ</h2><p>終わり</p>' }, { serviceDomain: 'test', microCMSApiKey: 'test' }, { env: { UMAMI_API_KEY: 'test' }, request, now });
  assert.equal(uploads, 2); assert.equal((r.body.match(/<img /g) || []).length, 2);
  assert.match(r.body, /12 PV/); assert.ok(r.body.indexOf('<img') < r.body.indexOf('<h2>まとめ'));
});
