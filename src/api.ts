import type { User } from "./types";

const BASE_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) || "http://localhost:3000/api";

const TOKEN_KEY = "cg_token";
const USER_KEY = "cg_user";
const ORG_KEY = "cg_org";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(ORG_KEY);
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function setStoredUser(user: User): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getStoredOrgId(): string | null {
  return localStorage.getItem(ORG_KEY);
}

export function setStoredOrgId(orgId: string): void {
  localStorage.setItem(ORG_KEY, orgId);
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  /** Raw FormData body for multipart uploads; Content-Type is left to the browser. */
  formData?: FormData;
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data === "string") return data;
    if (data && typeof data.message === "string") return data.message;
    if (data && typeof data.error === "string") return data.error;
  } catch {
    // fall through to status text
  }
  return `Request failed (${res.status} ${res.statusText})`;
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let body: BodyInit | undefined;
  if (opts.formData) {
    body = opts.formData;
  } else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method: opts.method ?? (body !== undefined ? "POST" : "GET"),
      headers,
      body,
    });
  } catch {
    throw new Error("Unable to reach the CyberGuard AI API. Is the server running?");
  }

  if (res.status === 401 && !path.startsWith("/auth/")) {
    clearSession();
    window.location.href = "/login";
    throw new Error("Session expired. Please sign in again.");
  }

  if (!res.ok) {
    throw new Error(await parseError(res));
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ?? {} }),
  upload: <T>(path: string, formData: FormData) =>
    request<T>(path, { method: "POST", formData }),
};
