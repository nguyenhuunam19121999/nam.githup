// ─────────────────────────────────────────────────────────────────────────────
// services/db.ts
// Khởi tạo kết nối SQLite từ các asset DB riêng biệt: kanji, vocab, grammar, sentences.
// Đã cập nhật dùng API mới (File / Directory) của expo-file-system SDK 54+.
// ─────────────────────────────────────────────────────────────────────────────
import { Directory, File, Paths } from 'expo-file-system';
import * as SQLite from 'expo-sqlite';
import { Asset } from 'expo-asset';

const DB_NAMES = {
  kanji: 'kanji.db',
  vocab: 'vocab.db',
  grammar: 'grammar.db',
  sentences: 'sentences.db',
} as const;

export type DbScope = keyof typeof DB_NAMES;

const DB_CACHE = new Map<DbScope, SQLite.SQLiteDatabase>();
const DB_INIT_PROMISES = new Map<DbScope, Promise<SQLite.SQLiteDatabase | null>>();

function getAssetDbModule(scope: DbScope) {
  try {
    switch (scope) {
      case 'kanji':
        return require('../assets/kanji.db');
      case 'vocab':
        return require('../assets/vocab.db');
      case 'grammar':
        return require('../assets/grammar.db');
      case 'sentences':
        return require('../assets/sentences.db');
      default:
        return null;
    }
  } catch {
    return null;
  }
}

async function ensureDbFileCopied(scope: DbScope): Promise<boolean> {
  const dbName = DB_NAMES[scope];

  try {
    const sqliteDir = new Directory(Paths.document, 'SQLite');
    if (!sqliteDir.exists) {
      sqliteDir.create({ intermediates: true });
    }

    const destFile = new File(sqliteDir, dbName);
    const hashFile = new File(sqliteDir, `${dbName}.hash`);

    const assetModule = getAssetDbModule(scope);
    if (!assetModule) {
      console.warn(`[db] asset module not found for ${scope}`);
      return false;
    }

    const asset = Asset.fromModule(assetModule);

    // Metro/Expo tự tính hash MD5 dựa trên NỘI DUNG file .db lúc build app.
    // Chạy lại `node scripts/buildDb.cjs` → file .db đổi nội dung → hash tự đổi theo.
    // Không cần bạn tăng số version thủ công nữa.
    const newHash: string | null = (asset as any).hash ?? null;
    const storedHash = hashFile.exists ? await hashFile.text() : null;
    const hashMatches = newHash !== null && storedHash === newHash;

    if (destFile.exists && hashMatches) {
      return true; // Nội dung DB không đổi từ lần cài trước → giữ nguyên, không copy lại
    }

    if (destFile.exists) {
      console.log(`[db] Phát hiện DB mới cho ${scope} (nội dung đổi) — xóa và copy lại`);
      destFile.delete();
    }

    await asset.downloadAsync();
    if (!asset.localUri) {
      console.warn(`[db] asset localUri missing for ${scope}`);
      return false;
    }

    const srcFile = new File(asset.localUri);
    srcFile.copy(destFile);

    if (newHash) {
      hashFile.write(newHash);
    } else if (hashFile.exists) {
      // Không lấy được hash (hiếm khi xảy ra) → xóa file hash cũ để lần sau
      // luôn coi như "chưa khớp" và tự copy lại cho an toàn, tránh kẹt DB cũ.
      hashFile.delete();
    }

    return true;
  } catch (error) {
    console.warn(`[db] copy asset failed for ${scope}`, error);
    return false;
  }
}

export async function initDb(scope: DbScope = 'kanji'): Promise<SQLite.SQLiteDatabase | null> {
  if (DB_CACHE.has(scope)) return DB_CACHE.get(scope) ?? null;
  if (DB_INIT_PROMISES.has(scope)) return (await DB_INIT_PROMISES.get(scope)) ?? null;

  const promise = (async () => {
    try {
      const copied = await ensureDbFileCopied(scope);
      if (!copied) {
        return null;
      }

      const dbName = DB_NAMES[scope];
      const dbDir = new Directory(Paths.document, 'SQLite').uri;
      const db = await SQLite.openDatabaseAsync(dbName, undefined, dbDir);
      DB_CACHE.set(scope, db);
      return db;
    } catch (error) {
      console.warn(`[db] open failed for ${scope}`, error);
      return null;
    }
  })();

  DB_INIT_PROMISES.set(scope, promise);
  return promise;
}

export async function getDb(scope: DbScope = 'kanji'): Promise<SQLite.SQLiteDatabase | null> {
  return initDb(scope);
}

export function hasDb(scope: DbScope = 'kanji'): boolean {
  return Boolean(DB_CACHE.get(scope));
}