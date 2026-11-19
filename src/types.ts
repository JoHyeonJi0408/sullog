export const CATEGORIES = [
  { id: 'wine', label: '와인', color: '#a8324a' },
  { id: 'whisky', label: '위스키', color: '#c27a2c' },
  { id: 'sake', label: '사케', color: '#8aa1b8' },
  { id: 'makgeolli', label: '막걸리', color: '#c9bb9a' },
  { id: 'beer', label: '맥주', color: '#d9a62e' },
  { id: 'soju', label: '소주', color: '#5fa38a' },
  { id: 'traditional', label: '전통주', color: '#9c6b3f' },
  { id: 'tequila', label: '데킬라', color: '#8fae4a' },
  { id: 'other', label: '기타', color: '#857a70' },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]['id'];

export function categoryOf(id: string) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}

/** 술 한 병(제품) 정보 */
export interface Drink {
  id: string;
  name: string;
  category: CategoryId;
  subtype?: string; // 세부 종류: 버번, 준마이 다이긴조, IPA, 피노 누아 …
  producer?: string; // 양조장 / 증류소 / 와이너리
  origin?: string; // 생산지 (국가·지역)
  abv?: number; // 도수 %
  vintage?: string; // 빈티지 / 숙성 연수
  volumeMl?: number;
  price?: number;
  purchasedFrom?: string;
  barcode?: string;
  memo?: string;
  photoId?: string;
  createdAt: number;
  updatedAt: number;
}

/** 한 번 마신 기록 */
export interface Tasting {
  id: string;
  drinkId: string;
  date: string; // YYYY-MM-DD
  rating?: number; // 0.5 ~ 5
  nose?: string; // 향
  palate?: string; // 맛
  finish?: string; // 여운
  pairing?: string; // 같이 먹은 음식
  memo?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Photo {
  id: string;
  blob: Blob; // 리사이즈된 원본 (최대 1600px)
  thumb: Blob; // 목록용 썸네일 (최대 320px)
}
