/** 테이스팅 노트 선택지 — 술 종류마다 자주 쓰는 표현을 고를 수 있게 */
import type { CategoryId } from './types';

const AROMAS: Record<CategoryId, string[]> = {
  whisky: ['바닐라', '캐러멜', '꿀', '건포도', '사과·배', '시트러스', '셰리', '오크', '스모키', '피트', '스파이시', '견과류', '초콜릿', '몰트·곡물', '꽃', '바다·짠내'],
  wine: ['베리류', '체리', '자두', '시트러스', '사과·배', '열대과일', '꽃', '허브', '후추', '오크', '바닐라', '토스트', '버터', '가죽', '흙', '미네랄'],
  sake: ['쌀', '누룩', '멜론', '바나나', '사과·배', '백도', '꽃', '요구르트', '견과류', '꿀', '버섯', '미네랄'],
  makgeolli: ['쌀', '누룩', '요구르트', '바나나', '사과·배', '멜론', '꿀', '곡물', '견과류', '꽃', '시큼함'],
  beer: ['홉', '시트러스', '열대과일', '솔·송진', '꽃', '몰트', '빵', '캐러멜', '커피', '초콜릿', '바나나', '정향', '허브', '스모키'],
  soju: ['쌀', '곡물', '누룩', '단내', '과일', '꽃', '견과류', '오크', '알코올향', '깔끔함'],
  traditional: ['쌀', '누룩', '꿀', '꽃', '과일', '약재·한방', '생강', '대추', '오미자', '솔', '곡물', '오크'],
  tequila: ['아가베', '시트러스', '후추', '허브', '흙', '스모키', '바닐라', '캐러멜', '오크', '꽃', '짠내'],
  other: ['과일', '꽃', '허브', '곡물', '꿀', '바닐라', '오크', '스모키', '스파이시', '견과류', '시트러스'],
};

export function aromaTags(category: string | ''): string[] {
  return AROMAS[category as CategoryId] ?? AROMAS.other;
}

export const PALATE_TAGS = ['부드러움', '크리미', '오일리', '깔끔함', '복합적', '과일맛', '고소함', '스파이시', '짭짤함', '감칠맛', '떫음', '화끈함'];

export const FINISH_LENGTHS = [
  { id: 'short', label: '짧음' },
  { id: 'medium', label: '보통' },
  { id: 'long', label: '김' },
] as const;
export type FinishLength = (typeof FINISH_LENGTHS)[number]['id'];

export const FINISH_TAGS = ['따뜻함', '달콤함', '쌉쌀함', '스파이시', '스모키', '과일', '오크', '드라이', '깔끔하게 끝남'];

export const PAIRING_TAGS = ['안주 없이', '회·해산물', '고기', '치즈', '한식', '튀김', '매운 음식', '과일', '디저트'];

export const AGAIN = [
  { id: 'yes', label: '또 마실래요' },
  { id: 'maybe', label: '그럭저럭' },
  { id: 'no', label: '이번만' },
] as const;
export type Again = (typeof AGAIN)[number]['id'];

/** 맛의 세기 (1~5). 탄산은 맥주·막걸리·사케·와인에서만 */
export const PROFILE_AXES = [
  { id: 'sweet', label: '단맛', low: '드라이', high: '달콤' },
  { id: 'acid', label: '산미', low: '낮음', high: '높음' },
  { id: 'bitter', label: '쓴맛', low: '없음', high: '강함' },
  { id: 'body', label: '바디', low: '가벼움', high: '묵직함' },
  { id: 'alcohol', label: '알코올감', low: '순함', high: '화끈' },
  { id: 'fizz', label: '탄산', low: '없음', high: '강함', only: ['beer', 'makgeolli', 'sake', 'wine'] },
] as const;
export type ProfileAxis = (typeof PROFILE_AXES)[number]['id'];
export type Profile = Partial<Record<ProfileAxis, number>>;

export function axesFor(category: string | '') {
  return PROFILE_AXES.filter((a) => !('only' in a) || (a.only as readonly string[]).includes(category));
}
