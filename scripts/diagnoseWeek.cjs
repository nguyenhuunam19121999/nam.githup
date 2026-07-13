const Database = require('better-sqlite3');
const path = require('path');

const ASSETS = path.join(__dirname, '..', 'assets');
const BOOKS = ['n5', 'n4', 'mimikara-n3', 'soumatome-n3', 'mimikara-n2', 'soumatome-n2', 'n1'];

function diagnose(dbFile, table, bookCol, lessonCol) {
  const db = new Database(path.join(ASSETS, dbFile), { readonly: true });
  console.log(`\n===== ${dbFile} / ${table} =====`);
  for (const book of BOOKS) {
    let total, nullWeek, nullLesson, weeks;
    try {
      total = db.prepare(`SELECT COUNT(*) c FROM ${table} WHERE ${bookCol} = ?`).get(book).c;
      nullWeek = db.prepare(`SELECT COUNT(*) c FROM ${table} WHERE ${bookCol} = ? AND week IS NULL`).get(book).c;
      nullLesson = db.prepare(`SELECT COUNT(*) c FROM ${table} WHERE ${bookCol} = ? AND ${lessonCol} IS NULL`).get(book).c;
      weeks = db.prepare(`SELECT week, COUNT(*) c FROM ${table} WHERE ${bookCol} = ? GROUP BY week ORDER BY week`).all(book);
    } catch (e) {
      console.log(`  ${book}: QUERY ERROR - ${e.message}`);
      continue;
    }
    console.log(`  ${book}: total=${total}, week=NULL:${nullWeek}, ${lessonCol}=NULL:${nullLesson}`);
    console.log(`    weeks:`, weeks.map(w => `w${w.week ?? 'NULL'}:${w.c}`).join(', ') || '(no rows)');
  }
  db.close();
}

diagnose('vocab.db', 'vocab', 'book', 'lesson');
diagnose('kanji.db', 'kanji_book_vocab', 'book', 'lesson');
diagnose('grammar.db', 'grammar', 'book', 'day');