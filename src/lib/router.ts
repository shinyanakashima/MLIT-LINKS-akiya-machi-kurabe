// 依存を増やさない最小ハッシュルーター。
//   #/                 → 一覧（overview）
//   #/m/<id>           → 自治体詳細
//   #/compare?ids=a,b  → 比較
import { useEffect, useState } from "react";

export type Route =
  | { name: "overview" }
  | { name: "municipality"; id: string }
  | { name: "compare"; ids: string[] };

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, "");
  const [path, query = ""] = raw.split("?");
  const segments = path.split("/").filter(Boolean);

  if (segments[0] === "m" && segments[1]) {
    return { name: "municipality", id: decodeURIComponent(segments[1]) };
  }
  if (segments[0] === "compare") {
    const params = new URLSearchParams(query);
    const ids = (params.get("ids") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return { name: "compare", ids };
  }
  return { name: "overview" };
}

export function navigate(route: Route): void {
  window.location.hash = routeToHash(route);
}

export function routeToHash(route: Route): string {
  switch (route.name) {
    case "municipality":
      return `#/m/${encodeURIComponent(route.id)}`;
    case "compare":
      return `#/compare?ids=${route.ids.join(",")}`;
    default:
      return "#/";
  }
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}
