import { StoreProvider, useStore } from "./data/store.tsx";
import { useRoute, type Route } from "./lib/router.ts";
import { I18nProvider, useI18n } from "./i18n/i18n.tsx";
import { OverviewPage } from "./pages/OverviewPage.tsx";
import { MunicipalityPage } from "./pages/MunicipalityPage.tsx";
import { ComparePage } from "./pages/ComparePage.tsx";

export function App() {
  return (
    <I18nProvider>
      <StoreProvider>
        <Shell />
      </StoreProvider>
    </I18nProvider>
  );
}

function activeTab(route: Route): "overview" | "compare" {
  return route.name === "compare" ? "compare" : "overview";
}

function LangToggle() {
  const { lang, setLang } = useI18n();
  return (
    <div className="lang-toggle" role="group" aria-label="Language">
      <button className={lang === "ja" ? "active" : ""} onClick={() => setLang("ja")}>
        日本語
      </button>
      <button className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>
        EN
      </button>
    </div>
  );
}

function Shell() {
  const route = useRoute();
  const { manifest } = useStore();
  const { t, dateTime } = useI18n();
  const tab = activeTab(route);
  const isFixture = manifest.data_origin === "fixture";

  return (
    <>
      <header className="app-header">
        <LangToggle />
        <h1>{t("app.title")}</h1>
        <p className="subtitle">{t("app.subtitle", { year: manifest.dataset_year })}</p>
        <div className="app-meta">
          <span className="badge">{t("meta.data", { year: manifest.dataset_year })}</span>
          <a className="badge badge-link" href={manifest.schema_url} target="_blank" rel="noreferrer">
            {t("meta.schema", { v: manifest.schema_version })}
          </a>
          <span className="badge">{t("meta.generated", { date: dateTime(manifest.generated_at) })}</span>
          {isFixture ? (
            <span className="badge warn">{t("meta.fixture")}</span>
          ) : (
            <span className="badge">{t("meta.origin", { origin: manifest.data_origin })}</span>
          )}
        </div>
        <nav className="tabs">
          <button className={tab === "overview" ? "active" : ""} onClick={() => (window.location.hash = "#/")}>
            {t("tab.overview")}
          </button>
          <button
            className={tab === "compare" ? "active" : ""}
            onClick={() => (window.location.hash = "#/compare")}
          >
            {t("tab.compare")}
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
          {t("footer.src1", { year: manifest.dataset_year })}
          <a href={manifest.source_url} target="_blank" rel="noreferrer">
            {t("footer.dataset")}
          </a>
          {t("footer.src2", { license: manifest.license })}
        </p>
        {isFixture && <p>{t("footer.fixtureNote")}</p>}
      </footer>
    </>
  );
}
