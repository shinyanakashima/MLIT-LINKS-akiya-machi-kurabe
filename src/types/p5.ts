// MLIT-LINKS-akiya-pipeline (P5) が配布する正規化済み物件レコードの型。
// 正準スキーマ: pipeline リポジトリ schema/akiya-property.schema.json (Draft 2020-12)
// 仕様: pipeline docs/07-output-spec.md
//
// 本プロジェクトは正規化を再実装しない。この型は P5 出力を「読む」ためだけの定義。
// P5 の schema_version 1.0 に対応。破壊的変更時は P5 のメジャー版に追随する。

export type DealType = "sale" | "rent";
export type UseType = "residential" | "commercial" | "land";
export type RecordStatus = "registered" | "closed";
export type RenovationNeeded = "required" | "done" | "as_is" | "unknown";

/** tags.labels の 12 軸。bool 軸（renovation_needed のみ enum）。 */
export interface TagLabels {
  renovation_needed: RenovationNeeded;
  migration_friendly: boolean;
  business_usable: boolean;
  subsidy_mentioned: boolean;
  vr_tour: boolean;
  farmland_attached: boolean;
  kominka: boolean;
  view_nature: boolean;
  near_school: boolean;
  near_shopping: boolean;
  parking_emphasized: boolean;
  move_in_ready: boolean;
}

export interface Tags {
  schema_version: string;
  model: string;
  labels: TagLabels;
  evidence?: Record<string, string>;
  confidence?: "high" | "medium" | "low";
}

export interface Location {
  prefecture: string;
  city: string;
  point?: Record<string, unknown> | null;
}

export interface Building {
  construction_year?: number | null;
  construction_date_raw?: string | null;
  structure?: string | null;
  layout?: string | null;
  building_area_sqm?: number | null;
  total_units?: number | null;
}

export interface Contract {
  is_closed: boolean;
  date: string | null;
  date_raw: string | null;
  amount_yen: number | null;
  amount_raw: string | null;
}

export interface Provenance {
  source_file: string;
  source_row_index?: number | null;
  dataset_year: number;
  retrieved_date?: string | null;
  source_url: string;
  license: string;
}

/**
 * 正規化済み物件レコード（1物件1レコード）。
 * 集計に使わない自由記述系（utilities/facilities/nearby_distances/land/access）は
 * 任意プロパティとして緩く受け、本アプリでは参照しない（高欠損のため）。
 */
export interface AkiyaRecord {
  id: string;
  dataset_year: number;
  source: RecordStatus;
  status: RecordStatus;
  deal_type: DealType;
  use_type: UseType;
  category_raw: string;
  location: Location;
  price_yen?: number | null;
  rent_monthly_yen?: number | null;
  amount_raw?: string | null;
  building?: Building;
  strong_points?: string | null;
  tags?: Tags | null;
  contract?: Contract | null;
  provenance: Provenance;
  [key: string]: unknown;
}

/** P5 manifest.json（配布メタ）。 */
export interface P5Manifest {
  dataset_year: number;
  schema_version: string;
  license: string;
  source_url: string;
  record_counts?: Record<string, number>;
}
