import { useEffect, useState, type ReactNode } from 'react';
import { CATEGORIES, blobUrl, categoryOf, type CategoryId } from '../types';
import { back } from '../router';
import { CategoryIcon } from './icons';

export function TopBar({ title, onBack, right }: { title?: string; onBack?: (() => void) | true; right?: ReactNode }) {
  return (
    <header className="topbar">
      <div className="topbar-side">
        {onBack && (
          <button className="icon-btn" aria-label="뒤로" onClick={() => (onBack === true ? back() : onBack())}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
        )}
      </div>
      <h1 className="topbar-title">{title}</h1>
      <div className="topbar-side right">{right}</div>
    </header>
  );
}

export function useBlobUrl(blob: Blob | undefined) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!blob) return setUrl(undefined);
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}

/** 저장된 사진. 불러오지 못하면 대체 표시 */
export function StoredImg({ id, alt = '', className }: { id?: string; alt?: string; className?: string }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [id]);
  if (!id || broken) return null;
  return <img className={className} src={blobUrl(id)} alt={alt} onError={() => setBroken(true)} />;
}

export function Thumb({ thumbId, category, size = 56 }: { thumbId?: string; category: string; size?: number }) {
  const c = categoryOf(category);
  const [broken, setBroken] = useState(false);
  return (
    <div className="thumb" style={{ width: size, height: size, ['--cat' as string]: c.color }}>
      {thumbId && !broken ? <img src={blobUrl(thumbId)} alt="" onError={() => setBroken(true)} /> : <CategoryIcon id={c.id} size={Math.round(size * 0.5)} />}
    </div>
  );
}

export function CategoryPill({ category }: { category: string }) {
  const c = categoryOf(category);
  return (
    <span className="pill" style={{ ['--cat' as string]: c.color }}>
      <CategoryIcon id={c.id} size={15} strokeWidth={2} />
      {c.label}
    </span>
  );
}

export function CategoryPicker({ value, onChange }: { value: CategoryId | ''; onChange: (v: CategoryId) => void }) {
  return (
    <div className="chips wrap">
      {CATEGORIES.map((c) => (
        <button
          key={c.id}
          type="button"
          className={'chip' + (value === c.id ? ' on' : '')}
          style={{ ['--cat' as string]: c.color }}
          onClick={() => onChange(c.id)}
        >
          <CategoryIcon id={c.id} size={16} strokeWidth={2} />
          {c.label}
        </button>
      ))}
    </div>
  );
}

const STAR = 'M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z';

function StarIcon({ fill, size }: { fill: 0 | 0.5 | 1; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="star" aria-hidden="true">
      <path d={STAR} className="star-bg" />
      {fill > 0 && <path d={STAR} className="star-fg" style={fill === 0.5 ? { clipPath: 'inset(0 50% 0 0)' } : undefined} />}
    </svg>
  );
}

export function Stars({ value, size = 14 }: { value?: number; size?: number }) {
  if (value == null) return null;
  return (
    <span className="stars" aria-label={`별점 ${value}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon key={i} size={size} fill={value >= i ? 1 : value >= i - 0.5 ? 0.5 : 0} />
      ))}
    </span>
  );
}

export function StarInput({ value, onChange }: { value?: number; onChange: (v: number | undefined) => void }) {
  return (
    <div className="star-input">
      {[1, 2, 3, 4, 5].map((i) => {
        const v = value ?? 0;
        return (
          <button
            key={i}
            type="button"
            aria-label={`${i}점`}
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              const next = e.clientX - r.left < r.width / 2 ? i - 0.5 : i;
              onChange(next === value ? undefined : next);
            }}
          >
            <StarIcon size={34} fill={v >= i ? 1 : v >= i - 0.5 ? 0.5 : 0} />
          </button>
        );
      })}
      <span className="star-value">{value != null ? value.toFixed(1) : '–'}</span>
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

/** 삭제처럼 되돌릴 수 없는 동작: 한 번 더 확인하는 버튼 (브라우저 confirm 창 대신) */
export function ConfirmButton({ label, question, confirmLabel, onConfirm }: { label: string; question: string; confirmLabel: string; onConfirm: () => Promise<void> | void }) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!asking)
    return (
      <button className="btn danger block" onClick={() => setAsking(true)}>
        {label}
      </button>
    );
  return (
    <div className="confirm-box" role="alertdialog" aria-label={question}>
      <p>{question}</p>
      <div className="btn-row">
        <button className="btn" onClick={() => setAsking(false)} disabled={busy}>
          취소
        </button>
        <button
          className="btn solid-danger"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm();
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? '삭제 중…' : confirmLabel}
        </button>
      </div>
    </div>
  );
}

/** 화면 아래에 잠깐 뜨는 안내 */
export function Toast({ msg, onDone }: { msg?: string; onDone: () => void }) {
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [msg, onDone]);
  if (!msg) return null;
  return (
    <div className="toast" role="status">
      {msg}
    </div>
  );
}
