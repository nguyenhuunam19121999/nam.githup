const fs = require('fs');
const path = require('path');

// Cấu hình đường dẫn dữ liệu
const FILE_PATH = path.join(__dirname, 'kanji_strokes.json');
const BACKUP_PATH = path.join(__dirname, 'kanji_strokes.json.backup');
const CDN_BASE = 'https://cdn.jsdelivr.net/gh/kanjivg/kanjivg@master/kanji/';

// Helper chuyển chữ thành mã Hex định dạng của KanjiVG (ví dụ: '驚' -> '09a59')
function toHexId(char) {
  return char.codePointAt(0).toString(16).toLowerCase().padStart(5, '0');
}

// Hàm trích xuất các nét d="..." từ file SVG nhận về từ CDN
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

// Hàm đánh giá xem một chữ Kanji có khả năng cao là bị thiếu nét hay không
function isSuspicious(kanji, paths) {
  if (!paths || paths.length === 0) return true;
  
  const count = paths.length;
  const code = kanji.codePointAt(0);
  
  // Bỏ qua các ký tự đặc biệt, kana hoặc ký tự Latin lọt lưới
  if (code < 0x4e00 || code > 0x9faf) return false;

  // Các chữ Kanji phổ biến cực kỳ đơn giản (1 đến 3 nét)
  const ultraSimple = new Set([
    '一', '二', '三', '𠄎', '亠', '人', '入', '八', '几', '凵', '刀', '力', '勹', '匕', '匚', '十', '卜', '卩', '厂', '厶', '又', '口', '囗', '土', '士', '夂', '夕', '大', '女子', '子', '宀', '寸', '小', '尢', '尸', '屮', '山', '巛', '川', '工', '己', '巾', '干', '幺', '广', '廴', '廾', '弋', '弓', '彐', '彡', '彳', '才', '万', '丈', '与', '丑', '专', '丸', '也', '于', '亡', '及', '久', '个', '丫', '丸', '丌'
  ]);
  if (ultraSimple.has(kanji)) return false;

  // Nếu không nằm trong tập chữ siêu đơn giản bên trên mà chỉ có <= 3 nét -> Rất nghi ngờ bị lỗi thiếu nét
  if (count <= 3) return true;

  return false;
}

async function main() {
  console.log('🚀 Khởi động script kiểm tra và sửa lỗi file kanji_strokes.json...');

  if (!fs.existsSync(FILE_PATH)) {
    console.error(`❌ Không tìm thấy file JSON tại mục: ${FILE_PATH}`);
    process.exit(1);
  }

  // Đọc dữ liệu hiện tại
  const rawData = fs.readFileSync(FILE_PATH, 'utf8');
  let data;
  try {
    data = JSON.parse(rawData);
  } catch (e) {
    console.error('❌ Định dạng file JSON đang lỗi, không thể parse!', e);
    process.exit(1);
  }

  const kanjiList = Object.keys(data);
  const queueFix = [];

  // Quét tìm từ lỗi
  for (const kanji of kanjiList) {
    if (isSuspicious(kanji, data[kanji])) {
      queueFix.push(kanji);
    }
  }

  console.log(`📊 Tổng số chữ trong file: ${kanjiList.length}`);
  console.log(`⚠️ Phát hiện ${queueFix.length} chữ bị thiếu nét nghiêm trọng cần sửa.`);

  if (queueFix.length === 0) {
    console.log('✅ File của bạn hoàn toàn sạch sẽ, không có lỗi nét vẽ!');
    return;
  }

  // Tiến hành tạo bản sao lưu an toàn trước khi chạy cập nhật dữ liệu
  console.log('💾 Đang tạo file backup an toàn tại kanji_strokes.json.backup...');
  fs.writeFileSync(BACKUP_PATH, rawData, 'utf8');

  // Khởi tạo fetch dynamic (sử dụng thư viện fetch có sẵn của Node.js v18+)
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < queueFix.length; i++) {
    const kanji = queueFix[i];
    const hexId = toHexId(kanji);
    const url = `${CDN_BASE}${hexId}.svg`;

    console.log(`[${i + 1}/${queueFix.length}] Đang sửa chữ: "${kanji}" (Mã hex: ${hexId})...`);

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
      
      const svgText = await response.text();
      const cleanPaths = parseSvgPaths(svgText);

      if (cleanPaths && cleanPaths.length > 0) {
        const oldLen = data[kanji] ? data[kanji].length : 0;
        data[kanji] = cleanPaths; // Ghi đè cập nhật số nét chuẩn vào bộ nhớ tạm
        successCount++;
        console.log(`   👉 Thành công: Đã sửa từ ${oldLen} nét thành -> ${cleanPaths.length} nét chuẩn.`);
      } else {
        throw new Error('Không thể bóc tách được các thẻ Path từ SVG của CDN.');
      }
    } catch (err) {
      failCount++;
      console.error(`   ❌ Thất bại khi sửa chữ "${kanji}":`, err.message);
    }

    // Tránh spam CDN quá dồn dập gây khóa IP (delay nhẹ 100ms)
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Lưu file đè lại sau khi quét sửa xong
  console.log('📝 Đang tiến hành ghi dữ liệu mới cập nhật vào file kanji_strokes.json...');
  fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2), 'utf8');

  console.log('\n🏁 --- QUÁ TRÌNH HOÀN TẤT ---');
  console.log(`✅ Sửa thành công: ${successCount} chữ.`);
  console.log(`❌ Thất bại: ${failCount} chữ.`);
  console.log('🎉 Hãy tải lại ứng dụng hoặc reload bundler để hưởng thành quả!');
}

main();