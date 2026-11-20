import { useState } from 'react';
import { Field, StarInput } from './ui';
import { SectionIcon } from './icons';
import { TagIcon } from './tagIcons';
import type { Tasting } from '../types';
import { AGAIN, FINISH_LENGTHS, FINISH_TAGS, PAIRING_TAGS, PALATE_TAGS, aromaTags, axesFor, type Profile } from '../vocab';
import { optStr, today } from '../util';
import type { TastingInput } from '../repo';

export interface TastingDraft {
  date: string;
  rating?: number;
  again?: string;
  noseTags: string[];
  palateTags: string[];
  profile: Profile;
  finishLength?: string;
  finishTags: string[];
  pairingTags: string[];
  nose: string;
  palate: string;
  finish: string;
  pairing: string;
  memo: string;
}

export const emptyTasting = (): TastingDraft => ({
  date: today(),
  noseTags: [],
  palateTags: [],
  profile: {},
  finishTags: [],
  pairingTags: [],
  nose: '',
  palate: '',
  finish: '',
  pairing: '',
  memo: '',
});

export function draftFromTasting(t: Tasting): TastingDraft {
  return {
    date: t.date,
    rating: t.rating,
    again: t.again,
    noseTags: t.noseTags ?? [],
    palateTags: t.palateTags ?? [],
    profile: (t.profile ?? {}) as Profile,
    finishLength: t.finishLength,
    finishTags: t.finishTags ?? [],
    pairingTags: t.pairingTags ?? [],
    nose: t.nose ?? '',
    palate: t.palate ?? '',
    finish: t.finish ?? '',
    pairing: t.pairing ?? '',
    memo: t.memo ?? '',
  };
}

const arr = (a: string[]) => (a.length ? a : undefined);

export function tastingInput(t: TastingDraft): TastingInput {
  const profile = Object.fromEntries(Object.entries(t.profile).filter(([, v]) => v != null));
  return {
    date: t.date || today(),
    rating: t.rating,
    again: t.again,
    noseTags: arr(t.noseTags),
    palateTags: arr(t.palateTags),
    profile: Object.keys(profile).length ? profile : undefined,
    finishLength: t.finishLength,
    finishTags: arr(t.finishTags),
    pairingTags: arr(t.pairingTags),
    nose: optStr(t.nose),
    palate: optStr(t.palate),
    finish: optStr(t.finish),
    pairing: optStr(t.pairing),
    memo: optStr(t.memo),
  };
}

export function isTastingEmpty(t: TastingDraft) {
  const i = tastingInput(t);
  return Object.entries(i).every(([k, v]) => k === 'date' || v === undefined);
}

/* ---------- 작은 입력 부품 ---------- */

function TagPicker({ options, value, onChange, label, tone }: { options: string[]; value: string[]; onChange: (v: string[]) => void; label: string; tone: string }) {
  // 종류를 바꿔서 목록에 없는 태그도 고른 상태면 계속 보여준다
  const all = [...options, ...value.filter((v) => !options.includes(v))];
  return (
    <div className={'tag-picker tone-' + tone} role="group" aria-label={label}>
      {all.map((o) => {
        const on = value.includes(o);
        return (
          <button
            key={o}
            type="button"
            className={'tag' + (on ? ' on' : '')}
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((v) => v !== o) : [...value, o])}
          >
            <TagIcon tag={o} />
            {o}
          </button>
        );
      })}
    </div>
  );
}

function OneOf({ options, value, onChange, label }: { options: readonly { id: string; label: string }[]; value?: string; onChange: (v?: string) => void; label: string }) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          className={value === o.id ? 'on' : ''}
          onClick={() => onChange(value === o.id ? undefined : o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Scale({ label, low, high, value, onChange }: { label: string; low: string; high: string; value?: number; onChange: (v?: number) => void }) {
  return (
    <div className="scale">
      <span className="scale-label">{label}</span>
      <div className="scale-dots" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${label} ${n}`}
            className={value != null && n <= value ? 'on' : ''}
            onClick={() => onChange(value === n ? undefined : n)}
          />
        ))}
      </div>
      <span className="scale-ends">
        <span>{low}</span>
        <span>{high}</span>
      </span>
    </div>
  );
}

function MoreText({ id, value, onChange, placeholder }: { id: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  const [open, setOpen] = useState(!!value);
  if (!open && !value)
    return (
      <button type="button" className="text-btn more" onClick={() => setOpen(true)}>
        + 추가 의견 쓰기
      </button>
    );
  return <textarea id={id} rows={2} placeholder={placeholder} value={value} autoFocus={!value} onChange={(e) => onChange(e.target.value)} />;
}

/* ---------- 폼 ---------- */

export function TastingFields({ value, onChange, category }: { value: TastingDraft; onChange: (v: TastingDraft) => void; category: string | '' }) {
  const set = <K extends keyof TastingDraft>(k: K, v: TastingDraft[K]) => onChange({ ...value, [k]: v });
  return (
    <>
      <div className="row2">
        <Field label="날짜">
          <input id="t-date" type="date" value={value.date} onChange={(e) => set('date', e.target.value)} />
        </Field>
      </div>

      <div className="field">
        <span className="field-label">별점</span>
        <StarInput value={value.rating} onChange={(v) => set('rating', v)} />
        <span className="field-hint">별의 왼쪽 절반을 누르면 0.5점, 같은 점수를 다시 누르면 지워져요</span>
      </div>

      <div className="field">
        <span className="field-label">또 마실래요?</span>
        <OneOf label="또 마실래요?" options={AGAIN} value={value.again} onChange={(v) => set('again', v)} />
      </div>

      <section className="note-section tone-nose">
        <h4>
          <span className="sec-icon"><SectionIcon id="nose" /></span>
          향
        </h4>
        <TagPicker tone="nose" label="향" options={aromaTags(category)} value={value.noseTags} onChange={(v) => set('noseTags', v)} />
        <MoreText id="t-nose" value={value.nose} onChange={(v) => set('nose', v)} placeholder="다른 향이나 느낌을 자유롭게" />
      </section>

      <section className="note-section tone-palate">
        <h4>
          <span className="sec-icon"><SectionIcon id="palate" /></span>
          맛
        </h4>
        <div className="scales">
          {axesFor(category).map((a) => (
            <Scale
              key={a.id}
              label={a.label}
              low={a.low}
              high={a.high}
              value={value.profile[a.id]}
              onChange={(v) => set('profile', { ...value.profile, [a.id]: v })}
            />
          ))}
        </div>
        <TagPicker tone="palate" label="맛 느낌" options={PALATE_TAGS} value={value.palateTags} onChange={(v) => set('palateTags', v)} />
        <MoreText id="t-palate" value={value.palate} onChange={(v) => set('palate', v)} placeholder="예) 달게 시작해서 끝에 쌉쌀해짐" />
      </section>

      <section className="note-section tone-finish">
        <h4>
          <span className="sec-icon"><SectionIcon id="finish" /></span>
          여운
        </h4>
        <OneOf label="여운 길이" options={FINISH_LENGTHS} value={value.finishLength} onChange={(v) => set('finishLength', v)} />
        <TagPicker tone="finish" label="여운 느낌" options={FINISH_TAGS} value={value.finishTags} onChange={(v) => set('finishTags', v)} />
        <MoreText id="t-finish" value={value.finish} onChange={(v) => set('finish', v)} placeholder="여운에 대해 더 적고 싶은 것" />
      </section>

      <section className="note-section tone-pairing">
        <h4>
          <span className="sec-icon"><SectionIcon id="pairing" /></span>
          같이 먹은 음식
        </h4>
        <TagPicker tone="pairing" label="같이 먹은 음식" options={PAIRING_TAGS} value={value.pairingTags} onChange={(v) => set('pairingTags', v)} />
        <MoreText id="t-pairing" value={value.pairing} onChange={(v) => set('pairing', v)} placeholder="예) 방어회, 블루치즈" />
      </section>

      <Field label="메모">
        <textarea id="t-memo" rows={3} placeholder="그날의 기분, 장소, 함께한 사람…" value={value.memo} onChange={(e) => set('memo', e.target.value)} />
      </Field>
    </>
  );
}
