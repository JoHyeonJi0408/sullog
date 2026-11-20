import { useEffect, useRef, useState } from 'react';
import { backupJson, importBackup, useStore } from '../repo';
import { TopBar } from '../components/ui';
import { today } from '../util';
import { use } from '../lib/claude';
import { canReadPhotos } from '../lib/ai';

export function SettingsScreen() {
  const { drinks, tastings, status } = useStore();
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [canDownload, setCanDownload] = useState(false);
  const [aiOk, setAiOk] = useState<boolean>();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    use('downloads').then((d) => setCanDownload(!!d));
    canReadPhotos().then(setAiOk);
  }, []);

  async function onExport() {
    setMsg('');
    const d = await use('downloads');
    if (!d) return;
    try {
      const r = await d.save({ filename: `sullog-backup-${today()}.json`, data: new Blob([backupJson()], { type: 'application/json' }) });
      if (r.status === 'saved') setMsg('백업 파일을 저장했어요');
    } catch {
      setMsg('저장을 취소했거나 저장하지 못했어요');
    }
  }

  async function onImport(f: File) {
    setMsg('');
    setBusy(true);
    try {
      const r = await importBackup(f, setMsg);
      setMsg(`불러오기 완료: 술 ${r.drinks}개, 노트 ${r.tastings}개`);
    } catch (e) {
      setMsg('불러오지 못했어요: ' + (e instanceof Error ? e.message : '알 수 없는 오류'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen">
      <TopBar onBack title="설정" />
      <div className="settings">
        <section className="card">
          <h3>내 기록</h3>
          <p>
            술 <b className="num">{drinks.length}</b>개 · 테이스팅 노트 <b className="num">{tastings.length}</b>개
          </p>
          <p className="muted small">
            기록은 내 Claude 계정의 개인 공간에 저장돼요. 이 페이지를 다른 사람과 공유해도 내 기록은 나만 볼 수 있어요. 사진은 이
            페이지의 파일 저장소에 올라가요.
          </p>
        </section>

        <section className="card">
          <h3>Claude 자동 입력</h3>
          <p className="small">
            라벨 사진을 찍으면 Claude가 이름, 종류, 도수, 생산자 등을 채워줘요. 내 Claude 구독 사용량으로 동작해서 따로 돈이 들지
            않아요. 처음 쓸 때 Claude가 사진을 봐도 되는지 한 번 물어봐요.
          </p>
          <p className="small">
            상태:{' '}
            <b>{aiOk === undefined ? '확인 중…' : aiOk ? '사용할 수 있어요' : '이 화면에서는 쓸 수 없어요'}</b>
          </p>
        </section>

        <section className="card">
          <h3>백업</h3>
          <p className="small">기록을 파일 하나로 내려받아요. 예전 술로그 웹앱에서 내보낸 백업 파일도 여기서 불러올 수 있어요.</p>
          <div className="btn-row">
            {canDownload && (
              <button className="btn primary" onClick={onExport} disabled={busy}>
                내보내기
              </button>
            )}
            {status === 'ready' && (
              <button className="btn" onClick={() => fileRef.current?.click()} disabled={busy}>
                불러오기
              </button>
            )}
          </div>
          <input
            id="import-input"
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImport(f);
              e.target.value = '';
            }}
          />
          {msg && <p className="small" role="status">{msg}</p>}
          <p className="muted small">불러오기는 기존 기록을 지우지 않고 합쳐요. 같은 기록은 백업 내용으로 바뀌어요.</p>
        </section>

        <p className="muted small center">술로그 v0.3</p>
      </div>
    </div>
  );
}
