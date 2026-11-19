import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { CATEGORIES, categoryOf, type CategoryId } from '../types';
import { go } from '../router';
import { Stars, Thumb } from '../components/ui';
import { formatDate } from '../util';

type Sort = 'recent' | 'rating' | 'name';

export function ListScreen() {
  const drinks = useLiveQuery(() => db.drinks.toArray(), []);
  const tastings = useLiveQuery(() => db.tastings.toArray(), []);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<CategoryId | 'all'>('all');
  const [sort, setSort] = useState<Sort>('recent');

  const rows = useMemo(() => {
    if (!drinks || !tastings) return undefined;
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
        const hay = [d.name, d.subtype, d.producer, d.origin, d.memo, categoryOf(d.category).label, ...ts.flatMap((t) => [t.nose, t.palate, t.finish, t.pairing, t.memo])]
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

  const usedCats = new Set(drinks?.map((d) => d.category));

  return (
    <div className="screen">
      <header className="home-head">
        <h1>술로그</h1>
        <button className="icon-btn" aria-label="설정" onClick={() => go('/settings')}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
        </button>
      </header>

      <div className="search">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
        <input type="search" placeholder="이름, 생산자, 향, 메모 검색" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="chips scroll">
        <button className={'chip' + (cat === 'all' ? ' on' : '')} onClick={() => setCat('all')}>
          전체
        </button>
        {CATEGORIES.filter((c) => usedCats.has(c.id)).map((c) => (
          <button key={c.id} className={'chip' + (cat === c.id ? ' on' : '')} style={{ ['--cat' as string]: c.color }} onClick={() => setCat(c.id)}>
            {c.label}
          </button>
        ))}
      </div>

      {rows && rows.length > 0 && (
        <div className="list-meta">
          <span>{rows.length}개</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="정렬">
            <option value="recent">최근 마신 순</option>
            <option value="rating">별점 순</option>
            <option value="name">이름 순</option>
          </select>
        </div>
      )}

      {rows && rows.length === 0 && (
        <div className="empty">
          {drinks!.length === 0 ? (
            <>
              <p className="empty-title">아직 기록한 술이 없어요</p>
              <p>오른쪽 아래 + 버튼으로 첫 잔을 기록해보세요.</p>
            </>
          ) : (
            <p>조건에 맞는 술이 없어요.</p>
          )}
        </div>
      )}

      <ul className="drink-list">
        {rows?.map(({ d, count, avg, last }) => (
          <li key={d.id}>
            <button className="drink-row" onClick={() => go('/d/' + d.id)}>
              <Thumb photoId={d.photoId} category={d.category} />
              <div className="drink-row-body">
                <div className="drink-row-name">{d.name}</div>
                <div className="drink-row-sub">
                  {[categoryOf(d.category).label, d.subtype, d.abv != null ? d.abv + '%' : undefined].filter(Boolean).join(' · ')}
                </div>
                <div className="drink-row-foot">
                  {avg != null && <Stars value={Math.round(avg * 2) / 2} size={12} />}
                  {avg != null && <span className="num">{avg.toFixed(1)}</span>}
                  <span className="muted">
                    {count > 0 ? `${count}번 마심 · ${formatDate(last!)}` : '테이스팅 없음'}
                  </span>
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>

      <button className="fab" aria-label="새 술 기록" onClick={() => go('/new')}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
      </button>
    </div>
  );
}
