import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const isGitHubPages = process.env.GITHUB_PAGES === 'true';

// https://astro.build/config
export default defineConfig({
  site: isGitHubPages
    ? 'https://kotaro9967.github.io'
    : 'https://kotaro-ozawa-portfolio.netlify.app',
  base: isGitHubPages ? '/My-Portfolio-temporary-' : '/',
  // GitHub Pages のサブディレクトリに置く場合は base: '/repo-name' を指定
  integrations: [sitemap()],
  build: {
    inlineStylesheets: 'auto',
  },
});