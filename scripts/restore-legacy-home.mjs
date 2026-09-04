import { copyFile, cp, mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { seo, canonicalUrl, jsonLd, identitySchema } from '../config/seo.mjs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = resolve(projectRoot, 'dist');

await mkdir(outputDir, { recursive: true });
let homeHtml = await readFile(resolve(projectRoot, 'index.html'), 'utf8');
// Pages preview commits its generated homepage into the repository root.
// Strip its repository prefix when that homepage is reused by Netlify.
// Only local quoted URLs are changed; external URLs and page design stay intact.
if (process.env.GITHUB_PAGES !== 'true') {
  homeHtml = homeHtml
    .replace(/(["'`])\/My-Portfolio-temporary-\//g, '$1/')
    .replace(/(["'`])\/My-Portfolio-temporary-(?=["'`?#])/g, '$1/');
}
const escape = (value) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const preview = ['deploy-preview', 'branch-deploy'].includes(process.env.CONTEXT ?? '');
// Keep the original layout; distinguish template samples from paid client work.
homeHtml = homeHtml
  .replace(/これまでに制作したWebサイトやデザインの一部をご紹介します。/g,
    '現在掲載している内容は参考用のサンプルです。お客様から受託・納品した制作実績ではありません。');
homeHtml = homeHtml.replace(/<html\b[^>]*>/i, '<html lang="ja">');
homeHtml = homeHtml.replace(/<head>([\s\S]*?)<\/head>/i, (_, head) => {
  const cleaned = head.replace(/<title>[\s\S]*?<\/title>/gi, '')
    .replace(/<meta\b[^>]*(?:name|property)="(?:description|robots|author|og:[^"]+|twitter:[^"]+)"[^>]*>/gi, '')
    .replace(/<link\b[^>]*rel="canonical"[^>]*>/gi, '')
    .replace(/<script\b[^>]*data-site-seo[^>]*>[\s\S]*?<\/script>/gi, '');
  return `<head>${cleaned}\n<title>${escape(seo.title)}</title>
<meta name="description" content="${escape(seo.description)}">
<meta name="robots" content="${preview ? 'noindex, follow' : 'index, follow, max-image-preview:large'}">
<meta name="author" content="${seo.name}">
<link rel="canonical" href="${canonicalUrl('/')}">
<meta property="og:type" content="website">
<meta property="og:title" content="${escape(seo.title)}">
<meta property="og:description" content="${escape(seo.description)}">
<meta property="og:url" content="${canonicalUrl('/')}">
<meta property="og:locale" content="ja_JP">
<meta name="twitter:card" content="summary">
<script type="application/ld+json" data-site-seo>${jsonLd(identitySchema)}</script>
</head>`;
});
// Idempotent: the Pages workflow may use this generated homepage as its input next time.
homeHtml = homeHtml.replace(/<!-- service-overview:start -->[\s\S]*?<!-- service-overview:end -->\s*/g, '');
homeHtml = homeHtml.replace(/<footer\b/i, `<!-- service-overview:start -->
<section aria-labelledby="service-overview-title" style="padding:40px 0;border-top:1px solid rgba(85,96,206,.16);line-height:2;font-size:16px;">
<h2 id="service-overview-title" style="font-size:24px;color:#4f5ac7;">中小企業のホームページ・採用ページ制作とCMS導入</h2>
<p>東京周辺を中心に、企業の魅力が伝わるWebサイトを制作しています。基本制作料金は10万〜15万円、納期は約1か月が目安です。要件・混雑状況により変わります。ご相談・お見積もりは無料です。</p>
<nav aria-label="制作サービスのご案内" style="display:flex;flex-wrap:wrap;gap:12px 24px;">
<a href="/services/">制作内容・料金・制作の流れ</a><a href="/about/">制作者について</a><a href="/blog/">Web制作・採用・運用のブログ</a><a href="#contact">無料相談</a>
</nav></section><!-- service-overview:end -->
<footer`);
await writeFile(resolve(outputDir, 'index.html'), homeHtml);
await copyFile(resolve(projectRoot, 'support.js'), resolve(outputDir, 'support.js'));
await cp(resolve(projectRoot, 'assets'), resolve(outputDir, 'assets'), {
  recursive: true,
  force: true,
});

// Match sitemap URLs and canonical tags across production and Pages preview builds.
for (const name of await readdir(outputDir)) {
  if (!/^sitemap.*\.xml$/.test(name)) continue;
  const path = resolve(outputDir, name);
  const xml = await readFile(path, 'utf8');
  await writeFile(path, xml.replace(/<loc>([^<]+)<\/loc>/g, (_, url) => `<loc>${canonicalUrl(new URL(url).pathname)}</loc>`));
}
await writeFile(resolve(outputDir, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${seo.productionOrigin}/sitemap-index.xml\n`);

console.log('旧トップページのデザインをdistへ復元しました。');
