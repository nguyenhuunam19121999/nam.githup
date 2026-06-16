// assets/sentences/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// Mẫu câu ví dụ - Kết hợp từ data_nn và sentences.json
// ─────────────────────────────────────────────────────────────────────────────

import { ALL_GRAMMAR, GrammarItem } from '../data_nn';
import sentenceData from './sentences.json';

export interface ExampleSentence {
  id: string;
  jp: string;
  vi: string;
  source?: string;
  pattern?: string;
  level?: string;
}

// Định nghĩa kiểu cho dữ liệu JSON
interface SentenceJson {
  sentences: {
    id: string;
    jp: string;
    vi: string;
  }[];
}

// Ép kiểu cho dữ liệu import
const typedSentenceData = sentenceData as SentenceJson;

// Lấy mẫu câu từ dữ liệu ngữ pháp (data_nn)
function extractExamplesFromGrammar(): ExampleSentence[] {
  const examples: ExampleSentence[] = [];
  
  if (!ALL_GRAMMAR || ALL_GRAMMAR.length === 0) return examples;
  
  ALL_GRAMMAR.forEach((grammar: GrammarItem) => {
    if (grammar.examples && grammar.examples.length > 0) {
      grammar.examples.forEach((ex, idx) => {
        if (ex && ex.jp && ex.vi) {  // ✅ Kiểm tra dữ liệu hợp lệ
          examples.push({
            id: `grammar_${grammar.id}_${idx}`,
            jp: ex.jp,
            vi: ex.vi,
            source: 'grammar',
            pattern: grammar.pattern,
            level: grammar.level,
          });
        }
      });
    }
  });
  
  return examples;
}

// Lấy mẫu câu từ file sentences.json
function extractExamplesFromVocab(): ExampleSentence[] {
  if (!typedSentenceData || !typedSentenceData.sentences) return [];
  
  return typedSentenceData.sentences
    .filter(item => item && item.jp && item.vi)  // ✅ Lọc dữ liệu hợp lệ
    .map((item) => ({
      id: item.id || `vocab_${Math.random()}`,
      jp: item.jp,
      vi: item.vi,
      source: 'vocab',
    }));
}

// Kết hợp cả 2 nguồn
export const EXAMPLE_SENTENCES: ExampleSentence[] = [
  ...extractExamplesFromGrammar(),
  ...extractExamplesFromVocab(),
];


/**
 * Tìm kiếm mẫu câu có chứa từ vựng cần tra
 * @param vocabWord - Từ vựng cần tìm
 * @returns Mảng các mẫu câu có chứa từ vựng đó
 */
export function findExamplesByVocab(vocabWord: string): ExampleSentence[] {
  if (!vocabWord || vocabWord.trim() === '') return [];
  
  const searchKeyword = vocabWord.toLowerCase();
  
  const results = EXAMPLE_SENTENCES.filter(sentence => {
    // ✅ Kiểm tra sentence và sentence.jp tồn tại trước khi gọi toLowerCase
    if (!sentence || !sentence.jp) return false;
    return sentence.jp.toLowerCase().includes(searchKeyword);
  });
  
  return results;
}

/**
 * Lấy mẫu câu ngẫu nhiên cho từ vựng
 * @param vocabWord - Từ vựng cần tìm
 * @param limit - Số lượng mẫu câu tối đa (mặc định: 5)
 * @returns Mảng các mẫu câu ngẫu nhiên
 */
export function getRandomExamples(vocabWord: string, limit: number = 5): ExampleSentence[] {
  const examples = findExamplesByVocab(vocabWord);
  const shuffled = [...examples].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, limit);
}