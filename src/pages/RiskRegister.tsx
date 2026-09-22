import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { EmptyState, ErrorNotice, Loading } from "../components/Feedback";
import { useOrg } from "../components/Layout";
import SeverityBadge from "../components/SeverityBadge";
import StatusBadge from "../components/StatusBadge";
import type { Band, RiskRegisterEntry } from "../types";

const BAND_FILTERS: ("all" | Band)[] = ["all", "critical", "high", "medium", "low"];

export default function RiskRegister() {
  const { orgId } = useOrg();
  const [entries, setEntries] = useState<RiskRegisterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bandFilter, setBandFilter] = useState<"all" | Band>("all");

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      setEntries(
        await api.get<RiskRegisterEntry[]>(`/organisations/${orgId}/risk-register`)
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load risk register");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!orgId) return null;

  const filtered = entries.filter(
    (e) => bandFilter === "all" || e.latestVersion?.band === bandFilter
  );

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Risk Register</h2>
          <p className="page-sub">All risks across the organisation&rsquo;s assessments</p>
        </div>
        <div className="page-actions">
          <label className="field-inline">
            <span>Band</span>
            <select
              value={bandFilter}
              onChange={(e) => setBandFilter(e.target.value as "all" | Band)}
            >
              {BAND_FILTERS.map((b) => (
                <option key={b} value={b}>
                  {b === "all" ? "All bands" : b.charAt(0).toUpperCase() + b.slice(1)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {loading ? (
        <Loading label="Loading risk register..." />
      ) : error ? (
        <ErrorNotice message={error} onRetry={() => void load()} />
      ) : entries.length === 0 ? (
        <EmptyState title="Risk register is empty">
          Risks appear here once they are recorded in an assessment and scored.
        </EmptyState>
      ) : filtered.length === 0 ? (
        <EmptyState title={`No ${bandFilter} risks`}>
          Try a different band filter.
        </EmptyState>
      ) : (
        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Risk</th>
                <th>Assessment</th>
                <th>Likelihood</th>
                <th>Impact</th>
                <th>Score</th>
                <th>Band</th>
                <th>Version status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.riskId}>
                  <td className="cell-strong">{e.title}</td>
                  <td>{e.assessmentTitle}</td>
                  <td>{e.latestVersion ? e.latestVersion.likelihood : "-"}</td>
                  <td>{e.latestVersion ? e.latestVersion.impact : "-"}</td>
                  <td className="cell-strong">
                    {e.latestVersion ? e.latestVersion.score : "-"}
                  </td>
                  <td>
                    {e.latestVersion ? (
                      <SeverityBadge band={e.latestVersion.band} />
                    ) : (
                      <span className="muted">Unscored</span>
                    )}
                  </td>
                  <td>
                    {e.latestVersion ? (
                      <StatusBadge status={e.latestVersion.status} />
                    ) : (
                      "-"
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
