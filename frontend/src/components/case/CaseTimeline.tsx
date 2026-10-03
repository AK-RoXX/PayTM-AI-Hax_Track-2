import type { TimelineEvent } from "@/lib/types";

function formatTimestamp(value: string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CaseTimeline({ events }: { events: TimelineEvent[] }) {
  return (
    <section className="card">
      <div className="label" style={{ marginBottom: 16 }}>
        Case timeline
      </div>

      {events.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>
          Nothing has happened on this claim yet.
        </p>
      ) : (
        <div className="timeline">
          {events.map((event) => (
            <div className="timeline-item" key={event.id}>
              <span className={`dot ${event.status}`} />
              <b>{event.title}</b>
              {event.detail && (
                <div className="muted" style={{ fontSize: 13, marginTop: 3 }}>
                  {event.detail}
                </div>
              )}
              <div className="muted" style={{ fontSize: 12, marginTop: 5 }}>
                {formatTimestamp(event.occurred_at)}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}