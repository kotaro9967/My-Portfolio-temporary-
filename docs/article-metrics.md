# UmamiとPageSpeedを記事に挿入する

Generate article draftとWeekly article draftsで有効です。Netlifyの追加ビルドは行いません。CMS管理画面の撮影は行いません。

Umamiの管理画面ではWebsiteのDomainを `kotaro.tokyo` にして保存します。Website IDは変更しません。トラッキングコードは従来のトップページに加え、Astroのブログ・サービス・実績・お知らせページにも設置しています。`data-domains="kotaro.tokyo"` によりGitHub PagesやNetlifyのプレビュー環境は本番集計へ含めません。検索クエリも送信しません。

## 現在の運用

Umami CloudのAPIキー作成はProプランが必要です。無料プランのまま利用するため、GitHub ActionsからUmami APIへは接続しません。UMAMI_API_KEYの登録は不要です。アクセス解析の記事ではUmamiの実データ図表を省略し、値を推測しません。この機能だけを目的にProへ変更する必要はありません。

PageSpeedはAPIキーなしで計測を試します。定期計測で割当不足や429が発生した場合だけ、GitHubリポジトリのSettings → Secrets and variables → Actionsへ `PAGESPEED_API_KEY` を登録します。Google CloudでPageSpeed Insights APIを有効にしたキーを使い、API制限を設定する場合はPageSpeed Insights APIを指定します。GitHub Actionsから呼ぶためブラウザのHTTPリファラー制限は使えません。

将来Proへ変更する場合に備え、Umamiのwebsite IDとAPI処理はコード内に保持します。共有URLを無料プランで作成できる場合は、APIキーを使わず公開範囲を確認した共有画面だけを撮影する方式を別途追加できます。

## 記事への挿入条件

キーワード・タイトルで判定します。本文に偶然出てきた単語だけでは計測しません。

- PageSpeed・表示速度・読み込み速度・高速化・Core Web Vitals・Lighthouse: トップページをmobile/desktop各1回計測。Performance、LCP、CLS、TBT、計測日時、Lighthouseバージョンを表にし、0〜100点の棒グラフをPNGで作ります。
- Umami・アクセス解析・アクセス数・閲覧数・流入・効果測定・ブログ運用・ブログ更新など: 無料プランではAPIキーを利用できないため自動挿入しません。ログと週次通知に省略理由を残します。

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
