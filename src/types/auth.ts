export interface OboIdentity {
  /** Primary identity from JWT `sub` claim. */
  user?: string;
  node?: string;
  tailnet?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  identity: OboIdentity | null;
  /** Canonical app identifier for user-scoped data (maps to DB `user_key`). */
  userKey: string | null;
}

export interface AuthContextType extends AuthState {
  verifyAuth: () => Promise<boolean>;
  logout: () => void;
}
