# UmamiとPageSpeedを記事に挿入する

Generate article draftとWeekly article draftsで有効です。Netlifyの追加ビルドは行いません。CMS管理画面の撮影は行いません。

Umamiの管理画面ではWebsiteのDomainを `kotaro.tokyo` にして保存します。Website IDは変更しません。トラッキングコードは従来のトップページに加え、Astroのブログ・サービス・実績・お知らせページにも設置しています。`data-domains="kotaro.tokyo"` によりGitHub PagesやNetlifyのプレビュー環境は本番集計へ含めません。検索クエリも送信しません。

## 現在の運用

Umami CloudのAPIキー作成はProプランが必要です。無料プランのまま利用するため、GitHub ActionsからUmami APIへは接続しません。UMAMI_API_KEYの登録は不要です。この機能だけを目的にProへ変更する必要はありません。

無料プランでは、UmamiのWebsite設定で作成したShare URLをGitHub ActionsのRepository secret `UMAMI_SHARE_URL` に登録します。Share URLは閲覧権限を持つURLなので、公開リポジトリのコードやIssueには記載しません。削除・再発行した場合はSecretも更新します。

PageSpeedはAPIキーなしで計測を試します。定期計測で割当不足や429が発生した場合だけ、GitHubリポジトリのSettings → Secrets and variables → Actionsへ `PAGESPEED_API_KEY` を登録します。Google CloudでPageSpeed Insights APIを有効にしたキーを使い、API制限を設定する場合はPageSpeed Insights APIを指定します。GitHub Actionsから呼ぶためブラウザのHTTPリファラー制限は使えません。

アクセス解析の記事では、Share URLをログイン情報のない新しいブラウザで開きます。通信先をUmami Cloudとフォント配信元に限定し、GET以外のリクエストを止めます。入力欄・フォーム・メールアドレス・電話番号をマスクした後、AIが表示状態と識別情報を確認します。承認された画像だけをmicroCMSへアップロードします。Share URLそのものは記事・ログ・AIへの指示に含めません。

## 記事への挿入条件

キーワード・タイトルで判定します。本文に偶然出てきた単語だけでは計測しません。

- PageSpeed・表示速度・読み込み速度・高速化・Core Web Vitals・Lighthouse: トップページをmobile/desktop各1回計測。Performance、LCP、CLS、TBT、計測日時、Lighthouseバージョンを表にし、0〜100点の棒グラフをPNGで作ります。
- Umami・アクセス解析・アクセス数・閲覧数・流入・効果測定・ブログ運用・ブログ更新など: Share URLのOverview画面を撮影します。管理画面に見える数値の意味や因果関係をAIに推測させません。共有画面が空・エラー・ログイン画面・識別情報を含む場合は挿入せず、理由をログと週次通知に残します。

PageSpeedの図表は実データから固定コードで生成する独自の図表です。Umamiは共有ダッシュボードのスクリーンショットです。Umami画像の確認時だけOpenAIの画像入力と短い応答のトークンを使用します。PlaywrightでPNG化しmicroCMSへアップロードします。画像化・取得・確認に失敗した素材は省略します。記事は下書きのままです。

週次Issueに採用／省略理由を記載します。手動実行ではActionsログの「計測素材」を確認してください。

## 数値の読み方と記録

PageSpeedは各条件1回のラボ計測であり、実利用者全体の速度・検索順位・施策の因果効果ではありません。Umamiは自サイトの集計例で、顧客実績や問い合わせ件数ではありません。導入前・計測遮断・データ不足を考慮して公開前に確認してください。

使用した集計値だけをActionsのarticle-measurements artifactへ90日保存します。これは恒久保管でも前後比較の自動挿入でもありません。過去の値がない時に改善率は作りません。集計には撮影ブラウザなど自分のアクセスが含まれる場合があります。

検証: node --test scripts/article-metrics.test.mjs
実ブラウザ検証: VISUAL_BROWSER_TEST=true node --test scripts/article-metrics.test.mjs
Verify article visualsではAPIをモック化し、実データ・本番キーを使わずに検証します。

公式資料:
- https://docs.umami.is/docs/cloud/api-key
- https://docs.umami.is/docs/api/website-stats
- https://developers.google.com/speed/docs/insights/v5/reference/pagespeedapi/runpagespeed
