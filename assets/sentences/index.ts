import { getDb } from "../../services/db";

export interface ExampleSentence {
  id: string;
  jp: string;
  vi: string;
  source?: string;
  pattern?: string;
  level?: string;
}

export const EXAMPLE_SENTENCES: ExampleSentence[] = [];

let _sentencesLoaded = false;
let _sentencesLoadPromise: Promise<boolean> | null = null;

function normalizeRow(row: any): ExampleSentence {
  return {
    id: row.id,
    jp: row.jp ?? '',
    vi: row.vi ?? '',
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

export async function findExamplesByVocab(vocabWord: string): Promise<ExampleSentence[]> {
  if (!vocabWord || vocabWord.trim() === '') return [];
  await ensureSentencesDbReady();
  const searchKeyword = vocabWord.toLowerCase();
  return EXAMPLE_SENTENCES.filter((s) => s.jp.toLowerCase().includes(searchKeyword));
}

export async function getRandomExamples(vocabWord: string, limit: number = 5): Promise<ExampleSentence[]> {
  const examples = await findExamplesByVocab(vocabWord);
  const shuffled = [...examples].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, limit);
}