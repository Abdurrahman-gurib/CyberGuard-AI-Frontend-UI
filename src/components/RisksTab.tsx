import { FormEvent, useCallback, useEffect, useState } from "react";
import { api } from "../api";
import type { Asset, Control, Risk, RiskVersion } from "../types";
import { bandForScore, IMPACT_LABELS, LIKELIHOOD_LABELS } from "../types";
import { EmptyState, ErrorNotice, Loading } from "./Feedback";
import SeverityBadge from "./SeverityBadge";
import StatusBadge from "./StatusBadge";

function scaleOptions(labels: Record<number, string>) {
  return [1, 2, 3, 4, 5].map((n) => (
    <option key={n} value={n}>
      {n} — {labels[n]}
    </option>
  ));
}

function AddVersionForm({
  riskId,
  onSaved,
}: {
  riskId: string;
  onSaved: () => Promise<void>;
}) {
  const [likelihood, setLikelihood] = useState(3);
  const [impact, setImpact] = useState(3);
  const [basis, setBasis] = useState<"current" | "projected">("current");
  const [rationale, setRationale] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const score = likelihood * impact;
  const band = bandForScore(score);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!rationale.trim()) {
      setError("A rationale is required for every scored version.");
      return;
    }
    setBusy(true);
    try {
      await api.post<RiskVersion>(`/risks/${riskId}/versions`, {
        likelihood,
        impact,
        basis,
        rationale: rationale.trim(),
      });
      setRationale("");
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add version");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="form version-form">
      <div className="form-grid">
        <label className="field">
          <span>Likelihood</span>
          <select value={likelihood} onChange={(e) => setLikelihood(Number(e.target.value))}>
            {scaleOptions(LIKELIHOOD_LABELS)}
          </select>
        </label>
        <label className="field">
          <span>Impact</span>
          <select value={impact} onChange={(e) => setImpact(Number(e.target.value))}>
            {scaleOptions(IMPACT_LABELS)}
          </select>
        </label>
        <label className="field">
          <span>Basis</span>
          <select
            value={basis}
            onChange={(e) => setBasis(e.target.value as "current" | "projected")}
          >
            <option value="current">Current</option>
            <option value="projected">Projected</option>
          </select>
        </label>
        <div className="field score-preview">
          <span>Preview</span>
          <div className="score-preview-value">
            <strong>{score}</strong>
            <SeverityBadge band={band} />
          </div>
        </div>
      </div>
      {impact === 5 && (
        <div className="feedback warn-notice" role="alert">
          Consequence review required: impact 5 versions must undergo a structured
          consequence review before approval.
        </div>
      )}
      <label className="field">
        <span>Rationale *</span>
        <textarea
          rows={2}
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          placeholder="Why this likelihood and impact? Reference evidence where possible."
        />
      </label>
      {error && (
        <div className="feedback error-notice" role="alert">
          {error}
        </div>
      )}
      <div>
        <button className="btn btn-primary btn-sm" type="submit" disabled={busy}>
          {busy ? "Saving…" : "Add version"}
        </button>
      </div>
    </form>
  );
}

function RecommendationForm({
  versionId,
  controls,
  onSaved,
}: {
  versionId: string;
  controls: Control[];
  onSaved: () => void;
}) {
  const [controlId, setControlId] = useState("");
  const [priority, setPriority] = useState<"immediate" | "scheduled" | "longer_term">(
    "scheduled"
  );
  const [rationale, setRationale] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!controlId) {
      setError("Select a control from the catalogue.");
      return;
    }
    if (!rationale.trim()) {
      setError("A rationale is required.");
      return;
    }
    setBusy(true);
    try {
      await api.post(`/risk-versions/${versionId}/recommendations`, {
        controlId,
        priority,
        rationale: rationale.trim(),
      });
      setSaved(true);
      setRationale("");
      setControlId("");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add recommendation");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="form recommendation-form">
      <h5 className="subhead">Recommend a control</h5>
      <div className="form-grid">
        <label className="field">
          <span>Control *</span>
          <select value={controlId} onChange={(e) => setControlId(e.target.value)}>
            <option value="">Select a control…</option>
            {controls.map((c) => (
              <option key={c.id} value={c.id}>
                {c.controlCode} — {c.description.length > 70 ? `${c.description.slice(0, 70)}…` : c.description}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Priority *</span>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as typeof priority)}
          >
            <option value="immediate">Immediate</option>
            <option value="scheduled">Scheduled</option>
            <option value="longer_term">Longer term</option>
          </select>
        </label>
      </div>
      <label className="field">
        <span>Rationale *</span>
        <textarea
          rows={2}
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          placeholder="Why does this control treat the risk?"
        />
      </label>
      {error && (
        <div className="feedback error-notice" role="alert">
          {error}
        </div>
      )}
      <div className="btn-row">
        <button className="btn btn-secondary btn-sm" type="submit" disabled={busy}>
          {busy ? "Saving…" : "Add recommendation"}
        </button>
        {saved && <span className="muted-inline">Recommendation saved.</span>}
      </div>
    </form>
  );
}

export default function RisksTab({
  assessmentId,
  reloadKey = 0,
}: {
  assessmentId: string;
  reloadKey?: number;
}) {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [controls, setControls] = useState<Control[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assetId, setAssetId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [approveBusy, setApproveBusy] = useState<string | null>(null);
  const [openRecommendFor, setOpenRecommendFor] = useState<string | null>(null);

  const loadRisks = useCallback(async () => {
    try {
      setRisks(await api.get<Risk[]>(`/assessments/${assessmentId}/risks`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load risks");
    }
  }, [assessmentId]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [riskData, controlData] = await Promise.all([
        api.get<Risk[]>(`/assessments/${assessmentId}/risks`),
        api.get<Control[]>(`/controls`),
      ]);
      setRisks(riskData);
      setControls(controlData);
      // Assets are optional context; failure should not block the tab.
      try {
        const assessment = await api.get<{ organisationId?: string }>(
          `/assessments/${assessmentId}`
        );
        if (assessment.organisationId) {
          setAssets(
            await api.get<Asset[]>(`/organisations/${assessment.organisationId}/assets`)
          );
        }
      } catch {
        setAssets([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load risks");
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll, reloadKey]);

  const createRisk = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!title.trim() || !description.trim()) {
      setFormError("Title and description are required.");
      return;
    }
    setCreating(true);
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim(),
      };
      if (assetId) body.assetId = assetId;
      await api.post<Risk>(`/assessments/${assessmentId}/risks`, body);
      setTitle("");
      setDescription("");
      setAssetId("");
      await loadRisks();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create risk");
    } finally {
      setCreating(false);
    }
  };

  const approve = async (versionId: string) => {
    setApproveBusy(versionId);
    try {
      await api.post<RiskVersion>(`/risk-versions/${versionId}/approve`, {});
      await loadRisks();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to approve version");
    } finally {
      setApproveBusy(null);
    }
  };

  if (loading) return <Loading label="Loading risks…" />;
  if (error) return <ErrorNotice message={error} onRetry={() => void loadAll()} />;

  return (
    <div className="tab-panel">
      <section className="card panel">
        <h3>Create risk</h3>
        <form onSubmit={createRisk} className="form">
          <div className="form-grid">
            <label className="field">
              <span>Title *</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Ransomware via unpatched VPN gateway"
              />
            </label>
            <label className="field">
              <span>Related asset</span>
              <select value={assetId} onChange={(e) => setAssetId(e.target.value)}>
                <option value="">None</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.assetType})
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="field">
            <span>Description *</span>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the threat scenario and affected assets."
            />
          </label>
          {formError && (
            <div className="feedback error-notice" role="alert">
              {formError}
            </div>
          )}
          <div>
            <button className="btn btn-primary" type="submit" disabled={creating}>
              {creating ? "Creating…" : "Create risk"}
            </button>
          </div>
        </form>
      </section>

      {risks.length === 0 ? (
        <EmptyState title="No risks recorded">
          Create a risk manually or add one from the AI Analysis tab&rsquo;s suggestions.
        </EmptyState>
      ) : (
        risks.map((risk) => {
          const versions = [...risk.versions].sort((a, b) => b.versionNo - a.versionNo);
          return (
            <section key={risk.id} className="card panel risk-card">
              <div className="panel-header-row">
                <div>
                  <h3>{risk.title}</h3>
                  <p className="muted">{risk.description}</p>
                </div>
                <StatusBadge status={risk.status} />
              </div>

              <h4 className="subhead">Version history</h4>
              {versions.length === 0 ? (
                <p className="muted">No scored versions yet — add one below.</p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>v</th>
                      <th>L</th>
                      <th>I</th>
                      <th>Score</th>
                      <th>Band</th>
                      <th>Basis</th>
                      <th>Rationale</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {versions.map((v) => (
                      <tr key={v.id}>
                        <td>{v.versionNo}</td>
                        <td>{v.likelihood}</td>
                        <td>{v.impact}</td>
                        <td className="cell-strong">{v.score}</td>
                        <td>
                          <SeverityBadge band={v.band} />
                        </td>
                        <td>{v.basis}</td>
                        <td className="cell-preview" title={v.rationale}>
                          {v.rationale.length > 60
                            ? `${v.rationale.slice(0, 60)}…`
                            : v.rationale}
                          {v.consequenceReview && (
                            <div className="consequence-flag">
                              Consequence review required
                            </div>
                          )}
                        </td>
                        <td>
                          <StatusBadge status={v.status} />
                        </td>
                        <td className="cell-actions">
                          {v.status === "draft" ? (
                            <button
                              className="btn btn-secondary btn-sm"
                              disabled={approveBusy === v.id}
                              onClick={() => void approve(v.id)}
                            >
                              {approveBusy === v.id ? "Approving…" : "Approve"}
                            </button>
                          ) : (
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() =>
                                setOpenRecommendFor(
                                  openRecommendFor === v.id ? null : v.id
                                )
                              }
                            >
                              {openRecommendFor === v.id ? "Hide" : "Recommend control"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {versions
                .filter((v) => v.status === "approved" && openRecommendFor === v.id)
                .map((v) => (
                  <RecommendationForm
                    key={v.id}
                    versionId={v.id}
                    controls={controls}
                    onSaved={() => undefined}
                  />
                ))}

              <h4 className="subhead">Add version</h4>
              <AddVersionForm riskId={risk.id} onSaved={loadRisks} />
            </section>
          );
        })
      )}
    </div>
  );
}
