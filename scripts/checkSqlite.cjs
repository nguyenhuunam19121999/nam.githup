// scripts/checkSqlite.cjs
// Quick check that asset .db files contain rows.
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const ROOT = path.resolve(__dirname, '..');
const ASSETS = path.join(ROOT, 'assets');

const TARGETS = [
  { file: 'kanji.db', table: 'kanji' },
  { file: 'vocab.db', table: 'vocab' },
  { file: 'grammar.db', table: 'grammar' },
  { file: 'sentences.db', table: 'sentences' },
];

for (const t of TARGETS) {
  const p = path.join(ASSETS, t.file);
  if (!fs.existsSync(p)) {
    console.log(`MISSING: ${t.file}`);
    continue;
  }

  try {
    const db = new Database(p, { readonly: true });
    let row = null;
    try {
      row = db.prepare(`SELECT COUNT(*) AS c FROM ${t.table};`).get();
    } catch (e) {
      // table may not exist or SQL error
      console.log(`${t.file}: cannot query table '${t.table}': ${e.message}`);
      db.close();
      continue;
    }
    console.log(`${t.file}: table='${t.table}' rows=${row.c}`);
    db.close();
  } catch (err) {
    console.log(`${t.file}: open error: ${err.message}`);
  }
}

console.log('\nDone.');
