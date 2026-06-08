# 空き家バンク まちくらべ（MLIT-LINKS-akiya-machi-kurabe）

町ごとの空き家バンクの健全性を**俯瞰・比較**する、自治体向けの静的ダッシュボード。
国土交通省 Project LINKS「空き家バンク（2025年度）」を、別リポジトリ
[**MLIT-LINKS-akiya-pipeline（P5）**](https://github.com/shinyanakashima/MLIT-LINKS-akiya-pipeline)
が正規化した JSON を入力とし、**自治体別に再集計**して可視化する。

> MLIT-LINKS-akiya-suryey の後継。正規化は P5 の責務であり、本リポジトリでは**再実装しない**。
> 集計と描画に専念する。

## ターゲットとユースケース

- 自治体の空き家・移住定住担当、地域政策の企画担当
- 自地域の登録・成約状況を把握し、近隣／類似規模の自治体と比較する
- 改修要否率・補助金言及率など PR 文由来の指標から施策のヒントを得る
- 自地域が「どんな型の物件が成約しやすいか」を掴む

## 画面

- **自治体一覧**: 全自治体を表で俯瞰。都道府県・登録規模・名称で絞り込み、各指標で並び替え。
- **自治体詳細**: 取引種別／用途／築年／価格帯の構成、PR 文 12 タグ率の「同県平均・同規模平均」比較、
  成約した「型」（額には触れず構成のみ）、改修要否の内訳。
- **比較ビュー**: 最大 6 自治体を横並び比較。「同県を追加」「同規模を追加」のプリセット付き。

## アーキテクチャ

```
P5 Releases（正規化済み JSON）
   └─(ビルド時に取得 fetch-data.mjs)→ data/raw/akiya-2025.json
        └─(集計 aggregate.ts)→ public/data/*.json（焼き込み）
             └─(Vite + React + Recharts)→ dist/ → GitHub Pages
```

- **実行時 API なし。** 集計はビルド時に実行し `public/data` に静的 JSON として焼き込む。
- **静的構成（DB 不要）。** GitHub Actions で 取得→集計→ビルド→Pages 公開。
- 技術: Vite + React + TypeScript + Recharts。

### 生成される集計 JSON（`public/data/`）

| ファイル | 内容 |
| --- | --- |
| `manifest.json` | 件数・スキーマ版・出所・ライセンス・規模バンド定義・タグ軸ラベル |
| `municipalities.json` | 全自治体の軽量サマリ（一覧・比較用） |
| `municipalities/<id>.json` | 自治体ごとの詳細（築年・価格帯ヒストグラム、成約プロファイル等） |
| `prefectures.json` | 都道府県ロールアップ（同県平均の基準値） |

集計成果物の型は [`src/types/aggregates.ts`](src/types/aggregates.ts) が正準。

## P5 から取り込むフィールド

P5 の正準スキーマ（`schema/akiya-property.schema.json`, `docs/07-output-spec.md`）のうち、
本アプリが**実際に参照する**のは以下に限られる（型は [`src/types/p5.ts`](src/types/p5.ts)）。

| フィールド | 用途 |
| --- | --- |
| `location.prefecture` / `location.city` | 自治体の集計キー |
| `status`（registered/closed） | 登録／成約の件数・成約率 |
| `deal_type` / `use_type` | 取引種別・用途の構成 |
| `price_yen`（売買） | 価格帯分布・中央値 |
| `building.construction_year` | 築年分布 |
| `tags.labels`（12 軸） | 改修要否率・補助金言及率・VR 内覧率などの自治体別集計 |
| `contract` の有無（額・日は不使用） | 成約した「型」の把握 |

自由記述系（`utilities` / `facilities` / `nearby_distances` / `land` / `access`）は高欠損のため使わない。

### P5 への要望・既知のギャップ

本アプリの要件のうち、現行 P5 スキーマ（v1.0）では満たせないもの。いずれも元データ由来の制約で、
P5 の設計でも将来課題と整理されている。

- **人口データが無い** → 「人口規模での相対比較」が直接はできない。
  暫定対応として**登録総数を規模の代理指標**（規模バンド xs〜xl）に用いている。
  本来の人口規模比較には外部の人口統計（e-Stat 等）の付与が必要。これは P5 の責務外。
- **緯度経度が無い**（`location.point` は常に null） → 「近隣」を地理的距離で測れない。
  暫定対応として**同一県内**を近接の代理に用いている。地理近接が要件化したら、
  P5 側に市区町村のジオコーディング（`location.point` の付与）を要望する。
- **成約日・成約額は高欠損**（〜9 割）→ 仕様どおり**額の分析はしない**。成約は「型」の把握にとどめる。

## 開発

```bash
npm install
npm run dev      # データ生成（or 取得）→ Vite dev server
```

`npm run dev` / `npm run build` は実行前に `npm run data`（取得→集計）を走らせる。
P5 の正式リリースがまだ無い間は、**P5 スキーマ準拠の合成サンプル**（`scripts/gen-fixture.mjs`、
決定的）に自動フォールバックし、開発・デモを止めない。ヘッダーに「⚠ 合成サンプルデータ」と表示される。

```bash
npm run data       # P5 取得（失敗時は合成サンプル）→ 集計を public/data へ
npm run fixture    # 合成サンプルのみ生成
npm test           # 集計ロジックの単体テスト
npm run lint       # 型チェック（tsc）
npm run build      # 本番ビルド（dist/）
```

### 実データの取得

`scripts/fetch-data.mjs` が P5 の GitHub Releases から `akiya-<year>.json` / `manifest.json` を取得する。

```bash
# 特定リリースに固定（推奨運用：本番はタグでピン留め）
RELEASE_TAG=data-2025.1.0 npm run data
# 取得を強制せず合成サンプルを使う
USE_FIXTURE=1 npm run data
```

## デプロイ（GitHub Pages）

- `.github/workflows/deploy.yml`: `main` への push / 手動 / 年次で、取得→集計→ビルド→Pages 公開。
- `.github/workflows/ci.yml`: PR / push で 型チェック・テスト・合成データでのビルド検証。
- Pages のサブパス配信に合わせ `vite.config.ts` の `base` を `/MLIT-LINKS-akiya-machi-kurabe/` に設定。
  別ホスティングでは `BASE_PATH=/ npm run build` で上書き可。

> リポジトリ設定の **Settings → Pages → Build and deployment → Source** を「GitHub Actions」にすること。

## ライセンス・出典

出典: 国土交通省 Project LINKS「空き家バンク（2025年度）」を加工して作成。
加工: MLIT-LINKS-akiya-pipeline（正規化）＋ MLIT-LINKS-akiya-machi-kurabe（集計・可視化）。
ライセンス: **CC-BY 4.0**。詳細は [ATTRIBUTION.md](ATTRIBUTION.md)。
