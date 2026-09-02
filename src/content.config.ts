import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { microCMSLoader, imageUrl, csvToArray } from './lib/microcms';

const hasMicroCMS = Boolean(
  import.meta.env.MICROCMS_SERVICE_DOMAIN && import.meta.env.MICROCMS_API_KEY
);

/**
 * 実績（WORKS）
 * microCMSの "works" APIから読み込みます。
 * フィールド仕様は README のセットアップ手順を参照してください。
 */
const works = defineCollection({
  loader: hasMicroCMS
    ? microCMSLoader('works')
    : glob({ pattern: '**/*.{md,mdx}', base: './src/content/works' }),
  schema: z.object({
    title: z.string(),
    /** サムネイル左上のバッジ */
    tag: z.string().default(''),
    /** カード下部のチップ */
    category: z.string().default(''),
    /** サムネイル下部の小さな注記。画像を入れたら空にしてOK */
    note: z.string().default(''),
    /** microCMSの画像フィールド */
    image: z
      .union([z.string(), z.object({ url: z.string(), width: z.number().optional(), height: z.number().optional() })])
      .nullish()
      .transform((v) => imageUrl(v)),
    /** カードの背景グラデーション */
    gradient: z.string().default('linear-gradient(150deg,#EDEFFB,#E4E8F9)'),
    /** 数字が小さいほど先頭に表示 */
    order: z.number().default(99),
    /** トップページのカルーセルに出すか */
    featured: z.boolean().default(true),
    /** 外部サイトがある場合はURL。指定すると詳細ページではなくそちらへ飛びます */
    externalUrl: z.string().url().optional().or(z.literal('').transform(() => undefined)),
    role: z.string().optional(),
    period: z.string().optional(),
    /** microCMS側はカンマ区切りテキストで入力（例: "Figma, React, microCMS"） */
    stack: z
      .union([z.string(), z.array(z.string())])
      .nullish()
      .transform((v) => (Array.isArray(v) ? v : csvToArray(v))),
    summary: z.string().default(''),
    draft: z.boolean().default(false),
  }),
});

/**
 * お知らせ（NEWS）
 * microCMSの "news" APIから読み込みます。
 */
const news = defineCollection({
  loader: hasMicroCMS
    ? microCMSLoader('news')
    : glob({ pattern: '**/*.{md,mdx}', base: './src/content/news' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    /** microCMSのセレクトフィールドは複数選択だと配列で返るため、両対応にして先頭の値を使う */
    category: z
      .union([z.enum(['WORKS', 'NEWS', 'BLOG']), z.array(z.enum(['WORKS', 'NEWS', 'BLOG']))])
      .transform((v) => (Array.isArray(v) ? v[0] : v)),
    draft: z.boolean().default(false),
  }),
});

/**
 * SEO記事（BLOG）
 * microCMSの "articles" APIから公開済みの記事だけを読み込みます。
 * AI生成スクリプトは同じAPIへ下書きとして保存します。
 */
const articles = defineCollection({
  loader: microCMSLoader('articles'),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    description: z.string(),
    category: z.string().default('ホームページ制作'),
    keyword: z.string().default(''),
    targetAudience: z.string().default(''),
    generatedByAI: z.boolean().default(false),
    reviewStatus: z
      .union([z.string(), z.array(z.string())])
      .default(['要確認'])
      .transform((value) => (Array.isArray(value) ? value[0] ?? '要確認' : value)),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
    publishedAt: z.coerce.date(),
  }),
});

export const collections = { works, news, articles };
