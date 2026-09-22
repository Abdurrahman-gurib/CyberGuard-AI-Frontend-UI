import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, setStoredUser, setToken } from "../api";
import type { AuthResponse } from "../types";

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }
    if (mode === "register" && !displayName.trim()) {
      setError("Display name is required.");
      return;
    }
    setBusy(true);
    try {
      const res =
        mode === "login"
          ? await api.post<AuthResponse>("/auth/login", { email: email.trim(), password })
          : await api.post<AuthResponse>("/auth/register", {
              email: email.trim(),
              password,
              displayName: displayName.trim(),
            });
      setToken(res.token);
      setStoredUser(res.user);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card card">
        <div className="login-brand">
          <span className="brand-shield" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M12 2.5 4.5 5.4v6.1c0 4.6 3.2 8 7.5 9.9 4.3-1.9 7.5-5.3 7.5-9.9V5.4L12 2.5Z"/><path d="m8.7 12 2.3 2.3 4.3-4.5" strokeLinecap="round"/></svg>
          </span>
          <h1>CyberGuard AI</h1>
          <p className="login-sub">AI-assisted cybersecurity risk analysis</p>
        </div>

        <div className="login-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={mode === "login"}
            className={`login-tab${mode === "login" ? " active" : ""}`}
            onClick={() => setMode("login")}
            type="button"
          >
            Sign in
          </button>
          <button
            role="tab"
            aria-selected={mode === "register"}
            className={`login-tab${mode === "register" ? " active" : ""}`}
            onClick={() => setMode("register")}
            type="button"
          >
            Create account
          </button>
        </div>

        <form onSubmit={submit} className="form">
          {mode === "register" && (
            <label className="field">
              <span>Display name</span>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Alex Morgan"
                autoComplete="name"
              />
            </label>
          )}
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>

          {error && (
            <div className="feedback error-notice" role="alert">
              {error}
            </div>
          )}

          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            {busy
              ? "Please wait..."
              : mode === "login"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}
