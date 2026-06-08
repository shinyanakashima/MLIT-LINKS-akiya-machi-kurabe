// 表示用フォーマッタ。

export function pct(value: number, digits = 0): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function num(value: number): string {
  return value.toLocaleString("ja-JP");
}

/** 円を「○○万円」「○○億円」に丸めて表示。null は「—」。 */
export function yen(value: number | null | undefined): string {
  if (value == null) return "—";
  if (value >= 100_000_000) {
    return `${(value / 100_000_000).toFixed(2).replace(/\.?0+$/, "")}億円`;
  }
  if (value >= 10_000) {
    return `${Math.round(value / 10_000).toLocaleString("ja-JP")}万円`;
  }
  return `${value.toLocaleString("ja-JP")}円`;
}

/** Record<string, number> を {name, value} 配列へ（ラベル変換付き）。 */
export function toPieData(
  rec: Record<string, number>,
  labels: Record<string, string>,
): { name: string; value: number; key: string }[] {
  return Object.entries(rec)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({ key, name: labels[key] ?? key, value }))
    .sort((a, b) => b.value - a.value);
}
