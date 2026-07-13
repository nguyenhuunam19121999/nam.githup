// ─────────────────────────────────────────────────────────────────────────
// clean-kanji-json.cjs
// Dọn dẹp các file json kanji (n5, n4, n3_mimikara, n3_soumatome,
// n2_mimikara, n2_soumatome, n1): xóa field rác/dư thừa.
//
// MẶC ĐỊNH: xuất ra JSON có thụt lề 2 dấu cách (dễ đọc, kiểm tra).
// Thêm --minify để nén 1 dòng cho bản chính thức.
//
// Cách dùng:
//   node clean-kanji-json.cjs <file-vao.json> [file-ra.json] [--minify]
// ─────────────────────────────────────────────────────────────────────────

const fs = require('fs');

const args = process.argv.slice(2).filter(a => a !== '--minify');
const minify = process.argv.includes('--minify');

const inputPath = args[0];
if (!inputPath) {
  console.error('Thiếu đường dẫn file json đầu vào.');
  console.error('Dùng: node clean-kanji-json.cjs <file-vao.json> [file-ra.json] [--minify]');
  process.exit(1);
}

const outputPath = args[1] || inputPath.replace(/\.json$/i, '.min.json');

// ─── Field cấp ngoài cùng cần xóa ───────────────────────────────────────
const fieldsToRemove = ['examples', 'metadata', 'meanings_en', 'grade', 'components'];

// ─── Làm sạch meanings_vi ────────────────────────────────────────────────
// Xóa prefix "[nhân] " ở đầu mỗi nghĩa, sau đó loại bỏ trùng lặp.
// Ví dụ: ["[nhân] người", "[nhơn] người"] → ["người"]
function cleanMeaningsVi(meanings) {
  if (!Array.isArray(meanings)) return meanings;
  const seen = new Set();
  const result = [];
  for (const m of meanings) {
    if (typeof m !== 'string') { result.push(m); continue; }
    const cleaned = m.replace(/^\[[^\]]*\]\s*/, '').trim();
    if (!cleaned) continue;
    if (seen.has(cleaned)) continue;
    seen.add(cleaned);
    result.push(cleaned);
  }
  return result;
}

// ─── Xử lý từng entry ────────────────────────────────────────────────────
function cleanEntry(item) {
  if (!item || typeof item !== 'object') return item;
  const clone = { ...item };

  // Xóa field cấp ngoài cùng
  for (const field of fieldsToRemove) {
    delete clone[field];
  }

  // Xóa kunyomi nằm trong readings (không phải cấp ngoài cùng)
  if (clone.readings && typeof clone.readings === 'object') {
    clone.readings = { ...clone.readings };
    delete clone.readings.kunyomi;
  }

  // Làm sạch meanings_vi: bỏ prefix [âm hán việt] và xóa trùng
  if (clone.meanings_vi) {
    clone.meanings_vi = cleanMeaningsVi(clone.meanings_vi);
  }

  return clone;
}

// ─── Đọc + xử lý ─────────────────────────────────────────────────────────
const raw = fs.readFileSync(inputPath, 'utf8');
const beforeBytes = Buffer.byteLength(raw, 'utf8');

let data;
try {
  data = JSON.parse(raw);
} catch (err) {
  console.error('Lỗi parse JSON:', err.message);
  process.exit(1);
}

let cleaned;
if (Array.isArray(data)) {
  cleaned = data.map(cleanEntry);
} else if (data && typeof data === 'object') {
  cleaned = {};
  for (const key of Object.keys(data)) {
    cleaned[key] = Array.isArray(data[key])
      ? data[key].map(cleanEntry)
      : data[key];
  }
} else {
  cleaned = data;
}

const outputStr = minify ? JSON.stringify(cleaned) : JSON.stringify(cleaned, null, 2);
const afterBytes = Buffer.byteLength(outputStr, 'utf8');

fs.writeFileSync(outputPath, outputStr, 'utf8');

const percent = (((beforeBytes - afterBytes) / beforeBytes) * 100).toFixed(1);
console.log(`Đã xóa field: ${[...fieldsToRemove, 'readings.kunyomi'].join(', ')}`);
console.log(`Làm sạch meanings_vi: bỏ prefix [âm hán việt], xóa trùng`);
console.log(`Định dạng  : ${minify ? 'minify (1 dòng)' : 'thụt lề 2 dấu cách'}`);
console.log(`File gốc   : ${(beforeBytes / 1024).toFixed(1)} KB`);
console.log(`File mới   : ${(afterBytes / 1024).toFixed(1)} KB`);
console.log(`Giảm       : ${percent}%`);
console.log(`Ghi ra     : ${outputPath}`);
