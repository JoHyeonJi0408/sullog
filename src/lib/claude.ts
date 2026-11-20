/** claude.ai 아티팩트 런타임 접근 (claude.use) — 필요한 만큼만 타입을 적어둔다 */

export interface DocSnap { id: string; exists: boolean; data(): Record<string, unknown> | undefined }
export interface QuerySnap { docs: DocSnap[]; metadata: { fromCache: boolean } }
export interface DbErr { code: string; message: string }
export interface DocRef {
  id: string;
  get(): Promise<DocSnap>;
  set(d: Record<string, unknown>): Promise<void>;
  update(d: Record<string, unknown>): Promise<void>;
  delete(): Promise<void>;
  collection(p: string): ColRef;
}
export interface ColRef {
  doc(id?: string): DocRef;
  where(f: string, op: string, v: unknown): ColRef;
  get(): Promise<QuerySnap>;
  onSnapshot(next: (s: QuerySnap) => void, err?: (e: DbErr) => void): () => void;
}
export interface Db { doc(p: string): DocRef; collection(p: string): ColRef }
export interface Assets {
  upload(b: Blob, o?: { type?: string }): Promise<{ id: string; url: string }>;
  delete(id: string): Promise<{ deleted: boolean }>;
}
export interface SampleErr { code: string; message: string; text?: string }
export interface Sample {
  (input: string, opts?: Record<string, unknown>): Promise<{ text: string }>;
  json<T = unknown>(input: string, opts?: Record<string, unknown>): Promise<T>;
  limits(): Promise<{ images?: { maxCount: number; mediaTypes: string[] } }>;
}
export interface User { id(): Promise<string | null> }
export interface Downloads { save(r: { filename: string; data: string | Blob }): Promise<{ status: string }> }

interface CapMap { db: Db; assets: Assets; sample: Sample; user: User; downloads: Downloads }

declare global {
  interface Window {
    claude?: { use<K extends keyof CapMap>(name: K): Promise<CapMap[K] | null> };
  }
}

export function use<K extends keyof CapMap>(name: K): Promise<CapMap[K] | null> {
  if (!window.claude?.use) return Promise.resolve(null);
  return window.claude.use(name).catch(() => null);
}
