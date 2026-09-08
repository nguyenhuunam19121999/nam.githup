import { getDb } from "../../services/db";
import type { ContentSegment } from "../../services/aiService";

export interface ExampleSentence {
  id: string;
  jp: string;
  vi: string;
  reading?: ContentSegment[];
  source?: string;
  pattern?: string;
  level?: string;
}

export const EXAMPLE_SENTENCES: ExampleSentence[] = [];

let _sentencesLoaded = false;
let _sentencesLoadPromise: Promise<boolean> | null = null;

function normalizeRow(row: any): ExampleSentence {
  let reading: ContentSegment[] = [];
  try {
    reading = JSON.parse(row.reading || '[]');
    if (!Array.isArray(reading)) reading = [];
  } catch {
    reading = [];
  }

  return {
    id: row.id,
    jp: row.jp ?? '',
    vi: row.vi ?? '',
    reading,
    source: 'db',
  };
}

export async function ensureSentencesDbReady(): Promise<boolean> {
  if (_sentencesLoaded) return true;
  if (!_sentencesLoadPromise) {
    _sentencesLoadPromise = (async () => {
      const db = await getDb('sentences');
      if (!db) return false;
      const rows = await db.getAllAsync(`SELECT * FROM sentences ORDER BY id ASC`);
      const mapped = rows.map(normalizeRow);
      EXAMPLE_SENTENCES.push(...mapped);
      _sentencesLoaded = true;
      return true;
    })().catch(() => false);
  }
  return _sentencesLoadPromise;
}

const DEFAULT_MAX_EXAMPLES = 15;

export async function findExamplesByVocab(
  vocabWord: string,
  limit: number = DEFAULT_MAX_EXAMPLES
): Promise<ExampleSentence[]> {
  if (!vocabWord || vocabWord.trim() === '') return [];
  await ensureSentencesDbReady();
  const searchKeyword = vocabWord.toLowerCase();

  const result: ExampleSentence[] = [];
  for (const s of EXAMPLE_SENTENCES) {
    if (s.jp.toLowerCase().includes(searchKeyword)) {
      result.push(s);
      if (result.length >= limit) break; // dừng ngay khi đủ, không duyệt hết mảng
    }
  }
  return result;
}

export async function getRandomExamples(vocabWord: string, limit: number = 5): Promise<ExampleSentence[]> {
  const examples = await findExamplesByVocab(vocabWord);
  const shuffled = [...examples].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, limit);
}