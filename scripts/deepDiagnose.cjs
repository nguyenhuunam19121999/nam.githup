const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const ROOT = path.resolve(__dirname, '..');
const ASSETS = path.join(ROOT, 'assets');

// ── Phần 1: In ra chính xác nội dung 3 hàm XByBook đang có trên đĩa ──
function printFunction(filePath, fnName) {
  const content = fs.readFileSync(path.join(ROOT, filePath), 'utf8');
  const startIdx = content.indexOf(`export function ${fnName}`);
  if (startIdx === -1) {
    console.log(`\n===== ${filePath} :: ${fnName} =====\nKHÔNG TÌM THẤY HÀM NÀY`);
    return;
  }
  // Cắt từ đầu hàm tới hết, in tối đa 2000 ký tự để thấy toàn bộ thân hàm
  const snippet = content.slice(startIdx, startIdx + 2000);
  console.log(`\n===== ${filePath} :: ${fnName} =====`);
  console.log(snippet);
}

printFunction('assets/vocab/index.ts', 'getVocabByBook');
printFunction('assets/data_JLPT_kanji/index.ts', 'getKanjiByBook');
printFunction('assets/data_nn/index.ts', 'getGrammarByBook');

// ── Phần 2: Dump mẫu dữ liệu thật (10 dòng đầu) cho các sách đang lỗi ──
function dumpSample(dbFile, table, bookCol, book, cols) {
  const db = new Database(path.join(ASSETS, dbFile), { readonly: true });
  console.log(`\n----- ${dbFile}/${table} book=${book} (10 dòng đầu) -----`);
  try {
    const rows = db.prepare(`SELECT ${cols.join(', ')} FROM ${table} WHERE ${bookCol} = ? ORDER BY id ASC LIMIT 10`).all(book);
    rows.forEach(r => console.log(JSON.stringify(r)));
  } catch (e) {
    console.log('ERROR:', e.message);
  }
  db.close();
}

console.log('\n\n########## VOCAB SAMPLES ##########');
dumpSample('vocab.db', 'vocab', 'book', 'n5', ['id', 'kanji', 'week', 'lesson']);
dumpSample('vocab.db', 'vocab', 'book', 'n1', ['id', 'kanji', 'week', 'lesson']);
dumpSample('vocab.db', 'vocab', 'book', 'soumatome-n2', ['id', 'kanji', 'week', 'lesson']);
dumpSample('vocab.db', 'vocab', 'book', 'soumatome-n3', ['id', 'kanji', 'week', 'lesson']);

console.log('\n\n########## GRAMMAR SAMPLES ##########');
dumpSample('grammar.db', 'grammar', 'book', 'mimikara-n3', ['id', 'pattern', 'week', 'day']);
dumpSample('grammar.db', 'grammar', 'book', 'mimikara-n2', ['id', 'pattern', 'week', 'day']);
dumpSample('grammar.db', 'grammar', 'book', 'soumatome-n3', ['id', 'pattern', 'week', 'day']);
dumpSample('grammar.db', 'grammar', 'book', 'soumatome-n2', ['id', 'pattern', 'week', 'day']);

function checkLessonPattern(dbFile, table, bookCol, book, lessonCol) {
  const db = new Database(path.join(ASSETS, dbFile), { readonly: true });
  console.log(`\n----- ${dbFile}/${table} book=${book}: DISTINCT week,${lessonCol} -----`);
  try {
    const rows = db.prepare(
      `SELECT week, ${lessonCol}, COUNT(*) c FROM ${table} WHERE ${bookCol} = ? GROUP BY week, ${lessonCol} ORDER BY week, ${lessonCol}`
    ).all(book);
    rows.forEach(r => console.log(`  week=${r.week} ${lessonCol}=${r[lessonCol]} count=${r.c}`));
  } catch (e) {
    console.log('ERROR:', e.message);
  }
  db.close();
}

console.log('\n\n########## LESSON PATTERN CHECK ##########');
checkLessonPattern('vocab.db', 'vocab', 'book', 'n5', 'lesson');
checkLessonPattern('vocab.db', 'vocab', 'book', 'soumatome-n2', 'lesson');
checkLessonPattern('kanji.db', 'kanji_book_vocab', 'book', 'soumatome-n2', 'lesson');
checkLessonPattern('kanji.db', 'kanji_book_vocab', 'book', 'soumatome-n3', 'lesson');