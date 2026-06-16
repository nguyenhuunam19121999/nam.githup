// Nếu bạn muốn tách dữ liệu ra file riêng
export interface Vocab {
  kanji: string;
  hiragana: string;
  han: string;
  nghia: string;
}

export interface KanjiItem {
  kanji: string;
  onyomi: string;
  kunyomi: string;
  nghia: string;
  level: string;
}

export interface GrammarItem {
  pattern: string;
  meaning: string;
  example: string;
  level: string;
}

// Export dữ liệu để dùng chung
export const KANJI_DATA: KanjiItem[] = [
  // Thêm dữ liệu Hán tự của bạn ở đây
];

export const GRAMMAR_DATA: GrammarItem[] = [
  // Thêm dữ liệu Ngữ pháp của bạn ở đây
];