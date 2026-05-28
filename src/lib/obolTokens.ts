/**
 * Demo token manager.
 *
 * In production these are issued server-side via an edge function.
 */
import { demoUuid, getDemoState, mutateDemoState } from '@/demo/store';

export interface ObolPatMetadata {
  id: string;
  name: string;
  token_prefix: string;
  created_at: string;
  last_used_at?: string | null;
  expires_at?: string | null;
  revoked_at?: string | null;
}

export const listObolTokens = () =>
  Promise.resolve(getDemoState().data.obol_api_tokens.tokens as ObolPatMetadata[]);

export const createObolToken = (name?: string) =>
  Promise.resolve().then(() => {
    const created_at = new Date().toISOString();
    const raw = `demo_${demoUuid('pat')}_${Math.random().toString(16).slice(2)}`;
    const token_prefix = raw.slice(0, 12);
    const metadata: ObolPatMetadata = {
      id: demoUuid('patmeta'),
      name: name ?? 'Demo',
      token_prefix,
      created_at,
      last_used_at: null,
      expires_at: null,
      revoked_at: null,
    };
    mutateDemoState((d) => {
      d.data.obol_api_tokens.tokens.unshift(metadata);
    });
    return { token: raw, metadata };
  });

export const revokeObolToken = (id: string) =>
  Promise.resolve().then(() => {
    mutateDemoState((d) => {
      d.data.obol_api_tokens.tokens = d.data.obol_api_tokens.tokens.map((t) =>
        t.id === id ? { ...t, revoked_at: new Date().toISOString() } : t,
      );
    });
    return { ok: true };
  });
