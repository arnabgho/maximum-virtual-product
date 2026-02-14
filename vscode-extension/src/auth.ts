import * as vscode from "vscode";

const TOKEN_KEY = "mvp.supabaseToken";
const REFRESH_KEY = "mvp.supabaseRefresh";

let _secrets: vscode.SecretStorage;
let _cachedToken: string | null = null;
let _onDidSignIn = new vscode.EventEmitter<void>();
let _onDidSignOut = new vscode.EventEmitter<void>();

export const onDidSignIn = _onDidSignIn.event;
export const onDidSignOut = _onDidSignOut.event;

export function initAuth(secrets: vscode.SecretStorage): void {
  _secrets = secrets;
}

/** Return the cached Supabase JWT, or try to load from SecretStorage. */
export async function getToken(): Promise<string | null> {
  if (_cachedToken) return _cachedToken;
  if (!_secrets) return null;
  const stored = await _secrets.get(TOKEN_KEY);
  if (stored) {
    _cachedToken = stored;
  }
  return _cachedToken;
}

/** Prompt the user to sign in with GitHub, exchange for Supabase JWT. */
export async function signIn(): Promise<string | null> {
  // 1. Get GitHub token from VS Code's built-in GitHub auth
  const session = await vscode.authentication.getSession(
    "github",
    ["user:email"],
    { createIfNone: true }
  );
  if (!session) return null;

  // 2. Exchange GitHub token for Supabase JWT via backend
  const backendUrl = vscode.workspace
    .getConfiguration("mvp")
    .get("backendUrl", "http://localhost:8000");

  const res = await fetch(`${backendUrl}/api/auth/github-exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ github_token: session.accessToken }),
  });

  if (!res.ok) {
    const detail = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(
      (detail as { detail?: string }).detail || "Token exchange failed"
    );
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    user_id: string;
  };

  // 3. Store tokens
  _cachedToken = data.access_token;
  await _secrets.store(TOKEN_KEY, data.access_token);
  await _secrets.store(REFRESH_KEY, data.refresh_token);

  _onDidSignIn.fire();
  return data.access_token;
}

/** Clear stored tokens. */
export async function signOut(): Promise<void> {
  _cachedToken = null;
  await _secrets.delete(TOKEN_KEY);
  await _secrets.delete(REFRESH_KEY);
  _onDidSignOut.fire();
}

/** Clear the in-memory cache so next getToken() re-reads from storage. */
export function clearCachedToken(): void {
  _cachedToken = null;
}

/** Returns true if a token is available (cached or stored). */
export async function isSignedIn(): Promise<boolean> {
  return (await getToken()) !== null;
}
