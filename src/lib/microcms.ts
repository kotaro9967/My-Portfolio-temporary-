import { createClient } from 'microcms-js-sdk';
import type { Loader, LoaderContext } from 'astro/loaders';

const serviceDomain = import.meta.env.MICROCMS_SERVICE_DOMAIN;
const apiKey = import.meta.env.MICROCMS_API_KEY;

export const client = serviceDomain && apiKey ? createClient({ serviceDomain, apiKey }) : null;

/**
 * microCMSのリスト形式APIをAstro Content Layerのコレクションとして読み込むloader。
 * .env に MICROCMS_SERVICE_DOMAIN / MICROCMS_API_KEY が未設定の場合は空コレクションになる
 * ローカルは空のまま確認できる。本番・Actionsは設定不足で空のブログを公開しない。
 */
export function microCMSLoader(endpoint: string): Loader {
  return {
    name: `microcms-${endpoint}`,
    load: async ({ store, parseData, generateDigest, logger }: LoaderContext) => {
      store.clear();

      if (!client) {
        if (process.env.NETLIFY === 'true' || process.env.GITHUB_ACTIONS === 'true') {
          throw new Error('CMS接続設定がありません。空のサイトを公開しないためビルドを停止しました。MICROCMS_SERVICE_DOMAIN / MICROCMS_API_KEY を確認してください。');
        }
        logger.warn(
          `MICROCMS_SERVICE_DOMAIN / MICROCMS_API_KEY が未設定のため "${endpoint}" は空のまま読み込みをスキップしました。`
        );
        return;
      }

      const contents = await client.getAllContents<Record<string, unknown>>({
        endpoint,
      });

      for (const item of contents) {
        const { id, body, ...rest } = item as { id: string; body?: string } & Record<string, unknown>;
        const data = await parseData({ id, data: rest });
        const digest = generateDigest({ ...data, body });
        store.set({
          id,
          data,
          digest,
          rendered: body ? { html: body } : undefined,
        });
      }

      logger.info(`microCMS "${endpoint}" から ${contents.length} 件読み込みました。`);
    },
  };
}

/** microCMSの画像フィールド（{ url, width, height }）からURL文字列を取り出す */
export function imageUrl(
  image: { url?: string } | string | null | undefined,
  fallback = '/assets/image_placeholder.png'
): string {
  if (!image) return fallback;
  if (typeof image === 'string') {
    if (!image) return fallback;
    if (image.startsWith('http://') || image.startsWith('https://') || image.startsWith('/')) {
      return image;
    }
    return `/assets/${image}`;
  }
  return image.url || fallback;
}

/** カンマ区切りテキストを配列に変換（未入力なら空配列） */
export function csvToArray(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
