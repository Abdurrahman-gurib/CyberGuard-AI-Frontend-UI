import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import type {
  AiAnalysisOutput,
  AiReviewOutput,
  AiRun,
  Risk,
  RiskVersion,
} from "../types";
import { bandForScore } from "../types";
import { EmptyState, ErrorNotice, Loading } from "./Feedback";
import SeverityBadge from "./SeverityBadge";
import StatusBadge from "./StatusBadge";

function isAnalysisOutput(output: AiRun["output"]): output is AiAnalysisOutput {
  return !!output && Array.isArray((output as AiAnalysisOutput).claims);
}

function isReviewOutput(output: AiRun["output"]): output is AiReviewOutput {
  return !!output && Array.isArray((output as AiReviewOutput).critique);
}

const VERDICT_CLASS: Record<string, string> = {
  supported: "verdict-supported",
  unsupported: "verdict-unsupported",
  ambiguous: "verdict-ambiguous",
  incomplete: "verdict-incomplete",
};

export default function AiAnalysisTab({
  assessmentId,
  onRisksChanged,
}: {
  assessmentId: string;
  onRisksChanged?: () => void;
}) {
  const [runs, setRuns] = useState<AiRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [addingRisk, setAddingRisk] = useState<string | null>(null);
  const [addedRisks, setAddedRisks] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<AiRun[]>(`/assessments/${assessmentId}/ai-runs`);
      setRuns(
        [...data].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load AI runs");
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const runAnalysis = async () => {
    setAnalyzing(true);
    setActionError(null);
    try {
      await api.post<AiRun>(`/assessments/${assessmentId}/analyze`, {});
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const requestReview = async (runId: string) => {
    setReviewing(true);
    setActionError(null);
    try {
      await api.post<AiRun>(`/ai-runs/${runId}/review`, {});
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Review request failed");
    } finally {
      setReviewing(false);
    }
  };

  const addAsRisk = async (suggestion: {
    title: string;
    likelihood: number;
    impact: number;
    rationale: string;
  }) => {
    setAddingRisk(suggestion.title);
    setActionError(null);
    try {
      const risk = await api.post<Risk>(`/assessments/${assessmentId}/risks`, {
        title: suggestion.title,
        description: suggestion.rationale,
      });
      await api.post<RiskVersion>(`/risks/${risk.id}/versions`, {
        likelihood: suggestion.likelihood,
        impact: suggestion.impact,
        basis: "current",
        rationale: suggestion.rationale,
      });
      setAddedRisks((prev) => new Set(prev).add(suggestion.title));
      onRisksChanged?.();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to add risk");
    } finally {
      setAddingRisk(null);
    }
  };

  if (loading) return <Loading label="Loading AI runs…" />;
  if (error) return <ErrorNotice message={error} onRetry={() => void load()} />;

  const latestDraft = runs.find((r) => r.provider === "openai");
  const latestReview = runs.find((r) => r.provider === "anthropic");
  const draftOutput =
    latestDraft && latestDraft.status === "succeeded" && isAnalysisOutput(latestDraft.output)
      ? latestDraft.output
      : null;
  const reviewOutput =
    latestReview && latestReview.status === "succeeded" && isReviewOutput(latestReview.output)
      ? latestReview.output
      : null;

  return (
    <div className="tab-panel">
      <div className="card panel">
        <div className="panel-header-row">
          <h3>AI analysis pipeline</h3>
          <div className="btn-row">
            <button className="btn btn-primary" onClick={() => void runAnalysis()} disabled={analyzing}>
              {analyzing ? "Running analysis…" : "Run OpenAI analysis"}
            </button>
            {latestDraft && latestDraft.status === "succeeded" && (
              <button
                className="btn btn-secondary"
                onClick={() => void requestReview(latestDraft.id)}
                disabled={reviewing}
              >
                {reviewing ? "Requesting review…" : "Request Claude review"}
              </button>
            )}
          </div>
        </div>
        <p className="muted">
          The OpenAI stage drafts evidence-grounded claims and risk suggestions;
          the Claude stage independently critiques the draft.
        </p>
        {actionError && (
          <div className="feedback error-notice" role="alert">
            {actionError}
          </div>
        )}
      </div>

      {latestDraft && latestDraft.status === "failed" && (
        <div className="feedback error-notice" role="alert">
          Latest analysis run failed: {latestDraft.error || "unknown error"}
        </div>
      )}

      {!latestDraft && (
        <EmptyState title="No analysis runs yet">
          Upload evidence, then run the OpenAI analysis to produce draft claims,
          risk suggestions and open questions.
        </EmptyState>
      )}

      {draftOutput && (
        <>
          <section className="card panel">
            <h3>
              Draft claims{" "}
              <span className="muted-inline">
                ({latestDraft ? latestDraft.model : ""})
              </span>
            </h3>
            {draftOutput.claims.length === 0 ? (
              <EmptyState title="No claims produced" />
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Statement</th>
                    <th>Evidence</th>
                    <th>Review</th>
                  </tr>
                </thead>
                <tbody>
                  {draftOutput.claims.map((c) => (
                    <tr key={c.claim_id}>
                      <td className="cell-mono">{c.claim_id}</td>
                      <td>
                        {c.statement}
                        {c.assumptions.length > 0 && (
                          <div className="claim-extra">
                            Assumptions: {c.assumptions.join("; ")}
                          </div>
                        )}
                        {c.missing_information.length > 0 && (
                          <div className="claim-extra">
                            Missing: {c.missing_information.join("; ")}
                          </div>
                        )}
                      </td>
                      <td className="cell-mono">
                        {c.evidence_ids.length > 0 ? c.evidence_ids.join(", ") : "—"}
                      </td>
                      <td>
                        {c.review_required ? (
                          <span className="badge badge-status badge-tone-warn">
                            Review required
                          </span>
                        ) : (
                          <span className="badge badge-status badge-tone-good">OK</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="card panel">
            <h3>Risk suggestions</h3>
            {draftOutput.risk_suggestions.length === 0 ? (
              <EmptyState title="No risk suggestions" />
            ) : (
              <ul className="plain-list">
                {draftOutput.risk_suggestions.map((s, idx) => {
                  const score = s.likelihood * s.impact;
                  const added = addedRisks.has(s.title);
                  return (
                    <li key={`${s.title}-${idx}`} className="list-row suggestion-row">
                      <div className="list-main">
                        <span className="list-title">{s.title}</span>
                        <span className="list-meta">
                          L{s.likelihood} × I{s.impact} = {score}
                        </span>
                        <p className="suggestion-rationale">{s.rationale}</p>
                      </div>
                      <div className="list-badges">
                        <SeverityBadge band={bandForScore(score)} />
                        <button
                          className="btn btn-secondary btn-sm"
                          disabled={added || addingRisk === s.title}
                          onClick={() => void addAsRisk(s)}
                        >
                          {added
                            ? "Added"
                            : addingRisk === s.title
                              ? "Adding…"
                              : "Add as risk"}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="card panel">
            <h3>Open questions</h3>
            {draftOutput.questions.length === 0 ? (
              <EmptyState title="No open questions" />
            ) : (
              <ul className="bullet-list">
                {draftOutput.questions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {latestReview && latestReview.status === "failed" && (
        <div className="feedback error-notice" role="alert">
          Latest Claude review failed: {latestReview.error || "unknown error"}
        </div>
      )}

      {reviewOutput && (
        <section className="card panel">
          <h3>
            Claude review{" "}
            <span className="muted-inline">({latestReview ? latestReview.model : ""})</span>
          </h3>
          {reviewOutput.critique.length === 0 ? (
            <EmptyState title="No critique items" />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Claim</th>
                  <th>Verdict</th>
                  <th>Issue</th>
                  <th>Suggested revision</th>
                </tr>
              </thead>
              <tbody>
                {reviewOutput.critique.map((c, i) => (
                  <tr key={`${c.claim_id}-${i}`}>
                    <td className="cell-mono">{c.claim_id}</td>
                    <td>
                      <span className={`badge verdict ${VERDICT_CLASS[c.verdict] ?? ""}`}>
                        {c.verdict}
                      </span>
                    </td>
                    <td>{c.issue_category}</td>
                    <td>{c.suggested_revision || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reviewOutput.change_log.length > 0 && (
            <>
              <h4 className="subhead">Change log</h4>
              <ul className="plain-list">
                {reviewOutput.change_log.map((c, i) => (
                  <li key={`${c.claim_id}-${i}`} className="list-row">
                    <div className="list-main">
                      <span className="list-title">
                        <span className="cell-mono">{c.claim_id}</span>: {c.change}
                      </span>
                      <span className="list-meta">{c.reason}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      <section className="card panel">
        <h3>Run history</h3>
        {runs.length === 0 ? (
          <EmptyState title="No runs yet" />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Provider</th>
                <th>Model</th>
                <th>Status</th>
                <th>Created</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id}>
                  <td className="cell-strong">{r.provider}</td>
                  <td className="cell-mono">{r.model}</td>
                  <td>
                    <StatusBadge status={r.status} />
                  </td>
                  <td>{new Date(r.createdAt).toLocaleString()}</td>
                  <td className="cell-preview">{r.error || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
