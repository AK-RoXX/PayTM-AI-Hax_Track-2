import type { CaseData } from "@/lib/types";

export function ClaimReadinessCard({ data }: { data: CaseData }) {
  const complete = data.missing_requirements.length === 0;

  return (
    <section className="card">
      <div className="row-between">
        <div>
          <div className="label">Claim readiness</div>
          <div className="money">{data.readiness_score}%</div>
        </div>
        <span className={complete ? "pill pill-green" : "pill pill-blue"}>
          {complete ? "Nothing missing" : "Action needed"}
        </span>
      </div>

      <div className="divider" />

      <b>Verified</b>
      {data.verified_items.length === 0 ? (
        <p className="muted" style={{ margin: "8px 0", fontSize: 13 }}>
          Nothing verified yet.
        </p>
      ) : (
        data.verified_items.map((item) => (
          <p key={item} style={{ margin: "8px 0", color: "#15753b" }}>
            ✓ {item}
          </p>
        ))
      )}

      <div className="divider" />

      <b>Action required</b>
      {data.missing_requirements.length === 0 ? (
        <p className="muted" style={{ margin: "8px 0", fontSize: 13 }}>
          No outstanding requirements.
        </p>
      ) : (
        data.missing_requirements.map((requirement) => (
          <p
            key={requirement.name}
            style={{ margin: "10px 0", color: "#b65b00" }}
          >
            → {requirement.name}
            <span className="pill pill-cream" style={{ marginLeft: 8 }}>
              {requirement.priority}
            </span>
            <br />
            <span className="muted" style={{ fontSize: 13 }}>
              {requirement.reason}
            </span>
          </p>
        ))
      )}
    </section>
  );
}