import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // 公開前に実際のドメインへ変更してください（canonical / OGP / sitemap に使われます）
  site: 'https://example.com',
  // GitHub Pages のサブディレクトリに置く場合は base: '/repo-name' を指定
  integrations: [sitemap()],
  build: {
    inlineStylesheets: 'auto',
  },
});
