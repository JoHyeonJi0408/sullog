import { Field, StarInput } from './ui';

export interface TastingDraft {
  date: string;
  rating?: number;
  nose: string;
  palate: string;
  finish: string;
  pairing: string;
  memo: string;
}

export function isTastingEmpty(t: TastingDraft) {
  return t.rating == null && !t.nose.trim() && !t.palate.trim() && !t.finish.trim() && !t.pairing.trim() && !t.memo.trim();
}

export function TastingFields({ value, onChange }: { value: TastingDraft; onChange: (v: TastingDraft) => void }) {
  const set = <K extends keyof TastingDraft>(k: K, v: TastingDraft[K]) => onChange({ ...value, [k]: v });
  return (
    <>
      <div className="row2">
        <Field label="날짜">
          <input type="date" value={value.date} onChange={(e) => set('date', e.target.value)} />
        </Field>
      </div>
      <div className="field">
        <span className="field-label">별점</span>
        <StarInput value={value.rating} onChange={(v) => set('rating', v)} />
        <span className="field-hint">별의 왼쪽 절반을 누르면 0.5점, 같은 점수를 다시 누르면 지워져요</span>
      </div>
      <Field label="향">
        <textarea rows={2} placeholder="예) 바닐라, 건포도, 은은한 스모키" value={value.nose} onChange={(e) => set('nose', e.target.value)} />
      </Field>
      <Field label="맛">
        <textarea rows={2} placeholder="예) 달콤하게 시작해서 스파이시하게" value={value.palate} onChange={(e) => set('palate', e.target.value)} />
      </Field>
      <Field label="여운">
        <textarea rows={2} placeholder="예) 길고 따뜻함" value={value.finish} onChange={(e) => set('finish', e.target.value)} />
      </Field>
      <Field label="같이 먹은 음식">
        <input placeholder="예) 회, 치즈" value={value.pairing} onChange={(e) => set('pairing', e.target.value)} />
      </Field>
      <Field label="메모">
        <textarea rows={3} placeholder="그날의 기분, 장소, 함께한 사람…" value={value.memo} onChange={(e) => set('memo', e.target.value)} />
      </Field>
    </>
  );
}
