// scripts/generateFuriganaGrammar.cjs
//
// Đọc toàn bộ file assets/data_nn/*.json, dùng Kuroshiro tách furigana cho
// field "jp" trong mỗi phần tử "examples" của mỗi mẫu ngữ pháp, ghi thêm
// "reading" (mảng ContentSegment[]) rồi lưu đè lại đúng file JSON gốc.
//
// Chạy: node scripts/generateFuriganaGrammar.cjs

const fs = require('fs');
const path = require('path');
const Kuroshiro = require('kuroshiro').default;
const KuromojiAnalyzer = require('kuroshiro-analyzer-kuromoji');

const ROOT = path.resolve(__dirname, '..');
const GRAMMAR_DIR = path.join(ROOT, 'assets', 'data_nn');

const FILES = [
  'n5.json', 'n4.json',
  'n3_mimikara.json', 'n3_soumatome.json',
  'n2_mimikara.json', 'n2_soumatome.json',
  'n1.json',
];

function parseFuriganaHtml(html) {
  const segments = [];
  const regex = /<ruby>([^<]+)<rp>\(<\/rp><rt>([^<]*)<\/rt><rp>\)<\/rp><\/ruby>/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(html)) !== null) {
    const [full, kanjiText, furigana] = match;
    const plainBefore = html.slice(lastIndex, match.index);
    if (plainBefore) segments.push({ text: plainBefore });
    segments.push({ text: kanjiText, furigana });
    lastIndex = match.index + full.length;
  }

  const rest = html.slice(lastIndex);
  if (rest) segments.push({ text: rest });

  return segments;
}

async function main() {
  console.log('⏳ Đang khởi tạo Kuroshiro...');
  const kuroshiro = new Kuroshiro();
  await kuroshiro.init(new KuromojiAnalyzer());
  console.log('✅ Kuroshiro sẵn sàng.\n');

  for (const file of FILES) {
    const filePath = path.join(GRAMMAR_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.log(`⏭  Bỏ qua (không tồn tại): ${file}`);
      continue;
    }

    const items = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!Array.isArray(items)) {
      console.warn(`⚠️  ${file} không phải mảng, bỏ qua.`);
      continue;
    }

    let processed = 0;
    let skipped = 0;

    for (const grammarItem of items) {
      if (!Array.isArray(grammarItem.examples)) continue;

      for (const ex of grammarItem.examples) {
        if (!ex || !ex.jp) continue;

        if (Array.isArray(ex.reading) && ex.reading.length > 0) {
          skipped++;
          continue;
        }

        try {
          const html = await kuroshiro.convert(ex.jp, { to: 'hiragana', mode: 'furigana' });
          ex.reading = parseFuriganaHtml(html);
          processed++;
        } catch (err) {
          console.warn(`  ⚠️  Lỗi câu "${ex.jp}": ${err.message}`);
          ex.reading = [{ text: ex.jp }];
        }
      }
    }

    fs.writeFileSync(filePath, JSON.stringify(items, null, 2), 'utf8');
    console.log(`✓ ${file}: xử lý ${processed}, bỏ qua ${skipped}`);
  }

  console.log('\n✅ Hoàn tất toàn bộ file ngữ pháp.');
}

main().catch((err) => {
  console.error('❌ Lỗi:', err);
  process.exit(1);
});