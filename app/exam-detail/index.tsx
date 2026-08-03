// ============================================
// FILE: app/exam-detail/index.tsx
// TRANG LÀM BÀI THI - CHUẨN JLPT
// Thiết kế: "Giấy thi + con dấu đỏ" (Ink & Hanko)
// ============================================
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  SafeAreaView,
  StatusBar,
  Animated,
  Alert,
  LayoutChangeEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getExamById as getExamByIdGeneric } from '../../assets/data_EXAMS';
import {
  getVocabQuestions,
  getGrammarQuestions,
  getReadingQuestions,
  getListeningQuestions,
  speakQuestionWithDialogue,
  stopSpeaking,
  type ExamData,
  type Question,
  type Section,
} from '../../assets/data_EXAMS/shared';
import { AdBanner } from "../../components/AdBanner";

const getExamByIdAnyLevel = async (id: string): Promise<ExamData | null> => {
  const level = id.split('_')[0].toUpperCase();
  return getExamByIdGeneric(level, id);
};

const INK = '#16232F';
const INK_SOFT = '#2E4457';
const PAPER = '#F7F3E9';
const CARD = '#FFFFFF';
const HANKO = '#B3382C';
const HANKO_SOFT = '#F6E4E1';
const GOLD = '#C99A44';
const MUTE = '#8C8577';
const LINE = '#E6DFCC';
const INK_LIGHT = '#E8EEF2';

const GRAD = [INK, INK_SOFT] as const;

const EXAM_NAME_MAP: Record<string, string> = {
  'n3_01': 'Đề luyện thi số 1',
  'n3_02': 'Đề luyện thi số 2',
  'n3_03': 'Đề luyện thi số 3',
  'n3_04': 'Đề luyện thi số 4',
  'n3_05': 'Đề luyện thi số 5',
  'n2_01': 'Đề luyện thi số 1',
  'n2_02': 'Đề luyện thi số 2',
  'n2_03': 'Đề luyện thi số 3',
  'n2_04': 'Đề luyện thi số 4',
  'n2_05': 'Đề luyện thi số 5',
};

type SectionType = 'vocab' | 'grammar_reading' | 'listening';

const TAB_LABELS: Record<SectionType, string> = {
  vocab: 'Từ vựng',
  grammar_reading: 'Ngữ pháp & Đọc',
  listening: 'Nghe hiểu',
};

const TAB_ORDER: SectionType[] = ['vocab', 'grammar_reading', 'listening'];
const TRACK_PADDING = 4;

// Nhóm câu hỏi kèm đề bài (instruction) + đoạn văn (passage) của từng mondai
interface RenderSection {
  key: string;
  mondaiLabel: string; // "問題1", "問題2"...
  mondaiNumber: string; // "1", "2"...
  instruction: string;
  passage?: string;
  passages?: { passage_id: number; passage: string; questions: Question[]; underlines?: string[] }[];
  underlines?: string[];
  questions: Question[];
}

const toRenderSections = (sections: Section[]): RenderSection[] =>
  sections.map((s, idx) => ({
    key: `${s.mondai}-${idx}`,
    mondaiLabel: s.name,
    mondaiNumber: s.name.replace(/[^0-9]/g, '') || `${idx + 1}`,
    instruction: s.instruction,
    passage: s.passage,
    passages: s.passages,
    underlines: s.underlines,
    questions: s.questions ?? (s.passages ? s.passages.flatMap(p => p.questions) : []),
  }));

// ============================================
// ✏️ HIỂN THỊ CÂU HỎI CÓ GẠCH CHÂN (underline)
// ============================================
const renderQuestionText = (
  text: string,
  underline: string | undefined,
  textStyle: any,
  underlineStyle: any
) => {
  if (!underline) {
    return <Text style={textStyle}>{text}</Text>;
  }
  const index = text.indexOf(underline);
  if (index === -1) {
    return <Text style={textStyle}>{text}</Text>;
  }
  const before = text.slice(0, index);
  const after = text.slice(index + underline.length);
  return (
    <Text style={textStyle}>
      {before}
      <Text style={underlineStyle}>{underline}</Text>
      {after}
    </Text>
  );
};

// Gạch chân NHIỀU cụm từ trong đoạn văn (passage), theo đúng thứ tự xuất hiện trong "underlines"
const renderPassageText = (
  text: string,
  underlines: string[] | undefined,
  textStyle: any,
  underlineStyle: any
) => {
  if (!underlines || underlines.length === 0) {
    return <Text style={textStyle}>{text}</Text>;
  }

  const parts: React.ReactNode[] = [];
  let cursor = 0;

  underlines.forEach((phrase, i) => {
    const idx = text.indexOf(phrase, cursor);
    if (idx === -1) return; // không tìm thấy trong text thì bỏ qua, không crash
    if (idx > cursor) parts.push(text.slice(cursor, idx));
    parts.push(
      <Text key={`u-${i}`} style={underlineStyle}>{phrase}</Text>
    );
    cursor = idx + phrase.length;
  });

  if (cursor < text.length) parts.push(text.slice(cursor));

  return <Text style={textStyle}>{parts}</Text>;
};

export default function ExamDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const examId = params.id || 'n3_01';
  const examName = EXAM_NAME_MAP[examId] || examId;

  const [exam, setExam] = useState<ExamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSection, setCurrentSection] = useState<SectionType>('vocab');

  const [vocabAnswers, setVocabAnswers] = useState<Record<number, number>>({});
  const [grammarAnswers, setGrammarAnswers] = useState<Record<number, number>>({});
  const [readingAnswers, setReadingAnswers] = useState<Record<number, number>>({});
  const [listeningAnswers, setListeningAnswers] = useState<Record<number, number>>({});

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlayingQuestion, setCurrentPlayingQuestion] = useState<Question | null>(null);

  // 👉 Đo chiều rộng thật của thanh tab để tính vị trí con trượt bằng PIXEL,
  // không dùng translateX dạng % (nguyên nhân gây lệch/lỗi trước đây).
  const [tabTrackWidth, setTabTrackWidth] = useState(0);
  const tabAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    (async () => {
     const data = await getExamByIdAnyLevel(examId);
     if (!cancelled) {
       setExam(data);
       setLoading(false);
    }
   })();
   return () => { cancelled = true; };
    // const data = getExamByIdAnyLevel(examId);
    // setExam(data);
    // setLoading(false);
  }, [examId]);

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  useEffect(() => {
    const tabIndex = TAB_ORDER.indexOf(currentSection);
    Animated.spring(tabAnimation, {
      toValue: tabIndex,
      useNativeDriver: true,
      friction: 9,
      tension: 60,
    }).start();
  }, [currentSection]);

  const handleTabTrackLayout = (e: LayoutChangeEvent) => {
    setTabTrackWidth(e.nativeEvent.layout.width);
  };

  // ============================================
  // 📋 LẤY DANH SÁCH NHÓM (mondai) CHO TAB HIỆN TẠI
  // ============================================
  const renderSections = useMemo((): RenderSection[] => {
    if (!exam) return [];
    switch (currentSection) {
      case 'vocab':
        return toRenderSections(exam.vocab.sections);
      case 'grammar_reading':
        return [
          ...toRenderSections(exam.grammar_reading.grammar_sections),
          ...toRenderSections(exam.grammar_reading.reading_sections),
        ];
      case 'listening':
        return toRenderSections(exam.listening.sections);
      default:
        return [];
    }
  }, [exam, currentSection]); 

  type FlatItem =
  | { type: 'instruction'; key: string; mondaiNumber: string; mondaiLabel: string; instruction: string }
  | { type: 'passage'; key: string; passage: string; underlines?: string[] }
  | { type: 'question'; key: string; question: Question; displayNumber: number };

  const flatListData = useMemo((): FlatItem[] => {
    const items: FlatItem[] = [];
    let runningNumber = 0;  

    renderSections.forEach((section) => {
      items.push({
        type: 'instruction',
        key: `${section.key}-instr`,
        mondaiNumber: section.mondaiNumber,
        mondaiLabel: section.mondaiLabel,
        instruction: section.instruction,
      });

      if (section.passages) {
        section.passages.forEach((pg) => {
          items.push({
            type: 'passage',
            key: `${section.key}-p${pg.passage_id}`,
            passage: pg.passage,
            underlines: pg.underlines,
          });
          pg.questions.forEach((q) => {
            runningNumber += 1;
            items.push({ type: 'question', key: `${section.key}-${q.id}`, question: q, displayNumber: runningNumber });
          });
        });
      } else {
        if (section.passage) {
          items.push({
            type: 'passage',
            key: `${section.key}-passage`,
            passage: section.passage,
            underlines: section.underlines,
          });
        }
        section.questions.forEach((q) => {
          runningNumber += 1;
          items.push({ type: 'question', key: `${section.key}-${q.id}`, question: q, displayNumber: runningNumber });
        });
      }
    });

    return items;
  }, [renderSections]);

  const getQuestions = (): Question[] => {
    if (!exam) return [];
    switch (currentSection) {
      case 'vocab':
        return getVocabQuestions(exam);
      case 'grammar_reading':
        return [...getGrammarQuestions(exam), ...getReadingQuestions(exam)];
      case 'listening':
        return getListeningQuestions(exam);
      default:
        return [];
    }
  };

  const getCurrentAnswers = (): Record<number, number> => {
    switch (currentSection) {
      case 'vocab':
        return vocabAnswers;
      case 'grammar_reading':
        return { ...grammarAnswers, ...readingAnswers };
      case 'listening':
        return listeningAnswers;
      default:
        return {};
    }
  };

  const setCurrentAnswer = (questionId: number, optionIndex: number) => {
    switch (currentSection) {
      case 'vocab':
        setVocabAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
        break;
      case 'grammar_reading':
        if (exam) {
          const grammarIds = getGrammarQuestions(exam).map(q => q.id);
          if (grammarIds.includes(questionId)) {
            setGrammarAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
          } else {
            setReadingAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
          }
        }
        break;
      case 'listening':
        setListeningAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
        break;
    }
  };

  const currentAnswers = getCurrentAnswers();
  const isListening = currentSection === 'listening';
  const currentTabIndex = TAB_ORDER.indexOf(currentSection);
  const isLastTab = currentTabIndex === TAB_ORDER.length - 1;

  const getTotalAnswered = (): { answered: number; total: number } => {
    if (!exam) return { answered: 0, total: 0 };
    const totalVocab = getVocabQuestions(exam).length;
    const totalGrammar = getGrammarQuestions(exam).length;
    const totalReading = getReadingQuestions(exam).length;
    const totalListening = getListeningQuestions(exam).length;
    const total = totalVocab + totalGrammar + totalReading + totalListening;

    const answered =
      Object.keys(vocabAnswers).length +
      Object.keys(grammarAnswers).length +
      Object.keys(readingAnswers).length +
      Object.keys(listeningAnswers).length;

    return { answered, total };
  };

  const { answered, total } = getTotalAnswered();

  const isCurrentTabComplete = (): boolean => {
    const currentQuestions = getQuestions();
    const currentAnswersMap = getCurrentAnswers();
    return currentQuestions.every(q => currentAnswersMap[q.id] !== undefined);
  };

  const getCurrentTabAnswered = (): { answered: number; total: number } => {
    const currentQuestions = getQuestions();
    const currentAnswersMap = getCurrentAnswers();
    const answeredCount = currentQuestions.filter(q => currentAnswersMap[q.id] !== undefined).length;
    return { answered: answeredCount, total: currentQuestions.length };
  };

  const currentTabProgress = getCurrentTabAnswered();
  const isComplete = isCurrentTabComplete();

  const isTabCompleteByKey = (key: SectionType): boolean => {
    if (!exam) return false;
    if (key === 'vocab') {
      const qs = getVocabQuestions(exam);
      return qs.length > 0 && qs.every(q => vocabAnswers[q.id] !== undefined);
    } else if (key === 'grammar_reading') {
      const qs = [...getGrammarQuestions(exam), ...getReadingQuestions(exam)];
      const allAnswers = { ...grammarAnswers, ...readingAnswers };
      return qs.length > 0 && qs.every(q => allAnswers[q.id] !== undefined);
    } else {
      const qs = getListeningQuestions(exam);
      return qs.length > 0 && qs.every(q => listeningAnswers[q.id] !== undefined);
    }
  };

  const handleNextTab = () => {
    if (!isComplete) {
      Alert.alert(
        "⚠️ Chưa hoàn thành",
        `Bạn mới trả lời ${currentTabProgress.answered}/${currentTabProgress.total} câu hỏi trong phần ${TAB_LABELS[currentSection]}. Hãy hoàn thành tất cả câu hỏi trước khi chuyển tiếp.`,
        [{ text: "Tiếp tục làm", style: "default" }]
      );
      return;
    }

    const nextIndex = currentTabIndex + 1;
    if (nextIndex < TAB_ORDER.length) {
      const nextTabName = TAB_LABELS[TAB_ORDER[nextIndex]];
      Alert.alert(
        "✅ Hoàn thành!",
        `Bạn đã hoàn thành phần ${TAB_LABELS[currentSection]}. Chuyển sang phần ${nextTabName}?`,
        [
          { text: "Ở lại", style: "cancel" },
          {
            text: "Chuyển tiếp",
            onPress: () => setCurrentSection(TAB_ORDER[nextIndex])
          }
        ]
      );
    }
  };

  const handleSubmit = () => {
    const { answered: ans, total: tot } = getTotalAnswered();

    if (ans < tot) {
      Alert.alert(
        "⚠️ Chưa hoàn thành",
        `Bạn mới trả lời ${ans}/${tot} câu hỏi. Bạn có muốn nộp bài không?`,
        [
          { text: "Tiếp tục làm", style: "cancel" },
          {
            text: "Nộp bài",
            style: "destructive",
            onPress: () => goToResult()
          }
        ]
      );
    } else {
      Alert.alert(
        "✅ Hoàn thành!",
        "Bạn đã trả lời tất cả câu hỏi. Nộp bài để xem kết quả?",
        [
          { text: "Kiểm tra lại", style: "cancel" },
          { text: "Nộp bài", onPress: () => goToResult() }
        ]
      );
    }
  };

  const goToResult = () => {
    const vocabQuestions = exam ? getVocabQuestions(exam) : [];
    const grammarQuestions = exam ? getGrammarQuestions(exam) : [];
    const readingQuestions = exam ? getReadingQuestions(exam) : [];
    const listeningQuestions = exam ? getListeningQuestions(exam) : [];

    const vocabArray = vocabQuestions.map(q => vocabAnswers[q.id] ?? -1);
    const grammarArray = grammarQuestions.map(q => grammarAnswers[q.id] ?? -1);
    const readingArray = readingQuestions.map(q => readingAnswers[q.id] ?? -1);
    const listeningArray = listeningQuestions.map(q => listeningAnswers[q.id] ?? -1);

    router.push({
      pathname: '/exam-result',
      params: {
        examId: examId,
        vocabAnswers: JSON.stringify(vocabArray),
        grammarAnswers: JSON.stringify([...grammarArray, ...readingArray]),
        listeningAnswers: JSON.stringify(listeningArray),
      }
    });
  };

  const handleSelectAnswer = (questionId: number, optionIndex: number) => {
    setCurrentAnswer(questionId, optionIndex);
  };

  const handleSpeak = (question: Question) => {
    if (!isListening) return;

    if (isPlaying && currentPlayingQuestion?.id === question.id) {
      stopSpeaking();
      setIsPlaying(false);
      setCurrentPlayingQuestion(null);
      return;
    }

    stopSpeaking();
    setIsPlaying(true);
    setCurrentPlayingQuestion(question);

    if (!question.text && !question.transcript) {
      setIsPlaying(false);
      setCurrentPlayingQuestion(null);
      return;
    }

    speakQuestionWithDialogue(question, {
      onStart: () => setIsPlaying(true),
      onDone: () => {
        setIsPlaying(false);
        setCurrentPlayingQuestion(null);
      },
      onError: () => {
        setIsPlaying(false);
        setCurrentPlayingQuestion(null);
      },
    });
  };

  const handleStopSpeaking = async () => {
    await stopSpeaking();
    setIsPlaying(false);
    setCurrentPlayingQuestion(null);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={INK} />
        <Text style={styles.loadingText}>Đang tải đề thi...</Text>
      </View>
    );
  }

  if (!exam) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Không tìm thấy đề thi</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>← Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const nextButtonState = isComplete
    ? { text: `Chuyển sang ${TAB_LABELS[TAB_ORDER[currentTabIndex + 1]]}`, isActive: true }
    : { text: `Cần trả lời thêm ${currentTabProgress.total - currentTabProgress.answered} câu`, isActive: false };

  const renderQuestionCard = (question: Question, cardKey: string, displayNumber: number) => {
    const isAnswered = currentAnswers[question.id] !== undefined;
    const isCurrentPlaying = isPlaying && currentPlayingQuestion?.id === question.id;

    return (
      <View key={cardKey} style={styles.questionCard}>
        <View style={styles.questionHeader}>
          <View style={styles.numberChip}>
            <Text style={styles.numberChipText}>{displayNumber}</Text>
          </View>
          <View style={styles.actionButtons}>
            {isListening && (
              <TouchableOpacity
                style={[
                  styles.speakBtn,
                  isCurrentPlaying && styles.speakBtnActive,
                  isPlaying && !isCurrentPlaying && styles.speakBtnDisabled
                ]}
                onPress={() => handleSpeak(question)}
                disabled={isPlaying && !isCurrentPlaying}
              >
                <Text style={styles.speakIcon}>{isCurrentPlaying ? '⏸' : '🔊'}</Text>
              </TouchableOpacity>
            )}
            {isAnswered && (
              <View style={styles.answeredBadge}>
                <Text style={styles.answeredText}>✓</Text>
              </View>
            )}
          </View>
        </View>

        {!isListening && renderQuestionText(question.text, question.underline, styles.questionText, styles.underlineText)}

        <View style={styles.options}>
          {question.options.map((option: string, idx: number) => {
            const isSelected = currentAnswers[question.id] === idx;
            const letter = String.fromCharCode(65 + idx);
            return (
              <TouchableOpacity
                key={idx}
                style={[styles.option, isSelected && styles.optionSelected]}
                onPress={() => handleSelectAnswer(question.id, idx)}
                activeOpacity={0.75}
              >
                <View style={[styles.optionLetter, isSelected && styles.optionLetterSelected]}>
                  <Text style={[styles.optionLetterText, isSelected && styles.optionLetterTextSelected]}>
                    {letter}
                  </Text>
                </View>
                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                  {option}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderFlatItem = ({ item }: { item: FlatItem }) => {
    if (item.type === 'instruction') {
      return (
        <View style={styles.instructionRow}>
          <View style={styles.stampBadge}>
            <Text style={styles.stampNumber}>{item.mondaiNumber}</Text>
          </View>
          <View style={styles.instructionTextWrap}>
            <Text style={styles.mondaiLabel}>{item.mondaiLabel}</Text>
            <Text style={styles.instructionText}>{item.instruction}</Text>
          </View>
        </View>
      );
    }
    if (item.type === 'passage') {
      return (
        <View style={styles.passageBox}>
          {renderPassageText(item.passage, item.underlines, styles.passageText, styles.underlineText)}
        </View>
      );
    }
    return renderQuestionCard(item.question, item.key, item.displayNumber);
  };

  const segmentWidth = tabTrackWidth > 0 ? (tabTrackWidth - TRACK_PADDING * 2) / 3 : 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={INK} />

      {/* ===== HEADER: tiêu đề đầy đủ + tiến độ tổng ===== */}
      <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerGradient}>
        <SafeAreaView>
          <View style={styles.headerTopRow}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
              <Text style={styles.backIcon}>‹</Text>
            </TouchableOpacity>
            <View style={styles.headerTopActions}>
              {isPlaying && (
                <TouchableOpacity style={[styles.iconBtn, styles.stopBtn]} onPress={handleStopSpeaking}>
                  <Text style={styles.stopBtnText}>⏹</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.headerBody}>
            <Text style={styles.eyebrow}>{exam.level} · JLPT</Text>
            <Text style={styles.headerTitle}>{examName}</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* ===== TAB (segmented control, đo pixel thật — không lệch) ===== */}
      <View style={styles.tabOuter}>
        <View style={styles.tabTrack} onLayout={handleTabTrackLayout}>
          {segmentWidth > 0 && (
            <Animated.View
              style={[
                styles.tabThumb,
                {
                  width: segmentWidth,
                  transform: [
                    {
                      translateX: tabAnimation.interpolate({
                        inputRange: [0, 1, 2],
                        outputRange: [
                          TRACK_PADDING,
                          TRACK_PADDING + segmentWidth,
                          TRACK_PADDING + segmentWidth * 2,
                        ],
                      }),
                    },
                  ],
                },
              ]}
            />
          )}
          {TAB_ORDER.map((key) => {
            const isActive = currentSection === key;
            const tabDone = isTabCompleteByKey(key);
            return (
              <TouchableOpacity
                key={key}
                style={styles.tabItem}
                onPress={() => setCurrentSection(key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabItemLabel, isActive && styles.tabItemLabelActive]}>
                  {TAB_LABELS[key]}
                </Text>
                {tabDone && (
                  <View style={[styles.tabCheckDot, isActive && styles.tabCheckDotActive]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      <FlatList
        style={styles.content}
        data={flatListData}
        keyExtractor={(item) => item.key}
        renderItem={renderFlatItem}
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        maxToRenderPerBatch={6}
        windowSize={7}
        removeClippedSubviews={true}
        ListFooterComponent={
          <>
            {!isLastTab ? (
              <TouchableOpacity
                style={[
                  styles.nextBtn,
                  nextButtonState.isActive ? styles.nextBtnActive : styles.nextBtnDisabled
                ]}
                onPress={handleNextTab}
                activeOpacity={nextButtonState.isActive ? 0.85 : 1}
              >
                <Text style={[
                  styles.nextBtnText,
                  nextButtonState.isActive ? styles.nextBtnTextActive : styles.nextBtnTextDisabled
                ]}>
                  {nextButtonState.text}
                </Text>
                {!nextButtonState.isActive && (
                  <View style={styles.nextBtnProgress}>
                    <View style={styles.nextBtnProgressTrack}>
                      <View
                        style={[
                          styles.nextBtnProgressFill,
                          { width: `${(currentTabProgress.answered / currentTabProgress.total) * 100}%` }
                        ]}
                      />
                    </View>
                    <Text style={styles.nextBtnProgressText}>
                      {currentTabProgress.answered}/{currentTabProgress.total}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} activeOpacity={0.85}>
                <Text style={styles.submitBtnText}>
                  Nộp bài · {answered}/{total}
                </Text>
              </TouchableOpacity>
            )}
            <View style={styles.footer} />
          </>
        }
      />
      <AdBanner />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PAPER },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: PAPER },
  loadingText: { marginTop: 12, fontSize: 15, color: INK },
  errorText: { fontSize: 18, color: HANKO },
  backLink: { fontSize: 15, color: INK, marginTop: 10 },

  // ---------- HEADER ----------
  headerGradient: {
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingBottom: 10,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  headerTopActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  backIcon: { color: '#fff', fontSize: 26, fontWeight: '300', marginTop: -3 },
  stopBtn: { backgroundColor: HANKO },
  stopBtnText: { fontSize: 15, color: '#fff' },

  headerBody: { paddingHorizontal: 20, paddingTop: 6 },
  eyebrow: {
    fontSize: 10.5,
    fontWeight: '700',
    color: GOLD,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 22,
  },

  // ---------- TAB (segmented control) ----------
  tabOuter: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: PAPER,
  },
  tabTrack: {
    flexDirection: 'row',
    backgroundColor: INK_LIGHT,
    borderRadius: 11,
    padding: TRACK_PADDING,
    position: 'relative',
  },
  tabThumb: {
    position: 'absolute',
    top: TRACK_PADDING,
    bottom: TRACK_PADDING,
    backgroundColor: INK,
    borderRadius: 9,
    shadowColor: INK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  tabItemLabel: { fontSize: 12.5, fontWeight: '600', color: MUTE },
  tabItemLabelActive: { color: '#fff' },
  tabCheckDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: GOLD,
  },
  tabCheckDotActive: { backgroundColor: GOLD },

  // ---------- CONTENT ----------
  content: { flex: 1, paddingHorizontal: 16 },
  sectionBlock: { marginBottom: 8 },

  // Con dấu đề bài (signature element)
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  stampBadge: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: HANKO,
    backgroundColor: HANKO_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-6deg' }],
  },
  stampNumber: { fontSize: 16, fontWeight: '800', color: HANKO },
  instructionTextWrap: { flex: 1, paddingTop: 2 },
  mondaiLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: INK,
    letterSpacing: 1,
    marginBottom: 3,
  },
  instructionText: {
    fontSize: 13,
    color: MUTE,
    lineHeight: 19,
  },

  passageGroup: {
    marginBottom: 4,
  },
  passageBox: {
    backgroundColor: CARD,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: HANKO,
  },
  passageText: {
    fontSize: 14.5,
    color: '#2A2A2A',
    lineHeight: 25,
  },

  questionCard: {
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: LINE,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  numberChip: {
    minWidth: 26,
    height: 26,
    paddingHorizontal: 6,
    borderRadius: 13,
    backgroundColor: INK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberChipText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  actionButtons: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  speakBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speakBtnActive: { backgroundColor: HANKO_SOFT },
  speakBtnDisabled: { opacity: 0.4 },
  speakIcon: { fontSize: 17 },
  answeredBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E4EFE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  answeredText: { fontSize: 11, color: '#3A7350', fontWeight: '700' },

  questionText: {
    fontSize: 15,
    color: '#1E1E1E',
    lineHeight: 24,
    marginBottom: 14,
  },
  underlineText: {
    textDecorationLine: 'underline',
    fontWeight: '700',
    color: HANKO,
  },

  options: { gap: 8 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: LINE,
  },
  optionSelected: {
    borderColor: INK,
    backgroundColor: INK_LIGHT,
  },
  optionLetter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#C7C0AD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLetterSelected: { borderColor: INK, backgroundColor: INK },
  optionLetterText: { fontSize: 11, fontWeight: '700', color: MUTE },
  optionLetterTextSelected: { color: '#fff' },
  optionText: { flex: 1, fontSize: 14, color: '#334155', lineHeight: 20 },
  optionTextSelected: { color: INK, fontWeight: '600' },

  nextBtn: {
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  nextBtnActive: {
    backgroundColor: INK,
    shadowColor: INK,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  nextBtnDisabled: { backgroundColor: '#E4DFD1' },
  nextBtnText: { fontSize: 14.5, fontWeight: '700' },
  nextBtnTextActive: { color: '#fff' },
  nextBtnTextDisabled: { color: '#9A9284' },
  nextBtnProgress: { flexDirection: 'row', alignItems: 'center', marginTop: 10, width: '85%', gap: 8 },
  nextBtnProgressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  nextBtnProgressFill: { height: '100%', backgroundColor: HANKO, borderRadius: 2 },
  nextBtnProgressText: { fontSize: 11, fontWeight: '600', color: '#9A9284' },

  submitBtn: {
    backgroundColor: HANKO,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
    shadowColor: HANKO,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  submitBtnText: { color: '#fff', fontSize: 15.5, fontWeight: '700', letterSpacing: 0.3 },

  footer: { height: 40 },
});