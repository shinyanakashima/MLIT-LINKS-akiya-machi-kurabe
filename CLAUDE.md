# CLAUDE.md

このリポジトリで作業するエージェント／開発者向けの規約と要点。

## このプロジェクトは何か

全国の空き家バンク（国土交通省 Project LINKS のオープンデータ）を、**自治体別に集計・可視化する静的ダッシュボード**。
データの取得・正規化は上流リポジトリ **MLIT-LINKS-akiya-pipeline（略称 P5）** の責務であり、**本リポジトリでは正規化を再実装しない**。集計と描画に専念する。

## アーキテクチャの原則

- **実行時 API なし・DB なし。** 集計はビルド時に一度だけ実行し、`public/data/*.json` に静的 JSON として焼き込む。
- **外部依存は最小限。** 追加ライブラリは慎重に。CDN 依存を避け、静的配信で完結させる。
- **集計コアは純粋関数。** IO を持たず（[`src/lib/aggregate-core.ts`](src/lib/aggregate-core.ts)）、単体テストから直接呼べる形を保つ。
- 集計成果物の型（ビルドと UI の契約）は [`src/types/aggregates.ts`](src/types/aggregates.ts) が正準。
- 計算方法の仕様は [`docs/ALGORITHM.md`](docs/ALGORITHM.md)。ロジックを変えたら更新する。

## ディレクトリ

```
scripts/         取得・合成・集計（ビルド時に実行）
  aggregate.ts     エントリ（IOあり）→ src/lib/aggregate-core.ts を呼ぶ
  fetch-data.mjs   P5 リリース取得（失敗時は合成サンプルへフォールバック）
  gen-fixture.mjs  決定的な合成サンプル生成
src/
  lib/           集計コア・ビニング・ラベル・フォーマッタ（IOなし）
  i18n/          日英辞書＋Context（既定は日本語）
  pages/         一覧 / 詳細 / 比較
  components/    チャート（Recharts）・KPI・Card
  types/         P5 入力型・集計成果物型（正準スキーマ）
```

## コマンド

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | データ生成 → 開発サーバ |
| `npm run data` | 取得（失敗時は合成サンプル）→ 集計を public/data へ |
| `npm test` | 集計ロジックの単体テスト |
| `npm run lint` | 型チェック（tsc） |
| `npm run build` | 本番ビルド |

**変更後は最低限 `npm run lint` と `npm test`、UI 変更時は `npm run build` まで通す。**

## コード規約

- TypeScript（strict）。型は `src/types/` に集約し、そこを正準とする。
- 集計に関わる計算は純粋関数に置き、テストを添える（`scripts/__tests__/`）。
- 出力構造を変えたら `AGGREGATE_VERSION` を上げる。
- UI 文字列は必ず i18n 辞書（`src/i18n/i18n.tsx`）経由。地名などデータ由来の値は翻訳しない。
- 数値の欠損に強く（null 安全）。派生値・代理指標・データの限界は UI と文書に明示する。

## Git・デプロイ

- 作業は `main` 中心。フィーチャーブランチは原則作らず、`main` へ直接 push で可。
- コミットメッセージは**日本語で、変更内容に絞って**書く。AI による旨の記載は入れない。
- `main` への push で GitHub Actions が「取得 → 集計 → ビルド → Pages 公開」を実行する。

## データ・ライセンス

- 出典表記は必須（フッター・ATTRIBUTION.md・README）。ライセンスは CC-BY 4.0。
- 実データ未取得の間は合成サンプルで動作し、ヘッダーに警告を表示する。数値に意味はない。
