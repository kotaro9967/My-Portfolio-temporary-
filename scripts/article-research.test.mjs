import test from 'node:test';
import assert from 'node:assert/strict';
import { trustedSource, parseResearch, addResearchCitations, researchArticle } from './article-research.mjs';

const payload = () => ({ status: 'completed', output: [
  { type: 'web_search_call', status: 'completed', action: { type: 'search' } },
  { type: 'message', content: [{ type: 'output_text', text: 'One [a]. Two [b].', annotations: [
    { type: 'url_citation', start_index: 4, end_index: 7, url: 'https://web.dev/a', title: 'A & B' },
    { type: 'url_citation', start_index: 13, end_index: 16, url: 'https://document.microcms.io/b', title: 'CMS' },
  ] }] },
] });

test('only HTTPS primary publishers, no lookalikes or credentials', () => {
  assert.ok(trustedSource('https://document.microcms.io/a'));
  for (const url of ['https://web.dev.evil.test/a', 'http://web.dev/a', 'https://user@web.dev/a', 'javascript:alert(1)', 'https://127.0.0.1/a']) assert.equal(trustedSource(url), false);
});
test('preserve claim/citation alignment and escape titles', () => {
  const research = parseResearch(payload());
  assert.equal(research.notes, 'One [[S1]]. Two [[S2]].');
  const html = addResearchCitations('<p>One [[S1]]. Two [[S2]].</p>', research);
  assert.match(html, /A &amp; B/);
  assert.match(html, /参考資料/);
  assert.doesNotMatch(html, /\[\[/);
});
test('fail closed on incomplete research, absent search or missing sources', () => {
  const p = payload(); p.status = 'incomplete'; assert.throws(() => parseResearch(p));
  p.status = 'completed'; p.output.shift(); assert.throws(() => parseResearch(p));
  const q = payload(); q.output[1].content[0].annotations.pop(); assert.throws(() => parseResearch(q));
});
test('reject fabricated IDs, uncited articles and invented external links', () => {
  const r = parseResearch(payload());
  for (const html of ['<p>[[S99]]</p>', '<p>No citations</p>', '<p>[[S1]]</p>', '<a href="https://evil.test">x</a>[[S1]][[S2]]']) assert.throws(() => addResearchCitations(html, r));
});
test('bounded search request and API failure handling', async () => {
  await researchArticle('CMS 自社更新', { openaiApiKey: 'test', openaiModel: 'gpt-5-mini' }, async (_, opts) => {
    const request = JSON.parse(opts.body);
    assert.equal(request.max_tool_calls, 3);
    assert.equal(request.tool_choice, 'required');
    assert.equal(request.model, 'gpt-5-mini');
    return { ok: true, json: async () => payload() };
  });
  await assert.rejects(researchArticle('x', {}, async () => ({ ok: false, status: 429 })), /429/);
});
