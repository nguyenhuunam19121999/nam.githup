// ============================================
// FILE: assets/data_EXAMS/index.ts
// QUẢN LÝ TỔNG HỢP ĐỀ THI - MỌI CẤP ĐỘ
// Đọc từ exams.db (SQLite) qua services/db.ts
// ============================================

import { getDb } from '../../services/db';
import * as Shared from './shared';
import type { ExamData, Question, Section } from './shared';
export type { ExamData, Question, Section };

// Cache trong bộ nhớ để không phải parse lại JSON mỗi lần gọi
// (đề thi không đổi trong 1 phiên sử dụng app)
const examCache = new Map<string, ExamData>();

export const AVAILABLE_LEVELS = ['N1', 'N2', 'N3', 'N4', 'N5'];
export const getExamById = async (level: string, id: string): Promise<ExamData | null> => {
  const normLevel = level.toLowerCase(); // v.d: "n3"
  const normId = id.toLowerCase();       // v.d: "n3_01" hoặc "01"
  
  // Cache key chuẩn hóa
  const cacheKey = `${normLevel}_${normId}`;
  if (examCache.has(cacheKey)) return examCache.get(cacheKey)!;

  const db = await getDb('exams');
  if (!db) {
    console.warn(`⚠️ Không mở được exams.db`);
    return null;
  }

  // Tách lấy phần số/mã gốc (VD: "n3_01" -> "01", "01" -> "01")
  const rawNumber = normId.replace(new RegExp(`^${normLevel}_`, 'g'), '');

  // Tạo các khả năng ID có thể có trong DB
  const possibleIds = [
    normId,                                
    `${normLevel}_${normId}`,               
    `${normLevel}_${rawNumber}`,            
    `${normLevel}_${normLevel}_${rawNumber}` 
  ];

  // Truy vấn tìm ID trùng 1 trong các khả năng trên
  const row = await db.getFirstAsync<{ id: string; data: string }>(
    `SELECT id, data FROM exams WHERE LOWER(id) IN (?, ?, ?, ?)`,
    possibleIds
  );

  if (!row) {
    console.warn(`⚠️ Không tìm thấy đề thi với param (level=${level}, id=${id})`);
    return null;
  }

  try {
    const exam = JSON.parse(row.data) as ExamData;
    examCache.set(cacheKey, exam);
    return exam;
  } catch (e) {
    console.warn(`⚠️ Lỗi parse JSON đề thi ${id}:`, e);
    return null;
  }
};

export const getAllExams = async (level: string): Promise<ExamData[]> => {
  const db = await getDb('exams');
  if (!db) return [];
  const rows = await db.getAllAsync<{ id: string; data: string }>(
    'SELECT id, data FROM exams WHERE level = ? ORDER BY exam_id',
    [level.toUpperCase()]
  );
  return rows.map((r) => {
    const exam = JSON.parse(r.data) as ExamData;
    examCache.set(r.id, exam);
    return exam;
  });
};

export const getExamIds = async (level: string): Promise<string[]> => {
  const db = await getDb('exams');
  if (!db) return [];
  const rows = await db.getAllAsync<{ exam_id: string }>(
    'SELECT exam_id FROM exams WHERE level = ? ORDER BY exam_id',
    [level.toUpperCase()]
  );
  return rows.map((r) => r.exam_id);
};

// ============================================
// 📋 HÀM LẤY CÂU HỎI THEO PHẦN (ASYNC)
// ============================================
export const getVocabQuestions = async (level: string, examId: string): Promise<Question[]> => {
  const exam = await getExamById(level, examId);
  return exam ? Shared.getVocabQuestions(exam) : [];
};

export const getGrammarQuestions = async (level: string, examId: string): Promise<Question[]> => {
  const exam = await getExamById(level, examId);
  return exam ? Shared.getGrammarQuestions(exam) : [];
};

export const getReadingQuestions = async (level: string, examId: string): Promise<Question[]> => {
  const exam = await getExamById(level, examId);
  return exam ? Shared.getReadingQuestions(exam) : [];
};

export const getListeningQuestions = async (level: string, examId: string): Promise<Question[]> => {
  const exam = await getExamById(level, examId);
  return exam ? Shared.getListeningQuestions(exam) : [];
};

export const getGrammarReadingQuestions = async (level: string, examId: string): Promise<Question[]> => {
  const exam = await getExamById(level, examId);
  return exam ? Shared.getGrammarReadingQuestions(exam) : [];
};

export const getAllQuestions = async (level: string, examId: string): Promise<Question[]> => {
  const exam = await getExamById(level, examId);
  return exam ? Shared.getAllQuestions(exam) : [];
};

export const getExamStats = async (level: string, examId: string): Promise<any> => {
  const exam = await getExamById(level, examId);
  return exam ? Shared.getExamStats(exam) : null;
};

// ============================================
// 🔊 HÀM PHÁT ÂM — không đụng tới DB, re-export thẳng từ shared
// ============================================
export const speakTranscriptWithVoices = Shared.speakTranscriptWithVoices;
export const stopSpeaking = Shared.stopSpeaking;
export const isSpeaking = Shared.isSpeaking;
export const setVoiceConfig = Shared.setVoiceConfig;
export const getVoiceConfig = Shared.getVoiceConfig;
export const parseTranscript = Shared.parseTranscript;

// ============================================
// 📊 HÀM LẤY TẤT CẢ ĐỀ THI TẤT CẢ CẤP ĐỘ (ASYNC)
// ============================================
export const getAllExamsAllLevels = async (): Promise<{ level: string; exams: ExamData[] }[]> => {
  const results = await Promise.all(
    AVAILABLE_LEVELS.map(async (level) => ({
      level,
      exams: await getAllExams(level),
    }))
  );
  return results;
};

// ============================================
// 🧮 HÀM TÍNH ĐIỂM TỔNG — hàm thuần (pure function), không đụng DB, giữ nguyên y hệt
// ============================================
export interface SectionScoreResult {
  rawScore: number;
  maxRawScore: number;
  scaledScore: number;
  details?: Record<string, { correct: number; total: number; points: number; maxPoints: number }>;
}

export interface TotalScoreResult {
  vocab: SectionScoreResult;
  grammar: { rawScore: number; maxRawScore: number };
  reading: { rawScore: number; maxRawScore: number };
  grammarReading: SectionScoreResult;
  listening: SectionScoreResult;
  total: { score: number; maxScore: number; percentage: number };
  isPassed: boolean;
}

const countCorrect = (questions: Question[], answers: number[]): number => {
  return questions.reduce((acc, q, idx) => acc + (answers[idx] === q.correct ? 1 : 0), 0);
};

const buildVocabDetails = (
  questions: Question[],
  answers: number[]
): Record<string, { correct: number; total: number; points: number; maxPoints: number }> => {
  const details: Record<string, { correct: number; total: number; points: number; maxPoints: number }> = {};
  const pointsPerQuestion = questions.length > 0 ? 60 / questions.length : 0;

  questions.forEach((q, idx) => {
    const key = q.mondai || 'khac';
    if (!details[key]) {
      details[key] = { correct: 0, total: 0, points: 0, maxPoints: 0 };
    }
    details[key].total += 1;
    details[key].maxPoints += pointsPerQuestion;
    if (answers[idx] === q.correct) {
      details[key].correct += 1;
      details[key].points += pointsPerQuestion;
    }
  });

  return details;
};

export const calculateTotalScore = (
  vocabQuestions: Question[],
  vocabAnswers: number[],
  grammarQuestions: Question[],
  readingQuestions: Question[],
  grammarReadingAnswersCombined: number[],
  listeningQuestions: Question[],
  listeningAnswers: number[]
): TotalScoreResult => {
  const grammarAnswers = grammarReadingAnswersCombined.slice(0, grammarQuestions.length);
  const readingAnswers = grammarReadingAnswersCombined.slice(grammarQuestions.length);

  const vocabCorrect = countCorrect(vocabQuestions, vocabAnswers);
  const grammarCorrect = countCorrect(grammarQuestions, grammarAnswers);
  const readingCorrect = countCorrect(readingQuestions, readingAnswers);
  const listeningCorrect = countCorrect(listeningQuestions, listeningAnswers);

  const vocabScaled = vocabQuestions.length > 0 ? (vocabCorrect / vocabQuestions.length) * 60 : 0;
  const grammarReadingTotal = grammarQuestions.length + readingQuestions.length;
  const grammarReadingCorrect = grammarCorrect + readingCorrect;
  const grammarReadingScaled = grammarReadingTotal > 0 ? (grammarReadingCorrect / grammarReadingTotal) * 60 : 0;
  const listeningScaled = listeningQuestions.length > 0 ? (listeningCorrect / listeningQuestions.length) * 60 : 0;

  const totalScore = vocabScaled + grammarReadingScaled + listeningScaled;
  const isPassed = totalScore >= 95 && vocabScaled >= 19 && grammarReadingScaled >= 19 && listeningScaled >= 19;

  return {
    vocab: {
      rawScore: vocabCorrect,
      maxRawScore: vocabQuestions.length,
      scaledScore: vocabScaled,
      details: buildVocabDetails(vocabQuestions, vocabAnswers),
    },
    grammar: { rawScore: grammarCorrect, maxRawScore: grammarQuestions.length },
    reading: { rawScore: readingCorrect, maxRawScore: readingQuestions.length },
    grammarReading: {
      rawScore: grammarReadingCorrect,
      maxRawScore: grammarReadingTotal,
      scaledScore: grammarReadingScaled,
    },
    listening: {
      rawScore: listeningCorrect,
      maxRawScore: listeningQuestions.length,
      scaledScore: listeningScaled,
    },
    total: { score: totalScore, maxScore: 180, percentage: (totalScore / 180) * 100 },
    isPassed,
  };
};

// ============================================
// 📤 EXPORT MẶC ĐỊNH
// ============================================
export default {
  getExamById,
  getAllExams,
  getExamIds,
  getVocabQuestions,
  getGrammarQuestions,
  getReadingQuestions,
  getListeningQuestions,
  getGrammarReadingQuestions,
  getAllQuestions,
  getExamStats,
  getAllExamsAllLevels,
  calculateTotalScore,
  AVAILABLE_LEVELS,
  speakTranscriptWithVoices,
  stopSpeaking,
  isSpeaking,
  setVoiceConfig,
  getVoiceConfig,
  parseTranscript,
};