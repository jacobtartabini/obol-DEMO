import { getDemoState } from './store';

export function bootstrapDemo(): void {
  // Ensures localStorage has a valid demo snapshot before any queries run.
  // This is intentionally synchronous so app startup is predictable.
  getDemoState();
}

