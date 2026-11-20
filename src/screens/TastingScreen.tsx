import { useState } from 'react';
import { deleteTasting, saveTasting, useStore, writeErrorMessage } from '../repo';
import { back } from '../router';
import { ConfirmButton, TopBar } from '../components/ui';
import { TastingFields, draftFromTasting, emptyTasting, isTastingEmpty, tastingInput, type TastingDraft } from '../components/TastingFields';

export function TastingScreen({ drinkId, tastingId }: { drinkId: string; tastingId?: string }) {
  const { drinks, tastings } = useStore();
  const drink = drinks.find((d) => d.id === drinkId);
  const existing = tastingId ? tastings.find((t) => t.id === tastingId) : undefined;
  const [t, setT] = useState<TastingDraft>(() => (existing ? draftFromTasting(existing) : emptyTasting()));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function onSave() {
    if (isTastingEmpty(t)) return setError('별점이나 선택지를 하나 이상 골라주세요');
    setSaving(true);
    setError('');
    try {
      await saveTasting(drinkId, tastingInput(t), tastingId);
      back('/d/' + drinkId);
    } catch (e) {
      setError(writeErrorMessage(e));
      setSaving(false);
    }
  }

  return (
    <div className="screen">
      <TopBar
        onBack
        title={tastingId ? '노트 편집' : '테이스팅 노트'}
        right={
          <button className="text-btn strong" onClick={onSave} disabled={saving}>
            저장
          </button>
        }
      />
      {drink && <p className="form-context">{drink.name}</p>}
      <div className="form">
        <TastingFields value={t} onChange={setT} category={drink?.category ?? ''} />
        {error && <p className="error">{error}</p>}
        <button className="btn primary block" onClick={onSave} disabled={saving}>
          {saving ? '저장 중…' : '저장'}
        </button>
        {tastingId && (
          <ConfirmButton
            label="이 노트 삭제"
            question="이 테이스팅 노트를 삭제할까요? 되돌릴 수 없어요."
            confirmLabel="삭제"
            onConfirm={async () => {
              await deleteTasting(tastingId);
              back('/d/' + drinkId);
            }}
          />
        )}
      </div>
    </div>
  );
}
