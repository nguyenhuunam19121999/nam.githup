// ─────────────────────────────────────────────────────────────────────────────
// data_JLPT_kanji
// Dữ liệu Kanji theo cấp độ JLPT (N5 → N1).
// Cấu trúc giống vocab: mỗi cấp có thể chia theo sách (Mimikara / Soumatome).
// ─────────────────────────────────────────────────────────────────────────────

import n1 from "./n1.json";
import n2Mimikara from "./n2_mimikara.json";
import n2Soumatome from "./n2_soumatome.json";
import n3Mimikara from "./n3_mimikara.json";
import n3Soumatome from "./n3_soumatome.json";
import n4 from "./n4.json";
import n5 from "./n5.json";

/** Một thành phần (bộ thủ / bộ phận) cấu tạo nên chữ Kanji */
export interface KanjiComponent {
  kanji: string;
  hanViet: string;
}

/** Ví dụ minh hoạ — từ ghép có chứa chữ Kanji này */
export interface KanjiExample {
  jp: string;
  reading: string;
  vi: string;
}

export interface KanjiItem {
  id: string;
  /** Chính chữ Kanji, ví dụ "候" */
  kanji: string;
  /** Âm Hán Việt, ví dụ "HẬU" */
  hanViet: string;
  /** Âm thuần Nhật (Kunyomi) */
  kunyomi: string[];
  /** Âm Hán Nhật (Onyomi) */
  onyomi: string[];
  /** Số nét */
  strokes: number;
  level: "N5" | "N4" | "N3" | "N2" | "N1";
  /** Thứ hạng tần suất xuất hiện (theo bộ 2500 chữ thông dụng), không bắt buộc */
  frequency?: number;
  /** Các bộ thủ / bộ phận cấu thành */
  components?: KanjiComponent[];
  /** Danh sách nghĩa tiếng Việt */
  meanings: string[];
  /** Sách nguồn */
  book?: string;
  /** Ví dụ từ ghép minh hoạ (không bắt buộc) */
  examples?: KanjiExample[];
  /** Số bài học trong sách (Soumatome) */
  lesson?: number;
  /** Số tuần trong sách (Soumatome) */
  week?: number;
}

const JLPT_KANJI: Record<string, KanjiItem[]> = {
  "n5": n5 as KanjiItem[],
  "n4": n4 as KanjiItem[],
  "mimikara-n3": n3Mimikara as KanjiItem[],
  "soumatome-n3": n3Soumatome as KanjiItem[],
  "mimikara-n2": n2Mimikara as KanjiItem[],
  "soumatome-n2": n2Soumatome as KanjiItem[],
  "n1": n1 as KanjiItem[],
};

export const KANJI_BY_BOOK: Record<string, KanjiItem[]> = {
  ...JLPT_KANJI,
};

export const KANJI_BY_LEVEL: Record<string, KanjiItem[]> = {
  N5: n5 as KanjiItem[],
  N4: n4 as KanjiItem[],
  N3: [
    ...(n3Soumatome as KanjiItem[]),
    ...(n3Mimikara as KanjiItem[]),
  ],
  N2: [
    ...(n2Soumatome as KanjiItem[]),
    ...(n2Mimikara as KanjiItem[]),
  ],
  N1: n1 as KanjiItem[],
};

export const ALL_KANJI: KanjiItem[] = [
  ...(n5 as KanjiItem[]),
  ...(n4 as KanjiItem[]),
  ...(n3Soumatome as KanjiItem[]),
  ...(n3Mimikara as KanjiItem[]),
  ...(n2Soumatome as KanjiItem[]),
  ...(n2Mimikara as KanjiItem[]),
  ...(n1 as KanjiItem[]),
];

/** Trả về danh sách Kanji theo cấp độ hoặc bookId */
export function getKanji(level?: string, bookId?: string): KanjiItem[] {
  if (bookId && KANJI_BY_BOOK[bookId]) return KANJI_BY_BOOK[bookId];
  const lvl = (level ?? "").toUpperCase();
  if (KANJI_BY_LEVEL[lvl]) return KANJI_BY_LEVEL[lvl];
  return ALL_KANJI;
}

/** Trả về danh sách Kanji theo bookId (ví dụ "mimikara-n2") */
export function getKanjiByBook(bookId: string): KanjiItem[] {
  return KANJI_BY_BOOK[bookId] ?? [];
}

export function getKanjiById(id: string): KanjiItem | undefined {
  return ALL_KANJI.find((k) => k.id === id);
}
