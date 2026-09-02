# microCMS `articles` API設定

## 1. APIを作成

- API名: `SEO記事`
- エンドポイント: `articles`
- APIの型: `リスト形式`

## 2. フィールド

| 表示名 | フィールドID | 種類 | 必須 |
| --- | --- | --- | --- |
| タイトル | `title` | テキストフィールド | はい |
| スラッグ | `slug` | テキストフィールド | はい |
| 概要 | `description` | テキストエリア | はい |
| 本文 | `body` | リッチエディタ | はい |
| カテゴリ | `category` | テキストフィールド | はい |
| 対象キーワード | `keyword` | テキストフィールド | はい |
| 想定読者 | `targetAudience` | テキストエリア | はい |
| AI生成 | `generatedByAI` | 真偽値 | はい |
| レビュー状態 | `reviewStatus` | セレクトフィールド（複数選択OFF） | はい |

`reviewStatus` の選択肢は `要確認` と `確認済み` の2つを作成します。
Content APIでは単一選択でも配列形式になるため、生成スクリプトは `["要確認"]` を送信します。

## 3. APIキー

HobbyプランはAPIキーが1個までなので、同じキーをAstroの読み取りと記事投稿に使用します。キーの個別権限を次の最小構成にしてください。

1. `works`: GET
2. `news`: GET
3. `articles`: GET / POST

`.env` では `MICROCMS_API_KEY` に設定し、`MICROCMS_WRITE_API_KEY` は空欄にします。Team以上でキーを分離できる場合だけ、後者へPOST専用キーを設定します。

APIキーをブラウザ向けの `PUBLIC_` 環境変数に設定しないでください。

## 4. 下書きと公開

生成スクリプトは `status=draft` を明示して保存します。microCMSで内容を確認し、`reviewStatus` を `確認済み` に変更してから手動で公開してください。

Netlifyの再ビルドは、GitHub Actionsが毎週月曜9:00（日本時間）に1回だけ実行します。`netlify.toml` の `ignore` 設定によりGit push時のビルドもスキップします。記事公開時にmicroCMSからBuild Hookを直接呼ぶWebhookは設定しないでください。

NetlifyでBuild Hookを発行したら、GitHubリポジトリの `Settings > Secrets and variables > Actions` に `NETLIFY_BUILD_HOOK` という名前で登録します。URLはリポジトリやソースコードへ直接書かないでください。
