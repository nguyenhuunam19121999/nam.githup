// ============================================
// FILE: app/exam-detail/index.tsx
// TRANG LÀM BÀI THI - 5 ĐỀ N3
// ============================================

import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState, useRef } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  SafeAreaView,
  StatusBar,
  Animated,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  getExamById,
  getVocabQuestions,
  getGrammarQuestions,
  getReadingQuestions,
  getListeningQuestions,
  speakQuestionWithDialogue,
  stopSpeaking,
  isSpeaking,
  setVoiceGender,
  getVoiceGender,
  type ExamData,
  type Question,
  type VoiceGender,
} from '../../assets/data_EXAMS/n3';

// ============================================
// 🎨 BIẾN MÀU
// ============================================
const BG_GRAY = "#f0f4f8";
const TEAL = "#004370";
const TEAL_LIGHT = "#e6f0f5";
const TEAL_DARK = "#003055";
const GRAD = [TEAL, TEAL_DARK] as const;

const EXAM_NAME_MAP: Record<string, string> = {
  'n3_01': 'Đề luyện thi số 1',
};

type SectionType = 'vocab' | 'grammar_reading' | 'listening';

const TAB_CONFIG: Record<SectionType, { label: string; activeColor: string }> = {
  vocab: { label: 'Từ vựng', activeColor: '#F59E0B' },
  grammar_reading: { label: 'Ngữ pháp & Đọc', activeColor: '#3B82F6' },
  listening: { label: 'Nghe hiểu', activeColor: '#EC4899' },
};

const TAB_ORDER: SectionType[] = ['vocab', 'grammar_reading', 'listening'];
const TAB_LABELS: Record<SectionType, string> = {
  vocab: 'Từ vựng',
  grammar_reading: 'Ngữ pháp & Đọc',
  listening: 'Nghe hiểu',
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
  const [voiceGender, setVoiceGenderState] = useState<VoiceGender>('female');
  const [showVoiceModal, setShowVoiceModal] = useState(false);

  const tabAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const data = getExamById(examId);
    setExam(data);
    setLoading(false);
    const current = getVoiceGender();
    setVoiceGenderState(current);
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
      friction: 8,
      tension: 40,
    }).start();
  }, [currentSection]);

  const getQuestions = (): Question[] => {
    if (!exam) return [];
    switch (currentSection) {
      case 'vocab': return getVocabQuestions(exam);
      case 'grammar_reading': return [
        ...getGrammarQuestions(exam),
        ...getReadingQuestions(exam),
      ];
      case 'listening': return getListeningQuestions(exam);
      default: return [];
    }
  };

  const getCurrentAnswers = (): Record<number, number> => {
    switch (currentSection) {
      case 'vocab': return vocabAnswers;
      case 'grammar_reading': return { ...grammarAnswers, ...readingAnswers };
      case 'listening': return listeningAnswers;
      default: return {};
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

  const questions = getQuestions();
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
    const currentAnswers = getCurrentAnswers();
    return currentQuestions.every(q => currentAnswers[q.id] !== undefined);
  };

  const getCurrentTabAnswered = (): { answered: number; total: number } => {
    const currentQuestions = getQuestions();
    const currentAnswers = getCurrentAnswers();
    const answered = currentQuestions.filter(q => currentAnswers[q.id] !== undefined).length;
    return { answered, total: currentQuestions.length };
  };

  const currentTabProgress = getCurrentTabAnswered();
  const isComplete = isCurrentTabComplete();

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
    const { answered, total } = getTotalAnswered();
    
    if (answered < total) {
      Alert.alert(
        "⚠️ Chưa hoàn thành",
        `Bạn mới trả lời ${answered}/${total} câu hỏi. Bạn có muốn nộp bài không?`,
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
      gender: voiceGender,
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

  const toggleVoiceGender = (gender: VoiceGender) => {
    setVoiceGenderState(gender);
    setVoiceGender(gender);
    setShowVoiceModal(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={TEAL} />
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
    ? { text: `✅ Hoàn thành! Chuyển sang ${TAB_LABELS[TAB_ORDER[currentTabIndex + 1]]}`, isActive: true, icon: '➡️' }
    : { text: `⚠️ Cần trả lời ${currentTabProgress.total - currentTabProgress.answered} câu nữa`, isActive: false, icon: '⏳' };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={TEAL} />

      {/* Header */}
      <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
        <SafeAreaView style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Text style={styles.backIcon}>‹</Text>
            </TouchableOpacity>
            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle}>{examName}</Text>
              <Text style={styles.headerSubtitle}>
                {exam.level} · {exam.year}/{exam.month} · {exam.source}
              </Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.voiceBtn} onPress={() => setShowVoiceModal(true)}>
                <Text style={styles.voiceIcon}>{voiceGender === 'male' ? '👦' : '👧'}</Text>
              </TouchableOpacity>
              {isPlaying && (
                <TouchableOpacity style={styles.stopBtn} onPress={handleStopSpeaking}>
                  <Text style={styles.stopBtnText}>⏹</Text>
                </TouchableOpacity>
              )}
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>
                  {answered}/{total}
                </Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Tab */}
      <View style={styles.tabContainer}>
        <View style={styles.tabWrapper}>
          {TAB_ORDER.map((key) => {
            const config = TAB_CONFIG[key];
            const isActive = currentSection === key;
            const counts: Record<SectionType, number> = {
              vocab: getVocabQuestions(exam).length,
              grammar_reading: getGrammarQuestions(exam).length + getReadingQuestions(exam).length,
              listening: getListeningQuestions(exam).length,
            };

            let isTabComplete = false;
            if (key === 'vocab') {
              const qs = getVocabQuestions(exam);
              isTabComplete = qs.every(q => vocabAnswers[q.id] !== undefined);
            } else if (key === 'grammar_reading') {
              const qs = [...getGrammarQuestions(exam), ...getReadingQuestions(exam)];
              const allAnswers = { ...grammarAnswers, ...readingAnswers };
              isTabComplete = qs.every(q => allAnswers[q.id] !== undefined);
            } else if (key === 'listening') {
              const qs = getListeningQuestions(exam);
              isTabComplete = qs.every(q => listeningAnswers[q.id] !== undefined);
            }

            return (
              <TouchableOpacity
                key={key}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => setCurrentSection(key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {config.label}
                </Text>
                <View style={[styles.tabBadge, isActive && { backgroundColor: config.activeColor }]}>
                  <Text style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>
                    {counts[key]}
                  </Text>
                </View>
                {isTabComplete && !isActive && (
                  <Text style={styles.tabCompleteIcon}>✅</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        <Animated.View
          style={[
            styles.tabIndicator,
            {
              transform: [{ translateX: tabAnimation.interpolate({ inputRange: [0, 1, 2], outputRange: [0, 100/3, 200/3] }) }],
              width: `${100/3}%`,
            },
          ]}
        />
      </View>

      {/* Câu hỏi */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {questions.map((question: Question, index: number) => {
          const isAnswered = currentAnswers[question.id] !== undefined;
          const isCurrentPlaying = isPlaying && currentPlayingQuestion?.id === question.id;

          return (
            <View key={question.id} style={styles.questionCard}>
              <View style={styles.questionHeader}>
                <View style={styles.questionNumber}>
                  <Text style={styles.numberText}>Câu {index + 1}</Text>
                  {question.mondai && (
                    <Text style={styles.mondaiTag}>{question.mondai}</Text>
                  )}
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
                      <Text style={styles.speakIcon}>
                        {isCurrentPlaying ? '⏸' : '🔊'}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {isAnswered && (
                    <View style={styles.answeredBadge}>
                      <Text style={styles.answeredText}>✓</Text>
                    </View>
                  )}
                </View>
              </View>

              <Text style={styles.questionText}>{question.text}</Text>

              <View style={styles.options}>
                {question.options.map((option: string, idx: number) => {
                  const isSelected = currentAnswers[question.id] === idx;

                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.option, isSelected && styles.optionSelected]}
                      onPress={() => handleSelectAnswer(question.id, idx)}
                    >
                      <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                        {String.fromCharCode(65 + idx)}. {option}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })}

        {!isLastTab ? (
          <TouchableOpacity 
            style={[
              styles.nextBtn,
              nextButtonState.isActive ? styles.nextBtnActive : styles.nextBtnDisabled
            ]} 
            onPress={handleNextTab}
            activeOpacity={nextButtonState.isActive ? 0.7 : 1}
          >
            <Text style={[
              styles.nextBtnText,
              nextButtonState.isActive ? styles.nextBtnTextActive : styles.nextBtnTextDisabled
            ]}>
              {nextButtonState.icon} {nextButtonState.text}
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
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
            <Text style={styles.submitBtnText}>
              📤 Nộp bài ({answered}/{total})
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.footer} />
      </ScrollView>

      {/* Modal chọn giọng */}
      <Modal
        visible={showVoiceModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowVoiceModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowVoiceModal(false)}>
          <View style={styles.voiceModal}>
            <View style={styles.voiceModalHeader}>
              <Text style={styles.voiceModalTitle}>🎤 Chọn giọng đọc</Text>
              <TouchableOpacity onPress={() => setShowVoiceModal(false)}>
                <Text style={styles.voiceModalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.voiceOption,
                voiceGender === 'female' && styles.voiceOptionActive,
              ]}
              onPress={() => toggleVoiceGender('female')}
            >
              <Text style={styles.voiceOptionIcon}>👧</Text>
              <View style={styles.voiceOptionInfo}>
                <Text style={styles.voiceOptionName}>Giọng nữ</Text>
                <Text style={styles.voiceOptionDesc}>Trong trẻo, dễ nghe</Text>
              </View>
              {voiceGender === 'female' && (
                <Text style={styles.voiceOptionCheck}>✅</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.voiceOption,
                voiceGender === 'male' && styles.voiceOptionActive,
              ]}
              onPress={() => toggleVoiceGender('male')}
            >
              <Text style={styles.voiceOptionIcon}>👦</Text>
              <View style={styles.voiceOptionInfo}>
                <Text style={styles.voiceOptionName}>Giọng nam</Text>
                <Text style={styles.voiceOptionDesc}>Trầm ấm, mạnh mẽ</Text>
              </View>
              {voiceGender === 'male' && (
                <Text style={styles.voiceOptionCheck}>✅</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_GRAY },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG_GRAY },
  loadingText: { marginTop: 12, fontSize: 16, color: TEAL },
  errorText: { fontSize: 18, color: '#ef4444' },
  backLink: { fontSize: 16, color: TEAL, marginTop: 10 },

  header: { paddingBottom: 16 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  backIcon: { color: '#fff', fontSize: 32, fontWeight: '300', marginTop: -4 },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  voiceBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceIcon: { fontSize: 18 },
  stopBtn: {
    backgroundColor: '#ef4444',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopBtnText: { fontSize: 18, color: '#fff' },
  headerBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  headerBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  tabContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tabWrapper: {
    flexDirection: 'row',
    position: 'relative',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
    flexDirection: 'row',
    gap: 4,
  },
  tabActive: { backgroundColor: TEAL_LIGHT },
  tabLabel: { 
    fontSize: 12, 
    fontWeight: '600', 
    color: '#94a3b8',
    textAlign: 'center',
  },
  tabLabelActive: { color: TEAL },
  tabBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    minWidth: 18,
    alignItems: 'center',
  },
  tabBadgeText: { fontSize: 10, fontWeight: '700', color: '#94a3b8' },
  tabBadgeTextActive: { color: '#fff' },
  tabCompleteIcon: { fontSize: 10, marginLeft: 2 },
  tabIndicator: {
    height: 3,
    backgroundColor: TEAL,
    borderRadius: 2,
    position: 'absolute',
    bottom: 0,
    left: 0,
  },

  content: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  questionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  questionNumber: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  numberText: { fontSize: 13, fontWeight: '600', color: TEAL },
  mondaiTag: {
    fontSize: 10,
    color: '#94a3b8',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  speakBtn: {
    padding: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speakBtnActive: { backgroundColor: '#fee2e2' },
  speakBtnDisabled: { opacity: 0.5 },
  speakIcon: { fontSize: 18 },
  answeredBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  answeredText: { fontSize: 12, color: TEAL, fontWeight: '700' },

  questionText: {
    fontSize: 15,
    color: '#1e293b',
    lineHeight: 24,
    marginBottom: 12,
  },

  options: { gap: 8 },
  option: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  optionSelected: {
    borderColor: TEAL,
    backgroundColor: TEAL_LIGHT,
  },
  optionText: { fontSize: 14, color: '#334155' },
  optionTextSelected: { color: TEAL, fontWeight: '600' },

  nextBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  nextBtnActive: {
    backgroundColor: TEAL,
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  nextBtnDisabled: {
    backgroundColor: '#e2e8f0',
  },
  nextBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  nextBtnTextActive: {
    color: '#fff',
  },
  nextBtnTextDisabled: {
    color: '#94a3b8',
  },
  nextBtnProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    width: '80%',
    gap: 8,
  },
  nextBtnProgressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  nextBtnProgressFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 2,
  },
  nextBtnProgressText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
  },

  submitBtn: {
    backgroundColor: TEAL,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  footer: { height: 40 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    maxWidth: 340,
  },
  voiceModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  voiceModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  voiceModalClose: {
    fontSize: 20,
    color: '#94a3b8',
    fontWeight: '600',
  },
  voiceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    marginBottom: 10,
    gap: 12,
  },
  voiceOptionActive: {
    borderColor: TEAL,
    backgroundColor: TEAL_LIGHT,
  },
  voiceOptionIcon: {
    fontSize: 28,
  },
  voiceOptionInfo: {
    flex: 1,
  },
  voiceOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  voiceOptionDesc: {
    fontSize: 13,
    color: '#94a3b8',
  },
  voiceOptionCheck: {
    fontSize: 18,
  },
});