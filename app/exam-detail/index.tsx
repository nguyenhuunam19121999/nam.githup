// app/exam-detail/index.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Alert,
  Modal,
} from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { Audio } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Components
import QuestionCard from "../../components/QuestionCard";

// Data
import { getExamById, Question, ExamData } from "../../assets/data_EXAMS";
import { useAuth } from "../../artifacts/mirai-jp/hooks/useAuth";

// ✅ MÀU CHỦ ĐẠO - ĐỒNG BỘ VỚI TRANG vocab
const TEAL = "#1F6F7A";
const TEAL_DARK = "#0B3540";
const GRAD = [TEAL, TEAL_DARK] as const;

// ============================================
// 📌 PHẦN 1: AUDIO MAP
// ============================================
const AUDIO_MAP: Record<string, any> = {
  "n3_01": require("../../assets/data_EXAMS/audio/n3/n3_01.mp3"),
};

// ============================================
// 📌 PHẦN 2: TIMER COMPONENT
// ============================================
function TimerDisplay({ minutes, onTimeOut, isActive = true }: { minutes: number; onTimeOut?: () => void; isActive?: boolean }) {
  const [totalSeconds, setTotalSeconds] = useState(minutes * 60);
  const intervalRef = useRef<any>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    setTotalSeconds(minutes * 60);
  }, [minutes]);

  useEffect(() => {
    if (isActive && totalSeconds > 0) {
      intervalRef.current = setInterval(() => {
        setTotalSeconds(prev => {
          if (prev <= 1) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (onTimeOut) onTimeOut();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, totalSeconds, onTimeOut]);

  const getTimerColor = () => {
    if (totalSeconds <= 60) return "#EF4444";
    if (totalSeconds <= 300) return "#F59E0B";
    return "#10B981";
  };
   return (
    <View style={[timerStyles.container, { backgroundColor: getTimerColor() + "15" }]}>
      <Text style={timerStyles.label}>⏱️</Text>
      <Text style={[timerStyles.time, { color: getTimerColor() }]}>
        {formatTime(totalSeconds)}
      </Text>
    </View>
  );

}

const timerStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  label: {
    fontSize: 14,
  },
  time: {
    fontSize: 16,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
});

// 📌 PHẦN 3: AUDIO PLAYER
// ============================================
function AudioPlayer({ examFile, onRef }: { examFile: string; onRef?: (ref: any) => void }) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);

  const getAudioKey = () => {
    return examFile.replace("_text", "").replace("_audio", "").replace("_image", "");
  };

  useEffect(() => {
    if (onRef) {
      onRef({
        stopAudio: async () => {
          if (soundRef.current) {
            try {
              const status = await soundRef.current.getStatusAsync();
              if (status.isLoaded && status.isPlaying) {
                await soundRef.current.stopAsync();
                setIsPlaying(false);
                setPosition(0);
              }
            } catch (error) {}
          }
        },
        pauseAudio: async () => {
          if (soundRef.current) {
            try {
              const status = await soundRef.current.getStatusAsync();
              if (status.isLoaded && status.isPlaying) {
                await soundRef.current.pauseAsync();
                setIsPlaying(false);
              }
            } catch (error) {}
          }
        },
      });
    }
  }, [onRef]);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const loadSound = async () => {
    if (soundRef.current) return soundRef.current;
    const audioKey = getAudioKey();
    const audioSource = AUDIO_MAP[audioKey];
    if (!audioSource) return null;
    try {
      setIsLoading(true);
      const { sound: newSound } = await Audio.Sound.createAsync(audioSource, { shouldPlay: false });
      soundRef.current = newSound;
      const status = await newSound.getStatusAsync();
      if (status.isLoaded) setDuration(status.durationMillis || 0);
      return newSound;
    } catch (error) {
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const playSound = async () => {
    const currentSound = await loadSound();
    if (!currentSound) return;
    try {
      const status = await currentSound.getStatusAsync();
      if (status.isLoaded) {
        if (status.isPlaying) {
          await currentSound.pauseAsync();
          setIsPlaying(false);
        } else {
          await currentSound.playAsync();
          setIsPlaying(true);
          currentSound.setOnPlaybackStatusUpdate((newStatus: any) => {
            if (newStatus.isLoaded) {
              setPosition(newStatus.positionMillis || 0);
              if (newStatus.didJustFinish) {
                setIsPlaying(false);
                setPosition(0);
              }
            }
          });
        }
      }
    } catch (error) {}
  };

  // Tua lại 10 giây
  const seekBackward = async () => {
    const currentSound = soundRef.current;
    if (!currentSound) return;
    try {
      const status = await currentSound.getStatusAsync();
      if (status.isLoaded) {
        const newPosition = Math.max(0, (status.positionMillis || 0) - 10000);
        await currentSound.setPositionAsync(newPosition);
        setPosition(newPosition);
      }
    } catch (error) {
    }
  };

  // Tua tới 10 giây
  const seekForward = async () => {
    const currentSound = soundRef.current;
    if (!currentSound) return;
    try {
      const status = await currentSound.getStatusAsync();
      if (status.isLoaded) {
        const newPosition = Math.min((status.durationMillis || 0), (status.positionMillis || 0) + 10000);
        await currentSound.setPositionAsync(newPosition);
        setPosition(newPosition);
      }
    } catch (error) {}
  };

  const formatTime = (millis: number) => {
    const seconds = Math.floor(millis / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <View style={audioStyles.container}>
      <View style={audioStyles.controlsRow}>
        {/* Nút tua lại 10s */}
        <TouchableOpacity style={audioStyles.controlBtn} onPress={seekBackward} disabled={isLoading}>
          <Text style={audioStyles.controlIcon}>⏪</Text>
          <Text style={audioStyles.controlText}>10s</Text>
        </TouchableOpacity>

        {/* Nút play/pause */}
        <TouchableOpacity style={[audioStyles.playBtn, isPlaying && audioStyles.playBtnActive]} onPress={playSound} disabled={isLoading}>
          <Text style={audioStyles.playIcon}>{isLoading ? "⏳" : isPlaying ? "⏸️" : "▶️"}</Text>
          <Text style={audioStyles.playText}>{isLoading ? "Đang tải..." : isPlaying ? "Tạm dừng" : "Phát audio"}</Text>
        </TouchableOpacity>

        {/* Nút tua tới 10s */}
        <TouchableOpacity style={audioStyles.controlBtn} onPress={seekForward} disabled={isLoading}>
          <Text style={audioStyles.controlIcon}>⏩</Text>
          <Text style={audioStyles.controlText}>10s</Text>
        </TouchableOpacity>
      </View>
      
      {/* Thanh tiến trình */}
      {duration > 0 && (
        <View style={audioStyles.progressContainer}>
          <Text style={audioStyles.timeText}>{formatTime(position)}</Text>
          <View style={audioStyles.progressBar}>
            <View style={[audioStyles.progressFill, { width: `${(position / duration) * 100}%` }]} />
          </View>
          <Text style={audioStyles.timeText}>{formatTime(duration)}</Text>
        </View>
      )}
    </View>
  );
}

const audioStyles = StyleSheet.create({
  container: { 
    marginBottom: 16, 
    padding: 12, 
    backgroundColor: "#f8fafc", 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: "#e2e8f0" 
  },
  controlsRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    gap: 12 
  },
  controlBtn: { 
    alignItems: "center", 
    justifyContent: "center", 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 24, 
    backgroundColor: "#f1f5f9" 
  },
  controlIcon: { 
    fontSize: 18, 
    color: "#475569" 
  },
  controlText: { 
    fontSize: 10, 
    color: "#475569", 
    marginTop: 2 
  },
  playBtn: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    gap: 8, 
    paddingHorizontal: 20, 
    paddingVertical: 10, 
    borderRadius: 30, 
    backgroundColor: TEAL, 
    minWidth: 130 
  },
  playBtnActive: { 
    backgroundColor: "#EF4444" 
  },
  playIcon: { 
    fontSize: 18, 
    color: "#fff" 
  },
  playText: { 
    fontSize: 14, 
    fontWeight: "600", 
    color: "#fff" 
  },
  progressContainer: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 8, 
    marginTop: 12 
  },
  progressBar: { 
    flex: 1, 
    height: 4, 
    backgroundColor: "#e2e8f0", 
    borderRadius: 2, 
    overflow: "hidden" 
  },
  progressFill: { 
    height: 4, 
    backgroundColor: TEAL, 
    borderRadius: 2 
  },
  timeText: { 
    fontSize: 11, 
    color: "#94a3b8", 
    minWidth: 40, 
    textAlign: "center" 
  },
});


// ============================================
// 📌 PHẦN 4: VOCAB SECTION
// ============================================
function VocabSection({ examFile, onComplete, savedAnswers = [] }: any) {
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const exam = getExamById(examFile);
        if (exam?.vocab?.sections) {
          const qs: any[] = [];
          for (const section of exam.vocab.sections) {
            if (section.questions?.length) qs.push(...section.questions);
          }
          setQuestions(qs);
          setAnswers(savedAnswers.length > 0 ? savedAnswers : new Array(qs.length).fill(-1));
        }
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [examFile]);

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;

  const handleSelectAnswer = (idx: number) => {
    setSelectedAnswer(idx);
  };

  const handleNext = () => {
    if (selectedAnswer === null) return;
    const newAnswers = [...answers];
    newAnswers[currentIndex] = selectedAnswer;
    setAnswers(newAnswers);
    setSelectedAnswer(null);
    if (currentIndex + 1 < totalQuestions) {
      setCurrentIndex(currentIndex + 1);
      // Khôi phục đáp án đã chọn trước đó nếu có
      if (answers[currentIndex + 1] !== -1) {
        setSelectedAnswer(answers[currentIndex + 1]);
      }
    } else {
      let correctCount = 0;
      for (let i = 0; i < totalQuestions; i++) {
        if (newAnswers[i] === questions[i]?.correct) correctCount++;
      }
      onComplete(newAnswers, correctCount, totalQuestions);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      // Lưu đáp án hiện tại
      if (selectedAnswer !== null) {
        const newAnswers = [...answers];
        newAnswers[currentIndex] = selectedAnswer;
        setAnswers(newAnswers);
      }
      setCurrentIndex(currentIndex - 1);
      setSelectedAnswer(answers[currentIndex - 1] !== -1 ? answers[currentIndex - 1] : null);
    }
  };

  if (loading) return <View style={styles.centerContainer}><ActivityIndicator size="large" color={TEAL} /><Text>Đang tải...</Text></View>;
  if (totalQuestions === 0) return <View style={styles.centerContainer}><Text>Chưa có câu hỏi</Text></View>;

  return (
    <ScrollView style={styles.flex1} showsVerticalScrollIndicator={false}>
      <QuestionCard
        question={{ id: currentQuestion.id, text: currentQuestion.text, options: currentQuestion.options }}
        questionNumber={currentIndex + 1}
        totalQuestions={totalQuestions}
        selectedAnswer={selectedAnswer}
        onSelectAnswer={handleSelectAnswer}
      />
      
      <View style={styles.navigationButtons}>
        <TouchableOpacity 
          style={[styles.navBtn, currentIndex === 0 && styles.navBtnDisabled]} 
          onPress={handlePrev} 
          disabled={currentIndex === 0}
        >
          <Text style={styles.navBtnText}>◀ Câu trước</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navBtn, styles.navBtnNext, selectedAnswer === null && styles.navBtnDisabled]} 
          onPress={handleNext} 
          disabled={selectedAnswer === null}
        >
          <Text style={styles.navBtnText}>
            {currentIndex + 1 === totalQuestions ? "Hoàn thành" : "Câu tiếp theo ▶"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ============================================
// 📌 PHẦN 5: GRAMMAR & READING SECTION
// ============================================
function GrammarReadingSection({ examFile, onComplete, savedAnswers = [] }: any) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const exam = getExamById(examFile);
        if (exam?.grammar_reading) {
          const qs: Question[] = [];
          for (const section of exam.grammar_reading.grammar_sections) qs.push(...section.questions);
          for (const section of exam.grammar_reading.reading_sections) qs.push(...section.questions);
          setQuestions(qs);
          setAnswers(savedAnswers.length > 0 ? savedAnswers : new Array(qs.length).fill(-1));
        }
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    load();
  }, [examFile]);

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;

  const handleSelectAnswer = (idx: number) => {
    setSelectedAnswer(idx);
  };

  const handleNext = () => {
    if (selectedAnswer === null) return;
    const newAnswers = [...answers];
    newAnswers[currentIndex] = selectedAnswer;
    setAnswers(newAnswers);
    setSelectedAnswer(null);
    if (currentIndex + 1 < totalQuestions) {
      setCurrentIndex(currentIndex + 1);
      if (answers[currentIndex + 1] !== -1) {
        setSelectedAnswer(answers[currentIndex + 1]);
      }
    } else {
      let correctCount = 0;
      for (let i = 0; i < totalQuestions; i++) {
        if (newAnswers[i] === questions[i]?.correct) correctCount++;
      }
      onComplete(newAnswers, correctCount, totalQuestions);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      if (selectedAnswer !== null) {
        const newAnswers = [...answers];
        newAnswers[currentIndex] = selectedAnswer;
        setAnswers(newAnswers);
      }
      setCurrentIndex(currentIndex - 1);
      setSelectedAnswer(answers[currentIndex - 1] !== -1 ? answers[currentIndex - 1] : null);
    }
  };

  if (loading) return <View style={styles.centerContainer}><ActivityIndicator size="large" color={TEAL} /><Text>Đang tải...</Text></View>;
  if (totalQuestions === 0) return <View style={styles.centerContainer}><Text>Chưa có câu hỏi</Text></View>;

  return (
    <ScrollView style={styles.flex1} showsVerticalScrollIndicator={false}>
      <QuestionCard
        question={{ id: currentQuestion.id, text: currentQuestion.text, options: currentQuestion.options }}
        questionNumber={currentIndex + 1}
        totalQuestions={totalQuestions}
        selectedAnswer={selectedAnswer}
        onSelectAnswer={handleSelectAnswer}
      />
      
      <View style={styles.navigationButtons}>
        <TouchableOpacity 
          style={[styles.navBtn, currentIndex === 0 && styles.navBtnDisabled]} 
          onPress={handlePrev} 
          disabled={currentIndex === 0}
        >
          <Text style={styles.navBtnText}>◀ Câu trước</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navBtn, styles.navBtnNext, selectedAnswer === null && styles.navBtnDisabled]} 
          onPress={handleNext} 
          disabled={selectedAnswer === null}
        >
          <Text style={styles.navBtnText}>
            {currentIndex + 1 === totalQuestions ? "Hoàn thành" : "Câu tiếp theo ▶"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ============================================
// 📌 PHẦN 6: LISTENING SECTION
// ============================================
function ListeningSection({ examFile, onComplete, savedAnswers = [], onAudioReady }: any) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const audioRef = useRef<any>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const exam = getExamById(examFile);
        if (exam?.listening) {
          const qs: Question[] = [];
          for (const section of exam.listening.sections) qs.push(...section.questions);
          setQuestions(qs);
          setAnswers(savedAnswers.length > 0 ? savedAnswers : new Array(qs.length).fill(-1));
        }
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    load();
  }, [examFile]);

  useEffect(() => {
    if (onAudioReady && audioRef.current) {
      onAudioReady(audioRef.current);
    }
  }, [onAudioReady, audioRef.current]);

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;

  const handleSelectAnswer = (idx: number) => {
    setSelectedAnswer(idx);
  };

  const handleNext = async () => {
    if (selectedAnswer === null) return;
    const newAnswers = [...answers];
    newAnswers[currentIndex] = selectedAnswer;
    setAnswers(newAnswers);
    setSelectedAnswer(null);
    if (currentIndex + 1 < totalQuestions) {
      setCurrentIndex(currentIndex + 1);
      if (answers[currentIndex + 1] !== -1) {
        setSelectedAnswer(answers[currentIndex + 1]);
      }
    } else {
      if (audioRef.current?.stopAudio) await audioRef.current.stopAudio();
      let correctCount = 0;
      for (let i = 0; i < totalQuestions; i++) {
        if (newAnswers[i] === questions[i]?.correct) correctCount++;
      }
      onComplete(newAnswers, correctCount, totalQuestions);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      if (selectedAnswer !== null) {
        const newAnswers = [...answers];
        newAnswers[currentIndex] = selectedAnswer;
        setAnswers(newAnswers);
      }
      setCurrentIndex(currentIndex - 1);
      setSelectedAnswer(answers[currentIndex - 1] !== -1 ? answers[currentIndex - 1] : null);
    }
  };

  if (loading) return <View style={styles.centerContainer}><ActivityIndicator size="large" color={TEAL} /><Text>Đang tải...</Text></View>;
  if (totalQuestions === 0) return <View style={styles.centerContainer}><Text>Chưa có câu hỏi</Text></View>;

  return (
    <ScrollView style={styles.flex1} showsVerticalScrollIndicator={false}>
      <AudioPlayer examFile={examFile} onRef={(ref) => { audioRef.current = ref; }} />
      <QuestionCard
        question={{ id: currentQuestion.id, text: currentQuestion.text, options: currentQuestion.options, image: currentQuestion.image }}
        questionNumber={currentIndex + 1}
        totalQuestions={totalQuestions}
        selectedAnswer={selectedAnswer}
        onSelectAnswer={handleSelectAnswer}
        hasImage={!!currentQuestion?.image}
      />
      
      <View style={styles.navigationButtons}>
        <TouchableOpacity 
          style={[styles.navBtn, currentIndex === 0 && styles.navBtnDisabled]} 
          onPress={handlePrev} 
          disabled={currentIndex === 0}
        >
          <Text style={styles.navBtnText}>◀ Câu trước</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navBtn, styles.navBtnNext, selectedAnswer === null && styles.navBtnDisabled]} 
          onPress={handleNext} 
          disabled={selectedAnswer === null}
        >
          <Text style={styles.navBtnText}>
            {currentIndex + 1 === totalQuestions ? "Hoàn thành" : "Câu tiếp theo ▶"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ============================================
// 📌 PHẦN 7: LƯU LỊCH SỬ THI
// ============================================
async function saveExamHistory(
  examId: string,
  examName: string,
  vocabAnswers: number[],
  grammarReadingAnswers: number[],
  listeningAnswers: number[],
  currentUser: string | null,
  scopedKey: (key: string) => string
): Promise<boolean> {
  if (!currentUser) return false;
  try {
    const historyKey = scopedKey("exam_history");
    const existingHistory = await AsyncStorage.getItem(historyKey);
    const history = existingHistory ? JSON.parse(existingHistory) : [];
    const newRecord = {
      id: Date.now().toString(),
      examId: examId,
      examName: examName,
      date: new Date().toISOString(),
      vocabAnswers: vocabAnswers,
      grammarAnswers: grammarReadingAnswers,
      listeningAnswers: listeningAnswers,
    };
    history.unshift(newRecord);
    const trimmedHistory = history.slice(0, 50);
    await AsyncStorage.setItem(historyKey, JSON.stringify(trimmedHistory));
    return true;
  } catch (error) {
    return false;
  }
}

// ============================================
// 📌 PHẦN 8: TRANG THI CHÍNH
// ============================================
export default function ExamDetailScreen() {
  const params = useLocalSearchParams();
  const examId = params.id as string;
  const { currentUser, scopedKey } = useAuth();

  const [exam, setExam] = useState<ExamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSection, setCurrentSection] = useState<'vocab' | 'grammar_reading' | 'listening'>('vocab');

  const [vocabAnswers, setVocabAnswers] = useState<number[]>([]);
  const [grammarReadingAnswers, setGrammarReadingAnswers] = useState<number[]>([]);
  const [listeningAnswers, setListeningAnswers] = useState<number[]>([]);

  const [vocabCompleted, setVocabCompleted] = useState(false);
  const [grammarReadingCompleted, setGrammarReadingCompleted] = useState(false);
  const [listeningCompleted, setListeningCompleted] = useState(false);

  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showHomeDialog, setShowHomeDialog] = useState(false);
  const [sectionTimerActive, setSectionTimerActive] = useState(true);

  const listeningAudioRef = useRef<any>(null);

  useEffect(() => {
    if (examId) {
      const examData = getExamById(examId);
      setExam(examData || null);
      setLoading(false);
    }
  }, [examId]);

  const allCompleted = vocabCompleted && grammarReadingCompleted && listeningCompleted;

  const handleVocabComplete = (answers: number[], correct: number, total: number) => {
    setVocabAnswers(answers);
    setVocabCompleted(true);
  };

  const handleGrammarReadingComplete = (answers: number[], correct: number, total: number) => {
    setGrammarReadingAnswers(answers);
    setGrammarReadingCompleted(true);
  };

  const handleListeningComplete = (answers: number[], correct: number, total: number) => {
    setListeningAnswers(answers);
    setListeningCompleted(true);
  };

  const stopAudioIfPlaying = async () => {
    if (listeningAudioRef.current?.stopAudio) {
      await listeningAudioRef.current.stopAudio();
    }
  };

  const handleSubmitPress = async () => {
    await stopAudioIfPlaying();
    if (allCompleted) {
      setShowSubmitDialog(true);
    } else {
      router.push({
        pathname: '/exam-result',
        params: {
          examId: examId,
          vocabAnswers: JSON.stringify(vocabAnswers),
          grammarAnswers: JSON.stringify(grammarReadingAnswers),
          listeningAnswers: JSON.stringify(listeningAnswers),
        },
      });
    }
  };

  const handleConfirmSubmit = async () => {
    setShowSubmitDialog(false);
    if (currentUser) {
      await saveExamHistory(
        examId,
        exam?.ky_thi || "Đề thi JLPT",
        vocabAnswers,
        grammarReadingAnswers,
        listeningAnswers,
        currentUser,
        scopedKey
      );
      Alert.alert("✅ Thành công", "Đã lưu kết quả bài thi!");
    }
    router.push({
      pathname: '/exam-result',
      params: {
        examId: examId,
        vocabAnswers: JSON.stringify(vocabAnswers),
        grammarAnswers: JSON.stringify(grammarReadingAnswers),
        listeningAnswers: JSON.stringify(listeningAnswers),
      },
    });
  };

  const handleHomePress = async () => {
    await stopAudioIfPlaying();
    if (allCompleted) {
      setShowHomeDialog(true);
    } else {
      router.push('/');
    }
  };

  const handleConfirmHome = async () => {
    setShowHomeDialog(false);
    if (currentUser && allCompleted) {
      await saveExamHistory(
        examId,
        exam?.ky_thi || "Đề thi JLPT",
        vocabAnswers,
        grammarReadingAnswers,
        listeningAnswers,
        currentUser,
        scopedKey
      );
    }
    router.push('/');
  };

  const getSectionTime = () => {
    switch (currentSection) {
      case 'vocab': return 30;
      case 'grammar_reading': return 60;
      case 'listening': return 35;
      default: return 30;
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={TEAL} />
        <Text style={styles.loadingText}>Đang tải đề thi...</Text>
      </View>
    );
  }

  if (!exam) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>❌ Không tìm thấy đề thi!</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.button}>
          <Text style={styles.buttonText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor={TEAL} />

      <View style={styles.root}>
        {/* Header */}
        <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
          <SafeAreaView style={styles.topBar}>
            <View style={styles.headerRow}>
              <TouchableOpacity style={styles.backBtn} onPress={handleHomePress} activeOpacity={0.7}>
                <Text style={styles.backBtnText}>‹</Text>
              </TouchableOpacity>

              <View style={styles.titleBlock}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {exam.ky_thi}
                </Text>
                <Text style={styles.headerSubtitle}>
                  {exam.level} · {exam.year}
                </Text>
              </View>

              <TimerDisplay 
                minutes={getSectionTime()} 
                onTimeOut={() => {
                  Alert.alert("Hết giờ!", "Thời gian làm bài đã hết!");
                }}
                isActive={sectionTimerActive}
              />
            </View>
          </SafeAreaView>
        </LinearGradient>

        {/* 3 nút điều hướng - GIỐNG TRANG vocab */}
        <View style={styles.modeSwitch}>
          <TouchableOpacity
            style={[styles.modeBtn, currentSection === 'vocab' && styles.modeActive]}
            onPress={() => setCurrentSection('vocab')}
          >
            <Text style={[styles.modeBtnText, currentSection === 'vocab' && styles.modeBtnTextActive]}>
              📖 Từ vựng {vocabCompleted && '✓'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.modeBtn, currentSection === 'grammar_reading' && styles.modeActive]}
            onPress={() => setCurrentSection('grammar_reading')}
          >
            <Text style={[styles.modeBtnText, currentSection === 'grammar_reading' && styles.modeBtnTextActive]}>
              📝 NP & ĐH {grammarReadingCompleted && '✓'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.modeBtn, currentSection === 'listening' && styles.modeActive]}
            onPress={() => setCurrentSection('listening')}
          >
            <Text style={[styles.modeBtnText, currentSection === 'listening' && styles.modeBtnTextActive]}>
              🎧 Nghe hiểu {listeningCompleted && '✓'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Nội dung section */}
        <View style={styles.content}>
          {currentSection === 'vocab' && (
            <VocabSection 
              examFile={examId} 
              onComplete={handleVocabComplete} 
              savedAnswers={vocabAnswers} 
            />
          )}
          {currentSection === 'grammar_reading' && (
            <GrammarReadingSection 
              examFile={examId} 
              onComplete={handleGrammarReadingComplete} 
              savedAnswers={grammarReadingAnswers} 
            />
          )}
          {currentSection === 'listening' && (
            <ListeningSection 
              examFile={examId} 
              onComplete={handleListeningComplete} 
              savedAnswers={listeningAnswers}
              onAudioReady={(ref: any) => { listeningAudioRef.current = ref; }}
            />
          )}
        </View>

        {/* Nút nộp bài cố định dưới đáy */}
        <View style={styles.submitButtonContainer}>
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmitPress}>
            <Text style={styles.submitButtonText}>📤 Nộp bài</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Dialogs */}
      <Modal transparent visible={showSubmitDialog} animationType="fade" onRequestClose={() => setShowSubmitDialog(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🎉 Hoàn thành xuất sắc!</Text>
            <Text style={styles.modalText}>Bạn đã hoàn thành tất cả các phần thi.</Text>
            <Text style={styles.modalSubText}>Bạn có muốn lưu kết quả để xem lại sau không?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCancel]} onPress={() => setShowSubmitDialog(false)}>
                <Text style={styles.modalBtnCancelText}>Để sau</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnSave]} onPress={handleConfirmSubmit}>
                <Text style={styles.modalBtnSaveText}>Lưu & Xem kết quả</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={showHomeDialog} animationType="fade" onRequestClose={() => setShowHomeDialog(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🏠 Về trang chủ</Text>
            <Text style={styles.modalText}>Bạn có muốn lưu kết quả bài thi trước khi thoát không?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCancel]} onPress={() => setShowHomeDialog(false)}>
                <Text style={styles.modalBtnCancelText}>Không lưu</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnSave]} onPress={handleConfirmHome}>
                <Text style={styles.modalBtnSaveText}>Lưu & Về</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#f0f4f8",
  },
  flex1: { flex: 1 },
  centerContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  loadingText: { marginTop: 12, fontSize: 14, color: "#64748B" },
  errorText: { fontSize: 18, color: "#EF4444", textAlign: "center", marginBottom: 20 },
  button: { backgroundColor: TEAL, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },

  // Header
  topBar: { backgroundColor: "transparent" },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 42,
    height: 42,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  backBtnText: {
    fontSize: 28,
    color: "#fff",
    lineHeight: 30,
  },
  titleBlock: {
    flex: 1,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
  },

  // 3 nút điều hướng - GIỐNG vocab
  // Thay thế phần styles modeSwitch trong exam-detail
  modeSwitch: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,        // Giống vocab
    paddingHorizontal: 16,   // Thêm để căn lề
    paddingTop: 12,          // Thêm để căn lề trên
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,     // Giống vocab
    backgroundColor: "#e2e8f0",
    borderRadius: 10,        // Giống vocab
    alignItems: "center",
  },
  modeActive: {
    backgroundColor: TEAL,   // TEAL = "#1F6F7A"
  },
  modeBtnText: {
    fontSize: 13,            // Giống vocab
    fontWeight: "600",
    color: "#475569",
  },
  modeBtnTextActive: {
    color: "#fff",
  },

  // Content
  content: {
    flex: 1,
    padding: 16,
  },

  // Navigation buttons
  navigationButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 20,
    marginBottom: 20,
  },
  navBtn: {
    flex: 1,
    backgroundColor: "#e2e8f0",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  navBtnNext: {
    backgroundColor: TEAL,
  },
  navBtnDisabled: {
    opacity: 0.5,
  },
  navBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a202c",
  },
  navBtnTextNext: {
    color: "#fff",
  },

  // Submit button
  submitButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  submitButton: {
    backgroundColor: TEAL,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: "#fff", borderRadius: 20, padding: 24, width: "80%", alignItems: "center" },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 12, color: "#1e293b" },
  modalText: { fontSize: 16, textAlign: "center", marginBottom: 8, color: "#475569" },
  modalSubText: { fontSize: 14, textAlign: "center", marginBottom: 20, color: "#94a3b8" },
  modalButtons: { flexDirection: "row", gap: 12 },
  modalBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, minWidth: 100, alignItems: "center" },
  modalBtnCancel: { backgroundColor: "#f1f5f9" },
  modalBtnCancelText: { color: "#64748b", fontWeight: "600" },
  modalBtnSave: { backgroundColor: TEAL },
  modalBtnSaveText: { color: "#fff", fontWeight: "600" },
});
