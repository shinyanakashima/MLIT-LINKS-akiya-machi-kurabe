// ビルド時集計: data/raw/akiya-<year>.json を読み、自治体別に再集計して
// public/data 配下へ焼き込む（実行時 API なしの静的成果物）。
//
//   npm run aggregate            # 既定の入力（DATASET_YEAR）を集計
//   tsx scripts/aggregate.ts     # 同上
//
// 入力が無い場合は scripts/gen-fixture.mjs / fetch-data.mjs で先に用意すること。

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { aggregate, type AggregateMeta } from "../src/lib/aggregate-core.ts";
import type { AkiyaRecord, P5Manifest } from "../src/types/p5.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATASET_YEAR = Number(process.env.DATASET_YEAR ?? "2025");
const RAW_DIR = join(ROOT, "data", "raw");
const OUT_DIR = join(ROOT, "public", "data");

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value), "utf8");
}

function main(): void {
  const recordsPath = join(RAW_DIR, `akiya-${DATASET_YEAR}.json`);
  if (!existsSync(recordsPath)) {
    console.error(
      `[aggregate] 入力が見つかりません: ${recordsPath}\n` +
        `  先に \`npm run fetch\`（または \`npm run fixture\`）でデータを用意してください。`,
    );
    process.exit(1);
  }

  const records = readJson<AkiyaRecord[]>(recordsPath);
  if (!Array.isArray(records)) {
    console.error(`[aggregate] 入力は JSON 配列である必要があります: ${recordsPath}`);
    process.exit(1);
  }

  // 出所メタ: P5 manifest があれば取り込む。origin マーカーがあれば採用。
  const manifestPath = join(RAW_DIR, "manifest.json");
  const p5: Partial<P5Manifest> = existsSync(manifestPath)
    ? readJson<P5Manifest>(manifestPath)
    : {};
  const originPath = join(RAW_DIR, "origin.txt");
  const dataOrigin = existsSync(originPath)
    ? readFileSync(originPath, "utf8").trim()
    : "unknown";

  // akiya-pipeline(P5) のスキーマ定義 URL。PIPELINE_REPO で取得元に追随する。
  const pipelineRepo = process.env.PIPELINE_REPO ?? "shinyanakashima/MLIT-LINKS-akiya-pipeline";
  const schemaUrl = `https://github.com/${pipelineRepo}/blob/main/schema/akiya-property.schema.json`;

  const meta: AggregateMeta = {
    dataset_year: p5.dataset_year ?? DATASET_YEAR,
    schema_version: p5.schema_version ?? "1.0",
    license: p5.license ?? "CC-BY-4.0",
    source_url:
      p5.source_url ?? "https://www.geospatial.jp/ckan/dataset/links-akiyabank-2025",
    schema_url: schemaUrl,
    data_origin: dataOrigin,
  };

  const result = aggregate(records, meta);

  // 出力ディレクトリをクリーンに作り直す（古い詳細ファイルの残骸を防ぐ）
  if (existsSync(OUT_DIR)) rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(join(OUT_DIR, "municipalities"), { recursive: true });

  writeJson(join(OUT_DIR, "manifest.json"), result.manifest);
  writeJson(join(OUT_DIR, "municipalities.json"), result.summaries);
  writeJson(join(OUT_DIR, "prefectures.json"), result.prefectures);
  for (const detail of result.details) {
    writeJson(join(OUT_DIR, "municipalities", `${detail.id}.json`), detail);
  }

  console.log(
    `[aggregate] origin=${meta.data_origin} records=${result.manifest.counts.records} ` +
      `municipalities=${result.manifest.counts.municipalities} ` +
      `prefectures=${result.manifest.counts.prefectures} → public/data`,
  );
}

main();
