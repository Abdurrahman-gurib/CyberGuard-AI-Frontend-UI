import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { EmptyState, ErrorNotice, Loading } from "../components/Feedback";
import { useOrg } from "../components/Layout";
import Modal from "../components/Modal";
import StatusBadge from "../components/StatusBadge";
import type { Assessment } from "../types";

export default function Assessments() {
  const { orgId } = useOrg();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [horizonMonths, setHorizonMonths] = useState(12);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!title.trim()) {
      setFormError("Title is required.");
      return;
    }
    if (!Number.isFinite(horizonMonths) || horizonMonths < 1) {
      setFormError("Horizon must be at least 1 month.");
      return;
    }
    setBusy(true);
    try {
      await api.post<Assessment>(`/organisations/${orgId}/assessments`, {
        title: title.trim(),
        horizonMonths,
      });
      setShowCreate(false);
      setTitle("");
      setHorizonMonths(12);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create assessment");
    } finally {
      setBusy(false);
    }
  };

  if (!orgId) return null;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Assessments</h2>
          <p className="page-sub">Risk assessments scoped to a planning horizon</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            New assessment
          </button>
        </div>
      </div>

      {loading ? (
        <Loading label="Loading assessments..." />
      ) : error ? (
        <ErrorNotice message={error} onRetry={() => void load()} />
      ) : assessments.length === 0 ? (
        <EmptyState title="No assessments yet">
          Create an assessment, upload evidence, then run the AI analysis pipeline
          to draft claims and risk suggestions.
        </EmptyState>
      ) : (
        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Horizon</th>
                <th>Status</th>
                <th>Created</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {assessments.map((a) => (
                <tr key={a.id}>
                  <td>
                    <Link to={`/assessments/${a.id}`} className="table-link">
                      {a.title}
                    </Link>
                  </td>
                  <td>{a.horizonMonths} months</td>
                  <td>
                    <StatusBadge status={a.status} />
                  </td>
                  <td>{new Date(a.createdAt).toLocaleDateString()}</td>
                  <td className="cell-actions">
                    <Link to={`/assessments/${a.id}`} className="btn btn-secondary btn-sm">
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal title="New assessment" open={showCreate} onClose={() => setShowCreate(false)}>
        <form onSubmit={create} className="form">
          <label className="field">
            <span>Title *</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Q3 2026 ransomware exposure review"
            />
          </label>
          <label className="field">
            <span>Horizon (months) *</span>
            <input
              type="number"
              min={1}
              max={60}
              value={horizonMonths}
              onChange={(e) => setHorizonMonths(Number(e.target.value))}
            />
          </label>
          {formError && (
            <div className="feedback error-notice" role="alert">
              {formError}
            </div>
          )}
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
