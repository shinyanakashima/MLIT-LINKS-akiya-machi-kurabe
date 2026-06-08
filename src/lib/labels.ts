// 日本語ラベルと分類軸の定義（集計スクリプトと UI で共有）。

import type { ScaleBand, TagRates } from "../types/aggregates.ts";
import type { DealType, RenovationNeeded, UseType } from "../types/p5.ts";

export const TAG_AXIS_LABELS: { key: keyof TagRates; label: string }[] = [
  { key: "renovation_required", label: "要改修" },
  { key: "renovation_done", label: "改修済" },
  { key: "migration_friendly", label: "移住向き" },
  { key: "business_usable", label: "事業利用可" },
  { key: "subsidy_mentioned", label: "補助金言及" },
  { key: "vr_tour", label: "VR内覧" },
  { key: "farmland_attached", label: "農地付き" },
  { key: "kominka", label: "古民家" },
  { key: "view_nature", label: "眺望・自然" },
  { key: "near_school", label: "学校至近" },
  { key: "near_shopping", label: "買物利便" },
  { key: "parking_emphasized", label: "駐車場訴求" },
  { key: "move_in_ready", label: "即入居可" },
];

export const DEAL_TYPE_LABELS: Record<DealType, string> = {
  sale: "売買",
  rent: "賃貸",
};

export const USE_TYPE_LABELS: Record<UseType, string> = {
  residential: "居住用",
  commercial: "事業用",
  land: "土地",
};

export const RENOVATION_LABELS: Record<RenovationNeeded, string> = {
  required: "要改修",
  done: "改修済",
  as_is: "現状渡し",
  unknown: "不明",
};

/**
 * 登録規模バンド（人口データを持たないため、登録総数を規模の代理に用いる）。
 * min_total 以上が該当（降順に判定）。
 */
export const SCALE_BANDS: { band: ScaleBand; label: string; min_total: number }[] = [
  { band: "xl", label: "超大（200件〜）", min_total: 200 },
  { band: "l", label: "大（100〜199件）", min_total: 100 },
  { band: "m", label: "中（30〜99件）", min_total: 30 },
  { band: "s", label: "小（10〜29件）", min_total: 10 },
  { band: "xs", label: "極小（〜9件）", min_total: 0 },
];

export function scaleBandOf(total: number): ScaleBand {
  for (const b of SCALE_BANDS) {
    if (total >= b.min_total) return b.band;
  }
  return "xs";
}

export function scaleBandLabel(band: ScaleBand): string {
  return SCALE_BANDS.find((b) => b.band === band)?.label ?? band;
}

export function tagLabel(key: keyof TagRates): string {
  return TAG_AXIS_LABELS.find((t) => t.key === key)?.label ?? key;
}
