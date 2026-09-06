# 毎週の記事リサーチ

週次・手動の両方で、記事本文を生成する前にOpenAI Responses APIのweb_searchを実行します。既存のOPENAI_API_KEYを使い、モデルはgpt-5-miniを維持します。microCMSのフィールド追加は不要です。

- 検索対象はscripts/article-research.mjsの一次資料ドメイン一覧。記事テーマを増やす際はこの一覧も確認してください。
- 検索処理は最大3ツール呼び出し・出力4000トークン・180秒。本文生成は従来どおり最大9000出力トークンです。検索取得テキストは入力課金されるため総額の厳密な上限ではありません。
- APIの引用annotationから出典IDを作り、本文中のIDをクリックできるリンクへ変換します。最低2資料が必要です。失敗時に未調査の記事を保存するフォールバックはありません。
- 図表は本文内のHTML比較表・工程リスト・チェックリストです。出典のある情報と制作上の提案を区別するよう指示します。出典ID検証は、主張の正しさや図表と資料の一致を保証しません。数値・条件・更新日は公開前に確認してください。
- 固定テンプレート3枚は通常挿入しません。必要な場合だけARTICLE_VISUALSとARTICLE_SAMPLE_VISUALSの両方をtrueにします。実サイト撮影やPageSpeed実測を行ったと偽ることはありません。
- 週次レビューIssueに資料数・検索回数を追加。Actionsログには調査と本文それぞれの入力・出力トークン数を記録します。
- 下書き保存と人による公開判断を維持。Netlifyのデプロイ頻度は変更しません。

検証: `node --test scripts/article-research.test.mjs scripts/article-visuals.test.mjs`

料金確認先: https://developers.openai.com/api/docs/pricing
