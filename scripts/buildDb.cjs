// ─────────────────────────────────────────────────────────────────────────────
// scripts/buildDb.js
// Chạy 1 lần trên máy tính để tạo file kanji.db từ toàn bộ JSON
// Cách chạy: node scripts/buildDb.js
// Yêu cầu:   npm install better-sqlite3   (chỉ cần trên máy dev, không ship)
// ─────────────────────────────────────────────────────────────────────────────

const Database = require('better-sqlite3');
const fs       = require('fs');
const path     = require('path');

// ── Đường dẫn gốc (thư mục chứa script này là /scripts, assets là /assets) ──
const ROOT       = path.resolve(__dirname, '..');
const ASSETS     = path.join(ROOT, 'assets');
const OUTPUT_DB  = path.join(ASSETS, 'kanji.db');

// ── Xóa DB cũ nếu có để build lại sạch ──────────────────────────────────────
if (fs.existsSync(OUTPUT_DB)) {
  fs.unlinkSync(OUTPUT_DB);
  console.log('🗑  Đã xóa kanji.db cũ');
}

const db = new Database(OUTPUT_DB);

// ── Bật WAL mode để ghi nhanh hơn ────────────────────────────────────────────
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

// ─────────────────────────────────────────────────────────────────────────────
// TẠO CÁC BẢNG
// ─────────────────────────────────────────────────────────────────────────────
db.exec(`
  -- Bảng Kanji
  CREATE TABLE IF NOT EXISTS kanji (
    id           TEXT PRIMARY KEY,
    kanji        TEXT NOT NULL,
    hanviet      TEXT DEFAULT '[]',
    readings     TEXT DEFAULT '{"kunyomi":[],"onyomi":[]}',
    meanings_vi  TEXT DEFAULT '[]',
    meanings_en  TEXT DEFAULT '[]',
    components   TEXT DEFAULT '[]',
    examples     TEXT DEFAULT '[]',
    jlpt         TEXT DEFAULT '—',
    freq         INTEGER,
    strokes      INTEGER DEFAULT 0,
    grade        INTEGER,
    book         TEXT,
    lesson       INTEGER,
    week         INTEGER,
    unicode      TEXT,
    source       TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_kanji_char    ON kanji(kanji);
  CREATE INDEX IF NOT EXISTS idx_kanji_jlpt    ON kanji(jlpt);
  CREATE INDEX IF NOT EXISTS idx_kanji_hanviet ON kanji(hanviet);
  CREATE INDEX IF NOT EXISTS idx_kanji_unicode ON kanji(unicode);

  -- Bảng Từ vựng (JLPT N5→N1 + ngành học)
  CREATE TABLE IF NOT EXISTS vocab (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    jp      TEXT,
    hira    TEXT,
    nghia   TEXT,
    level   TEXT,
    book    TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_vocab_jp    ON vocab(jp);
  CREATE INDEX IF NOT EXISTS idx_vocab_hira  ON vocab(hira);
  CREATE INDEX IF NOT EXISTS idx_vocab_level ON vocab(level);

  -- Bảng Ngữ pháp
  CREATE TABLE IF NOT EXISTS grammar (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    pattern TEXT,
    meaning TEXT,
    example TEXT,
    level   TEXT,
    book    TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_grammar_level ON grammar(level);

  -- Bảng Mẫu câu
  CREATE TABLE IF NOT EXISTS sentences (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    jp       TEXT,
    reading  TEXT,
    vi       TEXT,
    level    TEXT
  );
`);

console.log('✅ Đã tạo schema xong\n');

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function readJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    console.warn(`  ⚠️  Không đọc được: ${filePath} — ${e.message}`);
    return null;
  }
}

function safeJson(val, fallback = '[]') {
  if (val === undefined || val === null) return fallback;
  if (typeof val === 'string') return val;
  return JSON.stringify(val);
}

function charToUnicode(char) {
  if (!char) return '';
  const cp = char.codePointAt(0);
  return cp ? `U+${cp.toString(16).toUpperCase().padStart(4, '0')}` : '';
}

// ─────────────────────────────────────────────────────────────────────────────
// INSERT KANJI
// ─────────────────────────────────────────────────────────────────────────────

const stmtKanji = db.prepare(`
  INSERT OR REPLACE INTO kanji
    (id, kanji, hanviet, readings, meanings_vi, meanings_en,
     components, examples, jlpt, freq, strokes, grade,
     book, lesson, week, unicode, source)
  VALUES
    (@id, @kanji, @hanviet, @readings, @meanings_vi, @meanings_en,
     @components, @examples, @jlpt, @freq, @strokes, @grade,
     @book, @lesson, @week, @unicode, @source)
`);

function normalizeKanji(item, defaultJlpt, bookId) {
  const kanjiChar = (item.kanji || '').trim();
  if (!kanjiChar) return null;

  // Xử lý unicode
  const unicode = item.metadata?.Unicode || charToUnicode(kanjiChar);

  // Xử lý hanviet
  let hanviet = [];
  if (Array.isArray(item.hanviet))      hanviet = item.hanviet;
  else if (typeof item.hanviet === 'string') hanviet = item.hanviet.split(',').map(s => s.trim());
  else if (Array.isArray(item.hanViet)) hanviet = item.hanViet;
  else if (typeof item.hanViet === 'string') hanviet = item.hanViet.split(',').map(s => s.trim());

  // Xử lý readings
  const kunyomi = Array.isArray(item.readings?.kunyomi) ? item.readings.kunyomi
                : Array.isArray(item.kunyomi)            ? item.kunyomi : [];
  const onyomi  = Array.isArray(item.readings?.onyomi)  ? item.readings.onyomi
                : Array.isArray(item.onyomi)             ? item.onyomi  : [];

  // Xử lý meanings_vi
  let meanings_vi = [];
  if (Array.isArray(item.meanings_vi))      meanings_vi = item.meanings_vi;
  else if (Array.isArray(item.meanings))    meanings_vi = item.meanings;
  else if (Array.isArray(item.nghia))       meanings_vi = item.nghia;
  else if (typeof item.nghia === 'string')  meanings_vi = [item.nghia];

  // Xử lý components
  let components = [];
  if (Array.isArray(item.components)) {
    components = item.components.map(c =>
      typeof c === 'string' ? { kanji: c } : { kanji: c.kanji || '', hanViet: c.hanViet || c.hanviet || '' }
    );
  }

  // Xử lý examples (từ field examples trong JSON mới)
  let examples = [];
  if (Array.isArray(item.examples)) {
    examples = item.examples;
  }

  return {
    id:          unicode || kanjiChar,
    kanji:       kanjiChar,
    hanviet:     JSON.stringify(hanviet),
    readings:    JSON.stringify({ kunyomi, onyomi }),
    meanings_vi: JSON.stringify(meanings_vi),
    meanings_en: safeJson(item.meanings_en),
    components:  JSON.stringify(components),
    examples:    JSON.stringify(examples),
    jlpt:        item.jlpt || item.level || defaultJlpt,
    freq:        item.freq  ?? null,
    strokes:     item.strokes ?? item.so_net ?? 0,
    grade:       item.grade ?? null,
    book:        bookId || item.book || null,
    lesson:      item.lesson ?? null,
    week:        item.week   ?? null,
    unicode:     unicode,
    source:      bookId || 'kanjifull',
  };
}

function insertKanjiFile(filePath, defaultJlpt, bookId) {
  const data = readJson(filePath);
  if (!data) return 0;
  const items = Array.isArray(data) ? data : [];

  const insertBatch = db.transaction((list) => {
    let count = 0;
    list.forEach((item, idx) => {
      // Gán lesson/week tự động nếu chưa có
      if (item.lesson == null) {
        item = { ...item, lesson: Math.floor(idx / 6) + 1, week: Math.floor(idx / 36) + 1 };
      }
      const row = normalizeKanji(item, defaultJlpt, bookId);
      if (row) { stmtKanji.run(row); count++; }
    });
    return count;
  });

  const count = insertBatch(items);
  console.log(`  ✓ ${path.basename(filePath)}: ${count} kanji`);
  return count;
}

// ── Insert kanjifull.json TRƯỚC (ưu tiên cao nhất, INSERT OR REPLACE) ────────
console.log('📦 Đang insert kanjifull.json (ưu tiên đầu)...');
insertKanjiFile(path.join(ASSETS, 'data_JLPT_kanji', 'kanjifull.json'), '—', 'kanjifull');

// ── Insert n5→n1 (bổ sung những chữ chưa có trong kanjifull) ────────────────
console.log('\n📦 Đang insert kanji JLPT N5→N1...');
const kanjiFiles = [
  { file: 'n5.json',           level: 'N5', book: 'n5'           },
  { file: 'n4.json',           level: 'N4', book: 'n4'           },
  { file: 'n3_mimikara.json',  level: 'N3', book: 'mimikara-n3'  },
  { file: 'n3_soumatome.json', level: 'N3', book: 'soumatome-n3' },
  { file: 'n2_mimikara.json',  level: 'N2', book: 'mimikara-n2'  },
  { file: 'n2_soumatome.json', level: 'N2', book: 'soumatome-n2' },
  { file: 'n1.json',           level: 'N1', book: 'n1'           },
];
kanjiFiles.forEach(({ file, level, book }) => {
  insertKanjiFile(path.join(ASSETS, 'data_JLPT_kanji', file), level, book);
});

// ─────────────────────────────────────────────────────────────────────────────
// INSERT VOCAB
// ─────────────────────────────────────────────────────────────────────────────

const stmtVocab = db.prepare(`
  INSERT INTO vocab (jp, hira, nghia, level, book)
  VALUES (@jp, @hira, @nghia, @level, @book)
`);

function insertVocabFile(filePath, level, book) {
  const data = readJson(filePath);
  if (!data) return 0;
  const items = Array.isArray(data) ? data : [];

  // Dedup trong file
  const seen = new Set();
  const insertBatch = db.transaction((list) => {
    let count = 0;
    list.forEach(item => {
      if (!item) return;
      const jp   = item.kanji ?? item.jp ?? '';
      const hira = item.hira  ?? item.reading ?? '';
      const key  = `${jp}|${hira}`;
      if (seen.has(key) || !jp) return;
      seen.add(key);
      stmtVocab.run({
        jp,
        hira,
        nghia: item.nghia ?? item.vi ?? item.meaning ?? '',
        level,
        book,
      });
      count++;
    });
    return count;
  });

  const count = insertBatch(items);
  console.log(`  ✓ ${path.basename(filePath)}: ${count} từ vựng`);
  return count;
}

console.log('\n📦 Đang insert từ vựng JLPT N5→N1...');
const vocabFiles = [
  { file: 'n5.json',           level: 'N5', book: 'n5'           },
  { file: 'n4.json',           level: 'N4', book: 'n4'           },
  { file: 'n3_mimikara.json',  level: 'N3', book: 'mimikara-n3'  },
  { file: 'n3_soumatome.json', level: 'N3', book: 'soumatome-n3' },
  { file: 'n2_mimikara.json',  level: 'N2', book: 'mimikara-n2'  },
  { file: 'n2_soumatome.json', level: 'N2', book: 'soumatome-n2' },
  { file: 'n1.json',           level: 'N1', book: 'n1'           },
];
vocabFiles.forEach(({ file, level, book }) => {
  insertVocabFile(path.join(ASSETS, 'vocab', file), level, book);
});

// ── Ngành học ────────────────────────────────────────────────────────────────
console.log('\n📦 Đang insert từ vựng ngành học...');
const nganhFiles = [
  'thuc_pham.json', 'xay_dung.json', 'dieu_duong.json', 'nong_nghiep.json',
  'khach_san.json', 'nha_hang.json', 'oto.json', 've_sinh.json',
];
nganhFiles.forEach(file => {
  const filePath = path.join(ASSETS, 'data_nghanh_hoc', file);
  if (fs.existsSync(filePath)) {
    insertVocabFile(filePath, 'tokutei', file.replace('.json', ''));
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// INSERT NGỮ PHÁP
// ─────────────────────────────────────────────────────────────────────────────

const stmtGrammar = db.prepare(`
  INSERT INTO grammar (pattern, meaning, example, level, book)
  VALUES (@pattern, @meaning, @example, @level, @book)
`);

function insertGrammarFile(filePath, level, book) {
  const data = readJson(filePath);
  if (!data) return 0;
  const items = Array.isArray(data) ? data : [];

  const insertBatch = db.transaction((list) => {
    let count = 0;
    list.forEach(item => {
      if (!item) return;
      stmtGrammar.run({
        pattern: item.pattern ?? item.grammar ?? item.form ?? '',
        meaning: item.meaning ?? item.nghia   ?? item.vi  ?? '',
        example: typeof item.example === 'object'
          ? JSON.stringify(item.example)
          : (item.example ?? ''),
        level,
        book,
      });
      count++;
    });
    return count;
  });

  const count = insertBatch(items);
  console.log(`  ✓ ${path.basename(filePath)}: ${count} ngữ pháp`);
  return count;
}

console.log('\n📦 Đang insert ngữ pháp N5→N1...');
const grammarFiles = [
  { file: 'n5.json',           level: 'N5', book: 'n5'           },
  { file: 'n4.json',           level: 'N4', book: 'n4'           },
  { file: 'n3_mimikara.json',  level: 'N3', book: 'mimikara-n3'  },
  { file: 'n3_soumatome.json', level: 'N3', book: 'soumatome-n3' },
  { file: 'n2_mimikara.json',  level: 'N2', book: 'mimikara-n2'  },
  { file: 'n2_soumatome.json', level: 'N2', book: 'soumatome-n2' },
  { file: 'n1.json',           level: 'N1', book: 'n1'           },
];
grammarFiles.forEach(({ file, level, book }) => {
  const filePath = path.join(ASSETS, 'data_nn', file);
  if (fs.existsSync(filePath)) {
    insertGrammarFile(filePath, level, book);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// INSERT MẪU CÂU
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n📦 Đang insert mẫu câu...');
const sentencePath = path.join(ASSETS, 'sentences', 'sentences.json');
if (fs.existsSync(sentencePath)) {
  const data = readJson(sentencePath);
  const items = Array.isArray(data) ? data : [];
  const stmtSentence = db.prepare(`
    INSERT INTO sentences (jp, reading, vi, level)
    VALUES (@jp, @reading, @vi, @level)
  `);
  const insertBatch = db.transaction((list) => {
    list.forEach(item => {
      if (!item) return;
      stmtSentence.run({
        jp:      item.jp ?? item.kanji ?? '',
        reading: item.reading ?? item.hira ?? '',
        vi:      item.vi ?? item.nghia ?? '',
        level:   item.level ?? '—',
      });
    });
    return list.length;
  });
  const count = insertBatch(items);
  console.log(`  ✓ sentences.json: ${count} mẫu câu`);
}

// ─────────────────────────────────────────────────────────────────────────────
// THỐNG KÊ CUỐI
// ─────────────────────────────────────────────────────────────────────────────

db.close();

const stats = fs.statSync(OUTPUT_DB);
const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

console.log('\n══════════════════════════════════════════');
console.log(`✅ Hoàn thành! File: assets/kanji.db`);
console.log(`📦 Kích thước: ${sizeMB} MB`);
console.log('══════════════════════════════════════════');