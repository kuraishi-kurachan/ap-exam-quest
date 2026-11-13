# ひとり情シス奮闘記(ap-exam-quest)

応用情報技術者試験 科目A(旧・午前)の過去問を、通勤中にスマホで周回するための自分専用アプリ。
架空ベンチャーのひとり情シスとして「案件(イベント)」に過去問で対処し、会社を育てる。

- 計画と仕様: [docs/PLAN.md](docs/PLAN.md)
- 問題の書き写し手順: [docs/TRANSCRIBE.md](docs/TRANSCRIBE.md)

## 遊び方
| 要素 | 中身 |
|---|---|
| 案件(イベント) | 1回5問。弱い部門ほど出やすい |
| 未解決インシデント | 間違えた問題。翌日以降に再出題される(間隔反復: 1→3→7→14→30日) |
| 監査 | 復習待ちが10件たまると発生。10問中8問正解でクリア。21件以上たまると先に片付けないと次の案件を受けられない |
| 部門マップ | 9部門(シラバスの大分類)の習得度 |
| 社内Wiki | 正解した問題の用語がたまる |

学習記録はスマホのブラウザの中だけに保存される。設定画面からときどき書き出してバックアップすること。

## 開発
```bash
npm install
npm run dev        # 開発サーバー
npm test           # 出題ロジックのテスト
npm run build      # 本番ビルド(dist/)
```

## 問題データを増やす
`pdftotext` と `pdftoppm`(poppler)が必要。回IDは `2024a`(令和6年度 秋期)、`2024h`(春期)の形式。

```bash
npm run data:fetch -- 2024a      # IPAからPDFを取得(data-src/pdf/)
npm run data:answers -- 2024a    # 解答PDFから正解を抽出(data/answers/。git管理し、CIでも照合)
npm run data:pages -- 2024a      # 問題PDFをページ画像に(data-src/pages/)
# → docs/TRANSCRIBE.md に従ってページ画像から書き写し(data-src/transcribed/2024a/part-*.json)
npm run data:build -- 2024a      # 正解と結合して src/data/exams/2024a.json を作る
npm run data:validate            # 検査
```

`data-src/` は作業用で、git には入れない。

## 出典
問題は独立行政法人情報処理推進機構(IPA)が公表する応用情報技術者試験の過去問題を使用し、各問題に出典を表示している。
解説・業務たとえ・用語説明はAIが生成したもの。
