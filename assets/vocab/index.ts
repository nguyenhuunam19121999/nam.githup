import { getDb } from "../../services/db";

export interface RawVocab {
  kanji?: string;
  hira?: string;
  hiragana?: string;
  han?: string;
  nghia?: string;
  example?: string;
  exampleMeaning?: string;
  category?: string;
  lesson?: number;
  week?: number;
  level?: string;
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

export const VOCAB_BY_BOOK: Record<string, RawVocab[]> = {};
export const ALL_VOCAB: RawVocab[] = [];

let _vocabDb: any | null = null;
let _vocabDbPromise: Promise<any | null> | null = null;

function getVocabDbHandle(): any | null {
  if (_vocabDb) return _vocabDb;
  if (!_vocabDbPromise) {
    _vocabDbPromise = getDb('vocab').then((db) => {
      _vocabDb = db;
      return db;
    }).catch(() => null);
  }
  return null;
}

function normalizeRow(row: any): RawVocab {
  return {
    kanji: row.kanji ?? undefined,
    hira: row.hira ?? undefined,
    hiragana: row.hira ?? undefined,
    han: row.han ?? undefined,
    nghia: row.nghia ?? undefined,
    lesson: row.lesson ?? undefined,
    week: row.week ?? undefined,
    level: row.jlpt ?? undefined,
    wordType: row.wordType ?? undefined,
    typeLabel: row.typeLabel ?? undefined,
    isExpression: row.isExpression === 1,
    isSuffix: row.isSuffix === 1,
    isConjugatedForm: row.isConjugatedForm === 1,
    conjugatedForm: row.conjugatedForm ?? null,
    isExtractedVerb: row.isExtractedVerb === 1,
    extractedVerb: row.extractedVerb ?? null,
    isNaAdjective: row.isNaAdjective === 1,
    naBaseWord: row.naBaseWord ?? null,
    displayForm: row.displayForm ?? null,
  };
}

export async function getVocabAsync(level?: string, bookId?: string): Promise<RawVocab[]> {
  const db: any = await getDb('vocab');
  if (!db) return [];

  let rows: any[] = [];
  if (bookId) {
    rows = await db.getAllAsync(`SELECT * FROM vocab WHERE book = ? ORDER BY id ASC`, [bookId]);
  } else {
    const lvl = (level ?? '').toUpperCase();
    if (lvl === 'N5') rows = await db.getAllAsync(`SELECT * FROM vocab WHERE jlpt = ? ORDER BY id ASC`, ['N5']);
    else if (lvl === 'N4') rows = await db.getAllAsync(`SELECT * FROM vocab WHERE jlpt = ? ORDER BY id ASC`, ['N4']);
    else if (lvl === 'N3') rows = await db.getAllAsync(`SELECT * FROM vocab WHERE jlpt = ? ORDER BY id ASC`, ['N3']);
    else if (lvl === 'N2') rows = await db.getAllAsync(`SELECT * FROM vocab WHERE jlpt = ? ORDER BY id ASC`, ['N2']);
    else if (lvl === 'N1') rows = await db.getAllAsync(`SELECT * FROM vocab WHERE jlpt = ? ORDER BY id ASC`, ['N1']);
    else rows = await db.getAllAsync(`SELECT * FROM vocab ORDER BY id ASC`);
  }

  return rows.map(normalizeRow);
}

export function getVocab(level?: string, bookId?: string): RawVocab[] {
  const db = getVocabDbHandle();
  if (!db) return [];

  let rows: any[] = [];
  if (bookId) {
    rows = db.getAllSync(`SELECT * FROM vocab WHERE book = ? ORDER BY id ASC`, [bookId]);
  } else {
    const lvl = (level ?? '').toUpperCase();
    if (lvl === 'N5') rows = db.getAllSync(`SELECT * FROM vocab WHERE jlpt = ? ORDER BY id ASC`, ['N5']);
    else if (lvl === 'N4') rows = db.getAllSync(`SELECT * FROM vocab WHERE jlpt = ? ORDER BY id ASC`, ['N4']);
    else if (lvl === 'N3') rows = db.getAllSync(`SELECT * FROM vocab WHERE jlpt = ? ORDER BY id ASC`, ['N3']);
    else if (lvl === 'N2') rows = db.getAllSync(`SELECT * FROM vocab WHERE jlpt = ? ORDER BY id ASC`, ['N2']);
    else if (lvl === 'N1') rows = db.getAllSync(`SELECT * FROM vocab WHERE jlpt = ? ORDER BY id ASC`, ['N1']);
    else rows = db.getAllSync(`SELECT * FROM vocab ORDER BY id ASC`);
  }

  return rows.map(normalizeRow);
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

export const VOCAB_BOOK_CONFIG: Record<string, LessonConfig> = {
  "n5":           { weeks: 5, lessonsPerWeek: 5 }, // JLPT N5 — 5 tuần, 5 bài/tuần
  "n4":           { weeks: 5, lessonsPerWeek: 5 }, // JLPT N4 — 4 tuần, 6 bài/tuần
  "n1":           { weeks: 6, lessonsPerWeek: 6 }, // JLPT N1 — 6 tuần, 6 bài/tuần
  "mimikara-n3":  { weeks: 6, lessonsPerWeek: 6 }, // Mimikara N3 — 6 tuần, 6 bài/tuần
  "mimikara-n2":  { weeks: 6, lessonsPerWeek: 6 }, // Mimikara N2 — 6 tuần, 6 bài/tuần
  "soumatome-n3": { weeks: 6, lessonsPerWeek: 6 }, // Soumatome N3 — 6 tuần, 6 bài/tuần
  "soumatome-n2": { weeks: 8, lessonsPerWeek: 6 }, // Soumatome N2 — 8 tuần, 6 bài/tuần
};

const DEFAULT_VOCAB_CONFIG: LessonConfig = { weeks: 6, lessonsPerWeek: 6 };

export function getVocabByBook(bookId: string): RawVocab[] {
  const LOG = (...args: any[]) => console.log('[vocab]', `[${bookId}]`, ...args);

  const db = getVocabDbHandle();
  if (!db) {
    LOG('❌ DB handle null — chưa init hoặc init lỗi');
    return [];
  }

  const rows = db.getAllSync(`SELECT * FROM vocab WHERE book = ? ORDER BY id ASC`, [bookId]);
  LOG('query WHERE book =', JSON.stringify(bookId), '→', rows.length, 'dòng');

  const data = rows.map(normalizeRow);

  if (data.length === 0) {
    const distinctBooks = db.getAllSync(`SELECT DISTINCT book FROM vocab`);
    LOG('⚠️ 0 dòng khớp book. Các giá trị "book" đang có trong bảng:', JSON.stringify(distinctBooks));
    return [];
  }

  const hasWeekInJson = data.some((item: RawVocab) => item.week != null);
  const allHaveLesson = data.every((item: RawVocab) => item.lesson != null);
  const weekNullCount = data.filter((item: RawVocab) => item.week == null).length;
  const lessonNullCount = data.filter((item: RawVocab) => item.lesson == null).length;

  LOG(`total=${data.length}  week=null: ${weekNullCount}  lesson=null: ${lessonNullCount}  hasWeekInJson=${hasWeekInJson}  allHaveLesson=${allHaveLesson}`);

  if (allHaveLesson) {
    // Mọi mục đã có sẵn lesson từ DB (JSON gốc có week/lesson đầy đủ) → dùng nguyên
    LOG('✅ Nhánh: allHaveLesson → dùng nguyên dữ liệu DB, không tự tính');
    return data;
  }

  const config = VOCAB_BOOK_CONFIG[bookId] ?? DEFAULT_VOCAB_CONFIG;
  LOG('config dùng:', JSON.stringify(config), bookId in VOCAB_BOOK_CONFIG ? '(khớp bookId)' : '⚠️ (fallback DEFAULT vì bookId không có trong VOCAB_BOOK_CONFIG)');

  if (!hasWeekInJson) {
    // JSON gốc KHÔNG có week/lesson — chia đều CHÍNH XÁC vào đúng số tuần/số bài
    // đã cấu hình trong VOCAB_BOOK_CONFIG. Dùng phần dư (remainder distribution)
    // để đảm bảo dùng hết đủ totalSlots bài, không bị thiếu bài cuối.
    LOG('Nhánh: !hasWeekInJson → tự chia đều toàn bộ theo config (remainder distribution)');
    const totalSlots = config.weeks * config.lessonsPerWeek;
    const total = data.length;
    const base = Math.floor(total / totalSlots);
    const remainder = total % totalSlots;
    LOG(`totalSlots=${totalSlots}  base=${base}/bài  remainder=${remainder} bài đầu +1`);

    const result: RawVocab[] = [];
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

  LOG('Nhánh: có week sẵn, chỉ thiếu lesson ở một số mục → tính lại theo từng tuần');
  const byWeek: Record<number, RawVocab[]> = {};
  data.forEach((item: RawVocab) => {
    const w = typeof item.week === 'number' ? item.week : 1;
    if (!byWeek[w]) byWeek[w] = [];
    byWeek[w].push(item);
  });
  LOG('Số tuần thực tế tìm thấy trong data:', Object.keys(byWeek).length);

  const result: RawVocab[] = [];
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

// Dùng riêng cho danh sách dài (industry vocab) — KHÔNG load hết 1 lần,
// chỉ lấy từng trang (page) theo offset/limit để tránh giật lag và tốn RAM.
export function getVocabPageByBook(bookId: string, offset: number, limit: number): RawVocab[] {
  const db = getVocabDbHandle();
  if (!db) return [];
  const rows = db.getAllSync(
    `SELECT * FROM vocab WHERE book = ? ORDER BY id ASC LIMIT ? OFFSET ?`,
    [bookId, limit, offset]
  );
  return rows.map(normalizeRow);
}

export function getVocabCountByBook(bookId: string): number {
  const db = getVocabDbHandle();
  if (!db) return 0;
  const row: any = db.getFirstSync(`SELECT COUNT(*) as c FROM vocab WHERE book = ?`, [bookId]);
  return row?.c ?? 0;
}

export async function ensureVocabDbReady(): Promise<boolean> {
  if (_vocabDb) return true;
  const db = await getDb('vocab');
  _vocabDb = db;
  return !!db;
}

// ─────────────────────────────────────────────────────────────────────────────
// Riêng cho vocab ngành học (INDUSTRY_INFO trong data_nghanh_hoc.tsx).
// JSON gốc của ngành học là 1 danh sách PHẲNG, KHÔNG có week/lesson — nên
// hàm này CHỈ trả nguyên danh sách theo đúng thứ tự trong DB, không tự
// chia bài như getVocabByBook() (dành cho JLPT/Mimikara/Soumatome).
// Tách hàm riêng để không ảnh hưởng logic N5–N1 / Mimikara / Soumatome.
// ─────────────────────────────────────────────────────────────────────────────
export function getIndustryVocabByBook(bookId: string): RawVocab[] {
  const LOG = (...args: any[]) => console.log('[vocab:industry]', `[${bookId}]`, ...args);

  const db = getVocabDbHandle();
  if (!db) {
    LOG('❌ DB handle null — chưa init hoặc init lỗi');
    return [];
  }

  const rows = db.getAllSync(`SELECT * FROM vocab WHERE book = ? ORDER BY id ASC`, [bookId]);
  LOG('query WHERE book =', JSON.stringify(bookId), '→', rows.length, 'dòng');

  if (rows.length === 0) {
    const distinctBooks = db.getAllSync(`SELECT DISTINCT book FROM vocab WHERE book LIKE 'industry-%'`);
    LOG('⚠️ 0 dòng khớp book. Các "book" ngành học đang có trong bảng:', JSON.stringify(distinctBooks));
    return [];
  }

  // Không chia lesson/week — trả nguyên danh sách phẳng.
  return rows.map((row: any) => ({ ...normalizeRow(row), lesson: undefined, week: undefined }));
}

// Bản phân trang (nếu 1 ngành có quá nhiều từ, dùng để load thêm bằng onEndReached
// thay vì load hết 1 lần — hiện KHÔNG bắt buộc dùng, chỉ để sẵn khi cần).
export function getIndustryVocabPage(bookId: string, offset: number, limit: number): RawVocab[] {
  const db = getVocabDbHandle();
  if (!db) return [];
  const rows = db.getAllSync(
    `SELECT * FROM vocab WHERE book = ? ORDER BY id ASC LIMIT ? OFFSET ?`,
    [bookId, limit, offset]
  );
  return rows.map((row: any) => ({ ...normalizeRow(row), lesson: undefined, week: undefined }));
}

export function getIndustryVocabCount(bookId: string): number {
  const db = getVocabDbHandle();
  if (!db) return 0;
  const row: any = db.getFirstSync(`SELECT COUNT(*) as c FROM vocab WHERE book = ?`, [bookId]);
  return row?.c ?? 0;
}