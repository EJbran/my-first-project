const AUTH_KEY = "ims-auth-state";

export interface PersistedAuthState {
  sessionId?: string;
  loginMode?: "MICROSOFT" | "LOCAL" | "AD" | "OTHER";
}

export const readAuthState = (): PersistedAuthState => {
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as PersistedAuthState;
  } catch {
    return {};
  }
};

export const writeAuthState = (state: PersistedAuthState): void => {
  localStorage.setItem(AUTH_KEY, JSON.stringify(state));
};

export const clearAuthState = (): void => {
  localStorage.removeItem(AUTH_KEY);
};
