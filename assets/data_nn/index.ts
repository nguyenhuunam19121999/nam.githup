import { getDb } from "../../services/db";

export interface GrammarItem {
  id: string;
  pattern: string;
  phienAm: string;
  meaning: string;
  level: "N5" | "N4" | "N3" | "N2" | "N1";
  structure: string;
  explanation: string;
  notes?: string;
  caution?: string;
  related_forms?: string[];
  book?: string;
  week?: number;
  week_theme?: string;
  day?: number;
  day_title?: string;
  examples?: { jp: string; paraphrase?: string; vi: string }[];
}

export const GRAMMAR_BY_BOOK: Record<string, GrammarItem[]> = {};
export const GRAMMAR_BY_LEVEL: Record<string, GrammarItem[]> = {};
export const ALL_GRAMMAR: GrammarItem[] = [];

let _grammarDb: any | null = null;
let _grammarDbPromise: Promise<any | null> | null = null;

function getGrammarDbHandle(): any | null {
  if (_grammarDb) return _grammarDb;
  if (!_grammarDbPromise) {
    _grammarDbPromise = getDb('grammar').then((db) => {
      _grammarDb = db;
      return db;
    }).catch(() => null);
  }
  return null;
}

function normalizeRow(row: any): GrammarItem {
  return {
    id: row.id,
    pattern: row.pattern ?? "",
    phienAm: row.phienAm ?? "",
    meaning: row.meaning ?? "",
    level: (row.level as GrammarItem['level']) ?? "N5",
    structure: row.structure ?? "",
    explanation: row.explanation ?? "",
    notes: row.notes ?? undefined,
    caution: row.caution ?? undefined,
    related_forms: typeof row.related_forms === 'string' ? JSON.parse(row.related_forms) : row.related_forms,
    book: row.book ?? undefined,
    week: row.week ?? undefined,
    week_theme: row.week_theme ?? undefined,
    day: row.day ?? undefined,
    day_title: row.day_title ?? undefined,
    examples: typeof row.examples === 'string' ? JSON.parse(row.examples) : row.examples,
  };
}

export function getGrammar(level?: string, bookId?: string): GrammarItem[] {
  const db = getGrammarDbHandle();
  if (!db) return [];

  if (bookId) {
    const rows = db.getAllSync(`SELECT * FROM grammar WHERE book = ? ORDER BY id ASC`, [bookId]);
    return rows.map(normalizeRow);
  }

  const lvl = (level ?? "").toUpperCase();
  if (lvl) {
    const rows = db.getAllSync(`SELECT * FROM grammar WHERE level = ? ORDER BY id ASC`, [lvl]);
    return rows.map(normalizeRow);
  }

  const rows = db.getAllSync(`SELECT * FROM grammar ORDER BY id ASC`);
  return rows.map(normalizeRow);
}

export async function getGrammarByIdAsync(id: string): Promise<GrammarItem | undefined> {
  if (!id) return undefined;
  const db: any = await getDb('grammar');
  if (!db) return undefined;
  const row = await db.getFirstAsync(`SELECT * FROM grammar WHERE id = ? LIMIT 1`, [id]);
  return row ? normalizeRow(row) : undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cấu hình số tuần / số ngày mỗi tuần cho từng sách — CHỈ dùng khi JSON gốc
// không có sẵn week/day (fallback tự chia đều). Nếu DB đã có week/day thì
// luôn ưu tiên dùng nguyên giá trị đó, KHÔNG áp dụng bảng này.
// Số "weeks" đồng bộ với grammarWeeks trong app/level-book.tsx (BOOK_META)
// và với PARTS trong app/soumatome-n2.tsx.
// ─────────────────────────────────────────────────────────────────────────────
export interface LessonConfig {
  weeks: number;
  daysPerWeek: number;
}

// Bảng `grammar` KHÔNG lưu book dạng "mimikara-n3"/"soumatome-n2" — chỉ lưu
// book="mimikara"/"soumatome" (dùng chung cho cả N3 và N2) và phân biệt qua
// cột level="N3"/"N2". n5/n4/n1 thì book khớp trực tiếp, không cần level.
const GRAMMAR_BOOK_ALIAS: Record<string, { book: string; level?: string }> = {
  "n5": { book: "n5" },
  "n4": { book: "n4" },
  "n1": { book: "n1" },
  "mimikara-n3":  { book: "mimikara",  level: "N3" },
  "mimikara-n2":  { book: "mimikara",  level: "N2" },
  "soumatome-n3": { book: "soumatome", level: "N3" },
  "soumatome-n2": { book: "soumatome", level: "N2" },
};

export const GRAMMAR_BOOK_CONFIG: Record<string, LessonConfig> = {
  "n5":           { weeks: 4, daysPerWeek: 6 }, // JLPT N5
  "n4":           { weeks: 5, daysPerWeek: 6 }, // JLPT N4
  "n1":           { weeks: 8, daysPerWeek: 6 }, // JLPT N1
  "soumatome-n3": { weeks: 6, daysPerWeek: 6 }, // Soumatome N3
  "mimikara-n3":  { weeks: 4, daysPerWeek: 6 }, // Mimikara N3
  "mimikara-n2":  { weeks: 4, daysPerWeek: 6 }, // Mimikara N2
  "soumatome-n2": { weeks: 8, daysPerWeek: 6 }, // Soumatome N2
};

const DEFAULT_GRAMMAR_CONFIG: LessonConfig = { weeks: 6, daysPerWeek: 6 };

// export function getGrammarByBook(bookId: string): GrammarItem[] {
//   const db = getGrammarDbHandle();
//   if (!db) return [];

//   const rows = db.getAllSync(`SELECT * FROM grammar WHERE book = ? ORDER BY id ASC`, [bookId]);
//   const data = rows.map(normalizeRow);
//   if (data.length === 0) return [];

//   const hasWeekInJson = data.some((item: GrammarItem) => item.week != null);
//   const allHaveDay = data.every((item: GrammarItem) => item.day != null);

//   if (allHaveDay) {
//     // Mọi mục đã có sẵn day từ DB → dùng nguyên, không đụng vào
//     return data;
//   }

//   const config = GRAMMAR_BOOK_CONFIG[bookId] ?? DEFAULT_GRAMMAR_CONFIG;

//   if (!hasWeekInJson) {
//     // JSON gốc KHÔNG có week/day — chia đều CHÍNH XÁC theo config,
//     // dùng remainder distribution để không thiếu slot cuối (giống kanji/vocab).
//     const totalSlots = config.weeks * config.daysPerWeek;
//     const total = data.length;
//     const base = Math.floor(total / totalSlots);
//     const remainder = total % totalSlots;

//     const result: GrammarItem[] = [];
//     let idx = 0;
//     for (let slot = 0; slot < totalSlots; slot++) {
//       const countForThisSlot = base + (slot < remainder ? 1 : 0);
//       const week = Math.floor(slot / config.daysPerWeek) + 1;
//       const day = (slot % config.daysPerWeek) + 1;
//       for (let k = 0; k < countForThisSlot && idx < total; k++, idx++) {
//         result.push({ ...data[idx], week, day });
//       }
//     }
//     return result;
//   } 

//   // Có week sẵn, chỉ thiếu day ở một số mục — tính lại theo từng tuần,
//   // cũng dùng remainder distribution thay vì Math.ceil (tránh bug thiếu ngày cuối).
//   const byWeek: Record<number, GrammarItem[]> = {};
//   data.forEach((item: GrammarItem) => {
//     const w = typeof item.week === 'number' ? item.week : 1;
//     if (!byWeek[w]) byWeek[w] = [];
//     byWeek[w].push(item);
//   });

//   const result: GrammarItem[] = [];
//   Object.keys(byWeek).map(Number).sort((a, b) => a - b).forEach((w) => {
//     const weekItems = byWeek[w];
//     const withDay = weekItems.filter((item) => item.day != null);
//     const withoutDay = weekItems.filter((item) => item.day == null);

//     result.push(...withDay.map((item) => ({ ...item, week: w })));

//     if (withoutDay.length > 0) {
//       const totalInWeek = withoutDay.length;
//       const base = Math.floor(totalInWeek / config.daysPerWeek);
//       const remainder = totalInWeek % config.daysPerWeek;
//       let idx = 0;
//       for (let d = 0; d < config.daysPerWeek; d++) {
//         const countForThisDay = base + (d < remainder ? 1 : 0);
//         for (let k = 0; k < countForThisDay && idx < totalInWeek; k++, idx++) {
//           result.push({ ...withoutDay[idx], week: w, day: d + 1 });
//         }
//       }
//     }
//   });

//   return result;
// }

export function getGrammarByBook(bookId: string): GrammarItem[] {
  const LOG = (...args: any[]) => console.log('[grammar]', `[${bookId}]`, ...args);

  const db = getGrammarDbHandle();
  if (!db) {
    LOG('❌ DB handle null — chưa init hoặc init lỗi');
    return [];
  }

  const alias = GRAMMAR_BOOK_ALIAS[bookId] ?? { book: bookId };
  LOG('alias resolve →', JSON.stringify(alias));

  const rows = alias.level
    ? db.getAllSync(`SELECT * FROM grammar WHERE book = ? AND level = ? ORDER BY id ASC`, [alias.book, alias.level])
    : db.getAllSync(`SELECT * FROM grammar WHERE book = ? ORDER BY id ASC`, [alias.book]);

  LOG('query →', rows.length, 'dòng');

  if (rows.length === 0) {
    const distinctBooks = db.getAllSync(`SELECT DISTINCT book FROM grammar`);
    const distinctLevels = db.getAllSync(`SELECT DISTINCT level FROM grammar`);
    LOG('⚠️ 0 dòng khớp. book/level hiện có:', JSON.stringify(distinctBooks), JSON.stringify(distinctLevels));
    return [];
  }

  const data = rows.map(normalizeRow);

  const hasWeekInJson = data.some((item: GrammarItem) => item.week != null);
  const allHaveDay = data.every((item: GrammarItem) => item.day != null);
  const weekNullCount = data.filter((item: GrammarItem) => item.week == null).length;
const dayNullCount = data.filter((item: GrammarItem) => item.day == null).length;

  LOG(`total=${data.length}  week=null: ${weekNullCount}  day=null: ${dayNullCount}  hasWeekInJson=${hasWeekInJson}  allHaveDay=${allHaveDay}`);

  if (allHaveDay) {
    LOG('✅ Nhánh: allHaveDay → dùng nguyên dữ liệu DB, không tự tính');
    return data;
  }

  const config = GRAMMAR_BOOK_CONFIG[bookId] ?? DEFAULT_GRAMMAR_CONFIG;
  LOG('config dùng:', JSON.stringify(config), bookId in GRAMMAR_BOOK_CONFIG ? '(khớp bookId)' : '⚠️ (fallback DEFAULT vì bookId không có trong GRAMMAR_BOOK_CONFIG)');

  if (!hasWeekInJson) {
    LOG('Nhánh: !hasWeekInJson → tự chia đều toàn bộ theo config (remainder distribution)');
    const totalSlots = config.weeks * config.daysPerWeek;
    const total = data.length;
    const base = Math.floor(total / totalSlots);
    const remainder = total % totalSlots;
    LOG(`totalSlots=${totalSlots}  base=${base}/slot  remainder=${remainder} slot đầu +1`);

    const result: GrammarItem[] = [];
    let idx = 0;
    for (let slot = 0; slot < totalSlots; slot++) {
      const countForThisSlot = base + (slot < remainder ? 1 : 0);
      const week = Math.floor(slot / config.daysPerWeek) + 1;
      const day = (slot % config.daysPerWeek) + 1;
      for (let k = 0; k < countForThisSlot && idx < total; k++, idx++) {
        result.push({ ...data[idx], week, day });
      }
    }
    LOG(`✅ Kết quả trả về: ${result.length} mục, ${totalSlots} slot (tuần×ngày)`);
    return result;
  }

  LOG('Nhánh: có week sẵn, chỉ thiếu day ở một số mục → tính lại theo từng tuần');
  const byWeek: Record<number, GrammarItem[]> = {};
  data.forEach((item: GrammarItem) => {
    const w = typeof item.week === 'number' ? item.week : 1;
    if (!byWeek[w]) byWeek[w] = [];
    byWeek[w].push(item);
  });
  LOG('Số tuần thực tế tìm thấy trong data:', Object.keys(byWeek).length);

  const result: GrammarItem[] = [];
  Object.keys(byWeek).map(Number).sort((a, b) => a - b).forEach((w) => {
    const weekItems = byWeek[w];
    const withDay = weekItems.filter((item) => item.day != null);
    const withoutDay = weekItems.filter((item) => item.day == null);

    result.push(...withDay.map((item) => ({ ...item, week: w })));

    if (withoutDay.length > 0) {
      const totalInWeek = withoutDay.length;
      const base = Math.floor(totalInWeek / config.daysPerWeek);
      const remainder = totalInWeek % config.daysPerWeek;
      let idx = 0;
      for (let d = 0; d < config.daysPerWeek; d++) {
        const countForThisDay = base + (d < remainder ? 1 : 0);
        for (let k = 0; k < countForThisDay && idx < totalInWeek; k++, idx++) {
          result.push({ ...withoutDay[idx], week: w, day: d + 1 });
        }
      }
    }
  });

  LOG(`✅ Kết quả trả về: ${result.length} mục`);
  return result;
}

export function getGrammarById(id: string): GrammarItem | undefined {
  if (!id) return undefined;
  const db = getGrammarDbHandle();
  if (!db) return undefined;
  const row = db.getFirstSync(`SELECT * FROM grammar WHERE id = ? LIMIT 1`, [id]);
  return row ? normalizeRow(row) : undefined;
}

export function getGrammarByLesson(bookId: string, week: number, day?: number): GrammarItem[] {
  const db = getGrammarDbHandle();
  if (!db) return [];
  const rows = db.getAllSync(`SELECT * FROM grammar WHERE book = ? AND week = ? ORDER BY id ASC`, [bookId, week]);
  const items = rows.map(normalizeRow);
  if (day === undefined) return items;
  return items.filter((g: GrammarItem) => g.day === day);
}

export function getWeekCount(bookId: string): number {
  const db = getGrammarDbHandle();
  if (!db) return 0;
  const row = db.getFirstSync(`SELECT MAX(week) AS maxWeek FROM grammar WHERE book = ?`, [bookId]);
  return Number(row?.maxWeek ?? 0);
}

export function getWeeks(bookId: string): number[] {
  const db = getGrammarDbHandle();
  if (!db) return [];
  const rows = db.getAllSync(`SELECT DISTINCT week FROM grammar WHERE book = ? AND week IS NOT NULL ORDER BY week ASC`, [bookId]);
  return rows.map((row: any) => Number(row.week));
}

export function getDaysInWeek(bookId: string, week: number): number[] {
  const db = getGrammarDbHandle();
  if (!db) return [];
  const rows = db.getAllSync(`SELECT DISTINCT day FROM grammar WHERE book = ? AND week = ? AND day IS NOT NULL ORDER BY day ASC`, [bookId, week]);
  return rows.map((row: any) => Number(row.day));
}

export async function ensureGrammarDbReady(): Promise<boolean> {
  if (_grammarDb) return true;  
  const db = await getDb('grammar');
  _grammarDb = db;
  return !!db;
}