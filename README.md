# Kotaro Ozawa Portfolio

既存の単一HTMLポートフォリオをAstroへ移行したプロジェクトです。実績・ニュース・SEO記事はmicroCMSから取得し、AI生成記事は公開せず下書きとして保存します。

## ローカル起動

```bash
npm ci
cp .env.example .env
npm run dev
```

microCMSをまだ設定していない場合、Works / Newsは `src/content/` のサンプルデータを使います。Articlesは空の状態でビルドできます。

## microCMS

サービスドメインは `e0zqcccmnl` です。Hobbyプランの1個のAPIキーには、必要最小限の権限だけを設定します。

- `works`: GET
- `news`: GET
- `articles`: GET / POST

Netlifyに次の環境変数を登録します。

```text
MICROCMS_SERVICE_DOMAIN=e0zqcccmnl
MICROCMS_API_KEY=********
```

APIキーを `PUBLIC_` で始まる変数へ入れないでください。記事APIの詳細な作成手順は [docs/microcms-articles-schema.md](docs/microcms-articles-schema.md) にあります。

## AI記事を下書き保存

ローカルの `.env` に `OPENAI_API_KEY` も設定し、キーワードを渡します。

```bash
npm run article:generate -- "美容室 ホームページ制作 費用"
```

生成記事は品質チェック後、microCMSの `articles` へ `status=draft` で保存されます。公開はmicroCMS上で人が確認してから行います。この処理からNetlifyビルドは呼びません。

## Netlifyの週次ビルド

`netlify.toml` の `ignore = "exit 0"` によりGit push / PRごとのビルドをスキップします。GitHub Actionsの `Weekly Netlify build` が毎週月曜09:00 JSTにBuild Hookを1回だけ呼びます。

1. NetlifyでBuild Hookを作成する
2. GitHub Actions Secret `NETLIFY_BUILD_HOOK` にURLを登録する
3. microCMS側からBuild Hookを呼ぶWebhookは作成しない

手動で公開更新が必要な場合は、GitHub Actions画面から同ワークフローを手動実行できます。これは週次実行とは別にNetlifyクレジットを消費します。

## 本番前の確認

`astro.config.mjs` の `site` を実際の公開URLへ変更してください。canonical URLとサイトマップに利用されます。

```bash
npm run build
npm run preview
```
