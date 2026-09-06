# 画像付き記事下書き

手動の Generate article draft は、本文生成の前に Playwright / Chromium で3枚撮影・アップロードします。権限不足のままOpenAIの利用料が繰り返し発生するのを防ぎます。本文生成・品質チェック後に画像を挿入します。

- ワイヤーフレーム（設計例）
- 自作サンプルのPC表示（1200px）
- 同じサンプルのスマホ表示（390px）

独自の固定HTMLテンプレートを使用し、キーワードだけをエスケープして埋め込みます。採用関連は採用向け、それ以外は企業紹介向けです。記事ごとに独自デザインをAI生成する機能ではありません。外部通信は禁止し、実在企業の制作実績と誤解されない説明を入れます。

画像は microCMS Management API の POST /api/v1/media へアップロードし、返却された画像URL・alt・寸法・figcaptionを本文に挿入します。その後 Content API に status=draft で保存します。新しいCMSフィールドは不要です。

## 初回確認

1. 現在の MICROCMS_API_KEY に、既存のコンテンツ作成権限に加えてマネジメントAPIの「メディアのアップロード」を設定してください。キー値を変更しなければGitHub Secretsの再登録は不要です。
2. Verify article visuals が成功したら、Artifacts の sample-article-images で日本語と表示を確認できます。この検証はOpenAI・microCMSに通信せず、Netlifyも呼びません。
3. Generate article draft をキーワード「採用ページ スマホ対応」で実行します。microCMSの下書きで3枚の画像と説明文を確認してください。
4. 画像付き下書きの通し確認が成功したため、週次も標準で画像付きです。Repository variable `ARTICLE_VISUALS` を `false` に設定すると本文のみの生成へ戻せます。既存のレビュー通知は維持します。画像有効時にアップロードに失敗した記事は保存せず、週次通知は要確認になります。

初回の通し確認は `config/article-visual-trial.txt` の追加・変更で1記事起動します。このファイルを変えない通常のpushでは記事を生成しません。再度このファイルを変更する場合はAPI利用料が発生します。

## 管理画面の素材

確認済み・マスク済み画像をmicroCMSのメディアへ登録後、その画像URLをGitHub ActionsのRepository variable `MICROCMS_REVIEWED_IMAGE_URL` に指定すると、CMS・更新関連の記事だけに追加できます。公式画像配信ホストのHTTPS URLのみ使用できます。

管理画面の自動再ログイン・撮り直しは未実装です。ChatGPT側のログイン状態はGitHub Actionsへ引き継ぎません。未マスク画像、パスワード、Cookieをコミットしないでください。指定URLの画像は公開アクセス可能なので、指定前にマスク内容を確認してください。

## 失敗と費用

画像アップロードに失敗した場合、画像なしの記事を完成扱いにしません。画像アップロード後に本文の生成・保存に失敗すると、使用されない画像が残ることがあります。無条件リトライや自動削除は行いません。

画像ファイルは5MB以下。1記事につき通常3画像で、microCMSの容量・転送量、GitHub Actionsの実行時間を使用します。Netlifyのビルド回数は増えません。停止時はワークフローの ARTICLE_VISUALS を 'false' にすると従来の本文のみの生成へ戻せます。

PageSpeedの実測・グラフ化、実サイトの更新前後比較、管理画面の機密情報の自動検出は未実装です。今回のサンプル画像はそれらの代用や実測結果ではありません。

API仕様: https://document.microcms.io/management-api/post-media
