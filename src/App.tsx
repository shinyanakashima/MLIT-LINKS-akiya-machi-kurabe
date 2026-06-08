import { StoreProvider, useStore } from "./data/store.tsx";
import { useRoute, type Route } from "./lib/router.ts";
import { OverviewPage } from "./pages/OverviewPage.tsx";
import { MunicipalityPage } from "./pages/MunicipalityPage.tsx";
import { ComparePage } from "./pages/ComparePage.tsx";

export function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}

function activeTab(route: Route): "overview" | "compare" {
  return route.name === "compare" ? "compare" : "overview";
}

function Shell() {
  const route = useRoute();
  const { manifest } = useStore();
  const tab = activeTab(route);
  const isFixture = manifest.data_origin === "fixture";
  const generated = new Date(manifest.generated_at).toLocaleString("ja-JP");

  return (
    <>
      <header className="app-header">
        <h1>空き家バンク まちくらべ</h1>
        <p className="subtitle">
          国土交通省 Project LINKS 空き家バンク（{manifest.dataset_year}年度）正規化データを自治体別に集計・比較
        </p>
        <div className="app-meta">
          <span className="badge">データ: {manifest.dataset_year}年度</span>
          <a className="badge badge-link" href={manifest.schema_url} target="_blank" rel="noreferrer">
            akiya-pipelineスキーマ v{manifest.schema_version}
          </a>
          <span className="badge">集計 {generated}</span>
          {isFixture ? (
            <span className="badge warn">⚠ 合成サンプルデータ（実データ未取得）</span>
          ) : (
            <span className="badge">出所: {manifest.data_origin}</span>
          )}
        </div>
        <nav className="tabs">
          <button className={tab === "overview" ? "active" : ""} onClick={() => (window.location.hash = "#/")}>
            自治体一覧
          </button>
          <button
            className={tab === "compare" ? "active" : ""}
            onClick={() => (window.location.hash = "#/compare")}
          >
            比較ビュー
          </button>
        </nav>
      </header>

      <main className="container">
        {route.name === "municipality" ? (
          <MunicipalityPage id={route.id} />
        ) : route.name === "compare" ? (
          <ComparePage ids={route.ids} />
        ) : (
          <OverviewPage />
        )}
      </main>

      <footer className="app-footer">
        <p>
          出典: 国土交通省 Project LINKS「空き家バンク（{manifest.dataset_year}年度）」（
          <a href={manifest.source_url} target="_blank" rel="noreferrer">
            データセット
          </a>
          ）を加工して作成。加工: MLIT-LINKS-akiya-pipeline（正規化）＋ akiya-machi-kurabe（集計・可視化）。
          ライセンス: {manifest.license}。
        </p>
        {isFixture && (
          <p>
            ⚠ 現在表示中のデータは、パイプラインの正式リリースが未取得のため生成した
            <strong>合成サンプル</strong>です。数値に意味はありません。実データ公開後、ビルドで自動的に置き換わります。
          </p>
        )}
      </footer>
    </>
  );
}
