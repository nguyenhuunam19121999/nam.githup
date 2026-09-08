// services/aiCacheLocal.ts
//
// Tra cứu cache AI đã đóng gói sẵn trong app (ai_cache.db) — đây là LỚP CACHE
// NHANH NHẤT, không cần mạng, không tốn quota, không gọi Worker.
//
// ⚠️ QUAN TRỌNG: cách tạo "cache_key" ở đây PHẢI khớp chính xác với cách Worker
// tạo key khi ghi vào Firestore, nếu không sẽ không bao giờ tìm thấy dữ liệu
// dù đã có sẵn. Worker làm 2 bước:
//   1. buildCacheKey(type, word) = `${type}_${word.normalize('NFC').trim().toLowerCase()}`
//   2. Khi ghi vào Firestore doc ID: encodeURIComponent(cacheKey đó)
// → Script syncAiCache.cjs lấy nguyên doc.id (đã encode) làm key trong
//   ai_cache_master.json → buildDb.cjs insert thẳng key đó (đã encode) vào
//   cột cache_key trong SQLite.
// → Vậy ở đây cũng phải tính key theo ĐÚNG 2 bước trên rồi mới SELECT.

import { getDb } from './db';
import type { AIResult, AIExample, AILookupType, ContentSegment } from './aiService';

function buildLocalCacheKey(type: AILookupType, word: string): string {
  const normalized = word.normalize('NFC').trim().toLowerCase();
  const rawKey = `${type}_${normalized}`;
  return encodeURIComponent(rawKey);
}

/**
 * Tìm kết quả AI đã có sẵn trong ai_cache.db đóng gói cùng app.
 * Trả về null nếu chưa có (khi đó mới cần gọi tiếp Worker qua mạng).
 */
export async function getLocalAiCache(
  type: AILookupType,
  word: string
): Promise<AIResult | null> {
  try {
    const db = await getDb('ai_cache');
    if (!db) return null;

    const cacheKey = buildLocalCacheKey(type, word);
    const row = await db.getFirstAsync<{
      meaning: string;
      usage: string;
      examples: string;
      synonyms_distinction: string;
      notes: string;
      part_of_speech: string | null;
      kanji_breakdown: string | null;
      collocations: string | null;
      structure: string | null;
      conjugation: string | null;
      jlpt_level: string | null;
      component_analysis: string | null;
      similar_kanji: string | null;
      stroke_count_note: string | null;
    }>(
      `SELECT meaning, usage, examples, synonyms_distinction, notes,
              part_of_speech, kanji_breakdown, collocations,
              structure, conjugation, jlpt_level,
              component_analysis, similar_kanji, stroke_count_note
       FROM ai_cache WHERE cache_key = ?`,
      [cacheKey]
    );

    if (!row) return null;

    // Các cột lưu dạng chuỗi JSON (ContentSegment[]) trong SQLite — cần parse lại.
    // parseSegments an toàn: nếu cột rỗng/null/parse lỗi → trả về mảng rỗng,
    // không throw để tránh crash khi đọc cache cũ định dạng khác.
    function parseSegments(raw: string | null | undefined): ContentSegment[] {
      if (!raw) return [];
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }

    let examples: AIExample[] = [];
    try {
      examples = JSON.parse(row.examples || '[]');
    } catch {
      examples = [];
    }

    return {
      meaning: parseSegments(row.meaning),
      usage: parseSegments(row.usage),
      examples,
      synonyms_distinction: parseSegments(row.synonyms_distinction),
      notes: parseSegments(row.notes),
      part_of_speech: row.part_of_speech || '',
      kanji_breakdown: parseSegments(row.kanji_breakdown),
      collocations: parseSegments(row.collocations),
      structure: parseSegments(row.structure),
      conjugation: parseSegments(row.conjugation),
      jlpt_level: row.jlpt_level || '',
      component_analysis: parseSegments(row.component_analysis),
      similar_kanji: parseSegments(row.similar_kanji),
      stroke_count_note: parseSegments(row.stroke_count_note),
    };
  } catch (err) {
    console.warn('[aiCacheLocal] Lỗi đọc cache cục bộ, bỏ qua và để gọi mạng:', err);
    return null; // lỗi đọc local DB không nên chặn luồng — cứ để rơi xuống gọi Worker
  }
}