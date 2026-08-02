// ============================================
// FILE: assets/data_EXAMS/shared/index.ts
// LOGIC DÙNG CHUNG CHO MỌI CẤP ĐỘ (N1-N5)
// Không chứa dữ liệu đề thi — chỉ chứa type & hàm xử lý.
// ============================================

import * as Speech from 'expo-speech';

// ============================================
// 📌 ĐỊNH NGHĨA INTERFACE
// ============================================

export interface Question {
  id: number;
  text: string;
  options: string[];
  correct: number;
  transcript?: string;
  image?: string;
  mondai?: string;
  correct_sentence?: string;
  underline?: string;
}

export interface PassageGroup {
  passage_id: number;
  passage: string;
  questions: Question[];
  underlines?: string[];
}

export interface Section {
  mondai: string;
  name: string;
  instruction: string;
  questions?: Question[];
  passage?: string;
  passages?: PassageGroup[];
  underlines?: string[];
}

export interface VocabSection {
  name: string;
  max_score: number;
  sections: Section[];
}

export interface GrammarReadingSection {
  name: string;
  max_score: number;
  grammar_sections: Section[];
  reading_sections: Section[];
}

export interface ListeningSection {
  name: string;
  max_score: number;
  sections: Section[];
}

export interface ExamData {
  exam_id: string;
  level: string;
  total_time_minutes: number;
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

// ============================================
// 🎤 CẤU HÌNH GIỌNG ĐỌC
// ============================================

export type VoiceGender = 'male' | 'female';

export interface VoiceConfig {
  selected: VoiceGender;
  male: { pitch: number; rate: number; language: string };
  female: { pitch: number; rate: number; language: string };
}

const DEFAULT_VOICE_CONFIG: VoiceConfig = {
  selected: 'female',
  male: { pitch: 0.92, rate: 0.92, language: 'ja-JP' },
  female: { pitch: 1.08, rate: 0.92, language: 'ja-JP' },
};

let currentVoiceConfig: VoiceConfig = { ...DEFAULT_VOICE_CONFIG };
let isCurrentlySpeaking = false;

// ============================================
// 📋 HÀM LẤY CÂU HỎI (generic theo ExamData, không phụ thuộc cấp độ)
// ============================================

const getSectionQuestions = (s: Section): Question[] => {
  if (s.questions) return s.questions;
  if (s.passages) return s.passages.flatMap(p => p.questions);
  return [];
};

export const getVocabQuestions = (exam: ExamData): Question[] => {
  if (!exam) return [];
  return exam.vocab.sections.flatMap(getSectionQuestions);
};

export const getGrammarQuestions = (exam: ExamData): Question[] => {
  if (!exam) return [];
  return exam.grammar_reading.grammar_sections.flatMap(getSectionQuestions);
};

export const getReadingQuestions = (exam: ExamData): Question[] => {
  if (!exam) return [];
  return exam.grammar_reading.reading_sections.flatMap(getSectionQuestions);
};

export const getListeningQuestions = (exam: ExamData): Question[] => {
  if (!exam) return [];
  return exam.listening.sections.flatMap(getSectionQuestions);
};

export const getAllQuestions = (exam: ExamData): Question[] => {
  if (!exam) return [];
  return [
    ...getVocabQuestions(exam),
    ...getGrammarQuestions(exam),
    ...getReadingQuestions(exam),
    ...getListeningQuestions(exam),
  ];
};

export const getGrammarReadingQuestions = (exam: ExamData): Question[] => {
  return [...getGrammarQuestions(exam), ...getReadingQuestions(exam)];
};

export const getExamStats = (exam: ExamData) => {
  if (!exam) return null;
  return {
    vocab: getVocabQuestions(exam).length,
    grammar: getGrammarQuestions(exam).length,
    reading: getReadingQuestions(exam).length,
    listening: getListeningQuestions(exam).length,
    total: getAllQuestions(exam).length,
  };
};

// ============================================
// 🎤 HÀM ĐIỀU KHIỂN GIỌNG ĐỌC
// ============================================

export const setVoiceGender = (gender: VoiceGender): void => {
  currentVoiceConfig.selected = gender;
};

export const getVoiceGender = (): VoiceGender => {
  return currentVoiceConfig.selected;
};

export const getVoiceConfig = (): VoiceConfig => {
  return { ...currentVoiceConfig };
};

export const setVoiceConfig = (config: Partial<VoiceConfig>): void => {
  currentVoiceConfig = { ...currentVoiceConfig, ...config };
};

// ============================================
// 🎭 TÁCH HỘI THOẠI THEO NGƯỜI NÓI
// ============================================

export interface DialogueTurn {
  gender: VoiceGender;
  text: string;
}

const cleanForSpeech = (raw: string): string => {
  return raw
    .replace(/【[^】]*】/g, '')
    .replace(/^\s*\d+[.\uFF0E]\s*/, '')
    .trim();
};

const parseDialogue = (rawText: string, fallbackGender: VoiceGender): DialogueTurn[] => {
  const lines = rawText
    .split('\n')
    .map(l => cleanForSpeech(l))
    .filter(Boolean);
  const turns: DialogueTurn[] = [];

  for (const line of lines) {
    const match = line.match(/^([^:：]{1,6})[:：]\s*(.+)$/);
    if (match) {
      const label = match[1].trim();
      const content = match[2].trim();
      const gender: VoiceGender = label.includes('男') ? 'male' : label.includes('女') ? 'female' : fallbackGender;
      turns.push({ gender, text: content });
    } else {
      turns.push({ gender: fallbackGender, text: line });
    }
  }
  return turns;
};

const speakOneTurn = (text: string, gender: VoiceGender): Promise<void> => {
  return new Promise((resolve) => {
    const voiceConfig = gender === 'male' ? currentVoiceConfig.male : currentVoiceConfig.female;
    Speech.speak(text, {
      language: voiceConfig.language,
      pitch: voiceConfig.pitch,
      rate: voiceConfig.rate,
      onDone: () => resolve(),
      onError: () => resolve(),
      onStopped: () => resolve(),
    });
  });
};

const pause = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

export const speakQuestionWithDialogue = async (
  question: Question,
  options?: {
    gender?: VoiceGender;
    onStart?: () => void;
    onDone?: () => void;
    onError?: (error: Error) => void;
  }
): Promise<void> => {
  if (isCurrentlySpeaking) {
    Speech.stop();
  }
  isCurrentlySpeaking = true;
  if (options?.onStart) options.onStart();

  const fallbackGender = options?.gender || currentVoiceConfig.selected;

  try {
    const cleanedQuestionText = question.text ? cleanForSpeech(question.text) : '';
    if (cleanedQuestionText) {
      await speakOneTurn(cleanedQuestionText, fallbackGender);
      await pause(400);
    }

    if (question.transcript) {
      const turns = parseDialogue(question.transcript.trim(), fallbackGender);
      let prevGender: VoiceGender | null = null;

      for (const turn of turns) {
        if (!isCurrentlySpeaking) break;
        if (prevGender !== null) {
          await pause(prevGender !== turn.gender ? 450 : 200);
        }
        await speakOneTurn(turn.text, turn.gender);
        prevGender = turn.gender;
      }
    }

    isCurrentlySpeaking = false;
    if (options?.onDone) options.onDone();
  } catch (error) {
    isCurrentlySpeaking = false;
    if (options?.onError) options.onError(error as Error);
  }
};

// ============================================
// 🔊 HÀM PHÁT ÂM
// ============================================

export const speakText = (
  text: string,
  options?: {
    language?: string;
    pitch?: number;
    rate?: number;
    gender?: VoiceGender;
    onStart?: () => void;
    onDone?: () => void;
    onError?: (error: Error) => void;
  }
): void => {
  if (!text || text.trim().length === 0) {
    console.warn('⚠️ speakText: text is empty');
    return;
  }

  if (isCurrentlySpeaking) {
    Speech.stop();
    isCurrentlySpeaking = false;
  }

  const gender = options?.gender || currentVoiceConfig.selected;
  const voiceConfig = gender === 'male' ? currentVoiceConfig.male : currentVoiceConfig.female;

  const speechOptions: Speech.SpeechOptions = {
    language: options?.language || voiceConfig.language,
    pitch: options?.pitch || voiceConfig.pitch,
    rate: options?.rate || voiceConfig.rate,
  };

  const sentences = text.split(/[。！？.!?]/).filter(s => s.trim().length > 0);

  if (sentences.length > 1) {
    let index = 0;
    const speakNextSentence = () => {
      if (index >= sentences.length) {
        if (options?.onDone) options.onDone();
        isCurrentlySpeaking = false;
        return;
      }
      const sentence = sentences[index].trim() + '。';
      if (sentence.length > 1) {
        Speech.speak(sentence, {
          ...speechOptions,
          onStart: () => {
            isCurrentlySpeaking = true;
            if (index === 0 && options?.onStart) options.onStart();
          },
          onDone: () => {
            index++;
            setTimeout(speakNextSentence, 200);
          },
          onError: (error) => {
            if (options?.onError) options.onError(error);
            isCurrentlySpeaking = false;
          },
        });
      } else {
        index++;
        speakNextSentence();
      }
    };
    speakNextSentence();
  } else {
    Speech.speak(text, {
      ...speechOptions,
      onStart: () => {
        isCurrentlySpeaking = true;
        if (options?.onStart) options.onStart();
      },
      onDone: () => {
        isCurrentlySpeaking = false;
        if (options?.onDone) options.onDone();
      },
      onError: (error) => {
        isCurrentlySpeaking = false;
        if (options?.onError) options.onError(error);
      },
    });
  }
};

export const speakQuestion = (
  question: Question,
  options?: { gender?: VoiceGender }
): void => {
  if (!question) return;

  if (question.transcript && question.transcript.trim().length > 0) {
    speakText(question.transcript, options);
    return;
  }

  if (question.text && question.text.trim().length > 0) {
    speakText(question.text, options);
    return;
  }

  console.warn('⚠️ No text to speak for question:', question.id);
};

export const speakTranscript = (
  transcript: string,
  options?: { gender?: VoiceGender }
): void => {
  if (transcript && transcript.trim().length > 0) {
    speakText(transcript, options);
  }
};

export const stopSpeaking = async (): Promise<void> => {
  await Speech.stop();
  isCurrentlySpeaking = false;
};

export const isSpeaking = async (): Promise<boolean> => {
  return isCurrentlySpeaking || await Speech.isSpeakingAsync();
};

export const parseTranscript = (
  transcript: string,
  fallbackGender: VoiceGender = 'female'
): DialogueTurn[] => {
  return parseDialogue(transcript, fallbackGender);
};

export const speakTranscriptWithVoices = async (
  transcript: string,
  options?: {
    onStart?: () => void;
    onDone?: () => void;
    onError?: (error: Error) => void;
  }
): Promise<void> => {
  return speakQuestionWithDialogue(
    { id: 0, text: '', options: [], correct: 0, transcript } as Question,
    options
  );
};

export default {
  getVocabQuestions,
  getGrammarQuestions,
  getReadingQuestions,
  getListeningQuestions,
  getGrammarReadingQuestions,
  getAllQuestions,
  getExamStats,
  speakText,
  speakQuestion,
  speakTranscript,
  speakTranscriptWithVoices,
  stopSpeaking,
  isSpeaking,
  setVoiceGender,
  getVoiceGender,
  getVoiceConfig,
  setVoiceConfig,
  speakQuestionWithDialogue,
  parseTranscript,
};