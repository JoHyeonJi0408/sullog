import { useCallback, useMemo, useRef, useState } from 'react';
import { CATEGORIES, categoryOf, type CategoryId } from '../types';
import { go } from '../router';
import { Stars, Thumb, Toast } from '../components/ui';
import { formatDate } from '../util';
import { findByBarcode, useStore } from '../repo';
import { readBarcode } from '../lib/barcode';
import { readBarcodeWithClaude, AiError } from '../lib/ai';
import { CategoryIcon } from '../components/icons';

type Sort = 'recent' | 'rating' | 'name';

export function ListScreen() {
  const { drinks, tastings, status, slow } = useStore();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<CategoryId | 'all'>('all');
  const [sort, setSort] = useState<Sort>('recent');
  const [scanning, setScanning] = useState(false);
  const [toast, setToast] = useState<string>();
  const clearToast = useCallback(() => setToast(undefined), []);
  const scanRef = useRef<HTMLInputElement>(null);

  async function onScan(f: File) {
    setScanning(true);
    try {
      let code = await readBarcode(f);
      if (!code) code = await readBarcodeWithClaude(f);
      if (!code) return setToast('바코드를 찾지 못했어요. 바코드가 크게 나오게 다시 찍어보세요');
      const hit = findByBarcode(code);
      if (hit) go(`/d/${hit.id}/t/new`);
      else go(`/new?barcode=${encodeURIComponent(code)}`);
    } catch (e) {
      setToast(e instanceof AiError ? e.message : '바코드를 읽지 못했어요');
    } finally {
      setScanning(false);
    }
  }

  const rows = useMemo(() => {
    const byDrink = new Map<string, typeof tastings>();
    for (const t of tastings) {
      const arr = byDrink.get(t.drinkId) ?? [];
      arr.push(t);
      byDrink.set(t.drinkId, arr);
    }
    const needle = q.trim().toLowerCase();
    return drinks
      .map((d) => {
        const ts = byDrink.get(d.id) ?? [];
        const rated = ts.filter((t) => t.rating != null);
        const avg = rated.length ? rated.reduce((s, t) => s + t.rating!, 0) / rated.length : undefined;
        const last = ts.reduce<string | undefined>((m, t) => (!m || t.date > m ? t.date : m), undefined);
        const hay = [d.name, d.subtype, d.producer, d.origin, d.memo, categoryOf(d.category).label, ...ts.flatMap((t) => [t.nose, t.palate, t.finish, t.pairing, t.memo, ...(t.noseTags ?? []), ...(t.palateTags ?? []), ...(t.finishTags ?? []), ...(t.pairingTags ?? [])])]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return { d, count: ts.length, avg, last, hay };
      })
      .filter((r) => (cat === 'all' || r.d.category === cat) && (!needle || r.hay.includes(needle)))
      .sort((a, b) => {
        if (sort === 'name') return a.d.name.localeCompare(b.d.name, 'ko');
        if (sort === 'rating') return (b.avg ?? -1) - (a.avg ?? -1);
        const ka = a.last ?? new Date(a.d.createdAt).toISOString().slice(0, 10);
        const kb = b.last ?? new Date(b.d.createdAt).toISOString().slice(0, 10);
        return kb.localeCompare(ka) || b.d.updatedAt - a.d.updatedAt;
      });
  }, [drinks, tastings, q, cat, sort]);

  const usedCats = new Set(drinks.map((d) => d.category));
  const canWrite = status === 'ready';

  return (
    <div className="screen">
      <header className="home-head">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <CategoryIcon id="wine" size={22} strokeWidth={2} />
          </span>
          <div>
            <h1>술로그</h1>
            <p className="brand-sub">{drinks.length > 0 ? `${drinks.length}병 · ${tastings.length}잔 마셨어요` : '오늘은 어떤 한 잔?'}</p>
          </div>
        </div>
        <div className="head-actions">
          {canWrite && (
            <button className="icon-btn" aria-label="바코드로 찾기" disabled={scanning} onClick={() => scanRef.current?.click()}>
              {scanning ? (
                <i className="spinner" />
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M10 8v8M13 8v8M17 8v8" /></svg>
              )}
            </button>
          )}
          <input id="scan-input" ref={scanRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onScan(f); e.target.value = ''; }} />
          <button className="icon-btn" aria-label="설정" onClick={() => go('/settings')}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
          </button>
        </div>
      </header>

      <div className="search">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
        <input id="search" type="search" placeholder="이름, 생산자, 향, 메모 검색" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="chips scroll">
        <button className={'chip' + (cat === 'all' ? ' on' : '')} onClick={() => setCat('all')}>
          전체
        </button>
        {CATEGORIES.filter((c) => usedCats.has(c.id)).map((c) => (
          <button key={c.id} className={'chip' + (cat === c.id ? ' on' : '')} style={{ ['--cat' as string]: c.color }} onClick={() => setCat(c.id)}>
            <CategoryIcon id={c.id} size={16} strokeWidth={2} />
            {c.label}
          </button>
        ))}
      </div>

      {rows.length > 0 && (
        <div className="list-meta">
          <span>{rows.length}개</span>
          <select id="sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="정렬">
            <option value="recent">최근 마신 순</option>
            <option value="rating">별점 순</option>
            <option value="name">이름 순</option>
          </select>
        </div>
      )}

      {status === 'loading' && drinks.length === 0 && (
        <div className="empty">
          <i className="spinner" />
          <p>{slow ? '기록 저장소에 아직 연결하지 못했어요. 인터넷 연결을 확인해주세요.' : '기록을 불러오는 중…'}</p>
        </div>
      )}
      {status === 'signedOut' && (
        <div className="empty">
          <p className="empty-title">Claude에 로그인해야 쓸 수 있어요</p>
          <p>술로그는 Claude 계정에 기록을 저장해요. Claude 앱이나 claude.ai에 로그인한 상태로 이 페이지를 열어주세요.</p>
        </div>
      )}
      {status === 'error' && (
        <div className="empty">
          <p className="empty-title">기록을 불러오지 못했어요</p>
          <p>페이지를 닫았다가 다시 열어주세요.</p>
        </div>
      )}
      {(status === 'ready' || status === 'readOnly') && rows.length === 0 && (
        <div className="empty">
          {drinks.length === 0 ? (
            <>
              <div className="empty-art" aria-hidden="true">
                <svg width="120" height="96" viewBox="0 0 120 96" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <g transform="rotate(-14 40 50)">
                    <path d="M26 18h28l-2 22a12 12 0 0 1-24 0z" fill="var(--pink-soft)" stroke="var(--ink)" strokeWidth="2.5" />
                    <path d="M27 28h26" stroke="var(--ink)" strokeWidth="2.5" />
                    <path d="M40 52v22M31 76h18" stroke="var(--ink)" strokeWidth="2.5" />
                  </g>
                  <g transform="rotate(14 80 50)">
                    <path d="M66 18h28l-2 22a12 12 0 0 1-24 0z" fill="var(--yellow-soft)" stroke="var(--ink)" strokeWidth="2.5" />
                    <path d="M67 28h26" stroke="var(--ink)" strokeWidth="2.5" />
                    <path d="M80 52v22M71 76h18" stroke="var(--ink)" strokeWidth="2.5" />
                  </g>
                  <path d="M60 6v6M51 9l3 4M69 9l-3 4" stroke="var(--accent)" strokeWidth="2.5" />
                </svg>
              </div>
              <p className="empty-title">첫 잔을 기록해보세요</p>
              <p>아래 버튼을 누르고 라벨 사진을 찍으면,<br />이름·종류·도수를 Claude가 채워줘요.</p>
            </>
          ) : (
            <p>조건에 맞는 술이 없어요.</p>
          )}
        </div>
      )}

      <ul className="drink-list">
        {rows.map(({ d, count, avg, last }) => (
          <li key={d.id}>
            <button className="drink-row" style={{ ['--cat' as string]: categoryOf(d.category).color }} onClick={() => go('/d/' + d.id)}>
              <Thumb thumbId={d.thumbId} category={d.category} />
              <div className="drink-row-body">
                <div className="drink-row-name">{d.name}</div>
                <div className="drink-row-sub">
                  {[categoryOf(d.category).label, d.subtype, d.abv != null ? d.abv + '%' : undefined].filter(Boolean).join(' · ')}
                </div>
                <div className="drink-row-foot">
                  {avg != null && <Stars value={Math.round(avg * 2) / 2} size={12} />}
                  {avg != null && <span className="num">{avg.toFixed(1)}</span>}
                  <span className="muted">{count > 0 ? `${count}번 마심 · ${formatDate(last!)}` : '테이스팅 없음'}</span>
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>

      {canWrite && (
        <button className="fab" onClick={() => go('/new')}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          한 잔 기록
        </button>
      )}
      <Toast msg={toast} onDone={clearToast} />
    </div>
  );
}
