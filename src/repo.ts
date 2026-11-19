/**
 * 데이터 접근은 전부 이 파일을 거친다.
 * 나중에 지인과 공유(서버 동기화)를 붙일 때 이 파일의 구현만 바꾸면 된다.
 */
import { db } from './db';
import type { Drink, Photo, Tasting } from './types';
import { newId } from './util';
import { blobToDataUrl, dataUrlToBlob, processPhoto } from './photo';

export type DrinkInput = Omit<Drink, 'id' | 'createdAt' | 'updatedAt'>;
export type TastingInput = Omit<Tasting, 'id' | 'drinkId' | 'createdAt' | 'updatedAt'>;

export async function saveDrink(input: DrinkInput, id?: string): Promise<string> {
  const now = Date.now();
  if (id) {
    const prev = await db.drinks.get(id);
    if (!prev) throw new Error('없는 기록입니다');
    if (prev.photoId && prev.photoId !== input.photoId) await db.photos.delete(prev.photoId);
    await db.drinks.put({ ...input, id, createdAt: prev.createdAt, updatedAt: now });
    return id;
  }
  const nid = newId();
  await db.drinks.add({ ...input, id: nid, createdAt: now, updatedAt: now });
  return nid;
}

export async function deleteDrink(id: string) {
  await db.transaction('rw', db.drinks, db.tastings, db.photos, async () => {
    const d = await db.drinks.get(id);
    if (d?.photoId) await db.photos.delete(d.photoId);
    await db.tastings.where('drinkId').equals(id).delete();
    await db.drinks.delete(id);
  });
}

export async function saveTasting(drinkId: string, input: TastingInput, id?: string): Promise<string> {
  const now = Date.now();
  const prev = id ? await db.tastings.get(id) : undefined;
  const tid = id ?? newId();
  await db.tastings.put({ ...input, id: tid, drinkId, createdAt: prev?.createdAt ?? now, updatedAt: now });
  await db.drinks.update(drinkId, { updatedAt: now });
  return tid;
}

export async function deleteTasting(id: string) {
  await db.tastings.delete(id);
}

export async function addPhoto(file: Blob): Promise<string> {
  const { blob, thumb } = await processPhoto(file);
  const id = newId();
  await db.photos.add({ id, blob, thumb });
  return id;
}

export async function findByBarcode(code: string) {
  return db.drinks.where('barcode').equals(code).first();
}

/* ---------- 백업 ---------- */

interface BackupFile {
  app: 'sullog';
  version: 1;
  exportedAt: string;
  drinks: Drink[];
  tastings: Tasting[];
  photos: { id: string; data: string; thumb: string }[];
}

export async function exportBackup(): Promise<Blob> {
  const [drinks, tastings, photos] = await Promise.all([
    db.drinks.toArray(),
    db.tastings.toArray(),
    db.photos.toArray(),
  ]);
  const file: BackupFile = {
    app: 'sullog',
    version: 1,
    exportedAt: new Date().toISOString(),
    drinks,
    tastings,
    photos: await Promise.all(
      photos.map(async (p) => ({ id: p.id, data: await blobToDataUrl(p.blob), thumb: await blobToDataUrl(p.thumb) })),
    ),
  };
  return new Blob([JSON.stringify(file)], { type: 'application/json' });
}

/** 같은 id는 백업 내용으로 덮어쓰고, 나머지는 유지(병합) */
export async function importBackup(file: Blob): Promise<{ drinks: number; tastings: number }> {
  const data = JSON.parse(await file.text()) as BackupFile;
  if (data.app !== 'sullog' || !Array.isArray(data.drinks)) throw new Error('술로그 백업 파일이 아닙니다');
  const photos: Photo[] = await Promise.all(
    (data.photos ?? []).map(async (p) => ({ id: p.id, blob: await dataUrlToBlob(p.data), thumb: await dataUrlToBlob(p.thumb) })),
  );
  await db.transaction('rw', db.drinks, db.tastings, db.photos, async () => {
    await db.photos.bulkPut(photos);
    await db.drinks.bulkPut(data.drinks);
    await db.tastings.bulkPut(data.tastings ?? []);
  });
  return { drinks: data.drinks.length, tastings: (data.tastings ?? []).length };
}
