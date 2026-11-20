/** 앱 안에서만 쓰는 화면 이동 (아티팩트 주소창에는 경로를 남기지 않는다) */
import { useSyncExternalStore } from 'react';

export type Route =
  | { name: 'list' }
  | { name: 'new'; barcode?: string }
  | { name: 'detail'; id: string }
  | { name: 'editDrink'; id: string }
  | { name: 'tasting'; drinkId: string; tastingId?: string }
  | { name: 'settings' };

function parse(full: string): Route {
  const [path, query = ''] = full.split('?');
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

let stack: string[] = ['/'];
let current = parse('/');
const listeners = new Set<() => void>();
function emit() {
  current = parse(stack[stack.length - 1]);
  listeners.forEach((l) => l());
  window.scrollTo(0, 0);
}

export function useRoute(): Route {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );
}

export function go(path: string, replace = false) {
  if (replace) stack = [...stack.slice(0, -1), path];
  else stack = [...stack, path];
  emit();
}

export function back(fallback = '/') {
  if (stack.length > 1) stack = stack.slice(0, -1);
  else stack = [fallback];
  emit();
}
