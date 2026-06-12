import { Suspense, useMemo, useState } from "react";
import { useStore } from "../data/store.tsx";
import type { MunicipalitySummary } from "../types/aggregates.ts";
import { navigate } from "../lib/router.ts";
import { num, pct } from "../lib/format.ts";
import { PALETTE } from "../lib/palette.ts";
import { TagRateBars } from "../components/charts.lazy.tsx";
import { useI18n } from "../i18n/i18n.tsx";

const MAX_COMPARE = 6;

export function ComparePage({ ids }: { ids: string[] }) {
  const { municipalities, byId } = useStore();
  const i18n = useI18n();
  const { t } = i18n;
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

  const tagData = i18n.tagList.map((tg) => {
    const row: Record<string, string | number> = { label: tg.label };
    selected.forEach((m) => {
      row[m.id] = m.tag_rates[tg.key];
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
      <p className="muted">{t("cmp.intro", { max: MAX_COMPARE })}</p>

      <div className="toolbar">
        <label>
          {t("cmp.add")}
          <select
            value={picker}
            onChange={(e) => {
              add(e.target.value);
              setPicker("");
            }}
          >
            <option value="">{t("cmp.select")}</option>
            {municipalities
              .filter((m) => !ids.includes(m.id))
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {t("cmp.opt", { pref: m.prefecture, city: m.city, n: num(m.total) })}
                </option>
              ))}
          </select>
        </label>
        <button className="chip" onClick={addSamePrefecture} disabled={!selected.length}>
          {t("cmp.addPref")}
        </button>
        <button className="chip" onClick={addSameBand} disabled={!selected.length}>
          {t("cmp.addBand")}
        </button>
        {selected.length > 0 && (
          <button className="chip" onClick={() => setIds([])}>
            {t("cmp.clear")}
          </button>
        )}
      </div>

      {selected.length === 0 ? (
        <div className="card">
          <p className="muted">{t("cmp.empty")}</p>
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
                  aria-label={t("cmp.remove")}
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
                  <th className="left">{t("cmp.metric")}</th>
                  {selected.map((m) => (
                    <th key={m.id}>
                      <a href={`#/m/${m.id}`}>{m.city}</a>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <MetricRow label={t("cmp.row.pref")} cells={selected.map((m) => m.prefecture)} left />
                <MetricRow label={t("cmp.row.scale")} cells={selected.map((m) => i18n.scale(m.scale_band))} left />
                <MetricRow label={t("cmp.row.total")} cells={selected.map((m) => num(m.total))} />
                <MetricRow label={t("cmp.row.registered")} cells={selected.map((m) => num(m.registered))} />
                <MetricRow label={t("cmp.row.closed")} cells={selected.map((m) => num(m.closed))} />
                <MetricRow label={t("cmp.row.closed_rate")} cells={selected.map((m) => pct(m.closed_rate, 1))} />
                <MetricRow label={t("cmp.row.median")} cells={selected.map((m) => i18n.yen(m.median_sale_price_yen))} />
                <MetricRow label={t("cmp.row.tagged")} cells={selected.map((m) => num(m.tagged))} />
              </tbody>
            </table>
          </div>

          <h2 className="section">{t("cmp.sec.tagrates")}</h2>
          <Suspense fallback={<div className="center-msg">{t("common.loading")}</div>}>
            <TagRateBars title="" data={tagData} series={tagSeries} height={460} />
          </Suspense>
          <p className="note">{t("cmp.note")}</p>
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
