// 合成サンプルデータ生成（決定的）。
//
// P5 の実データ release がまだ無い段階でも、本アプリを開発・デモできるように、
// P5 スキーマ（schema_version 1.0）に準拠した合成レコードを生成する。
// 乱数はシード固定なので、毎回同じデータが出る。
//
//   node scripts/gen-fixture.mjs            # data/raw/akiya-2025.json を生成
//
// 注意: これは「集計と描画の確認用」のダミーであり、実データではない。
// 実データが公開されたら scripts/fetch-data.mjs が release を取得して上書きする。

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_URL = "https://www.geospatial.jp/ckan/dataset/links-akiyabank-2025";

// 決定的 PRNG（mulberry32）
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 都道府県と市区町村（実在名だが件数・内容は合成）。地域性に幅を持たせる。
const REGIONS = [
  { pref: "北海道", cities: ["函館市", "ニセコ町", "夕張市", "美瑛町"] },
  { pref: "長野県", cities: ["軽井沢町", "飯田市", "白馬村", "松本市", "小布施町"] },
  { pref: "新潟県", cities: ["佐渡市", "南魚沼市", "十日町市"] },
  { pref: "奈良県", cities: ["吉野郡黒滝村", "五條市", "宇陀市"] },
  { pref: "高知県", cities: ["四万十市", "馬路村", "本山町"] },
  { pref: "島根県", cities: ["海士町", "雲南市", "津和野町"] },
  { pref: "広島県", cities: ["尾道市", "三次市", "神石高原町"] },
  { pref: "鹿児島県", cities: ["奄美市", "南九州市", "湧水町"] },
];

const STRUCTURES = ["木造", "鉄骨造", "RC造", "軽量鉄骨造"];
const LAYOUTS = ["3DK", "4DK", "4LDK", "5SLDK", "2LDK", "6K"];

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}
function chance(rng, p) {
  return rng() < p;
}

function makeTags(rng, character) {
  // 自治体ごとの「性格」係数で出現率を変える
  const renoRoll = rng();
  const renovation_needed =
    renoRoll < character.renoRequired
      ? "required"
      : renoRoll < character.renoRequired + 0.2
        ? "done"
        : renoRoll < character.renoRequired + 0.35
          ? "as_is"
          : "unknown";
  return {
    schema_version: "1.0",
    model: "fixture-synthetic",
    labels: {
      renovation_needed,
      migration_friendly: chance(rng, character.migration),
      business_usable: chance(rng, 0.1),
      subsidy_mentioned: chance(rng, character.subsidy),
      vr_tour: chance(rng, character.vr),
      farmland_attached: chance(rng, character.farmland),
      kominka: chance(rng, character.kominka),
      view_nature: chance(rng, character.view),
      near_school: chance(rng, 0.18),
      near_shopping: chance(rng, 0.22),
      parking_emphasized: chance(rng, 0.3),
      move_in_ready: chance(rng, character.moveIn),
    },
    confidence: pick(rng, ["high", "medium", "low"]),
  };
}

export function generateFixture({ year = 2025, out } = {}) {
  const rng = mulberry32(20250608);
  const records = [];
  let serial = 9_000_000;

  for (const region of REGIONS) {
    for (const city of region.cities) {
      // 市区町村ごとに登録規模と性格を決める
      const base = 6 + Math.floor(rng() * rng() * 240); // 偏った分布（小規模が多め）
      const character = {
        renoRequired: 0.2 + rng() * 0.4,
        migration: 0.15 + rng() * 0.4,
        subsidy: 0.05 + rng() * 0.35,
        vr: rng() * 0.25,
        farmland: rng() * 0.3,
        kominka: rng() * 0.25,
        view: 0.1 + rng() * 0.4,
        moveIn: 0.1 + rng() * 0.3,
      };

      for (let i = 0; i < base; i++) {
        const dealType = chance(rng, 0.78) ? "sale" : "rent";
        const useRoll = rng();
        const useType =
          useRoll < 0.78 ? "residential" : useRoll < 0.92 ? "commercial" : "land";
        const isClosed = chance(rng, 0.16);
        const status = isClosed ? "closed" : "registered";
        const hasPr = chance(rng, 0.6);
        const constructionYear =
          useType === "land" ? null : 1945 + Math.floor(rng() * rng() * 78);

        const priceYen =
          dealType === "sale"
            ? Math.max(1, Math.round((0.3 + rng() * rng() * 25) * 1_000_000))
            : null;
        const rentYen =
          dealType === "rent" ? Math.round((2 + rng() * 8) * 10_000) : null;

        const categoryRaw =
          (dealType === "sale" ? "売買" : "賃貸") +
          (useType === "residential" ? "居住用" : useType === "commercial" ? "事業用" : "土地");

        const rec = {
          id: String(serial++),
          dataset_year: year,
          source: isClosed && chance(rng, 0.4) ? "closed" : "registered",
          status,
          deal_type: dealType,
          use_type: useType,
          category_raw: categoryRaw,
          location: { prefecture: region.pref, city, point: null },
          price_yen: priceYen,
          rent_monthly_yen: rentYen,
          amount_raw: priceYen != null ? String(priceYen) : rentYen != null ? String(rentYen) : null,
          building:
            useType === "land"
              ? {
                  construction_year: null,
                  construction_date_raw: null,
                  structure: null,
                  layout: null,
                  building_area_sqm: null,
                  total_units: null,
                }
              : {
                  construction_year: constructionYear,
                  construction_date_raw: constructionYear ? `${constructionYear}/1/1` : null,
                  structure: pick(rng, STRUCTURES),
                  layout: pick(rng, LAYOUTS),
                  building_area_sqm: Math.round((40 + rng() * 160) * 100) / 100,
                  total_units: 1,
                },
          strong_points: hasPr ? "（合成）地域の魅力を訴求するPR文サンプル" : null,
          tags: hasPr ? makeTags(rng, character) : null,
          contract: isClosed
            ? {
                is_closed: true,
                // 実データ同様に日付・額は高欠損
                date: chance(rng, 0.13) ? `${year}-0${1 + Math.floor(rng() * 9)}-15` : null,
                date_raw: null,
                amount_yen: chance(rng, 0.08) ? Math.round(priceYen ?? 1_000_000) : null,
                amount_raw: null,
              }
            : null,
          provenance: {
            source_file: isClosed ? "02_seiyakubukken.csv" : "01_tourokubukken.csv",
            source_row_index: i,
            dataset_year: year,
            retrieved_date: null,
            source_url: SOURCE_URL,
            license: "CC-BY-4.0",
          },
        };
        records.push(rec);
      }
    }
  }

  const outDir = join(ROOT, "data", "raw");
  const outPath = out ?? join(outDir, `akiya-${year}.json`);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(records), "utf8");

  // P5 manifest 相当のメタと出所マーカー
  const closed = records.filter((r) => r.status === "closed").length;
  writeFileSync(
    join(outDir, "manifest.json"),
    JSON.stringify({
      dataset_year: year,
      schema_version: "1.0",
      license: "CC-BY-4.0",
      source_url: SOURCE_URL,
      record_counts: { total: records.length, closed, registered: records.length - closed },
    }),
    "utf8",
  );
  writeFileSync(join(outDir, "origin.txt"), "fixture", "utf8");

  return { count: records.length, path: outPath };
}

// 直接実行された場合
if (import.meta.url === `file://${process.argv[1]}`) {
  const year = Number(process.env.DATASET_YEAR ?? "2025");
  const { count, path } = generateFixture({ year });
  console.log(`[fixture] 合成データ ${count} 件を生成: ${path}`);
}
