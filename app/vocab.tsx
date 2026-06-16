// app/vocab.tsx
// ─────────────────────────────────────────────────────────────────────────────

import AsyncStorage from "@react-native-async-storage/async-storage";
import { BottomTabBar } from "../components/BottomTabBar";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Speech from "expo-speech";
import React, { useEffect, useMemo, useState } from "react";
import { getBookInfo } from "../assets/data_nghanh_hoc";
import { getVocab, type RawVocab } from "../assets/vocab";
import { FeedbackSection } from "../components/FeedbackSection";
import { useAuth } from "../artifacts/mirai-jp/hooks/useAuth";
import FlashcardDetail, { VocabItem, Field, ALL_FIELDS, FIELD_LABELS } from "../components/FlashcardDetail";
import {
  Alert,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

// ✅ MÀU CHỦ ĐẠO - ĐỒNG BỘ VỚI KANJI
const TEAL = "#1F6F7A";
const TEAL_DARK = "#1c5765";
const TEXT_COLOR = "#e47b0b";

// ─── Dữ liệu từ vựng ─────────────────────────────────────────────────────────
interface Vocab {
  id: string;
  kanji: string;
  hiragana: string;
  han: string;
  nghia: string;
  example?: string;
  exampleMeaning?: string;
  category?: string;
  lesson?: number;
  level?: string;
}

function normalizeVocab(raw: RawVocab[], lessonNumber?: number, sourceLevel?: string): Vocab[] {
  let filtered = raw;
  if (lessonNumber !== undefined) {
    filtered = raw.filter((item: any) => (item.lesson || 1) === lessonNumber);
  }
  return filtered.map((item, idx) => ({
    id: `${lessonNumber || 1}_${item.kanji || idx}`,
    kanji: item.kanji ?? "",
    hiragana: item.hiragana ?? item.hira ?? "",
    han: item.han ?? "",
    nghia: item.nghia ?? "",
    example: item.example,
    exampleMeaning: item.exampleMeaning,
    category: item.category,
    lesson: item.lesson || 1,
    level: sourceLevel || "N3",  // ✅ Bây giờ sourceLevel đã được định nghĩa
  }));
}

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Component Toggle row ─────────────────────────────────────────────────────
function ToggleRow({
  label,
  value,
  onToggle,
  isLast,
}: {
  label: string;
  value: boolean;
  onToggle: () => void;
  isLast: boolean;
}) {
  return (
    <TouchableOpacity
      style={[s.menuRow, isLast && { borderBottomWidth: 0 }]}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <Text style={s.menuRowLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: "#cbd5e1", true: TEAL }}
        thumbColor="#fff"
      />
    </TouchableOpacity>
  );
}

// ─── Component Quiz ───────────────────────────────────────────────────────────
interface QuizQuestion {
  id: number;
  question: string;
  correct: string;
  options: string[];
}

const QuizMode = ({ data, onExit }: { data: Vocab[]; onExit: () => void }) => {
  const { scopedKey } = useAuth();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    const shuffled = shuffle(data);
    const quizData = shuffled.slice(0, 15).map((item, idx) => {
      const otherMeanings = data
        .filter((v) => v.nghia !== item.nghia)
        .map((v) => v.nghia);
      const shuffledOthers = shuffle(otherMeanings);
      const options = [item.nghia, ...shuffledOthers.slice(0, 3)];
      return {
        id: idx,
        question: item.kanji,
        correct: item.nghia,
        options: shuffle(options),
      };
    });
    setQuestions(quizData);
  }, [data]);

  const saveQuizResult = async (finalScore: number, total: number) => {
    try {
      const stats = await AsyncStorage.getItem(scopedKey("quizStats"));
      const currentStats = stats
        ? JSON.parse(stats)
        : { bestScore: 0, totalPlayed: 0, avgScore: 0 };
      const newTotalPlayed = currentStats.totalPlayed + 1;
      const newAvg =
        (currentStats.avgScore * currentStats.totalPlayed +
          (finalScore / total) * 100) /
        newTotalPlayed;
      const newStats = {
        bestScore: Math.max(
          currentStats.bestScore,
          Math.round((finalScore / total) * 100),
        ),
        totalPlayed: newTotalPlayed,
        avgScore: Math.round(newAvg),
        lastScore: Math.round((finalScore / total) * 100),
      };
      await AsyncStorage.setItem(scopedKey("quizStats"), JSON.stringify(newStats));
    } catch (e) {
    }
  };

  const handleAnswer = (answer: string) => {
    if (selectedAnswer) return;
    setSelectedAnswer(answer);
    const isThisCorrect = answer === questions[currentQ].correct;
    if (isThisCorrect) {
      setScore(score + 1);
    }
    setTimeout(() => {
      if (currentQ + 1 < questions.length) {
        setCurrentQ(currentQ + 1);
        setSelectedAnswer(null);
        setShowExplanation(false);
      } else {
        setShowResult(true);
        saveQuizResult(score + (isThisCorrect ? 1 : 0), questions.length);
      }
    }, 1200);
  };

  if (questions.length === 0) {
    return (
      <View style={s.quizContainer}>
        <Text style={s.loadingText}>Đang tạo câu hỏi...</Text>
      </View>
    );
  }

  if (showResult) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <View style={s.quizContainer}>
        <View style={s.resultCard}>
          <Text style={s.resultTitle}>📊 Kết quả của bạn</Text>
          <Text style={s.resultScore}>
            {score} / {questions.length}
          </Text>
          <Text style={s.resultPercentage}>{percentage}%</Text>
          <Text style={s.resultMessage}>
            {percentage >= 80
              ? "🎉 Xuất sắc! 🎉"
              : percentage >= 60
                ? "👍 Khá tốt!"
                : "💪 Cố gắng hơn nữa nhé!"}
          </Text>
          <TouchableOpacity style={s.quizExitBtn} onPress={onExit}>
            <Text style={s.buttonTextWhite}>Quay lại học</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const current = questions[currentQ];

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#f0f4f8" />
      <View style={s.quizContainer}>
        <View style={s.quizHeader}>
          <Text style={s.quizCounter}>
            Câu {currentQ + 1}/{questions.length}
          </Text>
          <Text style={s.quizScore}>Điểm: {score}</Text>
        </View>

        <View style={s.questionCard}>
          <Text style={s.questionText}>{current.question}</Text>
          <Text style={s.questionHint}>Chọn nghĩa đúng</Text>
        </View>

        <View style={s.optionsGrid}>
          {current.options.map((opt, idx) => {
            let btnStyle = s.optionBtn;
            if (selectedAnswer === opt) {
              btnStyle =
                opt === current.correct ? s.correctOption : s.wrongOption;
            }
            return (
              <TouchableOpacity
                key={idx}
                style={btnStyle}
                onPress={() => handleAnswer(opt)}
                disabled={!!selectedAnswer}
              >
                <Text style={s.optionText}>{opt}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {selectedAnswer && !showExplanation && (
          <TouchableOpacity
            style={s.explainBtn}
            onPress={() => setShowExplanation(true)}
          >
            <Text style={s.explainText}>📖 Xem giải thích</Text>
          </TouchableOpacity>
        )}

        {showExplanation && (
          <View style={s.explanationBox}>
            <Text style={s.explanationTitle}>💡 Giải thích:</Text>
            <Text style={s.explanationContent}>
              {current.question} có nghĩa là "{current.correct}"
            </Text>
          </View>
        )}
      </View>
    </>
  );
};

// ─── Component Practice (Luyện viết) ──────────────────────────────────────────
const PracticeMode = ({
  data,
  onExit,
}: {
  data: Vocab[];
  onExit: () => void;
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "correct" | "wrong" | null;
    message: string;
  }>({ type: null, message: "" });
  const [score, setScore] = useState(0);

  const currentVocab = data[currentIndex];
  const total = data.length;
  const progress = ((currentIndex + 1) / total) * 100;

  const nextWord = () => {
    if (currentIndex + 1 < total) {
      setCurrentIndex(currentIndex + 1);
      setUserAnswer("");
      setFeedback({ type: null, message: "" });
    } else {
      Alert.alert(
        "🎉 Hoàn thành!",
        `Bạn đã luyện ${total} từ, đúng ${score}/${total} từ!`,
        [{ text: "OK", onPress: onExit }],
      );
    }
  };

  const checkAnswer = () => {
    if (!currentVocab) return;
    const isCorrect = normalize(userAnswer) === normalize(currentVocab.nghia);
    if (isCorrect) {
      setScore(score + 1);
      setFeedback({ type: "correct", message: "✅ Chính xác! Tiếp tục nào!" });
      setTimeout(() => nextWord(), 1500);
    } else {
      setFeedback({
        type: "wrong",
        message: `❌ Sai rồi! "${currentVocab.kanji}" nghĩa là "${currentVocab.nghia}"`,
      });
      setTimeout(() => setFeedback({ type: null, message: "" }), 2000);
    }
  };

  if (!currentVocab) {
    return (
      <View style={s.practiceContainer}>
        <Text style={s.loadingText}>Không có từ vựng để luyện</Text>
        <TouchableOpacity style={s.practiceExitBtn} onPress={onExit}>
          <Text style={s.buttonTextDark}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#f0f4f8" />
      <View style={s.practiceContainer}>
        <View style={s.practiceHeader}>
          <Text style={s.practiceCounter}>
            {currentIndex + 1}/{total}
          </Text>
          <Text style={s.practiceScore}>✅ {score}</Text>
        </View>

        <View style={s.progressBarWrapper}>
          <View style={s.progressBarTrack}>
            <View style={[s.progressBarFill, { width: `${progress}%` }]} />
          </View>
        </View>

        <View style={s.questionCard}>
          <Text style={s.questionText}>{currentVocab.kanji}</Text>
          <Text style={s.questionSub}>{currentVocab.hiragana}</Text>
        </View>

        <TextInput
          style={s.practiceInput}
          placeholder="Nhập nghĩa tiếng Việt..."
          placeholderTextColor="#94a3b8"
          value={userAnswer}
          onChangeText={setUserAnswer}
          onSubmitEditing={checkAnswer}
        />

        {feedback.type && (
          <View
            style={[
              s.feedbackBox,
              feedback.type === "correct" ? s.feedbackCorrect : s.feedbackWrong,
            ]}
          >
            <Text style={s.feedbackText}>{feedback.message}</Text>
          </View>
        )}

        <TouchableOpacity style={s.checkBtn} onPress={checkAnswer}>
          <Text style={s.buttonTextWhite}>Kiểm tra</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.practiceExitBtn} onPress={onExit}>
          <Text style={s.buttonTextDark}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    </>
  );
};

// ─── Component Statistics ─────────────────────────────────────────────────────
const StatisticsModal = ({
  visible,
  onClose,
  totalCount,
  bookmarkCount,
  onShowBookmarks,
}: {
  visible: boolean;
  onClose: () => void;
  totalCount: number;
  bookmarkCount: number;
  onShowBookmarks: () => void;
}) => {
  const { scopedKey } = useAuth();
  const [stats, setStats] = useState({
    bestScore: 0,
    totalPlayed: 0,
    avgScore: 0,
    lastScore: 0,
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const quizStats = await AsyncStorage.getItem(scopedKey("quizStats"));
        if (quizStats) setStats(JSON.parse(quizStats));
        else setStats({ bestScore: 0, totalPlayed: 0, avgScore: 0, lastScore: 0 });
      } catch (e) {
      }
    };
    if (visible) loadStats();
  }, [visible, scopedKey]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={s.modalOverlay}>
        <View style={s.statsModal}>
          <Text style={s.statsTitle}>📈 Thống kê học tập</Text>

          <View style={s.statCard}>
            <Text style={s.statValue}>{totalCount}</Text>
            <Text style={s.statLabel}>Tổng số từ vựng</Text>
          </View>

          <TouchableOpacity
            style={[s.statCard, s.statCardTappable]}
            activeOpacity={0.75}
            onPress={() => { onClose(); onShowBookmarks(); }}
          >
            <Text style={s.statValue}>⭐ {bookmarkCount}</Text>
            <Text style={[s.statLabel, s.statLabelHint]}>Từ đã ghim · Nhấn để xem</Text>
          </TouchableOpacity>

          <View style={s.statsDivider} />

          <Text style={s.sectionTitle}>🎯 Kết quả Quiz</Text>
          <View style={s.statRow}>
            <Text style={s.statRowLabel}>Điểm cao nhất:</Text>
            <Text style={s.statRowValue}>{stats.bestScore}%</Text>
          </View>
          <View style={s.statRow}>
            <Text style={s.statRowLabel}>Trung bình:</Text>
            <Text style={s.statRowValue}>{stats.avgScore}%</Text>
          </View>
          <View style={s.statRow}>
            <Text style={s.statRowLabel}>Đã chơi:</Text>
            <Text style={s.statRowValue}>{stats.totalPlayed} lần</Text>
          </View>

          <TouchableOpacity style={s.closeStatsBtn} onPress={onClose}>
            <Text style={s.buttonTextWhite}>Đóng</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function VocabScreen() {
  const router = useRouter();
  const { scopedKey } = useAuth();
  const params = useLocalSearchParams<{
    level?: string;
    bookId?: string;
    title?: string;
    lesson?: string;
    q?: string;
  }>();
  
  // Xác định level từ params hoặc từ bookId
  const bookId = typeof params.bookId === "string" ? params.bookId : "mimikara-n3";
  const level = (() => {
    if (params.level) return params.level;
    if (bookId.includes('n1')) return 'N1';
    if (bookId.includes('n2')) return 'N2';
    if (bookId.includes('n3')) return 'N3';
    if (bookId.includes('n4')) return 'N4';
    if (bookId.includes('n5')) return 'N5';
    return 'N3';
  })();
  const lessonParam = typeof params.lesson === "string" ? parseInt(params.lesson, 10) : 1;
  
  // Dữ liệu từ vựng
  const [vocabList, setVocabList] = useState<Vocab[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // UI states
  const [showVocabMode, setShowVocabMode] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [gameMode, setGameMode] = useState<"vocab" | "quiz" | "practice">("vocab");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [autoScroll, setAutoScroll] = useState(false);
  const [autoScrollSec, setAutoScrollSec] = useState(2);
  const AUTO_SCROLL_PRESETS = [2, 3, 5, 8, 10, 15] as const;
  
  // Cấu hình mặt trước/sau
  const [frontFields, setFrontFields] = useState<Field[]>(["kanji", "hiragana"]);
  const [backFields, setBackFields] = useState<Field[]>(["nghia", "han", "example"]);
  
  const [frontSel, setFrontSel] = useState<Record<Field, boolean>>({
    kanji: true,
    hiragana: true,
    han: false,
    nghia: false,
    example: false,
  });

  const [backSel, setBackSel] = useState<Record<Field, boolean>>({
    kanji: false,
    hiragana: false,
    han: true,
    nghia: true,
    example: true,
  });
  
  const headerInfo = useMemo(() => getBookInfo(level, bookId), [level, bookId]);
  
  // Tải từ vựng
  useEffect(() => {
    setIsLoading(true);
    try {
      let rawVocab: RawVocab[] = [];
      rawVocab = getVocab(level, bookId);
      const formatted = normalizeVocab(rawVocab, lessonParam, level);
      setVocabList(formatted);
    } catch (error) {
      Alert.alert("Lỗi", "Không thể tải dữ liệu từ vựng");
    } finally {
      setIsLoading(false);
    }
  }, [level, bookId, lessonParam]);
  
  // Load bookmarks
  useEffect(() => {
    const loadBookmarks = async () => {
      try {
        const saved = await AsyncStorage.getItem(scopedKey("bookmarks"));
        setBookmarks(saved ? new Set(JSON.parse(saved)) : new Set());
      } catch (e) {
      }
    };
    loadBookmarks();
  }, [scopedKey]);
  
  // Load auto-scroll setting
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(scopedKey("autoScroll"));
        if (!raw) return;
        const parsed = JSON.parse(raw) as { enabled?: boolean; seconds?: number };
        if (typeof parsed.enabled === "boolean") setAutoScroll(parsed.enabled);
        if (typeof parsed.seconds === "number" && AUTO_SCROLL_PRESETS.includes(parsed.seconds as any)) {
          setAutoScrollSec(parsed.seconds);
        }
      } catch { /* ignore */ }
    })();
  }, [scopedKey]);
  
  // Load field settings
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(scopedKey("vocabFields"));
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.frontSel) setFrontSel(parsed.frontSel);
          if (parsed.backSel) setBackSel(parsed.backSel);
        }
      } catch { /* ignore */ }
    })();
  }, [scopedKey]);
  
  // Save field settings
  useEffect(() => {
    AsyncStorage.setItem(scopedKey("vocabFields"), JSON.stringify({ frontSel, backSel })).catch(() => {});
  }, [frontSel, backSel, scopedKey]);
  
  // Update fields array when selection changes
  useEffect(() => {
    setFrontFields(ALL_FIELDS.filter((f: Field) => frontSel[f]));
    setBackFields(ALL_FIELDS.filter((f: Field) => backSel[f]));
  }, [frontSel, backSel]);
  
  const saveBookmarks = async (newBookmarks: Set<string>) => {
    try {
      await AsyncStorage.setItem(scopedKey("bookmarks"), JSON.stringify([...newBookmarks]));
    } catch (e) {
    }
  };
  
  const toggleBookmark = (vocabId: string) => {
    const newBookmarks = new Set(bookmarks);
    if (newBookmarks.has(vocabId)) {
      newBookmarks.delete(vocabId);
    } else {
      newBookmarks.add(vocabId);
      (async () => {
        try {
          const raw = await AsyncStorage.getItem(scopedKey("reviewedWords"));
          const existing: string[] = raw ? JSON.parse(raw) : [];
          if (!existing.includes(vocabId)) {
            await AsyncStorage.setItem(scopedKey("reviewedWords"), JSON.stringify([...existing, vocabId]));
          }
        } catch (e) { /* ignore */ }
      })();
    }
    setBookmarks(newBookmarks);
    saveBookmarks(newBookmarks);
  };
  
  const toggleField = (side: "front" | "back", field: Field) => {
    if (side === "front") {
      setFrontSel((prev) => {
        const next = { ...prev, [field]: !prev[field] };
        if (!Object.values(next).some(Boolean)) return prev;
        return next;
      });
    } else {
      setBackSel((prev) => {
        const next = { ...prev, [field]: !prev[field] };
        if (!Object.values(next).some(Boolean)) return prev;
        return next;
      });
    }
  };
  
  const filteredVocabList = useMemo(() => {
    return showBookmarksOnly ? vocabList.filter(v => bookmarks.has(v.id)) : vocabList;
  }, [vocabList, showBookmarksOnly, bookmarks]);
  
  // Reset index
  useEffect(() => {
    setCurrentCardIndex(0);
  }, [filteredVocabList.length]);
  
  const openVocabMode = () => {
    setCurrentCardIndex(0);
    setShowVocabMode(true);
  };
  
  const closeVocabMode = () => {
    setShowVocabMode(false);
  };
  
  const handleNextCard = () => {
    if (currentCardIndex + 1 < filteredVocabList.length) {
      setCurrentCardIndex(currentCardIndex + 1);
    } else {
      Alert.alert("🎉 Hoàn thành!", "Bạn đã học xong tất cả từ trong bài này!");
    }
  };
  
  const handlePrevCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
    }
  };
  
  // Phát âm
  const speak = (text: string) => {
    if (!text) return;
    Speech.speak(text, { language: "ja-JP", pitch: 1, rate: 0.8 });
  };
  
  // Chuyển đổi dữ liệu sang VocabItem cho FlashcardDetail
  const vocabForFlashcard: VocabItem[] = useMemo(() => {
    return filteredVocabList.map(v => ({
      id: v.id,
      kanji: v.kanji,
      hiragana: v.hiragana,
      han: v.han,
      nghia: v.nghia,
      example: v.example,
      exampleMeaning: v.exampleMeaning
    }));
  }, [filteredVocabList]);
  
  // Nếu đang ở chế độ Quiz
  if (gameMode === "quiz" && !isLoading && !showVocabMode) {
    return (
      <>
        <QuizMode
          data={filteredVocabList.length > 0 ? filteredVocabList : vocabList}
          onExit={() => setGameMode("vocab")}
        />
        <BottomTabBar />
      </>
    );
  }
  
  // Nếu đang ở chế độ Practice
  if (gameMode === "practice" && !isLoading && !showVocabMode) {
    return (
      <>
        <PracticeMode
          data={filteredVocabList.length > 0 ? filteredVocabList : vocabList}
          onExit={() => setGameMode("vocab")}
        />
        <BottomTabBar />
      </>
    );
  }
  
  // Nếu đang ở chế độ lật thẻ
  if (showVocabMode && !isLoading && vocabForFlashcard.length > 0) {
    return (
      <>
        <FlashcardDetail
          vocabList={vocabForFlashcard}
          initialIndex={currentCardIndex}
          onClose={closeVocabMode}
          onBookmarkToggle={toggleBookmark}
          isBookmarked={(id) => bookmarks.has(id)}
          frontFields={frontFields}
          backFields={backFields}
          autoScroll={autoScroll}
          autoScrollSec={autoScrollSec}
        />
        <BottomTabBar />
      </>
    );
  }
  
  // Render chính: Danh sách từ vựng
  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#f0f4f8" />
      <TouchableWithoutFeedback onPress={() => { if (menuOpen) setMenuOpen(false); Keyboard.dismiss(); }}>
        <View style={s.container}>
          {/* Header - CỐ ĐỊNH */}
          <View style={s.headerRow}>
            <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
              <Text style={s.backBtnText}>‹</Text>
            </TouchableOpacity>
            <View style={s.titleBlock}>
              <Text style={s.title} numberOfLines={1}>
                {headerInfo.emoji} {headerInfo.vi} · Bài {lessonParam}
              </Text>
              <Text style={s.subtitle}>
                {filteredVocabList.length} từ vựng
              </Text>
            </View>
            <View style={s.headerButtons}>
              <TouchableOpacity style={s.statsBtn} onPress={() => setShowStats(true)}>
                <Text style={s.statsBtnText}>📊</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Banner lọc bookmark - CỐ ĐỊNH */}
          {showBookmarksOnly && (
            <TouchableOpacity
              style={s.bookmarkBanner}
              onPress={() => setShowBookmarksOnly(false)}
              activeOpacity={0.8}
            >
              <Text style={s.bookmarkBannerText}>
                ⭐ Đang xem {filteredVocabList.length} từ đã ghim · Nhấn để xem tất cả
              </Text>
            </TouchableOpacity>
          )}
          
          {/* Mode Switch - CỐ ĐỊNH, KHÔNG CUỘN */}
          <View style={s.modeSwitch}>
            <TouchableOpacity
              style={s.modeBtn}
              onPress={() => {
                setGameMode("vocab");
                openVocabMode();
              }}
            >
              <Text style={[s.modeBtnText, gameMode === "vocab" && s.modeBtnTextActive]}>
                📇 Flashcard
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[s.modeBtn, gameMode === "quiz" && s.modeActive]}
              onPress={() => {
                setGameMode("quiz");
                setShowVocabMode(false);
              }}
            >
              <Text style={[s.modeBtnText, gameMode === "quiz" && s.modeBtnTextActive]}>
                📝 Quiz
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[s.modeBtn, gameMode === "practice" && s.modeActive]}
              onPress={() => {
                setGameMode("practice");
                setShowVocabMode(false);
              }}
            >
              <Text style={[s.modeBtnText, gameMode === "practice" && s.modeBtnTextActive]}>
                ✍️ Luyện viết
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* ScrollView - CHỈ CUỘN DANH SÁCH TỪ VỰNG */}
          <ScrollView
            contentContainerStyle={s.scrollContent}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
            style={{ flex: 1 }}
          >
            {/* Danh sách từ vựng */}
            {isLoading ? (
              <View style={s.loadingContainer}>
                <Text style={s.loadingText}>Đang tải từ vựng...</Text>
              </View>
            ) : filteredVocabList.length === 0 ? (
              <View style={s.empty}>
                <Text style={s.emptyText}>Không có từ vựng nào.</Text>
              </View>
            ) : (
              filteredVocabList.map((vocab, index) => (
                <TouchableOpacity
                    key={vocab.id}
                    style={s.vocabRow}
                    activeOpacity={0.7}
                    onPress={() => {
                      // Chuyển sang trang chi tiết từ vựng
                      router.push({ 
                        pathname: '/vocab-detail',
                        params: {
                          id: vocab.id,
                          kanji: vocab.kanji,
                          hiragana: vocab.hiragana,
                          han: vocab.han,
                          nghia: vocab.nghia,
                          example: vocab.example || '',
                          exampleMeaning: vocab.exampleMeaning || '',
                          level: vocab.level || 'N3',
                        }
                      });
                    }}
                  >
                  {/* Cột số thứ tự + Kanji */}
                  <View style={s.vocabCol}>
                    <Text style={s.indexNum}>{index + 1}.</Text>
                    <Text style={s.vocabKanji}>{vocab.kanji}</Text>
                  </View>
                  
                  {/* Cột thông tin */}
                  <View style={s.vocabInfoCol}>
                    <Text style={s.vocabReading} numberOfLines={1}>{vocab.hiragana}</Text>
                    <Text style={s.vocabHan} numberOfLines={1}>{vocab.han}</Text>
                    <Text style={s.vocabMeaning} numberOfLines={2}>{vocab.nghia}</Text>
                  </View>
                  
                  {/* Nút phát âm */}
                  <TouchableOpacity
                    style={s.speakBtn}
                    onPress={() => speak(vocab.kanji)}
                    hitSlop={8}
                  >
                    <Text style={s.speakIcon}>🔊</Text>
                  </TouchableOpacity>
                  
                  {/* Nút ghim */}
                  <TouchableOpacity
                    style={s.starBtn}
                    onPress={() => toggleBookmark(vocab.id)}
                    hitSlop={8}
                  >
                    <Text style={s.starIcon}>
                      {bookmarks.has(vocab.id) ? "⭐" : "☆"}
                    </Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))
            )}
            
            <FeedbackSection pageKey={`vocab::${level}_${bookId}_${lessonParam}`} />
            <View style={{ height: 40 }} />
          </ScrollView>
          
          {/* Menu Modal */}
          <Modal visible={menuOpen} transparent animationType="slide" onRequestClose={() => setMenuOpen(false)}>
            <View style={s.menuModalOverlay}>
              <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuOpen(false)} />
              <View style={s.menuSheet}>
                <View style={s.menuSheetHandle} />
                <View style={s.menuSheetHeader}>
                  <Text style={s.menuSheetTitle}>Cài đặt thẻ</Text>
                  <TouchableOpacity onPress={() => setMenuOpen(false)} hitSlop={10}>
                    <Text style={s.menuSheetClose}>Đóng</Text>
                  </TouchableOpacity>
                </View>

                {/* Tự động cuộn */}
                <Text style={s.menuGroupLabel}>Tự động cuộn</Text>
                <ToggleRow
                  label="Bật tự động cuộn"
                  value={autoScroll}
                  onToggle={() => setAutoScroll(!autoScroll)}
                  isLast
                />
                
                {autoScroll && (
                  <>
                    <Text style={s.autoScrollHint}>Thời gian giữa mỗi thẻ</Text>
                    <View style={s.autoScrollChips}>
                      {AUTO_SCROLL_PRESETS.map((sec) => (
                        <TouchableOpacity
                          key={sec}
                          style={[
                            s.autoScrollChip,
                            sec === autoScrollSec && s.autoScrollChipActive,
                          ]}
                          onPress={() => setAutoScrollSec(sec)}
                        >
                          <Text style={[
                            s.autoScrollChipText,
                            sec === autoScrollSec && s.autoScrollChipTextActive
                          ]}>
                            {sec}s
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}

                {/* Mặt trước */}
                <Text style={[s.menuGroupLabel, { marginTop: 16 }]}>Mặt trước</Text>
                {ALL_FIELDS.map((f, i) => (
                  <ToggleRow
                    key={`front-${f}`}
                    label={FIELD_LABELS[f]}
                    value={frontSel[f]}
                    onToggle={() => toggleField("front", f)}
                    isLast={i === ALL_FIELDS.length - 1}
                  />
                ))}
                
                {/* Mặt sau */}
                <Text style={[s.menuGroupLabel, { marginTop: 14 }]}>Mặt sau</Text>
                {ALL_FIELDS.map((f, i) => (
                  <ToggleRow
                    key={`back-${f}`}
                    label={FIELD_LABELS[f]}
                    value={backSel[f]}
                    onToggle={() => toggleField("back", f)}
                    isLast={i === ALL_FIELDS.length - 1}
                  />
                ))}
              </View>
            </View>
          </Modal>

          {/* Statistics Modal */}
          <StatisticsModal
            visible={showStats}
            onClose={() => setShowStats(false)}
            totalCount={vocabList.length}
            bookmarkCount={bookmarks.size}
            onShowBookmarks={() => {
              setShowBookmarksOnly(true);
              setShowStats(false);
            }}
          />
          
          <BottomTabBar />
        </View>
      </TouchableWithoutFeedback>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f4f8" },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 60 },
  
  // Header
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: "#f0f4f8",
  },
  backBtn: {
    width: 42, height: 42, backgroundColor: "#fff", borderRadius: 12,
    borderWidth: 1.5, borderColor: "#e2e8f0",
    alignItems: "center", justifyContent: "center", marginRight: 10,
  },
  backBtnText: { fontSize: 28, color: TEAL, lineHeight: 30 },
  titleBlock: { flex: 1, marginRight: 10 },
  title: { fontSize: 16, fontWeight: "700", color: "#2d3748", marginBottom: 3 },
  subtitle: { fontSize: 13, color: "#718096" },
  headerButtons: { flexDirection: "row", gap: 8, alignItems: "center" },
  statsBtn: {
    width: 42, height: 42, backgroundColor: "#fff", borderRadius: 12,
    borderWidth: 1.5, borderColor: "#e2e8f0",
    alignItems: "center", justifyContent: "center",
  },
  statsBtnText: { fontSize: 20 },
  
  // Menu Modal
  menuModalOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" },
  menuSheet: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 18, paddingTop: 8, paddingBottom: 28 },
  menuSheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#cbd5e1", alignSelf: "center", marginBottom: 10 },
  menuSheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  menuSheetTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  menuSheetClose: { fontSize: 14, fontWeight: "600", color: TEAL },
  menuGroupLabel: { fontSize: 11, fontWeight: "700", color: "#69475c", textTransform: "uppercase", marginBottom: 6 },
  menuRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  menuRowLabel: { fontSize: 14, fontWeight: "500", color: "#1e293b" },
  autoScrollHint: { fontSize: 12, color: "#64748b", marginTop: 10, marginBottom: 6 },
  autoScrollChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 6 },
  autoScrollChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5, borderColor: "#e2e8f0", backgroundColor: "#f8fafc" },
  autoScrollChipActive: { backgroundColor: TEAL, borderColor: TEAL },
  autoScrollChipDisabled: { opacity: 0.45 },
  autoScrollChipText: { fontSize: 13, fontWeight: "700", color: "#1e293b" },
  autoScrollChipTextActive: { color: "#fff" },
  
  // Mode Switch
  modeSwitch: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#fff",        
    borderBottomWidth: 1,           
    borderBottomColor: "#f0e2ed",   
    marginBottom: 16,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 9,
    backgroundColor: "#e2e8f0",
    borderRadius: 10,
    alignItems: "center",
  },
  modeActive: {
    backgroundColor: TEAL_DARK,
  },
  modeBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  modeBtnTextActive: {
    color: "#475569",
  },
  
  // Banner bookmark
  bookmarkBanner: {
    marginHorizontal: 14,
    marginBottom: 6,
    paddingVertical: 9,
    paddingHorizontal: 14,
    backgroundColor: "#fefce8",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#fde047",
  },
  bookmarkBannerText: { color: "#854d0e", fontSize: 13, fontWeight: "600" },
  
  // Vocab list styles
  vocabRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    alignItems: "center",
  },
  vocabCol: {
    width: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  indexNum: {
    fontSize: 14,
    color: TEXT_COLOR,
    marginBottom: 2,
  },
  vocabKanji: {
    fontSize: 28,
    fontWeight: "700",
    color: TEAL_DARK,
    lineHeight: 40,
  },
  vocabInfoCol: {
    flex: 1,
    justifyContent: "center",
    paddingLeft: 6,
  },
  vocabReading: {
    fontSize: 14,
    color: TEAL_DARK,
    fontWeight: "500",
    marginBottom: 2,
  },
  vocabHan: {
    fontSize: 13,
    color: TEAL,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  vocabMeaning: {
    fontSize: 13,
    color: "#475569",
  },
  speakBtn: {
    padding: 6,
    marginRight: 2,
  },
  speakIcon: {
    fontSize: 18,
    color: TEAL,
  },
  starBtn: {
    padding: 6,
    marginLeft: 2,
  },
  starIcon: {
    fontSize: 20,
  },
  
  buttonTextWhite: { color: "#fff", fontSize: 13, fontWeight: "600" },
  buttonTextDark: { fontSize: 14, fontWeight: "600", color: "#1a202c" },
  
  // Progress bar
  progressBarWrapper: { marginVertical: 12 },
  progressBarTrack: { height: 6, backgroundColor: "#e2e8f0", borderRadius: 3, overflow: "hidden" },
  progressBarFill: { height: "100%", backgroundColor: TEAL, borderRadius: 3 },
  
  // Quiz styles
  quizContainer: { flex: 1, padding: 20, paddingTop: 56, paddingBottom: 80, backgroundColor: "#f0f8f0" },
  quizHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  quizCounter: { fontSize: 16, fontWeight: "600", color: "#4a5568" },
  quizScore: { fontSize: 16, fontWeight: "700", color: TEAL },
  questionCard: { backgroundColor: "#fff", borderRadius: 20, padding: 32, alignItems: "center", marginBottom: 24, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 },
  questionText: { fontSize: 36, fontWeight: "800", color: "#1a202c" },
  questionSub: { fontSize: 18, color: "#718096", marginTop: 8 },
  questionHint: { fontSize: 14, color: "#a0aec0", marginTop: 12 },
  optionsGrid: { gap: 12, marginBottom: 20 },
  optionBtn: { backgroundColor: "#fff", padding: 16, borderRadius: 12, borderWidth: 2, borderColor: "#e2e8f0", alignItems: "center" },
  correctOption: { backgroundColor: TEAL_DARK, borderColor: "#290763", padding: 16, borderRadius: 12, borderWidth: 2, alignItems: "center" },
  wrongOption: { backgroundColor: "#f56565", borderColor: "#e53e3e", padding: 16, borderRadius: 12, borderWidth: 2, alignItems: "center" },
  optionText: { fontSize: 16, fontWeight: "500", color: "#2d3748" },
  explainBtn: { alignItems: "center", padding: 12 },
  explainText: { fontSize: 14, color: TEAL },
  explanationBox: { backgroundColor: "#ebf8ff", padding: 16, borderRadius: 12, marginTop: 12 },
  explanationTitle: { fontWeight: "700", color: TEAL, marginBottom: 8 },
  explanationContent: { fontSize: 14, color: "#2d3748" },
  resultCard: { backgroundColor: "#fff", borderRadius: 24, padding: 32, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 16, elevation: 6 },
  resultTitle: { fontSize: 24, fontWeight: "700", marginBottom: 16 },
  resultScore: { fontSize: 48, fontWeight: "800", color: TEAL, marginBottom: 8 },
  resultPercentage: { fontSize: 20, color: "#4a5568", marginBottom: 16 },
  resultMessage: { fontSize: 18, marginBottom: 24 },
  quizExitBtn: { backgroundColor: TEAL, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12 },
  
  // Practice styles
  practiceContainer: { flex: 1, padding: 20, paddingTop: 56, paddingBottom: 80, backgroundColor: "#f0f4f8" },
  practiceHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  practiceCounter: { fontSize: 16, fontWeight: "600", color: "#4a5568" },
  practiceScore: { fontSize: 16, fontWeight: "700", color: TEAL },
  practiceInput: { backgroundColor: "#fff", borderWidth: 2, borderColor: "#e2e8f0", borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 20 },
  checkBtn: { backgroundColor: TEAL, paddingVertical: 14, borderRadius: 12, alignItems: "center", marginBottom: 12 },
  practiceExitBtn: { backgroundColor: "#e2e8f0", paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  feedbackBox: { padding: 12, borderRadius: 10, marginBottom: 16, alignItems: "center" },
  feedbackCorrect: { backgroundColor: "#c6f6d5" },
  feedbackWrong: { backgroundColor: "#fed7d7" },
  feedbackText: { fontSize: 14, fontWeight: "500" },
  
  // Statistics Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  statsModal: { backgroundColor: "#fff", borderRadius: 24, padding: 24, width: "85%", alignItems: "center" },
  statsTitle: { fontSize: 22, fontWeight: "700", marginBottom: 20, color: "#2d3748" },
  statCard: { alignItems: "center", marginBottom: 16, padding: 16, backgroundColor: "#ebf8ff", borderRadius: 16, width: "100%" },
  statValue: { fontSize: 40, fontWeight: "800", color: TEAL },
  statLabel: { fontSize: 14, color: "#4a5568", marginTop: 4 },
  statCardTappable: { borderWidth: 1.5, borderColor: "#ed3aa2" },
  statLabelHint: { color: "#ed3a9f", fontStyle: "italic" },
  statsDivider: { height: 1, backgroundColor: "#e2e8f0", width: "100%", marginVertical: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12, alignSelf: "flex-start" },
  statRow: { flexDirection: "row", justifyContent: "space-between", width: "100%", marginBottom: 10 },
  statRowLabel: { fontSize: 14, color: "#4a5568" },
  statRowValue: { fontSize: 14, fontWeight: "700", color: TEAL },
  closeStatsBtn: { backgroundColor: TEAL, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10, marginTop: 20 },
  
  loadingContainer: { padding: 40, alignItems: "center" },
  loadingText: { textAlign: "center", fontSize: 18, color: "#4a5568", marginTop: 40 },
  empty: { padding: 30, alignItems: "center" },
  emptyText: { color: TEAL_DARK, fontSize: 16, fontWeight: "600" },
});