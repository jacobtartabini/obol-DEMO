import { DEFAULT_DEMO_STATE, DEMO_SCHEMA_VERSION, DEMO_STORAGE_KEY, type DemoState } from './seed';

function safeParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function clone<T>(v: T): T {
  return structuredClone(v);
}

function getExpectedAppDataVersion(): string {
  // Use a single constant so demo state can be invalidated deterministically.
  // Bump this string whenever you change the seed shape in a breaking way.
  return 'demo-data-v1';
}

let state: DemoState | null = null;

export function getDemoState(): DemoState {
  if (!state) {
    state = loadOrInitDemoState();
  }
  return state;
}

export function setDemoState(next: DemoState): void {
  state = next;
  persistDemoState(next);
}

export function mutateDemoState(mutator: (draft: DemoState) => void): DemoState {
  const draft = clone(getDemoState());
  mutator(draft);
  setDemoState(draft);
  return draft;
}

export function persistDemoState(s: DemoState): void {
  const minimal = clone(s);
  // Never persist object URLs (they are tied to this runtime session).
  if (minimal.data.files?.metas) {
    minimal.data.files.metas = minimal.data.files.metas.map((m) => {
      const { object_url: _omit, ...rest } = m;
      return rest;
    });
  }
  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(minimal));
}

export function loadOrInitDemoState(): DemoState {
  const expectedVersion = getExpectedAppDataVersion();
  const raw = localStorage.getItem(DEMO_STORAGE_KEY);
  if (raw) {
    const parsed = safeParse<DemoState>(raw);
    if (
      parsed &&
      parsed.schemaVersion === DEMO_SCHEMA_VERSION &&
      parsed.appDataVersion === expectedVersion
    ) {
      // Ensure any missing top-level keys exist after non-breaking changes.
      const hydrated: DemoState = {
        ...DEFAULT_DEMO_STATE,
        ...parsed,
        schemaVersion: DEMO_SCHEMA_VERSION,
        appDataVersion: expectedVersion,
        data: {
          ...DEFAULT_DEMO_STATE.data,
          ...parsed.data,
          files: { ...DEFAULT_DEMO_STATE.data.files, ...(parsed.data as DemoState['data']).files },
          obol_api_tokens: {
            ...DEFAULT_DEMO_STATE.data.obol_api_tokens,
            ...(parsed.data as DemoState['data']).obol_api_tokens,
          },
          ai: { ...DEFAULT_DEMO_STATE.data.ai, ...(parsed.data as DemoState['data']).ai },
        },
      };
      state = hydrated;
      // Re-persist once so we normalize any missing keys.
      persistDemoState(hydrated);
      return hydrated;
    }
  }
  const seeded = clone(DEFAULT_DEMO_STATE);
  seeded.schemaVersion = DEMO_SCHEMA_VERSION;
  seeded.appDataVersion = expectedVersion;
  state = seeded;
  persistDemoState(seeded);
  return seeded;
}

export function resetDemoData(): void {
  state = null;
  localStorage.removeItem(DEMO_STORAGE_KEY);
  // Optional future: clear IndexedDB if we add file persistence.
}

export function demoUuid(prefix: string = 'demo'): string {
  const id = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random()}`).toString();
  return `${prefix}_${id.replace(/[^a-zA-Z0-9_-]/g, '')}`;
}

