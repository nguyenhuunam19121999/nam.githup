// ============================================
// FILE: assets/data_EXAMS/index.ts
// QUẢN LÝ TỔNG HỢP ĐỀ THI - CHỈ TẬP TRUNG N3
// ============================================

// 📥 IMPORT MODULE N3 (đang hoạt động)
import * as N3 from './n3/index';

// 🔒 CÁC MODULE KHÁC (TẠM THỜI COMMENT, SẼ MỞ SAU)
// import * as N1 from './n1/index';
// import * as N2 from './n2/index';
// import * as N4 from './n4/index';
// import * as N5 from './n5/index';

// ============================================
// 📌 ĐỊNH NGHĨA INTERFACE
// ============================================
export interface Question {
  id: number;
  mondai: string;
  text: string;
  options: string[];
  correct: number;
  image?: string;
  transcript?: string;
}

export interface Section {
  type: string;
  name: string;
  instruction: string;
  points_per_question: number;
  questions: Question[];
}

export interface VocabSection {
  name: string;
  max_score: number;
  sections: Section[];
}

export interface GrammarReadingSection {
  name: string;
  max_score: number;
  time_limit?: number;
  grammar_sections: Section[];
  reading_sections: Section[];
}

export interface ListeningSection {
  name: string;
  max_score: number;
  time_limit?: number;
  sections: Section[];
}

export interface ExamData {
  ky_thi: string;
  level: string;
  year: number;
  month: number;
  nguon: string;
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
  vocab: VocabSection;
  grammar_reading: GrammarReadingSection;
  listening: ListeningSection;
}

export interface ExamModule {
  getExamById: (id: string) => ExamData | null;
  getAllExams: () => ExamData[];
  getExamIds: () => string[];
  getVocabQuestions: (exam: ExamData) => Question[];
  getGrammarQuestions: (exam: ExamData) => Question[];
  getReadingQuestions: (exam: ExamData) => Question[];
  getListeningQuestions: (exam: ExamData) => Question[];
  getAllQuestions: (exam: ExamData) => Question[];
  getGrammarReadingQuestions: (exam: ExamData) => Question[];
  getExamStats: (exam: ExamData) => any;
  // ✅ Chỉ giữ các hàm phát âm cho phần nghe
  speakTranscriptWithVoices: (transcript: string, options?: any) => void;
  stopSpeaking: () => Promise<void>;
  isSpeaking: () => Promise<boolean>;
  setVoiceConfig: (config: any) => void;
  getVoiceConfig: () => any;
  parseTranscript: (transcript: string) => any[];
}

// ============================================
// 📂 ĐĂNG KÝ CÁC MODULE (CHỈ N3 ĐANG HOẠT ĐỘNG)
// ============================================
const EXAM_MODULES: Record<string, ExamModule> = {
  // ✅ ĐANG HOẠT ĐỘNG
  N3: N3 as unknown as ExamModule,
  // 🔒 TẠM THỜI COMMENT
  // N1,
  // N2,
  // N4,
  // N5,
};

// Danh sách các level đang có
export const AVAILABLE_LEVELS = Object.keys(EXAM_MODULES);

// ============================================
// 🔍 HÀM LẤY ĐỀ THI THEO CẤP ĐỘ
// ============================================
export const getExamById = (level: string, id: string): ExamData | null => {
  const module = EXAM_MODULES[level.toUpperCase()];
  if (!module) {
    console.warn(`⚠️ Module not found for level: ${level}. Available: ${AVAILABLE_LEVELS.join(', ')}`);
    return null;
  }
  return module.getExamById(id);
};

export const getAllExams = (level: string): ExamData[] => {
  const module = EXAM_MODULES[level.toUpperCase()];
  if (!module) return [];
  return module.getAllExams();
};

export const getExamIds = (level: string): string[] => {
  const module = EXAM_MODULES[level.toUpperCase()];
  if (!module) return [];
  return module.getExamIds();
};

// ============================================
// 📋 HÀM LẤY CÂU HỎI THEO PHẦN
// ============================================
export const getVocabQuestions = (level: string, examId: string): Question[] => {
  const exam = getExamById(level, examId);
  if (!exam) return [];
  const module = EXAM_MODULES[level.toUpperCase()];
  if (!module) return [];
  return module.getVocabQuestions(exam);
};

export const getGrammarQuestions = (level: string, examId: string): Question[] => {
  const exam = getExamById(level, examId);
  if (!exam) return [];
  const module = EXAM_MODULES[level.toUpperCase()];
  if (!module) return [];
  return module.getGrammarQuestions(exam);
};

export const getReadingQuestions = (level: string, examId: string): Question[] => {
  const exam = getExamById(level, examId);
  if (!exam) return [];
  const module = EXAM_MODULES[level.toUpperCase()];
  if (!module) return [];
  return module.getReadingQuestions(exam);
};

export const getListeningQuestions = (level: string, examId: string): Question[] => {
  const exam = getExamById(level, examId);
  if (!exam) return [];
  const module = EXAM_MODULES[level.toUpperCase()];
  if (!module) return [];
  return module.getListeningQuestions(exam);
};

export const getGrammarReadingQuestions = (level: string, examId: string): Question[] => {
  const exam = getExamById(level, examId);
  if (!exam) return [];
  const module = EXAM_MODULES[level.toUpperCase()];
  if (!module) return [];
  return module.getGrammarReadingQuestions(exam);
};

export const getAllQuestions = (level: string, examId: string): Question[] => {
  const exam = getExamById(level, examId);
  if (!exam) return [];
  const module = EXAM_MODULES[level.toUpperCase()];
  if (!module) return [];
  return module.getAllQuestions(exam);
};

export const getExamStats = (level: string, examId: string): any => {
  const exam = getExamById(level, examId);
  if (!exam) return null;
  const module = EXAM_MODULES[level.toUpperCase()];
  if (!module) return null;
  return module.getExamStats(exam);
};

// ============================================
// 🔊 HÀM PHÁT ÂM (CHỈ CHO PHẦN NGHE)
// ============================================
export const speakTranscriptWithVoices = (
  transcript: string,
  options?: {
    onStart?: () => void;
    onDone?: () => void;
    onError?: (error: Error) => void;
  }
): void => {
  N3.speakTranscriptWithVoices(transcript, options);
};

export const stopSpeaking = async (): Promise<void> => {
  await N3.stopSpeaking();
};

export const isSpeaking = async (): Promise<boolean> => {
  return await N3.isSpeaking();
};

export const setVoiceConfig = (config: any): void => {
  N3.setVoiceConfig(config);
};

export const getVoiceConfig = (): any => {
  return N3.getVoiceConfig();
};

export const parseTranscript = (transcript: string): any[] => {
  return N3.parseTranscript(transcript);
};

// ============================================
// 📊 HÀM LẤY TẤT CẢ ĐỀ THI TẤT CẢ CẤP ĐỘ
// ============================================
export const getAllExamsAllLevels = (): { level: string; exams: ExamData[] }[] => {
  return Object.entries(EXAM_MODULES).map(([level, module]) => ({
    level,
    exams: module.getAllExams(),
  }));
};

// ============================================
// 🧮 HÀM TÍNH ĐIỂM TỔNG (CHUẨN JLPT: mỗi phần quy về thang 60, tổng 180)
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

// LƯU Ý: ngưỡng đậu (95/180 tổng, tối thiểu 19/60 mỗi phần) là quy tắc chuẩn JLPT N3 phổ biến.
// Nếu đề thi của bạn dùng ngưỡng khác (exam.passing_score), có thể thay 2 số 95 và 19 bên dưới.
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