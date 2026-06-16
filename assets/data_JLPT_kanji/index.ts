// ─────────────────────────────────────────────────────────────────────────────
// data_JLPT_kanji / index.ts
// Dữ liệu Kanji theo cấp độ JLPT (N5 → N1) - Kiến trúc On-Demand sửa triệt để lỗi trống mảng
// ─────────────────────────────────────────────────────────────────────────────

import n1 from "./n1.json";
import n2Mimikara from "./n2_mimikara.json";
import n2Soumatome from "./n2_soumatome.json";
import n3Mimikara from "./n3_mimikara.json";
import n3Soumatome from "./n3_soumatome.json";
import n4 from "./n4.json";
import n5 from "./n5.json";
import kanjifull from "./kanjifull.json";

import { ALL_VOCAB } from "../vocab";

// ─────────────────────────────────────────────────────────────────────────────
// INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

export interface KanjiComponent {
  kanji: string;
  hanViet?: string; 
}

export interface KanjiExample {
  jp: string;
  reading: string;
  vi: string;
}

export interface KanjiItem {
  id?: string;
  kanji: string;
  hanviet: string[];
  readings: {
    kunyomi: string[];
    onyomi: string[];
  };
  strokes: number;
  jlpt: string;
  freq?: number;
  grade?: number;
  components?: KanjiComponent[];
  meanings_vi: string[];
  meanings_en?: string[];
  book?: string;
  lesson?: number;
  week?: number;
  metadata?: {
    Unicode?: string;
    [key: string]: unknown;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS & NORMALIZER
// ─────────────────────────────────────────────────────────────────────────────

export function charToUnicode(char: string): string {
  if (!char) return "";
  const cp = char.codePointAt(0);
  if (cp === undefined) return "";
  return `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`;
}

function normalizeUnicode(input?: string | null): string | null {
  if (!input) return null;
  const m = input.trim().match(/^u\+?([0-9a-fA-F]{2,8})$/i);
  if (!m) return null;
  return `U+${m[1].toUpperCase().padStart(4, "0")}`;
}

export function unicodeToChar(input: string): string {
  const norm = normalizeUnicode(input);
  if (!norm) return input;
  try {
    return String.fromCodePoint(parseInt(norm.slice(2), 16));
  } catch {
    return input;
  }
}

function normalizeRawItem(item: any, defaultJlpt: string): KanjiItem {
  if (!item) return item;
  const kanjiChar = item.kanji || "";
  const unicodeStr = normalizeUnicode(item.metadata?.Unicode) || charToUnicode(kanjiChar);
  
  const kunyomi = Array.isArray(item.readings?.kunyomi) ? item.readings.kunyomi : 
                  (Array.isArray(item.kunyomi) ? item.kunyomi : []);
  const onyomi = Array.isArray(item.readings?.onyomi) ? item.readings.onyomi : 
                 (Array.isArray(item.onyomi) ? item.onyomi : []);

  let hanvietArr: string[] = [];
  if (Array.isArray(item.hanviet)) {
    hanvietArr = item.hanviet;
  } else if (typeof item.hanviet === 'string') {
    hanvietArr = item.hanviet.split(',').map((s: string) => s.trim());
  } else if (Array.isArray(item.hanViet)) {
    hanvietArr = item.hanViet;
  } else if (typeof item.hanViet === 'string') {
    hanvietArr = item.hanViet.split(',').map((s: string) => s.trim());
  }

  let meaningsVi: string[] = [];
  if (Array.isArray(item.meanings_vi)) {
    meaningsVi = item.meanings_vi;
  } else if (Array.isArray(item.meanings)) {   // ← THÊM DÒNG NÀY
    meaningsVi = item.meanings;                // ← THÊM DÒNG NÀY
  } else if (Array.isArray(item.nghia)) {
    meaningsVi = item.nghia;
  } else if (typeof item.nghia === 'string') {
    meaningsVi = [item.nghia];
  } else if (typeof item.meanings_vi === 'string') {
    meaningsVi = [item.meanings_vi];
  }

  let componentsArr: KanjiComponent[] = [];
  if (Array.isArray(item.components)) {
    componentsArr = item.components.map((c: any) => {
      if (typeof c === 'string') return { kanji: c, hanViet: "" };
      return { 
        kanji: c.kanji || "",
        hanViet: c.hanViet || c.hanviet || ""
      };
    });
  }

  return {
    ...item,
    id: unicodeStr, 
    kanji: kanjiChar,
    strokes: item.strokes !== undefined ? item.strokes : (item.so_net !== undefined ? item.so_net : 0),
    // jlpt: item.jlpt || defaultJlpt,
    jlpt: item.jlpt || item.level || defaultJlpt,
    hanviet: hanvietArr,
    readings: { kunyomi, onyomi },
    meanings_vi: meaningsVi,
    components: componentsArr,
    lesson: typeof item.lesson === 'number' ? item.lesson : undefined,
    week:   typeof item.week   === 'number' ? item.week   : undefined,
    metadata: {
      Unicode: unicodeStr,
      ...(item.metadata || {})
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// LAZY EVALUATION TRÁNH KHỞI TẠO CHẾT KHI APP START
// ─────────────────────────────────────────────────────────────────────────────

const rawBooks: Record<string, { data: any[]; level: string }> = {
  "n5": { data: n5, level: "N5" },
  "n4": { data: n4, level: "N4" },
  "mimikara-n3": { data: n3Mimikara, level: "N3" },
  "soumatome-n3": { data: n3Soumatome, level: "N3" },
  "mimikara-n2": { data: n2Mimikara, level: "N2" },
  "soumatome-n2": { data: n2Soumatome, level: "N2" },
  "n1": { data: n1, level: "N1" },
};

// Tạo một mảng phẳng thô từ các file JSON gốc (Rất nhanh và không bao giờ bị lỗi trống)
const ALL_RAW_ITEMS: { raw: any; defLvl: string }[] = [];
Object.keys(rawBooks).forEach(bookKey => {
  const target = rawBooks[bookKey];
  if (Array.isArray(target.data)) {
    target.data.forEach(item => {
      ALL_RAW_ITEMS.push({ raw: item, defLvl: target.level });
    });
  }
});

const KANJIFULL_LIST = Array.isArray(kanjifull) ? (kanjifull as any[]) : [];

// ─── Mảng tổng hợp DÙNG CHO SEARCH: kanjifull (ưu tiên đầu) + n5→n1, loại trùng theo kanji ───
const ALL_SEARCHABLE_KANJI: { raw: any; defLvl: string }[] = [];

const seenKanjiForSearch = new Set<string>();

// 1. Ưu tiên kanjifull.json trước — nếu trùng kanji thì giữ bản ghi từ kanjifull
KANJIFULL_LIST.forEach((item: any) => {
  if (item?.kanji && !seenKanjiForSearch.has(item.kanji)) {
    seenKanjiForSearch.add(item.kanji);
    ALL_SEARCHABLE_KANJI.push({ raw: item, defLvl: item.jlpt || '—' });
  }
});

// 2. Bổ sung phần còn lại từ n5→n1 (chỉ những kanji chưa có trong kanjifull)
ALL_RAW_ITEMS.forEach(x => {
  const kanjiChar = x.raw?.kanji;
  if (kanjiChar && !seenKanjiForSearch.has(kanjiChar)) {
    seenKanjiForSearch.add(kanjiChar);
    ALL_SEARCHABLE_KANJI.push(x);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT APIS (ĐƯỢC RE-WRITE CHỐNG TRẮNG HOÀN TOÀN)
// ─────────────────────────────────────────────────────────────────────────────

export function getKanji(level?: string, bookId?: string): KanjiItem[] {
  if (bookId && rawBooks[bookId]) {
    return rawBooks[bookId].data.map((item, index) => {
      const itemWithLesson = (item.lesson == null) ? {
        ...item,
        lesson: Math.floor(index / 6) + 1,
        week:   Math.floor(index / 36) + 1,
      } : item;
      return normalizeRawItem(itemWithLesson, rawBooks[bookId].level);
    });
  }
  const lvl = (level ?? "").toUpperCase();
  const filtered = ALL_RAW_ITEMS.filter(x => x.defLvl === lvl || (x.raw && x.raw.jlpt === lvl));
  return filtered.map(x => normalizeRawItem(x.raw, x.defLvl));
}

export function getKanjiByBook(bookId: string): KanjiItem[] {
  if (!rawBooks[bookId]) return [];
  return rawBooks[bookId].data.map((item, index) => {
    const itemWithLesson = (item.lesson == null) ? {
      ...item,
      lesson: Math.floor(index / 6) + 1,
      week:   Math.floor(index / 36) + 1,
    } : item;
    return normalizeRawItem(itemWithLesson, rawBooks[bookId].level);
  });
}

/**
 * Hàm tìm kiếm sửa lỗi: Quét trực tiếp trên mảng Raw tĩnh rồi mới Normalize đơn lẻ
 */
export function getKanjiById(id: string): KanjiItem | undefined {
  if (!id) return undefined;
  
  const normId = id.trim();
  const normUnicode = normalizeUnicode(normId) || charToUnicode(normId);

  // Bước 1: Quét trực tiếp trên dữ liệu thô JLPT
  const foundRaw = ALL_RAW_ITEMS.find(x => {
    if (!x.raw) return false;
    const itemUnicode = normalizeUnicode(x.raw.metadata?.Unicode) || charToUnicode(x.raw.kanji);
    return itemUnicode === normUnicode || x.raw.kanji === normId || x.raw.id === normId;
  });

  if (foundRaw) {
    return normalizeRawItem(foundRaw.raw, foundRaw.defLvl);
  }

  // Bước 2: Quét trực tiếp trên mảng dự phòng Kanjifull
  const full = KANJIFULL_LIST.find((item: any) => {
    const itemUnicode = normalizeUnicode(item.metadata?.Unicode) || charToUnicode(item.kanji);
    return itemUnicode === normUnicode || item.kanji === normId;
  });

  if (full) {
    return normalizeRawItem(full, full.jlpt || '—');
  }

  return undefined;
}

export function getKanjiByChar(kanjiChar: string): KanjiItem | undefined {
  return getKanjiById(kanjiChar);
}

export function getKanjiByCharFull(kanjiChar: string): KanjiItem | undefined {
  return getKanjiById(kanjiChar);
}

const sl = 15; // Số lượng câu ví dụ trong kanjidetalinline

export function getExamplesByKanjiChar(kanjiChar: string, limit = sl): KanjiExample[] {
  if (!kanjiChar) return [];
  const char = unicodeToChar(kanjiChar);
  const vocabList = Array.isArray(ALL_VOCAB) ? ALL_VOCAB : [];

  const seen = new Set<string>();
  const result: KanjiExample[] = [];

  for (const v of vocabList) {
    if (!v || !v.kanji || !v.hira) continue;
    if (!v.kanji.includes(char)) continue;

    // Khóa chống trùng: dựa trên kanji (có thể đổi thành `${v.kanji}|${v.hira}` nếu muốn chặt hơn)
    const key = v.kanji;
    if (seen.has(key)) continue;
    seen.add(key);

    result.push({
      jp: v.kanji,
      reading: v.hira,
      vi: v.nghia ?? '',
    });

    if (result.length >= limit) break;
  }

  return result;
}

export function searchKanji(keyword: string): KanjiItem[] {
  if (!keyword) return [];
  const lowerKeyword = keyword.toLowerCase();
  
  // const matchedRaw = ALL_RAW_ITEMS.filter(x => {
  const matchedRaw = ALL_SEARCHABLE_KANJI.filter(x => {
    if (!x.raw) return false;
    const item = normalizeRawItem(x.raw, x.defLvl);
    return (
      item.kanji.includes(keyword) ||
      item.hanviet.some(h => h.toLowerCase().includes(lowerKeyword)) ||
      item.meanings_vi.some(m => m.toLowerCase().includes(lowerKeyword))
    );
  });

  return matchedRaw.map(x => normalizeRawItem(x.raw, x.defLvl));
}

export function searchVocab(keyword: string, limit = 20): KanjiExample[] {
  if (!keyword) return [];
  const lowerKeyword = keyword.toLowerCase();
  const vocabList = Array.isArray(ALL_VOCAB) ? ALL_VOCAB : [];

  const seen = new Set<string>();
  const result: KanjiExample[] = [];

  for (const v of vocabList) {
    if (!v) continue;
    const kanjiStr = v.kanji ?? '';
    const hiraStr = v.hira ?? '';
    const meaningStr = (v.nghia ?? '').toString();

    const matched =
      kanjiStr.includes(keyword) ||
      hiraStr.includes(keyword) ||
      meaningStr.toLowerCase().includes(lowerKeyword);

    if (!matched) continue;

    const key = `${kanjiStr}|${hiraStr}`;
    if (seen.has(key)) continue;
    seen.add(key);

    result.push({ jp: kanjiStr, reading: hiraStr, vi: meaningStr });

    if (result.length >= limit) break;
  }

  return result;
}

export interface SearchAllResult {
  kanjiResults: KanjiItem[];
  vocabResults: KanjiExample[];
}

export function searchAll(keyword: string): SearchAllResult {
  const kanjiResults = searchKanji(keyword);

  const vocabResults = kanjiResults.length === 0
    ? searchVocab(keyword)
    : [];

  return { kanjiResults, vocabResults };
}