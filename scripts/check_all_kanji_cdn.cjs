/**
 * check_all_kanji_cdn.cjs (v2 — song song + checkpoint/resume)
 *
 * CHỈ KIỂM TRA — KHÔNG ghi/sửa bất kỳ file .json hay .db nào của app.
 * Quét TOÀN BỘ kanji từ mọi nguồn (giống scanAllKanji() trong
 * update_kanji_strokes.cjs), kiểm tra CDN song song có giới hạn,
 * lưu checkpoint để có thể resume nếu bị ngắt giữa chừng.
 *
 * CÁCH DÙNG:
 *   node scripts/check_all_kanji_cdn.cjs          → chạy (tự resume nếu có checkpoint cũ)
 *   node scripts/check_all_kanji_cdn.cjs --fresh  → xóa checkpoint cũ, chạy lại từ đầu
 */

const fs = require('fs');
const path = require('path');

// ── CẤU HÌNH ──────────────────────────────────────────────────────────────
const CDN_BASE = 'https://cdn.jsdelivr.net/gh/kanjivg/kanjivg@master/kanji/';
const REPORT_TXT = path.join(__dirname, 'kanji_cdn_report.txt');
const CHECKPOINT_PATH = path.join(__dirname, 'kanji_cdn_checkpoint.json');
const CONCURRENCY = 15;          // số request chạy song song
const CHECKPOINT_EVERY = 300;    // lưu checkpoint sau mỗi N chữ đã xong
const KANJI_REGEX = /[\u4e00-\u9faf\u3400-\u4dbf]/g;

const SOURCES = {
  vocab: [
    '../assets/vocab/n5.json',
    '../assets/vocab/n4.json',
    '../assets/vocab/n3_mimikara.json',
    '../assets/vocab/n3_soumatome.json',
    '../assets/vocab/n2_mimikara.json',
    '../assets/vocab/n2_soumatome.json',
    '../assets/vocab/n1.json',
  ],
  kanji: [
    '../assets/data_JLPT_kanji/n5.json',
    '../assets/data_JLPT_kanji/n4.json',
    '../assets/data_JLPT_kanji/n3_mimikara.json',
    '../assets/data_JLPT_kanji/n3_soumatome.json',
    '../assets/data_JLPT_kanji/n2_mimikara.json',
    '../assets/data_JLPT_kanji/n2_soumatome.json',
    '../assets/data_JLPT_kanji/n1.json',
  ],
  grammar: [
    '../assets/data_nn/n5.json',
    '../assets/data_nn/n4.json',
    '../assets/data_nn/n3_mimikara.json',
    '../assets/data_nn/n3_soumatome.json',
    '../assets/data_nn/n2_mimikara.json',
    '../assets/data_nn/n2_soumatome.json',
    '../assets/data_nn/n1.json',
  ],
  sentences: '../assets/sentences/sentences.json',
  kanjiFull: '../assets/data_JLPT_kanji/kanjifull.json',
};

// ── HÀM TIỆN ÍCH ──────────────────────────────────────────────────────────

function readJsonFile(filePath) {
  try {
    const fullPath = path.join(__dirname, filePath);
    if (!fs.existsSync(fullPath)) return null;
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  } catch (e) {
    console.warn(`  ⚠️  Lỗi đọc ${filePath}: ${e.message}`);
    return null;
  }
}

function extractKanjiFromText(text) {
  if (!text || typeof text !== 'string') return [];
  const matches = text.match(KANJI_REGEX) || [];
  return [...new Set(matches.map(k => k.normalize('NFC')))];
}

function extractKanjiFromObject(obj) {
  const kanjiSet = new Set();
  function traverse(item) {
    if (typeof item === 'string') {
      extractKanjiFromText(item).forEach(k => kanjiSet.add(k));
    } else if (Array.isArray(item)) {
      item.forEach(traverse);
    } else if (item && typeof item === 'object') {
      Object.values(item).forEach(traverse);
    }
  }
  traverse(obj);
  return [...kanjiSet];
}

function scanAllKanji() {
  const sourceOf = new Map();
  const addKanji = (k, srcLabel) => {
    if (!sourceOf.has(k)) sourceOf.set(k, new Set());
    sourceOf.get(k).add(srcLabel);
  };

  console.log('📖 Đang quét TỪ VỰNG...');
  for (const filePath of SOURCES.vocab) {
    const data = readJsonFile(filePath);
    if (Array.isArray(data)) {
      for (const item of data) {
        if (item.kanji) extractKanjiFromText(item.kanji).forEach(k => addKanji(k, 'vocab'));
        if (item.nghia) extractKanjiFromText(item.nghia).forEach(k => addKanji(k, 'vocab'));
        if (item.hiragana || item.hira) extractKanjiFromText(item.hiragana || item.hira).forEach(k => addKanji(k, 'vocab'));
      }
    }
  }

  console.log('🈳 Đang quét KANJI (sách theo bài học)...');
  for (const filePath of SOURCES.kanji) {
    const data = readJsonFile(filePath);
    if (Array.isArray(data)) {
      for (const item of data) {
        if (item.kanji) extractKanjiFromText(item.kanji).forEach(k => addKanji(k, 'kanji-book'));
      }
    }
  }

  console.log('📝 Đang quét NGỮ PHÁP...');
  for (const filePath of SOURCES.grammar) {
    const data = readJsonFile(filePath);
    if (Array.isArray(data)) {
      for (const item of data) {
        if (item.pattern) extractKanjiFromText(item.pattern).forEach(k => addKanji(k, 'grammar'));
        if (item.examples) {
          for (const ex of item.examples) {
            if (ex.jp) extractKanjiFromText(ex.jp).forEach(k => addKanji(k, 'grammar'));
          }
        }
      }
    }
  }

  console.log('💬 Đang quét MẪU CÂU...');
  const sentences = readJsonFile(SOURCES.sentences);
  if (Array.isArray(sentences)) {
    extractKanjiFromObject(sentences).forEach(k => addKanji(k, 'sentences'));
  }

  console.log('📚 Đang quét KANJIFULL...');
  const kanjiFullData = readJsonFile(SOURCES.kanjiFull);
  if (kanjiFullData) {
    if (Array.isArray(kanjiFullData)) {
      kanjiFullData.forEach((item) => {
        if (!item || typeof item !== 'object') return;
        Object.keys(item).forEach(k => {
          extractKanjiFromText(k).forEach(ch => addKanji(ch, 'kanjifull'));
        });
      });
    } else if (typeof kanjiFullData === 'object') {
      Object.keys(kanjiFullData).forEach(k => {
        extractKanjiFromText(k).forEach(ch => addKanji(ch, 'kanjifull'));
      });
    }
  } else {
    console.warn('  ⚠️  Không đọc được kanjifull.json');
  }

  const sorted = [...sourceOf.keys()].sort((a, b) => a.localeCompare(b));
  return { list: sorted, sourceOf };
}

// ── CDN HELPER ─────────────────────────────────────────────────────────────

function toHexId(char) {
  return char.codePointAt(0).toString(16).toLowerCase().padStart(5, '0');
}

function parseSvgPaths(rawSvg) {
  const clean = rawSvg.replace(/<g[^>]*id="kvg:StrokeNumbers[\s\S]*$/, '');
  const paths = [];
  const re = /<path[^>]*\bd="([^"]+)"/g;
  let m;
  while ((m = re.exec(clean)) !== null) {
    const d = m[1].trim();
    if (d) paths.push(d);
  }
  return paths;
}

async function checkOneKanji(kanji) {
  const hexId = toHexId(kanji);
  const url = `${CDN_BASE}${hexId}.svg`;
  try {
    const res = await fetch(url);
    if (!res.ok) return { kanji, hexId, found: false, reason: `HTTP ${res.status}` };
    const text = await res.text();
    const paths = parseSvgPaths(text);
    if (paths.length === 0) return { kanji, hexId, found: false, reason: 'parsed 0 paths' };
    return { kanji, hexId, found: true, strokeCount: paths.length };
  } catch (err) {
    return { kanji, hexId, found: false, reason: `network error: ${err.message}` };
  }
}

// ── WORKER POOL (song song có giới hạn, không cần thư viện ngoài) ──────────

async function runPool(items, concurrency, worker, onEach) {
  let idx = 0;

  async function runner() {
    while (idx < items.length) {
      const myIdx = idx++;
      const item = items[myIdx];
      const result = await worker(item);
      onEach(result);
    }
  }

  const runners = Array.from({ length: Math.min(concurrency, items.length) }, runner);
  await Promise.all(runners);
}

// ── CHECKPOINT ───────────────────────────────────────────────────────────

function loadCheckpoint() {
  if (!fs.existsSync(CHECKPOINT_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(CHECKPOINT_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function saveCheckpoint(results) {
  fs.writeFileSync(CHECKPOINT_PATH, JSON.stringify({ savedAt: new Date().toISOString(), results }), 'utf8');
}

// ── MAIN ───────────────────────────────────────────────────────────────────

async function main() {
  const fresh = process.argv.includes('--fresh');
  if (fresh && fs.existsSync(CHECKPOINT_PATH)) {
    fs.unlinkSync(CHECKPOINT_PATH);
    console.log('🗑  Đã xóa checkpoint cũ (--fresh)');
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔍 QUÉT TOÀN BỘ KANJI + KIỂM TRA CDN (song song, chỉ đọc)');
  console.log('═══════════════════════════════════════════════════════════\n');

  const { list: allKanji, sourceOf } = scanAllKanji();
  console.log(`\n📊 Tổng số kanji duy nhất: ${allKanji.length}`);

  const checkpoint = loadCheckpoint();
  const doneResults = checkpoint ? checkpoint.results : [];
  const doneSet = new Set(doneResults.map(r => r.kanji));
  const remaining = allKanji.filter(k => !doneSet.has(k));

  if (checkpoint) {
    console.log(`♻️  Tìm thấy checkpoint (${doneResults.length} chữ đã xong lúc ${checkpoint.savedAt}) — resume ${remaining.length} chữ còn lại`);
  }

  if (remaining.length === 0 && doneResults.length > 0) {
    console.log('✅ Đã kiểm tra xong toàn bộ từ checkpoint trước đó, xuất report luôn...');
    finalize(doneResults);
    return;
  }

  console.log(`⏳ Kiểm tra ${remaining.length} chữ, chạy song song ${CONCURRENCY} luồng...\n`);

  const results = [...doneResults];
  let sinceCheckpoint = 0;
  let doneCount = 0;
  const total = remaining.length;
  const startTime = Date.now();

  await runPool(remaining, CONCURRENCY, checkOneKanji, (result) => {
    result.sources = [...sourceOf.get(result.kanji)];
    results.push(result);
    sinceCheckpoint++;
    doneCount++;

    if (doneCount % 500 === 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      const failSoFar = results.filter(r => !r.found).length;
      console.log(`[${doneCount}/${total}] đã kiểm tra (${elapsed}s trôi qua) — lỗi tính đến giờ: ${failSoFar}`);
    }

    if (sinceCheckpoint >= CHECKPOINT_EVERY) {
      saveCheckpoint(results);
      sinceCheckpoint = 0;
    }
  });

  saveCheckpoint(results); // lưu lần cuối
  finalize(results);
}

function finalize(results) {
  const found = results.filter(r => r.found);
  const notFound = results.filter(r => !r.found);

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 TỔNG KẾT');
  console.log(`   Tổng số kiểm tra: ${results.length}`);
  console.log(`   ✅ CDN có dữ liệu: ${found.length}`);
  console.log(`   ❌ CDN KHÔNG có / lỗi: ${notFound.length}`);
  console.log('═══════════════════════════════════════════════════════════');

  const txtLines = [
    `Báo cáo kiểm tra CDN KanjiVG — ${new Date().toISOString()}`,
    `Tổng: ${results.length} | Có: ${found.length} | Thiếu/lỗi: ${notFound.length}`,
    '',
    '── CHUỖI TẤT CẢ CHỮ THIẾU (copy nhanh) ──',
    notFound.map(r => r.kanji).join(''),
    '',
    '── CHI TIẾT TỪNG CHỮ THIẾU/LỖI ──',
    ...notFound.map(r => `${r.kanji}  (hex=${r.hexId})  lý do: ${r.reason}  nguồn: ${r.sources.join(', ')}`),
  ];
  fs.writeFileSync(REPORT_TXT, txtLines.join('\n'), 'utf8');

  console.log(`\n📁 Đã ghi report: ${REPORT_TXT}`);

  console.log(`\n💡 Checkpoint vẫn giữ ở ${CHECKPOINT_PATH} — chạy lại với "--fresh" nếu muốn quét lại từ đầu (vd sau khi cập nhật nguồn data).`);
}

main().catch(err => {
  console.error('\n❌ Lỗi không mong muốn:', err);
  process.exit(1);
});
