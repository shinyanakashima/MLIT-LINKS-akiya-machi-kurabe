// 軽量 i18n（日本語/英語）。既定は日本語、ヘッダーのトグルで英語へ切替。
// 依存ライブラリは増やさず、辞書 + Context + フックで実装する。
// 地名（都道府県・市区町村）はデータ由来のためそのまま表示する。

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ScaleBand, TagRates } from "../types/aggregates.ts";
import type { DealType, RenovationNeeded, UseType } from "../types/p5.ts";
import { CONSTRUCTION_BAND_LABELS, PRICE_BAND_LABELS } from "../lib/buckets.ts";

export type Lang = "ja" | "en";

const STORAGE_KEY = "akiya-machi-kurabe.lang";

type Entry = { ja: string; en: string };

// UI 文字列辞書（{name} はプレースホルダ）
const STRINGS: Record<string, Entry> = {
  "app.title": { ja: "空き家バンク まちくらべ", en: "Akiya Bank — Town Compare" },
  "app.subtitle": {
    ja: "国土交通省 Project LINKS 空き家バンク（{year}年度）正規化データを自治体別に集計・比較",
    en: "Aggregating & comparing MLIT Project LINKS vacant-house bank (FY{year}) normalized data by municipality",
  },
  "meta.data": { ja: "データ: {year}年度", en: "Data: FY{year}" },
  "meta.schema": { ja: "akiya-pipelineスキーマ v{v}", en: "akiya-pipeline schema v{v}" },
  "meta.generated": { ja: "集計 {date}", en: "Built {date}" },
  "meta.fixture": { ja: "⚠ 合成サンプルデータ（実データ未取得）", en: "⚠ Synthetic sample data (no real data yet)" },
  "meta.origin": { ja: "出所: {origin}", en: "Source: {origin}" },

  "tab.overview": { ja: "自治体一覧", en: "Municipalities" },
  "tab.compare": { ja: "比較ビュー", en: "Compare" },

  "footer.src1": { ja: "出典: 国土交通省 Project LINKS「空き家バンク（{year}年度）」（", en: "Source: MLIT Project LINKS “Vacant House Bank (FY{year})” (" },
  "footer.dataset": { ja: "データセット", en: "dataset" },
  "footer.src2": {
    ja: "）を加工して作成。加工: MLIT-LINKS-akiya-pipeline（正規化）＋ akiya-machi-kurabe（集計・可視化）。ライセンス: {license}。",
    en: "), processed. Processing: MLIT-LINKS-akiya-pipeline (normalization) + akiya-machi-kurabe (aggregation & visualization). License: {license}.",
  },
  "footer.fixtureNote": {
    ja: "⚠ 現在表示中のデータは、パイプラインの正式リリースが未取得のため生成した合成サンプルです。数値に意味はありません。実データ公開後、ビルドで自動的に置き換わります。",
    en: "⚠ The data shown is a synthetic sample generated because the pipeline release is not yet available. The numbers are not meaningful and will be replaced automatically once real data is published.",
  },

  "common.loading": { ja: "読み込み中…", en: "Loading…" },
  "store.error": { ja: "集計データを読み込めません", en: "Failed to load aggregated data" },
  "store.errorHint": { ja: "ローカルでは `npm run data` で public/data を生成してください。", en: "Locally, run `npm run data` to generate public/data." },
  "chart.nodata": { ja: "データなし", en: "No data" },

  "ov.intro": {
    ja: "全 {muni} 自治体・{rec} 物件。行をクリックすると自治体の詳細を表示します。「成約率」は登録母数が小さいほど振れやすい点に注意。",
    en: "{muni} municipalities · {rec} properties. Click a row for details. Note: “closed rate” is volatile when the listing base is small.",
  },
  "ov.col.name": { ja: "市区町村", en: "Municipality" },
  "ov.col.total": { ja: "総数", en: "Total" },
  "ov.col.registered": { ja: "登録", en: "Listed" },
  "ov.col.closed": { ja: "成約", en: "Closed" },
  "ov.col.closed_rate": { ja: "成約率", en: "Closed rate" },
  "ov.col.median": { ja: "売買中央値", en: "Median (sale)" },
  "ov.col.reno": { ja: "要改修率", en: "Reno-needed" },
  "ov.col.subsidy": { ja: "補助金言及率", en: "Subsidy" },
  "ov.col.vr": { ja: "VR内覧率", en: "VR tour" },
  "ov.col.scale": { ja: "規模", en: "Scale" },
  "ov.f.pref": { ja: "都道府県", en: "Prefecture" },
  "ov.f.scale": { ja: "登録規模", en: "Listing scale" },
  "ov.f.search": { ja: "市区町村名で検索", en: "Search municipality" },
  "ov.all": { ja: "すべて", en: "All" },
  "ov.searchPh": { ja: "例: 軽井沢", en: "e.g. Karuizawa" },
  "ov.shown": { ja: "{n} 件表示", en: "{n} shown" },
  "ov.sortHint": { ja: "クリックで並び替え", en: "Click to sort" },

  "mu.back": { ja: "← 一覧へ戻る", en: "← Back to list" },
  "mu.openCompare": { ja: "この町を比較ビューで開く →", en: "Open in compare view →" },
  "mu.kpi.total": { ja: "掲載総数", en: "Total listings" },
  "mu.kpi.registered": { ja: "登録中", en: "Listed" },
  "mu.kpi.closed": { ja: "成約", en: "Closed" },
  "mu.kpi.closed_rate": { ja: "成約率", en: "Closed rate" },
  "mu.kpi.median": { ja: "売買価格 中央値", en: "Median sale price" },
  "mu.kpi.tagged": { ja: "PR文タグ付き", en: "PR-tagged" },
  "mu.sec.composition": { ja: "登録物件の構成", en: "Listing composition" },
  "mu.chart.deal": { ja: "取引種別", en: "Deal type" },
  "mu.chart.use": { ja: "用途", en: "Use type" },
  "mu.chart.construction": { ja: "築年分布", en: "Construction year" },
  "mu.chart.price": { ja: "売買価格帯の分布", en: "Sale price range" },
  "mu.sec.tagcompare": { ja: "PR文タグ率 — 同県・同規模との比較", en: "PR-tag rates — vs prefecture & same scale" },
  "mu.tagcompare.title": {
    ja: "{city} vs 同県平均 vs 同規模平均（PR文タグ付き {n} 件が母数）",
    en: "{city} vs prefecture avg vs same-scale avg (base: {n} PR-tagged)",
  },
  "mu.series.prefAvg": { ja: "{pref}平均", en: "{pref} avg" },
  "mu.series.bandAvg": { ja: "同規模平均", en: "Same-scale avg" },
  "mu.note.tag": {
    ja: "※ bool タグは「PR文に明示的根拠があるとき true」（P5 docs/03）。言及なしは false のため、率は「訴求の積極度」に近い指標として読む。",
    en: "Note: boolean tags are true only when explicitly supported by the PR text (P5 docs/03). No mention = false, so the rate reads closer to “how actively it is promoted.”",
  },
  "mu.sec.closedType": { ja: "成約した「型」", en: "The “type” that closed" },
  "mu.closed.note": {
    ja: "成約額・成約日は欠損が大半（P5仕様）のため、ここでは額には触れず、成約した物件の構成だけを見る。成約 {n} 件。",
    en: "Closing price/date are mostly missing (P5 spec), so we ignore amounts and look only at the composition of closed properties. Closed: {n}.",
  },
  "mu.closed.none": { ja: "この自治体の成約物件はありません。", en: "No closed properties for this municipality." },
  "mu.chart.closedDeal": { ja: "成約：取引種別", en: "Closed: deal type" },
  "mu.chart.closedUse": { ja: "成約：用途", en: "Closed: use type" },
  "mu.chart.closedConstruction": { ja: "成約：築年分布", en: "Closed: construction year" },
  "mu.card.topTags": { ja: "成約物件に多いPR文タグ", en: "Top PR tags among closed" },
  "mu.topTags.none": { ja: "タグ付き成約物件がありません。", en: "No tagged closed properties." },
  "mu.topTags.item": { ja: "{label}：{count} 件（成約タグ付き中 {pct}）", en: "{label}: {count} (of tagged closed {pct})" },
  "mu.sec.reno": { ja: "改修要否の内訳", en: "Renovation-need breakdown" },
  "mu.chart.reno": { ja: "改修要否（PR文タグ付き）", en: "Renovation need (PR-tagged)" },
  "mu.card.peers": { ja: "同規模自治体（参考）", en: "Same-scale municipalities (ref)" },
  "mu.peers.note": { ja: "同じ登録規模「{scale}」の自治体は {n} 件。", en: "{n} municipalities at the same listing scale “{scale}”." },
  "mu.sec.similar": { ja: "特徴が似た自治体", en: "Municipalities with similar characteristics" },
  "mu.similar.note": {
    ja: "取引種別・用途の構成、PR文タグ率、築年・価格帯の分布、成約率をベクトル化し、コサイン類似度で近い自治体を提示（規模・県は問わない）。",
    en: "Nearest municipalities by cosine similarity over deal/use mix, PR-tag rates, construction/price distributions, and closed rate (regardless of scale or prefecture).",
  },
  "mu.similar.item": { ja: "{name}（類似度 {score}）", en: "{name} (similarity {score})" },
  "error.detail": { ja: "詳細を読み込めません", en: "Failed to load detail" },

  "cmp.intro": {
    ja: "自治体を最大 {max} 件まで選んで横並びに比較します。近隣・同一県内・同規模での相対比較に。",
    en: "Select up to {max} municipalities to compare side by side — for nearby, same-prefecture, or same-scale comparison.",
  },
  "cmp.add": { ja: "自治体を追加", en: "Add municipality" },
  "cmp.select": { ja: "選択…", en: "Select…" },
  "cmp.opt": { ja: "{pref} {city}（{n}件）", en: "{pref} {city} ({n})" },
  "cmp.addPref": { ja: "+ 先頭と同県を追加", en: "+ Add same prefecture" },
  "cmp.addBand": { ja: "+ 先頭と同規模を追加", en: "+ Add same scale" },
  "cmp.clear": { ja: "クリア", en: "Clear" },
  "cmp.empty": {
    ja: "上の「自治体を追加」から比較対象を選んでください。一覧や詳細ページの「比較ビューで開く」からも来られます。",
    en: "Pick municipalities from “Add municipality” above. You can also arrive here via “Open in compare view” on the list or detail pages.",
  },
  "cmp.metric": { ja: "指標", en: "Metric" },
  "cmp.row.pref": { ja: "都道府県", en: "Prefecture" },
  "cmp.row.scale": { ja: "登録規模", en: "Listing scale" },
  "cmp.row.total": { ja: "掲載総数", en: "Total listings" },
  "cmp.row.registered": { ja: "登録中", en: "Listed" },
  "cmp.row.closed": { ja: "成約", en: "Closed" },
  "cmp.row.closed_rate": { ja: "成約率", en: "Closed rate" },
  "cmp.row.median": { ja: "売買価格 中央値", en: "Median sale price" },
  "cmp.row.tagged": { ja: "PR文タグ付き", en: "PR-tagged" },
  "cmp.sec.tagrates": { ja: "PR文タグ率の比較", en: "PR-tag rate comparison" },
  "cmp.note": {
    ja: "※ 成約率・中央値は登録母数が小さい自治体ほど振れやすい。規模バンドを揃えて見ると安定します。",
    en: "Note: closed rate and median are volatile for municipalities with a small listing base. Comparing within the same scale band is more stable.",
  },
  "cmp.remove": { ja: "削除", en: "Remove" },
};

// キー基準のローカライズ・ラベル（manifest の日本語ラベルではなく key で引く）
const TAG: Record<keyof TagRates, Entry> = {
  renovation_required: { ja: "要改修", en: "Reno needed" },
  renovation_done: { ja: "改修済", en: "Renovated" },
  migration_friendly: { ja: "移住向き", en: "Migration-friendly" },
  business_usable: { ja: "事業利用可", en: "Business-usable" },
  subsidy_mentioned: { ja: "補助金言及", en: "Subsidy" },
  vr_tour: { ja: "VR内覧", en: "VR tour" },
  farmland_attached: { ja: "農地付き", en: "Farmland" },
  kominka: { ja: "古民家", en: "Kominka" },
  view_nature: { ja: "眺望・自然", en: "View/Nature" },
  near_school: { ja: "学校至近", en: "Near school" },
  near_shopping: { ja: "買物利便", en: "Near shopping" },
  parking_emphasized: { ja: "駐車場訴求", en: "Parking" },
  move_in_ready: { ja: "即入居可", en: "Move-in ready" },
};

const DEAL: Record<DealType, Entry> = {
  sale: { ja: "売買", en: "Sale" },
  rent: { ja: "賃貸", en: "Rent" },
};

const USE: Record<UseType, Entry> = {
  residential: { ja: "居住用", en: "Residential" },
  commercial: { ja: "事業用", en: "Commercial" },
  land: { ja: "土地", en: "Land" },
};

const RENO: Record<RenovationNeeded, Entry> = {
  required: { ja: "要改修", en: "Needed" },
  done: { ja: "改修済", en: "Renovated" },
  as_is: { ja: "現状渡し", en: "As-is" },
  unknown: { ja: "不明", en: "Unknown" },
};

const SCALE: Record<ScaleBand, Entry> = {
  xl: { ja: "超大（200件〜）", en: "XL (200+)" },
  l: { ja: "大（100〜199件）", en: "L (100–199)" },
  m: { ja: "中（30〜99件）", en: "M (30–99)" },
  s: { ja: "小（10〜29件）", en: "S (10–29)" },
  xs: { ja: "極小（〜9件）", en: "XS (≤9)" },
};

// ヒストグラムの帯ラベル英訳。JA ラベルは buckets.ts が単一の定義元なので、
// そこから取り込んだ配列と EN 配列を「定義順（位置）」で対応づける。
// これにより buckets.ts 側の JA 文言を変えても英訳が静かにズレない。
// バンド数が変わったら下の長さチェックが実行時に検知する。
const CONSTRUCTION_BAND_EN = ["–1950", "1951–1970", "1971–1980", "1981–1990", "1991–2000", "2001–2010", "2011–"];
const PRICE_BAND_EN = ["<¥1M", "¥1–3M", "¥3–5M", "¥5–10M", "¥10–20M", "¥20M+"];

function zipBandLabels(jaLabels: readonly string[], enLabels: readonly string[], kind: string): Record<string, string> {
  if (jaLabels.length !== enLabels.length) {
    throw new Error(
      `i18n: ${kind} バンドの日本語(${jaLabels.length})と英語(${enLabels.length})の数が一致しません。i18n.tsx の EN 配列を buckets.ts の定義に合わせてください。`,
    );
  }
  return Object.fromEntries(jaLabels.map((ja, i) => [ja, enLabels[i]]));
}

const BAND_EN: Record<string, string> = {
  ...zipBandLabels(CONSTRUCTION_BAND_LABELS, CONSTRUCTION_BAND_EN, "築年"),
  ...zipBandLabels(PRICE_BAND_LABELS, PRICE_BAND_EN, "価格"),
};

function interpolate(s: string, vars?: Record<string, string | number>): string {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`));
}

export interface I18n {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: keyof typeof STRINGS, vars?: Record<string, string | number>) => string;
  tag: (k: keyof TagRates) => string;
  /** ローカライズ済みタグ軸リスト（描画の反復用、定義順を維持）。 */
  tagList: { key: keyof TagRates; label: string }[];
  deal: Record<DealType, string>;
  use: Record<UseType, string>;
  reno: Record<RenovationNeeded, string>;
  scale: (b: ScaleBand) => string;
  band: (jaLabel: string) => string;
  /** 円の表示（言語別）。null は「—」。 */
  yen: (v: number | null | undefined) => string;
  /** 件数（ja「N 件」/ en「N」）。 */
  count: (n: number) => string;
  /** 日時の表示（言語ロケール）。 */
  dateTime: (iso: string) => string;
}

const I18nContext = createContext<I18n | null>(null);

function detectInitial(): Lang {
  if (typeof window === "undefined") return "ja";
  const saved = window.localStorage.getItem(STORAGE_KEY);
  return saved === "en" ? "en" : "ja";
}

const TAG_KEYS = Object.keys(TAG) as (keyof TagRates)[];

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectInitial);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* localStorage 不可でも無視 */
    }
  }, []);

  const value = useMemo<I18n>(() => {
    const pick = (e: Entry) => (lang === "en" ? e.en : e.ja);
    return {
      lang,
      setLang,
      t: (key, vars) => interpolate(pick(STRINGS[key]), vars),
      tag: (k) => pick(TAG[k]),
      tagList: TAG_KEYS.map((k) => ({ key: k, label: pick(TAG[k]) })),
      deal: { sale: pick(DEAL.sale), rent: pick(DEAL.rent) },
      use: { residential: pick(USE.residential), commercial: pick(USE.commercial), land: pick(USE.land) },
      reno: { required: pick(RENO.required), done: pick(RENO.done), as_is: pick(RENO.as_is), unknown: pick(RENO.unknown) },
      scale: (b) => pick(SCALE[b]),
      band: (jaLabel) => (lang === "en" ? (BAND_EN[jaLabel] ?? jaLabel) : jaLabel),
      yen: (v) => formatYen(v, lang),
      count: (n) => (lang === "en" ? n.toLocaleString("en-US") : `${n.toLocaleString("ja-JP")} 件`),
      dateTime: (iso) => new Date(iso).toLocaleString(lang === "en" ? "en-US" : "ja-JP"),
    };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

function formatYen(value: number | null | undefined, lang: Lang): string {
  if (value == null) return "—";
  if (lang === "en") {
    if (value >= 1_000_000) {
      return `¥${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")}M`;
    }
    return `¥${value.toLocaleString("en-US")}`;
  }
  if (value >= 100_000_000) {
    return `${(value / 100_000_000).toFixed(2).replace(/\.?0+$/, "")}億円`;
  }
  if (value >= 10_000) {
    return `${Math.round(value / 10_000).toLocaleString("ja-JP")}万円`;
  }
  return `${value.toLocaleString("ja-JP")}円`;
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n は I18nProvider 内で使ってください");
  return ctx;
}
