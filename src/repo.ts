/**
 * 데이터 접근은 전부 이 파일을 거친다.
 * 기록은 claude.ai 아티팩트 저장소의 '나만 보는 공간'(data/users/<내 id>)에,
 * 사진은 아티팩트 파일 저장소에 저장된다.
 */
import { useSyncExternalStore } from 'react';
import { use, type Assets, type ColRef, type DocRef } from './lib/claude';
import type { Drink, Tasting } from './types';
import { processPhoto, dataUrlToBlob } from './photo';
import { newId } from './util';

export type Status = 'loading' | 'ready' | 'signedOut' | 'readOnly' | 'error';

interface State {
  status: Status;
  slow: boolean; // 10초가 지나도 답이 없을 때
  drinks: Drink[];
  tastings: Tasting[];
  canPhoto: boolean;
}

let state: State = { status: 'loading', slow: false, drinks: [], tastings: [], canPhoto: false };
const listeners = new Set<() => void>();
function setState(p: Partial<State>) {
  state = { ...state, ...p };
  listeners.forEach((l) => l());
}

let me: DocRef | undefined;
let drinksCol: ColRef | undefined;
let tastingsCol: ColRef | undefined;
let assets: Assets | null = null;

async function init() {
  const timer = setTimeout(() => setState({ slow: true }), 10000);
  const [db, user, a] = await Promise.all([use('db'), use('user'), use('assets')]);
  assets = a;
  const uid = user ? await user.id().catch(() => null) : null;
  if (!db || !uid) {
    clearTimeout(timer);
    return setState({ status: 'signedOut' });
  }
  me = db.doc(`data/users/${uid}/profile`);
  drinksCol = me.collection('drinks');
  tastingsCol = me.collection('tastings');
  setState({ canPhoto: !!assets });

  let gotD = false;
  let gotT = false;
  const done = () => {
    if (gotD && gotT) {
      clearTimeout(timer);
      setState({ status: state.status === 'loading' ? 'ready' : state.status, slow: false });
    }
  };
  const onErr = (e: { code: string }) => {
    clearTimeout(timer);
    setState({ status: 'error', slow: false });
    console.error('db', e);
  };
  drinksCol.onSnapshot((s) => {
    setState({ drinks: s.docs.map((d) => ({ ...(d.data() as object), id: d.id }) as Drink) });
    if (!s.metadata.fromCache) gotD = true;
    done();
  }, onErr);
  tastingsCol.onSnapshot((s) => {
    setState({ tastings: s.docs.map((d) => ({ ...(d.data() as object), id: d.id }) as Tasting) });
    if (!s.metadata.fromCache) gotT = true;
    done();
  }, onErr);
}
init();

export function useStore(): State {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}
export const getState = () => state;

/** undefined 필드는 저장하지 않는다 (JSON 문서) */
function clean<T extends object>(o: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
}

function col(c: ColRef | undefined): ColRef {
  if (!c) throw new Error('Claude에 로그인한 상태에서만 저장할 수 있어요');
  return c;
}

/** 쓰기 실패를 사람이 읽을 말로 */
export function writeErrorMessage(e: unknown): string {
  const code = (e as { code?: string })?.code;
  if (code === 'invalid_argument') {
    setState({ status: 'readOnly' });
    return '이 계정은 이 페이지에 저장할 권한이 없어요';
  }
  if (code === 'quota_exceeded') return '저장 공간이 가득 찼어요';
  if (code === 'resource_exhausted') return '요청이 너무 많아요. 잠시 후 다시 해주세요';
  if (e instanceof Error) return e.message;
  return '저장하지 못했어요. 잠시 후 다시 해주세요';
}

export type DrinkInput = Omit<Drink, 'id' | 'createdAt' | 'updatedAt'>;
export type TastingInput = Omit<Tasting, 'id' | 'drinkId' | 'createdAt' | 'updatedAt'>;

export async function saveDrink(input: DrinkInput, id?: string): Promise<string> {
  const c = col(drinksCol);
  const now = Date.now();
  const prev = id ? state.drinks.find((d) => d.id === id) : undefined;
  const did = id ?? newId();
  await c.doc(did).set(clean({ ...input, createdAt: prev?.createdAt ?? now, updatedAt: now }));
  // 사진을 바꾸거나 뺐으면 예전 파일 정리
  if (prev?.photoId && prev.photoId !== input.photoId) await removePhoto(prev.photoId, prev.thumbId);
  return did;
}

export async function deleteDrink(id: string) {
  const d = state.drinks.find((x) => x.id === id);
  for (const t of state.tastings.filter((t) => t.drinkId === id)) await col(tastingsCol).doc(t.id).delete();
  await col(drinksCol).doc(id).delete();
  if (d?.photoId) await removePhoto(d.photoId, d.thumbId);
}

export async function saveTasting(drinkId: string, input: TastingInput, id?: string): Promise<string> {
  const now = Date.now();
  const prev = id ? state.tastings.find((t) => t.id === id) : undefined;
  const tid = id ?? newId();
  await col(tastingsCol).doc(tid).set(clean({ ...input, drinkId, createdAt: prev?.createdAt ?? now, updatedAt: now }));
  await col(drinksCol).doc(drinkId).update({ updatedAt: now });
  return tid;
}

export async function deleteTasting(id: string) {
  await col(tastingsCol).doc(id).delete();
}

/** 사진을 줄여서 원본/썸네일 두 개로 올린다 */
export async function addPhoto(file: Blob): Promise<{ photoId: string; thumbId: string }> {
  if (!assets) throw new Error('이 화면에서는 사진을 올릴 수 없어요');
  const { blob, thumb } = await processPhoto(file);
  const full = await assets.upload(blob, { type: 'image/jpeg' });
  const small = await assets.upload(thumb, { type: 'image/jpeg' });
  return { photoId: full.id, thumbId: small.id };
}

async function removePhoto(photoId?: string, thumbId?: string) {
  if (!assets) return;
  for (const id of [photoId, thumbId]) if (id) await assets.delete(id).catch(() => {});
}

export function findByBarcode(code: string) {
  return state.drinks.find((d) => d.barcode === code);
}

/* ---------- 백업 ---------- */

export function backupJson(): string {
  return JSON.stringify({
    app: 'sullog',
    version: 2,
    exportedAt: new Date().toISOString(),
    drinks: state.drinks,
    tastings: state.tastings,
  });
}

interface OldPhoto { id: string; data: string; thumb: string }

/**
 * 백업 파일 불러오기. 예전 웹앱(v1) 백업이면 사진도 같이 올린다.
 * 같은 id는 덮어쓰고 나머지는 유지.
 */
export async function importBackup(file: Blob, onProgress?: (msg: string) => void) {
  const data = JSON.parse(await file.text()) as {
    app?: string;
    drinks?: (Drink & { photoId?: string })[];
    tastings?: Tasting[];
    photos?: OldPhoto[];
  };
  if (data.app !== 'sullog' || !Array.isArray(data.drinks)) throw new Error('술로그 백업 파일이 아니에요');
  const photos = new Map((data.photos ?? []).map((p) => [p.id, p]));
  let n = 0;
  for (const d of data.drinks) {
    onProgress?.(`술 ${++n}/${data.drinks.length} 불러오는 중…`);
    const rec: Record<string, unknown> = { ...d };
    delete rec.id;
    const old = d.photoId ? photos.get(d.photoId) : undefined;
    if (old && assets) {
      const up = await addPhoto(await dataUrlToBlob(old.data));
      rec.photoId = up.photoId;
      rec.thumbId = up.thumbId;
    } else if (old) {
      delete rec.photoId;
    }
    await col(drinksCol).doc(d.id).set(clean(rec));
  }
  for (const t of data.tastings ?? []) {
    const rec: Record<string, unknown> = { ...t };
    delete rec.id;
    await col(tastingsCol).doc(t.id).set(clean(rec));
  }
  return { drinks: data.drinks.length, tastings: (data.tastings ?? []).length };
}
