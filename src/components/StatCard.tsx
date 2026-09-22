interface StatCardProps {
  label: string;
  value: number | string;
  hint?: string;
  tone?: "default" | "warn" | "bad";
}

export default function StatCard({ label, value, hint, tone = "default" }: StatCardProps) {
  return (
    <div className={`card stat-card stat-${tone}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  );
}
