// Recharts を使うチャート群を遅延ロードするラッパ。
// これらを import しても Recharts は初期バンドルに含まれず、
// 実際に描画されるときに別チャンクとして読み込まれる（<Suspense> で囲んで使う）。
import { lazy } from "react";

export const CompositionPie = lazy(() =>
  import("./charts.tsx").then((m) => ({ default: m.CompositionPie })),
);
export const HistogramChart = lazy(() =>
  import("./charts.tsx").then((m) => ({ default: m.HistogramChart })),
);
export const TagRateBars = lazy(() =>
  import("./charts.tsx").then((m) => ({ default: m.TagRateBars })),
);
