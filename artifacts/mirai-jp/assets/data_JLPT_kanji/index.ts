// ─────────────────────────────────────────────────────────────────────────────
// data_JLPT_kanji
// Dữ liệu Kanji theo cấp độ JLPT (N5 → N1).
// Mỗi cấp được lưu trong 1 file JSON riêng, dễ chỉnh sửa / mở rộng về sau.
// Cấu trúc tương tự `data_nn` (ngữ pháp).
// ─────────────────────────────────────────────────────────────────────────────

import n1 from "./n1.json";
import n2 from "./n2.json";
import n2Mimikara from "./n2_mimikara.json";
import n3 from "./n3.json";
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
  /** Ví dụ từ ghép minh hoạ (không bắt buộc) */
  examples?: KanjiExample[];
}

export const KANJI_BY_LEVEL: Record<string, KanjiItem[]> = {
  N5: n5 as KanjiItem[],
  N4: n4 as KanjiItem[],
  N3: n3 as KanjiItem[],
  N2: n2 as KanjiItem[],
  N1: n1 as KanjiItem[],
};

/** Kanji theo sách giáo trình — bookId giống với vocab */
export const KANJI_BY_BOOK: Record<string, KanjiItem[]> = {
  "mimikara-n2": n2Mimikara as KanjiItem[],
};

export const ALL_KANJI: KanjiItem[] = [
  ...(n5 as KanjiItem[]),
  ...(n4 as KanjiItem[]),
  ...(n3 as KanjiItem[]),
  ...(n2 as KanjiItem[]),
  ...(n1 as KanjiItem[]),
];

/** Trả về danh sách Kanji theo cấp độ; nếu không có cấp hợp lệ → trả tất cả */
export function getKanji(level?: string): KanjiItem[] {
  const lvl = (level ?? "").toUpperCase();
  if (KANJI_BY_LEVEL[lvl]) return KANJI_BY_LEVEL[lvl];
  return ALL_KANJI;
}

/** Trả về danh sách Kanji theo bookId (ví dụ "mimikara-n2") */
export function getKanjiByBook(bookId: string): KanjiItem[] | null {
  return KANJI_BY_BOOK[bookId] ?? null;
}

export function getKanjiById(id: string): KanjiItem | undefined {
  // Tìm trong KANJI_BY_BOOK trước (mimikara, v.v.) rồi mới tìm ALL_KANJI
  for (const list of Object.values(KANJI_BY_BOOK)) {
    const found = list.find((k) => k.id === id);
    if (found) return found;
  }
  return ALL_KANJI.find((k) => k.id === id);
}
