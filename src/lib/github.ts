/**
 * Avvio manuale di una nuova edizione dal telefono.
 * Serve un token GitHub personale (fine-grained, solo questo repository, permesso
 * "Actions: lettura e scrittura"). Resta in questo browser: non è nei dati esportati.
 */
export const REPO = 'gitommydotcom/boomscroll';
export const ACTIONS_URL = `https://github.com/${REPO}/actions/workflows/daily.yml`;
const TOKEN_KEY = 'bs-gh-token';

export function getToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? '';
  } catch {
    return '';
  }
}

export function setToken(token: string) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token.trim());
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // archiviazione non disponibile
  }
}

export async function startEdition(): Promise<'ok' | 'unauthorized' | 'error'> {
  const token = getToken();
  if (!token) return 'unauthorized';
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/daily.yml/dispatches`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: 'main', inputs: { slot: '', deploy: true } }),
    });
    if (res.status === 204) return 'ok';
    return res.status === 401 || res.status === 403 || res.status === 404 ? 'unauthorized' : 'error';
  } catch {
    return 'error';
  }
}

export interface RunStatus {
  status: 'queued' | 'in_progress' | 'completed' | string;
  conclusion: string | null;
  startedAt: string;
  updatedAt: string;
}

/** Stato dell'ultima preparazione (il repository è pubblico: basta una richiesta anonima). */
export async function lastRun(): Promise<RunStatus | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/daily.yml/runs?per_page=1`, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!res.ok) return null;
    const run = (await res.json()).workflow_runs?.[0];
    return run ? { status: run.status, conclusion: run.conclusion, startedAt: run.run_started_at, updatedAt: run.updated_at } : null;
  } catch {
    return null;
  }
}
