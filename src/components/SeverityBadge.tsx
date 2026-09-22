import type { Band } from "../types";

const LABELS: Record<Band, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export default function SeverityBadge({ band }: { band: Band }) {
  return <span className={`badge badge-band badge-${band}`}>{LABELS[band]}</span>;
}
