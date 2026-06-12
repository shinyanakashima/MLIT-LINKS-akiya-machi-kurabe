import type { ReactNode } from "react";

/** チャートや任意内容を囲む共通カード。Recharts に依存しない軽量コンポーネント。 */
export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="card">
      {title && <p className="chart-title">{title}</p>}
      {children}
    </div>
  );
}
