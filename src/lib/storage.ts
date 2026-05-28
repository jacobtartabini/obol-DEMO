import { demoUuid, getDemoState, mutateDemoState } from '@/demo/store';
import type { DemoFileMeta } from '@/demo/seed';

type Bucket = 'receipts' | 'tax-documents';

// In-memory file contents (not persisted across refresh).
const fileBlobs = new Map<string, File>();

function nowIso() {
  return new Date().toISOString();
}

function getMeta(bucket: Bucket, path: string): DemoFileMeta | null {
  const s = getDemoState();
  return (s.data.files.metas ?? []).find((m) => m.bucket === bucket && m.path === path) ?? null;
}

export async function uploadFile(bucket: Bucket, file: File): Promise<{ path: string }> {
  const path = `${bucket}/${demoUuid('file')}_${file.name}`;
  fileBlobs.set(path, file);
  const objectUrl = URL.createObjectURL(file);
  const meta: DemoFileMeta = {
    id: demoUuid('filemeta'),
    bucket,
    path,
    file_name: file.name,
    mime_type: file.type || null,
    file_size: Number.isFinite(file.size) ? file.size : null,
    created_at: nowIso(),
    updated_at: nowIso(),
    object_url: objectUrl,
  };
  mutateDemoState((d) => {
    d.data.files.metas.push(meta);
  });
  return { path };
}

export async function getDownloadUrl(bucket: Bucket, path: string): Promise<string> {
  const meta = getMeta(bucket, path);
  if (!meta) throw new Error('File not found');

  const inMem = fileBlobs.get(path);
  if (inMem) {
    // Always return a fresh object URL to avoid stale URLs.
    return URL.createObjectURL(inMem);
  }

  // We intentionally do not persist file contents in localStorage.
  // If receipts/docs need true persistence, we can implement IndexedDB later.
  throw new Error('File content is not available after refresh. Please re-upload to preview/download.');
}

export async function deleteFile(bucket: Bucket, path: string): Promise<void> {
  // Best-effort cleanup.
  const meta = getMeta(bucket, path);
  if (meta?.object_url) {
    try {
      URL.revokeObjectURL(meta.object_url);
    } catch {
      // ignore
    }
  }
  fileBlobs.delete(path);
  mutateDemoState((d) => {
    d.data.files.metas = d.data.files.metas.filter((m) => !(m.bucket === bucket && m.path === path));
  });
}
