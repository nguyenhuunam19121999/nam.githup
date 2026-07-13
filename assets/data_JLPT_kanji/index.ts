// ─────────────────────────────────────────────────────────────────────────────
// data_JLPT_kanji / index.ts
// Dữ liệu Kanji theo cấp độ JLPT (N5 → N1) - Kiến trúc On-Demand sửa triệt để lỗi trống mảng
// ─────────────────────────────────────────────────────────────────────────────

import { initDb } from "../../services/db";



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
  readings: { kunyomi: string[]; onyomi: string[]; };
  strokes?: number;
  jlpt: string;
  freq?: number;
  grade?: number;
  components?: KanjiComponent[];
  meanings_vi: string[];
  meanings_en?: string[];
  book?: string;
  lesson?: number;
  week?: number;
  metadata?: { Unicode?: string; [key: string]: unknown; };
  wordType?: string;
  typeLabel?: string;
  isExpression?: boolean;
  isSuffix?: boolean;
  isConjugatedForm?: boolean;
  conjugatedForm?: string | null;
  isExtractedVerb?: boolean;
  extractedVerb?: string | null;
  isNaAdjective?: boolean;
  naBaseWord?: string | null;
  displayForm?: string | null;
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

function capitalizeFirst(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function normalizeRawItem(item: any, defaultJlpt: string, index?: number): KanjiItem {
  if (!item) return item;
  const kanjiChar = item.kanji || "";
  const kanjiCharCount = [...kanjiChar.replace(/\s+/g, '')].length;
  const unicodeStr = kanjiCharCount > 1
    ? `${kanjiChar.replace(/\s+/g, '_')}${index !== undefined ? `_${index}` : ''}`
    : (normalizeUnicode(item.metadata?.Unicode) || charToUnicode(kanjiChar));
  
  const kunyomi = Array.isArray(item.readings?.kunyomi) ? item.readings.kunyomi : 
                  (Array.isArray(item.kunyomi) ? item.kunyomi : []);
  const onyomi = Array.isArray(item.readings?.onyomi) ? item.readings.onyomi : 
                 (Array.isArray(item.onyomi) ? item.onyomi : []);

  let hanvietArr: string[] = [];
  if (Array.isArray(item.hanviet)) {
    hanvietArr = item.hanviet.map(capitalizeFirst);
  } else if (typeof item.hanviet === 'string') {
    hanvietArr = item.hanviet.split(',').map((s: string) => capitalizeFirst(s.trim()));
  } else if (Array.isArray(item.hanViet)) {
    hanvietArr = item.hanViet.map(capitalizeFirst);
  } else if (typeof item.hanViet === 'string') {
    hanvietArr = item.hanViet.split(',').map((s: string) => capitalizeFirst(s.trim()));
  }

  let meaningsVi: string[] = [];
  if (Array.isArray(item.meanings_vi)) {
    meaningsVi = item.meanings_vi.map(capitalizeFirst);
  } else if (Array.isArray(item.meanings)) {
    meaningsVi = item.meanings.map(capitalizeFirst);
  } else if (Array.isArray(item.nghia)) {
    meaningsVi = item.nghia.map(capitalizeFirst);
  } else if (typeof item.nghia === 'string') {
    meaningsVi = [capitalizeFirst(item.nghia)];
  } else if (typeof item.meanings_vi === 'string') {
    meaningsVi = [capitalizeFirst(item.meanings_vi)];
  }

  return {
    ...item,
    id: unicodeStr, 
    kanji: kanjiChar,
    strokes: item.strokes !== undefined ? item.strokes : (item.so_net !== undefined ? item.so_net : 0),
    jlpt: item.jlpt || item.level || defaultJlpt,
    hanviet: hanvietArr,
    readings: { kunyomi, onyomi },
    meanings_vi: meaningsVi,
    lesson: typeof item.lesson === 'number' ? item.lesson : undefined,
    week:   typeof item.week   === 'number' ? item.week   : undefined,
    metadata: {
      Unicode: unicodeStr,
      ...(item.metadata || {})
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT APIS
// ─────────────────────────────────────────────────────────────────────────────

let _kanjiDb: any | null = null;
let _kanjiDbPromise: Promise<any | null> | null = null;

function getKanjiDbHandle(): any | null {
  if (_kanjiDb) return _kanjiDb;
  if (!_kanjiDbPromise) {
    _kanjiDbPromise = initDb().then((db) => {
      _kanjiDb = db;
      return db;
    }).catch(() => null);
  }
  return null;
}

let _kanjiDbWarningShown = false;

function getDbOrNull(): any | null {
  const db = getKanjiDbHandle();
  if (!db && !_kanjiDbWarningShown) {
    console.warn('[kanji] SQLite DB unavailable; returning no data');
    _kanjiDbWarningShown = true;
  }
  return db;
}

function stripInvisible(s: string): string {
  return s.replace(/[\u200B-\u200D\uFEFF\uFE00-\uFE0F]/g, '').trim();
}

function parseJsonValue<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value !== 'string') return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function normalizeDbKanjiRow(row: any): KanjiItem | null {
  if (!row) return null;
  return {
    id: row.id ?? undefined,
    kanji: row.kanji ?? '',
    hanviet: parseJsonValue<string[]>(row.hanviet, []),
    readings: parseJsonValue<{ kunyomi: string[]; onyomi: string[] }>(row.readings, { kunyomi: [], onyomi: [] }),
    strokes: row.strokes ?? undefined,
    jlpt: row.jlpt ?? '—',
    freq: row.freq ?? undefined,
    grade: row.grade ?? undefined,
    meanings_vi: parseJsonValue<string[]>(row.meanings_vi, []),
    meanings_en: parseJsonValue<string[]>(row.meanings_en, []),
    metadata: parseJsonValue<{ Unicode?: string; [key: string]: unknown }>(row.metadata, { Unicode: row.id ?? undefined }),
    book: row.book ?? undefined,
    lesson: row.lesson ?? undefined,
    week: row.week ?? undefined,
  };
}

export function getKanji(level?: string, bookId?: string): KanjiItem[] {
  const db = getDbOrNull();
  if (!db) return [];

  if (bookId) {
    const rows = db.getAllSync(`SELECT * FROM kanji_book_vocab WHERE book = ? ORDER BY week, lesson, rowid`, [bookId]);
    return rows.map(normalizeDbKanjiRow).filter(Boolean) as KanjiItem[];
  }

  const levelKey = (level ?? '').toUpperCase();
  if (levelKey) {
    const rows = db.getAllSync(`SELECT * FROM kanji WHERE jlpt = ? ORDER BY id`, [levelKey]);
    return rows.map(normalizeDbKanjiRow).filter(Boolean) as KanjiItem[];
  }

  return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Cấu hình số tuần / số bài mỗi tuần cho từng sách — CHỈ dùng khi JSON gốc
// không có sẵn week/lesson (fallback tự chia đều). Nếu DB đã có week/lesson
// thì luôn ưu tiên dùng nguyên giá trị đó, KHÔNG áp dụng bảng này.
// Con số lấy theo đúng BOOK_CONFIGS trong app/level-book.tsx và
// PARTS trong app/soumatome-n2.tsx để khớp với UI hiển thị.
// ─────────────────────────────────────────────────────────────────────────────
export interface LessonConfig {
  weeks: number;
  lessonsPerWeek: number;
}

export const KANJI_BOOK_CONFIG: Record<string, LessonConfig> = {
  "n5":           { weeks: 5, lessonsPerWeek: 5 }, // JLPT N5 — 5 tuần, 6 bài/tuần
  "n4":           { weeks: 5, lessonsPerWeek: 5 }, // JLPT N4 — 5 tuần, 4 bài/tuần
  "n1":           { weeks: 6, lessonsPerWeek: 6 }, // JLPT N1 — 6 tuần, 6 bài/tuần
  "mimikara-n3":  { weeks: 6, lessonsPerWeek: 6 }, // Mimikara N3 — 6 tuần, 6 bài/tuần
  "mimikara-n2":  { weeks: 6, lessonsPerWeek: 6 }, // Mimikara N2 — 6 tuần, 6 bài/tuần
  "soumatome-n3": { weeks: 6, lessonsPerWeek: 6 }, // Soumatome N3 — 6 tuần, 6 bài/tuần
  "soumatome-n2": { weeks: 8, lessonsPerWeek: 6 }, // Soumatome N2 — 8 tuần, 6 bài/tuần
};

const DEFAULT_KANJI_CONFIG: LessonConfig = { weeks: 6, lessonsPerWeek: 6 };

// export function getKanjiByBook(bookId: string): KanjiItem[] {
//   const db = getDbOrNull();
//   if (!db) return [];

//   const rows = db.getAllSync(`SELECT * FROM kanji_book_vocab WHERE book = ? ORDER BY id ASC`, [bookId]);
//   const data = rows.map(normalizeDbKanjiRow).filter(Boolean) as KanjiItem[];
//   if (data.length === 0) return [];

//   // Ưu tiên dùng lesson có sẵn trong DB — chỉ tính lại cho các mục thiếu lesson
//   const hasWeekInJson = data.some((item) => item.week != null);
//   const allHaveLesson = data.every((item) => item.lesson != null);

//   if (allHaveLesson) {
//     // Mọi mục đã có sẵn lesson từ DB (JSON gốc có week/lesson đầy đủ) → dùng nguyên
//     return data;
//   }

//   if (!hasWeekInJson) {
//     // JSON gốc KHÔNG có week/lesson — chia đều CHÍNH XÁC vào đúng số tuần/số bài
//     // đã cấu hình trong KANJI_BOOK_CONFIG. Dùng phần dư (remainder distribution)
//     // để đảm bảo dùng hết đủ totalSlots bài, không bị thiếu bài cuối.
//     const config = KANJI_BOOK_CONFIG[bookId] ?? DEFAULT_KANJI_CONFIG;
//     const totalSlots = config.weeks * config.lessonsPerWeek;
//     const total = data.length;
//     const base = Math.floor(total / totalSlots);
//     const remainder = total % totalSlots;
//     // `remainder` bài đầu tiên nhận (base + 1) mục, các bài còn lại nhận base mục.
//     // Nếu total < totalSlots, base = 0 và chỉ `remainder` bài đầu có 1 mục,
//     // các bài sau sẽ trống — không tránh được vì không đủ dữ liệu để lấp đầy.

//     const result: KanjiItem[] = [];
//     let idx = 0;
//     for (let slot = 0; slot < totalSlots; slot++) {
//       const countForThisSlot = base + (slot < remainder ? 1 : 0);
//       const week = Math.floor(slot / config.lessonsPerWeek) + 1;
//       const lesson = slot + 1;
//       for (let k = 0; k < countForThisSlot && idx < total; k++, idx++) {
//         result.push({ ...data[idx], week, lesson });
//       }
//     }
//     return result;
//   }

//   // Chỉ những mục thiếu lesson mới cần tự tính lại, theo từng tuần
//   const byWeek: Record<number, KanjiItem[]> = {};
//   data.forEach((item) => {
//     const w = typeof item.week === 'number' ? item.week : 1;
//     if (!byWeek[w]) byWeek[w] = [];
//     byWeek[w].push(item);
//   });

//   const result: KanjiItem[] = [];
//   Object.keys(byWeek).map(Number).sort((a, b) => a - b).forEach((w) => {
//     const weekItems = byWeek[w];

//     const withLesson = weekItems.filter((item) => item.lesson != null);
//     const withoutLesson = weekItems.filter((item) => item.lesson == null);

//     result.push(...withLesson.map((item) => ({ ...item, week: w })));

//     if (withoutLesson.length > 0) {
//       const config = KANJI_BOOK_CONFIG[bookId] ?? DEFAULT_KANJI_CONFIG;
//       const itemsPerLesson = Math.ceil(withoutLesson.length / config.lessonsPerWeek);
//       withoutLesson.forEach((item, posInWeek) => {
//         const lessonInWeek = Math.min(
//           Math.floor(posInWeek / Math.max(1, itemsPerLesson)),
//           config.lessonsPerWeek - 1,
//         );
//         const globalLesson = (w - 1) * config.lessonsPerWeek + lessonInWeek + 1;
//         result.push({ ...item, week: w, lesson: globalLesson });
//       });
//     }
//   });

//   return result;
// }

export function getKanjiByBook(bookId: string): KanjiItem[] {
  const LOG = (...args: any[]) => console.log('[kanji]', `[${bookId}]`, ...args);

  const db = getDbOrNull();
  if (!db) {
    LOG('❌ DB handle null — chưa init hoặc init lỗi');
    return [];
  }

  const rows = db.getAllSync(`SELECT * FROM kanji_book_vocab WHERE book = ? ORDER BY id ASC`, [bookId]);
  LOG('query WHERE book =', JSON.stringify(bookId), '→', rows.length, 'dòng');

  const data = rows.map(normalizeDbKanjiRow).filter(Boolean) as KanjiItem[];

  if (data.length === 0) {
    const distinctBooks = db.getAllSync(`SELECT DISTINCT book FROM kanji_book_vocab`);
    LOG('⚠️ 0 dòng khớp book. Các giá trị "book" đang có trong bảng:', JSON.stringify(distinctBooks));
    return [];
  }

  // Ưu tiên dùng lesson có sẵn trong DB — chỉ tính lại cho các mục thiếu lesson
  const hasWeekInJson = data.some((item: KanjiItem) => item.week != null);
  const allHaveLesson = data.every((item: KanjiItem) => item.lesson != null);
  const weekNullCount = data.filter((item: KanjiItem) => item.week == null).length;
  const lessonNullCount = data.filter((item: KanjiItem) => item.lesson == null).length;

  LOG(`total=${data.length}  week=null: ${weekNullCount}  lesson=null: ${lessonNullCount}  hasWeekInJson=${hasWeekInJson}  allHaveLesson=${allHaveLesson}`);

  if (allHaveLesson) {
    // Mọi mục đã có sẵn lesson từ DB (JSON gốc có week/lesson đầy đủ) → dùng nguyên
    LOG('✅ Nhánh: allHaveLesson → dùng nguyên dữ liệu DB, không tự tính');
    return data;
  }

  const config = KANJI_BOOK_CONFIG[bookId] ?? DEFAULT_KANJI_CONFIG;
  LOG('config dùng:', JSON.stringify(config), bookId in KANJI_BOOK_CONFIG ? '(khớp bookId)' : '⚠️ (fallback DEFAULT vì bookId không có trong KANJI_BOOK_CONFIG)');

  if (!hasWeekInJson) {
    // JSON gốc KHÔNG có week/lesson — chia đều CHÍNH XÁC vào đúng số tuần/số bài
    // đã cấu hình trong KANJI_BOOK_CONFIG. Dùng phần dư (remainder distribution)
    // để đảm bảo dùng hết đủ totalSlots bài, không bị thiếu bài cuối.
    LOG('Nhánh: !hasWeekInJson → tự chia đều toàn bộ theo config (remainder distribution)');
    const totalSlots = config.weeks * config.lessonsPerWeek;
    const total = data.length;
    const base = Math.floor(total / totalSlots);
    const remainder = total % totalSlots;
    LOG(`totalSlots=${totalSlots}  base=${base}/bài  remainder=${remainder} bài đầu +1`);

    const result: KanjiItem[] = [];
    let idx = 0;
    for (let slot = 0; slot < totalSlots; slot++) {
      const countForThisSlot = base + (slot < remainder ? 1 : 0);
      const week = Math.floor(slot / config.lessonsPerWeek) + 1;
      const lesson = slot + 1;
      for (let k = 0; k < countForThisSlot && idx < total; k++, idx++) {
        result.push({ ...data[idx], week, lesson });
      }
    }
    LOG(`✅ Kết quả trả về: ${result.length} mục, ${totalSlots} bài`);
    return result;
  }

  // Chỉ những mục thiếu lesson mới cần tự tính lại, theo từng tuần
  LOG('Nhánh: có week sẵn, chỉ thiếu lesson ở một số mục → tính lại theo từng tuần');
  const byWeek: Record<number, KanjiItem[]> = {};
  data.forEach((item) => {
    const w = typeof item.week === 'number' ? item.week : 1;
    if (!byWeek[w]) byWeek[w] = [];
    byWeek[w].push(item);
  });
  LOG('Số tuần thực tế tìm thấy trong data:', Object.keys(byWeek).length);

  const result: KanjiItem[] = [];
  Object.keys(byWeek).map(Number).sort((a, b) => a - b).forEach((w) => {
    const weekItems = byWeek[w];

    const withLesson = weekItems.filter((item) => item.lesson != null);
    const withoutLesson = weekItems.filter((item) => item.lesson == null);

    result.push(...withLesson.map((item) => ({ ...item, week: w })));

    if (withoutLesson.length > 0) {
      const itemsPerLesson = Math.ceil(withoutLesson.length / config.lessonsPerWeek);
      withoutLesson.forEach((item, posInWeek) => {
        const lessonInWeek = Math.min(
          Math.floor(posInWeek / Math.max(1, itemsPerLesson)),
          config.lessonsPerWeek - 1,
        );
        const globalLesson = (w - 1) * config.lessonsPerWeek + lessonInWeek + 1;
        result.push({ ...item, week: w, lesson: globalLesson });
      });
    }
  });

  LOG(`✅ Kết quả trả về: ${result.length} mục`);
  return result;
}

export function getKanjiById(id: string): KanjiItem | undefined {
  if (!id) return undefined;
  const db = getDbOrNull();
  if (!db) return undefined;

  const normId = stripInvisible(id).trim();
  const unicodeId = normalizeUnicode(normId) || charToUnicode(normId);
  const row = db.getFirstSync(
    `SELECT * FROM kanji WHERE kanji = ? OR id = ? OR id = ? LIMIT 1`,
    [normId, normId, unicodeId]
  );
  return normalizeDbKanjiRow(row) ?? undefined;
}

export async function getKanjiByCharAsync(kanjiChar: string): Promise<KanjiItem | undefined> {
  const db = getDbOrNull();
  if (!db) return undefined;

  const normId = stripInvisible(kanjiChar).trim();
  const unicodeId = normalizeUnicode(normId) || charToUnicode(normId);
  const row = db.getFirstSync(
    `SELECT * FROM kanji WHERE kanji = ? OR id = ? OR id = ? LIMIT 1`,
    [normId, normId, unicodeId]
  );
  return normalizeDbKanjiRow(row) ?? undefined;
}

export function getKanjiByChar(kanjiChar: string): KanjiItem | undefined {
  return getKanjiById(kanjiChar);
}

export function getKanjiByCharFull(kanjiChar: string): KanjiItem | undefined {
  return getKanjiById(kanjiChar);
}

export function getKunyomiFromFull(kanjiStr: string): string[] {
  const firstChar = [...kanjiStr.replace(/\s+/g, '')][0];
  if (!firstChar) return [];
  const full = getKanjiByCharFull(firstChar);
  return full?.readings?.kunyomi ?? [];
}

const sl = 15;

export function getExamplesByKanjiChar(kanjiChar: string, limit = sl): KanjiExample[] {
  if (!kanjiChar) return [];
  const db = getDbOrNull();
  if (!db) return [];

  const rows = db.getAllSync(`SELECT kanji, hira, nghia FROM vocab WHERE kanji LIKE ? ORDER BY id LIMIT ?`, [`%${kanjiChar}%`, limit]);
  return rows.map((row: any) => ({ jp: row.kanji, reading: row.hira, vi: row.nghia ?? '' }));
}

export function searchKanji(keyword: string): KanjiItem[] {
  if (!keyword) return [];
  const db = getDbOrNull();
  if (!db) return [];

  const kw = `%${keyword}%`;
  const rows = db.getAllSync(`SELECT * FROM kanji WHERE kanji LIKE ? OR hanviet LIKE ? OR meanings_vi LIKE ? ORDER BY id LIMIT 100`, [kw, kw, kw]);
  return rows.map(normalizeDbKanjiRow).filter(Boolean) as KanjiItem[];
}

export function searchVocab(keyword: string, limit = 20): KanjiExample[] {
  if (!keyword) return [];
  const db = getDbOrNull();
  if (!db) return [];

  const kw = `%${keyword}%`;
  const rows = db.getAllSync(`SELECT kanji, hira, nghia FROM vocab WHERE kanji LIKE ? OR hira LIKE ? OR nghia LIKE ? ORDER BY id LIMIT ?`, [kw, kw, kw, limit]);
  return rows.map((row: any) => ({ jp: row.kanji, reading: row.hira, vi: row.nghia ?? '' }));
}

export interface SearchAllResult {
  kanjiResults: KanjiItem[];
  vocabResults: KanjiExample[];
}

export function searchAll(keyword: string): SearchAllResult {
  const kanjiResults = searchKanji(keyword);
  const vocabResults = kanjiResults.length === 0 ? searchVocab(keyword) : [];
  return { kanjiResults, vocabResults };
}

export async function ensureKanjiDbReady(): Promise<boolean> {
  if (_kanjiDb) return true;
  const db = await initDb();
  _kanjiDb = db;
  return !!db;
}