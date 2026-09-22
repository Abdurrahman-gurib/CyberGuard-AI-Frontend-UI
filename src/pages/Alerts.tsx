import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { EmptyState, ErrorNotice, Loading } from "../components/Feedback";
import { useOrg } from "../components/Layout";
import SeverityBadge from "../components/SeverityBadge";
import StatusBadge from "../components/StatusBadge";
import type { Alert } from "../types";

export default function Alerts() {
  const { orgId } = useOrg();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [ackBusy, setAckBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      setAlerts(await api.get<Alert[]>(`/organisations/${orgId}/alerts`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load alerts");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  const evaluate = async () => {
    if (!orgId) return;
    setEvaluating(true);
    setMessage(null);
    try {
      const created = await api.post<Alert[]>(`/organisations/${orgId}/alerts/evaluate`);
      setMessage(
        created.length === 0
          ? "Evaluation complete — no new alerts."
          : `Evaluation complete — ${created.length} new alert${created.length === 1 ? "" : "s"}.`
      );
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Alert evaluation failed");
    } finally {
      setEvaluating(false);
    }
  };

  const acknowledge = async (id: string) => {
    setAckBusy(id);
    try {
      await api.post<Alert>(`/alerts/${id}/acknowledge`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to acknowledge alert");
    } finally {
      setAckBusy(null);
    }
  };

  if (!orgId) return null;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Alerts</h2>
          <p className="page-sub">Rule-based alerts on risk, action and evidence state</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => void evaluate()} disabled={evaluating}>
            {evaluating ? "Evaluating…" : "Evaluate alerts"}
          </button>
        </div>
      </div>

      {message && <div className="feedback info-notice">{message}</div>}

      {loading ? (
        <Loading label="Loading alerts…" />
      ) : error ? (
        <ErrorNotice message={error} onRetry={() => void load()} />
      ) : alerts.length === 0 ? (
        <EmptyState title="No alerts">
          Run an evaluation to check for urgent risks, overdue actions and stale evidence.
        </EmptyState>
      ) : (
        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Severity</th>
                <th>Message</th>
                <th>Source</th>
                <th>State</th>
                <th>Raised</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => (
                <tr key={a.id}>
                  <td>
                    <SeverityBadge band={a.severity} />
                  </td>
                  <td className="cell-strong">{a.message}</td>
                  <td>{a.source}</td>
                  <td>
                    <StatusBadge status={a.state} />
                  </td>
                  <td>{new Date(a.createdAt).toLocaleString()}</td>
                  <td className="cell-actions">
                    {a.state === "open" && (
                      <button
                        className="btn btn-secondary btn-sm"
                        disabled={ackBusy === a.id}
                        onClick={() => void acknowledge(a.id)}
                      >
                        {ackBusy === a.id ? "Acknowledging…" : "Acknowledge"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
