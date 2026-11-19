import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { deleteTasting, saveTasting } from '../repo';
import { back } from '../router';
import { TopBar } from '../components/ui';
import { TastingFields, isTastingEmpty, type TastingDraft } from '../components/TastingFields';
import { optStr, today } from '../util';

export function TastingScreen({ drinkId, tastingId }: { drinkId: string; tastingId?: string }) {
  const drink = useLiveQuery(() => db.drinks.get(drinkId), [drinkId]);
  const existing = useLiveQuery(() => (tastingId ? db.tastings.get(tastingId) : undefined), [tastingId]);
  const [t, setT] = useState<TastingDraft>({ date: today(), nose: '', palate: '', finish: '', pairing: '', memo: '' });
  const [loaded, setLoaded] = useState(!tastingId);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!existing || loaded) return;
    setT({
      date: existing.date,
      rating: existing.rating,
      nose: existing.nose ?? '',
      palate: existing.palate ?? '',
      finish: existing.finish ?? '',
      pairing: existing.pairing ?? '',
      memo: existing.memo ?? '',
    });
    setLoaded(true);
  }, [existing, loaded]);

  async function onSave() {
    if (isTastingEmpty(t)) return setError('별점이나 노트를 하나 이상 적어주세요');
    setSaving(true);
    await saveTasting(
      drinkId,
      {
        date: t.date || today(),
        rating: t.rating,
        nose: optStr(t.nose),
        palate: optStr(t.palate),
        finish: optStr(t.finish),
        pairing: optStr(t.pairing),
        memo: optStr(t.memo),
      },
      tastingId,
    );
    back('/d/' + drinkId);
  }

  async function onDelete() {
    if (!tastingId || !confirm('이 테이스팅 노트를 삭제할까요?')) return;
    await deleteTasting(tastingId);
    back('/d/' + drinkId);
  }

  return (
    <div className="screen">
      <TopBar
        onBack
        title={tastingId ? '노트 편집' : '테이스팅 노트'}
        right={
          <button className="text-btn strong" onClick={onSave} disabled={saving || !loaded}>
            저장
          </button>
        }
      />
      {drink && <p className="form-context">{drink.name}</p>}
      {loaded && (
        <div className="form">
          <TastingFields value={t} onChange={setT} />
          {error && <p className="error">{error}</p>}
          <button className="btn primary block" onClick={onSave} disabled={saving}>
            {saving ? '저장 중…' : '저장'}
          </button>
          {tastingId && (
            <button className="btn danger block" onClick={onDelete}>
              이 노트 삭제
            </button>
          )}
        </div>
      )}
    </div>
  );
}
