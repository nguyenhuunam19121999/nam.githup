// ============================================
// FILE: assets/data_EXAMS/index.ts
// QUẢN LÝ DỮ LIỆU ĐỀ THI - ĐỒNG BỘ CONFIG PHẲNG MỚI & THANG ĐIỂM
// ============================================

// ============================================
// FILE: assets/data_EXAMS/index.ts
// QUẢN LÝ DỮ LIỆU ĐỀ THI - ĐỒNG BỘ VỚI EXAM-RESULT
// ============================================

export interface Question {
  id: number;
  text: string;
  options: string[];
  correct: number;
  audio_file?: string;
  image?: string;
  mondai?: string;
}

export interface Section {
  type: string;
  name: string;
  instruction: string;
  points_per_question: number;
  questions: Question[];
}

export interface ExamData {
  ky_thi: string;
  level: string;
  year: number;
  month: number;
  nguon: string;
  audio_file: string;
  images: string[];
  time_vocab: number;
  time_grammar: number;
  time_reading: number;
  time_listening: number;
  passing_score: number;
  section_scores: {
    vocab: number;
    grammar_reading: number;
    listening: number;
  };
  vocab: {
    name: string;
    max_score: number;
    sections: Section[];
  };
  grammar_reading: {
    name: string;
    max_score: number;
    time_limit?: number;
    grammar_sections: Section[];
    reading_sections: Section[];
  };
  listening: {
    name: string;
    max_score: number;
    sections: Section[];
  };
}

// ============================================
// 🌟 KHU VỰC IMPORT CÁC FILE JSON
// ============================================
import n3_01 from "./n3/n3_01.json";

const EXAM_DATABASE: Record<string, any> = {
  "n3_01": n3_01,
};

export const getExamById = (id: string): ExamData | null => {
  return EXAM_DATABASE[id] || null;
};

// ============================================
// 📊 HÀM LẤY TẤT CẢ CÂU HỎI THEO TỪNG PHẦN
// ============================================
export const getAllQuestions = (exam: ExamData, type: 'vocab' | 'grammar' | 'reading' | 'listening'): Question[] => {
  if (!exam) return [];
  switch(type) {
    case 'vocab': 
      return exam.vocab?.sections?.flatMap(s => s.questions) || [];
    case 'grammar': 
      return exam.grammar_reading?.grammar_sections?.flatMap(s => s.questions) || [];
    case 'reading': 
      return exam.grammar_reading?.reading_sections?.flatMap(s => s.questions) || [];
    case 'listening': 
      return exam.listening?.sections?.flatMap(s => s.questions) || [];
    default: 
      return [];
  }
};

// ============================================
// 💯 ĐỊNH NGHĨA TYPE KHỚP VỚI EXAM-RESULT.TSX
// ============================================
export interface ScoreResult {
  rawScore: number;
  maxRawScore: number;
  scaledScore: number;
  details: any;
}

export interface TotalScoreResult {
  vocab: ScoreResult;
  grammar: ScoreResult;
  reading: ScoreResult;
  listening: ScoreResult;
  grammarReading: {
    scaledScore: number;
    rawScore: number;
    maxRawScore: number;
  };
  total: {
    score: number;
    maxScore: number;
    percentage: number;
  };
  isPassed: boolean;
}

// Cấu hình JLPT
const JLPT_CONFIG = {
  MAX_SECTION_SCORE: 60,
  MAX_TOTAL: 180,
  SECTION_PASS_THRESHOLD: 19,
  PASSING_SCORE: 90,
};

// ============================================
// 🧮 HÀM TÍNH ĐIỂM CHO TỪNG PHẦN (CÓ DETAILS THEO MONDAI)
// ============================================
const calculateVocabScore = (questions: Question[], userAnswers: number[]): ScoreResult => {
  let rawScore = 0;
  const maxRawScore = questions.length;
  const details: any = {
    mondai1: { correct: 0, total: 0, points: 0, maxPoints: 0 },
    mondai2: { correct: 0, total: 0, points: 0, maxPoints: 0 },
    mondai3: { correct: 0, total: 0, points: 0, maxPoints: 0 },
    mondai4: { correct: 0, total: 0, points: 0, maxPoints: 0 },
    mondai5: { correct: 0, total: 0, points: 0, maxPoints: 0 },
  };

  questions.forEach((q, idx) => {
    const mondai = q.mondai || "mondai1";
    details[mondai].total++;
    details[mondai].maxPoints += 1;
    if (userAnswers?.[idx] === q.correct) {
      rawScore++;
      details[mondai].correct++;
      details[mondai].points += 1;
    }
  });

  const scaledScore = maxRawScore > 0 ? Math.round((rawScore / maxRawScore) * JLPT_CONFIG.MAX_SECTION_SCORE) : 0;
  
  return { rawScore, maxRawScore, scaledScore, details };
};

const calculateGrammarScore = (questions: Question[], userAnswers: number[]): ScoreResult => {
  let rawScore = 0;
  const maxRawScore = questions.length;
  const details: any = {
    mondai1: { correct: 0, total: 0, points: 0, maxPoints: 0 },
    mondai2: { correct: 0, total: 0, points: 0, maxPoints: 0 },
    mondai3: { correct: 0, total: 0, points: 0, maxPoints: 0 },
  };

  questions.forEach((q, idx) => {
    const mondai = q.mondai || "mondai1";
    details[mondai].total++;
    details[mondai].maxPoints += 1;
    if (userAnswers?.[idx] === q.correct) {
      rawScore++;
      details[mondai].correct++;
      details[mondai].points += 1;
    }
  });

  const scaledScore = maxRawScore > 0 ? Math.round((rawScore / maxRawScore) * JLPT_CONFIG.MAX_SECTION_SCORE) : 0;
  
  return { rawScore, maxRawScore, scaledScore, details };
};

const calculateReadingScore = (questions: Question[], userAnswers: number[]): ScoreResult => {
  let rawScore = 0;
  const maxRawScore = questions.length;
  const details: any = {
    mondai4: { correct: 0, total: 0, points: 0, maxPoints: 0 },
    mondai5: { correct: 0, total: 0, points: 0, maxPoints: 0 },
    mondai6: { correct: 0, total: 0, points: 0, maxPoints: 0 },
  };

  questions.forEach((q, idx) => {
    const mondai = q.mondai || "mondai4";
    details[mondai].total++;
    details[mondai].maxPoints += 1;
    if (userAnswers?.[idx] === q.correct) {
      rawScore++;
      details[mondai].correct++;
      details[mondai].points += 1;
    }
  });

  const scaledScore = maxRawScore > 0 ? Math.round((rawScore / maxRawScore) * JLPT_CONFIG.MAX_SECTION_SCORE) : 0;
  
  return { rawScore, maxRawScore, scaledScore, details };
};

const calculateListeningScore = (questions: Question[], userAnswers: number[]): ScoreResult => {
  let rawScore = 0;
  const maxRawScore = questions.length;
  const details: any = {
    mondai1: { correct: 0, total: 0, points: 0, maxPoints: 0 },
    mondai2: { correct: 0, total: 0, points: 0, maxPoints: 0 },
    mondai3: { correct: 0, total: 0, points: 0, maxPoints: 0 },
    mondai4: { correct: 0, total: 0, points: 0, maxPoints: 0 },
  };

  questions.forEach((q, idx) => {
    const mondai = q.mondai || "mondai1";
    details[mondai].total++;
    details[mondai].maxPoints += 1;
    if (userAnswers?.[idx] === q.correct) {
      rawScore++;
      details[mondai].correct++;
      details[mondai].points += 1;
    }
  });

  const scaledScore = maxRawScore > 0 ? Math.round((rawScore / maxRawScore) * JLPT_CONFIG.MAX_SECTION_SCORE) : 0;
  
  return { rawScore, maxRawScore, scaledScore, details };
};

// ============================================
// 🧮 HÀM TÍNH ĐIỂM TỔNG - NHẬN 7 THAM SỐ
// ============================================
export const calculateTotalScore = (
  vocabQuestions: Question[],
  vocabAnswers: number[],
  grammarQuestions: Question[],
  readingQuestions: Question[],
  grammarReadingAnswers: number[],
  listeningQuestions: Question[],
  listeningAnswers: number[]
): TotalScoreResult => {
  
  // Tính điểm từ vựng
  const vocabResult = calculateVocabScore(vocabQuestions, vocabAnswers);
  
  // Tách grammar answers và reading answers từ grammarReadingAnswers
  const grammarAnswers = grammarReadingAnswers?.slice(0, grammarQuestions.length) || [];
  const readingAnswers = grammarReadingAnswers?.slice(grammarQuestions.length) || [];
  
  // Tính điểm ngữ pháp và đọc hiểu
  const grammarResult = calculateGrammarScore(grammarQuestions, grammarAnswers);
  const readingResult = calculateReadingScore(readingQuestions, readingAnswers);
  
  // Tính điểm nghe hiểu
  const listeningResult = calculateListeningScore(listeningQuestions, listeningAnswers);
  
  // Tính điểm tổng Ngữ pháp & Đọc hiểu
  const grammarReadingRawScore = grammarResult.rawScore + readingResult.rawScore;
  const grammarReadingMaxRaw = grammarResult.maxRawScore + readingResult.maxRawScore;
  const grammarReadingScaled = grammarReadingMaxRaw > 0 
    ? Math.round((grammarReadingRawScore / grammarReadingMaxRaw) * JLPT_CONFIG.MAX_SECTION_SCORE) 
    : 0;
  
  // Tính tổng điểm
  const totalScaledScore = vocabResult.scaledScore + grammarReadingScaled + listeningResult.scaledScore;
  const percentage = (totalScaledScore / JLPT_CONFIG.MAX_TOTAL) * 100;
  
  // Kiểm tra đỗ/trượt
  const isPassed = 
    totalScaledScore >= JLPT_CONFIG.PASSING_SCORE &&
    vocabResult.scaledScore >= JLPT_CONFIG.SECTION_PASS_THRESHOLD &&
    grammarReadingScaled >= JLPT_CONFIG.SECTION_PASS_THRESHOLD &&
    listeningResult.scaledScore >= JLPT_CONFIG.SECTION_PASS_THRESHOLD;
  
  return {
    vocab: vocabResult,
    grammar: grammarResult,
    reading: readingResult,
    listening: listeningResult,
    grammarReading: {
      scaledScore: grammarReadingScaled,
      rawScore: grammarReadingRawScore,
      maxRawScore: grammarReadingMaxRaw
    },
    total: {
      score: totalScaledScore,
      maxScore: JLPT_CONFIG.MAX_TOTAL,
      percentage
    },
    isPassed,
  };
};

// ============================================
// 📌 HÀM TÍNH ĐIỂM CŨ (GIỮ LẠI ĐỂ TƯƠNG THÍCH NGƯỢC)
// ============================================
export const calculateTotalScoreFromExam = (
  exam: ExamData,
  vocabAnswers: number[],
  grammarAnswers: number[],
  listeningAnswers: number[]
): TotalScoreResult => {
  const vocabQuestions = getAllQuestions(exam, 'vocab');
  const grammarQuestions = getAllQuestions(exam, 'grammar');
  const readingQuestions = getAllQuestions(exam, 'reading');
  const listeningQuestions = getAllQuestions(exam, 'listening');
  
  return calculateTotalScore(
    vocabQuestions,
    vocabAnswers,
    grammarQuestions,
    readingQuestions,
    grammarAnswers,
    listeningQuestions,
    listeningAnswers
  );
};

// ============================================
// 🔧 HÀM KIỂM TRA VÀ CHUẨN HÓA
// ============================================
export const validateExamData = (exam: ExamData): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  if (!exam?.ky_thi) errors.push('Missing ky_thi');
  if (!exam?.level) errors.push('Missing level');
  if (!exam?.vocab) errors.push('Missing vocab section');
  if (!exam?.grammar_reading) errors.push('Missing grammar_reading section');
  if (!exam?.listening) errors.push('Missing listening section');
  return { isValid: errors.length === 0, errors };
};

export const normalizeAnswer = (answer: any): number => {
  if (typeof answer === 'number') return answer;
  if (typeof answer === 'string') {
    const letterToNumber: Record<string, number> = { 
      '1': 0, '2': 1, '3': 2, '4': 3, 
      'A': 0, 'B': 1, 'C': 2, 'D': 3 
    };
    const normalized = letterToNumber[answer.toUpperCase()];
    return normalized !== undefined ? normalized : -1;
  }
  return -1;
};