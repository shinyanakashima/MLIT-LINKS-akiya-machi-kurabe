import { Suspense, useEffect, useMemo, useState } from "react";
import { useStore } from "../data/store.tsx";
import { loadMunicipalityDetail } from "../data/load.ts";
import type { MunicipalityDetail, TagRates } from "../types/aggregates.ts";
import type { RenovationNeeded } from "../types/p5.ts";
import { navigate } from "../lib/router.ts";
import { num, pct, toPieData } from "../lib/format.ts";
import { Card } from "../components/Card.tsx";
import { PALETTE } from "../lib/palette.ts";
import { CompositionPie, HistogramChart, TagRateBars } from "../components/charts.lazy.tsx";
import { Kpi } from "../components/Kpi.tsx";
import { useI18n } from "../i18n/i18n.tsx";

/** サマリ配列からタグ率の単純平均（自治体平均）を取る。 */
function averageTagRates(rates: TagRates[], keys: (keyof TagRates)[]): TagRates {
  const out = {} as TagRates;
  for (const k of keys) {
    out[k] = rates.length ? rates.reduce((a, r) => a + r[k], 0) / rates.length : 0;
  }
  return out;
}

export function MunicipalityPage({ id }: { id: string }) {
  const { municipalities, prefectures, byId } = useStore();
  const i18n = useI18n();
  const { t } = i18n;
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
  const tagKeys = i18n.tagList.map((x) => x.key);

  // 比較基準: 同県平均・同規模平均（自治体単位の平均）
  const peers = useMemo(() => {
    if (!summary) return null;
    const sameBand = municipalities.filter((m) => m.scale_band === summary.scale_band);
    const sameBandAvg = averageTagRates(sameBand.map((m) => m.tag_rates), tagKeys);
    const prefRollup = prefectures.find((p) => p.prefecture === summary.prefecture);
    return { sameBand, sameBandAvg, prefRollup };
  }, [summary, municipalities, prefectures, tagKeys]);

  if (error) {
    return (
      <div className="center-msg">
        {t("error.detail")}<br />
        <span className="note">{error}</span>
      </div>
    );
  }
  if (!detail || !summary || !peers) return <div className="center-msg">{t("common.loading")}</div>;

  const tagCompareData = i18n.tagList.map((tg) => ({
    label: tg.label,
    self: detail.tag_rates[tg.key],
    pref: peers.prefRollup ? peers.prefRollup.tag_rates[tg.key] : 0,
    band: peers.sameBandAvg[tg.key],
  }));

  const renovationData = (Object.keys(i18n.reno) as RenovationNeeded[]).map((k) => ({
    name: i18n.reno[k],
    value: detail.renovation_breakdown[k],
  }));

  return (
    <div>
      <a className="back-link" href="#/">
        {t("mu.back")}
      </a>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>
          {detail.prefecture} {detail.city}
        </h2>
        <span className="pill">{i18n.scale(detail.scale_band)}</span>
        <button
          className="chip"
          onClick={() => navigate({ name: "compare", ids: [detail.id] })}
          style={{ marginLeft: "auto" }}
        >
          {t("mu.openCompare")}
        </button>
      </div>

      <div className="grid grid-kpi" style={{ marginTop: 16 }}>
        <Kpi label={t("mu.kpi.total")} value={i18n.count(detail.total)} />
        <Kpi label={t("mu.kpi.registered")} value={i18n.count(detail.registered)} />
        <Kpi label={t("mu.kpi.closed")} value={i18n.count(detail.closed)} />
        <Kpi label={t("mu.kpi.closed_rate")} value={pct(detail.closed_rate, 1)} />
        <Kpi label={t("mu.kpi.median")} value={i18n.yen(detail.median_sale_price_yen)} />
        <Kpi label={t("mu.kpi.tagged")} value={i18n.count(detail.tagged)} />
      </div>

      <Suspense fallback={<div className="center-msg">{t("common.loading")}</div>}>
      <h2 className="section">{t("mu.sec.composition")}</h2>
      <div className="grid grid-2">
        <CompositionPie title={t("mu.chart.deal")} data={toPieData(detail.deal_type, i18n.deal)} />
        <CompositionPie title={t("mu.chart.use")} data={toPieData(detail.use_type, i18n.use)} />
        <HistogramChart title={t("mu.chart.construction")} bins={detail.construction_year_hist} />
        <HistogramChart title={t("mu.chart.price")} bins={detail.sale_price_hist} color={PALETTE[1]} />
      </div>

      <h2 className="section">{t("mu.sec.tagcompare")}</h2>
      <TagRateBars
        title={t("mu.tagcompare.title", { city: detail.city, n: num(detail.tagged) })}
        data={tagCompareData}
        series={[
          { key: "self", name: detail.city, color: PALETTE[0] },
          { key: "pref", name: t("mu.series.prefAvg", { pref: detail.prefecture }), color: PALETTE[2] },
          { key: "band", name: t("mu.series.bandAvg"), color: PALETTE[4] },
        ]}
        height={420}
      />
      <p className="note">{t("mu.note.tag")}</p>

      <h2 className="section">{t("mu.sec.closedType")}</h2>
      <p className="muted">{t("mu.closed.note", { n: num(detail.closed) })}</p>
      {detail.closed === 0 ? (
        <Card>
          <p className="muted">{t("mu.closed.none")}</p>
        </Card>
      ) : (
        <div className="grid grid-2">
          <CompositionPie
            title={t("mu.chart.closedDeal")}
            data={toPieData(detail.closed_profile.by_deal_type, i18n.deal)}
          />
          <CompositionPie
            title={t("mu.chart.closedUse")}
            data={toPieData(detail.closed_profile.by_use_type, i18n.use)}
          />
          <HistogramChart
            title={t("mu.chart.closedConstruction")}
            bins={detail.closed_profile.by_construction_band}
            color={PALETTE[3]}
          />
          <Card title={t("mu.card.topTags")}>
            {detail.closed_profile.top_tags.length === 0 ? (
              <p className="muted">{t("mu.topTags.none")}</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {detail.closed_profile.top_tags.map((tg) => (
                  <li key={tg.key}>
                    {t("mu.topTags.item", {
                      label: i18n.tag(tg.key),
                      count: num(tg.count),
                      pct: pct(tg.rate),
                    })}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      <h2 className="section">{t("mu.sec.reno")}</h2>
      <div className="grid grid-2">
        <CompositionPie title={t("mu.chart.reno")} data={renovationData} />
        <Card title={t("mu.card.peers")}>
          <p className="muted" style={{ marginTop: 0 }}>
            {t("mu.peers.note", { scale: i18n.scale(detail.scale_band), n: num(peers.sameBand.length) })}
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
      </Suspense>

      {detail.similar.length > 0 && (
        <>
          <h2 className="section">{t("mu.sec.similar")}</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            {t("mu.similar.note")}
          </p>
          <div className="chip-row">
            {detail.similar.map((s) => (
              <a key={s.id} className="chip" href={`#/m/${s.id}`}>
                {t("mu.similar.item", { name: `${s.prefecture} ${s.city}`, score: pct(s.score) })}
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
