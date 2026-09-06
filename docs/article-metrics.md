# UmamiとPageSpeedを記事に挿入する

Generate article draftとWeekly article draftsで有効です。Netlifyの追加ビルドは行いません。CMS管理画面の撮影は行いません。

## 接続設定

GitHubリポジトリのSettings → Secrets and variables → Actions → New repository secretで登録します。

- UMAMI_API_KEY: Umami Cloudのプロフィール → Settings → API keys → Create keyで作成したAPIキー。チャット・コード・公開URLには貼らないでください。
- PAGESPEED_API_KEY: Google CloudでPageSpeed Insights APIを有効にしたAPIキー（任意ですが定期計測には推奨）。API制限を設定するならPageSpeed Insights APIを指定します。GitHub Actionsから呼ぶためブラウザのHTTPリファラー制限は使えません。未設定でもAPIを試しますが、割当不足や429の場合は図表を省略して通知します。

Umamiのwebsite IDは既存トップページのトラッキング設定から取得済みです。761c9463-2d4a-4f2d-b25e-075c0bac91d2を対象とし、hostname=kotaro.tokyoで集計します。別サイトに移す場合はscripts/article-metrics.mjsの設定も変更します。

## 記事への挿入条件

キーワード・タイトルで判定します。本文に偶然出てきた単語だけでは計測しません。

- PageSpeed・表示速度・読み込み速度・高速化・Core Web Vitals・Lighthouse: トップページをmobile/desktop各1回計測。Performance、LCP、CLS、TBT、計測日時、Lighthouseバージョンを表にし、0〜100点の棒グラフをPNGで作ります。
- Umami・アクセス解析・アクセス数・閲覧数・流入・効果測定・ブログ運用・ブログ更新など: 当日を除く直近28日（日本時間）のPV/訪問者数と、APIに返った日別PVの棒グラフ・表を挿入します。欠損日は推測で埋めません。個人ごとのデータやURLクエリは取得しません。

図表は実データから固定コードで生成する独自の図表です。公式管理画面のスクリーンショットではありません。AIに数値を生成させず、追加のOpenAI呼び出しはありません。PlaywrightでPNG化しmicroCMSへアップロードします。画像化失敗時はHTMLの表のみ、API取得失敗時はその図表のみ省略します。記事は下書きのままです。

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
