import { CaseData } from "@/lib/types";
const money = (x: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(x);
export function FinancialMap({ data }: { data: CaseData }) {
  const f = data.financial_map;
  return (
    <section className="card">
      <div className="label">Your money map</div>
      <div className="grid" style={{ marginTop: 14 }}>
        <div className="row">
          <span>Hospital estimate</span>
          <b>{money(f.hospital_estimate)}</b>
        </div>
        <div className="row">
          <span>Possible policy coverage</span>
          <b style={{ color: "#167c42" }}>{money(f.possible_coverage)}</b>
        </div>
        <div className="divider" />
        <div className="row">
          <span>
            <b>Possible out-of-pocket gap</b>
          </span>
          <span className="money" style={{ fontSize: 24, color: "#c46a00" }}>
            {money(f.estimated_gap)}
          </span>
        </div>
      </div>
      <p className="muted" style={{ fontSize: 12, marginBottom: 0 }}>
        {f.disclaimer}
      </p>
    </section>
  );
}
