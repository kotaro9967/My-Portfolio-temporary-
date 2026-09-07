import test from 'node:test';
import assert from 'node:assert/strict';
import { figureDocument, chartDocument, validateEvidenceChart, selectExplanatoryFigures, attachExplanatoryFigures } from './article-explanatory-figures.mjs';

test('renderer removes attributes and links but retains source numbers and content', () => {
  const html = figureDocument('<figure onclick="bad()"><ol><li>問い合わせ</li></ol><figcaption>制作上の提案 <a href="https://example.com">［1］</a></figcaption></figure>');
  assert.ok(html.includes('問い合わせ'));
  assert.ok(html.includes('［1］'));
  assert.ok(html.includes("default-src 'none'"));
  assert.doesNotMatch(html, /onclick|https:\/\/example/);
});
test('renderer rejects executable and remote content', () => {
  for (const tag of ['script', 'img', 'iframe', 'svg']) assert.throws(() => figureDocument(`<figure><${tag}></${tag}></figure>`));
});
test('does not invent an image when article has no useful figure', async () => {
  const article = { body: '<p>本文</p>' };
  assert.equal(await attachExplanatoryFigures(article, {}), article);
});
test('selects only useful figures and limits images to two', () => {
  const useful = '<figure><ol><li>相談</li><li>制作</li></ol><figcaption>工程図</figcaption></figure>';
  const body = '<figure><p>装飾のみ</p><figcaption>対象外</figcaption></figure>' + useful.repeat(3);
  const selected = selectExplanatoryFigures(body);
  assert.equal(selected.length, 2);
  assert.ok(selected.every(figure => figure.includes('<ol>')));
});
test('tables including lists inside cells stay HTML without launching a browser or uploading', async () => {
  const body = '<figure><table><tr><td><ol><li>項目</li></ol></td></tr></table><figcaption>比較表</figcaption></figure>';
  const article = { body };
  assert.deepEqual(selectExplanatoryFigures(body), []);
  assert.equal(await attachExplanatoryFigures(article, {}), article);
});
test('accepts a chart only when every value is present on one cited research line', () => {
  const research = {
    notes: 'グラフ候補: PC=61.2, スマホ=38.8／%／2025年 [[S1]]',
    sources: [{ id: 'S1', title: '一次資料', url: 'https://example.com/source' }],
  };
  const chart = { enabled: true, title: '端末別の割合', type: 'bar', labels: ['PC', 'スマホ'], values: [61.2, 38.8], unit: '%', context: '2025年', sourceId: 'S1' };
  assert.ok(validateEvidenceChart(chart, research));
  assert.equal(validateEvidenceChart({ ...chart, values: [61.2, 99.9] }, research), null);
  assert.equal(validateEvidenceChart({ ...chart, sourceId: 'S2' }, research), null);
});
test('chart is rendered as deterministic HTML with escaped labels and Japanese fonts', () => {
  const html = chartDocument({ title: '比較<結果>', labels: ['東京', '全国'], values: [12, 8], unit: '件', context: '2025年' });
  assert.match(html, /比較&lt;結果&gt;/);
  assert.match(html, /Noto Sans CJK JP/);
  assert.match(html, /東京/);
  assert.match(html, /12件/);
});
