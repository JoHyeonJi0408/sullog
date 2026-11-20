import { useEffect, useMemo, useRef, useState } from 'react';
import { categoryOf, type CategoryId, type Drink } from '../types';
import { addPhoto, deleteDrink, findByBarcode, saveDrink, saveTasting, useStore, writeErrorMessage } from '../repo';
import { back, go } from '../router';
import { CategoryPicker, ConfirmButton, Field, StoredImg, TopBar, useBlobUrl } from '../components/ui';
import { TastingFields, emptyTasting, isTastingEmpty, tastingInput, type TastingDraft } from '../components/TastingFields';
import { extractFromLabel, canReadPhotos, AiError, type LabelGuess } from '../lib/ai';
import { readBarcode } from '../lib/barcode';
import { optNum, optStr } from '../util';

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
const s = (v: unknown) => (v == null ? '' : String(v));

function draftOf(d: Drink): Draft {
  return {
    name: d.name,
    category: d.category,
    subtype: s(d.subtype),
    producer: s(d.producer),
    origin: s(d.origin),
    abv: s(d.abv),
    vintage: s(d.vintage),
    volumeMl: s(d.volumeMl),
    price: s(d.price),
    purchasedFrom: s(d.purchasedFrom),
    barcode: s(d.barcode),
    memo: s(d.memo),
  };
}

type AiState = { state: 'idle' | 'reading' | 'done' | 'error'; msg?: string };

export function DrinkFormScreen({ id, initialBarcode }: { id?: string; initialBarcode?: string }) {
  const editing = !!id;
  const { drinks, canPhoto } = useStore();
  const existing = id ? drinks.find((d) => d.id === id) : undefined;

  const [draft, setDraft] = useState<Draft>(() => (existing ? draftOf(existing) : { ...emptyDraft, barcode: initialBarcode ?? '' }));
  const [photo, setPhoto] = useState<{ photoId?: string; thumbId?: string }>(() => ({ photoId: existing?.photoId, thumbId: existing?.thumbId }));
  const [newPhoto, setNewPhoto] = useState<File>();
  const [withTasting, setWithTasting] = useState(true);
  const [tasting, setTasting] = useState<TastingDraft>(emptyTasting);
  const [more, setMore] = useState(() => !!initialBarcode || !!(existing && (existing.vintage || existing.volumeMl || existing.price || existing.purchasedFrom || existing.barcode)));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ai, setAi] = useState<AiState>({ state: 'idle' });
  const [aiOk, setAiOk] = useState(false);
  const [aiFilled, setAiFilled] = useState<Set<keyof Draft>>(new Set());
  const [barcodeMatch, setBarcodeMatch] = useState<Drink>();
  const fileRef = useRef<HTMLInputElement>(null);
  const aiCtl = useRef<AbortController>();
  const draftRef = useRef(draft);
  draftRef.current = draft;

  useEffect(() => {
    canReadPhotos().then(setAiOk);
    return () => aiCtl.current?.abort();
  }, []);

  const newPhotoUrl = useBlobUrl(newPhoto);
  const hasPhoto = !!newPhoto || !!photo.photoId;

  const similar = useMemo(() => {
    const n = draft.name.trim().toLowerCase();
    if (editing || n.length < 2) return [];
    return drinks.filter((d) => d.name.toLowerCase().includes(n)).slice(0, 3);
  }, [draft.name, drinks, editing]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
    if (aiFilled.has(k)) setAiFilled((st) => new Set([...st].filter((x) => x !== k)));
  };

  function onPhotoPicked(f: File) {
    setNewPhoto(f);
    // 바코드: 기기에서 바로 읽음
    readBarcode(f).then((code) => code && applyBarcode(code));
    // 라벨: 새 기록이면 바로 Claude가 읽음
    if (!editing && aiOk) runAi(f);
  }

  function applyBarcode(code: string) {
    setDraft((d) => (d.barcode ? d : { ...d, barcode: code }));
    setMore(true);
    if (!editing) setBarcodeMatch(findByBarcode(code));
  }

  async function runAi(src?: Blob) {
    const img = src ?? newPhoto;
    if (!img) return;
    aiCtl.current?.abort();
    const ctl = new AbortController();
    aiCtl.current = ctl;
    setAi({ state: 'reading' });
    try {
      const g = await extractFromLabel(img, ctl.signal);
      if (!g.isDrink) return setAi({ state: 'error', msg: '사진에서 술을 찾지 못했어요' });
      const n = applyGuess(g);
      if (g.barcode) applyBarcode(g.barcode);
      setAi({ state: 'done', msg: n > 0 ? `Claude가 ${n}개 칸을 채웠어요. 맞는지 확인해주세요` : '새로 채울 칸이 없었어요' });
    } catch (e) {
      if (ctl.signal.aborted) return;
      if (e instanceof AiError && e.hide) setAiOk(false);
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
    const cur = draftRef.current;
    const keys = (Object.keys(vals) as (keyof Draft)[]).filter((k) => vals[k] && !String(cur[k]).trim());
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
      const ph = newPhoto ? await addPhoto(newPhoto) : photo;
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
          photoId: ph.photoId,
          thumbId: ph.thumbId,
        },
        id,
      );
      if (!editing && withTasting && !isTastingEmpty(tasting)) {
        await saveTasting(did, tastingInput(tasting));
      }
      if (editing) back('/d/' + did);
      else go('/d/' + did, true);
    } catch (e) {
      setError(writeErrorMessage(e));
      setSaving(false);
    }
  }

  if (editing && !existing)
    return (
      <div className="screen">
        <TopBar onBack title="편집" />
      </div>
    );

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
        {canPhoto && (
          <>
            <button type="button" className={'photo-pick' + (hasPhoto ? ' has' : '')} onClick={() => fileRef.current?.click()}>
              {newPhotoUrl ? (
                <img src={newPhotoUrl} alt="술 사진" />
              ) : photo.photoId ? (
                <StoredImg id={photo.photoId} alt="술 사진" />
              ) : (
                <span>
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
                  라벨 사진 찍기 / 고르기
                  {aiOk && !editing && <em>찍으면 Claude가 정보를 채워줘요</em>}
                </span>
              )}
            </button>
            {hasPhoto && (
              <div className="photo-actions">
                <button type="button" className="text-btn" onClick={() => fileRef.current?.click()}>
                  사진 바꾸기
                </button>
                <button
                  type="button"
                  className="text-btn danger"
                  onClick={() => {
                    setNewPhoto(undefined);
                    setPhoto({});
                  }}
                >
                  사진 빼기
                </button>
              </div>
            )}
            {newPhoto && aiOk && (
              <div className={'ai-bar ' + ai.state}>
                {ai.state === 'reading' ? (
                  <>
                    <span className="ai-reading">
                      <i className="spinner" />
                      Claude가 라벨을 읽는 중…
                    </span>
                    <button type="button" className="text-btn" onClick={() => { aiCtl.current?.abort(); setAi({ state: 'idle' }); }}>
                      멈추기
                    </button>
                  </>
                ) : (
                  <>
                    {ai.msg && <span>{ai.msg}</span>}
                    <button type="button" className="text-btn strong" onClick={() => runAi()}>
                      {ai.state === 'idle' ? '✦ Claude로 정보 채우기' : '다시 읽기'}
                    </button>
                  </>
                )}
              </div>
            )}
            <input
              id="photo-input"
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
          </>
        )}

        {barcodeMatch && (
          <div className="similar">
            <span>이 바코드로 이미 기록한 술이 있어요:</span>
            <button type="button" onClick={() => go(`/d/${barcodeMatch.id}/t/new`, true)}>
              {barcodeMatch.name} <em>노트만 추가하기</em> →
            </button>
          </div>
        )}

        <Field label="이름 *">
          <input id="f-name" className={filledCls('name')} placeholder="예) 글렌피딕 12년" value={draft.name} onChange={(e) => set('name', e.target.value)} />
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
          <div className={filledCls('category')}>
            <CategoryPicker value={draft.category} onChange={(v) => set('category', v)} />
          </div>
        </div>

        <div className="row2">
          <Field label="세부 종류">
            <input id="f-subtype" className={filledCls('subtype')} placeholder="버번, 준마이, IPA…" value={draft.subtype} onChange={(e) => set('subtype', e.target.value)} />
          </Field>
          <Field label="도수 (%)">
            <input id="f-abv" className={filledCls('abv')} inputMode="decimal" placeholder="40" value={draft.abv} onChange={(e) => set('abv', e.target.value)} />
          </Field>
        </div>
        <div className="row2">
          <Field label="생산자">
            <input id="f-producer" className={filledCls('producer')} placeholder="양조장, 증류소, 와이너리" value={draft.producer} onChange={(e) => set('producer', e.target.value)} />
          </Field>
          <Field label="생산지">
            <input id="f-origin" className={filledCls('origin')} placeholder="스코틀랜드, 전남 해남" value={draft.origin} onChange={(e) => set('origin', e.target.value)} />
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
                <input id="f-vintage" className={filledCls('vintage')} placeholder="2019, 12년" value={draft.vintage} onChange={(e) => set('vintage', e.target.value)} />
              </Field>
              <Field label="용량 (ml)">
                <input id="f-volume" className={filledCls('volumeMl')} inputMode="numeric" placeholder="700" value={draft.volumeMl} onChange={(e) => set('volumeMl', e.target.value)} />
              </Field>
            </div>
            <div className="row2">
              <Field label="가격 (원)">
                <input id="f-price" inputMode="numeric" placeholder="65000" value={draft.price} onChange={(e) => set('price', e.target.value)} />
              </Field>
              <Field label="구매처">
                <input id="f-shop" placeholder="데일리샷, 코스트코" value={draft.purchasedFrom} onChange={(e) => set('purchasedFrom', e.target.value)} />
              </Field>
            </div>
            <Field label="바코드">
              <input id="f-barcode" inputMode="numeric" placeholder="사진에 바코드가 있으면 자동으로 채워져요" value={draft.barcode} onChange={(e) => set('barcode', e.target.value)} />
            </Field>
          </>
        )}

        <Field label="술 메모">
          <textarea id="f-memo" rows={2} placeholder="이 술 자체에 대한 메모 (선물받음, 한정판 등)" value={draft.memo} onChange={(e) => set('memo', e.target.value)} />
        </Field>

        {!editing && (
          <section className="tasting-section">
            <label className="toggle">
              <input id="f-with-tasting" type="checkbox" checked={withTasting} onChange={(e) => setWithTasting(e.target.checked)} />
              <span>테이스팅 노트도 같이 쓰기</span>
            </label>
            {withTasting && <TastingFields value={tasting} onChange={setTasting} category={draft.category} />}
          </section>
        )}

        {error && <p className="error">{error}</p>}

        <button className="btn primary block" onClick={onSave} disabled={saving}>
          {saving ? '저장 중…' : '저장'}
        </button>
        {editing && existing && (
          <ConfirmButton
            label="이 술 삭제"
            question={`'${existing.name}'과(와) 테이스팅 노트를 모두 삭제할까요? 되돌릴 수 없어요.`}
            confirmLabel="모두 삭제"
            onConfirm={async () => {
              await deleteDrink(existing.id);
              stackHome();
            }}
          />
        )}
      </div>
    </div>
  );
}

function stackHome() {
  back('/');
  back('/');
}
