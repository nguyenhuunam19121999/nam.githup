// app/vocab.tsx
// ─────────────────────────────────────────────────────────────────────────────

import AsyncStorage from "@react-native-async-storage/async-storage";
import { BottomTabBar } from "../components/BottomTabBar";
import { AdBanner } from "../components/AdBanner";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Speech from "expo-speech";
import React, { useEffect, useMemo, useState } from "react";
import { getBookInfo } from "../assets/data_nghanh_hoc";
import {
  getVocab,
  getVocabByBook,
  getIndustryVocabByBook,
  type RawVocab,
} from "../assets/vocab";
import { FeedbackSection } from "../components/FeedbackSection";
import { useAuth } from "../artifacts/mirai-jp/hooks/useAuth";
import { useColors, useThemeMode, ThemeFadeOverlay } from "../artifacts/mirai-jp/hooks/useColors";
import FlashcardDetail, {
  VocabItem,
  Field,
  ALL_FIELDS,
  FIELD_LABELS,
} from "../components/FlashcardDetail";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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

// ─── Dữ liệu từ vựng ─────────────────────────────────────────────────────────
interface Vocab {
  id: string;
  kanji: string;
  hiragana: string;
  han: string;
  nghia: string;
  jisho_meaning_en?: string;
  example?: string;
  exampleMeaning?: string;
  category?: string;
  lesson?: number;
  level?: string;
  wordType?: string;
  typeLabel?: string;
  isNaAdjective?: boolean;
  isExtractedVerb?: boolean;
  extractedVerb?: string | null;
  isConjugatedForm?: boolean;
  conjugatedForm?: string | null;
}

function normalizeVocab(
  raw: RawVocab[],
  lessonNumber?: number,
  sourceLevel?: string,
): Vocab[] {
  let filtered = raw;
  if (lessonNumber !== undefined) {
    filtered = raw.filter((item: any) => (item.lesson || 1) === lessonNumber);
  }
  return filtered.map((item, idx) => ({
    id: `${lessonNumber || 1}_${idx}_${item.kanji || "noKanji"}`,
    kanji: item.kanji ?? "",
    hiragana: item.hiragana ?? item.hira ?? "",
    han: item.han ?? "",
    nghia: item.nghia ?? "",
    jisho_meaning_en: (item as any).jisho_meaning_en ?? "",
    example: item.example,
    exampleMeaning: item.exampleMeaning,
    category: item.category,
    lesson: item.lesson || 1,
    level: sourceLevel || "N3",
    wordType: item.wordType,
    typeLabel: item.typeLabel,
    isNaAdjective: item.isNaAdjective,
    isExtractedVerb: item.isExtractedVerb,
    extractedVerb: item.extractedVerb,
    isConjugatedForm: item.isConjugatedForm,
    conjugatedForm: item.conjugatedForm,
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
  c,
}: {
  label: string;
  value: boolean;
  onToggle: () => void;
  isLast: boolean;
  c: ReturnType<typeof useColors>;
}) {
  return (
    <TouchableOpacity
      style={[s.menuRow, { borderBottomColor: c.border }, isLast && { borderBottomWidth: 0 }]}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <Text style={[s.menuRowLabel, { color: c.text }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: c.border, true: c.primary }}
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
  const c = useColors(); // bảng màu hiện tại — tự đổi theo giờ / lựa chọn người dùng
  const { themeMode, timeOfDay } = useThemeMode();
  const isDark = themeMode === "dark" || (themeMode === "auto" && timeOfDay === "night");

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
      await AsyncStorage.setItem(
        scopedKey("quizStats"),
        JSON.stringify(newStats),
      );
    } catch (e) {}
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
      <View style={[s.quizContainer, { backgroundColor: c.background }]}>
        <Text style={[s.loadingText, { color: c.mutedForeground }]}>Đang tạo câu hỏi...</Text>
      </View>
    );
  }

  if (showResult) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <View style={[s.quizContainer, { backgroundColor: c.background }]}>
        <View style={[s.resultCard, { backgroundColor: c.card }]}>
          <Text style={[s.resultTitle, { color: c.text }]}>📊 Kết quả của bạn</Text>
          <Text style={[s.resultScore, { color: c.primary }]}>
            {score} / {questions.length}
          </Text>
          <Text style={[s.resultPercentage, { color: c.mutedForeground }]}>{percentage}%</Text>
          <Text style={[s.resultMessage, { color: c.text }]}>
            {percentage >= 80
              ? "🎉 Xuất sắc! 🎉"
              : percentage >= 60
                ? "👍 Khá tốt!"
                : "💪 Cố gắng hơn nữa nhé!"}
          </Text>
          <TouchableOpacity style={[s.quizExitBtn, { backgroundColor: c.primary }]} onPress={onExit}>
            <Text style={[s.buttonTextWhite, { color: c.primaryForeground }]}>Quay lại học</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const current = questions[currentQ];

  return (
    <>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={c.background} />
      <View style={[s.quizContainer, { backgroundColor: c.background }]}>
        <View style={s.quizHeader}>
          <Text style={[s.quizCounter, { color: c.mutedForeground }]}>
            Câu {currentQ + 1}/{questions.length}
          </Text>
          <Text style={[s.quizScore, { color: c.primary }]}>Điểm: {score}</Text>
        </View>

        <View style={[s.questionCard, { backgroundColor: c.card }]}>
          <Text style={[s.questionText, { color: c.text }]}>{current.question}</Text>
          <Text style={[s.questionHint, { color: c.mutedForeground }]}>Chọn nghĩa đúng</Text>
        </View>

        <View style={s.optionsGrid}>
          {current.options.map((opt, idx) => {
            const isChosen = selectedAnswer === opt;
            const isCorrect = opt === current.correct;
            // Xanh lá "đúng" và đỏ "sai" giữ màu ngữ nghĩa cố định — không đổi
            // theo theme để luôn dễ nhận biết đúng/sai bất kể chế độ nào.
            let dynamicStyle: any = { backgroundColor: c.card, borderColor: c.border };
            if (isChosen) {
              dynamicStyle = isCorrect
                ? { backgroundColor: "#10b981", borderColor: "#059669" }
                : { backgroundColor: "#f56565", borderColor: "#e53e3e" };
            }
            return (
              <TouchableOpacity
                key={idx}
                style={[s.optionBtn, dynamicStyle]}
                onPress={() => handleAnswer(opt)}
                disabled={!!selectedAnswer}
              >
                <Text style={[s.optionText, { color: isChosen ? "#fff" : c.text }]}>{opt}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {selectedAnswer && !showExplanation && (
          <TouchableOpacity
            style={s.explainBtn}
            onPress={() => setShowExplanation(true)}
          >
            <Text style={[s.explainText, { color: c.primary }]}>📖 Xem giải thích</Text>
          </TouchableOpacity>
        )}

        {showExplanation && (
          <View style={[s.explanationBox, { backgroundColor: c.primary + "1a" }]}>
            <Text style={[s.explanationTitle, { color: c.primary }]}>💡 Giải thích:</Text>
            <Text style={[s.explanationContent, { color: c.text }]}>
              {current.question} có nghĩa là &quot;{current.correct}&quot;
            </Text>
          </View>
        )}

        {/* Nút thoát quiz — cố định, bấm lúc nào cũng được, giống Luyện viết */}
        <TouchableOpacity
          style={[s.practiceExitBtn, { backgroundColor: c.muted, marginTop: 16 }]}
          onPress={onExit}
        >
          <Text style={[s.buttonTextDark, { color: c.text }]}>Quay lại</Text>
        </TouchableOpacity>
      </View>
      <AdBanner />
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
  const c = useColors(); // bảng màu hiện tại — tự đổi theo giờ / lựa chọn người dùng
  const { themeMode, timeOfDay } = useThemeMode();
  const isDark = themeMode === "dark" || (themeMode === "auto" && timeOfDay === "night");

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
      <View style={[s.practiceContainer, { backgroundColor: c.background }]}>
        <Text style={[s.loadingText, { color: c.mutedForeground }]}>Không có từ vựng để luyện</Text>
        <TouchableOpacity style={[s.practiceExitBtn, { backgroundColor: c.muted }]} onPress={onExit}>
          <Text style={[s.buttonTextDark, { color: c.text }]}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={c.background} />
      <View style={[s.practiceContainer, { backgroundColor: c.background }]}>
        <View style={s.practiceHeader}>
          <Text style={[s.practiceCounter, { color: c.mutedForeground }]}>
            {currentIndex + 1}/{total}
          </Text>
          <Text style={[s.practiceScore, { color: c.primary }]}>✅ {score}</Text>
        </View>

        <View style={s.progressBarWrapper}>
          <View style={[s.progressBarTrack, { backgroundColor: c.border }]}>
            <View style={[s.progressBarFill, { width: `${progress}%`, backgroundColor: c.primary }]} />
          </View>
        </View>

        <View style={[s.questionCard, { backgroundColor: c.card }]}>
          <Text style={[s.questionText, { color: c.text }]}>{currentVocab.kanji}</Text>
          <Text style={[s.questionSub, { color: c.mutedForeground }]}>{currentVocab.hiragana}</Text>
        </View>

        <TextInput
          style={[s.practiceInput, { backgroundColor: c.card, borderColor: c.border, color: c.text }]}
          placeholder="Nhập nghĩa tiếng Việt..."
          placeholderTextColor={c.mutedForeground}
          value={userAnswer}
          onChangeText={setUserAnswer}
          onSubmitEditing={checkAnswer}
        />

        {feedback.type && (
          <View
            style={[
              s.feedbackBox,
              // Giữ màu ngữ nghĩa cố định (xanh đúng / đỏ sai)
              feedback.type === "correct"
                ? { backgroundColor: "#c6f6d5" }
                : { backgroundColor: "#fed7d7" },
            ]}
          >
            <Text style={[s.feedbackText, { color: "#1a202c" }]}>{feedback.message}</Text>
          </View>
        )}

        <TouchableOpacity style={[s.checkBtn, { backgroundColor: c.primary }]} onPress={checkAnswer}>
          <Text style={[s.buttonTextWhite, { color: c.primaryForeground }]}>Kiểm tra</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[s.practiceExitBtn, { backgroundColor: c.muted }]} onPress={onExit}>
          <Text style={[s.buttonTextDark, { color: c.text }]}>Quay lại</Text>
        </TouchableOpacity>
      </View>
      <AdBanner />
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
  const c = useColors(); // bảng màu hiện tại — tự đổi theo giờ / lựa chọn người dùng
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
        else
          setStats({ bestScore: 0, totalPlayed: 0, avgScore: 0, lastScore: 0 });
      } catch (e) {}
    };
    if (visible) loadStats();
  }, [visible, scopedKey]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={[s.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
        <View style={[s.statsModal, { backgroundColor: c.card }]}>
          <Text style={[s.statsTitle, { color: c.text }]}>📈 Thống kê học tập</Text>

          <View style={[s.statCard, { backgroundColor: c.primary + "14" }]}>
            <Text style={[s.statValue, { color: c.primary }]}>{totalCount}</Text>
            <Text style={[s.statLabel, { color: c.mutedForeground }]}>Tổng số từ vựng</Text>
          </View>

          <TouchableOpacity
            style={[
              s.statCard,
              s.statCardTappable,
              { backgroundColor: c.accent + "14", borderColor: c.accent },
            ]}
            activeOpacity={0.75}
            onPress={() => {
              onClose();
              onShowBookmarks();
            }}
          >
            <Text style={[s.statValue, { color: c.primary }]}>⭐ {bookmarkCount}</Text>
            <Text style={[s.statLabel, s.statLabelHint, { color: c.accent }]}>
              Từ đã ghim · Nhấn để xem
            </Text>
          </TouchableOpacity>

          <View style={[s.statsDivider, { backgroundColor: c.border }]} />

          <Text style={[s.sectionTitle, { color: c.text }]}>🎯 Kết quả Quiz</Text>
          <View style={s.statRow}>
            <Text style={[s.statRowLabel, { color: c.mutedForeground }]}>Điểm cao nhất:</Text>
            <Text style={[s.statRowValue, { color: c.primary }]}>{stats.bestScore}%</Text>
          </View>
          <View style={s.statRow}>
            <Text style={[s.statRowLabel, { color: c.mutedForeground }]}>Trung bình:</Text>
            <Text style={[s.statRowValue, { color: c.primary }]}>{stats.avgScore}%</Text>
          </View>
          <View style={s.statRow}>
            <Text style={[s.statRowLabel, { color: c.mutedForeground }]}>Đã chơi:</Text>
            <Text style={[s.statRowValue, { color: c.primary }]}>{stats.totalPlayed} lần</Text>
          </View>

          <TouchableOpacity style={[s.closeStatsBtn, { backgroundColor: c.primary }]} onPress={onClose}>
            <Text style={[s.buttonTextWhite, { color: c.primaryForeground }]}>Đóng</Text>
          </TouchableOpacity>
        </View>
        <ThemeFadeOverlay />
      </View>
    </Modal>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function VocabScreen() {
  const c = useColors(); // bảng màu hiện tại — tự đổi theo giờ / lựa chọn người dùng
  const { themeMode, timeOfDay } = useThemeMode();
  const isDark = themeMode === "dark" || (themeMode === "auto" && timeOfDay === "night");

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
  const bookId =
    typeof params.bookId === "string" ? params.bookId : "mimikara-n3";
  const level = (() => {
    if (params.level) return params.level;
    if (bookId.includes("n1")) return "N1";
    if (bookId.includes("n2")) return "N2";
    if (bookId.includes("n3")) return "N3";
    if (bookId.includes("n4")) return "N4";
    if (bookId.includes("n5")) return "N5";
    return "N3";
  })();
  const lessonParam =
    typeof params.lesson === "string" ? parseInt(params.lesson, 10) : 1;

  // Dữ liệu từ vựng
  const [vocabList, setVocabList] = useState<Vocab[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // UI states
  const [showVocabMode, setShowVocabMode] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [gameMode, setGameMode] = useState<"vocab" | "quiz" | "practice">(
    "vocab",
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [autoScroll, setAutoScroll] = useState(false);
  const [autoScrollSec, setAutoScrollSec] = useState(2);
  const AUTO_SCROLL_PRESETS = [2, 3, 5, 8, 10, 15] as const;

  // Cấu hình mặt trước/sau
  const [frontFields, setFrontFields] = useState<Field[]>([
    "kanji",
    "hiragana",
  ]);
  const [backFields, setBackFields] = useState<Field[]>([
    "nghia",
    "han",
    "example",
  ]);

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

  // Tải từ vựng + nghành học
  useEffect(() => {
    setIsLoading(true);
    try {
      const hasBookId =
        typeof params.bookId === "string" && params.bookId.length > 0;
      const isIndustry = hasBookId && bookId.startsWith("industry-");

      const rawVocab: RawVocab[] = isIndustry
        ? getIndustryVocabByBook(bookId)
        : hasBookId
          ? getVocabByBook(bookId)
          : getVocab(level, bookId);

      const formatted = normalizeVocab(
        rawVocab,
        isIndustry ? undefined : hasBookId ? lessonParam : undefined,
        level,
      );
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
      } catch (e) {}
    };
    loadBookmarks();
  }, [scopedKey]);

  // Load auto-scroll setting
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(scopedKey("autoScroll"));
        if (!raw) return;
        const parsed = JSON.parse(raw) as {
          enabled?: boolean;
          seconds?: number;
        };
        if (typeof parsed.enabled === "boolean") setAutoScroll(parsed.enabled);
        if (
          typeof parsed.seconds === "number" &&
          AUTO_SCROLL_PRESETS.includes(parsed.seconds as any)
        ) {
          setAutoScrollSec(parsed.seconds);
        }
      } catch {
        /* ignore */
      }
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
      } catch {
        /* ignore */
      }
    })();
  }, [scopedKey]);

  // Save field settings
  useEffect(() => {
    AsyncStorage.setItem(
      scopedKey("vocabFields"),
      JSON.stringify({ frontSel, backSel }),
    ).catch(() => {});
  }, [frontSel, backSel, scopedKey]);

  // Update fields array when selection changes
  useEffect(() => {
    setFrontFields(ALL_FIELDS.filter((f: Field) => frontSel[f]));
    setBackFields(ALL_FIELDS.filter((f: Field) => backSel[f]));
  }, [frontSel, backSel]);

  const saveBookmarks = async (newBookmarks: Set<string>) => {
    try {
      await AsyncStorage.setItem(
        scopedKey("bookmarks"),
        JSON.stringify([...newBookmarks]),
      );
    } catch (e) {}
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
            await AsyncStorage.setItem(
              scopedKey("reviewedWords"),
              JSON.stringify([...existing, vocabId]),
            );
          }
        } catch (e) {
          /* ignore */
        }
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
    return showBookmarksOnly
      ? vocabList.filter((v) => bookmarks.has(v.id))
      : vocabList;
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
    return filteredVocabList.map((v) => ({
      id: v.id,
      kanji: v.kanji,
      hiragana: v.hiragana,
      han: v.han,
      nghia: v.nghia,
      example: v.example,
      exampleMeaning: v.exampleMeaning,
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
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={c.background} />
      <TouchableWithoutFeedback
        onPress={() => {
          if (menuOpen) setMenuOpen(false);
          Keyboard.dismiss();
        }}
      >
        <View style={[s.container, { backgroundColor: c.background }]}>
          {/* Header - CỐ ĐỊNH */}
          <View style={[s.headerRow, { backgroundColor: c.background }]}>
            <TouchableOpacity
              style={[s.backBtn, { backgroundColor: c.card, borderColor: c.border }]}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Text style={[s.backBtnText, { color: c.primary }]}>‹</Text>
            </TouchableOpacity>
            <View style={s.titleBlock}>
              <Text style={[s.title, { color: c.text }]} numberOfLines={1}>
                {headerInfo.emoji} {headerInfo.vi}
              </Text>
              <Text style={[s.subtitle, { color: c.mutedForeground }]}>{filteredVocabList.length} từ vựng</Text>
            </View>
            <View style={s.headerButtons}>
              <TouchableOpacity
                style={[s.statsBtn, { backgroundColor: c.card, borderColor: c.border }]}
                onPress={() => setShowStats(true)}
              >
                <Text style={s.statsBtnText}>📊</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Banner lọc bookmark - CỐ ĐỊNH */}
          {showBookmarksOnly && (
            <TouchableOpacity
              style={[s.bookmarkBanner, { backgroundColor: c.accent + "1a", borderColor: c.accent }]}
              onPress={() => setShowBookmarksOnly(false)}
              activeOpacity={0.8}
            >
              <Text style={[s.bookmarkBannerText, { color: c.text }]}>
                ⭐ Đang xem {filteredVocabList.length} từ đã ghim · Nhấn để xem
                tất cả
              </Text>
            </TouchableOpacity>
          )}

          {/* Mode Switch - CỐ ĐỊNH, KHÔNG CUỘN */}
          <View style={[s.modeSwitch, { backgroundColor: c.card, borderBottomColor: c.border }]}>
            <TouchableOpacity
              style={[s.modeBtn, { backgroundColor: c.muted }]}
              onPress={() => {
                setGameMode("vocab");
                openVocabMode();
              }}
            >
              <Text
                style={[
                  s.modeBtnText,
                  { color: c.mutedForeground },
                  gameMode === "vocab" && { color: c.primary, fontWeight: "700" },
                ]}
              >
                📇 Flashcard
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.modeBtn, { backgroundColor: c.muted }, gameMode === "quiz" && { backgroundColor: c.primary }]}
              onPress={() => {
                setGameMode("quiz");
                setShowVocabMode(false);
              }}
            >
              <Text
                style={[
                  s.modeBtnText,
                  { color: c.mutedForeground },
                  gameMode === "quiz" && { color: c.primaryForeground, fontWeight: "700" },
                ]}
              >
                📝 Quiz
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.modeBtn, { backgroundColor: c.muted }, gameMode === "practice" && { backgroundColor: c.primary }]}
              onPress={() => {
                setGameMode("practice");
                setShowVocabMode(false);
              }}
            >
              <Text
                style={[
                  s.modeBtnText,
                  { color: c.mutedForeground },
                  gameMode === "practice" && { color: c.primaryForeground, fontWeight: "700" },
                ]}
              >
                ✍️ Luyện viết
              </Text>
            </TouchableOpacity>
          </View>

          {/* Danh sách từ vựng */}
          {isLoading ? (
            <View style={s.loadingContainer}>
              <Text style={[s.loadingText, { color: c.mutedForeground }]}>Đang tải từ vựng...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredVocabList}
              keyExtractor={(vocab) => vocab.id}
              contentContainerStyle={s.scrollContent}
              showsVerticalScrollIndicator={true}
              ListEmptyComponent={
                <View style={s.empty}>
                  <Text style={[s.emptyText, { color: c.text }]}>Không có từ vựng nào.</Text>
                </View>
              }
              renderItem={({ item: vocab, index }) => (
                <TouchableOpacity
                  style={[s.vocabRow, { backgroundColor: c.card }]}
                  activeOpacity={0.7}
                  onPress={() => {
                    router.push({
                      pathname: "/vocab-detail",
                      params: {
                        id: vocab.id,
                        kanji: vocab.kanji,
                        hiragana: vocab.hiragana,
                        han: vocab.han,
                        nghia: vocab.nghia,
                        jisho_meaning_en: vocab.jisho_meaning_en || "",
                        example: vocab.example || "",
                        exampleMeaning: vocab.exampleMeaning || "",
                        level: vocab.level || "N3",
                        wordType: vocab.wordType || "",
                        typeLabel: vocab.typeLabel || "",
                        isNaAdjective: String(!!vocab.isNaAdjective),
                        isExtractedVerb: String(!!vocab.isExtractedVerb),
                        extractedVerb: vocab.extractedVerb || "",
                        isConjugatedForm: String(!!vocab.isConjugatedForm),
                        conjugatedForm: vocab.conjugatedForm || "",
                      },
                    });
                  }}
                >
                  <View style={s.rowMain}>
                    <View style={s.rowTopLine}>
                      <Text style={[s.indexNum, { color: c.mutedForeground }]}>{index + 1}.</Text>
                      <Text style={[s.vocabKanji, { color: c.text }]}>{vocab.kanji}</Text>
                    </View>
                    <Text style={[s.vocabHan, { color: c.primary }]}>{vocab.han}</Text>
                    <Text style={[s.vocabReading, { color: c.text }]}>{vocab.hiragana}</Text>
                    <Text style={[s.vocabMeaning, { color: c.mutedForeground }]} numberOfLines={2}>
                      {vocab.nghia}
                    </Text>
                  </View>
                  <View style={s.rowActions}>
                    <TouchableOpacity
                      style={s.speakBtn}
                      onPress={() => speak(vocab.kanji)}
                      hitSlop={8}
                    >
                      <Text style={[s.speakIcon, { color: c.primary }]}>🔊</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={s.starBtn}
                      onPress={() => toggleBookmark(vocab.id)}
                      hitSlop={8}
                    >
                      <Text style={s.starIcon}>
                        {bookmarks.has(vocab.id) ? "⭐" : "☆"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              )}
              ListFooterComponent={
                <>
                  <FeedbackSection
                    pageKey={`vocab::${level}_${bookId}_${lessonParam}`}
                  />
                  <View style={{ height: 40 }} />
                </>
              }
              initialNumToRender={20}
              maxToRenderPerBatch={20}
              windowSize={7}
              removeClippedSubviews={true}
              updateCellsBatchingPeriod={50}
            />
          )}
          {/* Menu Modal */}
          <Modal
            visible={menuOpen}
            transparent
            animationType="slide"
            onRequestClose={() => setMenuOpen(false)}
          >
            <View style={[s.menuModalOverlay, { backgroundColor: "rgba(15,23,42,0.45)" }]}>
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={() => setMenuOpen(false)}
              />
              <View style={[s.menuSheet, { backgroundColor: c.card }]}>
                <View style={[s.menuSheetHandle, { backgroundColor: c.border }]} />
                <View style={s.menuSheetHeader}>
                  <Text style={[s.menuSheetTitle, { color: c.text }]}>Cài đặt thẻ</Text>
                  <TouchableOpacity
                    onPress={() => setMenuOpen(false)}
                    hitSlop={10}
                  >
                    <Text style={[s.menuSheetClose, { color: c.primary }]}>Đóng</Text>
                  </TouchableOpacity>
                </View>

                {/* Tự động cuộn */}
                <Text style={[s.menuGroupLabel, { color: c.mutedForeground }]}>Tự động cuộn</Text>
                <ToggleRow
                  label="Bật tự động cuộn"
                  value={autoScroll}
                  onToggle={() => setAutoScroll(!autoScroll)}
                  isLast
                  c={c}
                />

                {autoScroll && (
                  <>
                    <Text style={[s.autoScrollHint, { color: c.mutedForeground }]}>Thời gian giữa mỗi thẻ</Text>
                    <View style={s.autoScrollChips}>
                      {AUTO_SCROLL_PRESETS.map((sec) => (
                        <TouchableOpacity
                          key={sec}
                          style={[
                            s.autoScrollChip,
                            { backgroundColor: c.muted, borderColor: c.border },
                            sec === autoScrollSec && { backgroundColor: c.primary, borderColor: c.primary },
                          ]}
                          onPress={() => setAutoScrollSec(sec)}
                        >
                          <Text
                            style={[
                              s.autoScrollChipText,
                              { color: c.text },
                              sec === autoScrollSec && { color: c.primaryForeground },
                            ]}
                          >
                            {sec}s
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}

                {/* Mặt trước */}
                <Text style={[s.menuGroupLabel, { color: c.mutedForeground, marginTop: 16 }]}>
                  Mặt trước
                </Text>
                {ALL_FIELDS.map((f, i) => (
                  <ToggleRow
                    key={`front-${f}`}
                    label={FIELD_LABELS[f]}
                    value={frontSel[f]}
                    onToggle={() => toggleField("front", f)}
                    isLast={i === ALL_FIELDS.length - 1}
                    c={c}
                  />
                ))}

                {/* Mặt sau */}
                <Text style={[s.menuGroupLabel, { color: c.mutedForeground, marginTop: 14 }]}>
                  Mặt sau
                </Text>
                {ALL_FIELDS.map((f, i) => (
                  <ToggleRow
                    key={`back-${f}`}
                    label={FIELD_LABELS[f]}
                    value={backSel[f]}
                    onToggle={() => toggleField("back", f)}
                    isLast={i === ALL_FIELDS.length - 1}
                    c={c}
                  />
                ))}
              </View>
              <ThemeFadeOverlay />
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
          <AdBanner />
        </View>
      </TouchableWithoutFeedback>
    </>
  );
}

// ─── Styles (chỉ layout — màu gán inline theo theme ở trên) ───────────────────
const s = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 60 },

  // Header
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  backBtnText: { fontSize: 28, lineHeight: 30 },
  titleBlock: { flex: 1, marginRight: 10 },
  title: { fontSize: 16, fontWeight: "700", marginBottom: 3 },
  subtitle: { fontSize: 13 },
  headerButtons: { flexDirection: "row", gap: 8, alignItems: "center" },
  statsBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  statsBtnText: { fontSize: 20 },

  // Menu Modal
  menuModalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  menuSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 28,
  },
  menuSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 10,
  },
  menuSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  menuSheetTitle: { fontSize: 16, fontWeight: "800" },
  menuSheetClose: { fontSize: 14, fontWeight: "600" },
  menuGroupLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  menuRowLabel: { fontSize: 14, fontWeight: "500" },
  autoScrollHint: {
    fontSize: 12,
    marginTop: 10,
    marginBottom: 6,
  },
  autoScrollChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 6,
  },
  autoScrollChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  autoScrollChipText: { fontSize: 13, fontWeight: "700" },

  // Mode Switch
  modeSwitch: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: "center",
  },
  modeBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },

  // Banner bookmark
  bookmarkBanner: {
    marginHorizontal: 14,
    marginBottom: 6,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  bookmarkBannerText: { fontSize: 13, fontWeight: "600" },

  // Vocab list styles
  vocabRow: {
    flexDirection: "row",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    alignItems: "flex-start",
  },
  indexNum: {
    fontSize: 14,
    marginBottom: 2,
    marginRight: 8,
  },
  vocabReading: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 2,
  },
  vocabHan: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  vocabMeaning: {
    fontSize: 13,
  },
  speakBtn: {
    padding: 6,
    marginRight: 2,
  },
  speakIcon: {
    fontSize: 18,
  },
  starBtn: {
    padding: 6,
    marginLeft: 2,
  },
  starIcon: {
    fontSize: 20,
  },

  buttonTextWhite: { fontSize: 13, fontWeight: "600" },
  buttonTextDark: { fontSize: 14, fontWeight: "600" },

  // Progress bar
  progressBarWrapper: { marginVertical: 12 },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: { height: "100%", borderRadius: 3 },

  // Quiz styles
  quizContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 56,
    paddingBottom: 80,
  },
  quizHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  quizCounter: { fontSize: 16, fontWeight: "600" },
  quizScore: { fontSize: 16, fontWeight: "700" },
  questionCard: {
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  questionText: { fontSize: 36, fontWeight: "800" },
  questionSub: { fontSize: 18, marginTop: 8 },
  questionHint: { fontSize: 14, marginTop: 12 },
  optionsGrid: { gap: 12, marginBottom: 20 },
  optionBtn: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
  },
  optionText: { fontSize: 16, fontWeight: "500" },
  explainBtn: { alignItems: "center", padding: 12 },
  explainText: { fontSize: 14 },
  explanationBox: {
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  explanationTitle: { fontWeight: "700", marginBottom: 8 },
  explanationContent: { fontSize: 14 },
  resultCard: {
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  resultTitle: { fontSize: 24, fontWeight: "700", marginBottom: 16 },
  resultScore: {
    fontSize: 48,
    fontWeight: "800",
    marginBottom: 8,
  },
  resultPercentage: { fontSize: 20, marginBottom: 16 },
  resultMessage: { fontSize: 18, marginBottom: 24 },
  quizExitBtn: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },

  // Practice styles
  practiceContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 56,
    paddingBottom: 80,
  },
  practiceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  practiceCounter: { fontSize: 16, fontWeight: "600" },
  practiceScore: { fontSize: 16, fontWeight: "700" },
  practiceInput: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 20,
  },
  checkBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  practiceExitBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  feedbackBox: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    alignItems: "center",
  },
  feedbackText: { fontSize: 14, fontWeight: "500" },

  // Statistics Modal
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  statsModal: {
    borderRadius: 24,
    padding: 24,
    width: "85%",
    alignItems: "center",
  },
  statsTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 20,
  },
  statCard: {
    alignItems: "center",
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    width: "100%",
  },
  statValue: { fontSize: 40, fontWeight: "800" },
  statLabel: { fontSize: 14, marginTop: 4 },
  statCardTappable: { borderWidth: 1.5 },
  statLabelHint: { fontStyle: "italic" },
  statsDivider: {
    height: 1,
    width: "100%",
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 10,
  },
  statRowLabel: { fontSize: 14 },
  statRowValue: { fontSize: 14, fontWeight: "700" },
  closeStatsBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginTop: 20,
  },

  loadingContainer: { padding: 40, alignItems: "center" },
  loadingText: {
    textAlign: "center",
    fontSize: 18,
    marginTop: 40,
  },
  empty: { padding: 30, alignItems: "center" },
  emptyText: { fontSize: 16, fontWeight: "600" },
  rowMain: { flex: 1 },
  rowTopLine: { flexDirection: "row", alignItems: "baseline", marginBottom: 4 },
  rowActions: { flexDirection: "row", alignItems: "center", marginLeft: 8 },
  vocabKanji: { fontSize: 20, fontWeight: "700" },
});