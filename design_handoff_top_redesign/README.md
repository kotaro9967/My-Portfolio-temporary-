# Handoff: トップページ リデザイン（2026 版）

Astro 製ポートフォリオ（`portfolio-astro`）のトップページを、本バンドルの HTML デザインの内容に合わせて更新するための仕様書です。

## このバンドルの位置づけ

- `Profile.dc.html` は **デザインの参照実装（プロトタイプ）** です。そのまま本番に持ち込むコードではありません。
- 実装は既存の Astro プロジェクトの流儀（`src/components/*.astro` + `src/styles/global.css` のトークン + `src/data/site.ts` のデータ分離）に従って**作り直して**ください。
- 忠実度: **ハイファイ**。色・余白・タイポ・アニメーションの数値はそのまま採用してください（下記および HTML 内のインラインスタイルが正）。
- 既存の CSS 変数（`--accent: #4f5ac7` など）とデザインは一致しています。新しい値は `global.css` の `:root` に追記してください。

## 変更点サマリ（この 8 点が今回の差分）

| # | 対象 | 変更内容 |
|---|---|---|
| 1 | 全ページ背景 | canvas のアニメーション光点フィールド（青紫）を追加 |
| 2 | 各セクション見出し | マスクワイプによる出現アニメーション |
| 3 | ヒーロー直下 | KOTARO OZAWA の横スクロールマーキー |
| 4 | Skills（What I Do） | 6枚のカードを2列・無限縦スクロール + ホバーで詳細展開 |
| 5 | Works | 5秒ごとに自動でめくれるカルーセル + 進捗バー + ホバーで縦スクロールプレビュー |
| 6 | News | 最新1件を大きく特別扱い、残りはコンパクトなリスト |
| 7 | Profile | 経歴タイムライン（2024 → 2026）を追加 |
| 8 | 右端 | スクロール連動のセクションインジケータ（01–05）と、各セクション末尾の NEXT 導線 |

---

## 1. 背景の光点フィールド（新規コンポーネント）

`<canvas>` を `position: fixed; inset: 0; z-index: 0; pointer-events: none; filter: blur(14px) saturate(1.25);` で全面に敷く。GSAP（3.12）を使用。実装は `Profile.dc.html` 内の `build()` / `draw()` / `wander()` / `jolt()` をそのまま移植するのが最短。

- 粒: 既定 70 個（20–160 で可変）。色は 8 色の青紫パレットのみ:
  `[79,90,199] [99,102,241] [110,121,220] [124,134,232] [139,92,246] [150,130,235] [160,150,235] [106,90,224]`
- 各粒は `depth 0.18–1`、コア半径 `0.9–2.6 + depth*1.9`、グロー `core * 3.4–7`。
- 描画は `globalCompositeOperation = 'lighter'` + 放射グラデーション（輪郭なし、外側で完全減衰）。
- ゆらぎ: `wander()` が `±(46 + depth*80)` px を `3.4–6.5s` / `sine.inOut` で往復（無限）。
- スクロール連動: スクロール位置を `gsap.to(duration: 1.5, power2.out)` で追従させ、`y = (y*F - scroll*depth*drift) % F` でループ。折り返しは端 150px でフェード（ワープを隠す）。
- 差分 18px 超のスクロールで `jolt()`: 45% の粒だけ別レイヤー（jx/jy）に加算移動 → 戻る。**wander の tween は kill しない**（速度が反転してカクつく）。
- ヒーローを過ぎたら減光: `fade = 1 - clamp((scrollY - vh*0.55) / (vh*0.7)) * 0.72`。
- ぼんやりした大きな光の塊を 4 つ（半径 160–460px、alpha 0.03–0.075）同じ仕組みで併走。
- `prefers-reduced-motion` で全アニメーション停止（静止描画のみ）。
- ブラウザ幅リサイズで再構築。**カルーセル等の state 更新では再構築しない**（粒が飛ぶ）。

Astro での置き場所: `src/components/DotField.astro`（client script）を作り `PageShell.astro` の最背面に。

## 2. 見出しのマスクワイプ

各セクション見出し（`Profile` / `What I Do` / `Recent Works` / `Latest News` / `Let's Work Together`）に適用。

```css
@keyframes maskWipe { 0% { transform: translateX(-102%); } 45%, 58% { transform: translateX(0%); } 100% { transform: translateX(102%); } }
@keyframes maskTextIn { 0%, 44% { opacity: 0; } 46%, 100% { opacity: 1; } }
.mask-host { position: relative; overflow: hidden; }
.mask-host > h2 { opacity: 0; }
.mask-wipe { position: absolute; inset: 0; background: linear-gradient(100deg, #b9c0ee, #a3abe6); transform: translateX(-102%); z-index: 2; }
.mask-wipe.run { animation: maskWipe 1.15s cubic-bezier(.65,0,.35,1) forwards; }
.mask-host.run > h2 { animation: maskTextIn 1.15s cubic-bezier(.65,0,.35,1) forwards; }
@media (prefers-reduced-motion: reduce) { .mask-wipe { display: none; } .mask-host > h2 { opacity: 1; } }
```

IntersectionObserver（`threshold: 0.35`、一度だけ）で `.run` を付与。見出しは `Quicksand 400 / clamp(42px, 4.2vw, 62px) / line-height 1.05 / #4f5ac7`。

## 3. KOTARO OZAWA マーキー

ヒーローの直下（ファーストビューの下端に少しかかる位置）。

- 外枠 `.marquee-wrap`: `overflow: hidden; width: 100vw; margin: 0 calc(50% - 50vw); height: calc(clamp(200px,26vw,340px) * 0.70);`
- `.marquee-track`: `display: flex; width: max-content; gap: 56px; animation: marqueeScroll 26s linear infinite; margin-top: calc(clamp(200px,26vw,340px) * -0.185);`（`marqueeScroll` は `translateX(0)` → `translateX(-50%)`。同一内容の `<span>` を 2 セット並べる）
- 中身は手描き文字画像 `assets/marquee_kotaro.png`: `height: clamp(200px,26vw,340px); mix-blend-mode: multiply; opacity: .3;` + 左右フェードの `mask-image`。
- 上下も自然に溶かす（wrap 側の高さクリップ + 負の margin-top で上下を切る）。下線は**無し**。
- ホバーで `animation-duration: 95s` に減速。

## 4. Skills（What I Do）

左に見出し列（`flex: 0 1 300px`）、右にカード領域（`flex: 1 1 480px; height: clamp(560px, 64vw, 680px); overflow: hidden;` 上下 `mask-image` でフェード）。

- 2 列（`.skills-col`、`gap: 26px`）。左列 `skillsScroll 34s linear infinite`（上へ）、右列 `skillsScrollRev 40s linear infinite`（下へ）。各トラックはカードを 2 セット複製して `translateY(-50%)` でループ。
- `.skills-col:hover .skills-track { animation-play-state: paused; }`
- カード: `border: 1px solid rgba(85,96,206,.24); border-radius: 18px; background: #fff; padding: 32px 28px 26px;`、右上に `Quicksand 700 36px #eceefb` の連番。
- ホバー: `transform: scale(1.03); box-shadow: 0 22px 46px -26px rgba(79,90,199,.45); border-color: rgba(85,96,206,.45);`（`.45s cubic-bezier(.2,.8,.2,1)`）
- ホバーで詳細が展開: `.skill-detail { display: grid; grid-template-rows: 0fr; opacity: 0; }` → `1fr / 1`（`.45s cubic-bezier(.2,.8,.2,1)`、子は `overflow: hidden`）。
- カード本文は「課題 → 提供価値」の発注者目線の書き方を維持（コピーは HTML から転記）。

## 5. Works カルーセル

`position: relative; height: clamp(420px, 46vw, 560px); perspective: 1800px;` の中に 4 枚の `.wk-card` を `position: absolute; inset: 0` で重ねる。

インデックス差分 `diff = (i - index + 4) % 4` ごとの状態:

- `0`: `rotateY(0) scale(1) translateY(0); opacity: 1; z-index: 4; pointer-events: auto;`
- `1`: `scale(.97) translateY(10px); opacity: 1; z-index: 3;`
- `2`: `scale(.94) translateY(20px); opacity: .85; z-index: 2;`
- `3`（めくれた状態）: `rotateY(-112deg) scale(.97); opacity: 0; z-index: 1; box-shadow: -22px 0 36px -12px rgba(60,60,95,.4), 0 24px 50px -28px rgba(79,90,199,.35);`

- `setInterval` 5000ms で自動送り。手動ボタン（前 / 次）押下でタイマーをリセット。
- 進捗バー: 高さ数 px のトラック内に `animation: barGrow 5s linear forwards`（`linear-gradient(90deg,#a3abe6,#6e79dc)`）。**インデックスが変わるたびに要素を作り直して 0 から走らせる**（React なら `key`、Astro/vanilla なら `animation` の再適用）。
- カード内サムネイルはホバーで縦にスクロール（ページ全体を見せるプレビュー）: `.wk-shot-inner { transition: transform 2.4s cubic-bezier(.4,0,.2,1); }` / `.wk-card:hover .wk-shot-inner { transform: translateY(-46%); }`
- カード: `border-radius: 20px; border: 1px solid rgba(85,96,206,.24);`。サムネ枠は `linear-gradient(150deg, …)` + 45° ストライプのプレースホルダ（実画像が入るまで）。

## 6. News

- 最新 1 件をカード大サイズで特別扱い: `border: 1px solid rgba(85,96,206,.24); border-radius: 18px; background: #fff; padding: 30px 32px 32px;`、見出し `Zen Kaku Gothic New 700 / clamp(21px, 2.1vw, 27px) / line-height 1.55 / #2f3550`。
- 残りは 1 行 `padding: 20px 28px` のコンパクトな行リスト（日付 84px 固定・カテゴリチップ・タイトル・矢印）。行間は `1px solid rgba(85,96,206,.14)`、ホバー `background: #fafbff`。
- 既存の `NewsRow.astro` を行リスト用に、新規で「特集 1 件」のマークアップを追加。データは microCMS / content collection のまま先頭 1 件を分岐。

## 7. Profile 経歴タイムライン（2024 → 2026）

Profile セクション下部に `margin-top: clamp(56px, 7vw, 90px)` で追加。

- 見出し行: 左 `JOURNEY — 経営とITを、実務で結ぶまで`（`JetBrains Mono 11.5px / letter-spacing .2em / #4f5ac7`）、右 `2024 → 2026`（`11px / .16em / #b3b8cd`）。
- `.tl-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 40px 0; }`
- 各 `.tl-step`: `border-top: 1px solid rgba(85,96,206,.22)`（現在の年のみ `.45`）、`padding: 0 clamp(20px,2.4vw,34px) 0 0`、上端に 7px の丸（`background: #fff; border: 1px solid #8a93e4`）。現在の年は 9px・`#5560ce` 塗り・`box-shadow: 0 0 0 5px rgba(85,96,206,.12)`。
- 年号 `Quicksand 500 / clamp(30px,3vw,40px) / #9aa0c4`（現在は 600 / `#4f5ac7` + `NOW` のピル）。
- 見出し `15.5px / line-height 1.6 / #3f4564`、本文 `13.5px / line-height 1.95 / #868ca9`。
- ホバー: `.tl-grid:hover .tl-step { opacity: .45 }` / 自身は `opacity: 1`、丸は `transform: scale(1.9); background: #5560ce;`

内容（そのまま使用）:

**2024 — 数学を学びながら、開発の世界へ**
大学で線形代数・微積・統計学を学びつつ、独学でプログラミングをスタート。立ち上げたサークルでは副代表として、中小企業の基幹システム開発・運用にも携わる。

**2025 — AI・データサイエンスからWeb制作まで**
データサイエンスやAIについて学びながら、活動の幅をWebやDX領域にも拡大。IT企業の採用ページ制作や、中小企業向けのPR動画制作など、企業の魅力を発信する仕事にも取り組む。

**2026（NOW） — 学生ならではの視点で、Web制作を仕事に**
中小企業向けのHP制作を個人でも本格的にスタート。新しい技術を取り入れながら、就活生・若者ならではの視点を活かして、「若い世代にも伝わる」Webサイトづくりに取り組んでいる。

データは `src/data/site.ts` に `profile.journey: { year, now?, title, body }[]` として持たせるのが既存の流儀に合う。

## 8. セクションインジケータ + NEXT 導線

- `.sec-nav { position: fixed; right: 22px; top: 50%; transform: translateY(-50%); z-index: 15; display: flex; flex-direction: column; gap: 15px; }`、`@media (max-width: 1080px)` で非表示。
- 各項目は `01 PROFILE` … `05 CONTACT`（`JetBrains Mono 10.5px / .16em`）。非アクティブ `#c2c6da` / アクティブ `#4f5ac7`。ラベルは非アクティブ時 `opacity: 0; translateX(6px)`。下線は `12px → 26px`（`.4s cubic-bezier(.2,.8,.2,1)`）。
- 判定は IntersectionObserver（`rootMargin: '-40% 0px -40% 0px'`、`threshold: [0, 0.2, 0.6]`、最も可視率の高いものを採用）。
- 各セクション末尾に `.next-cue`: `NEXT — 02 SKILLS` のようなラベル + 66px の丸い下向き矢印。`border-top: 1px solid rgba(85,96,206,.16); padding: 34px 0 38px;`。ホバーで矢印が `translateY(7px)` / `background: #f2f4fe`。

---

## 削除するもの

- Skills セクションにあった **「YOUR ISSUE / MY ANSWER」の 2 列テーブル**（4 行の課題→回答）は削除済み。既存サイトに同等のブロックがあれば削除。

## デザイントークン（既存 `global.css` と一致 / 差分のみ追記）

追加候補: `--ink-title: #2f3550`、`--tl-line: rgba(85,96,206,.22)`、`--accent-solid: #5560ce`、`--ghost-num: #eceefb`、マスク用グラデ `#b9c0ee → #a3abe6`。
既存の `--accent / --accent-light / --accent-line / --line-*` はそのまま使用。

## アセット

`assets/` に同梱（`public/assets/` へコピー）:
`marquee_kotaro.png`（マーキーの手描きロゴ）、`sketch_hero/profile/whatido/works/news/contact.png`（各セクション背景の手描き）、`cursor-pen.png`、`icon_*.png`。
Works / News のサムネイルは CSS グラデーションのプレースホルダ。実画像に差し替え可。

## 依存

- GSAP 3.12（背景の光点のみ）。CDN でも `npm i gsap` でも可。
- フォント: Quicksand（400/500/600/700）、Zen Kaku Gothic New（400/500/700/900）、JetBrains Mono（400/500）、Architects Daughter。既存 `src/styles/fonts.css` に追加分があれば追記。

## 対応表（デザイン → Astro ファイル）

| デザイン | 反映先 |
|---|---|
| 背景の光点 | `src/components/DotField.astro`（新規）→ `PageShell.astro` |
| マスクワイプ見出し | `src/components/Section.astro` + `global.css` |
| マーキー | `src/components/HeroSignature.astro`（既存を差し替え）or `Hero.astro` 直下 |
| Skills 無限スクロール | `src/components/Skills.astro` |
| Works カルーセル | `src/components/Works.astro` + `WorkCard.astro` |
| News 特集+リスト | `src/components/News.astro` + `NewsRow.astro` |
| 経歴タイムライン | `src/components/Profile.astro` + `src/data/site.ts` |
| セクションインジケータ / NEXT | `src/components/PageShell.astro` / `Section.astro` |

## ファイル

- `Profile.dc.html` — デザイン本体（ブラウザで直接開けます。`support.js` と `assets/` が同階層に必要）
- `support.js`, `assets/` — 上記を開くためのランタイムと画像
