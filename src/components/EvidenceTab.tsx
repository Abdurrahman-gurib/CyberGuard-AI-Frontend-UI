import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api";
import type { EvidenceDocument, EvidenceStatus } from "../types";
import { EmptyState, ErrorNotice, Loading } from "./Feedback";
import StatusBadge from "./StatusBadge";

const EVIDENCE_STATUSES: EvidenceStatus[] = [
  "reported",
  "documented",
  "verified",
  "outdated",
  "awaiting_review",
];

export default function EvidenceTab({ assessmentId }: { assessmentId: string }) {
  const [docs, setDocs] = useState<EvidenceDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [statusBusy, setStatusBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDocs(await api.get<EvidenceDocument[]>(`/assessments/${assessmentId}/evidence`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load evidence");
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const upload = async () => {
    if (!selectedFile) {
      setUploadError("Choose a file first (.pdf, .docx, .csv or .txt).");
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", selectedFile);
      await api.upload<EvidenceDocument>(`/assessments/${assessmentId}/evidence`, fd);
      setSelectedFile(null);
      if (fileRef.current) fileRef.current.value = "";
      await load();
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const changeStatus = async (docId: string, evidenceStatus: EvidenceStatus) => {
    setStatusBusy(docId);
    try {
      await api.post(`/evidence/${docId}/status`, { evidenceStatus });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update evidence status");
    } finally {
      setStatusBusy(null);
    }
  };

  return (
    <div className="tab-panel">
      <div className="card panel upload-panel">
        <h3>Upload evidence</h3>
        <p className="muted">
          Supported formats: PDF, DOCX, CSV, TXT. Uploaded documents are text-extracted
          and can be cited by the AI analysis.
        </p>
        <div className="upload-row">
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.csv,.txt"
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setSelectedFile(e.target.files?.[0] ?? null)
            }
          />
          <button className="btn btn-primary" onClick={() => void upload()} disabled={uploading}>
            {uploading ? "Uploading…" : "Upload"}
          </button>
        </div>
        {uploadError && (
          <div className="feedback error-notice" role="alert">
            {uploadError}
          </div>
        )}
      </div>

      {loading ? (
        <Loading label="Loading evidence…" />
      ) : error ? (
        <ErrorNotice message={error} onRetry={() => void load()} />
      ) : docs.length === 0 ? (
        <EmptyState title="No evidence uploaded">
          Upload policies, scan results, asset inventories or incident logs to give
          the AI analysis something to work from.
        </EmptyState>
      ) : (
        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th>File</th>
                <th>Source</th>
                <th>Extraction</th>
                <th>Evidence status</th>
                <th>Preview</th>
                <th>Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id}>
                  <td className="cell-strong">{d.filename}</td>
                  <td>{d.sourceType}</td>
                  <td>
                    <StatusBadge status={d.extractionStatus} />
                  </td>
                  <td>
                    <div className="status-cell">
                      <StatusBadge status={d.evidenceStatus} />
                      <select
                        value={d.evidenceStatus}
                        disabled={statusBusy === d.id}
                        onChange={(e) =>
                          void changeStatus(d.id, e.target.value as EvidenceStatus)
                        }
                        aria-label={`Change status of ${d.filename}`}
                      >
                        {EVIDENCE_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s.replace(/_/g, " ")}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="cell-preview" title={d.textPreview ?? ""}>
                    {d.textPreview
                      ? d.textPreview.length > 80
                        ? `${d.textPreview.slice(0, 80)}…`
                        : d.textPreview
                      : "—"}
                  </td>
                  <td>{new Date(d.uploadedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
