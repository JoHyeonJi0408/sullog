import { useEffect, useState } from 'react';

export type Route =
  | { name: 'list' }
  | { name: 'new'; barcode?: string }
  | { name: 'detail'; id: string }
  | { name: 'editDrink'; id: string }
  | { name: 'tasting'; drinkId: string; tastingId?: string }
  | { name: 'settings' };

function parse(hash: string): Route {
  const [path, query = ''] = hash.replace(/^#\/?/, '').split('?');
  const p = path.split('/').filter(Boolean);
  if (p[0] === 'new') return { name: 'new', barcode: new URLSearchParams(query).get('barcode') ?? undefined };
  if (p[0] === 'settings') return { name: 'settings' };
  if (p[0] === 'd' && p[1]) {
    if (p[2] === 'edit') return { name: 'editDrink', id: p[1] };
    if (p[2] === 't') return { name: 'tasting', drinkId: p[1], tastingId: p[3] === 'new' ? undefined : p[3] };
    return { name: 'detail', id: p[1] };
  }
  return { name: 'list' };
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parse(location.hash));
  useEffect(() => {
    const on = () => {
      setRoute(parse(location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

let depth = 0; // 앱 안에서 이동한 횟수 — 0이면 뒤로가기 대신 fallback으로

export function go(path: string, replace = false) {
  const url = '#' + path;
  if (!replace) depth++;
  if (replace) {
    history.replaceState(null, '', url);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    location.hash = path;
  }
}

export function back(fallback = '/') {
  if (depth > 0) {
    depth--;
    history.back();
  } else go(fallback, true);
}
