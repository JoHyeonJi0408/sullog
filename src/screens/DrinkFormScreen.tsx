import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { categoryOf, type CategoryId } from '../types';
import { addPhoto, deleteDrink, findByBarcode, saveDrink, saveTasting } from '../repo';
import type { Drink } from '../types';
import { extractFromLabel, AiError, type LabelGuess } from '../lib/ai';
import { readBarcode } from '../lib/barcode';
import { getApiKey } from '../lib/settings';
import { processPhoto } from '../photo';
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

export function DrinkFormScreen({ id, initialBarcode }: { id?: string; initialBarcode?: string }) {
  const editing = !!id;
  const existing = useLiveQuery(() => (id ? db.drinks.get(id) : undefined), [id]);
  const [draft, setDraft] = useState<Draft>(() => ({ ...emptyDraft, barcode: initialBarcode ?? '' }));
  const [loaded, setLoaded] = useState(!editing);
  const [photoId, setPhotoId] = useState<string>();
  const [newPhoto, setNewPhoto] = useState<File>();
  const [withTasting, setWithTasting] = useState(true);
  const [tasting, setTasting] = useState<TastingDraft>(emptyTasting);
  const [more, setMore] = useState(!!initialBarcode);
  const [ai, setAi] = useState<{ state: 'idle' | 'reading' | 'done' | 'error'; msg?: string }>({ state: 'idle' });
  const [aiFilled, setAiFilled] = useState<Set<keyof Draft>>(new Set());
  const [barcodeMatch, setBarcodeMatch] = useState<Drink>();
  const hasKey = !!getApiKey();
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

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
    if (aiFilled.has(k)) setAiFilled((s) => new Set([...s].filter((x) => x !== k)));
  };

  async function onPhotoPicked(f: File) {
    setNewPhoto(f);
    // 1) 바코드: 이 기기에서 바로 읽음 (인터넷 불필요)
    readBarcode(f)
      .then(async (code) => {
        if (!code) return;
        setDraft((d) => (d.barcode ? d : { ...d, barcode: code }));
        setMore(true);
        if (!editing) setBarcodeMatch(await findByBarcode(code));
      })
      .catch(() => {});
    // 2) 라벨: 새 기록이고 API 키가 있으면 자동으로 AI가 읽음
    if (!editing && hasKey) runAi(f);
  }

  async function runAi(src?: Blob) {
    const photo = src ?? newPhoto ?? (photoId ? (await db.photos.get(photoId))?.blob : undefined);
    if (!photo) return;
    setAi({ state: 'reading' });
    try {
      const { blob } = await processPhoto(photo);
      const g = await extractFromLabel(blob);
      if (!g.isDrink) return setAi({ state: 'error', msg: '사진에서 술을 찾지 못했어요' });
      const n = applyGuess(g);
      setAi({ state: 'done', msg: n > 0 ? `AI가 ${n}개 칸을 채웠어요. 맞는지 확인해주세요` : '새로 채울 칸이 없었어요' });
    } catch (e) {
      setAi({ state: 'error', msg: e instanceof AiError ? e.message : '자동 입력에 실패했어요' });
    }
  }

  /** 비어 있는 칸만 채운다 (직접 쓴 내용은 건드리지 않음) */
  function applyGuess(g: LabelGuess): number {
    const vals: Partial<Draft> = {
      name: g.name ?? '',
      category: (g.category ?? '') as Draft['category'],
      subtype: g.subtype ?? '',
      producer: g.producer ?? '',
      origin: g.origin ?? '',
      abv: g.abv != null ? String(g.abv) : '',
      vintage: g.vintage ?? '',
      volumeMl: g.volumeMl != null ? String(Math.round(g.volumeMl)) : '',
    };
    const keys = (Object.keys(vals) as (keyof Draft)[]).filter((k) => vals[k] && !String(draft[k]).trim());
    if (keys.length === 0) return 0;
    setDraft((d) => {
      const next = { ...d };
      for (const k of keys) if (!String(d[k]).trim()) (next[k] as string) = vals[k] as string;
      return next;
    });
    setAiFilled(new Set(keys));
    if (keys.some((k) => k === 'vintage' || k === 'volumeMl')) setMore(true);
    return keys.length;
  }

  const filledCls = (k: keyof Draft) => (aiFilled.has(k) ? 'ai-filled' : undefined);

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
        {photoUrl && hasKey && (
          <div className={'ai-bar ' + ai.state}>
            {ai.state === 'reading' ? (
              <span className="ai-reading"><i className="spinner" />AI가 라벨을 읽는 중…</span>
            ) : (
              <>
                {ai.msg && <span>{ai.msg}</span>}
                <button type="button" className="text-btn strong" onClick={() => runAi()}>
                  {ai.state === 'idle' ? '✦ AI로 정보 채우기' : '다시 읽기'}
                </button>
              </>
            )}
          </div>
        )}
        {!hasKey && !editing && (
          <p className="hint-line">
            설정에서 Claude API 키를 넣으면 라벨 사진만 찍어도 정보가 자동으로 채워져요. <a href="#/settings">설정으로</a>
          </p>
        )}
        {barcodeMatch && (
          <div className="similar">
            <span>이 바코드로 이미 기록한 술이 있어요:</span>
            <button type="button" onClick={() => go(`/d/${barcodeMatch.id}/t/new`, true)}>
              {barcodeMatch.name} <em>노트만 추가하기</em> →
            </button>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPhotoPicked(f);
            e.target.value = '';
          }}
        />

        <Field label="이름 *">
          <input placeholder="예) 글렌피딕 12년" className={filledCls('name')} value={draft.name} onChange={(e) => set('name', e.target.value)} />
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
          <div className={filledCls('category')}><CategoryPicker value={draft.category} onChange={(v) => set('category', v)} /></div>
        </div>

        <div className="row2">
          <Field label="세부 종류">
            <input placeholder="버번, 준마이, IPA…" className={filledCls('subtype')} value={draft.subtype} onChange={(e) => set('subtype', e.target.value)} />
          </Field>
          <Field label="도수 (%)">
            <input inputMode="decimal" placeholder="40" className={filledCls('abv')} value={draft.abv} onChange={(e) => set('abv', e.target.value)} />
          </Field>
        </div>
        <div className="row2">
          <Field label="생산자">
            <input placeholder="양조장, 증류소, 와이너리" className={filledCls('producer')} value={draft.producer} onChange={(e) => set('producer', e.target.value)} />
          </Field>
          <Field label="생산지">
            <input placeholder="스코틀랜드, 전남 해남" className={filledCls('origin')} value={draft.origin} onChange={(e) => set('origin', e.target.value)} />
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
                <input placeholder="2019, 12년" className={filledCls('vintage')} value={draft.vintage} onChange={(e) => set('vintage', e.target.value)} />
              </Field>
              <Field label="용량 (ml)">
                <input inputMode="numeric" placeholder="700" className={filledCls('volumeMl')} value={draft.volumeMl} onChange={(e) => set('volumeMl', e.target.value)} />
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
