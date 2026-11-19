import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { categoryOf } from '../types';
import { go } from '../router';
import { CategoryPill, Stars, TopBar, usePhotoUrl } from '../components/ui';
import { formatDate } from '../util';

export function DetailScreen({ id }: { id: string }) {
  const drink = useLiveQuery(() => db.drinks.get(id).then((d) => d ?? null), [id]);
  const tastings = useLiveQuery(
    () => db.tastings.where('drinkId').equals(id).toArray().then((ts) => ts.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)),
    [id],
  );
  const photoUrl = usePhotoUrl(drink?.photoId, 'blob');

  if (drink === undefined) return <div className="screen"><TopBar onBack /></div>;
  if (drink === null)
    return (
      <div className="screen">
        <TopBar onBack />
        <div className="empty"><p>삭제되었거나 없는 기록이에요.</p></div>
      </div>
    );

  const rated = tastings?.filter((t) => t.rating != null) ?? [];
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
          <button className="text-btn" onClick={() => go(`/d/${id}/edit`)}>
            편집
          </button>
        }
      />

      {photoUrl && (
        <div className="hero">
          <img src={photoUrl} alt="" />
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
        <h3>테이스팅 노트 {tastings && tastings.length > 0 && <span className="muted">{tastings.length}</span>}</h3>
        <button className="btn small primary" onClick={() => go(`/d/${id}/t/new`)}>
          + 또 마셨어요
        </button>
      </div>

      {tastings?.length === 0 && <p className="empty small">아직 테이스팅 노트가 없어요.</p>}

      <ul className="tasting-list">
        {tastings?.map((t) => (
          <li key={t.id}>
            <button className="tasting-card" onClick={() => go(`/d/${id}/t/${t.id}`)}>
              <div className="tasting-top">
                <span className="tasting-date">{formatDate(t.date)}</span>
                {t.rating != null && (
                  <span className="tasting-rating">
                    <Stars value={t.rating} size={13} /> <span className="num">{t.rating.toFixed(1)}</span>
                  </span>
                )}
              </div>
              {(
                [
                  ['향', t.nose],
                  ['맛', t.palate],
                  ['여운', t.finish],
                  ['음식', t.pairing],
                ] as const
              )
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <p key={k} className="note-line">
                    <b>{k}</b>
                    <span>{v}</span>
                  </p>
                ))}
              {t.memo && <p className="note-memo">{t.memo}</p>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
