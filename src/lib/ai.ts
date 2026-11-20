/** 라벨 사진 → 술 정보. 보는 사람의 Claude 구독 사용량으로 동작 (sample 기능) */
import { use, type Sample, type SampleErr } from './claude';
import { CATEGORIES } from '../types';

export interface LabelGuess {
  isDrink: boolean;
  name: string | null;
  category: string | null;
  subtype: string | null;
  producer: string | null;
  origin: string | null;
  abv: number | null;
  vintage: string | null;
  volumeMl: number | null;
  barcode: string | null;
}

let samplePromise: Promise<Sample | null> | undefined;
function getSample() {
  samplePromise ??= use('sample');
  return samplePromise;
}

/** 이 화면에서 사진을 Claude에게 보낼 수 있는지 (동의창 없이 확인) */
export async function canReadPhotos(): Promise<boolean> {
  const s = await getSample();
  if (!s) return false;
  const l = await s.limits().catch(() => null);
  return !!l?.images;
}

const CATEGORY_GUIDE = CATEGORIES.map((c) => `${c.id}(${c.label})`).join(', ');

const PROMPT = `첨부한 사진은 술 병, 캔 또는 라벨을 찍은 것입니다. 개인 테이스팅 노트 앱의 입력 칸을 채울 수 있게 정보를 읽어주세요.

규칙:
- 라벨에 보이는 글자를 근거로 채웁니다. 라벨에 직접 적혀 있지 않아도 제품을 확실히 알아볼 수 있으면 널리 알려진 정보(생산자, 생산지, 세부 종류)는 채워도 됩니다.
- 확실하지 않은 칸은 null로 둡니다. 도수, 용량, 빈티지, 바코드는 사진에서 실제로 읽은 값만 씁니다.
- 값은 한국어로 씁니다. 고유명사는 라벨에 한국어 표기가 없으면 원어 그대로 둬도 됩니다.
- category는 다음 id 중 하나: ${CATEGORY_GUIDE}. 약주·청주·증류식 전통주·과실주 같은 한국 술은 traditional, 메즈칼은 tequila.
- subtype 예: 싱글몰트, 버번, 준마이 다이긴조, IPA, 피노 누아, 생막걸리, 증류식 소주
- origin 예: 스코틀랜드 스페이사이드, 전남 해남
- barcode: 바코드 아래 숫자가 또렷이 보이면 숫자만, 아니면 null

다른 말 없이 아래 모양의 JSON 객체 하나로만 답하세요:
{"isDrink": true, "name": "글렌피딕 12년", "category": "whisky", "subtype": "싱글몰트", "producer": "글렌피딕", "origin": "스코틀랜드 스페이사이드", "abv": 40, "vintage": "12년", "volumeMl": 700, "barcode": null}
사진에 술이 없으면 {"isDrink": false}만 답하세요.`;

export class AiError extends Error {
  constructor(message: string, readonly hide = false) {
    super(message);
  }
}

function toAiError(e: unknown): AiError {
  const code = (e as SampleErr)?.code;
  switch (code) {
    case 'not_granted':
    case 'sampling_disabled':
    case 'not_declared':
    case 'capability_disabled':
    case 'capability_removed':
    case 'images_unavailable':
      return new AiError('이 화면에서는 AI 자동 입력을 쓸 수 없어요', true);
    case 'rate_limited':
      return new AiError('Claude 사용량 한도에 걸렸어요. 조금 뒤에 다시 해주세요');
    case 'session_expired':
      return new AiError('Claude에 다시 로그인해주세요');
    case 'image_rejected':
      return new AiError('이 사진은 보낼 수 없어요. 다른 사진으로 해주세요');
    case 'refused':
      return new AiError('이 사진은 분석하지 못했어요');
    case 'invalid_json':
    case 'empty_completion':
      return new AiError('정보를 읽지 못했어요. 라벨이 잘 보이게 다시 찍어보세요');
    case 'cancelled':
      return new AiError('취소했어요');
    default:
      return new AiError('AI가 응답하지 않았어요. 다시 시도해주세요');
  }
}

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
const num = (v: unknown) => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v.replace(/[^\d.]/g, '')) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
};

export async function extractFromLabel(photo: Blob, signal?: AbortSignal): Promise<LabelGuess> {
  const sample = await getSample();
  if (!sample) throw new AiError('이 화면에서는 AI 자동 입력을 쓸 수 없어요', true);
  let raw: Record<string, unknown>;
  try {
    raw = await sample.json<Record<string, unknown>>(PROMPT, { images: [photo], signal });
  } catch (e) {
    throw toAiError(e);
  }
  const cat = str(raw?.category);
  const bc = str(raw?.barcode)?.replace(/\D/g, '');
  return {
    isDrink: raw?.isDrink !== false,
    name: str(raw?.name),
    category: cat && CATEGORIES.some((c) => c.id === cat) ? cat : null,
    subtype: str(raw?.subtype),
    producer: str(raw?.producer),
    origin: str(raw?.origin),
    abv: num(raw?.abv),
    vintage: str(raw?.vintage),
    volumeMl: num(raw?.volumeMl),
    barcode: bc && bc.length >= 8 ? bc : null,
  };
}

/** 기기에서 바코드를 못 읽었을 때 Claude에게 숫자만 읽어달라고 한다 */
export async function readBarcodeWithClaude(photo: Blob): Promise<string | undefined> {
  const sample = await getSample();
  if (!sample) return undefined;
  try {
    const r = await sample.json<{ barcode?: unknown }>(
      '첨부한 사진에서 상품 바코드(EAN/UPC) 아래 숫자를 읽어주세요. 다른 말 없이 {"barcode": "8801234567893"} 모양의 JSON 하나로만 답하고, 또렷이 안 보이면 {"barcode": null}로 답하세요.',
      { images: [photo], modelTier: 'quick' },
    );
    const code = str(r?.barcode)?.replace(/\D/g, '');
    return code && code.length >= 8 ? code : undefined;
  } catch (e) {
    throw toAiError(e);
  }
}
