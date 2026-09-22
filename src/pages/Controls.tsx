import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { EmptyState, ErrorNotice, Loading } from "../components/Feedback";
import type { Control } from "../types";

export default function Controls() {
  const [controls, setControls] = useState<Control[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setControls(await api.get<Control[]>("/controls"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load controls");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? controls.filter(
        (c) =>
          c.controlCode.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.framework.toLowerCase().includes(q) ||
          c.referenceCode.toLowerCase().includes(q)
      )
    : controls;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Controls</h2>
          <p className="page-sub">Read-only control catalogue used for recommendations</p>
        </div>
        <div className="page-actions">
          <input
            type="search"
            className="search-input"
            placeholder="Filter controls..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Filter controls"
          />
        </div>
      </div>

      {loading ? (
        <Loading label="Loading controls..." />
      ) : error ? (
        <ErrorNotice message={error} onRetry={() => void load()} />
      ) : controls.length === 0 ? (
        <EmptyState title="Control catalogue is empty">
          The control catalogue is seeded server-side.
        </EmptyState>
      ) : filtered.length === 0 ? (
        <EmptyState title="No matching controls">Try a different search term.</EmptyState>
      ) : (
        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Description</th>
                <th>Complexity</th>
                <th>Framework</th>
                <th>Reference</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td className="cell-mono cell-strong">{c.controlCode}</td>
                  <td>{c.description}</td>
                  <td>{c.complexity}</td>
                  <td>{c.framework}</td>
                  <td className="cell-mono">{c.referenceCode}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
