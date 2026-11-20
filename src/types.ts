export const CATEGORIES = [
  { id: 'wine', label: '와인', color: '#e0587a' },
  { id: 'whisky', label: '위스키', color: '#e0912f' },
  { id: 'sake', label: '사케', color: '#5b9fd8' },
  { id: 'makgeolli', label: '막걸리', color: '#c39a5a' },
  { id: 'beer', label: '맥주', color: '#e8ad1c' },
  { id: 'soju', label: '소주', color: '#35b08e' },
  { id: 'traditional', label: '전통주', color: '#c97452' },
  { id: 'tequila', label: '데킬라', color: '#7cb342' },
  { id: 'other', label: '기타', color: '#9483c9' },
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
  subtype?: string;
  producer?: string;
  origin?: string;
  abv?: number;
  vintage?: string;
  volumeMl?: number;
  price?: number;
  purchasedFrom?: string;
  barcode?: string;
  memo?: string;
  photoId?: string; // 아티팩트 파일 저장소 id (원본, 최대 1600px)
  thumbId?: string; // 목록용 썸네일 id
  createdAt: number;
  updatedAt: number;
}

/** 한 번 마신 기록 */
export interface Tasting {
  id: string;
  drinkId: string;
  date: string; // YYYY-MM-DD
  rating?: number;
  noseTags?: string[]; // 고른 향
  palateTags?: string[]; // 고른 맛 느낌
  profile?: Partial<Record<string, number>>; // 단맛·산미·바디 등 세기 1~5
  finishLength?: string; // short | medium | long
  finishTags?: string[];
  pairingTags?: string[];
  again?: string; // yes | maybe | no
  nose?: string; // 향 추가 의견
  palate?: string; // 맛 추가 의견
  finish?: string; // 여운 추가 의견
  pairing?: string; // 음식 추가 의견
  memo?: string;
  createdAt: number;
  updatedAt: number;
}

export const blobUrl = (id?: string) => (id ? '/_blob/' + id : undefined);
