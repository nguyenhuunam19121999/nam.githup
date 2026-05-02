// ─────────────────────────────────────────────────────────────────────────────
// flashcard.tsx
// Màn hình học từ vựng dạng thẻ lật (flashcard) — trung tâm của app.
//
// Chế độ:
//   📇 Flashcard  — lật thẻ xem mặt trước/sau, có thể tự động cuộn
//   📝 Quiz       — 4 đáp án trắc nghiệm (tối đa 15 câu)
//   ✍️ Luyện viết — nhập nghĩa tiếng Việt để kiểm tra
//
// Tính năng chính:
//   • Tự động lật thẻ (mặc định 2s, cấu hình được)
//   • Đánh dấu từ yêu thích (lưu AsyncStorage riêng từng tài khoản)
//   • Tìm kiếm nhanh trong danh sách
//   • Xáo trộn / đặt lại thứ tự thẻ
//   • Phát âm tiếng Nhật (expo-speech)
//   • Thống kê học tập
//
// Màu chủ đạo: #4ECDC4  rgb(78, 205, 196) — đồng bộ toàn app
// ─────────────────────────────────────────────────────────────────────────────

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Speech from "expo-speech";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { getBookInfo } from "../assets/data_nghanh_hoc";
import { getVocab, type RawVocab } from "../assets/vocab";
// useAuth: dùng để biết người dùng đang đăng nhập là ai và tạo khoá lưu
// dữ liệu (đánh dấu, điểm quiz...) gắn theo từng tài khoản riêng.
import { FeedbackSection } from "@/components/FeedbackSection";
import { useAuth } from "@/hooks/useAuth";
import {
  Alert,
  Animated,
  FlatList,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

// ─── Dữ liệu từ vựng mở rộng ─────────────────────────────────────────────────
interface Vocab {
  kanji: string;
  hiragana: string;
  han: string;
  nghia: string;
  example?: string;
  exampleMeaning?: string;
  category?: string;
}

function normalizeVocab(raw: RawVocab[]): Vocab[] {
  return raw.map((item) => ({
    kanji: item.kanji ?? "",
    hiragana: item.hiragana ?? item.hira ?? "",
    han: item.han ?? "",
    nghia: item.nghia ?? "",
    example: item.example,
    exampleMeaning: item.exampleMeaning,
    category: item.category,
  }));
}

type Field = "kanji" | "hiragana" | "han" | "nghia";
const FIELD_LABELS: Record<Field, string> = {
  kanji: "Kanji",
  hiragana: "Hiragana",
  han: "Hán Việt",
  nghia: "Nghĩa",
};
const ALL_FIELDS: Field[] = ["kanji", "hiragana", "han", "nghia"];

// Categories for filtering
const CATEGORIES: Record<string, string> = {
  all: "Tất cả",
  basic: "Cơ bản",
  production: "Sản xuất & Chế biến",
  safety: "Vệ sinh & An toàn",
  quality: "Chất lượng & Kiểm tra",
  equipment: "Thiết bị & Dụng cụ",
  management: "Quản lý",
  logistics: "Vận chuyển & Kho bãi",
  incident: "Tai nạn & Sự cố",
};

// ─── Hàm tiện ích ────────────────────────────────────────────────────────────
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
        trackColor={{ false: "#cbd5e0", true: "#4ECDC4" }}
        thumbColor="#fff"
        ios_backgroundColor="#cbd5e0"
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
  // scopedKey: đảm bảo điểm quiz được lưu riêng cho từng tài khoản
  const { scopedKey } = useAuth();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    // Lấy tối đa 15 câu hỏi ngẫu nhiên
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      console.log("Error saving quiz result");
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
        saveQuizResult(
          score + (isThisCorrect ? 1 : 0),
          questions.length,
        );
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
            <Text style={s.btnTextWhite}>Quay lại học</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const current = questions[currentQ];

  return (
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
            {current.question} có nghĩa là &quot;{current.correct}&quot;
          </Text>
        </View>
      )}
    </View>
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
  const [practiced, setPracticed] = useState(0);

  const currentVocab = data[currentIndex];

  const nextWord = () => {
    if (currentIndex + 1 < data.length) {
      setCurrentIndex(currentIndex + 1);
      setUserAnswer("");
      setFeedback({ type: null, message: "" });
    } else {
      Alert.alert(
        "🎉 Hoàn thành!",
        `Bạn đã luyện ${data.length} từ, đúng ${score}/${data.length} từ!`,
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
      setTimeout(() => {
        nextWord();
      }, 1500);
    } else {
      setFeedback({
        type: "wrong",
        message: `❌ Sai rồi! "${currentVocab.kanji}" nghĩa là "${currentVocab.nghia}"`,
      });
      setTimeout(() => {
        setFeedback({ type: null, message: "" });
      }, 2000);
    }
    setPracticed(practiced + 1);
  };

  const progress = ((currentIndex + 1) / data.length) * 100;

  if (!currentVocab) {
    return (
      <View style={s.practiceContainer}>
        <Text style={s.loadingText}>Không có từ vựng để luyện</Text>
        <TouchableOpacity style={s.practiceExitBtn} onPress={onExit}>
          <Text style={s.btnTextDark}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.practiceContainer}>
      <View style={s.practiceHeader}>
        <Text style={s.practiceCounter}>
          {currentIndex + 1}/{data.length}
        </Text>
        <Text style={s.practiceScore}>✅ {score}</Text>
      </View>

      <View style={s.progressBar}>
        <View style={[s.progressFill, { width: `${progress}%` }]} />
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
        <Text style={s.btnTextWhite}>Kiểm tra</Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.practiceExitBtn} onPress={onExit}>
        <Text style={s.btnTextDark}>Quay lại</Text>
      </TouchableOpacity>
    </View>
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
  // Số từ đang được ghim (truyền từ main component)
  bookmarkCount: number;
  // Callback khi nhấn ô "Từ đã ghim" → đóng modal + bật filter
  onShowBookmarks: () => void;
}) => {
  // scopedKey: đọc thống kê quiz của riêng tài khoản hiện tại
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
      } catch (e) {
        console.log("Error loading stats");
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

          {/* Nhấn vào ô này → đóng modal + chỉ hiển thị từ đã ghim */}
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
            <Text style={s.btnTextWhite}>Đóng</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FlashcardScreen() {
  const router = useRouter();
  // scopedKey: dùng để lưu danh sách từ đã đánh dấu (bookmarks) riêng cho từng tài khoản.
  // Khi đăng nhập tài khoản khác sẽ thấy danh sách đánh dấu khác.
  const { scopedKey } = useAuth();
  const params = useLocalSearchParams<{
    q?: string;
    level?: string;
    bookId?: string;
    title?: string;
  }>();
  const initialQuery = typeof params.q === "string" ? params.q : "";
  const level = typeof params.level === "string" ? params.level : undefined;
  const bookId = typeof params.bookId === "string" ? params.bookId : undefined;

  // Tải đúng bộ từ vựng dựa theo cấp độ (N5 → N1) và sách (Mimikara / Soumatome)
  // được truyền từ trang trước. Nếu không truyền, hiển thị toàn bộ kho từ.
  const ALL = useMemo<Vocab[]>(
    () => normalizeVocab(getVocab(level, bookId)),
    [level, bookId],
  );

  // Thông tin tiêu đề (emoji + tên Nhật + tên Việt) lấy từ bookId / level
  // — đồng bộ đúng với danh sách hiển thị ở trang chủ.
  const headerInfo = useMemo(() => getBookInfo(level, bookId), [level, bookId]);

  const [, setData] = useState<Vocab[]>([...ALL]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [gameMode, setGameMode] = useState<"flashcard" | "quiz" | "practice">(
    "flashcard",
  );
  const [searchText, setSearchText] = useState(initialQuery);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showStats, setShowStats] = useState(false);
  // Khi true → chỉ hiển thị những từ đang được ghim (⭐)
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [bookmarks, setBookmarks] = useState<Set<number>>(new Set());

  // Trường hiển thị mặt trước / sau
  const [frontSel, setFrontSel] = useState<Record<Field, boolean>>({
    kanji: true,
    hiragana: false,
    han: false,
    nghia: false,
  });
  const [backSel, setBackSel] = useState<Record<Field, boolean>>({
    kanji: false,
    hiragana: true,
    han: true,
    nghia: true,
  });

  // ─── Tự động cuộn flashcard ─────────────────────────────────────────────
  // autoScroll : bật/tắt chế độ tự cuộn
  // autoScrollSec : số giây giữa mỗi lần lật / chuyển thẻ
  const AUTO_SCROLL_PRESETS = [2, 3, 5, 8, 10, 15] as const;
  const [autoScroll, setAutoScroll] = useState(true);
  const [autoScrollSec, setAutoScrollSec] = useState(2);

  // Đọc lại tuỳ chọn auto-scroll đã lưu cho từng tài khoản
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
          AUTO_SCROLL_PRESETS.includes(parsed.seconds as 2 | 3 | 5 | 8 | 10 | 15)
        ) {
          setAutoScrollSec(parsed.seconds);
        }
      } catch {
        /* ignore */
      }
    })();
  }, [scopedKey]);

  // Lưu lại mỗi khi tuỳ chọn thay đổi
  useEffect(() => {
    AsyncStorage.setItem(
      scopedKey("autoScroll"),
      JSON.stringify({ enabled: autoScroll, seconds: autoScrollSec }),
    ).catch(() => {});
  }, [autoScroll, autoScrollSec, scopedKey]);

  // Load bookmarks from storage (scoped per logged-in user)
  useEffect(() => {
    const loadBookmarks = async () => {
      try {
        const saved = await AsyncStorage.getItem(scopedKey("bookmarks"));
        setBookmarks(saved ? new Set(JSON.parse(saved)) : new Set());
      } catch (e) {
        console.log("Error loading bookmarks");
      }
    };
    loadBookmarks();
  }, [scopedKey]);

  const saveBookmarks = async (newBookmarks: Set<number>) => {
    try {
      await AsyncStorage.setItem(
        scopedKey("bookmarks"),
        JSON.stringify([...newBookmarks]),
      );
    } catch (e) {
      console.log("Error saving bookmarks");
    }
  };

  const toggleBookmark = async (index: number) => {
    const newBookmarks = new Set(bookmarks);
    const isAdding = !newBookmarks.has(index);
    if (isAdding) {
      newBookmarks.add(index);
      // Khi thêm sao → ghi word vào reviewedWords (unique set, không đếm trùng)
      try {
        const raw = await AsyncStorage.getItem(scopedKey("reviewedWords"));
        const existing: number[] = raw ? JSON.parse(raw) : [];
        if (!existing.includes(index)) {
          await AsyncStorage.setItem(
            scopedKey("reviewedWords"),
            JSON.stringify([...existing, index]),
          );
        }
      } catch (e) {
        console.log("Error saving reviewedWords");
      }
    } else {
      newBookmarks.delete(index);
    }
    setBookmarks(newBookmarks);
    saveBookmarks(newBookmarks);
  };

  // Mở/đóng menu — hiệu ứng trượt từ dưới lên do <Modal animationType="slide"> đảm nhận
  // (giống y hệt modal "Thống kê học tập").
  const openMenu = () => setMenuOpen(true);
  const closeMenu = () => setMenuOpen(false);
  const toggleMenu = () => (menuOpen ? closeMenu() : openMenu());

  // Toggle trường
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

  // Lọc dữ liệu theo search và category
  const filteredData = (() => {
    // Bước 1: lọc theo filter ghim (nếu đang bật)
    let base = showBookmarksOnly
      ? ALL.filter((_, i) => bookmarks.has(i))
      : ALL;
    // Bước 2: lọc thêm theo từ khoá tìm kiếm
    if (!searchText) return base;
    const q = normalize(searchText);
    return base.filter(
      (v) =>
        normalize(v.kanji).includes(q) ||
        normalize(v.hiragana).includes(q) ||
        normalize(v.han).includes(q) ||
        normalize(v.nghia).includes(q),
    );
  })();

  const total = filteredData.length;
  const safeIdx = Math.min(idx, Math.max(0, total - 1));
  const currentItem = filteredData[safeIdx];
  const progress = total > 0 ? ((safeIdx + 1) / total) * 100 : 0;

  const next = () => {
    setIdx((i) => (i + 1) % Math.max(1, total));
    setFlipped(false);
  };
  const prev = () => {
    setIdx((i) => (i - 1 + total) % Math.max(1, total));
    setFlipped(false);
  };

  // ─── Effect tự động chuyển sang thẻ kế tiếp ────────────────────────────
  // Chỉ chạy ở chế độ "Flashcard" và khi có ít nhất 1 thẻ trong danh sách.
  // Khi đang mở menu cài đặt thì tạm dừng để người dùng đọc số liệu.
  useEffect(() => {
    if (!autoScroll) return;
    if (gameMode !== "flashcard") return;
    if (total <= 1) return;
    if (menuOpen) return;
    const timer = setInterval(() => {
      setIdx((i) => (i + 1) % Math.max(1, total));
      setFlipped(false);
    }, Math.max(1, autoScrollSec) * 1000);
    return () => clearInterval(timer);
  }, [autoScroll, autoScrollSec, gameMode, total, menuOpen]);
  const [isShuffled, setIsShuffled] = useState(false);
  const doShuffle = () => {
    setData(shuffle(ALL));
    setIdx(0);
    setFlipped(false);
    setSearchText("");
    setIsShuffled(true);
    Alert.alert("🔀 Xáo trộn", "Các thẻ đã được xáo trộn ngẫu nhiên!");
  };
  const doReset = () => {
    setData([...ALL]);
    setIdx(0);
    setFlipped(false);
    setSearchText("");
    setIsShuffled(false);
  };

  // Phát âm
  const speak = (text: string) => {
    if (!text) return;
    Speech.speak(text, { language: "ja-JP", pitch: 1, rate: 0.8 });
  };

  const activeFront = ALL_FIELDS.filter((f) => frontSel[f]);
  const activeBack = ALL_FIELDS.filter((f) => backSel[f]);
  // ─── Animation lật thẻ ─────────────────────────────────────────────────────
  const flipAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(flipAnim, {
      toValue: flipped ? 1 : 0,
      friction: 8,
      tension: 12,
      useNativeDriver: true,
    }).start();
  }, [flipped, flipAnim]);

  const frontRotate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });
  const backRotate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["180deg", "360deg"],
  });
  const frontOpacity = flipAnim.interpolate({
    inputRange: [0, 0.5, 0.5, 1],
    outputRange: [1, 1, 0, 0],
  });
  const backOpacity = flipAnim.interpolate({
    inputRange: [0, 0.5, 0.5, 1],
    outputRange: [0, 0, 1, 1],
  });

  // ─── Render thẻ ────────────────────────────────────────────────────────────
  const renderCardContent = (isBack: boolean) => {
    if (!currentItem) return <Text style={s.hint}>Không có dữ liệu</Text>;
    const fieldsToShow = isBack ? activeBack : activeFront;
    return (
      <>
        {fieldsToShow.map((f) => {
          const val = currentItem[f];
          if (!val) return null;
          return (
            <View key={f} style={s.fieldBlock}>
              <Text style={[s.fieldLbl, isBack && s.fieldLblBack]}>
                {FIELD_LABELS[f]}
              </Text>
              <Text style={[s.fieldVal, fieldStyle(f, isBack)]}>{val}</Text>
            </View>
          );
        })}
        {currentItem.example && (
          <View style={s.exampleBox}>
            <Text style={s.exampleText}>📖 {currentItem.example}</Text>
            {currentItem.exampleMeaning && (
              <Text style={s.exampleSub}>{currentItem.exampleMeaning}</Text>
            )}
          </View>
        )}
        <Text style={[s.hint, isBack && s.hintBack]}>
          {isBack ? "Nhấn để lật lại" : "Nhấn để xem mặt sau"}
        </Text>
      </>
    );
  };

  // Render theo game mode
  if (gameMode === "quiz") {
    return (
      <QuizMode
        data={filteredData.length > 0 ? filteredData : ALL}
        onExit={() => setGameMode("flashcard")}
      />
    );
  }

  if (gameMode === "practice") {
    return (
      <PracticeMode
        data={filteredData.length > 0 ? filteredData : ALL}
        onExit={() => setGameMode("flashcard")}
      />
    );
  }

  return (
    <TouchableWithoutFeedback
      onPress={() => {
        if (menuOpen) closeMenu();
        Keyboard.dismiss();
      }}
    >
      <View style={s.container}>
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header ── */}
          <View style={s.headerRow}>
            <TouchableOpacity
              style={s.backBtn}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Text style={s.backBtnText}>‹</Text>
            </TouchableOpacity>
            <View style={s.titleBlock}>
              <Text style={s.title} numberOfLines={1}>
                {`${headerInfo.emoji} ${headerInfo.jp} — ${headerInfo.vi}`}
              </Text>
              <Text style={s.subtitle}>{ALL.length} từ vựng tiếng Nhật</Text>
            </View>
            <View style={s.headerButtons}>
              <TouchableOpacity
                style={s.statsBtn}
                onPress={() => setShowStats(true)}
              >
                <Text style={s.statsBtnText}>📊</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.menuBtn}
                onPress={toggleMenu}
                activeOpacity={0.8}
              >
                <View style={s.menuLine} />
                <View style={s.menuLine} />
                <View style={s.menuLine} />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Menu cài đặt mặt trước/sau ──
              Dùng <Modal animationType="slide" transparent> để hiệu ứng giống
              modal "Thống kê học tập": trượt từ dưới lên + nền tối phía sau.
          */}
          <Modal
            visible={menuOpen}
            transparent
            animationType="slide"
            onRequestClose={closeMenu}
          >
            <View style={s.menuModalOverlay}>
              <Pressable style={StyleSheet.absoluteFill} onPress={closeMenu} />
              <View style={s.menuSheet}>
                <View style={s.menuSheetHandle} />
                <View style={s.menuSheetHeader}>
                  <Text style={s.menuSheetTitle}>Cài đặt thẻ</Text>
                  <TouchableOpacity onPress={closeMenu} hitSlop={10}>
                    <Text style={s.menuSheetClose}>Đóng</Text>
                  </TouchableOpacity>
                </View>

                {/* ── Tự động cuộn ── */}
                <Text style={s.menuGroupLabel}>Tự động cuộn</Text>
                <ToggleRow
                  label="Bật tự động cuộn"
                  value={autoScroll}
                  onToggle={() => setAutoScroll((v) => !v)}
                  isLast
                />
                <Text style={s.autoScrollHint}>
                  Thời gian giữa mỗi thẻ
                </Text>
                <View style={s.autoScrollChips}>
                  {AUTO_SCROLL_PRESETS.map((sec) => {
                    const active = sec === autoScrollSec;
                    return (
                      <TouchableOpacity
                        key={sec}
                        style={[
                          s.autoScrollChip,
                          active && s.autoScrollChipActive,
                          !autoScroll && s.autoScrollChipDisabled,
                        ]}
                        onPress={() => setAutoScrollSec(sec)}
                        disabled={!autoScroll}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            s.autoScrollChipText,
                            active && s.autoScrollChipTextActive,
                          ]}
                        >
                          {sec}s
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={[s.menuGroupLabel, { marginTop: 16 }]}>
                  Mặt trước
                </Text>
                {ALL_FIELDS.map((f, i) => (
                  <ToggleRow
                    key={`front-${f}`}
                    label={FIELD_LABELS[f]}
                    value={frontSel[f]}
                    onToggle={() => toggleField("front", f)}
                    isLast={i === ALL_FIELDS.length - 1}
                  />
                ))}
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

          {/* ── Mode Switch ── */}
          <View style={s.modeSwitch}>
            <TouchableOpacity
              style={[s.modeBtn, (gameMode as string) === "flashcard" && s.modeActive]}
              onPress={() => setGameMode("flashcard")}
            >
              <Text
                style={[
                  s.modeBtnText,
                  (gameMode as string) === "flashcard" && s.modeBtnTextActive,
                ]}
              >
                📇 Flashcard
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.modeBtn, (gameMode as string) === "quiz" && s.modeActive]}
              onPress={() => setGameMode("quiz")}
            >
              <Text
                style={[
                  s.modeBtnText,
                  (gameMode as string) === "quiz" && s.modeBtnTextActive,
                ]}
              >
                📝 Quiz
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.modeBtn, (gameMode as string) === "practice" && s.modeActive]}
              onPress={() => setGameMode("practice")}
            >
              <Text
                style={[
                  s.modeBtnText,
                  (gameMode as string) === "practice" && s.modeBtnTextActive,
                ]}
              >
                ✍️ Luyện viết
              </Text>
            </TouchableOpacity>
          </View>


          {/* ── Tìm kiếm ── */}
          <TextInput
            style={s.searchBox}
            value={searchText}
            onChangeText={(t) => {
              setSearchText(t);
              setIdx(0);
              setFlipped(false);
            }}
            placeholder="Tìm từ vựng (kanji, hiragana, hán việt, nghĩa...)"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={Keyboard.dismiss}
          />

          {/* Banner khi đang lọc chỉ từ đã ghim — nhấn để tắt */}
          {showBookmarksOnly && (
            <TouchableOpacity
              style={s.bookmarkBanner}
              onPress={() => { setShowBookmarksOnly(false); setIdx(0); }}
              activeOpacity={0.8}
            >
              <Text style={s.bookmarkBannerText}>
                ⭐ Đang xem {filteredData.length} từ đã ghim · Nhấn để xem tất cả
              </Text>
            </TouchableOpacity>
          )}

          {/* ══════════ CHẾ ĐỘ THẺ ══════════ */}
          {viewMode === "card" && (
            <View style={s.cardArea}>
              {/* Counter + Progress */}
              <Text style={s.counter}>
                {total === 0 ? "0 / 0" : `${safeIdx + 1} / ${total}`}
              </Text>
              <View style={s.progressBar}>
                <View
                  style={[s.progressFill, { width: `${progress}%` }]}
                />
              </View>

              {/* Thẻ */}
              <View style={s.cardWrapper}>
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={() => setFlipped((f) => !f)}
                  style={s.cardTouch}
                >
                  <Animated.View
                    style={[
                      s.card,
                      s.cardFace,
                      s.cardFront,
                      {
                        opacity: frontOpacity,
                        transform: [
                          { perspective: 1000 },
                          { rotateY: frontRotate },
                        ],
                      },
                    ]}
                  >
                    {renderCardContent(false)}
                  </Animated.View>

                  <Animated.View
                    style={[
                      s.card,
                      s.cardFace,
                      s.cardBack,
                      {
                        opacity: backOpacity,
                        transform: [
                          { perspective: 1000 },
                          { rotateY: backRotate },
                        ],
                      },
                    ]}
                  >
                    {renderCardContent(true)}
                  </Animated.View>
                </TouchableOpacity>

                {/* Bookmark button (overlay, không lật cùng thẻ) */}
                <TouchableOpacity
                  style={s.bookmarkBtn}
                  onPress={() => toggleBookmark(safeIdx)}
                >
                  <Text style={s.bookmarkIcon}>
                    {bookmarks.has(safeIdx) ? "⭐" : "☆"}
                  </Text>
                </TouchableOpacity>

                {/* Speaker button (overlay) */}
                <TouchableOpacity
                  style={s.speakerBtn}
                  onPress={() => speak(currentItem?.kanji || "")}
                >
                  <Text style={s.speakerIcon}>🔊</Text>
                </TouchableOpacity>
              </View>

              {/* Nút điều hướng */}
              <View style={s.btnRow}>
                <TouchableOpacity style={s.btnPrev} onPress={prev}>
                  <Text style={s.btnTextDark}>◀ Trước</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.btnNext} onPress={next}>
                  <Text style={s.btnTextWhite}>Tiếp ▶</Text>
                </TouchableOpacity>
              </View>

              <View style={s.btnRow}>
                <TouchableOpacity
                  style={isShuffled ? s.btnShuffle : s.btnReset}
                  onPress={doShuffle}
                >
                  <Text style={isShuffled ? s.btnTextWhite : s.btnTextDark}>
                    🔀 Xáo trộn
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.btnReset} onPress={doReset}>
                  <Text style={s.btnTextDark}>↺ Đặt lại</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={s.btnList}
                onPress={() => setViewMode("list")}
              >
                <Text style={s.btnTextWhite}>📋 Xem danh sách</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ══════════ CHẾ ĐỘ DANH SÁCH ══════════ */}
          {viewMode === "list" && (
            <View>
              <TouchableOpacity
                style={[s.btnList, { marginBottom: 14 }]}
                onPress={() => setViewMode("card")}
              >
                <Text style={s.btnTextWhite}>← Quay lại thẻ</Text>
              </TouchableOpacity>

              {/* Bảng header */}
              <View style={s.tableHeader}>
                <Text style={[s.th, { flex: 0.3 }]}>#</Text>
                <Text style={[s.th, { flex: 1.2 }]}>Kanji</Text>
                <Text style={[s.th, { flex: 1.5 }]}>Hiragana</Text>
                <Text style={[s.th, { flex: 1.2 }]}>Hán Việt</Text>
                <Text style={[s.th, { flex: 1.3 }]}>Nghĩa</Text>
              </View>
              <FlatList
                data={filteredData}
                keyExtractor={(_, i) => String(i)}
                scrollEnabled={false}
                renderItem={({ item, index }) => (
                  <View style={[s.tableRow, index % 2 === 0 && s.tableRowAlt]}>
                    <Text
                      style={[
                        s.td,
                        { flex: 0.3, color: "#a0aec0", fontSize: 12 },
                      ]}
                    >
                      {index + 1}
                    </Text>
                    <Text
                      style={[
                        s.td,
                        {
                          flex: 1.2,
                          fontSize: 18,
                          fontWeight: "700",
                          color: "#1a202c",
                        },
                      ]}
                    >
                      {item.kanji}
                    </Text>
                    <Text
                      style={[
                        s.td,
                        { flex: 1.5, color: "#4a5568", fontSize: 12 },
                      ]}
                    >
                      {item.hiragana}
                    </Text>
                    <Text
                      style={[
                        s.td,
                        { flex: 1.2, color: "#744210", fontSize: 12 },
                      ]}
                    >
                      {item.han}
                    </Text>
                    <Text
                      style={[
                        s.td,
                        {
                          flex: 1.3,
                          color: "#3BB3AC",
                          fontWeight: "600",
                          fontSize: 12,
                        },
                      ]}
                    >
                      {item.nghia}
                    </Text>
                  </View>
                )}
                ListEmptyComponent={
                  <Text style={s.noResult}>Không tìm thấy kết quả</Text>
                }
              />
            </View>
          )}

          {/* ── Đóng góp ý kiến ── */}
          <FeedbackSection
            pageKey={`flashcard::${level ?? bookId ?? "all"}`}
          />
        </ScrollView>

        <StatisticsModal
          visible={showStats}
          onClose={() => setShowStats(false)}
          totalCount={ALL.length}
          bookmarkCount={bookmarks.size}
          onShowBookmarks={() => {
            setIdx(0);
            setShowBookmarksOnly(true);
          }}
        />
      </View>
    </TouchableWithoutFeedback>
  );
}

// ─── Field style helper ───────────────────────────────────────────────────────
function fieldStyle(f: Field, isBack: boolean) {
  const map: Record<Field, object> = {
    kanji: isBack
      ? { fontSize: 44, fontWeight: "800", color: "#fff" }
      : { fontSize: 44, fontWeight: "800", color: "#1a202c" },
    hiragana: isBack
      ? { fontSize: 18, color: "#bee3f8" }
      : { fontSize: 18, color: "#718096" },
    han: isBack
      ? { fontSize: 15, color: "#f6e05e", fontStyle: "italic" }
      : { fontSize: 15, color: "#744210", fontStyle: "italic" },
    nghia: isBack
      ? { fontSize: 26, fontWeight: "700", color: "#fff" }
      : { fontSize: 26, fontWeight: "700", color: "#1a365d" },
  };
  return map[f];
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f4f8" },
  scroll: { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 60 },

  /* Header */
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  backBtn: {
    width: 42,
    height: 42,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  backBtnText: { fontSize: 28, color: "#4ECDC4", lineHeight: 30 },
  titleBlock: { flex: 1, marginRight: 10 },
  title: { fontSize: 16, fontWeight: "700", color: "#2d3748", marginBottom: 3 },
  subtitle: { fontSize: 13, color: "#718096" },
  headerButtons: { flexDirection: "row", gap: 8 },
  statsBtn: {
    width: 42,
    height: 42,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  statsBtnText: { fontSize: 20 },

  /* Menu button */
  menuBtn: {
    width: 42,
    height: 42,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  menuLine: {
    width: 20,
    height: 2,
    backgroundColor: "#1e293b",
    borderRadius: 1,
  },

  /* Menu popup — bottom sheet, slide từ dưới lên (giống modal Thống kê) */
  menuModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    justifyContent: "flex-end",
  },
  menuSheet: {
    backgroundColor: "#fff",
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
    backgroundColor: "#cbd5e1",
    alignSelf: "center",
    marginBottom: 10,
  },
  menuSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  menuSheetTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  menuSheetClose: { fontSize: 14, fontWeight: "600", color: "#4ECDC4" },
  autoScrollHint: {
    fontSize: 12,
    color: "#64748b",
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
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  autoScrollChipActive: {
    backgroundColor: "#4ECDC4",
    borderColor: "#4ECDC4",
  },
  autoScrollChipDisabled: { opacity: 0.45 },
  autoScrollChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1e293b",
  },
  autoScrollChipTextActive: { color: "#fff" },
  menuGroupLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  menuRowLabel: { fontSize: 14, fontWeight: "500", color: "#1e293b" },

  /* Mode Switch */
  modeSwitch: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: "#e2e8f0",
    borderRadius: 10,
    alignItems: "center",
  },
  modeActive: {
    backgroundColor: "#4ECDC4",
  },
  modeBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  modeBtnTextActive: {
    color: "#fff",
  },

  /* Topic Filter */
  topicFilter: {
    marginBottom: 16,
  },
  topicFilterContent: {
    paddingRight: 16,
  },
  topicChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#e2e8f0",
    borderRadius: 20,
    marginRight: 10,
  },
  topicChipActive: {
    backgroundColor: "#4ECDC4",
  },
  topicText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#475569",
  },
  topicTextActive: {
    color: "#fff",
  },

  /* Search */
  // Banner "đang xem từ đã ghim" — hiển thị khi showBookmarksOnly = true
  bookmarkBanner: {
    backgroundColor: "#e6faf9",
    borderWidth: 1,
    borderColor: "#4ECDC4",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginBottom: 12,
    alignItems: "center",
  },
  bookmarkBannerText: {
    color: "#3BB3AC",
    fontSize: 13,
    fontWeight: "600",
  },
  searchBox: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1a202c",
    marginBottom: 16,
  },

  /* Card area */
  cardArea: { alignItems: "center" },
  cardWrapper: {
    width: "100%",
    minHeight: 280,
    marginBottom: 22,
    position: "relative",
  },
  cardTouch: { width: "100%", minHeight: 280 },
  cardFace: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backfaceVisibility: "hidden",
  },
  counter: {
    fontSize: 14,
    color: "#4a5568",
    fontWeight: "500",
    marginBottom: 10,
  },
  progressBar: {
    width: "100%",
    height: 6,
    backgroundColor: "#e2e8f0",
    borderRadius: 99,
    marginBottom: 20,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4ECDC4",
    borderRadius: 99,
  },

  card: {
    width: "100%",
    minHeight: 280,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
    gap: 4,
  },
  cardFront: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#e2e8f0",
  },
  cardBack: { backgroundColor: "#3BB3AC" },

  fieldBlock: { width: "100%", alignItems: "center", marginBottom: 6 },
  fieldLbl: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  fieldLblBack: { color: "rgba(255,255,255,0.6)" },
  fieldVal: { textAlign: "center" },
  hint: { fontSize: 11, color: "#a0aec0", marginTop: 10 },
  hintBack: { color: "rgba(255,255,255,0.4)" },

  exampleBox: {
    marginTop: 12,
    padding: 10,
    backgroundColor: "#f7fafc",
    borderRadius: 8,
    width: "100%",
  },
  exampleText: { fontSize: 13, color: "#4a5568", fontStyle: "italic" },
  exampleSub: { fontSize: 11, color: "#718096", marginTop: 4 },

  bookmarkBtn: {
    position: "absolute",
    top: 12,
    left: 12,
    zIndex: 10,
  },
  bookmarkIcon: { fontSize: 24 },
  speakerBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 10,
  },
  speakerIcon: { fontSize: 20 },

  /* Buttons */
  btnRow: { flexDirection: "row", gap: 10, marginBottom: 12, width: "100%" },
  btnPrev: {
    flex: 1,
    backgroundColor: "#e2e8f0",
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: "center",
  },
  btnNext: {
    flex: 1,
    backgroundColor: "#4ECDC4",
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: "center",
  },
  btnShuffle: {
    flex: 1,
    backgroundColor: "#4ECDC4",
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: "center",
  },
  btnReset: {
    flex: 1,
    backgroundColor: "#e2e8f0",
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: "center",
  },
  btnList: {
    width: "100%",
    backgroundColor: "#4ECDC4",
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  btnTextDark: { fontSize: 14, fontWeight: "600", color: "#1a202c" },
  btnTextWhite: { fontSize: 14, fontWeight: "600", color: "#fff" },

  /* Table */
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#3BB3AC",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  th: { color: "#fff", fontSize: 11, fontWeight: "700" },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#edf2f7",
    backgroundColor: "#fff",
  },
  tableRowAlt: { backgroundColor: "#f7fafc" },
  td: { fontSize: 13 },
  noResult: {
    textAlign: "center",
    padding: 24,
    color: "#e53e3e",
    fontSize: 15,
  },

  /* Quiz Styles */
  quizContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 56,
    backgroundColor: "#f0f4f8",
    minHeight: 500,
  },
  quizHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  quizCounter: { fontSize: 16, fontWeight: "600", color: "#4a5568" },
  quizScore: { fontSize: 16, fontWeight: "700", color: "#4ECDC4" },
  questionCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  questionText: { fontSize: 36, fontWeight: "800", color: "#1a202c" },
  questionSub: { fontSize: 18, color: "#718096", marginTop: 8 },
  questionHint: { fontSize: 14, color: "#a0aec0", marginTop: 12 },
  optionsGrid: { gap: 12, marginBottom: 20 },
  optionBtn: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e2e8f0",
    alignItems: "center",
  },
  correctOption: {
    backgroundColor: "#4ECDC4",
    borderColor: "#3BB3AC",
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
  },
  wrongOption: {
    backgroundColor: "#f56565",
    borderColor: "#e53e3e",
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
  },
  optionText: { fontSize: 16, fontWeight: "500", color: "#2d3748" },
  explainBtn: { alignItems: "center", padding: 12 },
  explainText: { fontSize: 14, color: "#4ECDC4" },
  explanationBox: {
    backgroundColor: "#ebf8ff",
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  explanationTitle: { fontWeight: "700", color: "#3BB3AC", marginBottom: 8 },
  explanationContent: { fontSize: 14, color: "#2d3748" },
  resultCard: {
    backgroundColor: "#fff",
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
    color: "#4ECDC4",
    marginBottom: 8,
  },
  resultPercentage: { fontSize: 20, color: "#4a5568", marginBottom: 16 },
  resultMessage: { fontSize: 18, marginBottom: 24 },
  quizExitBtn: {
    backgroundColor: "#4ECDC4",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  loadingText: {
    textAlign: "center",
    fontSize: 18,
    color: "#4a5568",
    marginTop: 40,
  },

  /* Practice Styles */
  practiceContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 56,
    backgroundColor: "#f0f4f8",
    minHeight: 500,
  },
  practiceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  practiceCounter: { fontSize: 16, fontWeight: "600", color: "#4a5568" },
  practiceScore: { fontSize: 16, fontWeight: "700", color: "#4ECDC4" },
  practiceInput: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 20,
  },
  checkBtn: {
    backgroundColor: "#4ECDC4",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  practiceExitBtn: {
    backgroundColor: "#e2e8f0",
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
  feedbackCorrect: { backgroundColor: "#c6f6d5" },
  feedbackWrong: { backgroundColor: "#fed7d7" },
  feedbackText: { fontSize: 14, fontWeight: "500" },

  /* Statistics Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  statsModal: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    width: "85%",
    alignItems: "center",
  },
  statsTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 20,
    color: "#2d3748",
  },
  statCard: {
    alignItems: "center",
    marginBottom: 16,
    padding: 16,
    backgroundColor: "#ebf8ff",
    borderRadius: 16,
    width: "100%",
  },
  statValue: { fontSize: 40, fontWeight: "800", color: "#3BB3AC" },
  statLabel: { fontSize: 14, color: "#4a5568", marginTop: 4 },
  // Ô ghim có viền nhẹ để phân biệt có thể nhấn
  statCardTappable: {
    borderWidth: 1.5,
    borderColor: "#4ECDC4",
  },
  // Chú thích nhỏ "Nhấn để xem"
  statLabelHint: { color: "#4ECDC4", fontStyle: "italic" },
  statsDivider: {
    height: 1,
    backgroundColor: "#e2e8f0",
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
  statRowLabel: { fontSize: 14, color: "#4a5568" },
  statRowValue: { fontSize: 14, fontWeight: "700", color: "#3BB3AC" },
  closeStatsBtn: {
    backgroundColor: "#4ECDC4",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginTop: 20,
  },
});
