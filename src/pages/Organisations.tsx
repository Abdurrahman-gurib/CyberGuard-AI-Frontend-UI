import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { EmptyState } from "../components/Feedback";
import { useOrg } from "../components/Layout";
import type { Organisation } from "../types";

export default function Organisations() {
  const navigate = useNavigate();
  const { organisations, orgId, selectOrg, refreshOrgs } = useOrg();

  const [name, setName] = useState("");
  const [sector, setSector] = useState("");
  const [size, setSize] = useState<"small" | "medium" | "large">("small");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !sector.trim()) {
      setError("Name and sector are required.");
      return;
    }
    setBusy(true);
    try {
      const org = await api.post<Organisation>("/organisations", {
        name: name.trim(),
        sector: sector.trim(),
        size,
      });
      await refreshOrgs();
      selectOrg(org.id);
      setName("");
      setSector("");
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create organisation");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Organisations</h2>
          <p className="page-sub">Create or select the organisation you are assessing</p>
        </div>
      </div>

      <div className="two-col">
        <section className="card panel">
          <h3>Your organisations</h3>
          {organisations.length === 0 ? (
            <EmptyState title="No organisations yet">
              CyberGuard AI scopes assessments, risks and alerts to an organisation.
              Create your first one to get started.
            </EmptyState>
          ) : (
            <ul className="plain-list">
              {organisations.map((o) => (
                <li key={o.id} className="list-row">
                  <div className="list-main">
                    <span className="list-title">{o.name}</span>
                    <span className="list-meta">
                      {o.sector} · {o.size}
                    </span>
                  </div>
                  {o.id === orgId ? (
                    <span className="badge badge-status badge-tone-good">Selected</span>
                  ) : (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        selectOrg(o.id);
                        navigate("/");
                      }}
                    >
                      Select
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card panel">
          <h3>Create organisation</h3>
          <form onSubmit={create} className="form">
            <label className="field">
              <span>Name *</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Acme Logistics Ltd"
              />
            </label>
            <label className="field">
              <span>Sector *</span>
              <input
                type="text"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                placeholder="e.g. Logistics, Healthcare, Finance"
              />
            </label>
            <label className="field">
              <span>Size *</span>
              <select value={size} onChange={(e) => setSize(e.target.value as typeof size)}>
                <option value="small">Small (&lt; 50 staff)</option>
                <option value="medium">Medium (50–250 staff)</option>
                <option value="large">Large (250+ staff)</option>
              </select>
            </label>
            {error && (
              <div className="feedback error-notice" role="alert">
                {error}
              </div>
            )}
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? "Creating…" : "Create organisation"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
