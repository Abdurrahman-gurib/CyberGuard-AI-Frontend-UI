import { FormEvent, useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { EmptyState, ErrorNotice, Loading } from "../components/Feedback";
import { useOrg } from "../components/Layout";
import Modal from "../components/Modal";
import StatusBadge from "../components/StatusBadge";
import type { Action, Recommendation } from "../types";

export default function Actions() {
  const { orgId } = useOrg();
  const [actions, setActions] = useState<Action[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // create modal
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [selectedRecs, setSelectedRecs] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // review modals
  const [submitFor, setSubmitFor] = useState<Action | null>(null);
  const [submitNote, setSubmitNote] = useState("");
  const [decisionFor, setDecisionFor] = useState<{
    action: Action;
    decision: "verified" | "returned";
  } | null>(null);
  const [decisionReason, setDecisionReason] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      const [actionData, recData] = await Promise.all([
        api.get<Action[]>(`/organisations/${orgId}/actions`),
        api
          .get<Recommendation[]>(`/organisations/${orgId}/recommendations`)
          .catch(() => [] as Recommendation[]),
      ]);
      setActions(actionData);
      setRecommendations(recData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load actions");
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
    if (!dueAt) {
      setFormError("Due date is required.");
      return;
    }
    setCreating(true);
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        dueAt: new Date(dueAt).toISOString(),
      };
      if (ownerEmail.trim()) body.ownerEmail = ownerEmail.trim();
      if (selectedRecs.length > 0) body.recommendationIds = selectedRecs;
      await api.post<Action>(`/organisations/${orgId}/actions`, body);
      setShowCreate(false);
      setTitle("");
      setDueAt("");
      setOwnerEmail("");
      setSelectedRecs([]);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create action");
    } finally {
      setCreating(false);
    }
  };

  const submitForReview = async () => {
    if (!submitFor) return;
    setModalError(null);
    if (!submitNote.trim()) {
      setModalError("A completion note is required.");
      return;
    }
    setBusy(true);
    try {
      await api.post<Action>(`/actions/${submitFor.id}/submit-review`, {
        note: submitNote.trim(),
      });
      setSubmitFor(null);
      setSubmitNote("");
      await load();
    } catch (e) {
      setModalError(e instanceof Error ? e.message : "Failed to submit for review");
    } finally {
      setBusy(false);
    }
  };

  const decide = async () => {
    if (!decisionFor) return;
    setModalError(null);
    if (!decisionReason.trim()) {
      setModalError("A reason is required.");
      return;
    }
    setBusy(true);
    try {
      await api.post<Action>(`/actions/${decisionFor.action.id}/reviews`, {
        decision: decisionFor.decision,
        reason: decisionReason.trim(),
      });
      setDecisionFor(null);
      setDecisionReason("");
      await load();
    } catch (e) {
      setModalError(e instanceof Error ? e.message : "Failed to record review");
    } finally {
      setBusy(false);
    }
  };

  const toggleRec = (id: string) => {
    setSelectedRecs((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  if (!orgId) return null;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Actions</h2>
          <p className="page-sub">Remediation actions and their verification lifecycle</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            New action
          </button>
        </div>
      </div>

      {loading ? (
        <Loading label="Loading actions…" />
      ) : error ? (
        <ErrorNotice message={error} onRetry={() => void load()} />
      ) : actions.length === 0 ? (
        <EmptyState title="No actions yet">
          Create actions from approved recommendations to track remediation work.
        </EmptyState>
      ) : (
        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Owner</th>
                <th>Due</th>
                <th>Status</th>
                <th>Created</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {actions.map((a) => {
                const overdue =
                  a.dueAt &&
                  new Date(a.dueAt).getTime() < Date.now() &&
                  a.status !== "verified";
                return (
                  <tr key={a.id}>
                    <td className="cell-strong">{a.title}</td>
                    <td>{a.ownerEmail || "—"}</td>
                    <td className={overdue ? "cell-overdue" : undefined}>
                      {a.dueAt ? new Date(a.dueAt).toLocaleDateString() : "—"}
                      {overdue && <span className="overdue-tag">Overdue</span>}
                    </td>
                    <td>
                      <StatusBadge status={a.status} />
                    </td>
                    <td>{new Date(a.createdAt).toLocaleDateString()}</td>
                    <td className="cell-actions">
                      {(a.status === "assigned" || a.status === "in_progress") && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setSubmitFor(a);
                            setSubmitNote("");
                            setModalError(null);
                          }}
                        >
                          Submit for review
                        </button>
                      )}
                      {a.status === "awaiting_verification" && (
                        <span className="btn-row">
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setDecisionFor({ action: a, decision: "verified" });
                              setDecisionReason("");
                              setModalError(null);
                            }}
                          >
                            Verify
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => {
                              setDecisionFor({ action: a, decision: "returned" });
                              setDecisionReason("");
                              setModalError(null);
                            }}
                          >
                            Return
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal title="New action" open={showCreate} onClose={() => setShowCreate(false)}>
        <form onSubmit={create} className="form">
          <label className="field">
            <span>Title *</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Enable MFA on all admin accounts"
            />
          </label>
          <div className="form-grid">
            <label className="field">
              <span>Due date *</span>
              <input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
            </label>
            <label className="field">
              <span>Owner email</span>
              <input
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                placeholder="owner@example.com"
              />
            </label>
          </div>
          {recommendations.length > 0 && (
            <div className="field">
              <span>Link recommendations</span>
              <div className="checkbox-list">
                {recommendations.map((r) => (
                  <label key={r.id} className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={selectedRecs.includes(r.id)}
                      onChange={() => toggleRec(r.id)}
                    />
                    <span>
                      {r.control.controlCode} — {r.riskTitle}{" "}
                      <span className="muted-inline">({r.priority.replace("_", " ")})</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {formError && (
            <div className="feedback error-notice" role="alert">
              {formError}
            </div>
          )}
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" type="submit" disabled={creating}>
              {creating ? "Creating…" : "Create action"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        title="Submit action for review"
        open={submitFor !== null}
        onClose={() => setSubmitFor(null)}
      >
        <div className="form">
          <p className="muted">{submitFor?.title}</p>
          <label className="field">
            <span>Completion note *</span>
            <textarea
              rows={3}
              value={submitNote}
              onChange={(e) => setSubmitNote(e.target.value)}
              placeholder="Describe what was done and any evidence of completion."
            />
          </label>
          {modalError && (
            <div className="feedback error-notice" role="alert">
              {modalError}
            </div>
          )}
          <div className="form-actions">
            <button className="btn btn-secondary" onClick={() => setSubmitFor(null)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={() => void submitForReview()} disabled={busy}>
              {busy ? "Submitting…" : "Submit"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        title={decisionFor?.decision === "verified" ? "Verify action" : "Return action"}
        open={decisionFor !== null}
        onClose={() => setDecisionFor(null)}
      >
        <div className="form">
          <p className="muted">{decisionFor?.action.title}</p>
          <label className="field">
            <span>Reason *</span>
            <textarea
              rows={3}
              value={decisionReason}
              onChange={(e) => setDecisionReason(e.target.value)}
              placeholder={
                decisionFor?.decision === "verified"
                  ? "How was completion verified?"
                  : "Why is the action being returned?"
              }
            />
          </label>
          {modalError && (
            <div className="feedback error-notice" role="alert">
              {modalError}
            </div>
          )}
          <div className="form-actions">
            <button className="btn btn-secondary" onClick={() => setDecisionFor(null)}>
              Cancel
            </button>
            <button
              className={`btn ${decisionFor?.decision === "returned" ? "btn-danger" : "btn-primary"}`}
              onClick={() => void decide()}
              disabled={busy}
            >
              {busy
                ? "Saving…"
                : decisionFor?.decision === "verified"
                  ? "Verify"
                  : "Return"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
