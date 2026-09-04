import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { seo } from './config/seo.mjs';

const isGitHubPages = process.env.GITHUB_PAGES === 'true';

// https://astro.build/config
export default defineConfig({
  site: isGitHubPages
    ? 'https://kotaro9967.github.io'
    : seo.productionOrigin,
  trailingSlash: 'always',
  base: isGitHubPages ? '/My-Portfolio-temporary-' : '/',
  // GitHub Pages のサブディレクトリに置く場合は base: '/repo-name' を指定
  integrations: [sitemap({ filter: (page) => !page.endsWith('/404.html') })],
  build: {
    inlineStylesheets: 'auto',
  },
});
