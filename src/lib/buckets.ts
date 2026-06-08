// 築年・価格のビニング（集計スクリプトで使用、UI でも軸ラベル整形に再利用可）。

import type { HistogramBin } from "../types/aggregates.ts";

/** 築年バンドの境界（西暦）。各バンドは [from, to) 。 */
const CONSTRUCTION_BANDS: { label: string; from: number; to: number }[] = [
  { label: "〜1950", from: -Infinity, to: 1951 },
  { label: "1951〜1970", from: 1951, to: 1971 },
  { label: "1971〜1980", from: 1971, to: 1981 },
  { label: "1981〜1990", from: 1981, to: 1991 },
  { label: "1991〜2000", from: 1991, to: 2001 },
  { label: "2001〜2010", from: 2001, to: 2011 },
  { label: "2011〜", from: 2011, to: Infinity },
];

export function constructionBandLabel(year: number | null | undefined): string | null {
  if (year == null || !Number.isFinite(year)) return null;
  const band = CONSTRUCTION_BANDS.find((b) => year >= b.from && year < b.to);
  return band ? band.label : null;
}

/** 価格バンド（円）の境界。各バンドは [from, to)（円）。 */
const PRICE_BANDS: { label: string; from: number; to: number }[] = [
  { label: "〜100万円", from: 0, to: 1_000_000 },
  { label: "100〜300万円", from: 1_000_000, to: 3_000_000 },
  { label: "300〜500万円", from: 3_000_000, to: 5_000_000 },
  { label: "500〜1000万円", from: 5_000_000, to: 10_000_000 },
  { label: "1000〜2000万円", from: 10_000_000, to: 20_000_000 },
  { label: "2000万円〜", from: 20_000_000, to: Infinity },
];

export function priceBandLabel(yen: number | null | undefined): string | null {
  if (yen == null || !Number.isFinite(yen) || yen <= 0) return null;
  const band = PRICE_BANDS.find((b) => yen >= b.from && yen < b.to);
  return band ? band.label : null;
}

/**
 * ラベルごとのカウントを、定義順を保った HistogramBin[] に整形する。
 * 出現しなかったバンドも 0 件で残し、ビュー間の軸を安定させる。
 */
export function toHistogram(
  counts: Map<string, number>,
  orderedLabels: string[],
): HistogramBin[] {
  return orderedLabels.map((label, order) => ({
    label,
    order,
    count: counts.get(label) ?? 0,
  }));
}

export const CONSTRUCTION_BAND_LABELS = CONSTRUCTION_BANDS.map((b) => b.label);
export const PRICE_BAND_LABELS = PRICE_BANDS.map((b) => b.label);

/** 数値配列の中央値（空なら null）。 */
export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}
