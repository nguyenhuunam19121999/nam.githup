/**
 * add_manual_kanji_stroke.cjs
 *
 * Thêm dữ liệu nét vẽ TỰ VẼ TAY (export từ Method Draw hoặc bất kỳ SVG editor
 * nào) vào kanji_strokes.json — đúng format mảng path "d", theo đúng thứ tự
 * path xuất hiện trong file SVG (= thứ tự nét nếu bạn vẽ đúng thứ tự).
 *
 * CÁCH DÙNG:
 *   node scripts/add_manual_kanji_stroke.cjs <kanji> <duong-dan-file.svg>
 *   node scripts/add_manual_kanji_stroke.cjs <kanji> <duong-dan-file.svg> --force
 *
 * --force: ghi đè nếu kanji đã tồn tại trong kanji_strokes.json
 *          (mặc định script sẽ TỪ CHỐI ghi đè để tránh mất dữ liệu cũ)
 */

const fs = require('fs');
const path = require('path');

// ── CẤU HÌNH ─────────────────────────────────────────────────────────────
const STROKES_JSON_PATH = path.join(__dirname, '../assets/kanji_strokes.json');
const BACKUP_SUFFIX = '.backup';

// ── HELPERS ──────────────────────────────────────────────────────────────

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

function printUsage() {
  console.log(`
CÁCH DÙNG:
  node scripts/add_manual_kanji_stroke.cjs <kanji> <duong-dan-file.svg> [--force]

VÍ DỤ:
  node scripts/add_manual_kanji_stroke.cjs 器 ./tmp/器.svg
  node scripts/add_manual_kanji_stroke.cjs 器 ./tmp/器.svg --force
`);
}

/**
 * Trích xuất tất cả path "d" trong file SVG, theo đúng thứ tự xuất hiện
 * trong document. Không quan tâm thứ tự attribute bên trong thẻ <path>.
 */
function extractPathsFromSvg(svgContent) {
  const paths = [];
  const pathTagRegex = /<path\b[^>]*>/gi;
  const dAttrRegex = /\bd\s*=\s*"([^"]+)"/i;

  let match;
  while ((match = pathTagRegex.exec(svgContent)) !== null) {
    const tag = match[0];
    const dMatch = tag.match(dAttrRegex);
    if (dMatch && dMatch[1].trim()) {
      paths.push(dMatch[1].trim());
    }
  }
  return paths;
}

function loadStrokesJson() {
  if (!fs.existsSync(STROKES_JSON_PATH)) {
    fail(`Không tìm thấy file: ${STROKES_JSON_PATH}`);
  }
  const raw = fs.readFileSync(STROKES_JSON_PATH, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (e) {
    fail(`kanji_strokes.json bị lỗi JSON: ${e.message}`);
  }
}

function backupStrokesJson() {
  const backupPath = STROKES_JSON_PATH + BACKUP_SUFFIX;
  fs.copyFileSync(STROKES_JSON_PATH, backupPath);
  return backupPath;
}

// ── MAIN ─────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const positional = args.filter((a) => a !== '--force');

  const [kanjiArg, svgPathArg] = positional;

  if (!kanjiArg || !svgPathArg) {
    printUsage();
    fail('Thiếu tham số. Cần: <kanji> <duong-dan-file.svg>');
  }

  // Chuẩn hóa NFC — BẮT BUỘC. Chuỗi kanji copy từ nhiều nguồn (clipboard macOS,
  // trình duyệt...) có thể ở dạng NFD, tạo ra 2 key trông giống hệt nhau nhưng
  // khác byte, khiến app tra cứu không thấy dữ liệu dù "nhìn" đúng chữ trong JSON.
  const kanji = kanjiArg.normalize('NFC');

  if ([...kanji].length !== 1) {
    fail(`Tham số kanji phải là ĐÚNG 1 ký tự. Nhận được: "${kanjiArg}" (${[...kanji].length} ký tự)`);
  }

  const svgFullPath = path.resolve(svgPathArg);
  if (!fs.existsSync(svgFullPath)) {
    fail(`Không tìm thấy file SVG: ${svgFullPath}`);
  }

  const svgContent = fs.readFileSync(svgFullPath, 'utf8');
  const paths = extractPathsFromSvg(svgContent);

  if (paths.length === 0) {
    fail('Không trích được path "d" nào trong file SVG. Kiểm tra lại file export (phải có thẻ <path d="...">).');
  }

  console.log(`📄 File SVG: ${svgFullPath}`);
  console.log(`✏️  Tìm thấy ${paths.length} nét (path) cho chữ "${kanji}":`);
  paths.forEach((d, i) => {
    const preview = d.length > 60 ? d.slice(0, 60) + '...' : d;
    console.log(`   ${i + 1}. ${preview}`);
  });

  const strokesData = loadStrokesJson();
  const existing = strokesData[kanji];

  if (existing && !force) {
    console.log(`\n⚠️  Chữ "${kanji}" ĐÃ TỒN TẠI trong kanji_strokes.json (${existing.length} nét).`);
    console.log('   Dùng --force nếu muốn GHI ĐÈ. Không ghi gì cả, dừng lại.');
    process.exit(1);
  }

  if (existing && force) {
    console.log(`\n⚠️  Ghi đè "${kanji}": ${existing.length} nét cũ -> ${paths.length} nét mới (--force).`);
  }

  const backupPath = backupStrokesJson();
  console.log(`\n💾 Đã backup: ${backupPath}`);

  strokesData[kanji] = paths;

  // Sắp xếp lại key theo Unicode để file dễ diff/đọc (không ảnh hưởng dữ liệu)
  const sortedEntries = Object.entries(strokesData).sort(([a], [b]) => a.localeCompare(b, 'ja'));
  const sortedData = Object.fromEntries(sortedEntries);

  fs.writeFileSync(STROKES_JSON_PATH, JSON.stringify(sortedData, null, 2), 'utf8');

  console.log(`\n✅ Đã ghi "${kanji}" (${paths.length} nét) vào kanji_strokes.json`);
  console.log('\n👉 BƯỚC TIẾP THEO:');
  console.log('   1. node scripts/buildDb.cjs        (build lại kanji.db)');
  console.log('   2. npx expo start -c                (clear cache để app nạp DB mới)');
}

main();
