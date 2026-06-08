// 一覧・比較で共有する集計データ（manifest / municipalities / prefectures）を
// 一度だけ読み込んで配るコンテキスト。詳細は各ページで個別ロードする。

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type {
  AggregateManifest,
  MunicipalitySummary,
  PrefectureRollup,
} from "../types/aggregates.ts";
import { loadManifest, loadMunicipalities, loadPrefectures } from "./load.ts";

interface StoreState {
  manifest: AggregateManifest;
  municipalities: MunicipalitySummary[];
  prefectures: PrefectureRollup[];
  byId: Map<string, MunicipalitySummary>;
}

const StoreContext = createContext<StoreState | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([loadManifest(), loadMunicipalities(), loadPrefectures()])
      .then(([manifest, municipalities, prefectures]) => {
        if (!alive) return;
        const byId = new Map(municipalities.map((m) => [m.id, m]));
        setState({ manifest, municipalities, prefectures, byId });
      })
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      alive = false;
    };
  }, []);

  if (error) {
    return (
      <div className="center-msg">
        集計データを読み込めません<br />
        <span className="note">{error}</span>
        <p className="note">
          ローカルでは <code>npm run data</code> で public/data を生成してください。
        </p>
      </div>
    );
  }
  if (!state) {
    return <div className="center-msg">読み込み中…</div>;
  }
  return <StoreContext.Provider value={state}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreState {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore は StoreProvider 内で使ってください");
  return ctx;
}
