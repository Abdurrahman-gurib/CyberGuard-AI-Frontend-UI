const TONE_MAP: Record<string, string> = {
  // generic / lifecycle
  draft: "neutral",
  open: "warn",
  active: "info",
  succeeded: "good",
  failed: "bad",
  pending: "neutral",
  complete: "good",
  completed: "good",
  // actions
  assigned: "info",
  in_progress: "info",
  awaiting_verification: "warn",
  verified: "good",
  returned: "bad",
  // evidence
  reported: "neutral",
  documented: "info",
  outdated: "bad",
  awaiting_review: "warn",
  // risk versions
  approved: "good",
  // alerts
  acknowledged: "info",
  resolved: "good",
};

function label(status: string): string {
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function StatusBadge({ status }: { status: string }) {
  const tone = TONE_MAP[status] ?? "neutral";
  return <span className={`badge badge-status badge-tone-${tone}`}>{label(status)}</span>;
}
