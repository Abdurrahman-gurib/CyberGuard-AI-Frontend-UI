import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  api,
  clearSession,
  getStoredOrgId,
  getStoredUser,
  setStoredOrgId,
} from "../api";
import type { Organisation, User } from "../types";
import { ErrorNotice, Loading } from "./Feedback";

interface OrgContextValue {
  organisations: Organisation[];
  orgId: string | null;
  organisation: Organisation | null;
  selectOrg: (id: string) => void;
  refreshOrgs: () => Promise<void>;
  user: User | null;
}

const OrgContext = createContext<OrgContextValue | null>(null);

export function useOrg(): OrgContextValue {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrg must be used within Layout");
  return ctx;
}

const NAV_ITEMS: { to: string; label: string; end?: boolean }[] = [
  { to: "/", label: "Overview", end: true },
  { to: "/assessments", label: "Assessments" },
  { to: "/evidence", label: "Evidence" },
  { to: "/risk-register", label: "Risk Register" },
  { to: "/actions", label: "Actions" },
  { to: "/alerts", label: "Alerts" },
  { to: "/reports", label: "Reports" },
  { to: "/controls", label: "Controls" },
  { to: "/assets", label: "Assets" },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getStoredUser();

  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [orgId, setOrgId] = useState<string | null>(getStoredOrgId());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrgs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const orgs = await api.get<Organisation[]>("/organisations");
      setOrganisations(orgs);
      const stored = getStoredOrgId();
      if (orgs.length === 0) {
        setOrgId(null);
      } else if (!stored || !orgs.some((o) => o.id === stored)) {
        setStoredOrgId(orgs[0].id);
        setOrgId(orgs[0].id);
      } else {
        setOrgId(stored);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load organisations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrgs();
  }, [loadOrgs]);

  // If the user has no organisation yet, send them to the setup page.
  useEffect(() => {
    if (!loading && !error && organisations.length === 0 && location.pathname !== "/organisations") {
      navigate("/organisations", { replace: true });
    }
  }, [loading, error, organisations, location.pathname, navigate]);

  const selectOrg = useCallback((id: string) => {
    setStoredOrgId(id);
    setOrgId(id);
  }, []);

  const organisation = useMemo(
    () => organisations.find((o) => o.id === orgId) ?? null,
    [organisations, orgId]
  );

  const ctxValue = useMemo<OrgContextValue>(
    () => ({ organisations, orgId, organisation, selectOrg, refreshOrgs: loadOrgs, user }),
    [organisations, orgId, organisation, selectOrg, loadOrgs, user]
  );

  const logout = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-shield" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M12 2.5 4.5 5.4v6.1c0 4.6 3.2 8 7.5 9.9 4.3-1.9 7.5-5.3 7.5-9.9V5.4L12 2.5Z"/><path d="m8.7 12 2.3 2.3 4.3-4.5" strokeLinecap="round"/></svg>
          </span>
          <div>
            <div className="brand-name">CyberGuard AI</div>
            <div className="brand-sub">Risk Analysis Platform</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">Dissertation prototype</div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <div className="topbar-org">
            {organisations.length > 0 ? (
              <label className="org-switcher">
                <span className="org-label">Organisation</span>
                <select
                  value={orgId ?? ""}
                  onChange={(e) => selectOrg(e.target.value)}
                  aria-label="Select organisation"
                >
                  {organisations.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <span className="org-label">No organisation configured</span>
            )}
          </div>
          <div className="topbar-user">
            <span className="user-name">{user ? user.displayName : "Unknown user"}</span>
            <span className="user-email">{user?.email}</span>
            <button className="btn btn-secondary btn-sm" onClick={logout}>
              Log out
            </button>
          </div>
        </header>

        <main className="content">
          {loading ? (
            <Loading label="Loading workspace..." />
          ) : error ? (
            <ErrorNotice message={error} onRetry={() => void loadOrgs()} />
          ) : (
            <OrgContext.Provider value={ctxValue}>
              <Outlet />
            </OrgContext.Provider>
          )}
        </main>
      </div>
    </div>
  );
}
