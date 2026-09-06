import test from 'node:test';
import assert from 'node:assert/strict';
import { allowedRequest, validatePlan, attachLiveScreenshots } from './article-screenshots.mjs';

test('navigation and asset allowlist rejects redirects, private hosts and writes', () => {
  assert.ok(allowedRequest('https://kotaro.tokyo/services/', 'document'));
  assert.ok(allowedRequest('https://images.microcms-assets.io/a.png', 'image'));
  for (const url of ['https://evil.test/', 'https://127.0.0.1/', 'https://kotaro.tokyo/admin', 'https://kotaro.tokyo/?token=x', 'https://user@kotaro.tokyo/']) assert.equal(allowedRequest(url, 'document'), false);
  assert.equal(allowedRequest('https://kotaro.tokyo/', 'document', 'POST'), false);
  assert.equal(allowedRequest('https://kotaro.tokyo/api', 'fetch'), false);
});
test('planner cannot invent candidates, actions, insertion points or duplicates', () => {
  const c = [{ id: 'C0' }], h = ['見出し'];
  const shot = { id: 'C0', device: 'mobile', heading: 0, reason: '比較' };
  assert.equal(validatePlan({ shots: [shot] }, c, h).length, 1);
  assert.equal(validatePlan({ shots: [] }, c, h).length, 0);
  for (const shots of [[{ ...shot, id: 'evil' }], [{ ...shot, heading: -1 }], [{ ...shot, device: 'click' }], [shot, shot]]) assert.throws(() => validatePlan({ shots }, c, h));
});

function harness(approved = true, failUpload = false) {
  let contexts = 0, closed = 0, browserClosed = false, uploads = 0;
  const locator = { evaluateAll: async () => [{ index: 0, title: 'サービス', text: 'スマホ表示の紹介' }],
    nth() { return this; }, textContent: async () => 'サービス', scrollIntoViewIfNeeded: async () => {}, evaluate: async () => {} };
  const browserType = { launch: async () => ({ close: async () => { browserClosed = true; }, newContext: async () => {
    contexts++;
    return { route: async () => {}, close: async () => { closed++; }, newPage: async () => {
      let url;
      return { setDefaultTimeout: () => {}, goto: async v => { url = v; return { ok: () => true }; }, url: () => url,
        evaluate: async () => {}, locator: () => locator, screenshot: async () => Buffer.from('png fixture') };
    } };
  } }) };
  const request = async (url, options) => {
    if (url.includes('microcms-management')) { uploads++; return { ok: !failUpload, status: 403, json: async () => ({ url: 'https://images.microcms-assets.io/test.png' }) }; }
    const body = JSON.parse(options.body);
    const result = typeof body.input === 'string' ? { shots: [{ id: 'C0', device: 'mobile', heading: 0, reason: 'スマホ構成を説明' }] } : { approved, caption: 'サービス内容の紹介' };
    return { ok: true, json: async () => ({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify(result) }] }] }) };
  };
  return { browserType, request, state: () => ({ contexts, closed, browserClosed, uploads }) };
}
const article = { keyword: 'スマホ対応', body: '<h2>構成</h2><p>説明</p><h2>まとめ</h2><p>結論</p>' };
const config = { openaiModel: 'gpt-5-mini', openaiApiKey: 'test', serviceDomain: 'test', microCMSApiKey: 'test' };
test('approved screenshot is uploaded and inserted after relevant section', async () => {
  const h = harness(); const result = await attachLiveScreenshots(article, config, h);
  assert.match(result.body, /説明<\/p><figure>/);
  assert.match(result.body, /スマホ幅390px/);
  assert.ok(result.body.indexOf('<figure>') < result.body.indexOf('<h2>まとめ'));
  assert.equal(h.state().uploads, 1);
  assert.equal(h.state().closed, h.state().contexts);
  assert.ok(h.state().browserClosed);
});
test('rejected image never uploaded and original article preserved', async () => {
  const h = harness(false); const result = await attachLiveScreenshots(article, config, h);
  assert.equal(result.body, article.body); assert.equal(h.state().uploads, 0);
});
test('upload error closes all contexts and browser', async () => {
  const h = harness(true, true);
  await assert.rejects(attachLiveScreenshots(article, config, h), /403/);
  assert.equal(h.state().closed, h.state().contexts); assert.ok(h.state().browserClosed);
});

test('real Chromium captures and masks a routed public-page fixture', { skip: process.env.VISUAL_BROWSER_TEST !== 'true' }, async () => {
  const { chromium } = await import('playwright');
  const h = harness();
  let inspected = false;
  const browserType = { launch: async () => {
    const browser = await chromium.launch({ headless: true });
    const original = browser.newContext.bind(browser);
    browser.newContext = async options => {
      const context = await original(options);
      const route = context.route.bind(context);
      context.route = async () => route('**/*', r => r.fulfill({ contentType: 'text/html', body: '<html lang="ja"><style>body{font:24px sans-serif;padding:30px}section{height:500px}</style><h1>サービス</h1><section>スマホで読みやすい情報設計</section><p>private@example.com</p><form><input value="private"></form></html>' }));
      const newPage = context.newPage.bind(context);
      context.newPage = async () => {
        const page = await newPage();
        const screenshot = page.screenshot.bind(page);
        page.screenshot = async options => {
          assert.doesNotMatch(await page.locator('body').innerText(), /private@example/);
          assert.equal(await page.locator('form').evaluate(n => getComputedStyle(n).visibility), 'hidden');
          inspected = true;
          return screenshot(options);
        };
        return page;
      };
      return context;
    };
    return browser;
  } };
  const request = async (url, options) => {
    if (url.includes('openai')) {
      const b = JSON.parse(options.body);
      if (Array.isArray(b.input)) {
        const bytes = Buffer.from(b.input[0].content[1].image_url.split(',')[1], 'base64');
        assert.ok(bytes.length > 5000);
        assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
      }
    }
    return h.request(url, options);
  };
  const result = await attachLiveScreenshots(article, config, { browserType, request });
  assert.ok(inspected); assert.match(result.body, /<figure>/);
});
