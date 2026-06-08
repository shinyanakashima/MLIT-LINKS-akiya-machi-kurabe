import assert from "node:assert/strict";
import { test } from "node:test";
import { aggregate, type AggregateMeta } from "../../src/lib/aggregate-core.ts";
import type { AkiyaRecord } from "../../src/types/p5.ts";

const META: AggregateMeta = {
  dataset_year: 2025,
  schema_version: "1.0",
  license: "CC-BY-4.0",
  source_url: "https://example.test",
  schema_url: "https://example.test/schema.json",
  data_origin: "test",
};

function rec(partial: Partial<AkiyaRecord> & Pick<AkiyaRecord, "id">): AkiyaRecord {
  return {
    dataset_year: 2025,
    source: "registered",
    status: "registered",
    deal_type: "sale",
    use_type: "residential",
    category_raw: "売買居住用",
    location: { prefecture: "テスト県", city: "テスト市", point: null },
    provenance: {
      source_file: "01.csv",
      dataset_year: 2025,
      source_url: "https://example.test",
      license: "CC-BY-4.0",
    },
    ...partial,
  } as AkiyaRecord;
}

test("自治体ごとに登録・成約を集計し closed_rate を出す", () => {
  const records: AkiyaRecord[] = [
    rec({ id: "1", status: "registered" }),
    rec({ id: "2", status: "registered" }),
    rec({ id: "3", status: "closed", contract: { is_closed: true, date: null, date_raw: null, amount_yen: null, amount_raw: null } }),
    rec({ id: "4", location: { prefecture: "別県", city: "別市", point: null } }),
  ];
  const { summaries, manifest } = aggregate(records, META);

  assert.equal(manifest.counts.municipalities, 2);
  assert.equal(manifest.counts.prefectures, 2);

  const t = summaries.find((s) => s.city === "テスト市")!;
  assert.equal(t.total, 3);
  assert.equal(t.registered, 2);
  assert.equal(t.closed, 1);
  assert.ok(Math.abs(t.closed_rate - 1 / 3) < 1e-9);
});

test("タグ率は tagged を母数に算出する（tags:null は母数に入らない）", () => {
  const tagged = (renovation: "required" | "unknown", subsidy: boolean): AkiyaRecord["tags"] => ({
    schema_version: "1.0",
    model: "test",
    labels: {
      renovation_needed: renovation,
      migration_friendly: false,
      business_usable: false,
      subsidy_mentioned: subsidy,
      vr_tour: false,
      farmland_attached: false,
      kominka: false,
      view_nature: false,
      near_school: false,
      near_shopping: false,
      parking_emphasized: false,
      move_in_ready: false,
    },
  });
  const records: AkiyaRecord[] = [
    rec({ id: "1", tags: tagged("required", true) }),
    rec({ id: "2", tags: tagged("unknown", false) }),
    rec({ id: "3", tags: null }), // 母数に入らない
  ];
  const { summaries } = aggregate(records, META);
  const s = summaries[0];
  assert.equal(s.tagged, 2);
  assert.ok(Math.abs(s.tag_rates.renovation_required - 0.5) < 1e-9);
  assert.ok(Math.abs(s.tag_rates.subsidy_mentioned - 0.5) < 1e-9);
});

test("売買価格の中央値とヒストグラムを出す", () => {
  const records: AkiyaRecord[] = [
    rec({ id: "1", deal_type: "sale", price_yen: 1_000_000 }),
    rec({ id: "2", deal_type: "sale", price_yen: 3_000_000 }),
    rec({ id: "3", deal_type: "sale", price_yen: 9_000_000 }),
    rec({ id: "4", deal_type: "rent", price_yen: null, rent_monthly_yen: 50_000 }),
  ];
  const { details } = aggregate(records, META);
  const d = details[0];
  assert.equal(d.median_sale_price_yen, 3_000_000);
  const total = d.sale_price_hist.reduce((a, b) => a + b.count, 0);
  assert.equal(total, 3); // rent は価格ヒストに含めない
});

test("詳細 ID は決定的で、summary と detail で一致する", () => {
  const records: AkiyaRecord[] = [rec({ id: "1" })];
  const a = aggregate(records, META);
  const b = aggregate(records, META);
  assert.equal(a.summaries[0].id, b.summaries[0].id);
  assert.equal(a.details[0].id, a.summaries[0].id);
});
