import { createHash } from 'node:crypto';

const keyword = process.argv.slice(2).join(' ').trim();

if (!keyword) {
  fail('キーワードがありません。例: npm run article:generate -- "美容室 ホームページ制作 費用"');
}

const config = {
  openaiApiKey: requiredEnv('OPENAI_API_KEY'),
  openaiModel: process.env.OPENAI_MODEL || 'gpt-5-mini',
  serviceDomain: requiredEnv('MICROCMS_SERVICE_DOMAIN'),
  microCMSApiKey:
    process.env.MICROCMS_WRITE_API_KEY?.trim() || requiredEnv('MICROCMS_API_KEY'),
  endpoint: process.env.MICROCMS_ARTICLES_ENDPOINT || 'articles',
};

console.log(`記事を生成しています: ${keyword}`);
const article = await generateArticle(keyword, config);
validateArticle(article);

const created = await saveDraft(article, config);
console.log(`microCMSへ下書き保存しました: ${created.id}`);
console.log('Netlifyの再ビルドは週次スケジュールで実行されます。');

async function generateArticle(inputKeyword, currentConfig) {
  const schema = {
    type: 'object',
    properties: {
      title: { type: 'string' },
      slug: { type: 'string' },
      description: { type: 'string' },
      category: { type: 'string' },
      targetAudience: { type: 'string' },
      body: { type: 'string' },
    },
    required: ['title', 'slug', 'description', 'category', 'targetAudience', 'body'],
    additionalProperties: false,
  };

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${currentConfig.openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: currentConfig.openaiModel,
      instructions: [
        'あなたは日本の中小企業向けホームページ制作に詳しい編集者です。',
        '検索読者の疑問を具体的に解決し、誠実で読みやすいSEO記事を作成してください。',
        '事実確認できない統計、実績、料金、顧客事例は創作しないでください。',
        '本文はHTMLで、h1・html・body・script・styleタグを使わず、h2から始めてください。',
        '使用可能なタグは h2, h3, p, ul, ol, li, strong, em, blockquote, a です。',
        '本文末尾に「まとめ」のh2を置き、読者に自然な相談導線を示してください。',
      ].join('\n'),
      input: [
        `対象キーワード: ${inputKeyword}`,
        '対象サイト: 学生フリーランスによる中小企業向けホームページ制作ポートフォリオ',
        '記事の長さ: 日本語本文2500〜4500文字を目安',
        'slug: 内容を表す短い英小文字・数字・ハイフンのみ',
        'description: 検索結果向けに70〜120文字',
        '読み手が次に取るべき行動まで分かる、独自に編集された記事にしてください。',
      ].join('\n'),
      text: {
        format: {
          type: 'json_schema',
          name: 'seo_article',
          strict: true,
          schema,
        },
      },
      max_output_tokens: 9000,
    }),
  });

  const payload = await readJson(response, 'OpenAI API');
  const outputText = extractOutputText(payload);
  if (!outputText) fail('OpenAI APIの応答に記事本文がありません。');

  let parsed;
  try {
    parsed = JSON.parse(outputText);
  } catch {
    fail('OpenAI APIの構造化出力をJSONとして解析できませんでした。');
  }

  return {
    ...parsed,
    slug: normalizeSlug(parsed.slug, inputKeyword),
    keyword: inputKeyword,
    generatedByAI: true,
    // microCMSのセレクトフィールドは単一選択でも配列で入稿する。
    reviewStatus: ['要確認'],
  };
}

async function saveDraft(article, currentConfig) {
  const url = new URL(
    `/api/v1/${encodeURIComponent(currentConfig.endpoint)}`,
    `https://${currentConfig.serviceDomain}.microcms.io`
  );
  url.searchParams.set('status', 'draft');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'X-MICROCMS-API-KEY': currentConfig.microCMSApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(article),
  });

  return readJson(response, 'microCMS Content API');
}

function validateArticle(article) {
  const errors = [];
  const plainText = article.body.replace(/<[^>]+>/g, '').replace(/\s+/g, '');
  const h2Count = (article.body.match(/<h2(?:\s[^>]*)?>/gi) || []).length;
  const allowedTags = new Set([
    'h2',
    'h3',
    'p',
    'ul',
    'ol',
    'li',
    'strong',
    'em',
    'blockquote',
    'a',
  ]);
  const usedTags = [...article.body.matchAll(/<\/?([a-z][a-z0-9-]*)\b[^>]*>/gi)].map((match) =>
    match[1].toLowerCase()
  );

  if (article.title.length < 12 || article.title.length > 70) errors.push('titleは12〜70文字');
  if (article.description.length < 60 || article.description.length > 140) {
    errors.push('descriptionは60〜140文字');
  }
  if (plainText.length < 1200) errors.push('本文は1200文字以上');
  if (h2Count < 3) errors.push('h2見出しは3個以上');
  if (/<(?:script|style|iframe|object|embed|form)\b/i.test(article.body)) {
    errors.push('禁止HTMLタグを含めない');
  }
  if (usedTags.some((tag) => !allowedTags.has(tag))) {
    errors.push('許可されていないHTMLタグを含めない');
  }
  if (/\son[a-z]+\s*=|javascript:/i.test(article.body)) {
    errors.push('イベント属性やjavascript URLを含めない');
  }

  if (errors.length) fail(`品質チェックに失敗しました: ${errors.join(' / ')}`);
}

function normalizeSlug(value, source) {
  const slug = String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');

  if (slug) return slug;
  const digest = createHash('sha256').update(source).digest('hex').slice(0, 10);
  return `article-${new Date().toISOString().slice(0, 10)}-${digest}`;
}

function extractOutputText(payload) {
  if (typeof payload.output_text === 'string') return payload.output_text;
  return (payload.output || [])
    .flatMap((item) => item.content || [])
    .filter((item) => item.type === 'output_text' && typeof item.text === 'string')
    .map((item) => item.text)
    .join('');
}

async function readJson(response, label) {
  const text = await response.text();
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    if (!response.ok) fail(`${label}に失敗しました (${response.status})。`);
    fail(`${label}から不正なJSONが返されました。`);
  }

  if (!response.ok) {
    const message = body?.error?.message || body?.message || '詳細不明';
    fail(`${label}に失敗しました (${response.status}): ${message}`);
  }
  return body;
}

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) fail(`環境変数 ${name} を設定してください。`);
  return value;
}

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}
