/**
 * update_kanji_strokes.js
 * 
 * QUÉT TẤT CẢ NGUỒN -> TÌM KANJI MỚI -> TỰ ĐỘNG FETCH CDN -> CẬP NHẬT FILE JSON
 * 
 * CÁCH DÙNG: node scripts/update_kanji_strokes.js
 */

const fs = require('fs');
const path = require('path');

// ── CẤU HÌNH ──────────────────────────────────────────────────────────────
const FILE_PATH = path.join(__dirname, '../assets/data_JLPT_kanji/kanji_strokes.json');
const BACKUP_PATH = path.join(__dirname, '../assets/data_JLPT_kanji/kanji_strokes.json.backup');
const CDN_BASE = 'https://cdn.jsdelivr.net/gh/kanjivg/kanjivg@master/kanji/';

// Regex nhận diện Kanji
const KANJI_REGEX = /[\u4e00-\u9faf\u3400-\u4dbf]/g;

// Đường dẫn các nguồn dữ liệu
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
};

// ── HÀM TIỆN ÍCH ──────────────────────────────────────────────────────────

function readJsonFile(filePath) {
  try {
    const fullPath = path.join(__dirname, filePath);
    if (!fs.existsSync(fullPath)) return null;
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  } catch (e) {
    return null;
  }
}

function extractKanjiFromText(text) {
  if (!text || typeof text !== 'string') return [];
  const matches = text.match(KANJI_REGEX) || [];
  return [...new Set(matches)];
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

// ── QUÉT TẤT CẢ NGUỒN ──────────────────────────────────────────────────────

function scanAllKanji() {
  const kanjiSet = new Set();

  console.log('\n📖 Đang quét TỪ VỰNG...');
  for (const filePath of SOURCES.vocab) {
    const data = readJsonFile(filePath);
    if (Array.isArray(data)) {
      for (const item of data) {
        if (item.kanji) extractKanjiFromText(item.kanji).forEach(k => kanjiSet.add(k));
        if (item.nghia) extractKanjiFromText(item.nghia).forEach(k => kanjiSet.add(k));
        if (item.hiragana || item.hira) extractKanjiFromText(item.hiragana || item.hira).forEach(k => kanjiSet.add(k));
      }
    }
  }

  console.log('🈳 Đang quét KANJI...');
  for (const filePath of SOURCES.kanji) {
    const data = readJsonFile(filePath);
    if (Array.isArray(data)) {
      for (const item of data) {
        if (item.kanji) extractKanjiFromText(item.kanji).forEach(k => kanjiSet.add(k));
      }
    }
  }

  console.log('📝 Đang quét NGỮ PHÁP...');
  for (const filePath of SOURCES.grammar) {
    const data = readJsonFile(filePath);
    if (Array.isArray(data)) {
      for (const item of data) {
        if (item.pattern) extractKanjiFromText(item.pattern).forEach(k => kanjiSet.add(k));
        if (item.examples) {
          for (const ex of item.examples) {
            if (ex.jp) extractKanjiFromText(ex.jp).forEach(k => kanjiSet.add(k));
          }
        }
      }
    }
  }

  console.log('💬 Đang quét MẪU CÂU...');
  const sentences = readJsonFile(SOURCES.sentences);
  if (Array.isArray(sentences)) {
    extractKanjiFromObject(sentences).forEach(k => kanjiSet.add(k));
  }

  return [...kanjiSet].sort((a, b) => a.localeCompare(b));
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
  return paths.length > 0 ? paths : null;
}

function isSuspicious(kanji, paths) {
  if (!paths || paths.length === 0) return true;
  const count = paths.length;
  const code = kanji.codePointAt(0);
  if (code < 0x4e00 || code > 0x9faf) return false;
  
  const ultraSimple = new Set([
    '一', '二', '三', '人', '入', '八', '十', '口', '山', '川', '工', '土', '女', '子', '大', '小', '力', '刀', '几', '又', '夕', '丸', '万', '才', '也', '于', '亡', '及', '久'
  ]);
  if (ultraSimple.has(kanji)) return false;
  if (count <= 3) return true;
  return false;
}

async function fetchStrokePaths(kanji) {
  const hexId = toHexId(kanji);
  const url = `${CDN_BASE}${hexId}.svg`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const text = await res.text();
    return parseSvgPaths(text);
  } catch (e) {
    return null;
  }
}

// ── MAIN ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔍 CẬP NHẬT KANJI_STROKES.JSON TỰ ĐỘNG');
  console.log('═══════════════════════════════════════════════════════════');

  // 1. Quét tất cả Kanji từ các nguồn
  const allKanji = scanAllKanji();
  console.log(`\n📊 Tổng số Kanji tìm thấy: ${allKanji.length}`);

  // 2. Đọc file JSON hiện tại
  let existingData = {};
  if (fs.existsSync(FILE_PATH)) {
    existingData = JSON.parse(fs.readFileSync(FILE_PATH, 'utf8'));
    console.log(`📁 File hiện tại có: ${Object.keys(existingData).length} chữ`);
  } else {
    console.log('📁 Chưa có file, sẽ tạo mới');
  }

  // 3. Tìm Kanji mới chưa có trong file
  const existingKanji = new Set(Object.keys(existingData));
  const newKanji = allKanji.filter(k => !existingKanji.has(k));
  
  console.log(`✨ Phát hiện ${newKanji.length} chữ Kanji MỚI cần thêm`);

  if (newKanji.length === 0) {
    console.log('\n✅ Không có Kanji mới. Kiểm tra lỗi nét...');
    
    // Vẫn kiểm tra chữ bị thiếu nét
    const toFix = [];
    for (const [kanji, paths] of Object.entries(existingData)) {
      if (isSuspicious(kanji, paths)) {
        toFix.push(kanji);
      }
    }
    
    if (toFix.length === 0) {
      console.log('✅ Tất cả Kanji đều có dữ liệu nét hợp lệ!');
      return;
    }
    
    console.log(`⚠️ Phát hiện ${toFix.length} chữ cần sửa nét`);
    
    // Backup
    fs.writeFileSync(BACKUP_PATH, JSON.stringify(existingData, null, 2));
    console.log(`💾 Đã backup: ${BACKUP_PATH}`);
    
    // Sửa từng chữ
    let fixed = 0;
    for (let i = 0; i < toFix.length; i++) {
      const kanji = toFix[i];
      console.log(`[${i + 1}/${toFix.length}] Đang sửa: "${kanji}"...`);
      
      const paths = await fetchStrokePaths(kanji);
      if (paths && paths.length > 0) {
        existingData[kanji] = paths;
        fixed++;
        console.log(`   ✅ Thành công: ${paths.length} nét`);
      } else {
        console.log(`   ❌ Thất bại: không fetch được`);
      }
      await new Promise(r => setTimeout(r, 100));
    }
    
    // Lưu file
    fs.writeFileSync(FILE_PATH, JSON.stringify(existingData, null, 2));
    console.log(`\n📝 Đã lưu file: ${FILE_PATH}`);
    console.log(`✅ Sửa thành công: ${fixed}/${toFix.length} chữ`);
    return;
  }

  // 4. CÓ KANJI MỚI -> Backup + Thêm mới
  console.log('\n💾 Đang tạo backup...');
  if (fs.existsSync(FILE_PATH)) {
    fs.writeFileSync(BACKUP_PATH, JSON.stringify(existingData, null, 2));
    console.log(`   Backup: ${BACKUP_PATH}`);
  }

  // 5. Thêm Kanji mới (để trống, sẽ fetch sau)
  for (const kanji of newKanji) {
    existingData[kanji] = [];
  }

  // 6. Fetch dữ liệu cho Kanji mới và chữ bị lỗi
  const toFetch = [...newKanji];
  
  // Thêm các chữ có dữ liệu lỗi vào danh sách fetch
  for (const [kanji, paths] of Object.entries(existingData)) {
    if (isSuspicious(kanji, paths) && !toFetch.includes(kanji)) {
      toFetch.push(kanji);
    }
  }

  console.log(`\n🌐 Cần fetch dữ liệu cho ${toFetch.length} chữ...`);

  let successCount = 0;
  for (let i = 0; i < toFetch.length; i++) {
    const kanji = toFetch[i];
    console.log(`[${i + 1}/${toFetch.length}] Đang xử lý: "${kanji}"...`);
    
    const paths = await fetchStrokePaths(kanji);
    if (paths && paths.length > 0) {
      existingData[kanji] = paths;
      successCount++;
      console.log(`   ✅ Thành công: ${paths.length} nét`);
    } else {
      console.log(`   ❌ Thất bại: không fetch được`);
    }
    await new Promise(r => setTimeout(r, 100));
  }

  // 7. Lưu file
  fs.writeFileSync(FILE_PATH, JSON.stringify(existingData, null, 2));
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🎉 HOÀN THÀNH!');
  console.log(`   ✅ Thêm mới: ${newKanji.length} chữ`);
  console.log(`   ✅ Fetch thành công: ${successCount}/${toFetch.length} chữ`);
  console.log(`   📁 File: ${FILE_PATH}`);
  console.log(`   💾 Backup: ${BACKUP_PATH}`);
  console.log('═══════════════════════════════════════════════════════════');
}

main().catch(err => {
  console.error('\n❌ Lỗi:', err);
  process.exit(1);
});