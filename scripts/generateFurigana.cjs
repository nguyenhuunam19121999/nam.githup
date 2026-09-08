// scripts/generateFurigana.cjs
//
// Đọc assets/sentences/sentences.json, dùng Kuroshiro để tự động tách mỗi câu
// thành mảng ContentSegment[] (dạng {text, furigana}), ghi thêm field "reading"
// vào từng câu, rồi lưu đè lại file JSON gốc.
//
// Chạy: node scripts/generateFurigana.cjs
//
// Chỉ cần chạy lại khi thêm câu MỚI vào sentences.json — script tự bỏ qua
// câu đã có sẵn "reading" để đỡ tốn thời gian xử lý lại từ đầu.

const fs = require('fs');
const path = require('path');
const Kuroshiro = require('kuroshiro').default;
const KuromojiAnalyzer = require('kuroshiro-analyzer-kuromoji');

const ROOT = path.resolve(__dirname, '..');
const SENTENCES_PATH = path.join(ROOT, 'assets', 'sentences', 'sentences.json');
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
  if (!fs.existsSync(SENTENCES_PATH)) {
    console.error(`❌ Không tìm thấy: ${SENTENCES_PATH}`);
    process.exit(1);
  }

    const raw = JSON.parse(fs.readFileSync(SENTENCES_PATH, 'utf8'));
  const items = Array.isArray(raw?.sentences) ? raw.sentences : Array.isArray(raw) ? raw : [];

  if (items.length === 0) {
    console.error('❌ sentences.json rỗng hoặc sai định dạng.');
    process.exit(1);
  }

  for (const item of items) {
    delete item.reading;
  }

  console.log(`📖 Tổng số câu: ${items.length}`);
  console.log('⏳ Đang khởi tạo Kuroshiro (tải từ điển kuromoji lần đầu hơi lâu)...');

  const kuroshiro = new Kuroshiro();
  await kuroshiro.init(new KuromojiAnalyzer());

  console.log('✅ Kuroshiro sẵn sàng. Bắt đầu xử lý...\n');

  let processed = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item || !item.jp) continue;

    // Đã có reading từ lần chạy trước → bỏ qua để tiết kiệm thời gian
    if (Array.isArray(item.reading) && item.reading.length > 0) {
      skipped++;
      continue;
    }

    try {
      const html = await kuroshiro.convert(item.jp, { to: 'hiragana', mode: 'furigana' });
      item.reading = parseFuriganaHtml(html);
      processed++;
    } catch (err) {
      console.warn(`  ⚠️  Lỗi câu #${i} ("${item.jp}"): ${err.message}`);
      item.reading = [{ text: item.jp }]; // fallback: không furigana, vẫn hiển thị được
      failed++;
    }

    if ((processed + failed) % 200 === 0) {
      console.log(`  ... đã xử lý ${processed + failed}/${items.length - skipped}`);
    }
  }

  const output = Array.isArray(raw?.sentences) ? { ...raw, sentences: items } : items;
  fs.writeFileSync(SENTENCES_PATH, JSON.stringify(output, null, 2), 'utf8');

  console.log(`\n✅ Hoàn tất!`);
  console.log(`   Đã xử lý mới: ${processed}`);
  console.log(`   Bỏ qua (đã có sẵn): ${skipped}`);
  console.log(`   Lỗi (dùng fallback): ${failed}`);
  console.log(`   Đã ghi đè: ${SENTENCES_PATH}`);
}

main().catch((err) => {
  console.error('❌ Lỗi không mong muốn:', err);
  process.exit(1);
});