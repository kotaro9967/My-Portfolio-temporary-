import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://kotaro-ozawa-portfolio.netlify.app',
  // GitHub Pages のサブディレクトリに置く場合は base: '/repo-name' を指定
  integrations: [sitemap()],
  build: {
    inlineStylesheets: 'auto',
  },
});
