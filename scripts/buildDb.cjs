// ─────────────────────────────────────────────────────────────────────────────
// scripts/buildDb.cjs
// Build multiple SQLite asset files from the JSON source data.
// ─────────────────────────────────────────────────────────────────────────────

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ASSETS = path.join(ROOT, 'assets');

const TARGETS = [
  {
    name: 'kanji',
    output: path.join(ASSETS, 'kanji.db'),
    schema: `
      CREATE TABLE IF NOT EXISTS kanji (
        id TEXT PRIMARY KEY,
        kanji TEXT NOT NULL,
        strokes INTEGER,
        freq TEXT,
        jlpt TEXT DEFAULT 'N/A',
        grade TEXT,
        readings TEXT DEFAULT '{"kunyomi":[],"onyomi":[]}',
        hanviet TEXT DEFAULT '[]',
        meanings_vi TEXT DEFAULT '[]',
        meanings_en TEXT DEFAULT '[]',
        metadata TEXT DEFAULT '{}'
      );
      CREATE INDEX IF NOT EXISTS idx_kanji_char ON kanji(kanji);
      CREATE INDEX IF NOT EXISTS idx_kanji_jlpt ON kanji(jlpt);

      CREATE TABLE IF NOT EXISTS kanji_book_vocab (
        id TEXT PRIMARY KEY,
        kanji TEXT NOT NULL,
        hira TEXT,
        hanviet TEXT DEFAULT '[]',
        strokes INTEGER,
        freq INTEGER,
        jlpt TEXT,
        book TEXT,
        week INTEGER,
        lesson INTEGER,
        readings TEXT DEFAULT '{"kunyomi":[],"onyomi":[]}',
        meanings_vi TEXT DEFAULT '[]',
        jisho_meaning_en TEXT,
        jisho_is_common INTEGER,
        wordType TEXT,
        typeLabel TEXT,
        isExpression INTEGER,
        isSuffix INTEGER,
        isConjugatedForm INTEGER,
        conjugatedForm TEXT,
        isExtractedVerb INTEGER,
        extractedVerb TEXT,
        isNaAdjective INTEGER,
        naBaseWord TEXT,
        displayForm TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_kbv_kanji ON kanji_book_vocab(kanji);
      CREATE INDEX IF NOT EXISTS idx_kbv_book ON kanji_book_vocab(book);
      CREATE INDEX IF NOT EXISTS idx_kbv_jlpt ON kanji_book_vocab(jlpt);

      CREATE TABLE IF NOT EXISTS vocab (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kanji TEXT NOT NULL,
        hira TEXT,
        han TEXT,
        nghia TEXT,
        jlpt TEXT,
        book TEXT,
        lesson INTEGER,
        week INTEGER,
        jisho_meaning_en TEXT,
        jisho_is_common INTEGER,
        wordType TEXT,
        typeLabel TEXT,
        isExpression INTEGER,
        isSuffix INTEGER,
        isConjugatedForm INTEGER,
        conjugatedForm TEXT,
        isExtractedVerb INTEGER,
        extractedVerb TEXT,
        isNaAdjective INTEGER,
        naBaseWord TEXT,
        displayForm TEXT,
        source TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_vocab_kanji ON vocab(kanji);
      CREATE INDEX IF NOT EXISTS idx_vocab_hira ON vocab(hira);
      CREATE INDEX IF NOT EXISTS idx_vocab_jlpt ON vocab(jlpt);
      CREATE INDEX IF NOT EXISTS idx_vocab_book ON vocab(book);
      CREATE INDEX IF NOT EXISTS idx_vocab_source ON vocab(source);

      CREATE TABLE IF NOT EXISTS kanji_strokes (
        kanji TEXT PRIMARY KEY,
        paths TEXT NOT NULL DEFAULT '[]'
      );
      CREATE INDEX IF NOT EXISTS idx_kanji_strokes_kanji ON kanji_strokes(kanji);
    `,
  },
  {
    name: 'vocab',
    output: path.join(ASSETS, 'vocab.db'),
    schema: `
      CREATE TABLE IF NOT EXISTS vocab (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kanji TEXT NOT NULL,
        hira TEXT,
        han TEXT,
        nghia TEXT,
        jlpt TEXT,
        book TEXT,
        lesson INTEGER,
        week INTEGER,
        jisho_meaning_en TEXT,
        jisho_is_common INTEGER,
        wordType TEXT,
        typeLabel TEXT,
        isExpression INTEGER,
        isSuffix INTEGER,
        isConjugatedForm INTEGER,
        conjugatedForm TEXT,
        isExtractedVerb INTEGER,
        extractedVerb TEXT,
        isNaAdjective INTEGER,
        naBaseWord TEXT,
        displayForm TEXT,
        source TEXT
      );
    `,
  },
  {
    name: 'grammar',
    output: path.join(ASSETS, 'grammar.db'),
    schema: `
      CREATE TABLE IF NOT EXISTS grammar (
        id TEXT PRIMARY KEY,
        pattern TEXT,
        phienAm TEXT,
        meaning TEXT,
        level TEXT,
        structure TEXT,
        explanation TEXT,
        notes TEXT,
        caution TEXT,
        related_forms TEXT DEFAULT '[]',
        examples TEXT DEFAULT '[]',
        book TEXT,
        week INTEGER,
        week_theme TEXT,
        day INTEGER,
        day_title TEXT
      );
    `,
  },
  {
    name: 'sentences',
    output: path.join(ASSETS, 'sentences.db'),
    schema: `
      CREATE TABLE IF NOT EXISTS sentences (
        id TEXT PRIMARY KEY,
        jp TEXT,
        vi TEXT
      );
    `,
  },
];

function removeIfExists(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`🗑  Đã xóa ${path.basename(filePath)} cũ`);
  }
}

function readJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    console.warn(`  ⚠️  Không đọc được: ${filePath} — ${error.message}`);
    return null;
  }
}

function toJson(value, fallback = '[]') {
  if (value === undefined || value === null) return fallback;
  return JSON.stringify(value);
}

function toBool01(value) {
  if (value === true) return 1;
  if (value === false) return 0;
  return null;
}

function charToUnicode(char) {
  if (!char) return '';
  const cp = char.codePointAt(0);
  return cp ? `U+${cp.toString(16).toUpperCase().padStart(4, '0')}` : '';
}

function createDatabase(outputPath) {
  const db = new Database(outputPath);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  return db;
}

function buildTarget(target) {
  removeIfExists(target.output);
  const db = createDatabase(target.output);
  db.exec(target.schema);
  console.log(`✅ Schema ready for ${target.name}`);
  return db;
}

const dbs = Object.fromEntries(TARGETS.map((target) => [target.name, buildTarget(target)]));

function insertKanjiFull(db, filePath) {
  const data = readJson(filePath);
  let entries = [];
  if (Array.isArray(data)) {
    data.forEach((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return;
      Object.entries(item).forEach(([kanjiChar, detail]) => {
        if (!kanjiChar || !detail) return;
        entries.push([kanjiChar, detail]);
      });
    });
  } else if (data && typeof data === 'object') {
    entries = Object.entries(data);
  } else {
    console.warn('  ⚠️  kanjifull.json không đúng định dạng, bỏ qua.');
    return 0;
  }

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO kanji
      (id, kanji, strokes, freq, jlpt, grade, readings, hanviet, meanings_vi, meanings_en, metadata)
    VALUES (@id, @kanji, @strokes, @freq, @jlpt, @grade, @readings, @hanviet, @meanings_vi, @meanings_en, @metadata)
  `);

  const insertBatch = db.transaction((list) => {
    let count = 0;
    for (const [kanjiChar, item] of list) {
      if (!kanjiChar || !item) continue;
      const unicode = item.metadata?.Unicode || charToUnicode(kanjiChar);
      const kunyomi = Array.isArray(item.readings?.kunyomi) ? item.readings.kunyomi : [];
      const onyomi = Array.isArray(item.readings?.onyomi) ? item.readings.onyomi : [];
      stmt.run({
        id: unicode || kanjiChar,
        kanji: kanjiChar,
        strokes: typeof item.strokes === 'number' ? item.strokes : null,
        freq: item.freq !== undefined ? String(item.freq) : null,
        jlpt: item.jlpt || 'N/A',
        grade: item.grade !== undefined ? String(item.grade) : null,
        readings: JSON.stringify({ kunyomi, onyomi }),
        hanviet: toJson(item.hanviet),
        meanings_vi: toJson(item.meanings_vi),
        meanings_en: toJson(item.meanings_en),
        metadata: toJson(item.metadata, '{}'),
      });
      count++;
    }
    return count;
  });

  const count = insertBatch(entries);
  console.log(`  ✓ kanjifull.json: ${count} kanji đơn`);
  return count;
}

function insertKanjiStrokes(db, filePath) {
  const data = readJson(filePath);
  if (!data || typeof data !== 'object') {
    console.warn('  ⚠️  kanji_strokes.json không đúng định dạng, bỏ qua.');
    return 0;
  }

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO kanji_strokes (kanji, paths)
    VALUES (@kanji, @paths)
  `);

  const insertBatch = db.transaction((entries) => {
    let count = 0;
    for (const [char, paths] of entries) {
      if (!char || !Array.isArray(paths) || paths.length === 0) continue;
      stmt.run({ kanji: char, paths: JSON.stringify(paths) });
      count++;
    }
    return count;
  });

  const count = insertBatch(Object.entries(data));
  console.log(`  ✓ kanji_strokes.json: ${count} chữ có nét vẽ`);
  return count;
}

function insertKanjiBookFile(db, filePath, defaultLevel, bookId) {
  const data = readJson(filePath);
  if (!data) return 0;
  const items = Array.isArray(data) ? data : [];
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO kanji_book_vocab
      (id, kanji, hira, hanviet, strokes, freq, jlpt, book, week, lesson, readings, meanings_vi, jisho_meaning_en, jisho_is_common, wordType, typeLabel, isExpression, isSuffix, isConjugatedForm, conjugatedForm, isExtractedVerb, extractedVerb, isNaAdjective, naBaseWord, displayForm)
    VALUES (@id, @kanji, @hira, @hanviet, @strokes, @freq, @jlpt, @book, @week, @lesson, @readings, @meanings_vi, @jisho_meaning_en, @jisho_is_common, @wordType, @typeLabel, @isExpression, @isSuffix, @isConjugatedForm, @conjugatedForm, @isExtractedVerb, @extractedVerb, @isNaAdjective, @naBaseWord, @displayForm)
  `);

  const insertBatch = db.transaction((list) => {
    let count = 0;
    list.forEach((item, idx) => {
      if (!item || !item.kanji) return;
      const book = item.book || bookId;
      const id = item.id || `${bookId}-${idx}`;
      const kunyomi = Array.isArray(item.readings?.kunyomi) ? item.readings.kunyomi : [];
      const onyomi = Array.isArray(item.readings?.onyomi) ? item.readings.onyomi : [];
      stmt.run({
        id,
        kanji: item.kanji,
        hira: item.hira || '',
        hanviet: toJson(item.hanviet),
        strokes: typeof item.strokes === 'number' ? item.strokes : null,
        freq: typeof item.freq === 'number' ? item.freq : null,
        jlpt: item.jlpt || defaultLevel,
        book,
        week: typeof item.week === 'number' ? item.week : null,
        lesson: typeof item.lesson === 'number' ? item.lesson : null,
        readings: JSON.stringify({ kunyomi, onyomi }),
        meanings_vi: toJson(item.meanings_vi),
        jisho_meaning_en: item.jisho_meaning_en || null,
        jisho_is_common: toBool01(item.jisho_is_common),
        wordType: item.wordType || null,
        typeLabel: item.typeLabel || null,
        isExpression: toBool01(item.isExpression),
        isSuffix: toBool01(item.isSuffix),
        isConjugatedForm: toBool01(item.isConjugatedForm),
        conjugatedForm: item.conjugatedForm || null,
        isExtractedVerb: toBool01(item.isExtractedVerb),
        extractedVerb: item.extractedVerb || null,
        isNaAdjective: toBool01(item.isNaAdjective),
        naBaseWord: item.naBaseWord || null,
        displayForm: item.displayForm || null,
      });
      count++;
    });
    return count;
  });

  const count = insertBatch(items);
  console.log(`  ✓ ${path.basename(filePath)}: ${count} mục`);
  return count;
}

function insertVocabFile(db, filePath, { level, book, source }) {
  const data = readJson(filePath);
  if (!data) return 0;
  const items = Array.isArray(data) ? data : [];
  const stmt = db.prepare(`
    INSERT INTO vocab (kanji, hira, han, nghia, jlpt, book, lesson, week, jisho_meaning_en, jisho_is_common, wordType, typeLabel, isExpression, isSuffix, isConjugatedForm, conjugatedForm, isExtractedVerb, extractedVerb, isNaAdjective, naBaseWord, displayForm, source)
    VALUES (@kanji, @hira, @han, @nghia, @jlpt, @book, @lesson, @week, @jisho_meaning_en, @jisho_is_common, @wordType, @typeLabel, @isExpression, @isSuffix, @isConjugatedForm, @conjugatedForm, @isExtractedVerb, @extractedVerb, @isNaAdjective, @naBaseWord, @displayForm, @source)
  `);

  const insertBatch = db.transaction((list) => {
    let count = 0;
    list.forEach((item) => {
      if (!item || !item.kanji) return;
      stmt.run({
        kanji: item.kanji,
        hira: item.hira || '',
        han: item.han || null,
        nghia: item.nghia || '',
        jlpt: item.jlpt || level || null,
        book: book || null,
        lesson: typeof item.lesson === 'number' ? item.lesson : null,
        week: typeof item.week === 'number' ? item.week : null,
        jisho_meaning_en: item.jisho_meaning_en || null,
        jisho_is_common: toBool01(item.jisho_is_common),
        wordType: item.wordType || null,
        typeLabel: item.typeLabel || null,
        isExpression: toBool01(item.isExpression),
        isSuffix: toBool01(item.isSuffix),
        isConjugatedForm: toBool01(item.isConjugatedForm),
        conjugatedForm: item.conjugatedForm || null,
        isExtractedVerb: toBool01(item.isExtractedVerb),
        extractedVerb: item.extractedVerb || null,
        isNaAdjective: toBool01(item.isNaAdjective),
        naBaseWord: item.naBaseWord || null,
        displayForm: item.displayForm || null,
        source,
      });
      count++;
    });
    return count;
  });

  const count = insertBatch(items);
  console.log(`  ✓ ${path.basename(filePath)}: ${count} từ vựng`);
  return count;
}

function insertGrammarFile(db, filePath, book) {
  const data = readJson(filePath);
  if (!data) return 0;
  const items = Array.isArray(data) ? data : [];
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO grammar (id, pattern, phienAm, meaning, level, structure, explanation, notes, caution, related_forms, examples, book, week, week_theme, day, day_title)
    VALUES (@id, @pattern, @phienAm, @meaning, @level, @structure, @explanation, @notes, @caution, @related_forms, @examples, @book, @week, @week_theme, @day, @day_title)
  `);

  const insertBatch = db.transaction((list) => {
    let count = 0;
    list.forEach((item, idx) => {
      if (!item) return;
      stmt.run({
        id: item.id || `${book}-${idx}`,
        pattern: item.pattern || '',
        phienAm: item.phienAm || '',
        meaning: item.meaning || '',
        level: item.level || null,
        structure: item.structure || '',
        explanation: item.explanation || '',
        notes: item.notes || '',
        caution: item.caution || '',
        related_forms: toJson(item.related_forms),
        examples: toJson(item.examples),
        book: item.book || book,
        week: typeof item.week === 'number' ? item.week : null,
        week_theme: item.week_theme || null,
        day: typeof item.day === 'number' ? item.day : null,
        day_title: item.day_title || null,
      });
      count++;
    });
    return count;
  });

  const count = insertBatch(items);
  console.log(`  ✓ ${path.basename(filePath)}: ${count} ngữ pháp`);
  return count;
}

function insertSentencesFile(db, filePath) {
  const raw = readJson(filePath);
  const items = Array.isArray(raw?.sentences) ? raw.sentences : Array.isArray(raw) ? raw : [];
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO sentences (id, jp, vi)
    VALUES (@id, @jp, @vi)
  `);

  const insertBatch = db.transaction((list) => {
    let count = 0;
    list.forEach((item, idx) => {
      if (!item || !item.jp) return;
      stmt.run({
        id: item.id || `sentence_${idx}`,
        jp: item.jp,
        vi: item.vi || '',
      });
      count++;
    });
    return count;
  });

  const count = insertBatch(items);
  console.log(`  ✓ sentences.json: ${count} mẫu câu`);
  return count;
}

console.log('📦 Đang insert kanjifull.json...');
insertKanjiFull(dbs.kanji, path.join(ASSETS, 'data_JLPT_kanji', 'kanjifull.json'));

console.log('📦 Đang insert kanji_strokes.json...');
insertKanjiStrokes(dbs.kanji, path.join(ASSETS, 'data_JLPT_kanji', 'kanji_strokes.json'));

console.log('\n📦 Đang insert từ vựng theo sách kanji (data_JLPT_kanji)...');
for (const { file, level, book } of [
  { file: 'n5.json', level: 'N5', book: 'n5' },
  { file: 'n4.json', level: 'N4', book: 'n4' },
  { file: 'n3_mimikara.json', level: 'N3', book: 'mimikara-n3' },
  { file: 'n3_soumatome.json', level: 'N3', book: 'soumatome-n3' },
  { file: 'n2_mimikara.json', level: 'N2', book: 'mimikara-n2' },
  { file: 'n2_soumatome.json', level: 'N2', book: 'soumatome-n2' },
  { file: 'n1.json', level: 'N1', book: 'n1' },
]) {
  const filePath = path.join(ASSETS, 'data_JLPT_kanji', file);
  if (fs.existsSync(filePath)) insertKanjiBookFile(dbs.kanji, filePath, level, book);
}

console.log('\n📦 Đang insert từ vựng JLPT (vocab/)...');
for (const { file, level, book } of [
  { file: 'n5.json', level: 'N5', book: 'n5' },
  { file: 'n4.json', level: 'N4', book: 'n4' },
  { file: 'n3_mimikara.json', level: 'N3', book: 'mimikara-n3' },
  { file: 'n3_soumatome.json', level: 'N3', book: 'soumatome-n3' },
  { file: 'n2_mimikara.json', level: 'N2', book: 'mimikara-n2' },
  { file: 'n2_soumatome.json', level: 'N2', book: 'soumatome-n2' },
  { file: 'n1.json', level: 'N1', book: 'n1' },
]) {
  const filePath = path.join(ASSETS, 'vocab', file);
  if (fs.existsSync(filePath)) insertVocabFile(dbs.kanji, filePath, { level, book, source: 'jlpt' });
  if (fs.existsSync(filePath)) insertVocabFile(dbs.vocab, filePath, { level, book, source: 'jlpt' });
}

console.log('\n📦 Đang insert từ vựng ngành nghề (data_nghanh_hoc/)...');
for (const { file, book } of [
  { file: 'thuc_pham.json', book: 'industry-food' },
  { file: 'xay_dung.json', book: 'industry-construction' },
  { file: 'dieu_duong.json', book: 'industry-nursing' },
  { file: 'nong_nghiep.json', book: 'industry-agriculture' },
  { file: 'khach_san.json', book: 'industry-hotel' },
  { file: 'nha_hang.json', book: 'industry-restaurant' },
  { file: 'oto.json', book: 'industry-auto' },
  { file: 've_sinh.json', book: 'industry-cleaning' },
  { file: 'co_khi.json', book: 'industry-machinery' },
  { file: 'dien_tu.json', book: 'industry-electronics' },
  { file: 'dong_tau.json', book: 'industry-shipbuilding' },
  { file: 'det_may.json', book: 'industry-textile' },
  { file: 'ngu_nghiep.json', book: 'industry-fishing' },
  { file: 'san_xuat_cn.json', book: 'industry-manufacturing' },
  { file: 'dan_giao.json', book: 'industry-transport' },
]) {
  const filePath = path.join(ASSETS, 'data_nghanh_hoc', file);
  if (fs.existsSync(filePath)) {
    insertVocabFile(dbs.kanji, filePath, { level: null, book, source: 'industry' });
    insertVocabFile(dbs.vocab, filePath, { level: null, book, source: 'industry' });
  }
}

console.log('\n📦 Đang insert ngữ pháp (data_nn/)...');
for (const { file, book } of [
  { file: 'n5.json', book: 'n5' },
  { file: 'n4.json', book: 'n4' },
  { file: 'n3_mimikara.json', book: 'mimikara-n3' },
  { file: 'n3_soumatome.json', book: 'soumatome-n3' },
  { file: 'n2_mimikara.json', book: 'mimikara-n2' },
  { file: 'n2_soumatome.json', book: 'soumatome-n2' },
  { file: 'n1.json', book: 'n1' },
]) {
  const filePath = path.join(ASSETS, 'data_nn', file);
  if (fs.existsSync(filePath)) insertGrammarFile(dbs.grammar, filePath, book);
}

console.log('\n📦 Đang insert mẫu câu (sentences.json)...');
const sentencePath = path.join(ASSETS, 'sentences', 'sentences.json');
if (fs.existsSync(sentencePath)) insertSentencesFile(dbs.sentences, sentencePath);

for (const db of Object.values(dbs)) db.close();

for (const target of TARGETS) {
  const stats = fs.statSync(target.output);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
  console.log(`✅ ${path.basename(target.output)} (${sizeMB} MB)`);
}
