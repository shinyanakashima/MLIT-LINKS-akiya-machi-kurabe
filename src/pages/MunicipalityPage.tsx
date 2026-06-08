import { useEffect, useMemo, useState } from "react";
import { useStore } from "../data/store.tsx";
import { loadMunicipalityDetail } from "../data/load.ts";
import type { MunicipalityDetail, TagRates } from "../types/aggregates.ts";
import { navigate } from "../lib/router.ts";
import {
  DEAL_TYPE_LABELS,
  RENOVATION_LABELS,
  TAG_AXIS_LABELS,
  USE_TYPE_LABELS,
  scaleBandLabel,
} from "../lib/labels.ts";
import { num, pct, toPieData, yen } from "../lib/format.ts";
import { Card, CompositionPie, HistogramChart, PALETTE, TagRateBars } from "../components/charts.tsx";
import { Kpi } from "../components/Kpi.tsx";

const TAG_KEYS = TAG_AXIS_LABELS.map((t) => t.key);

/** サマリ配列からタグ率の単純平均（自治体平均）を取る。 */
function averageTagRates(rates: TagRates[]): TagRates {
  const out = {} as TagRates;
  for (const k of TAG_KEYS) {
    out[k] = rates.length ? rates.reduce((a, r) => a + r[k], 0) / rates.length : 0;
  }
  return out;
}

export function MunicipalityPage({ id }: { id: string }) {
  const { municipalities, prefectures, byId } = useStore();
  const [detail, setDetail] = useState<MunicipalityDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDetail(null);
    setError(null);
    let alive = true;
    loadMunicipalityDetail(id)
      .then((d) => alive && setDetail(d))
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      alive = false;
    };
  }, [id]);

  const summary = byId.get(id);

  // 比較基準: 同県平均・同規模平均（自治体単位の平均）
  const peers = useMemo(() => {
    if (!summary) return null;
    const sameBand = municipalities.filter((m) => m.scale_band === summary.scale_band);
    const sameBandAvg = averageTagRates(sameBand.map((m) => m.tag_rates));
    const prefRollup = prefectures.find((p) => p.prefecture === summary.prefecture);
    return { sameBand, sameBandAvg, prefRollup };
  }, [summary, municipalities, prefectures]);

  if (error) {
    return (
      <div className="center-msg">
        詳細を読み込めません<br />
        <span className="note">{error}</span>
      </div>
    );
  }
  if (!detail || !summary || !peers) return <div className="center-msg">読み込み中…</div>;

  const tagCompareData = TAG_AXIS_LABELS.map((t) => ({
    label: t.label,
    self: detail.tag_rates[t.key],
    pref: peers.prefRollup ? peers.prefRollup.tag_rates[t.key] : 0,
    band: peers.sameBandAvg[t.key],
  }));

  const renovationData = (Object.keys(RENOVATION_LABELS) as (keyof typeof RENOVATION_LABELS)[]).map(
    (k) => ({ name: RENOVATION_LABELS[k], value: detail.renovation_breakdown[k] }),
  );

  return (
    <div>
      <a className="back-link" href="#/">
        ← 一覧へ戻る
      </a>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>
          {detail.prefecture} {detail.city}
        </h2>
        <span className="pill">{scaleBandLabel(detail.scale_band)}</span>
        <button
          className="chip"
          onClick={() => navigate({ name: "compare", ids: [detail.id] })}
          style={{ marginLeft: "auto" }}
        >
          この町を比較ビューで開く →
        </button>
      </div>

      <div className="grid grid-kpi" style={{ marginTop: 16 }}>
        <Kpi label="掲載総数" value={num(detail.total)} sub="件" />
        <Kpi label="登録中" value={num(detail.registered)} sub="件" />
        <Kpi label="成約" value={num(detail.closed)} sub="件" />
        <Kpi label="成約率" value={pct(detail.closed_rate, 1)} />
        <Kpi label="売買価格 中央値" value={yen(detail.median_sale_price_yen)} />
        <Kpi label="PR文タグ付き" value={num(detail.tagged)} sub="件" />
      </div>

      <h2 className="section">登録物件の構成</h2>
      <div className="grid grid-2">
        <CompositionPie
          title="取引種別"
          data={toPieData(detail.deal_type, DEAL_TYPE_LABELS)}
        />
        <CompositionPie title="用途" data={toPieData(detail.use_type, USE_TYPE_LABELS)} />
        <HistogramChart title="築年分布" bins={detail.construction_year_hist} />
        <HistogramChart
          title="売買価格帯の分布"
          bins={detail.sale_price_hist}
          color={PALETTE[1]}
        />
      </div>

      <h2 className="section">PR文タグ率 — 同県・同規模との比較</h2>
      <TagRateBars
        title={`${detail.city} vs 同県平均 vs 同規模平均（PR文タグ付き ${num(detail.tagged)} 件が母数）`}
        data={tagCompareData}
        series={[
          { key: "self", name: detail.city, color: PALETTE[0] },
          { key: "pref", name: `${detail.prefecture}平均`, color: PALETTE[2] },
          { key: "band", name: "同規模平均", color: PALETTE[4] },
        ]}
        height={420}
      />
      <p className="note">
        ※ bool タグは「PR文に明示的根拠があるとき true」（P5 docs/03）。言及なしは false のため、
        率は「訴求の積極度」に近い指標として読む。
      </p>

      <h2 className="section">成約した「型」</h2>
      <p className="muted">
        成約額・成約日は欠損が大半（P5仕様）のため、ここでは額には触れず、成約した物件の構成だけを見る。
        成約 {num(detail.closed)} 件。
      </p>
      {detail.closed === 0 ? (
        <Card>
          <p className="muted">この自治体の成約物件はありません。</p>
        </Card>
      ) : (
        <div className="grid grid-2">
          <CompositionPie
            title="成約：取引種別"
            data={toPieData(detail.closed_profile.by_deal_type, DEAL_TYPE_LABELS)}
          />
          <CompositionPie
            title="成約：用途"
            data={toPieData(detail.closed_profile.by_use_type, USE_TYPE_LABELS)}
          />
          <HistogramChart
            title="成約：築年分布"
            bins={detail.closed_profile.by_construction_band}
            color={PALETTE[3]}
          />
          <Card title="成約物件に多いPR文タグ">
            {detail.closed_profile.top_tags.length === 0 ? (
              <p className="muted">タグ付き成約物件がありません。</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {detail.closed_profile.top_tags.map((t) => (
                  <li key={t.key}>
                    {t.label}：{num(t.count)} 件（成約タグ付き中 {pct(t.rate)}）
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      <h2 className="section">改修要否の内訳</h2>
      <div className="grid grid-2">
        <CompositionPie title="改修要否（PR文タグ付き）" data={renovationData} />
        <Card title="同規模自治体（参考）">
          <p className="muted" style={{ marginTop: 0 }}>
            同じ登録規模「{scaleBandLabel(detail.scale_band)}」の自治体は {num(peers.sameBand.length)} 件。
          </p>
          <div className="chip-row">
            {peers.sameBand
              .filter((m) => m.id !== detail.id)
              .slice(0, 12)
              .map((m) => (
                <a key={m.id} className="chip" href={`#/m/${m.id}`}>
                  {m.city}
                </a>
              ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
