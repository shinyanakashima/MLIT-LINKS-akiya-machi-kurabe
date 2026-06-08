// public/data 配下の集計 JSON を読み込む（実行時 API は無く、静的ファイルのみ）。

import type {
  AggregateManifest,
  MunicipalityDetail,
  MunicipalitySummary,
  PrefectureRollup,
} from "../types/aggregates.ts";

const BASE = import.meta.env.BASE_URL;

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}data/${path}`);
  if (!res.ok) {
    throw new Error(`データ取得に失敗しました: ${path} (${res.status})`);
  }
  return (await res.json()) as T;
}

export function loadManifest(): Promise<AggregateManifest> {
  return getJson<AggregateManifest>("manifest.json");
}

export function loadMunicipalities(): Promise<MunicipalitySummary[]> {
  return getJson<MunicipalitySummary[]>("municipalities.json");
}

export function loadPrefectures(): Promise<PrefectureRollup[]> {
  return getJson<PrefectureRollup[]>("prefectures.json");
}

export function loadMunicipalityDetail(id: string): Promise<MunicipalityDetail> {
  return getJson<MunicipalityDetail>(`municipalities/${id}.json`);
}
