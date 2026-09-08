// services/aiService.ts
//
// Kiến trúc: App --(Firebase ID token)--> Cloudflare Worker --(Groq key chung)--> Groq API
// Worker chịu trách nhiệm TOÀN BỘ:
//   - Verify Firebase ID token
//   - Kiểm tra "cầu chì chung" (status/ai.blocked) — nếu bật, trả lỗi bảo trì ngay
//   - Kiểm tra cache Firestore (ai_cache) trước — có rồi thì trả luôn, không tốn quota/AI
//   - Kiểm tra quota cá nhân (config/ai.dailyLimit vs users/{uid}.aiUsageToday)
//   - Gọi Groq, trả về JSON có cấu trúc: { meaning, usage, examples, synonyms_distinction, notes }
//
// File này CHỈ là phần client — không tự đếm quota, không tự cache gì ở đây.

import auth from '@react-native-firebase/auth';

const AI_WORKER_URL = 'https://mirai-jp-ai.miraiai.workers.dev';

export interface ContentSegment {
  text: string;
  furigana?: string;
}

export interface AIExample {
  jp_segments: ContentSegment[];
  vi: string;
}

export interface AIResult {
  meaning: ContentSegment[];
  usage: ContentSegment[];
  examples: AIExample[];
  synonyms_distinction: ContentSegment[];
  notes: ContentSegment[];

  // Chỉ có khi type === 'grammar'
  structure?: ContentSegment[];
  conjugation?: ContentSegment[];
  jlpt_level?: string;

  // Chỉ có khi type === 'vocab'
  part_of_speech?: string;
  collocations?: ContentSegment[];
  kanji_breakdown?: ContentSegment[];

  // Chỉ có khi type === 'kanji'
  component_analysis?: ContentSegment[];
  stroke_count_note?: ContentSegment[];
  similar_kanji?: ContentSegment[];

  parseFailed?: boolean;
  meaningRaw?: string; // dùng khi parseFailed = true, xem AIExplainPanel
}

export type AILookupType = 'vocab' | 'grammar' | 'kanji';

export class NotAuthenticatedError extends Error {
  constructor() {
    super('NOT_AUTHENTICATED');
    this.name = 'NotAuthenticatedError';
  }
}

export class AIQuotaExceededError extends Error {
  limit?: number;
  used?: number;
  resetAt?: string;
  constructor(info?: { limit?: number; used?: number; resetAt?: string }) {
    super('AI_QUOTA_EXCEEDED');
    this.name = 'AIQuotaExceededError';
    this.limit = info?.limit;
    this.used = info?.used;
    this.resetAt = info?.resetAt;
  }
}

// Cầu chì chung đang bật — Groq/hệ thống đang gặp sự cố, KHÔNG phải lỗi của riêng user này
export class AIMaintenanceError extends Error {
  constructor() {
    super('AI_MAINTENANCE');
    this.name = 'AIMaintenanceError';
  }
}

export class AINetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AINetworkError';
  }
}

interface WorkerResponse {
  result?: AIResult;
  fromCache?: boolean;
  usage?: { used: number; limit: number };
}

/**
 * Tra cứu AI cho 1 từ vựng / ngữ pháp / kanji cụ thể.
 * `word` LUÔN LÀ từ đang hiển thị trên trang (không phải nội dung tự do user gõ).
 *
 * Ném lỗi cụ thể để UI xử lý riêng từng trường hợp — xem các class lỗi ở trên.
 */
export async function lookupAI(
  type: AILookupType,
  word: string,
  context?: string
): Promise<AIResult> {
  const currentUser = auth().currentUser;
  if (!currentUser) {
    throw new NotAuthenticatedError();
  }

  let idToken: string;
  try {
    idToken = await currentUser.getIdToken();
  } catch {
    throw new NotAuthenticatedError();
  }

  let response: Response;
  try {
    response = await fetch(AI_WORKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ type, word, context }),
    });
  } catch (err: any) {
    throw new AINetworkError(err?.message ?? 'Không thể kết nối tới máy chủ AI.');
  }

  if (response.status === 401) {
    throw new NotAuthenticatedError();
  }

  if (response.status === 503) {
    throw new AIMaintenanceError();
  }

  if (response.status === 429) {
    let body: any = null;
    try {
      body = await response.json();
    } catch {
      // không parse được, vẫn coi là hết quota
    }
    throw new AIQuotaExceededError({
      limit: body?.limit,
      used: body?.used,
      resetAt: body?.resetAt,
    });
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new AINetworkError(`Lỗi máy chủ AI (${response.status}): ${errText || 'không rõ nguyên nhân'}`);
  }

  let data: WorkerResponse;
  try {
    data = await response.json();
  } catch {
    throw new AINetworkError('Phản hồi từ máy chủ AI không hợp lệ.');
  }

  if (!data?.result) {
    throw new AINetworkError('AI không trả về nội dung.');
  }

  return data.result;
}

/** Tra cứu từ vựng — tiện dụng cho VocabDetailInline / vocab-detail.tsx */
export function explainVocab(word: string, context?: string): Promise<AIResult> {
  return lookupAI('vocab', word, context);
}

/** Tra cứu ngữ pháp — tiện dụng cho GrammarDetailInline / grammar-detail.tsx */
export function explainGrammar(pattern: string, context?: string): Promise<AIResult> {
  return lookupAI('grammar', pattern, context);
}

/** Tra cứu kanji — tiện dụng cho KanjiDetailInline / kanji-detail.tsx */
export function explainKanji(char: string, context?: string): Promise<AIResult> {
  return lookupAI('kanji', char, context);
}