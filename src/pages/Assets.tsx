import { FormEvent, useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { EmptyState, ErrorNotice, Loading } from "../components/Feedback";
import { useOrg } from "../components/Layout";
import type { Asset } from "../types";

const CRITICALITY_LABELS: Record<number, string> = {
  1: "1 - Minimal",
  2: "2 - Low",
  3: "3 - Moderate",
  4: "4 - High",
  5: "5 - Mission critical",
};

export default function Assets() {
  const { orgId } = useOrg();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [assetType, setAssetType] = useState("");
  const [criticality, setCriticality] = useState(3);
  const [product, setProduct] = useState("");
  const [version, setVersion] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      setAssets(await api.get<Asset[]>(`/organisations/${orgId}/assets`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load assets");
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
    if (!name.trim() || !assetType.trim()) {
      setFormError("Name and asset type are required.");
      return;
    }
    setCreating(true);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        assetType: assetType.trim(),
        criticality,
      };
      if (product.trim()) body.product = product.trim();
      if (version.trim()) body.version = version.trim();
      await api.post<Asset>(`/organisations/${orgId}/assets`, body);
      setName("");
      setAssetType("");
      setCriticality(3);
      setProduct("");
      setVersion("");
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create asset");
    } finally {
      setCreating(false);
    }
  };

  if (!orgId) return null;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Assets</h2>
          <p className="page-sub">Systems, data and services in scope for assessment</p>
        </div>
      </div>

      <section className="card panel">
        <h3>Register asset</h3>
        <form onSubmit={create} className="form">
          <div className="form-grid">
            <label className="field">
              <span>Name *</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Customer database"
              />
            </label>
            <label className="field">
              <span>Type *</span>
              <input
                type="text"
                value={assetType}
                onChange={(e) => setAssetType(e.target.value)}
                placeholder="e.g. server, database, SaaS"
              />
            </label>
            <label className="field">
              <span>Criticality *</span>
              <select
                value={criticality}
                onChange={(e) => setCriticality(Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {CRITICALITY_LABELS[n]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Product</span>
              <input
                type="text"
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                placeholder="e.g. PostgreSQL"
              />
            </label>
            <label className="field">
              <span>Version</span>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="e.g. 15.3"
              />
            </label>
          </div>
          {formError && (
            <div className="feedback error-notice" role="alert">
              {formError}
            </div>
          )}
          <div>
            <button className="btn btn-primary" type="submit" disabled={creating}>
              {creating ? "Registering..." : "Register asset"}
            </button>
          </div>
        </form>
      </section>

      {loading ? (
        <Loading label="Loading assets..." />
      ) : error ? (
        <ErrorNotice message={error} onRetry={() => void load()} />
      ) : assets.length === 0 ? (
        <EmptyState title="No assets registered">
          Register the systems and data stores in scope so risks can be linked to them.
        </EmptyState>
      ) : (
        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Criticality</th>
                <th>Product</th>
                <th>Version</th>
                <th>Added</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((a) => (
                <tr key={a.id}>
                  <td className="cell-strong">{a.name}</td>
                  <td>{a.assetType}</td>
                  <td>
                    <span className={`badge crit crit-${a.criticality}`}>
                      {a.criticality} / 5
                    </span>
                  </td>
                  <td>{a.product || "-"}</td>
                  <td>{a.version || "-"}</td>
                  <td>{new Date(a.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
