// // Auto-generated file - DO NOT EDIT
// // Tự động sinh bởi scripts/src/generateRegisterModules.js


// const textModules: Record<string, any> = {
// };

// const audioModules: Record<string, any> = {
// };

// const imageModules: Record<string, any> = {
// };


// // ============================================
// // INTERFACES
// // ============================================
// export interface Question {
//   id: number;
//   text: string;
//   options: string[];
//   correct: number;
//   image?: string;
//   audio?: string;
// }

// export interface VocabSection {
//   instruction: string;
//   questions: Question[];
// }

// export interface GrammarSection {
//   instruction: string;
//   questions: Question[];
// }

// export interface ReadingPassage {
//   id: number;
//   title: string;
//   content: string;
//   questions: Question[];
// }

// export interface ReadingSection {
//   instruction: string;
//   passages: ReadingPassage[];
// }

// export interface TextExamData {
//   ky_thi: string;
//   level: string;
//   year: number;
//   month: number;
//   nguon: string;
//   time_vocab: number;
//   time_grammar: number;
//   time_listening: number;
//   vocab: VocabSection;
//   grammar: GrammarSection;
//   reading: ReadingSection;
// }

// export interface ListeningQuestion {
//   id: number;
//   audio_file: string;
//   image: string | null;
//   text: string;
//   options: string[];
//   correct: number;
// }

// export interface ListeningSection {
//   type: string;
//   instruction: string;
//   questions: ListeningQuestion[];
// }

// export interface AudioExamData {
//   ky_thi: string;
//   level: string;
//   year: number;
//   month: number;
//   time_listening: number;
//   listening: {
//     instruction: string;
//     sections: ListeningSection[];
//   };
// }

// export interface ImageExamData {
//   ky_thi: string;
//   level: string;
//   year: number;
//   month: number;
//   images: Array<{
//     id: string;
//     file: string;
//     description: string;
//     related_question: number;
//   }>;
// }

// export interface AutoExamData {
//   id: string;
//   level: string;
//   year: number;
//   month: number;
//   textData: TextExamData;
//   audioData: AudioExamData | null;
//   imageData: ImageExamData | null;
// }

// // ============================================
// // HELPER FUNCTIONS
// // ============================================
// const getLevelFromFileName = (fileName: string): string => {
//   if (fileName.startsWith("n5")) return "N5";
//   if (fileName.startsWith("n4")) return "N4";
//   if (fileName.startsWith("n3")) return "N3";
//   if (fileName.startsWith("n2")) return "N2";
//   if (fileName.startsWith("n1")) return "N1";
//   return "UNKNOWN";
// };

// const getDateFromFileName = (fileName: string): { year: number; month: number } => {
//   const match = fileName.match(/_?(\d{4})_(\d{2})/);
//   if (match) {
//     return { year: parseInt(match[1]), month: parseInt(match[2]) };
//   }
//   return { year: 0, month: 0 };
// };

// const buildExams = (): Record<string, AutoExamData> => {
//   const exams: Record<string, AutoExamData> = {};
//   const textKeys = Object.keys(textModules);
  
//   for (const textKey of textKeys) {
//     const baseName = textKey.replace("_text", "");
//     const audioKey = textKey.replace("_text", "_audio");
//     const imageKey = textKey.replace("_text", "_image");
    
//     const id = baseName;
//     const level = getLevelFromFileName(id);
//     const { year, month } = getDateFromFileName(id);
    
//     exams[id] = {
//       id,
//       level,
//       year,
//       month,
//       textData: textModules[textKey] as TextExamData,
//       audioData: audioModules[audioKey] as AudioExamData || null,
//       imageData: imageModules[imageKey] as ImageExamData || null,
//     };
//   }
  
//   return exams;
// };

// export const AUTO_EXAMS = buildExams();

// console.log(`📚 Auto import: Đã load ${Object.keys(AUTO_EXAMS).length} bộ đề thi`);

// // Export functions
// export const getAllAutoExams = (): AutoExamData[] => Object.values(AUTO_EXAMS);
// export const getAutoExamById = (id: string): AutoExamData | undefined => AUTO_EXAMS[id];
// export const getAutoExamsByLevel = (level: string): AutoExamData[] => 
//   Object.values(AUTO_EXAMS).filter(exam => exam.level === level);
// export const getAutoExamsByYear = (year: number): AutoExamData[] => 
//   Object.values(AUTO_EXAMS).filter(exam => exam.year === year);
// export const getAvailableYears = (level?: string): number[] => {
//   let exams = Object.values(AUTO_EXAMS);
//   if (level) exams = exams.filter(exam => exam.level === level);
//   const years = [...new Set(exams.map(exam => exam.year))];
//   return years.sort((a, b) => b - a);
// };
// export const getAvailableMonths = (level: string, year: number): number[] => {
//   const exams = Object.values(AUTO_EXAMS).filter(exam => exam.level === level && exam.year === year);
//   const months = [...new Set(exams.map(exam => exam.month))];
//   return months.sort((a, b) => a - b);
// };
// export const getVocabQuestions = (examId: string): Question[] => {
//   const exam = getAutoExamById(examId);
//   return exam?.textData?.vocab?.questions || [];
// };
// export const getGrammarQuestions = (examId: string): Question[] => {
//   const exam = getAutoExamById(examId);
//   return exam?.textData?.grammar?.questions || [];
// };
// export const getReadingQuestions = (examId: string): Question[] => {
//   const exam = getAutoExamById(examId);
//   const questions: Question[] = [];
//   for (const passage of exam?.textData?.reading?.passages || []) {
//     questions.push(...(passage.questions || []));
//   }
//   return questions;
// };
// export const getListeningQuestions = (examId: string): ListeningQuestion[] => {
//   const exam = getAutoExamById(examId);
//   const questions: ListeningQuestion[] = [];
//   for (const section of exam?.audioData?.listening?.sections || []) {
//     questions.push(...(section.questions || []));
//   }
//   return questions;
// };
// export const getTotalQuestions = (examId: string) => {
//   const vocab = getVocabQuestions(examId).length;
//   const grammar = getGrammarQuestions(examId).length;
//   const reading = getReadingQuestions(examId).length;
//   const listening = getListeningQuestions(examId).length;
//   return { vocab, grammar, reading, listening, total: vocab + grammar + reading + listening };
// };
// export const getExamTimes = (examId: string) => {
//   const exam = getAutoExamById(examId);
//   return {
//     vocab: exam?.textData?.time_vocab || 30,
//     grammar: exam?.textData?.time_grammar || 70,
//     listening: exam?.textData?.time_listening || 40,
//   };
// };
