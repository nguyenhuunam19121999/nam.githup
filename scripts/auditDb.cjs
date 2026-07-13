const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ASSETS = path.join(ROOT, 'assets');

function countJson(filePath) {
  if (!fs.existsSync(filePath)) return -1;
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return Array.isArray(data) ? data.length : -2;
  } catch { return -3; }
}

const BOOKS = [
  { book: 'n5', vocabFile: 'n5.json', kanjiFile: 'n5.json', nnFile: 'n5.json' },
  { book: 'n4', vocabFile: 'n4.json', kanjiFile: 'n4.json', nnFile: 'n4.json' },
  { book: 'mimikara-n3', vocabFile: 'n3_mimikara.json', kanjiFile: 'n3_mimikara.json', nnFile: 'n3_mimikara.json' },
  { book: 'soumatome-n3', vocabFile: 'n3_soumatome.json', kanjiFile: 'n3_soumatome.json', nnFile: 'n3_soumatome.json' },
  { book: 'mimikara-n2', vocabFile: 'n2_mimikara.json', kanjiFile: 'n2_mimikara.json', nnFile: 'n2_mimikara.json' },
  { book: 'soumatome-n2', vocabFile: 'n2_soumatome.json', kanjiFile: 'n2_soumatome.json', nnFile: 'n2_soumatome.json' },
  { book: 'n1', vocabFile: 'n1.json', kanjiFile: 'n1.json', nnFile: 'n1.json' },
];

const kanjiDb = new Database(path.join(ASSETS, 'kanji.db'), { readonly: true });
const vocabDb = new Database(path.join(ASSETS, 'vocab.db'), { readonly: true });
const grammarDb = new Database(path.join(ASSETS, 'grammar.db'), { readonly: true });

console.log('book'.padEnd(14), 'vocabJSON'.padEnd(10), 'vocabDB'.padEnd(8), 'kanjiJSON'.padEnd(10), 'kanjiDB'.padEnd(8), 'nnJSON'.padEnd(8), 'nnDB');
console.log('-'.repeat(80));

for (const b of BOOKS) {
  const vocabJsonCount = countJson(path.join(ASSETS, 'vocab', b.vocabFile));
  const vocabDbCount = vocabDb.prepare(`SELECT COUNT(*) c FROM vocab WHERE book = ?`).get(b.book).c;

  const kanjiJsonCount = countJson(path.join(ASSETS, 'data_JLPT_kanji', b.kanjiFile));
  const kanjiDbCount = kanjiDb.prepare(`SELECT COUNT(*) c FROM kanji_book_vocab WHERE book = ?`).get(b.book).c;

  const nnJsonCount = countJson(path.join(ASSETS, 'data_nn', b.nnFile));
  const nnDbCount = grammarDb.prepare(`SELECT COUNT(*) c FROM grammar WHERE book = ?`).get(b.book).c;

  console.log(
    b.book.padEnd(14),
    String(vocabJsonCount).padEnd(10),
    String(vocabDbCount).padEnd(8),
    String(kanjiJsonCount).padEnd(10),
    String(kanjiDbCount).padEnd(8),
    String(nnJsonCount).padEnd(8),
    String(nnDbCount)
  );
}

kanjiDb.close();
vocabDb.close();
grammarDb.close();