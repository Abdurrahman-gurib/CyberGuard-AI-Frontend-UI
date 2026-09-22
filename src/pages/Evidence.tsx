import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { EmptyState, ErrorNotice, Loading } from "../components/Feedback";
import { useOrg } from "../components/Layout";
import StatusBadge from "../components/StatusBadge";
import type { Assessment } from "../types";

/**
 * Evidence hub: evidence is stored per assessment, so this page lists the
 * organisation's assessments and links straight into each one's Evidence tab.
 */
export default function Evidence() {
  const { orgId } = useOrg();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      setAssessments(await api.get<Assessment[]>(`/organisations/${orgId}/assessments`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load assessments");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!orgId) return null;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Evidence</h2>
          <p className="page-sub">
            Evidence documents are managed per assessment — choose one to upload or review
          </p>
        </div>
      </div>

      {loading ? (
        <Loading label="Loading assessments…" />
      ) : error ? (
        <ErrorNotice message={error} onRetry={() => void load()} />
      ) : assessments.length === 0 ? (
        <EmptyState title="No assessments yet">
          Create an assessment first, then upload evidence documents to it.{" "}
          <Link to="/assessments">Go to Assessments</Link>.
        </EmptyState>
      ) : (
        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Assessment</th>
                <th>Status</th>
                <th>Created</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {assessments.map((a) => (
                <tr key={a.id}>
                  <td className="cell-strong">{a.title}</td>
                  <td>
                    <StatusBadge status={a.status} />
                  </td>
                  <td>{new Date(a.createdAt).toLocaleDateString()}</td>
                  <td className="cell-actions">
                    <Link
                      to={`/assessments/${a.id}?tab=evidence`}
                      className="btn btn-secondary btn-sm"
                    >
                      Manage evidence
                    </Link>
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
