/**
 * microCMS の読み取り専用プロキシ。
 *
 * ブラウザから microCMS を直接叩くと APIキーが HTML に含まれてしまうため、
 * サーバー側（Netlify Functions）で中継する。キーは Netlify の環境変数
 * MICROCMS_SERVICE_DOMAIN / MICROCMS_API_KEY からしか読まないので、
 * 配信されるファイルには一切残らない。
 *
 * 使い方: /.netlify/functions/microcms?endpoint=works
 */
const ALLOWED = ['works', 'news'];

export async function handler(event) {
  const endpoint = (event.queryStringParameters || {}).endpoint || '';
  if (!ALLOWED.includes(endpoint)) {
    return json(400, { error: 'endpoint must be one of ' + ALLOWED.join(', ') });
  }

  const domain = process.env.MICROCMS_SERVICE_DOMAIN;
  const key = process.env.MICROCMS_API_KEY;
  if (!domain || !key) {
    return json(500, { error: 'MICROCMS_SERVICE_DOMAIN / MICROCMS_API_KEY が未設定です' });
  }

  try {
    const res = await fetch(
      'https://' + domain + '.microcms.io/api/v1/' + endpoint + '?limit=100',
      { headers: { 'X-MICROCMS-API-KEY': key } }
    );
    const body = await res.text();
    return {
      statusCode: res.status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        // 60秒キャッシュ（CDN側は5分）。更新の反映と負荷のバランス
        'Cache-Control': 'public, max-age=60, s-maxage=300',
      },
      body,
    };
  } catch (e) {
    return json(502, { error: String(e && e.message ? e.message : e) });
  }
}

function json(statusCode, obj) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(obj),
  };
}
