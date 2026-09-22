import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { api } from "../api";
import AiAnalysisTab from "../components/AiAnalysisTab";
import EvidenceTab from "../components/EvidenceTab";
import { ErrorNotice, Loading } from "../components/Feedback";
import RisksTab from "../components/RisksTab";
import StatusBadge from "../components/StatusBadge";
import type { Assessment } from "../types";

type TabKey = "evidence" | "analysis" | "risks";

const TABS: { key: TabKey; label: string }[] = [
  { key: "evidence", label: "Evidence" },
  { key: "analysis", label: "AI Analysis" },
  { key: "risks", label: "Risks" },
];

export default function AssessmentDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const rawTab = searchParams.get("tab");
  const tab: TabKey =
    rawTab === "analysis" || rawTab === "risks" ? rawTab : "evidence";

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [risksReloadKey, setRisksReloadKey] = useState(0);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setAssessment(await api.get<Assessment>(`/assessments/${id}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load assessment");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!id) return <ErrorNotice message="No assessment id provided." />;
  if (loading) return <Loading label="Loading assessment..." />;
  if (error) return <ErrorNotice message={error} onRetry={() => void load()} />;
  if (!assessment) return null;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="breadcrumb">
            <Link to="/assessments">Assessments</Link> <span>/</span>{" "}
            <span>{assessment.title}</span>
          </div>
          <h2>{assessment.title}</h2>
          <p className="page-sub">
            Horizon: {assessment.horizonMonths} months | Created{" "}
            {new Date(assessment.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="page-actions">
          <StatusBadge status={assessment.status} />
        </div>
      </div>

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            className={`tab${tab === t.key ? " active" : ""}`}
            onClick={() => setSearchParams({ tab: t.key })}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "evidence" && <EvidenceTab assessmentId={id} />}
      {tab === "analysis" && (
        <AiAnalysisTab
          assessmentId={id}
          onRisksChanged={() => setRisksReloadKey((k) => k + 1)}
        />
      )}
      {tab === "risks" && <RisksTab assessmentId={id} reloadKey={risksReloadKey} />}
    </div>
  );
}
