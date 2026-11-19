import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { CATEGORIES } from '../types';
import { blobToDataUrl } from '../photo';
import { getApiKey } from './settings';

const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as [string, ...string[]];

const LabelSchema = z.object({
  isDrink: z.boolean().describe('사진에 술 병/캔/라벨이 보이면 true'),
  name: z.string().nullable().describe('제품명. 한국어 표기가 라벨에 있으면 한국어, 없으면 라벨 그대로'),
  category: z.enum(CATEGORY_IDS).nullable(),
  subtype: z.string().nullable().describe('세부 종류. 예: 싱글몰트, 버번, 준마이 다이긴조, IPA, 피노 누아, 생막걸리, 증류식 소주'),
  producer: z.string().nullable().describe('생산자: 양조장, 증류소, 와이너리, 브루어리'),
  origin: z.string().nullable().describe('생산지: 국가와 지역. 예: 스코틀랜드 스페이사이드, 전남 해남'),
  abv: z.number().nullable().describe('알코올 도수 %, 숫자만'),
  vintage: z.string().nullable().describe('빈티지 연도 또는 숙성 연수. 예: 2019, 12년'),
  volumeMl: z.number().nullable().describe('용량 ml, 숫자만'),
});

export type LabelGuess = z.infer<typeof LabelSchema>;

const SYSTEM = `당신은 술 라벨을 읽어 기록 앱의 입력 칸을 채워주는 도우미입니다.
사진에 보이는 라벨 글자를 근거로 각 칸을 채우세요. 라벨에 직접 적혀 있지 않더라도 제품을 확실히 알아볼 수 있으면 널리 알려진 정보(생산자, 생산지, 세부 종류)는 채워도 됩니다.
확실하지 않은 칸은 추측하지 말고 null로 두세요. 특히 도수, 용량, 빈티지는 라벨에서 읽은 값만 쓰세요.
category는 다음 중 하나: wine(와인), whisky(위스키), sake(사케), makgeolli(막걸리), beer(맥주), soju(소주), traditional(약주·청주·증류식 전통주·과실주 등 한국 전통주), tequila(데킬라·메즈칼), other(그 밖의 술).
값은 한국어로 쓰되, 고유명사는 라벨에 한국어 표기가 없으면 원어 그대로 둬도 됩니다.`;

export class AiError extends Error {}

export async function extractFromLabel(photo: Blob): Promise<LabelGuess> {
  const apiKey = getApiKey();
  if (!apiKey) throw new AiError('설정에서 Claude API 키를 먼저 넣어주세요');

  // 개인용 앱: 사용자가 직접 넣은 자기 키를 이 기기에서만 사용
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const dataUrl = await blobToDataUrl(photo);
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);

  try {
    const res = await client.beta.messages.parse({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: betaZodOutputFormat(LabelSchema) },
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
            { type: 'text', text: '이 술의 정보를 채워주세요.' },
          ],
        },
      ],
    });
    if (res.stop_reason === 'refusal') throw new AiError('이 사진은 분석하지 못했어요');
    if (!res.parsed_output) throw new AiError('정보를 읽지 못했어요. 라벨이 잘 보이게 다시 찍어보세요');
    return res.parsed_output;
  } catch (e) {
    if (e instanceof AiError) throw e;
    if (e instanceof Anthropic.AuthenticationError) throw new AiError('API 키가 올바르지 않아요. 설정에서 확인해주세요');
    if (e instanceof Anthropic.PermissionDeniedError) throw new AiError('이 API 키로는 사용할 수 없어요 (권한 또는 크레딧 확인)');
    if (e instanceof Anthropic.RateLimitError) throw new AiError('요청이 많아요. 잠시 후 다시 시도해주세요');
    if (e instanceof Anthropic.BadRequestError) throw new AiError('요청 오류: ' + e.message);
    if (e instanceof Anthropic.APIConnectionError) throw new AiError('인터넷 연결을 확인해주세요');
    if (e instanceof Anthropic.APIError) throw new AiError(`AI 서버 오류 (${e.status}). 잠시 후 다시 시도해주세요`);
    throw e;
  }
}
