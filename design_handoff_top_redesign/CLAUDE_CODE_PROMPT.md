# Claude Code への指示（コピペ用）

以下をそのまま Claude Code に貼ってください。`design_handoff_top_redesign` フォルダをリポジトリ直下に置いてから実行します。

---

このリポジトリ（Astro 製のポートフォリオ）のトップページを、`design_handoff_top_redesign/` にあるデザインに合わせて更新してください。

まず `design_handoff_top_redesign/README.md` を最初から最後まで読んでください。仕様はすべてそこにあります。数値（色・余白・タイポ・アニメーションの duration / easing）は README のとおりに実装してください。判断に迷ったら `design_handoff_top_redesign/Profile.dc.html` のインラインスタイルが正です。ブラウザで開いて実際の挙動を確認してもかまいません。

守ってほしいこと:

1. **HTML をそのままコピーしないこと。** あれはデザインの参照実装です。既存の Astro の構成（`src/components/*.astro`、`src/styles/global.css` のデザイントークン、`src/data/site.ts` のデータ分離、content collections）に従って作り直してください。
2. **作業前に既存コードを読むこと。** `src/pages/index.astro`、`src/components/` 配下、`src/styles/global.css`、`src/data/site.ts` を読んで、今の書き方・命名・トークンの使い方に合わせてください。新しい色や値は `:root` に追記し、ハードコードしないこと。
3. **文字コンテンツはコンポーネントに直書きせず `src/data/site.ts`（または content collection）に置くこと。** 特に新しい経歴タイムラインは `profile.journey` として追加してください。
4. **README の「変更点サマリ」8 項目を、1 項目ずつ順番に**実装してください。1 項目終わるごとに `npm run build` が通ることを確認し、何を変えたかを一言で報告してください。まとめて全部やらないこと。
5. Skills セクションの「YOUR ISSUE / MY ANSWER」の 2 列テーブルは**削除**します。
6. アクセシビリティ: 装飾要素には `aria-hidden="true"`、`prefers-reduced-motion: reduce` で全アニメーションを止める、フォーカスリングは既存のものを維持。
7. 背景の光点アニメーションのみ GSAP を使います。`npm i gsap` して `is:inline` でないクライアントスクリプトから使ってください。スクロールイベントは `{ passive: true }`、描画は `gsap.ticker`、リサイズ以外で粒を再生成しないこと（README の注意書きのとおり）。
8. `design_handoff_top_redesign/assets/` の画像を `public/assets/` にコピーしてください（同名既存ファイルは上書きせず、差分だけ確認して報告）。
9. モバイル（〜768px）でも崩れないこと。セクションインジケータは 1080px 以下で非表示、Skills は 1 列、Works カルーセルは幅いっぱいにフォールバックさせてください。

最後に、変更したファイルの一覧と、実装しきれなかった点があればその理由を報告してください。

---

## 補足：小さく進めたい場合

上の指示の 4 番を活かして、1 セクションずつ別セッションで頼むのが安全です。例:

> `design_handoff_top_redesign/README.md` の「7. Profile 経歴タイムライン」だけを実装してください。他のセクションは触らないこと。データは `src/data/site.ts` に `profile.journey` として追加し、`Profile.astro` から描画してください。
