export type Band = "low" | "medium" | "high" | "critical";

export interface User {
  id: string;
  email: string;
  displayName: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Organisation {
  id: string;
  name: string;
  sector: string;
  size: "small" | "medium" | "large";
  createdAt: string;
}

export interface Asset {
  id: string;
  name: string;
  assetType: string;
  criticality: number;
  product?: string | null;
  version?: string | null;
  createdAt: string;
}

export interface Assessment {
  id: string;
  title: string;
  horizonMonths: number;
  status: string;
  createdAt: string;
  organisationId?: string;
}

export type EvidenceStatus =
  | "reported"
  | "documented"
  | "verified"
  | "outdated"
  | "awaiting_review";

export interface EvidenceDocument {
  id: string;
  filename: string;
  sourceType: string;
  extractionStatus: string;
  evidenceStatus: EvidenceStatus;
  textPreview: string | null;
  uploadedAt: string;
}

export interface RiskVersion {
  id: string;
  versionNo: number;
  likelihood: number;
  impact: number;
  score: number;
  band: Band;
  basis: "current" | "projected";
  rationale: string;
  status: "draft" | "approved";
  consequenceReview: boolean;
  approvedAt: string | null;
}

export interface Risk {
  id: string;
  title: string;
  description: string;
  status: string;
  assetId: string | null;
  versions: RiskVersion[];
}

export interface RiskRegisterEntry {
  riskId: string;
  title: string;
  assessmentTitle: string;
  latestVersion: RiskVersion | null;
}

export interface AiClaim {
  claim_id: string;
  statement: string;
  evidence_ids: string[];
  assumptions: string[];
  missing_information: string[];
  candidate_control_ids: string[];
  review_required: boolean;
}

export interface AiRiskSuggestion {
  title: string;
  likelihood: number;
  impact: number;
  rationale: string;
}

export interface AiCritiqueItem {
  claim_id: string;
  verdict: "supported" | "unsupported" | "ambiguous" | "incomplete";
  issue_category: string;
  suggested_revision: string;
}

export interface AiChangeLogItem {
  claim_id: string;
  change: string;
  reason: string;
}

export interface AiAnalysisOutput {
  claims: AiClaim[];
  risk_suggestions: AiRiskSuggestion[];
  questions: string[];
}

export interface AiReviewOutput {
  critique: AiCritiqueItem[];
  revised_draft: unknown[];
  change_log: AiChangeLogItem[];
}

export interface AiRun {
  id: string;
  provider: "openai" | "anthropic";
  model: string;
  status: "succeeded" | "failed" | string;
  output: AiAnalysisOutput | AiReviewOutput | null;
  error?: string | null;
  createdAt: string;
}

export interface Control {
  id: string;
  controlCode: string;
  description: string;
  complexity: string;
  framework: string;
  referenceCode: string;
}

export type RecommendationPriority = "immediate" | "scheduled" | "longer_term";

export interface Recommendation {
  id: string;
  priority: RecommendationPriority;
  rationale: string;
  status: string;
  control: Control;
  riskTitle: string;
}

export type ActionStatus =
  | "draft"
  | "assigned"
  | "in_progress"
  | "awaiting_verification"
  | "verified"
  | "returned";

export interface Action {
  id: string;
  title: string;
  status: ActionStatus;
  dueAt: string | null;
  ownerEmail: string | null;
  createdAt: string;
}

export type AlertSeverity = "low" | "medium" | "high" | "critical";
export type AlertState = "open" | "acknowledged" | "resolved";

export interface Alert {
  id: string;
  severity: AlertSeverity;
  state: AlertState;
  message: string;
  source: string;
  dedupKey: string;
  createdAt: string;
}

export interface Report {
  id: string;
  status: string;
  snapshot: {
    generatedAt: string;
    assessmentTitle: string;
    totals: {
      risksByBand: Record<string, number>;
      actionsByStatus: Record<string, number>;
    };
    risks: unknown[];
  };
  createdAt: string;
}

export interface DashboardData {
  urgentOpenRisks: number;
  overdueActions: number;
  evidenceAwaitingReview: number;
  openAlerts: number;
  riskMatrix: { likelihood: number; impact: number; count: number }[];
  priorityActions: { id: string; title: string; status: string; dueAt: string | null }[];
  recentAlerts: Alert[];
}

/** Compute the risk band for a likelihood x impact score (client-side preview only). */
export function bandForScore(score: number): Band {
  if (score >= 17) return "critical";
  if (score >= 10) return "high";
  if (score >= 5) return "medium";
  return "low";
}

/** Dissertation anchor labels for likelihood 1-5. */
export const LIKELIHOOD_LABELS: Record<number, string> = {
  1: "Rare - not expected within the horizon",
  2: "Unlikely - possible but not anticipated",
  3: "Possible - could occur within the horizon",
  4: "Likely - expected to occur at least once",
  5: "Almost certain - occurs repeatedly / imminent",
};

/** Dissertation anchor labels for impact 1-5. */
export const IMPACT_LABELS: Record<number, string> = {
  1: "Negligible - no material disruption",
  2: "Minor - limited, quickly recoverable disruption",
  3: "Moderate - noticeable operational or data impact",
  4: "Major - serious disruption, regulatory exposure",
  5: "Severe - existential, safety or large-scale breach",
};
