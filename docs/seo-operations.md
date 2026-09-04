# SEOの設定・運用

## kotaro.tokyo への切り替え

- 本番の正規URLは `https://kotaro.tokyo`。Search Consoleのドメイン所有権確認は完了済み（本人の確認画面による）。確認用TXTレコードは削除しない。
- `config/seo.mjs` と `public/robots.txt` を更新済み。次回のビルドでcanonical、OG URL、構造化データ、サイトマップ、robotsに新ドメインが反映される。コード更新だけでは公開サイトへの反映は完了しない。
- NetlifyのDomain managementで `kotaro.tokyo` がPrimary domainであること、HTTPSが有効であることを確認する。旧Netlify URLが新ドメインの同じパスへ転送されることも確認する。管理画面の状態を未確認のまま強制転送を追加しない。
- Netlifyの追加デプロイは実行せず、既存の週次公開で反映する。GitHub Pagesは従来どおり閲覧可能で、次回のPagesビルドから新ドメインをcanonicalにする。
- 反映後に `https://kotaro.tokyo/sitemap-index.xml` を開き、参照先のsitemapにも `https://kotaro.tokyo/` のURLが並んでいることを確認する。
- Search Consoleの `kotaro.tokyo` プロパティ → サイトマップへ、`https://kotaro.tokyo/sitemap-index.xml` を送信する。続いてURL検査でホーム、`/services/`、公開済み代表記事を確認する。
- サイトマップ送信・本番の転送とHTTPSの確認・インデックス確認はまだ未実施。所有権確認はインデックス登録や検索上位表示を保証しない。

## 今回の実装

- 正規URLは `config/seo.mjs` の productionOrigin に集約。GitHub Pagesは閲覧用のコピーとして本番URLをcanonicalで示す。
- 本番と同じURLをサイトマップに載せ、404は除外。404・Netlifyのdeploy-preview/branch-deployはnoindex。
- 全ページのタイトル・説明・言語・canonical、JSON-LD、内部リンク、サイトマップを `npm run seo:check` で検査。通常ビルドでも実行。
- WebSite/Person、パンくず、記事のArticle、サービスのServiceの構造化データを追加。評価・口コミ・実績は捏造しない。
- `/services/` に制作範囲・料金目安・納期・維持費・流れ・FAQを集約。ブログとホームからリンク。
- 記事は著者ページ、サービスページ、同カテゴリ優先の関連記事へリンク。AI利用と更新日を表示。
- 公開済みCMSコンテンツを全件取得。slugの重複・不正を検知。CMS設定不足ならNetlify/Actionsでビルド停止。

## 公開前に必要な確認

1. GitHub Actions「Build GitHub Pages preview」を実行し、サービス情報・料金・リンクを確認する。Netlifyクレジットは使わない。
2. Netlifyは週1回の既存運用で反映する。手動での追加実行はクレジット消費に注意。
3. GitHubの緑の「Weekly Netlify build」はHook受付成功を示すだけ。Netlify側の実際のビルド結果も確認する。
4. microCMSで公開済みの記事が反映されることを確認。下書きは検索にもサイトにも出さない。
5. 公開済み実績・お知らせにサンプルや架空案件が紛れていないか確認。自主制作ならその旨を表示する。

## ご本人のアカウントで行うこと

- Search Consoleに本番URLを登録し、所有権を確認。`/sitemap-index.xml` を送信。
- URL検査でホーム、サービス、代表記事の取得・インデックス状況を確認。登録や上位表示は保証されない。
- サイトに既存のUmami計測がある場合は設定を確認。GA4を追加する場合は測定ID、同意・プライバシー方針を決めてから導入する。勝手にタグを追加しない。
- 実際に顧客先を訪問するビジネスならGoogleビジネスプロフィールの登録要件を確認する。オンライン専業は対象外。住所や口コミを作らない。
- 実績の詳細・写真・顧客の声は掲載許可を得た実物を用意する。

## 独自ドメイン取得後

1. DNS・HTTPS・ホスティングの独自ドメイン設定を完了する。
2. `config/seo.mjs` の productionOrigin を変更し、ビルドする。Astroの本番site、canonical、構造化データ、生成サイトマップとrobotsへ反映される。
3. 旧Netlify URLから新ドメインの同じパスへ301転送を設定する。ホームに一括転送しない。
4. Search Consoleへ新ドメインを登録し、適用できる場合はアドレス変更手続きを行う。
5. GitHub PagesのURLは引き続き閲覧可能。次回Pagesビルドで新ドメインをcanonicalにする。

## 月次の改善

検索表示回数・検索語・クリック率・問い合わせを確認し、検索意図と内容が合う記事から改善する。文字数や記事数だけを目標にしない。週3本は下書き候補として生成し、事実・価格・出典・独自の経験を確認してから公開する。順位、Core Web Vitals、問い合わせ数は未測定であり、実装だけで改善を保証するものではない。
