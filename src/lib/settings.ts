// 이 기기에만 저장되는 개인 설정 (API 키 등)
const KEY = 'sullog.anthropicKey';

export function getApiKey(): string | undefined {
  try {
    return localStorage.getItem(KEY) || undefined;
  } catch {
    return undefined;
  }
}

export function setApiKey(v: string | undefined) {
  try {
    if (v) localStorage.setItem(KEY, v);
    else localStorage.removeItem(KEY);
  } catch {
    /* private mode 등 — 무시 */
  }
}
