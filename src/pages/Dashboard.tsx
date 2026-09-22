import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { EmptyState, ErrorNotice, Loading } from "../components/Feedback";
import { useOrg } from "../components/Layout";
import RiskMatrix from "../components/RiskMatrix";
import SeverityBadge from "../components/SeverityBadge";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import type { Alert, DashboardData } from "../types";

function fmtDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

export default function Dashboard() {
  const { orgId, organisation } = useOrg();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [evalMessage, setEvalMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      setData(await api.get<DashboardData>(`/organisations/${orgId}/dashboard`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  const evaluateAlerts = async () => {
    if (!orgId) return;
    setEvaluating(true);
    setEvalMessage(null);
    try {
      const created = await api.post<Alert[]>(`/organisations/${orgId}/alerts/evaluate`);
      setEvalMessage(
        created.length === 0
          ? "Evaluation complete — no new alerts."
          : `Evaluation complete — ${created.length} new alert${created.length === 1 ? "" : "s"} raised.`
      );
      await load();
    } catch (e) {
      setEvalMessage(e instanceof Error ? e.message : "Alert evaluation failed");
    } finally {
      setEvaluating(false);
    }
  };

  if (!orgId) return null;
  if (loading) return <Loading label="Loading dashboard…" />;
  if (error) return <ErrorNotice message={error} onRetry={() => void load()} />;
  if (!data) return null;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Overview</h2>
          <p className="page-sub">
            Security posture for {organisation ? organisation.name : "your organisation"}
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => void evaluateAlerts()} disabled={evaluating}>
            {evaluating ? "Evaluating…" : "Evaluate alerts"}
          </button>
        </div>
      </div>
      {evalMessage && <div className="feedback info-notice">{evalMessage}</div>}

      <div className="stat-grid">
        <StatCard
          label="Urgent open risks"
          value={data.urgentOpenRisks}
          tone={data.urgentOpenRisks > 0 ? "bad" : "default"}
          hint="High or critical, not yet treated"
        />
        <StatCard
          label="Overdue actions"
          value={data.overdueActions}
          tone={data.overdueActions > 0 ? "warn" : "default"}
          hint="Past their due date"
        />
        <StatCard
          label="Evidence awaiting review"
          value={data.evidenceAwaitingReview}
          hint="Documents pending verification"
        />
        <StatCard
          label="Open alerts"
          value={data.openAlerts}
          tone={data.openAlerts > 0 ? "warn" : "default"}
          hint="Unacknowledged alerts"
        />
      </div>

      <div className="dashboard-grid">
        <section className="card panel">
          <h3>Risk matrix</h3>
          <RiskMatrix cells={data.riskMatrix} />
        </section>

        <section className="card panel">
          <h3>Priority action queue</h3>
          {data.priorityActions.length === 0 ? (
            <EmptyState title="No priority actions">
              Actions with the nearest due dates will appear here.
            </EmptyState>
          ) : (
            <ul className="plain-list">
              {data.priorityActions.map((a) => (
                <li key={a.id} className="list-row">
                  <div className="list-main">
                    <span className="list-title">{a.title}</span>
                    <span className="list-meta">Due {fmtDate(a.dueAt)}</span>
                  </div>
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          )}
          <Link to="/actions" className="panel-link">
            View all actions →
          </Link>
        </section>

        <section className="card panel panel-wide">
          <h3>Recent alerts</h3>
          {data.recentAlerts.length === 0 ? (
            <EmptyState title="No recent alerts">
              Run &ldquo;Evaluate alerts&rdquo; to check current risk and action state.
            </EmptyState>
          ) : (
            <ul className="plain-list">
              {data.recentAlerts.map((alert) => (
                <li key={alert.id} className="list-row">
                  <div className="list-main">
                    <span className="list-title">{alert.message}</span>
                    <span className="list-meta">
                      {alert.source} · {fmtDate(alert.createdAt)}
                    </span>
                  </div>
                  <div className="list-badges">
                    <SeverityBadge band={alert.severity} />
                    <StatusBadge status={alert.state} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link to="/alerts" className="panel-link">
            View all alerts →
          </Link>
        </section>
      </div>
    </div>
  );
}
