import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { EmptyState, ErrorNotice, Loading } from "../components/Feedback";
import { useOrg } from "../components/Layout";
import SeverityBadge from "../components/SeverityBadge";
import type { Assessment, Band, Report } from "../types";

const BAND_ORDER: Band[] = ["critical", "high", "medium", "low"];

export default function Reports() {
  const { orgId } = useOrg();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [reports, setReports] = useState<Report[]>([]);
  const [loadingAssessments, setLoadingAssessments] = useState(true);
  const [loadingReports, setLoadingReports] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const loadAssessments = useCallback(async () => {
    if (!orgId) return;
    setLoadingAssessments(true);
    setError(null);
    try {
      const data = await api.get<Assessment[]>(`/organisations/${orgId}/assessments`);
      setAssessments(data);
      if (data.length > 0) {
        setSelectedId((prev) => (prev && data.some((a) => a.id === prev) ? prev : data[0].id));
      } else {
        setSelectedId("");
        setReports([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load assessments");
    } finally {
      setLoadingAssessments(false);
    }
  }, [orgId]);

  const loadReports = useCallback(async () => {
    if (!selectedId) return;
    setLoadingReports(true);
    setError(null);
    try {
      const data = await api.get<Report[]>(`/assessments/${selectedId}/reports`);
      setReports(
        [...data].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load reports");
    } finally {
      setLoadingReports(false);
    }
  }, [selectedId]);

  useEffect(() => {
    void loadAssessments();
  }, [loadAssessments]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const generate = async () => {
    if (!selectedId) return;
    setGenerating(true);
    setError(null);
    try {
      await api.post<Report>(`/assessments/${selectedId}/reports`, {});
      await loadReports();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate report");
    } finally {
      setGenerating(false);
    }
  };

  if (!orgId) return null;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Reports</h2>
          <p className="page-sub">Point-in-time snapshots of an assessment&rsquo;s risk posture</p>
        </div>
        <div className="page-actions">
          <label className="field-inline">
            <span>Assessment</span>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              disabled={assessments.length === 0}
            >
              {assessments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
          </label>
          <button
            className="btn btn-primary"
            onClick={() => void generate()}
            disabled={generating || !selectedId}
          >
            {generating ? "Generating..." : "Generate report"}
          </button>
        </div>
      </div>

      {error && <ErrorNotice message={error} onRetry={() => void loadReports()} />}

      {loadingAssessments ? (
        <Loading label="Loading assessments..." />
      ) : assessments.length === 0 ? (
        <EmptyState title="No assessments available">
          Create an assessment before generating reports.
        </EmptyState>
      ) : loadingReports ? (
        <Loading label="Loading reports..." />
      ) : reports.length === 0 ? (
        <EmptyState title="No reports yet">
          Generate a report to snapshot the current risks and action statuses of this assessment.
        </EmptyState>
      ) : (
        <div className="report-list">
          {reports.map((r) => {
            const isOpen = expanded === r.id;
            const bands = r.snapshot?.totals?.risksByBand ?? {};
            const actionTotals = r.snapshot?.totals?.actionsByStatus ?? {};
            return (
              <section key={r.id} className="card panel">
                <div className="panel-header-row">
                  <div>
                    <h3>{r.snapshot?.assessmentTitle ?? "Report"}</h3>
                    <p className="muted">
                      Generated{" "}
                      {r.snapshot?.generatedAt
                        ? new Date(r.snapshot.generatedAt).toLocaleString()
                        : new Date(r.createdAt).toLocaleString()}{" "}
                      | Status: {r.status}
                    </p>
                  </div>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setExpanded(isOpen ? null : r.id)}
                  >
                    {isOpen ? "Hide snapshot" : "View snapshot"}
                  </button>
                </div>

                <div className="report-totals">
                  <div className="totals-group">
                    <span className="totals-label">Risks by band:</span>
                    {BAND_ORDER.map((band) => (
                      <span key={band} className="totals-item">
                        <SeverityBadge band={band} /> {bands[band] ?? 0}
                      </span>
                    ))}
                  </div>
                  <div className="totals-group">
                    <span className="totals-label">Actions:</span>
                    {Object.keys(actionTotals).length === 0 ? (
                      <span className="muted-inline">none</span>
                    ) : (
                      Object.entries(actionTotals).map(([status, count]) => (
                        <span key={status} className="totals-item">
                          {status.replace(/_/g, " ")}: <strong>{count}</strong>
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {isOpen && (
                  <pre className="json-view">{JSON.stringify(r.snapshot, null, 2)}</pre>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
