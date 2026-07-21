// /**
//  * KanjiPreloader.ts
//  *
//  * Quản lý tải trước dữ liệu nét chữ song song.
//  * Tự động nhận diện chữ thiếu nét/chữ mới -> Fetch CDN -> Caching tự động qua AsyncStorage.
//  */

// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { getDb } from './db';
// export const memoryCache = new Map<string, string[]>();

// const CDN_BASE = 'https://cdn.jsdelivr.net/gh/kanjivg/kanjivg@master/kanji/';
// const ASYNC_PREFIX = 'kanji_stroke_v1:';

// // ── Helpers ────────────────────────────────────────────────────────────────

// function toHexId(char: string): string {
//   return char.codePointAt(0)!.toString(16).toLowerCase().padStart(5, '0');
// }

// function parseSvgPaths(rawSvg: string): string[] | null {
//   const clean = rawSvg.replace(/<g[^>]*id="kvg:StrokeNumbers[\s\S]*$/, '');
//   const paths: string[] = [];
//   const re = /<path[^>]*\bd="([^"]+)"/g;
//   let m: RegExpExecArray | null;
//   while ((m = re.exec(clean)) !== null) {
//     const d = m[1].trim();
//     if (d) paths.push(d);
//   }
//   return paths.length > 0 ? paths : null;
// }

// async function getStrokesFromDb(kanji: string): Promise<string[] | null> {
//   try {
//     const db = await getDb('kanji');
//     if (!db) return null;

//     const row = await db.getFirstAsync<{ paths: string }>(
//       'SELECT paths FROM kanji_strokes WHERE kanji = ?',
//       [kanji],
//     );
//     if (!row?.paths) return null;

//     const parsed: string[] = JSON.parse(row.paths);
//     return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
//   } catch (err) {
//     console.warn(`[KanjiPreloader] lỗi đọc DB cho "${kanji}":`, err);
//     return null;
//   }
// }

// function isStrokeDataInvalid(kanji: string, paths: string[] | undefined | null): boolean {
//   if (!paths || paths.length === 0) return true;
  
//   const count = paths.length;
//   const code = kanji.codePointAt(0) || 0;
  
//   if (code < 0x4e00 || code > 0x9faf) return false;

//   const ultraSimple = new Set([
//     '一', '二', '三', '亠', '人', '入', '八', '几', '凵', '刀', '力', '勹', '匕', '匚', '十', '卜', '卩', '厂', '厶', '又', '口', '囗', '土', '士', '夂', '夕', '大', '女', '子', '宀', '寸', '小', '尢', '尸', '屮', '山', '川', '工', '己', '巾', '干', '幺', '广', '廴', '廾', '弋', '弓', '彐', '彡', '彳', '才', '万', '丈', '与', '丑', '专', '丸', '也', '于', '亡', '及', '久', '个'
//   ]);
//   if (ultraSimple.has(kanji)) return false;
//   if (count <= 3) return true;
//   return false;
// }

// export async function loadStrokePaths(
//   kanji: string,
//   forceRefresh: boolean = false,/// thêm cho ô luyện viết 
// ): Promise<{ paths: string[]; source: 'local' | 'cache' | 'cdn' | 'none' }> {

//   // 1. SQLite (thay cho strokesMap JSON tĩnh trước đây) — vẫn coi là "local"
//   const fromDb = await getStrokesFromDb(kanji);
//   if (fromDb && !isStrokeDataInvalid(kanji, fromDb)) {
//     memoryCache.set(kanji, fromDb);
//     return { paths: fromDb, source: 'local' };
//   }

//   // 2. Memory cache trong session hiện hành
//   if (memoryCache.has(kanji)) {
//     const cachedMemory = memoryCache.get(kanji)!;
//     if (!isStrokeDataInvalid(kanji, cachedMemory)) {
//       return { paths: cachedMemory, source: 'cache' };
//     }
//   }

//   // 3. AsyncStorage (bản CDN đã lưu đè từ trước, nếu có)
//   try {
//     const stored = await AsyncStorage.getItem(ASYNC_PREFIX + kanji);
//     if (stored) {
//       const parsed: string[] = JSON.parse(stored);
//       if (parsed.length > 0 && !isStrokeDataInvalid(kanji, parsed)) {
//         memoryCache.set(kanji, parsed);
//         return { paths: parsed, source: 'cache' };
//       }
//     }
//   } catch (_) {}

//   // 4. CDN cứu hộ
//   const hexId = toHexId(kanji);
//   try {
//     const res  = await fetch(`${CDN_BASE}${hexId}.svg`);
//     const text = await res.text();
//     const fetched = parseSvgPaths(text);  
//     if (fetched && fetched.length > 0) {
//       AsyncStorage.setItem(ASYNC_PREFIX + kanji, JSON.stringify(fetched)).catch(() => {});
//       memoryCache.set(kanji, fetched);
//       return { paths: fetched, source: 'cdn' };
//     }
//   } catch (_) {}

//   // Fallback cuối: DB có dữ liệu nhưng nghi thiếu nét — dùng tạm còn hơn trắng màn hình
//   if (fromDb && fromDb.length > 0) {
//     return { paths: fromDb, source: 'local' };
//   }

//   return { paths: [], source: 'none' };
// }

// // ── Preloader Class ────────────────────────────────────────────────────────
// class KanjiPreloader {
//   private preloadQueue: Set<string> = new Set();
//   private isPreloading = false;

//   warmup(): void {}

//   async preloadKanjiBatch(kanjiList: string[]): Promise<void> {
//     return this.preloadStrokePaths(kanjiList);
//   }

//   async preloadStrokePaths(kanjiList: string[]): Promise<void> {
//     for (const k of kanjiList) {
//       if (!memoryCache.has(k)) {
//         this.preloadQueue.add(k);
//       }
//     }
//     this.processQueue();
//   }
  
//   preloadVocabBatch(vocabList: string[]): void {
//     // Trích xuất tự động toàn bộ ký tự Kanji có trong các từ vựng được truyền tới để đưa vào hàng chờ preload nét vẽ
//     const kanjiChars: string[] = [];
//     vocabList.forEach(word => {
//       for (const char of word) {
//         if (/[\u3400-\u9fff]/.test(char)) kanjiChars.push(char);
//       }
//     });
//     if (kanjiChars.length > 0) this.preloadStrokePaths(kanjiChars);
//   }

//   preloadGrammarBatch(grammarList: string[]): void {}
//   preloadSentence(sentenceId: string): void {}

//   async preloadSurroundingKanji(
//     kanjiChars: string[],
//     currentIndex: number,
//     windowSize = 3,
//   ): Promise<void> {
//     const start = Math.max(0, currentIndex - 1);
//     const end   = Math.min(kanjiChars.length - 1, currentIndex + windowSize);
//     const toLoad = kanjiChars.slice(start, end + 1);
//     this.preloadStrokePaths(toLoad);
//   }

//   private async processQueue(): Promise<void> {
//     if (this.isPreloading || this.preloadQueue.size === 0) return;
//     this.isPreloading = true;

//     for (const kanji of this.preloadQueue) {
//       this.preloadQueue.delete(kanji);
//       await loadStrokePaths(kanji);
//       await new Promise(r => setTimeout(r, 40));
//     }

//     this.isPreloading = false;
//     if (this.preloadQueue.size > 0) this.processQueue();
//   }

//   /**
//    * Kiểm tra chữ đã có sẵn dữ liệu chuẩn hay chưa
//    */

//   isReady(kanji: string): boolean {
//     return memoryCache.has(kanji);
//   }

//   getMissingFromLocal(kanjiList: string[]): string[] {
//     return kanjiList.filter(k => !memoryCache.has(k));
//   }

//   async clearCache(kanji: string): Promise<void> {
//     memoryCache.delete(kanji);
//     await AsyncStorage.removeItem(ASYNC_PREFIX + kanji);
//   }

//   async clearAllCache(): Promise<void> {
//     memoryCache.clear();
//     const keys = await AsyncStorage.getAllKeys();
//     const strokeKeys = keys.filter(k => k.startsWith(ASYNC_PREFIX));
//     await AsyncStorage.multiRemove(strokeKeys);
//   }
// }

// export const preloader = new KanjiPreloader();
// export default preloader;


















////////////////////////////
/**
 * KanjiPreloader.ts
 *
 * Quản lý tải trước dữ liệu nét chữ song song.
 * Tự động nhận diện chữ thiếu nét/chữ mới -> Fetch CDN -> Caching tự động qua AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDb } from './db';
export const memoryCache = new Map<string, string[]>();

const CDN_BASE = 'https://cdn.jsdelivr.net/gh/kanjivg/kanjivg@master/kanji/';
const ASYNC_PREFIX = 'kanji_stroke_v1:';

// ── Helpers ────────────────────────────────────────────────────────────────

function toHexId(char: string): string {
  return char.codePointAt(0)!.toString(16).toLowerCase().padStart(5, '0');
}

function parseSvgPaths(rawSvg: string): string[] | null {
  const clean = rawSvg.replace(/<g[^>]*id="kvg:StrokeNumbers[\s\S]*$/, '');
  const paths: string[] = [];
  const re = /<path[^>]*\bd="([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(clean)) !== null) {
    const d = m[1].trim();
    if (d) paths.push(d);
  }
  return paths.length > 0 ? paths : null;
}

async function getStrokesFromDb(kanji: string): Promise<string[] | null> {
  try {
    const db = await getDb('kanji');
    if (!db) return null;

    const row = await db.getFirstAsync<{ paths: string }>(
      'SELECT paths FROM kanji_strokes WHERE kanji = ?',
      [kanji],
    );
    if (!row?.paths) return null;

    const parsed: string[] = JSON.parse(row.paths);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch (err) {
    console.warn(`[KanjiPreloader] lỗi đọc DB cho "${kanji}":`, err);
    return null;
  }
}

function isStrokeDataInvalid(kanji: string, paths: string[] | undefined | null): boolean {
  if (!paths || paths.length === 0) return true;
  
  const count = paths.length;
  const code = kanji.codePointAt(0) || 0;
  
  if (code < 0x4e00 || code > 0x9faf) return false;

  const ultraSimple = new Set([
    '一', '二', '三', '亠', '人', '入', '八', '几', '凵', '刀', '力', '勹', '匕', '匚', '十', '卜', '卩', '厂', '厶', '又', '口', '囗', '土', '士', '夂', '夕', '大', '女', '子', '宀', '寸', '小', '尢', '尸', '屮', '山', '川', '工', '己', '巾', '干', '幺', '广', '廴', '廾', '弋', '弓', '彐', '彡', '彳', '才', '万', '丈', '与', '丑', '专', '丸', '也', '于', '亡', '及', '久', '个'
  ]);
  if (ultraSimple.has(kanji)) return false;
  // Chỉ invalid nếu số nét quá ít hoặc quá nhiều
  if (count < 1 || count > 30) return true;
  return false;
}

export async function loadStrokePaths(
  kanji: string,
  forceRefresh: boolean = false, // Thêm cho ô luyện viết
): Promise<{ paths: string[]; source: 'local' | 'cache' | 'cdn' | 'none' }> {

  // ⭐ NẾU forceRefresh = TRUE, BỎ QUA CACHE, TẢI TRỰC TIẾP TỪ CDN
  if (forceRefresh) {
    const hexId = toHexId(kanji);
    try {
      const res = await fetch(`${CDN_BASE}${hexId}.svg`);
      const text = await res.text();
      const fetched = parseSvgPaths(text);
      if (fetched && fetched.length > 0) {
        // Lưu vào AsyncStorage và memoryCache
        await AsyncStorage.setItem(ASYNC_PREFIX + kanji, JSON.stringify(fetched));
        memoryCache.set(kanji, fetched);
        return { paths: fetched, source: 'cdn' };
      }
    } catch (_) {
      // Nếu fetch CDN thất bại, vẫn fallback xuống cache bên dưới
      console.warn(`[KanjiPreloader] Force refresh failed for "${kanji}", falling back to cache`);
    }
  }

  // 1. SQLite (thay cho strokesMap JSON tĩnh trước đây) — vẫn coi là "local"
  const fromDb = await getStrokesFromDb(kanji);
  if (fromDb && !isStrokeDataInvalid(kanji, fromDb)) {
    memoryCache.set(kanji, fromDb);
    return { paths: fromDb, source: 'local' };
  }

  // 2. Memory cache trong session hiện hành
  if (memoryCache.has(kanji)) {
    const cachedMemory = memoryCache.get(kanji)!;
    if (!isStrokeDataInvalid(kanji, cachedMemory)) {
      return { paths: cachedMemory, source: 'cache' };
    }
  }

  // 3. AsyncStorage (bản CDN đã lưu đè từ trước, nếu có)
  try {
    const stored = await AsyncStorage.getItem(ASYNC_PREFIX + kanji);
    if (stored) {
      const parsed: string[] = JSON.parse(stored);
      if (parsed.length > 0 && !isStrokeDataInvalid(kanji, parsed)) {
        memoryCache.set(kanji, parsed);
        return { paths: parsed, source: 'cache' };
      }
    }
  } catch (_) {}

  // 4. CDN cứu hộ
  const hexId = toHexId(kanji);
  try {
    const res  = await fetch(`${CDN_BASE}${hexId}.svg`);
    const text = await res.text();
    const fetched = parseSvgPaths(text);  
    if (fetched && fetched.length > 0) {
      AsyncStorage.setItem(ASYNC_PREFIX + kanji, JSON.stringify(fetched)).catch(() => {});
      memoryCache.set(kanji, fetched);
      return { paths: fetched, source: 'cdn' };
    }
  } catch (_) {}

  // Fallback cuối: DB có dữ liệu nhưng nghi thiếu nét — dùng tạm còn hơn trắng màn hình
  if (fromDb && fromDb.length > 0) {
    return { paths: fromDb, source: 'local' };
  }

  return { paths: [], source: 'none' };
}

// ── Preloader Class ────────────────────────────────────────────────────────
class KanjiPreloader {
  private preloadQueue: Set<string> = new Set();
  private isPreloading = false;

  warmup(): void {}

  async preloadKanjiBatch(kanjiList: string[]): Promise<void> {
    return this.preloadStrokePaths(kanjiList);
  }

  async preloadStrokePaths(kanjiList: string[]): Promise<void> {
    for (const k of kanjiList) {
      if (!memoryCache.has(k)) {
        this.preloadQueue.add(k);
      }
    }
    this.processQueue();
  }
  
  preloadVocabBatch(vocabList: string[]): void {
    const kanjiChars: string[] = [];
    vocabList.forEach(word => {
      for (const char of word) {
        if (/[\u3400-\u9fff]/.test(char)) kanjiChars.push(char);
      }
    });
    if (kanjiChars.length > 0) this.preloadStrokePaths(kanjiChars);
  }

  preloadGrammarBatch(grammarList: string[]): void {}
  preloadSentence(sentenceId: string): void {}

  async preloadSurroundingKanji(
    kanjiChars: string[],
    currentIndex: number,
    windowSize = 3,
  ): Promise<void> {
    const start = Math.max(0, currentIndex - 1);
    const end   = Math.min(kanjiChars.length - 1, currentIndex + windowSize);
    const toLoad = kanjiChars.slice(start, end + 1);
    this.preloadStrokePaths(toLoad);
  }

  private async processQueue(): Promise<void> {
    if (this.isPreloading || this.preloadQueue.size === 0) return;
    this.isPreloading = true;

    for (const kanji of this.preloadQueue) {
      this.preloadQueue.delete(kanji);
      await loadStrokePaths(kanji);
      await new Promise(r => setTimeout(r, 40));
    }

    this.isPreloading = false;
    if (this.preloadQueue.size > 0) this.processQueue();
  }

  isReady(kanji: string): boolean {
    return memoryCache.has(kanji);
  }

  getMissingFromLocal(kanjiList: string[]): string[] {
    return kanjiList.filter(k => !memoryCache.has(k));
  }

  async clearCache(kanji: string): Promise<void> {
    memoryCache.delete(kanji);
    await AsyncStorage.removeItem(ASYNC_PREFIX + kanji);
  }

  async clearAllCache(): Promise<void> {
    memoryCache.clear();
    const keys = await AsyncStorage.getAllKeys();
    const strokeKeys = keys.filter(k => k.startsWith(ASYNC_PREFIX));
    await AsyncStorage.multiRemove(strokeKeys);
  }
}

export const preloader = new KanjiPreloader();
export default preloader;