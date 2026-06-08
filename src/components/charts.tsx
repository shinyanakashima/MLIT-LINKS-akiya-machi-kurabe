// Recharts ベースの再利用チャート群。

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HistogramBin } from "../types/aggregates.ts";
import { pct } from "../lib/format.ts";
import { useI18n } from "../i18n/i18n.tsx";

export const PALETTE = [
  "#2563eb",
  "#16a34a",
  "#d97706",
  "#db2777",
  "#0891b2",
  "#7c3aed",
  "#dc2626",
];

export function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="card">
      {title && <p className="chart-title">{title}</p>}
      {children}
    </div>
  );
}

/** 構成比の円グラフ。 */
export function CompositionPie({
  title,
  data,
}: {
  title: string;
  data: { name: string; value: number }[];
}) {
  const { t, count } = useI18n();
  const total = data.reduce((a, b) => a + b.value, 0);
  return (
    <Card title={title}>
      {total === 0 ? (
        <p className="muted">{t("chart.nodata")}</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              outerRadius={78}
              label={(d: { name: string; value: number }) =>
                `${d.name} ${pct(d.value / total)}`
              }
            >
              {data.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => count(v)} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

/** 件数ヒストグラム（築年・価格帯など）。 */
export function HistogramChart({
  title,
  bins,
  color = PALETTE[0],
}: {
  title: string;
  bins: HistogramBin[];
  color?: string;
}) {
  const { t, count, band } = useI18n();
  const hasData = bins.some((b) => b.count > 0);
  const localized = bins.map((b) => ({ ...b, label: band(b.label) }));
  return (
    <Card title={title}>
      {!hasData ? (
        <p className="muted">{t("chart.nodata")}</p>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={localized} margin={{ top: 4, right: 8, bottom: 28, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              angle={-30}
              textAnchor="end"
              interval={0}
              height={50}
              tick={{ fontSize: 11 }}
            />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => count(v)} />
            <Bar dataKey="count" fill={color} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

/**
 * タグ率の横棒（複数系列を比較できる）。
 * data: [{ label, [seriesName]: rate, ... }]
 */
export function TagRateBars({
  title,
  data,
  series,
  height = 360,
}: {
  title: string;
  data: Record<string, string | number>[];
  series: { key: string; name: string; color: string }[];
  height?: number;
}) {
  return (
    <Card title={title}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ left: 24, right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 1]}
            tickFormatter={(v: number) => pct(v)}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={84}
            tick={{ fontSize: 12 }}
            interval={0}
          />
          <Tooltip formatter={(v: number) => pct(v, 1)} />
          {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
          {series.map((s) => (
            <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[0, 3, 3, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

/** 任意指標のグループ棒（比較ビュー用）。 */
export function GroupedBars({
  title,
  data,
  series,
  domain,
  tickFormat,
}: {
  title: string;
  data: Record<string, string | number>[];
  series: { key: string; name: string; color: string }[];
  domain?: [number, number];
  tickFormat?: (v: number) => string;
}) {
  return (
    <Card title={title}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 28, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={50} />
          <YAxis domain={domain} tickFormatter={tickFormat} tick={{ fontSize: 11 }} />
          <Tooltip formatter={tickFormat ? (v: number) => tickFormat(v) : undefined} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {series.map((s) => (
            <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[3, 3, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
