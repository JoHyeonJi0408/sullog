/**
 * 로컬 개발(npm run dev)에서만 쓰는 가짜 claude.ai 런타임.
 * 아티팩트 밖에서도 화면 흐름을 확인할 수 있게 db/assets/sample/user/downloads를 흉내 낸다.
 */
type Listener = () => void;
const docs = new Map<string, Record<string, unknown>>();
const listeners = new Set<Listener>();
const notify = () => setTimeout(() => listeners.forEach((l) => l()), 0);

function colRef(path: string, filters: [string, string, unknown][] = []): unknown {
  const query = () =>
    [...docs.entries()]
      .filter(([k]) => k.startsWith(path + '/') && !k.slice(path.length + 1).includes('/'))
      .filter(([, v]) => filters.every(([f, , val]) => v[f] === val))
      .map(([k, v]) => ({ id: k.split('/').pop()!, exists: true, data: () => v }));
  return {
    path,
    doc: (id = Math.random().toString(36).slice(2)) => docRef(`${path}/${id}`),
    where: (f: string, op: string, v: unknown) => colRef(path, [...filters, [f, op, v]]),
    get: async () => ({ docs: query(), metadata: { fromCache: false } }),
    onSnapshot(next: (s: unknown) => void) {
      const l = () => next({ docs: query(), metadata: { fromCache: false } });
      listeners.add(l);
      setTimeout(l, 50);
      return () => listeners.delete(l);
    },
  };
}
function docRef(path: string): unknown {
  return {
    id: path.split('/').pop(),
    path,
    get: async () => ({ id: path.split('/').pop(), exists: docs.has(path), data: () => docs.get(path) }),
    set: async (d: Record<string, unknown>) => { docs.set(path, structuredClone(d)); notify(); },
    update: async (d: Record<string, unknown>) => { docs.set(path, { ...docs.get(path), ...d }); notify(); },
    delete: async () => { docs.delete(path); notify(); },
    collection: (p: string) => colRef(`${path}/${p}`),
  };
}

const sample = Object.assign(async () => ({ text: '' }), {
  json: async (prompt: string) => {
    await new Promise((r) => setTimeout(r, 800));
    if (prompt.includes('바코드(EAN/UPC) 아래 숫자')) return { barcode: '8801234567893' };
    return { isDrink: true, name: '글렌피딕 12년', category: 'whisky', subtype: '싱글몰트', producer: '글렌피딕', origin: '스코틀랜드 스페이사이드', abv: 40, vintage: '12년', volumeMl: 700, barcode: null };
  },
  limits: async () => ({ maxPromptBytes: 262144, images: { maxCount: 5, maxInputBytes: 2e7, mediaTypes: ['image/jpeg', 'image/png'] } }),
});

const caps: Record<string, unknown> = {
  db: { doc: docRef, collection: colRef },
  user: { id: async () => 'devuser' },
  assets: { upload: async () => ({ id: 'x'.repeat(32), url: '' }), delete: async () => ({ deleted: true }) },
  sample,
  downloads: { save: async () => ({ status: 'saved' }) },
};

(window as unknown as { claude: unknown }).claude = { use: async (n: string) => caps[n] ?? null };
(window as unknown as { __mockDocs: unknown }).__mockDocs = docs;
export {};
