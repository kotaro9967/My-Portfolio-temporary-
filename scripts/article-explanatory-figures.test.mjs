import test from 'node:test';
import assert from 'node:assert/strict';
import { figureDocument, selectExplanatoryFigures, attachExplanatoryFigures } from './article-explanatory-figures.mjs';

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
