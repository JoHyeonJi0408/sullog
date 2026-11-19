export function newId(): string {
  // crypto.randomUUID는 https/localhost에서만 존재 — LAN 테스트(http) 대비 폴백
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function today(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function formatDate(s: string): string {
  const [y, m, d] = s.split('-');
  return `${y}.${m}.${d}`;
}

/** 빈 문자열 → undefined, 숫자 문자열 → number */
export function optStr(v: string): string | undefined {
  const t = v.trim();
  return t ? t : undefined;
}
export function optNum(v: string): number | undefined {
  const t = v.trim().replace(/,/g, '');
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}
