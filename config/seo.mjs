// 本番の正規URL。NetlifyのPrimary domainもこのホストに揃えてください。
export const seo = {
  productionOrigin: 'https://kotaro.tokyo',
  pagesBase: '/My-Portfolio-temporary-',
  name: '小澤虎汰朗',
  title: '東京周辺の中小企業向けホームページ・採用ページ制作 | 小澤虎汰朗',
  description: '東京周辺の中小企業向けにホームページ・採用ページ制作、CMS導入を支援する小澤虎汰朗のポートフォリオ。学生・若者の視点で企業の魅力を伝えます。基本制作10万〜15万円・納期約1か月を目安に、相談・見積もりは無料です。',
};

export function canonicalUrl(pathname = '/') {
  let path = pathname.split(/[?#]/)[0];
  if (path === seo.pagesBase || path.startsWith(`${seo.pagesBase}/`)) path = path.slice(seo.pagesBase.length);
  path = path.replace(/\/index\.html$/, '/');
  if (path === '/404/' || path === '/404') path = '/404.html';
  if (!path) path = '/';
  if (!path.endsWith('/') && !/\.[a-z0-9]+$/i.test(path)) path += '/';
  return new URL(path, seo.productionOrigin).href;
}

export function jsonLd(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export const identitySchema = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'Person', '@id': `${seo.productionOrigin}/#person`, name: seo.name,
      alternateName: 'Kotaro Ozawa', url: canonicalUrl('/about/'), jobTitle: 'Web制作者' },
    { '@type': 'WebSite', '@id': `${seo.productionOrigin}/#website`, name: `${seo.name}のホームページ制作`,
      url: canonicalUrl('/'), inLanguage: 'ja', publisher: { '@id': `${seo.productionOrigin}/#person` } },
  ],
};
