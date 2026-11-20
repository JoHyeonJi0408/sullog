import { categoryOf } from '../types';
import { go } from '../router';
import { CategoryPill, Stars, StoredImg, TopBar } from '../components/ui';
import { formatDate } from '../util';
import { useStore } from '../repo';
import type { Tasting } from '../types';
import { AGAIN, FINISH_LENGTHS, axesFor } from '../vocab';
import { TagIcon } from '../components/tagIcons';

export function DetailScreen({ id }: { id: string }) {
  const { drinks, tastings: all, status } = useStore();
  const drink = drinks.find((d) => d.id === id);
  const tastings = all
    .filter((t) => t.drinkId === id)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  const canWrite = status === 'ready';

  if (!drink)
    return (
      <div className="screen">
        <TopBar onBack />
        <div className="empty">
          <p>{status === 'loading' ? '불러오는 중…' : '삭제되었거나 없는 기록이에요.'}</p>
        </div>
      </div>
    );

  const rated = tastings.filter((t) => t.rating != null);
  const avg = rated.length ? rated.reduce((s, t) => s + t.rating!, 0) / rated.length : undefined;

  const info: [string, string | undefined][] = [
    ['세부 종류', drink.subtype],
    ['도수', drink.abv != null ? `${drink.abv}%` : undefined],
    ['생산자', drink.producer],
    ['생산지', drink.origin],
    ['빈티지 / 숙성', drink.vintage],
    ['용량', drink.volumeMl != null ? `${drink.volumeMl.toLocaleString()}ml` : undefined],
    ['가격', drink.price != null ? `${drink.price.toLocaleString()}원` : undefined],
    ['구매처', drink.purchasedFrom],
    ['바코드', drink.barcode],
  ];
  const filled = info.filter(([, v]) => v);

  return (
    <div className="screen">
      <TopBar
        onBack
        right={
          canWrite && (
            <button className="text-btn" onClick={() => go(`/d/${id}/edit`)}>
              편집
            </button>
          )
        }
      />

      {drink.photoId && (
        <div className="hero">
          <StoredImg id={drink.photoId} />
        </div>
      )}

      <div className="detail-head" style={{ ['--cat' as string]: categoryOf(drink.category).color }}>
        <CategoryPill category={drink.category} />
        <h2>{drink.name}</h2>
        {avg != null && (
          <div className="detail-rating">
            <Stars value={Math.round(avg * 2) / 2} size={18} />
            <span className="num">{avg.toFixed(1)}</span>
            {rated.length > 1 && <span className="muted">평균 · {rated.length}회</span>}
          </div>
        )}
      </div>

      {filled.length > 0 && (
        <dl className="info-grid">
          {filled.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      )}
      {drink.memo && <p className="drink-memo">{drink.memo}</p>}

      <div className="section-head">
        <h3>
          테이스팅 노트 {tastings.length > 0 && <span className="muted">{tastings.length}</span>}
        </h3>
        {canWrite && (
          <button className="btn small primary" onClick={() => go(`/d/${id}/t/new`)}>
            + 또 마셨어요
          </button>
        )}
      </div>

      {tastings.length === 0 && <p className="empty small">아직 테이스팅 노트가 없어요.</p>}

      <ul className="tasting-list">
        {tastings.map((t) => (
          <li key={t.id}>
            <button className="tasting-card" disabled={!canWrite} onClick={() => go(`/d/${id}/t/${t.id}`)}>
              <div className="tasting-top">
                <span className="tasting-date">
                  {formatDate(t.date)}
                  {t.again && <span className={'again again-' + t.again}>{AGAIN.find((x) => x.id === t.again)?.label}</span>}
                </span>
                {t.rating != null && (
                  <span className="tasting-rating">
                    <Stars value={t.rating} size={13} /> <span className="num">{t.rating.toFixed(1)}</span>
                  </span>
                )}
              </div>
              <TastingBody t={t} category={drink.category} />
              {t.memo && <p className="note-memo">{t.memo}</p>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Tags({ items }: { items?: string[] }) {
  if (!items?.length) return null;
  return (
    <span className="tag-list">
      {items.map((x) => (
        <span key={x} className="tag-mini">
          <TagIcon tag={x} size={12} />
          {x}
        </span>
      ))}
    </span>
  );
}

/** 테이스팅 카드 본문: 고른 선택지 + 추가 의견 */
function TastingBody({ t, category }: { t: Tasting; category: string }) {
  const axes = axesFor(category).filter((a) => t.profile?.[a.id] != null);
  const finishLen = FINISH_LENGTHS.find((f) => f.id === t.finishLength)?.label;
  const rows: [string, React.ReactNode, string | undefined][] = [
    ['향', <Tags items={t.noseTags} />, t.nose],
    ['맛', <Tags items={t.palateTags} />, t.palate],
    ['여운', <>{finishLen && (
          <span className="tag-mini strong">
            <TagIcon tag={finishLen} size={12} />
            여운 {finishLen}
          </span>
        )}<Tags items={t.finishTags} /></>, t.finish],
    ['음식', <Tags items={t.pairingTags} />, t.pairing],
  ];
  const hasTags = (k: string) =>
    k === '향' ? !!t.noseTags?.length : k === '맛' ? !!t.palateTags?.length : k === '여운' ? !!(finishLen || t.finishTags?.length) : !!t.pairingTags?.length;
  return (
    <>
      {axes.length > 0 && (
        <div className="profile-view" aria-label="맛의 세기">
          {axes.map((a) => (
            <div key={a.id} className="profile-row">
              <span>{a.label}</span>
              <span className="profile-bar" aria-label={`${a.label} ${t.profile![a.id]}/5`}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <i key={n} className={n <= (t.profile![a.id] ?? 0) ? 'on' : ''} />
                ))}
              </span>
            </div>
          ))}
        </div>
      )}
      {rows
        .filter(([k, , text]) => hasTags(k) || text)
        .map(([k, tags, text]) => (
          <div key={k} className={'note-line tone-' + ({ 향: 'nose', 맛: 'palate', 여운: 'finish', 음식: 'pairing' } as Record<string, string>)[k]}>
            <b>{k}</b>
            <span>
              {hasTags(k) && <span className="note-tags">{tags}</span>}
              {text && <span className="note-text">{text}</span>}
            </span>
          </div>
        ))}
    </>
  );
}
