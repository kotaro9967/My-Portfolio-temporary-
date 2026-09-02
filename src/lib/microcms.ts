import { createClient } from 'microcms-js-sdk';
import type { Loader, LoaderContext } from 'astro/loaders';

const serviceDomain = import.meta.env.MICROCMS_SERVICE_DOMAIN;
const apiKey = import.meta.env.MICROCMS_API_KEY;

export const client = serviceDomain && apiKey ? createClient({ serviceDomain, apiKey }) : null;

/**
 * microCMSのリスト形式APIをAstro Content Layerのコレクションとして読み込むloader。
 * .env に MICROCMS_SERVICE_DOMAIN / MICROCMS_API_KEY が未設定の場合は空コレクションになる
 * （ビルド自体は失敗させない。設定後に `npm run dev` を再起動すると反映される）。
 */
export function microCMSLoader(endpoint: string): Loader {
  return {
    name: `microcms-${endpoint}`,
    load: async ({ store, parseData, generateDigest, logger }: LoaderContext) => {
      store.clear();

      if (!client) {
        logger.warn(
          `MICROCMS_SERVICE_DOMAIN / MICROCMS_API_KEY が未設定のため "${endpoint}" は空のまま読み込みをスキップしました。`
        );
        return;
      }

      const { contents } = await client.getList<Record<string, unknown>>({
        endpoint,
        queries: { limit: 100 },
      });

      for (const item of contents) {
        const { id, body, ...rest } = item as { id: string; body?: string } & Record<string, unknown>;
        const data = await parseData({ id, data: rest });
        const digest = generateDigest(data);
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
