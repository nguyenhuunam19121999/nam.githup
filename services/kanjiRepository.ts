// ─────────────────────────────────────────────────────────────────────────────
// services/kanjiRepository.ts
// Thay thế các hàm trong assets/data_JLPT_kanji/index.ts
// Dùng SQLite thay vì import JSON trực tiếp
// ─────────────────────────────────────────────────────────────────────────────

import { getDb } from '../services/db';
import type { KanjiItem, KanjiExample } from '../assets/data_JLPT_kanji';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function parseRow(row: any): KanjiItem {
  if (!row) return row;
  return {
    id:          row.id,
    kanji:       row.kanji,
    hanviet:     safeParseJson(row.hanviet,     []),
    readings:    safeParseJson(row.readings,    { kunyomi: [], onyomi: [] }),
    meanings_vi: safeParseJson(row.meanings_vi, []),
    meanings_en: safeParseJson(row.meanings_en, []),
    components:  safeParseJson(row.components,  []),
    jlpt:        row.jlpt  || '—',
    freq:        row.freq  ?? undefined,
    strokes:     row.strokes ?? 0,
    grade:       row.grade ?? undefined,
    book:        row.book  ?? undefined,
    lesson:      row.lesson ?? undefined,
    week:        row.week   ?? undefined,
    metadata:    { Unicode: row.unicode },
  };
}

function safeParseJson<T>(val: any, fallback: T): T {
  if (val === null || val === undefined) return fallback;
  if (typeof val !== 'string') return val as T;
  try { return JSON.parse(val); } catch { return fallback; }
}

// ─────────────────────────────────────────────────────────────────────────────
// KANJI QUERIES — thay thế getKanjiByCharFull, getKanjiById, getKanjiByChar
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tìm kanji theo ký tự (thay thế getKanjiByCharFull / getKanjiById)
 * Ưu tiên kanjifull (source = 'kanjifull') nhờ INSERT OR REPLACE khi build DB
 */
export async function getKanjiByChar(char: string): Promise<KanjiItem | null> {
  if (!char) return null;
  const db = await getDb();
  const row = await db.getFirstAsync<any>(
    `SELECT * FROM kanji WHERE kanji = ? LIMIT 1`,
    [char.trim()]
  );
  return row ? parseRow(row) : null;
}

/**
 * Lấy danh sách kanji theo cấp JLPT (thay thế getKanji)
 */
export async function getKanjiByLevel(level: string): Promise<KanjiItem[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM kanji WHERE jlpt = ? ORDER BY freq ASC`,
    [level.toUpperCase()]
  );
  return rows.map(parseRow);
}

/**
 * Lấy danh sách kanji theo bookId (thay thế getKanjiByBook)
 */
export async function getKanjiByBook(bookId: string): Promise<KanjiItem[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM kanji WHERE book = ? ORDER BY lesson ASC, rowid ASC`,
    [bookId]
  );
  return rows.map(parseRow);
}

// ─────────────────────────────────────────────────────────────────────────────
// VÍ DỤ — thay thế getExamplesByKanjiChar
// Ưu tiên examples có sẵn trong kanji JSON, fallback sang bảng vocab
// ─────────────────────────────────────────────────────────────────────────────

export async function getExamplesByKanjiChar(
  kanjiChar: string,
  limit = 15
): Promise<KanjiExample[]> {
  if (!kanjiChar) return [];
  const db = await getDb();

  // Bước 1: Lấy examples có sẵn trong bảng kanji (từ field "examples" trong JSON)
  const kanjiRow = await db.getFirstAsync<any>(
    `SELECT examples FROM kanji WHERE kanji = ? LIMIT 1`,
    [kanjiChar.trim()]
  );
  const inlineExamples: KanjiExample[] = safeParseJson(kanjiRow?.examples, []);
  if (inlineExamples.length > 0) {
    return inlineExamples.slice(0, limit);
  }

  // Bước 2: Fallback — tìm trong bảng vocab (loại trùng theo jp)
  const rows = await db.getAllAsync<any>(
    `SELECT jp, hira, nghia FROM vocab
     WHERE jp LIKE ?
     GROUP BY jp
     LIMIT ?`,
    [`%${kanjiChar}%`, limit]
  );
  return rows.map(r => ({ jp: r.jp, reading: r.hira, vi: r.nghia }));
}

// ─────────────────────────────────────────────────────────────────────────────
// TÌM KIẾM — thay thế searchKanji, searchVocab, searchAll
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tìm kiếm kanji (thay thế searchKanji — bao gồm cả kanjifull)
 */
export async function searchKanji(keyword: string, limit = 50): Promise<KanjiItem[]> {
  if (!keyword) return [];
  const db = await getDb();
  const kw = `%${keyword}%`;
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM kanji
     WHERE kanji       LIKE ?
        OR hanviet     LIKE ?
        OR meanings_vi LIKE ?
     ORDER BY
       CASE WHEN kanji = ? THEN 0
            WHEN kanji LIKE ? THEN 1
            ELSE 2 END,
       freq ASC
     LIMIT ?`,
    [kw, kw, kw, keyword, `${keyword}%`, limit]
  );
  return rows.map(parseRow);
}

/**
 * Tìm kiếm từ vựng (thay thế searchVocab)
 */
export async function searchVocab(keyword: string, limit = 20): Promise<KanjiExample[]> {
  if (!keyword) return [];
  const db = await getDb();
  const kw = `%${keyword}%`;
  const rows = await db.getAllAsync<any>(
    `SELECT jp, hira, nghia FROM vocab
     WHERE jp    LIKE ?
        OR hira  LIKE ?
        OR nghia LIKE ?
     GROUP BY jp
     LIMIT ?`,
    [kw, kw, kw, limit]
  );
  return rows.map(r => ({ jp: r.jp, reading: r.hira, vi: r.nghia }));
}

/**
 * Tìm kiếm tổng hợp với fallback (thay thế searchAll)
 * - Tìm kanji trước
 * - Nếu không có kết quả → tìm trong vocab
 */
export async function searchAll(keyword: string): Promise<{
  kanjiResults: KanjiItem[];
  vocabResults: KanjiExample[];
}> {
  const kanjiResults = await searchKanji(keyword);
  const vocabResults = kanjiResults.length === 0
    ? await searchVocab(keyword)
    : [];
  return { kanjiResults, vocabResults };
}