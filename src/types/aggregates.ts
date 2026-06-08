// ビルド時集計（scripts/aggregate.ts）が public/data 配下へ焼き込む JSON の型。
// これがビルド成果物と React アプリの間の契約（スキーマ）になる。

import type { RenovationNeeded } from "./p5.ts";

/** 集計版（このアプリの集計ロジックの版）。出力構造を変えたら上げる。 */
export const AGGREGATE_VERSION = "1.0";

/** 登録規模バンド（人口データが無いため登録総数を規模の代理指標に使う）。 */
export type ScaleBand = "xs" | "s" | "m" | "l" | "xl";

export interface HistogramBin {
  /** 表示ラベル（例「〜1950」「100〜300万円」）。 */
  label: string;
  /** 並び順（昇順）。 */
  order: number;
  count: number;
}

/** 12 タグ軸の自治体別出現率（tags 付き物件を母数とする）。 */
export interface TagRates {
  /** required と判定された割合（renovation_needed=required / tagged）。 */
  renovation_required: number;
  /** done（改修済）割合。 */
  renovation_done: number;
  migration_friendly: number;
  business_usable: number;
  subsidy_mentioned: number;
  vr_tour: number;
  farmland_attached: number;
  kominka: number;
  view_nature: number;
  near_school: number;
  near_shopping: number;
  parking_emphasized: number;
  move_in_ready: number;
}

/** 成約した「型」のプロファイル（額・日は使わず構成のみ）。 */
export interface ClosedProfile {
  closed: number;
  by_use_type: Record<string, number>;
  by_deal_type: Record<string, number>;
  by_construction_band: HistogramBin[];
  /** 成約物件で多いタグ（出現数降順、上位）。 */
  top_tags: { key: keyof TagRates; label: string; count: number; rate: number }[];
}

/** 一覧・比較ビュー用の軽量サマリ。municipalities.json に配列で入る。 */
export interface MunicipalitySummary {
  /** 安定 ID（pref+city から決定的に採番）。詳細ファイル名にも使う。 */
  id: string;
  prefecture: string;
  city: string;
  registered: number;
  closed: number;
  total: number;
  /** 成約割合 = closed / total（登録母数が小さい点に注意）。 */
  closed_rate: number;
  deal_type: Record<string, number>;
  use_type: Record<string, number>;
  /** tags が付いた物件数（率の母数）。 */
  tagged: number;
  tag_rates: TagRates;
  /** 売買・登録物件の価格中央値（円）。算出不能なら null。 */
  median_sale_price_yen: number | null;
  /** 登録規模バンド（比較のグルーピング用）。 */
  scale_band: ScaleBand;
}

/** 詳細ビュー用。municipalities/<id>.json に1件ずつ入る。 */
export interface MunicipalityDetail extends MunicipalitySummary {
  construction_year_hist: HistogramBin[];
  sale_price_hist: HistogramBin[];
  renovation_breakdown: Record<RenovationNeeded, number>;
  closed_profile: ClosedProfile;
}

/** 都道府県ロールアップ（比較の基準値・同県平均）。 */
export interface PrefectureRollup {
  prefecture: string;
  municipalities: number;
  registered: number;
  closed: number;
  total: number;
  closed_rate: number;
  tagged: number;
  tag_rates: TagRates;
  median_sale_price_yen: number | null;
}

export interface AggregateManifest {
  generated_at: string;
  aggregate_version: string;
  dataset_year: number;
  schema_version: string;
  license: string;
  source_url: string;
  /** データの出所: "fixture"（合成サンプル）または "release:<tag>" など。 */
  data_origin: string;
  counts: {
    records: number;
    municipalities: number;
    prefectures: number;
  };
  scale_bands: { band: ScaleBand; label: string; min_total: number }[];
  tag_axis_labels: { key: keyof TagRates; label: string }[];
}
