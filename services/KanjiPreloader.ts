/**
 * KanjiPreloader.ts
 *
 * Quản lý tải trước dữ liệu nét chữ song song.
 * Tự động nhận diện chữ thiếu nét/chữ mới -> Fetch CDN -> Caching tự động qua AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import strokesMap from '../assets/data_JLPT_kanji/kanji_strokes.json';

// Bộ nhớ đệm Memory cache để đồng bộ chia sẻ trạng thái tức thì với component KanjiStrokeOrder
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

/**
 * Thuật toán phát hiện chữ nghi ngờ thiếu nét (ví dụ chữ gốc 22 nét nhưng file local chỉ có 1 nét)
 */
function isStrokeDataInvalid(kanji: string, paths: string[] | undefined | null): boolean {
  if (!paths || paths.length === 0) return true;
  
  const count = paths.length;
  const code = kanji.codePointAt(0) || 0;
  
  // Không phải vùng chữ Hán chuẩn thì không kiểm tra chuyên sâu
  if (code < 0x4e00 || code > 0x9faf) return false;

  // Tập hợp các chữ Kanji có kết cấu cực giản đặc biệt
  const ultraSimple = new Set([
    '一', '二', '三', '亠', '人', '入', '八', '几', '凵', '刀', '力', '勹', '匕', '匚', '十', '卜', '卩', '厂', '厶', '又', '口', '囗', '土', '士', '夂', '夕', '大', '女', '子', '宀', '寸', '小', '尢', '尸', '屮', '山', '川', '工', '己', '巾', '干', '幺', '广', '廴', '廾', '弋', '弓', '彐', '彡', '彳', '才', '万', '丈', '与', '丑', '专', '丸', '也', '于', '亡', '及', '久', '个'
  ]);
  if (ultraSimple.has(kanji)) return false;

  // Nếu chữ thường mà hệ thống chỉ có ít hơn hoặc bằng 3 nét -> Chắc chắn bị mất nét/lỗi nén file
  if (count <= 3) return true;

  return false;
}

/**
 * Trực tiếp tải thông tin nét chữ.
 * Thứ tự ưu tiên: Local JSON (Phải đủ nét) -> Memory Cache -> AsyncStorage -> CDN cứu hộ.
 */
export async function loadStrokePaths(
  kanji: string,
): Promise<{ paths: string[]; source: 'local' | 'cache' | 'cdn' | 'none' }> {
  
  // 1. Kiểm tra bộ nhớ Local JSON trước
  const local = (strokesMap as Record<string, string[]>)[kanji];
  // Thêm điều kiện: Phải tồn tại VÀ không nằm trong diện nghi ngờ thiếu nét
  if (local && local.length > 0 && !isStrokeDataInvalid(kanji, local)) {
    return { paths: local, source: 'local' };
  }

  // 2. Kiểm tra nhanh tại Memory cache trận chiến hiện hành
  if (memoryCache.has(kanji)) {
    const cachedMemory = memoryCache.get(kanji)!;
    if (!isStrokeDataInvalid(kanji, cachedMemory)) {
      return { paths: cachedMemory, source: 'cache' };
    }
  }

  // 3. Kiểm tra cứu hộ tầng 2 tại AsyncStorage dưới thiết bị điện thoại
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

  // 4. Nếu cả 3 tầng trên đều không đạt chuẩn hoặc lỗi nét -> Gọi trực tiếp lên CDN cứu trợ toàn diện
  const hexId = toHexId(kanji);
  try {
    const res  = await fetch(`${CDN_BASE}${hexId}.svg`);
    const text = await res.text();
    const fetched = parseSvgPaths(text);
    if (fetched && fetched.length > 0) {
      // Lưu trữ chặt chẽ vào AsyncStorage để lần sau mở app không tốn Data mạng nữa
      AsyncStorage.setItem(ASYNC_PREFIX + kanji, JSON.stringify(fetched)).catch(() => {});
      memoryCache.set(kanji, fetched);
      return { paths: fetched, source: 'cdn' };
    }
  } catch (_) {}

  // Fallback trường hợp xấu nhất không có mạng và file local lỗi hẳn
  if (local && local.length > 0) {
    return { paths: local, source: 'local' }; // Đành dùng tạm dữ liệu thiếu nét thay vì trắng màn hình
  }

  return { paths: [], source: 'none' };
}

// ── Preloader Class ────────────────────────────────────────────────────────

class KanjiPreloader {
  private preloadQueue: Set<string> = new Set();
  private isPreloading = false;

  /**
   * Khởi động nhanh JIT compile các lookup phục vụ tối ưu hiệu năng đầu chu kỳ
   */
  warmup(): void {
    const samples = Object.keys(strokesMap).slice(0, 5);
    samples.forEach(k => {
      const _ = (strokesMap as Record<string, string[]>)[k];
    });
  }

  /**
   * Giữ alias nguyên bản giúp file SearchInline.tsx chạy mượt mà không lỗi hàm undefined
   */
  async preloadKanjiBatch(kanjiList: string[]): Promise<void> {
    return this.preloadStrokePaths(kanjiList);
  }

  /**
   * Đưa mảng các chữ Kanji cần tải trước vào hàng đợi xử lý ngầm (Idle-time worker)
   */
  async preloadStrokePaths(kanjiList: string[]): Promise<void> {
    for (const k of kanjiList) {
      const localPaths = (strokesMap as Record<string, string[]>)[k];
      const needsFixOrFetch = !memoryCache.has(k) && (!localPaths || isStrokeDataInvalid(k, localPaths));
      
      if (needsFixOrFetch) {
        this.preloadQueue.add(k);
      }
    }
    this.processQueue();
  }

  /**
   * Các hàm bổ trợ giả lập cấu trúc dự án của bạn nhằm tránh lỗi crash ở file SearchInline.tsx
   */
  preloadVocabBatch(vocabList: string[]): void {
    // Trích xuất tự động toàn bộ ký tự Kanji có trong các từ vựng được truyền tới để đưa vào hàng chờ preload nét vẽ
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

  /**
   * Preload dữ liệu Kanji theo dạng sliding window dựa trên chỉ mục màn hình hiển thị chi tiết hiện tại
   */
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
      // Giãn cách thời gian thực thi 40ms giải phóng CPU, giúp đảm bảo giao diện đạt 60fps không bị đứng hình (lag)
      await new Promise(r => setTimeout(r, 40));
    }

    this.isPreloading = false;
    if (this.preloadQueue.size > 0) this.processQueue();
  }

  /**
   * Kiểm tra chữ đã có sẵn dữ liệu chuẩn hay chưa
   */
  isReady(kanji: string): boolean {
    const local = (strokesMap as Record<string, string[]>)[kanji];
    const isLocalValid = local && local.length > 0 && !isStrokeDataInvalid(kanji, local);
    return !!isLocalValid || memoryCache.has(kanji);
  }

  /**
   * Trích xuất danh sách các từ còn đang thiếu hụt dữ liệu gốc
   */
  getMissingFromLocal(kanjiList: string[]): string[] {
    return kanjiList.filter(k => {
      const local = (strokesMap as Record<string, string[]>)[k];
      return !local || isStrokeDataInvalid(k, local);
    });
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