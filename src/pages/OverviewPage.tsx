import { useMemo, useState } from "react";
import { useStore } from "../data/store.tsx";
import type { MunicipalitySummary } from "../types/aggregates.ts";
import { navigate } from "../lib/router.ts";
import { scaleBandLabel } from "../lib/labels.ts";
import { num, pct, yen } from "../lib/format.ts";

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

interface Column {
  key: SortKey;
  label: string;
  left?: boolean;
  render: (m: MunicipalitySummary) => string;
  value: (m: MunicipalitySummary) => number | string;
}

const COLUMNS: Column[] = [
  {
    key: "name",
    label: "市区町村",
    left: true,
    render: (m) => `${m.prefecture} ${m.city}`,
    value: (m) => `${m.prefecture} ${m.city}`,
  },
  { key: "total", label: "総数", render: (m) => num(m.total), value: (m) => m.total },
  { key: "registered", label: "登録", render: (m) => num(m.registered), value: (m) => m.registered },
  { key: "closed", label: "成約", render: (m) => num(m.closed), value: (m) => m.closed },
  { key: "closed_rate", label: "成約率", render: (m) => pct(m.closed_rate, 1), value: (m) => m.closed_rate },
  {
    key: "median_sale_price_yen",
    label: "売買中央値",
    render: (m) => yen(m.median_sale_price_yen),
    value: (m) => m.median_sale_price_yen ?? -1,
  },
  {
    key: "renovation_required",
    label: "要改修率",
    render: (m) => pct(m.tag_rates.renovation_required),
    value: (m) => m.tag_rates.renovation_required,
  },
  {
    key: "subsidy_mentioned",
    label: "補助金言及率",
    render: (m) => pct(m.tag_rates.subsidy_mentioned),
    value: (m) => m.tag_rates.subsidy_mentioned,
  },
  {
    key: "vr_tour",
    label: "VR内覧率",
    render: (m) => pct(m.tag_rates.vr_tour),
    value: (m) => m.tag_rates.vr_tour,
  },
];

export function OverviewPage() {
  const { municipalities, manifest } = useStore();
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
        全 {num(manifest.counts.municipalities)} 自治体・{num(manifest.counts.records)} 物件。
        行をクリックすると自治体の詳細を表示します。「成約率」は登録母数が小さいほど振れやすい点に注意。
      </p>

      <div className="toolbar">
        <label>
          都道府県
          <select value={pref} onChange={(e) => setPref(e.target.value)}>
            <option value="">すべて</option>
            {prefectures.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label>
          登録規模
          <select value={band} onChange={(e) => setBand(e.target.value)}>
            <option value="">すべて</option>
            {manifest.scale_bands.map((b) => (
              <option key={b.band} value={b.band}>
                {b.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          市区町村名で検索
          <input
            type="search"
            placeholder="例: 軽井沢"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <span className="muted" style={{ marginLeft: "auto", fontSize: "0.82rem" }}>
          {num(rows.length)} 件表示
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
                  title="クリックで並び替え"
                >
                  {c.label}
                  {sortKey === c.key && <span className="arrow"> {asc ? "▲" : "▼"}</span>}
                </th>
              ))}
              <th className="left">規模</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id} onClick={() => navigate({ name: "municipality", id: m.id })}>
                {COLUMNS.map((c) => (
                  <td key={c.key} className={c.left ? "left" : ""}>
                    {c.render(m)}
                  </td>
                ))}
                <td className="left">
                  <span className="pill">{scaleBandLabel(m.scale_band)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
