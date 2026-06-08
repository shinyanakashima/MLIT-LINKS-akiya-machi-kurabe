// P5（MLIT-LINKS-akiya-pipeline）の正規化済みデータを取得して data/raw に置く。
//
// 1. パイプラインの GitHub Releases から akiya-<year>.json / manifest.json を取得。
// 2. release が無い・ネットワーク不可などで失敗したら、合成サンプル（gen-fixture）に
//    フォールバックして開発・デモを止めない。
//
// env:
//   PIPELINE_REPO   既定 "shinyanakashima/MLIT-LINKS-akiya-pipeline"
//   DATASET_YEAR    既定 "2025"
//   RELEASE_TAG     省略時は latest。固定したい場合にタグを指定（推奨運用は固定ピン留め）
//   GITHUB_TOKEN    任意（CI ではレート制限回避に使用）

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateFixture } from "./gen-fixture.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RAW_DIR = join(ROOT, "data", "raw");
const REPO = process.env.PIPELINE_REPO ?? "shinyanakashima/MLIT-LINKS-akiya-pipeline";
const YEAR = Number(process.env.DATASET_YEAR ?? "2025");
const RELEASE_TAG = process.env.RELEASE_TAG;

function ghHeaders() {
  const h = { "User-Agent": "akiya-machi-kurabe", Accept: "application/vnd.github+json" };
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

async function getRelease() {
  const url = RELEASE_TAG
    ? `https://api.github.com/repos/${REPO}/releases/tags/${RELEASE_TAG}`
    : `https://api.github.com/repos/${REPO}/releases/latest`;
  const res = await fetch(url, { headers: ghHeaders() });
  if (!res.ok) throw new Error(`release lookup failed: ${res.status} ${res.statusText}`);
  return res.json();
}

async function downloadAsset(asset) {
  const res = await fetch(asset.url, {
    headers: { ...ghHeaders(), Accept: "application/octet-stream" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`asset download failed: ${asset.name} ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function tryFetchRelease() {
  const release = await getRelease();
  const assets = release.assets ?? [];
  const recordsAsset = assets.find((a) => a.name === `akiya-${YEAR}.json`);
  if (!recordsAsset) {
    throw new Error(`asset akiya-${YEAR}.json not found in release ${release.tag_name}`);
  }
  mkdirSync(RAW_DIR, { recursive: true });

  const recordsBuf = await downloadAsset(recordsAsset);
  writeFileSync(join(RAW_DIR, `akiya-${YEAR}.json`), recordsBuf);

  const manifestAsset = assets.find((a) => a.name === "manifest.json");
  if (manifestAsset) {
    writeFileSync(join(RAW_DIR, "manifest.json"), await downloadAsset(manifestAsset));
  }
  writeFileSync(join(RAW_DIR, "origin.txt"), `release:${release.tag_name}`, "utf8");
  return release.tag_name;
}

async function main() {
  if (process.env.USE_FIXTURE === "1") {
    const { count, path } = generateFixture({ year: YEAR });
    console.log(`[fetch] USE_FIXTURE=1 → 合成データ ${count} 件: ${path}`);
    return;
  }
  try {
    const tag = await tryFetchRelease();
    console.log(`[fetch] P5 release ${tag} from ${REPO} を取得 → data/raw`);
  } catch (err) {
    console.warn(`[fetch] release 取得に失敗（${err.message}）。合成サンプルで継続します。`);
    const { count, path } = generateFixture({ year: YEAR });
    console.log(`[fetch] フォールバック: 合成データ ${count} 件を生成: ${path}`);
  }
}

main();
