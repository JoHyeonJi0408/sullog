import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { categoryOf, type CategoryId } from '../types';
import { addPhoto, deleteDrink, saveDrink, saveTasting } from '../repo';
import { back, go } from '../router';
import { CategoryPicker, Field, TopBar, useBlobUrl, usePhotoUrl } from '../components/ui';
import { TastingFields, isTastingEmpty, type TastingDraft } from '../components/TastingFields';
import { optNum, optStr, today } from '../util';

interface Draft {
  name: string;
  category: CategoryId | '';
  subtype: string;
  producer: string;
  origin: string;
  abv: string;
  vintage: string;
  volumeMl: string;
  price: string;
  purchasedFrom: string;
  barcode: string;
  memo: string;
}

const emptyDraft: Draft = { name: '', category: '', subtype: '', producer: '', origin: '', abv: '', vintage: '', volumeMl: '', price: '', purchasedFrom: '', barcode: '', memo: '' };
const emptyTasting = (): TastingDraft => ({ date: today(), nose: '', palate: '', finish: '', pairing: '', memo: '' });

const s = (v: unknown) => (v == null ? '' : String(v));

export function DrinkFormScreen({ id }: { id?: string }) {
  const editing = !!id;
  const existing = useLiveQuery(() => (id ? db.drinks.get(id) : undefined), [id]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [loaded, setLoaded] = useState(!editing);
  const [photoId, setPhotoId] = useState<string>();
  const [newPhoto, setNewPhoto] = useState<File>();
  const [withTasting, setWithTasting] = useState(true);
  const [tasting, setTasting] = useState<TastingDraft>(emptyTasting);
  const [more, setMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!existing || loaded) return;
    setDraft({
      name: existing.name,
      category: existing.category,
      subtype: s(existing.subtype),
      producer: s(existing.producer),
      origin: s(existing.origin),
      abv: s(existing.abv),
      vintage: s(existing.vintage),
      volumeMl: s(existing.volumeMl),
      price: s(existing.price),
      purchasedFrom: s(existing.purchasedFrom),
      barcode: s(existing.barcode),
      memo: s(existing.memo),
    });
    setPhotoId(existing.photoId);
    setMore(!!(existing.vintage || existing.volumeMl || existing.price || existing.purchasedFrom || existing.barcode));
    setLoaded(true);
  }, [existing, loaded]);

  const savedPhotoUrl = usePhotoUrl(newPhoto ? undefined : photoId, 'blob');
  const newPhotoUrl = useBlobUrl(newPhoto);
  const photoUrl = newPhotoUrl ?? savedPhotoUrl;

  // 새로 기록할 때 이미 있는 술과 이름이 겹치면 알려주기
  const allDrinks = useLiveQuery(() => (editing ? [] : db.drinks.toArray()), [editing]);
  const similar = useMemo(() => {
    const n = draft.name.trim().toLowerCase();
    if (editing || n.length < 2 || !allDrinks) return [];
    return allDrinks.filter((d) => d.name.toLowerCase().includes(n)).slice(0, 3);
  }, [draft.name, allDrinks, editing]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  async function onSave() {
    setError('');
    if (!draft.name.trim()) return setError('이름을 입력해주세요');
    if (!draft.category) return setError('종류를 골라주세요');
    setSaving(true);
    try {
      const pid = newPhoto ? await addPhoto(newPhoto) : photoId;
      const did = await saveDrink(
        {
          name: draft.name.trim(),
          category: draft.category,
          subtype: optStr(draft.subtype),
          producer: optStr(draft.producer),
          origin: optStr(draft.origin),
          abv: optNum(draft.abv),
          vintage: optStr(draft.vintage),
          volumeMl: optNum(draft.volumeMl),
          price: optNum(draft.price),
          purchasedFrom: optStr(draft.purchasedFrom),
          barcode: optStr(draft.barcode),
          memo: optStr(draft.memo),
          photoId: pid,
        },
        id,
      );
      if (!editing && withTasting && !isTastingEmpty(tasting)) {
        await saveTasting(did, {
          date: tasting.date || today(),
          rating: tasting.rating,
          nose: optStr(tasting.nose),
          palate: optStr(tasting.palate),
          finish: optStr(tasting.finish),
          pairing: optStr(tasting.pairing),
          memo: optStr(tasting.memo),
        });
      }
      if (editing) back('/d/' + did);
      else go('/d/' + did, true);
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장하지 못했어요');
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!id || !existing) return;
    if (!confirm(`'${existing.name}'과(와) 테이스팅 기록을 모두 삭제할까요?\n되돌릴 수 없어요.`)) return;
    await deleteDrink(id);
    go('/', true);
  }

  if (editing && !loaded) return <div className="screen"><TopBar onBack title="편집" /></div>;

  return (
    <div className="screen">
      <TopBar
        onBack
        title={editing ? '술 정보 편집' : '새 기록'}
        right={
          <button className="text-btn strong" onClick={onSave} disabled={saving}>
            저장
          </button>
        }
      />

      <div className="form">
        <button type="button" className={'photo-pick' + (photoUrl ? ' has' : '')} onClick={() => fileRef.current?.click()}>
          {photoUrl ? (
            <img src={photoUrl} alt="술 사진" />
          ) : (
            <span>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
              사진 찍기 / 고르기
            </span>
          )}
        </button>
        {photoUrl && (
          <div className="photo-actions">
            <button type="button" className="text-btn" onClick={() => fileRef.current?.click()}>사진 바꾸기</button>
            <button type="button" className="text-btn danger" onClick={() => { setNewPhoto(undefined); setPhotoId(undefined); }}>사진 빼기</button>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setNewPhoto(f);
            e.target.value = '';
          }}
        />

        <Field label="이름 *">
          <input placeholder="예) 글렌피딕 12년" value={draft.name} onChange={(e) => set('name', e.target.value)} />
        </Field>
        {similar.length > 0 && (
          <div className="similar">
            <span>이미 기록한 술이 있어요. 다시 마셨다면 여기에 추가하세요:</span>
            {similar.map((d) => (
              <button key={d.id} type="button" onClick={() => go(`/d/${d.id}/t/new`, true)}>
                {d.name} <em>{categoryOf(d.category).label}</em> →
              </button>
            ))}
          </div>
        )}

        <div className="field">
          <span className="field-label">종류 *</span>
          <CategoryPicker value={draft.category} onChange={(v) => set('category', v)} />
        </div>

        <div className="row2">
          <Field label="세부 종류">
            <input placeholder="버번, 준마이, IPA…" value={draft.subtype} onChange={(e) => set('subtype', e.target.value)} />
          </Field>
          <Field label="도수 (%)">
            <input inputMode="decimal" placeholder="40" value={draft.abv} onChange={(e) => set('abv', e.target.value)} />
          </Field>
        </div>
        <div className="row2">
          <Field label="생산자">
            <input placeholder="양조장, 증류소, 와이너리" value={draft.producer} onChange={(e) => set('producer', e.target.value)} />
          </Field>
          <Field label="생산지">
            <input placeholder="스코틀랜드, 전남 해남" value={draft.origin} onChange={(e) => set('origin', e.target.value)} />
          </Field>
        </div>

        {!more ? (
          <button type="button" className="text-btn more" onClick={() => setMore(true)}>
            + 빈티지, 용량, 가격, 구매처, 바코드
          </button>
        ) : (
          <>
            <div className="row2">
              <Field label="빈티지 / 숙성">
                <input placeholder="2019, 12년" value={draft.vintage} onChange={(e) => set('vintage', e.target.value)} />
              </Field>
              <Field label="용량 (ml)">
                <input inputMode="numeric" placeholder="700" value={draft.volumeMl} onChange={(e) => set('volumeMl', e.target.value)} />
              </Field>
            </div>
            <div className="row2">
              <Field label="가격 (원)">
                <input inputMode="numeric" placeholder="65000" value={draft.price} onChange={(e) => set('price', e.target.value)} />
              </Field>
              <Field label="구매처">
                <input placeholder="데일리샷, 코스트코" value={draft.purchasedFrom} onChange={(e) => set('purchasedFrom', e.target.value)} />
              </Field>
            </div>
            <Field label="바코드">
              <input inputMode="numeric" placeholder="숫자 입력 (스캔은 다음 단계에서)" value={draft.barcode} onChange={(e) => set('barcode', e.target.value)} />
            </Field>
          </>
        )}

        <Field label="술 메모">
          <textarea rows={2} placeholder="이 술 자체에 대한 메모 (선물받음, 한정판 등)" value={draft.memo} onChange={(e) => set('memo', e.target.value)} />
        </Field>

        {!editing && (
          <section className="tasting-section">
            <label className="toggle">
              <input type="checkbox" checked={withTasting} onChange={(e) => setWithTasting(e.target.checked)} />
              <span>테이스팅 노트도 같이 쓰기</span>
            </label>
            {withTasting && <TastingFields value={tasting} onChange={setTasting} />}
          </section>
        )}

        {error && <p className="error">{error}</p>}

        <button className="btn primary block" onClick={onSave} disabled={saving}>
          {saving ? '저장 중…' : '저장'}
        </button>
        {editing && (
          <button className="btn danger block" onClick={onDelete}>
            이 술 삭제
          </button>
        )}
      </div>
    </div>
  );
}
