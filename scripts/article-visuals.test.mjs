import test from 'node:test';
import assert from 'node:assert/strict';
import { attachArticleVisuals, sampleHtml, uploadImage, validateMediaUrl } from './article-visuals.mjs';

const config = { serviceDomain: 'example', microCMSApiKey: 'test-only' };
const fixture = { keyword: '採用ページ スマホ対応', body: '<h2>準備</h2><p>例</p><h2>まとめ</h2><p>確認</p>' };
const safeUrl = 'https://images.microcms-assets.io/assets/test/sample.png';

test('template escapes untrusted keyword and contains no executable AI markup', () => {
  const html = sampleHtml('<script>alert(1)</script>"&');
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes("default-src 'none'"));
});
test('only official HTTPS image URLs are accepted', () => {
  for (const value of ['http://images.microcms-assets.io/a', 'https://images.microcms-assets.io.evil.test/a', 'javascript:alert(1)', 'https://user:password@images.microcms-assets.io/a']) assert.throws(() => validateMediaUrl(value));
  assert.equal(validateMediaUrl(safeUrl), safeUrl);
});
test('upload uses multipart and stops on permission failure', async () => {
  await assert.rejects(uploadImage(Buffer.from('test'), 'test.png', config, async (url, init) => {
    assert.equal(url, 'https://example.microcms-management.io/api/v1/media');
    assert.equal(init.headers['X-MICROCMS-API-KEY'], 'test-only');
    assert.equal(init.body.get('file').type, 'image/png');
    return { ok: false, status: 403 };
  }), /403/);
  await assert.rejects(uploadImage(Buffer.alloc(5 * 1024 * 1024 + 1), 'test.png', config), /5MB/);
});

function fakeBrowser() {
  const state = { closed: 0, browserClosed: false, screenshots: 0 };
  const browserType = { launch: async () => ({
    close: async () => { state.browserClosed = true; },
    newContext: async () => ({
      route: async () => {}, close: async () => { state.closed++; },
      newPage: async () => ({ setContent: async () => {}, evaluate: async () => {}, screenshot: async () => { state.screenshots++; return Buffer.from('test-image'); } }),
    }),
  }) };
  return { state, browserType };
}

test('three uploaded screenshots are inserted before summary, with labels and dimensions', async () => {
  const { state, browserType } = fakeBrowser();
  const result = await attachArticleVisuals(fixture, config, { browserType, request: async () => ({ ok: true, json: async () => ({ url: safeUrl }) }) });
  assert.equal((result.body.match(/<img /g) || []).length, 3);
  assert.ok(result.body.indexOf('<img ') < result.body.indexOf('<h2>まとめ'));
  assert.ok(result.body.includes('幅390px'));
  assert.ok(result.body.includes('実在企業の制作実績'));
  assert.equal(state.closed, 3);
  assert.equal(state.browserClosed, true);
});
test('upload failure closes browser and never returns a partially illustrated article', async () => {
  const { state, browserType } = fakeBrowser();
  await assert.rejects(attachArticleVisuals(fixture, config, { browserType, request: async () => ({ ok: false, status: 403 }) }), /403/);
  assert.equal(state.screenshots, 1);
  assert.equal(state.closed, 1);
  assert.equal(state.browserClosed, true);
});
test('real Chromium renders all three Japanese screenshots without contacting CMS', { skip: process.env.VISUAL_BROWSER_TEST !== 'true' }, async () => {
  let count = 0;
  const result = await attachArticleVisuals(fixture, config, { request: async (_url, init) => {
    const image = Buffer.from(await init.body.get('file').arrayBuffer());
    assert.equal(image.subarray(1, 4).toString(), 'PNG');
    assert.ok(image.length > 5000);
    count++;
    return { ok: true, json: async () => ({ url: safeUrl }) };
  } });
  assert.equal(count, 3);
  assert.ok(result.body.includes('<img '));
});
