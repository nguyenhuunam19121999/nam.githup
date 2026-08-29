// scripts/syncAiCache.cjs
//
// Chạy thủ công định kỳ (khi bạn muốn build bản mới):
//   node scripts/syncAiCache.cjs   tải xuống json
//   node scripts/buildDb.cjs 
// LUỒNG XỬ LÝ:
// 1. Tải TOÀN BỘ document trong Firestore collection "ai_cache"
// 2. Gộp (merge) vào file JSON gốc TRONG PROJECT — file này lưu trong git,
//    tồn tại vĩnh viễn, tích luỹ dần theo thời gian, KHÔNG bao giờ bị xoá.
//    Nếu 1 key đã có sẵn trong file (từ lần sync trước) → GIỮ NGUYÊN bản cũ,
//    không ghi đè — tránh mất dữ liệu nếu có gì bất thường.
// 3. CHỈ SAU KHI đã ghi file thành công, mới xoá các document đó khỏi Firestore
//    (thứ tự này quan trọng — đảm bảo không bao giờ mất dữ liệu giữa chừng)
//
// CẦN CÀI: npm install firebase-admin --save-dev  (chạy trong thư mục scripts/)
//
// CẦN CÓ: file service account JSON (đã tải ở bước setup Worker trước đó,
// đang được cất ở nơi AN TOÀN ngoài project). KHÔNG copy file đó vào project.

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// ⚠️ SỬA ĐƯỜNG DẪN NÀY cho đúng vị trí thật trên máy bạn (nơi bạn đã di
// chuyển file admin key ra ngoài project ở bước setup Worker trước đó).
// Có thể dùng biến môi trường FIREBASE_SERVICE_ACCOUNT_PATH thay vì sửa cứng.
const SERVICE_ACCOUNT_PATH =
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
//   'D:\\firebase-keys\\mirei\\mirei-c5dda-firebase-adminsdk-fbsvc-03171667e7.json';
'D:\\apps\\1.0.5\\mirei-c5dda-firebase-adminsdk-fbsvc-03171667e7.json';

const MASTER_FILE = path.join(__dirname, '..', 'assets', 'data_ai_cache', 'ai_cache_master.json');
const BATCH_SIZE = 400; // Firestore giới hạn batch write tối đa 500 thao tác/lần

async function main() {
  if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    console.error('❌ Không tìm thấy file service account tại:', SERVICE_ACCOUNT_PATH);
    console.error('   → Sửa biến SERVICE_ACCOUNT_PATH trong file này cho đúng đường dẫn thật,');
    console.error('     hoặc chạy: set FIREBASE_SERVICE_ACCOUNT_PATH=đường_dẫn_thật (PowerShell: $env:FIREBASE_SERVICE_ACCOUNT_PATH="...")');
    process.exit(1);
  }

  const serviceAccount = require(SERVICE_ACCOUNT_PATH);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const db = admin.firestore();

  console.log('📥 Đang tải toàn bộ document trong collection "ai_cache"...');
  const snapshot = await db.collection('ai_cache').get();

  if (snapshot.empty) {
    console.log('✅ Collection "ai_cache" hiện đang trống. Không có gì để đồng bộ.');
    return;
  }
  console.log(`   Tìm thấy ${snapshot.size} document.`);

  // Đọc file master hiện có (nếu chưa từng tạo thì bắt đầu từ object rỗng)
  let master = {};
  if (fs.existsSync(MASTER_FILE)) {
    try {
      master = JSON.parse(fs.readFileSync(MASTER_FILE, 'utf8'));
    } catch (err) {
      console.error('❌ File master hiện tại bị lỗi định dạng JSON — DỪNG LẠI để tránh ghi đè mất dữ liệu.');
      console.error('   Kiểm tra thủ công file:', MASTER_FILE);
      process.exit(1);
    }
  }

  let addedCount = 0;
  let skippedCount = 0;
  let malformedCount = 0;
  const idsToDelete = [];

  snapshot.forEach((doc) => {
    const cacheKey = doc.id; // ví dụ: "vocab_%E5%8B%89%E5%BC%B7" (đã encodeURIComponent khi Worker ghi)
    const docData = doc.data();

    let parsed;
    try {
      parsed = JSON.parse(docData.data); // Worker lưu field "data" dạng JSON string
    } catch (err) {
      console.warn(`⚠️  Bỏ qua "${cacheKey}" — không parse được JSON (${err.message}). GIỮ LẠI trên Firebase để kiểm tra sau.`);
      malformedCount++;
      return; // KHÔNG thêm vào idsToDelete
    }

    if (master[cacheKey]) {
      skippedCount++; // đã có sẵn từ lần sync trước, giữ nguyên bản cũ
    } else {
      master[cacheKey] = { ...parsed, cachedAt: docData.cachedAt || null };
      addedCount++;
    }
    idsToDelete.push(cacheKey); // an toàn để xoá — đã có bản sao (cũ hoặc mới) trong file
  });

  // ---- Ghi file TRƯỚC — chỉ xoá Firebase SAU KHI ghi file thành công ----
  // Ghi ra file tạm .tmp rồi mới rename — rename trên cùng ổ đĩa là thao tác
  // atomic, nên nếu tiến trình bị ngắt giữa chừng (mất điện, Ctrl+C...),
  // ai_cache_master.json gốc vẫn nguyên vẹn; chỉ file .tmp bị dở dang và
  // không ảnh hưởng gì, có thể xoá tay hoặc để lần chạy sau ghi đè lại.
  fs.mkdirSync(path.dirname(MASTER_FILE), { recursive: true });
  const tmpFile = `${MASTER_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(master, null, 2), 'utf8');
  fs.renameSync(tmpFile, MASTER_FILE);
  console.log(`✅ Đã ghi file: ${MASTER_FILE}`);
  console.log(`   + ${addedCount} mục mới · bỏ qua ${skippedCount} mục trùng · ${malformedCount} mục lỗi (giữ lại trên Firebase)`);
  console.log(`   Tổng số mục hiện có trong file master: ${Object.keys(master).length}`);

  if (idsToDelete.length === 0) {
    console.log('ℹ️  Không có document nào đủ điều kiện xoá (toàn bộ đều lỗi JSON).');
    return;
  }

  console.log(`🗑️  Đang xoá ${idsToDelete.length} document khỏi Firestore...`);
  for (let i = 0; i < idsToDelete.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = idsToDelete.slice(i, i + BATCH_SIZE);
    chunk.forEach((docId) => batch.delete(db.collection('ai_cache').doc(docId)));
    await batch.commit();
    console.log(`   Đã xoá ${Math.min(i + BATCH_SIZE, idsToDelete.length)}/${idsToDelete.length}`);
  }

  console.log('🎉 Hoàn tất! Firestore "ai_cache" giờ chỉ còn các mục lỗi (nếu có) hoặc trống hẳn.');
  console.log('   Bước tiếp theo: chạy `node scripts/buildDb.cjs` để build vào SQLite.');
}

main().catch((err) => {
  console.error('❌ Lỗi không mong muốn:', err);
  process.exit(1);
});
