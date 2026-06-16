// ─────────────────────────────────────────────────────────────────────────────
// services/db.ts
// Khởi tạo kết nối SQLite — copy file kanji.db từ assets lần đầu chạy app
// ─────────────────────────────────────────────────────────────────────────────
import * as FileSystem from 'expo-file-system/legacy';
import * as SQLite from 'expo-sqlite';
// import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';

let _db: SQLite.SQLiteDatabase | null = null;
let _initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  // Tránh khởi tạo song song
  if (_initPromise) return _initPromise;
  _initPromise = _init();
  return _initPromise;
}

async function _init(): Promise<SQLite.SQLiteDatabase> {
  const DB_NAME = 'kanji.db';
  const DB_DIR  = `${FileSystem.documentDirectory}SQLite/`;
  const DB_PATH = `${DB_DIR}${DB_NAME}`;

  // Tạo thư mục SQLite nếu chưa có
  const dirInfo = await FileSystem.getInfoAsync(DB_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(DB_DIR, { intermediates: true });
  }

  // Chỉ copy lần đầu (hoặc khi app update — kiểm tra bằng version)
  const fileInfo = await FileSystem.getInfoAsync(DB_PATH);
  if (!fileInfo.exists) {
    console.log('[DB] Lần đầu chạy — copy kanji.db từ assets...');
    const asset = Asset.fromModule(require('../assets/kanji.db'));
    await asset.downloadAsync();
    if (!asset.localUri) throw new Error('Không tải được kanji.db từ assets');
    await FileSystem.copyAsync({ from: asset.localUri, to: DB_PATH });
    console.log('[DB] Copy xong!');
  }

  _db = await SQLite.openDatabaseAsync(DB_NAME);
  console.log('[DB] Kết nối SQLite thành công');
  return _db;
}