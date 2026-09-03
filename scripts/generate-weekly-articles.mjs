import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';

const brandProfile = JSON.parse(
  readFileSync(new URL('../config/article-brand-profile.json', import.meta.url), 'utf8')
);
const referenceKeywords = readFileSync(
  new URL('../config/article-keywords.txt', import.meta.url),
  'utf8'
)
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('#'));

const config = {
  openaiApiKey: requiredEnv('OPENAI_API_KEY'),
  openaiModel: process.env.OPENAI_MODEL || 'gpt-5-mini',
  serviceDomain: requiredEnv('MICROCMS_SERVICE_DOMAIN'),
  microCMSApiKey: requiredEnv('MICROCMS_API_KEY'),
  endpoint: process.env.MICROCMS_ARTICLES_ENDPOINT || 'articles',
  repository: process.env.GITHUB_REPOSITORY || '',
  githubToken: process.env.GITHUB_TOKEN || '',
  runUrl: process.env.GITHUB_RUN_URL || '',
  summaryFile: process.env.ARTICLE_SUMMARY_FILE || 'weekly-article-summary.md',
};

const publishedArticles = await getPublishedArticles(config);
const previousIssueKeywords = await getPreviousIssueKeywords(config);
const usedTopics = [
  ...publishedArticles.flatMap((article) => [article.title, article.keyword].filter(Boolean)),
  ...previousIssueKeywords,
];

const keywords = await chooseKeywords(referenceKeywords, usedTopics, config);
const results = [];

for (const keyword of keywords) {
  console.log(`\n--- ${keyword} ---`);
  const child = spawnSync(process.execPath, ['scripts/generate-article.mjs', keyword], {
    cwd: process.cwd(),
    env: process.env,
    encoding: 'utf8',
    maxBuffer: 2 * 1024 * 1024,
  });

  if (child.stdout) process.stdout.write(child.stdout);
  if (child.stderr) process.stderr.write(child.stderr);

  const output = `${child.stdout || ''}\n${child.stderr || ''}`;
  results.push({
    keyword,
    success: child.status === 0,
    title: output.match(/記事タイトル: (.+)/)?.[1]?.trim() || 'タイトル取得失敗',
    id: output.match(/microCMSへ下書き保存しました: (.+)/)?.[1]?.trim() || '',
    error: child.status === 0 ? '' : output.match(/ERROR: (.+)/)?.[1]?.trim() || '生成処理に失敗しました',
  });
}

await writeFile(config.summaryFile, buildSummary(results, config), 'utf8');

const successCount = results.filter((result) => result.success).length;
console.log(`週次記事生成: ${successCount}/${results.length}件成功`);
if (successCount !== 3) process.exitCode = 1;

async function chooseKeywords(referenceKeywords, usedTopics, currentConfig) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${currentConfig.openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: currentConfig.openaiModel,
      instructions: [
        'あなたは中小企業向けWeb制作サービスのSEO編集長です。',
        '毎週生成する記事の検索キーワードを、重複なく3件選んでください。',
        'ユーザー提供の参考キーワードを企画の最優先情報として扱ってください。',
        '参考キーワードはそのまま選んでも、検索意図を保った具体的なロングテールへ展開しても構いません。',
        '3件は「採用・若者への訴求」「CMS・運用」「Web制作の課題解決」から原則1件ずつ選んでください。',
        '費用・相場キーワードに偏らないでください。地域名を機械的に組み合わせないでください。',
        '検索者の具体的な悩みが分かり、サービス相談へ自然につながる日本語キーワードにしてください。',
        '既存記事や過去候補と同じ検索意図のキーワードは避けてください。',
      ].join('\n'),
      input: [
        `サービス情報:\n${JSON.stringify(brandProfile, null, 2)}`,
        `ユーザー提供の参考キーワード:\n${referenceKeywords.join('\n') || '未登録'}`,
        `使用済み・候補済みテーマ:\n${usedTopics.slice(-100).join('\n') || 'なし'}`,
      ].join('\n\n'),
      text: {
        format: {
          type: 'json_schema',
          name: 'weekly_keywords',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              keywords: {
                type: 'array',
                items: { type: 'string' },
                minItems: 3,
                maxItems: 3,
              },
            },
            required: ['keywords'],
            additionalProperties: false,
          },
        },
      },
      max_output_tokens: 1000,
    }),
  });

  const payload = await readJson(response, 'OpenAIキーワード選定');
  if (payload.usage) {
    console.log(
      `キーワード選定のOpenAI使用量: input ${payload.usage.input_tokens ?? 0} / output ${payload.usage.output_tokens ?? 0} tokens`
    );
  }
  const parsed = JSON.parse(extractOutputText(payload));
  const unique = [...new Set(parsed.keywords.map((value) => String(value).trim()).filter(Boolean))];
  if (unique.length !== 3) throw new Error('重複のないキーワードを3件取得できませんでした。');
  return unique;
}

async function getPublishedArticles(currentConfig) {
  const url = new URL(
    `/api/v1/${encodeURIComponent(currentConfig.endpoint)}`,
    `https://${currentConfig.serviceDomain}.microcms.io`
  );
  url.searchParams.set('limit', '100');
  url.searchParams.set('fields', 'title,keyword,slug');

  const response = await fetch(url, {
    headers: { 'X-MICROCMS-API-KEY': currentConfig.microCMSApiKey },
  });
  const payload = await readJson(response, 'microCMS記事一覧取得');
  return Array.isArray(payload.contents) ? payload.contents : [];
}

async function getPreviousIssueKeywords(currentConfig) {
  if (!currentConfig.repository || !currentConfig.githubToken) return [];
  try {
    const response = await fetch(
      `https://api.github.com/repos/${currentConfig.repository}/issues?state=all&per_page=30`,
      {
        headers: {
          Authorization: `Bearer ${currentConfig.githubToken}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    );
    if (!response.ok) return [];
    const issues = await response.json();
    return issues
      .filter((issue) => issue.title?.startsWith('AI記事レビュー'))
      .flatMap((issue) => [...String(issue.body || '').matchAll(/キーワード：`([^`]+)`/g)])
      .map((match) => match[1]);
  } catch {
    return [];
  }
}

function buildSummary(results, currentConfig) {
  const generatedAt = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date());
  const lines = [
    '# 今週のAI生成記事',
    '',
    `${generatedAt}に3件の生成処理を実行しました。成功した記事はmicroCMSの**下書き**で、まだ公開されていません。`,
    '',
  ];

  results.forEach((result, index) => {
    lines.push(`## ${index + 1}. ${result.success ? result.title : '生成失敗'}`);
    lines.push('');
    lines.push(`- キーワード：\`${result.keyword}\``);
    lines.push(`- 状態：${result.success ? '✅ 下書き保存済み' : '❌ 失敗'}`);
    if (result.id) lines.push(`- microCMSコンテンツID：\`${result.id}\``);
    if (result.error) lines.push(`- エラー：${result.error}`);
    lines.push('');
  });

  lines.push('## 確認と公開');
  lines.push('');
  lines.push(`1. [microCMSの記事管理画面](https://${currentConfig.serviceDomain}.microcms.io/apis/${currentConfig.endpoint})を開く`);
  lines.push('2. 事実・表現・問い合わせ導線を確認する');
  lines.push('3. 問題なければ「公開」を押す');
  lines.push('4. GitHub Actionsの「Build GitHub Pages preview」を実行する');
  if (currentConfig.runUrl) lines.push(`\n[今回の実行ログ](${currentConfig.runUrl})`);
  lines.push('\n公開しない記事は下書きのままで問題ありません。');
  return `${lines.join('\n')}\n`;
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
    throw new Error(`${label}から不正なJSONが返されました。`);
  }
  if (!response.ok) {
    const message = body?.error?.message || body?.message || '詳細不明';
    throw new Error(`${label}に失敗しました (${response.status}): ${message}`);
  }
  return body;
}

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`環境変数 ${name} を設定してください。`);
  return value;
}
