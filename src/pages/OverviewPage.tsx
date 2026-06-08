import { useMemo, useState } from "react";
import { useStore } from "../data/store.tsx";
import type { MunicipalitySummary } from "../types/aggregates.ts";
import { navigate } from "../lib/router.ts";
import { num, pct } from "../lib/format.ts";
import { useI18n, type I18n } from "../i18n/i18n.tsx";

type SortKey =
  | "name"
  | "total"
  | "registered"
  | "closed"
  | "closed_rate"
  | "median_sale_price_yen"
  | "renovation_required"
  | "subsidy_mentioned"
  | "vr_tour";

type StringKey = Parameters<I18n["t"]>[0];

interface Column {
  key: SortKey;
  labelKey: StringKey;
  left?: boolean;
  render: (m: MunicipalitySummary, i18n: I18n) => string;
  value: (m: MunicipalitySummary) => number | string;
}

const COLUMNS: Column[] = [
  {
    key: "name",
    labelKey: "ov.col.name",
    left: true,
    render: (m) => `${m.prefecture} ${m.city}`,
    value: (m) => `${m.prefecture} ${m.city}`,
  },
  { key: "total", labelKey: "ov.col.total", render: (m) => num(m.total), value: (m) => m.total },
  { key: "registered", labelKey: "ov.col.registered", render: (m) => num(m.registered), value: (m) => m.registered },
  { key: "closed", labelKey: "ov.col.closed", render: (m) => num(m.closed), value: (m) => m.closed },
  { key: "closed_rate", labelKey: "ov.col.closed_rate", render: (m) => pct(m.closed_rate, 1), value: (m) => m.closed_rate },
  {
    key: "median_sale_price_yen",
    labelKey: "ov.col.median",
    render: (m, i18n) => i18n.yen(m.median_sale_price_yen),
    value: (m) => m.median_sale_price_yen ?? -1,
  },
  {
    key: "renovation_required",
    labelKey: "ov.col.reno",
    render: (m) => pct(m.tag_rates.renovation_required),
    value: (m) => m.tag_rates.renovation_required,
  },
  {
    key: "subsidy_mentioned",
    labelKey: "ov.col.subsidy",
    render: (m) => pct(m.tag_rates.subsidy_mentioned),
    value: (m) => m.tag_rates.subsidy_mentioned,
  },
  {
    key: "vr_tour",
    labelKey: "ov.col.vr",
    render: (m) => pct(m.tag_rates.vr_tour),
    value: (m) => m.tag_rates.vr_tour,
  },
];

export function OverviewPage() {
  const { municipalities, manifest } = useStore();
  const i18n = useI18n();
  const { t } = i18n;
  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [asc, setAsc] = useState(false);
  const [pref, setPref] = useState("");
  const [band, setBand] = useState("");
  const [query, setQuery] = useState("");

  const prefectures = useMemo(
    () => [...new Set(municipalities.map((m) => m.prefecture))].sort((a, b) => a.localeCompare(b, "ja")),
    [municipalities],
  );

  const rows = useMemo(() => {
    const col = COLUMNS.find((c) => c.key === sortKey)!;
    const filtered = municipalities.filter(
      (m) =>
        (!pref || m.prefecture === pref) &&
        (!band || m.scale_band === band) &&
        (!query || `${m.prefecture}${m.city}`.includes(query)),
    );
    return filtered.sort((a, b) => {
      const av = col.value(a);
      const bv = col.value(b);
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv), "ja");
      return asc ? cmp : -cmp;
    });
  }, [municipalities, sortKey, asc, pref, band, query]);

  function onSort(key: SortKey) {
    if (key === sortKey) setAsc(!asc);
    else {
      setSortKey(key);
      setAsc(key === "name");
    }
  }

  return (
    <div>
      <p className="muted">
        {t("ov.intro", { muni: num(manifest.counts.municipalities), rec: num(manifest.counts.records) })}
      </p>

      <div className="toolbar">
        <label>
          {t("ov.f.pref")}
          <select value={pref} onChange={(e) => setPref(e.target.value)}>
            <option value="">{t("ov.all")}</option>
            {prefectures.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("ov.f.scale")}
          <select value={band} onChange={(e) => setBand(e.target.value)}>
            <option value="">{t("ov.all")}</option>
            {manifest.scale_bands.map((b) => (
              <option key={b.band} value={b.band}>
                {i18n.scale(b.band)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("ov.f.search")}
          <input
            type="search"
            placeholder={t("ov.searchPh")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <span className="muted" style={{ marginLeft: "auto", fontSize: "0.82rem" }}>
          {t("ov.shown", { n: num(rows.length) })}
        </span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="data">
          <thead>
            <tr>
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  className={c.left ? "left" : ""}
                  onClick={() => onSort(c.key)}
                  title={t("ov.sortHint")}
                >
                  {t(c.labelKey)}
                  {sortKey === c.key && <span className="arrow"> {asc ? "▲" : "▼"}</span>}
                </th>
              ))}
              <th className="left">{t("ov.col.scale")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id} onClick={() => navigate({ name: "municipality", id: m.id })}>
                {COLUMNS.map((c) => (
                  <td key={c.key} className={c.left ? "left" : ""}>
                    {c.render(m, i18n)}
                  </td>
                ))}
                <td className="left">
                  <span className="pill">{i18n.scale(m.scale_band)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
