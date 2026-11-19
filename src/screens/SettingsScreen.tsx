import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { exportBackup, importBackup } from '../repo';
import { TopBar } from '../components/ui';
import { today } from '../util';
import { getApiKey, setApiKey } from '../lib/settings';

export function SettingsScreen() {
  const counts = useLiveQuery(async () => ({ drinks: await db.drinks.count(), tastings: await db.tastings.count() }), []);
  const [persisted, setPersisted] = useState<boolean>();
  const [usage, setUsage] = useState<string>();
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [savedKey, setSavedKey] = useState(getApiKey());
  const [keyInput, setKeyInput] = useState('');
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted).catch(() => {});
    navigator.storage?.estimate?.().then((e) => {
      if (e.usage != null) setUsage((e.usage / 1024 / 1024).toFixed(1) + 'MB');
    });
  }, [counts]);

  async function onExport() {
    setMsg('');
    const blob = await exportBackup();
    const name = `sullog-backup-${today()}.json`;
    const file = new File([blob], name, { type: 'application/json' });
    // iPhone에서는 공유 시트 → '파일에 저장'이 가장 자연스럽다
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: '술로그 백업' });
        return;
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
      }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  async function onImport(f: File) {
    setMsg('');
    try {
      const r = await importBackup(f);
      setMsg(`불러오기 완료: 술 ${r.drinks}개, 노트 ${r.tastings}개`);
    } catch (e) {
      setMsg('불러오지 못했어요: ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  async function onPersist() {
    const ok = await navigator.storage?.persist?.();
    setPersisted(!!ok);
  }

  return (
    <div className="screen">
      <TopBar onBack title="설정" />
      <div className="settings">
        <section className="card">
          <h3>내 기록</h3>
          <p>
            술 <b>{counts?.drinks ?? '–'}</b>개 · 테이스팅 노트 <b>{counts?.tastings ?? '–'}</b>개
            {usage && <span className="muted"> · {usage}</span>}
          </p>
          <p className="muted small">기록은 이 기기의 브라우저 안에만 저장돼요. 서버로 전송되지 않아요.</p>
        </section>

        <section className="card">
          <h3>AI 자동 입력</h3>
          <p className="small">
            라벨 사진을 찍으면 Claude가 이름, 종류, 도수, 생산자 등을 채워줘요. 본인의 Claude API 키가 필요하고, 사진 한 장에
            약 20~40원 정도 들어요. 키는 이 기기에만 저장돼요.
          </p>
          {savedKey ? (
            <div className="key-row">
              <span className="key-mask">{savedKey.slice(0, 10)}••••{savedKey.slice(-4)}</span>
              <button className="btn small danger" onClick={() => { setApiKey(undefined); setSavedKey(undefined); }}>지우기</button>
            </div>
          ) : (
            <>
              <div className="key-row">
                <input
                  className="key-input"
                  type="password"
                  autoComplete="off"
                  placeholder="sk-ant-…"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                />
                <button
                  className="btn small primary"
                  disabled={!keyInput.trim()}
                  onClick={() => { setApiKey(keyInput.trim()); setSavedKey(keyInput.trim()); setKeyInput(''); }}
                >
                  저장
                </button>
              </div>
              <p className="muted small">
                <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">Claude Console</a>에서
                키를 만들 수 있어요. 크레딧 충전이 필요해요.
              </p>
            </>
          )}
        </section>

        {!standalone && (
          <section className="card warn">
            <h3>홈 화면에 추가하세요</h3>
            <p className="small">
              Safari에서 공유 버튼 → <b>홈 화면에 추가</b>를 누르면 앱처럼 쓸 수 있어요. iPhone Safari는 홈 화면에 추가하지 않은
              사이트의 데이터를 오래 안 쓰면 지울 수 있어서, 꼭 추가해서 쓰는 걸 권해요.
            </p>
          </section>
        )}

        {persisted === false && (
          <section className="card">
            <h3>저장 공간 보호</h3>
            <p className="small">브라우저가 공간이 부족할 때 기록을 지우지 않도록 요청할 수 있어요.</p>
            <button className="btn small" onClick={onPersist}>보호 요청</button>
          </section>
        )}

        <section className="card">
          <h3>백업</h3>
          <p className="small">사진까지 포함한 파일 하나로 저장해요. 가끔 내보내서 iCloud Drive 등에 보관해두세요.</p>
          <div className="btn-row">
            <button className="btn primary" onClick={onExport}>내보내기</button>
            <button className="btn" onClick={() => fileRef.current?.click()}>불러오기</button>
          </div>
          <input
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
          {msg && <p className="small">{msg}</p>}
          <p className="muted small">불러오기는 기존 기록을 지우지 않고 합쳐요. 같은 기록은 백업 내용으로 바뀌어요.</p>
        </section>

        <p className="muted small center">술로그 v0.1</p>
      </div>
    </div>
  );
}
