import { useMemo, useState } from "react";
import { useStore } from "../data/store.tsx";
import type { MunicipalitySummary } from "../types/aggregates.ts";
import { navigate } from "../lib/router.ts";
import { TAG_AXIS_LABELS, scaleBandLabel } from "../lib/labels.ts";
import { num, pct, yen } from "../lib/format.ts";
import { PALETTE, TagRateBars } from "../components/charts.tsx";

const MAX_COMPARE = 6;

export function ComparePage({ ids }: { ids: string[] }) {
  const { municipalities, byId } = useStore();
  const [picker, setPicker] = useState("");

  const selected = useMemo(
    () => ids.map((id) => byId.get(id)).filter((m): m is MunicipalitySummary => !!m),
    [ids, byId],
  );

  function setIds(next: string[]) {
    const unique = [...new Set(next)].slice(0, MAX_COMPARE);
    navigate({ name: "compare", ids: unique });
  }
  const add = (id: string) => id && setIds([...ids, id]);
  const remove = (id: string) => setIds(ids.filter((x) => x !== id));

  function addSamePrefecture() {
    const base = selected[0];
    if (!base) return;
    const same = municipalities.filter((m) => m.prefecture === base.prefecture).map((m) => m.id);
    setIds([...ids, ...same]);
  }
  function addSameBand() {
    const base = selected[0];
    if (!base) return;
    const same = municipalities
      .filter((m) => m.scale_band === base.scale_band)
      .sort((a, b) => b.total - a.total)
      .map((m) => m.id);
    setIds([...ids, ...same]);
  }

  const tagData = TAG_AXIS_LABELS.map((t) => {
    const row: Record<string, string | number> = { label: t.label };
    selected.forEach((m) => {
      row[m.id] = m.tag_rates[t.key];
    });
    return row;
  });
  const tagSeries = selected.map((m, i) => ({
    key: m.id,
    name: m.city,
    color: PALETTE[i % PALETTE.length],
  }));

  return (
    <div>
      <p className="muted">
        自治体を最大 {MAX_COMPARE} 件まで選んで横並びに比較します。近隣・同一県内・同規模での相対比較に。
      </p>

      <div className="toolbar">
        <label>
          自治体を追加
          <select
            value={picker}
            onChange={(e) => {
              add(e.target.value);
              setPicker("");
            }}
          >
            <option value="">選択…</option>
            {municipalities
              .filter((m) => !ids.includes(m.id))
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.prefecture} {m.city}（{num(m.total)}件）
                </option>
              ))}
          </select>
        </label>
        <button className="chip" onClick={addSamePrefecture} disabled={!selected.length}>
          + 先頭と同県を追加
        </button>
        <button className="chip" onClick={addSameBand} disabled={!selected.length}>
          + 先頭と同規模を追加
        </button>
        {selected.length > 0 && (
          <button className="chip" onClick={() => setIds([])}>
            クリア
          </button>
        )}
      </div>

      {selected.length === 0 ? (
        <div className="card">
          <p className="muted">
            上の「自治体を追加」から比較対象を選んでください。一覧や詳細ページの「比較ビューで開く」からも来られます。
          </p>
        </div>
      ) : (
        <>
          <div className="chip-row" style={{ marginBottom: 16 }}>
            {selected.map((m, i) => (
              <span
                key={m.id}
                className="chip selected"
                style={{ background: PALETTE[i % PALETTE.length], borderColor: "transparent" }}
              >
                {m.prefecture} {m.city}{" "}
                <button
                  onClick={() => remove(m.id)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#fff",
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                  aria-label="削除"
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="data">
              <thead>
                <tr>
                  <th className="left">指標</th>
                  {selected.map((m) => (
                    <th key={m.id}>
                      <a href={`#/m/${m.id}`}>{m.city}</a>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <MetricRow label="都道府県" cells={selected.map((m) => m.prefecture)} left />
                <MetricRow
                  label="登録規模"
                  cells={selected.map((m) => scaleBandLabel(m.scale_band))}
                  left
                />
                <MetricRow label="掲載総数" cells={selected.map((m) => num(m.total))} />
                <MetricRow label="登録中" cells={selected.map((m) => num(m.registered))} />
                <MetricRow label="成約" cells={selected.map((m) => num(m.closed))} />
                <MetricRow label="成約率" cells={selected.map((m) => pct(m.closed_rate, 1))} />
                <MetricRow
                  label="売買価格 中央値"
                  cells={selected.map((m) => yen(m.median_sale_price_yen))}
                />
                <MetricRow label="PR文タグ付き" cells={selected.map((m) => num(m.tagged))} />
              </tbody>
            </table>
          </div>

          <h2 className="section">PR文タグ率の比較</h2>
          <TagRateBars title="" data={tagData} series={tagSeries} height={460} />
          <p className="note">
            ※ 成約率・中央値は登録母数が小さい自治体ほど振れやすい。規模バンドを揃えて見ると安定します。
          </p>
        </>
      )}
    </div>
  );
}

function MetricRow({
  label,
  cells,
  left,
}: {
  label: string;
  cells: string[];
  left?: boolean;
}) {
  return (
    <tr>
      <td className="left">{label}</td>
      {cells.map((c, i) => (
        <td key={i} className={left ? "left" : ""}>
          {c}
        </td>
      ))}
    </tr>
  );
}
