// ─────────────────────────────────────────────────────────────────────────────
// kanji.tsx — Trang học Kanji với 3 tab: Flashcard | Quiz | Luyện viết
// ─────────────────────────────────────────────────────────────────────────────

import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Animated,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LinearGradient } from "expo-linear-gradient";
import { getKanji, type KanjiItem } from "../assets/data_JLPT_kanji";
import { FeedbackSection } from "../components/FeedbackSection";
import { KanjiStrokeOrder } from "../components/KanjiStrokeOrder";

// Màu chủ đạo — xanh ngọc teal rgb(78,205,196), đồng bộ toàn app
const BLUE = "#4ECDC4";
// Màu đỏ dùng riêng cho chữ Kanji
const RED = "#E03131";
// Gradient header
const GRAD = ["#4ECDC4", "#5e9a95"] as const;

type Mode = "flashcard" | "quiz" | "writing";

// ─── Helper: 4 đáp án quiz ngẫu nhiên ────────────────────────────────────────
function makeOptions(correct: KanjiItem, pool: KanjiItem[]): string[] {
  const answer = correct.meanings[0] ?? correct.hanViet;
  const others = pool
    .filter((k) => k.id !== correct.id)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map((k) => k.meanings[0] ?? k.hanViet);
  return [answer, ...others].sort(() => Math.random() - 0.5);
}

export default function KanjiListScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ level?: string; title?: string }>();
  const level = (
    typeof params.level === "string" ? params.level : "N5"
  ).toUpperCase();
  const title =
    typeof params.title === "string" && params.title
      ? params.title
      : `Học Kanji ${level}`;

  const items: KanjiItem[] = useMemo(() => getKanji(level), [level]);

  // ── Chế độ tab ──────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<Mode>("flashcard");

  // ── Tìm kiếm ────────────────────────────────────────────────────────────────
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (it) =>
        it.kanji.includes(q) ||
        it.hanViet.toLowerCase().includes(q) ||
        it.meanings.some((m) => m.toLowerCase().includes(q)) ||
        it.kunyomi.some((k) => k.includes(q)) ||
        it.onyomi.some((o) => o.includes(q)),
    );
  }, [items, query]);

  // ── Flashcard state ──────────────────────────────────────────────────────────
  const [cardIdx, setCardIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;
  const safeCard = Math.min(cardIdx, Math.max(0, filtered.length - 1));
  const currentCard = filtered[safeCard];

  const doFlip = useCallback(() => {
    Animated.spring(flipAnim, {
      toValue: flipped ? 0 : 1,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start(() => setFlipped((f) => !f));
  }, [flipped, flipAnim]);

  const frontRot = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ["0deg", "90deg", "90deg"],
  });
  const backRot = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ["-90deg", "-90deg", "0deg"],
  });

  const goNext = () => {
    setCardIdx((i) => (i + 1) % Math.max(1, filtered.length));
    setFlipped(false);
    flipAnim.setValue(0);
  };
  const goPrev = () => {
    setCardIdx(
      (i) => (i - 1 + filtered.length) % Math.max(1, filtered.length),
    );
    setFlipped(false);
    flipAnim.setValue(0);
  };

  // ── Quiz state ───────────────────────────────────────────────────────────────
  const [quizIdx, setQuizIdx] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizAnswered, setQuizAnswered] = useState<string | null>(null);
  const [quizDone, setQuizDone] = useState(false);
  const quizSafe = Math.min(quizIdx, Math.max(0, filtered.length - 1));
  const quizItem = filtered[quizSafe];
  const quizOptions = useMemo(
    () => (quizItem && filtered.length >= 4 ? makeOptions(quizItem, filtered) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [quizSafe, filtered],
  );
  const correctAnswer = quizItem?.meanings[0] ?? quizItem?.hanViet ?? "";

  const handleAnswer = (ans: string) => {
    if (quizAnswered !== null) return;
    setQuizAnswered(ans);
    if (ans === correctAnswer) setQuizScore((s) => s + 1);
    setTimeout(() => {
      if (quizIdx + 1 >= filtered.length) {
        setQuizDone(true);
      } else {
        setQuizIdx((i) => i + 1);
        setQuizAnswered(null);
      }
    }, 900);
  };
  const resetQuiz = () => {
    setQuizIdx(0);
    setQuizScore(0);
    setQuizAnswered(null);
    setQuizDone(false);
  };

  // ── Luyện viết state ─────────────────────────────────────────────────────────
  const [writeIdx, setWriteIdx] = useState(0);
  const writeSafe = Math.min(writeIdx, Math.max(0, filtered.length - 1));
  const writeItem = filtered[writeSafe];

  // ── Đổi tab: reset về đầu ────────────────────────────────────────────────────
  const switchMode = (m: Mode) => {
    setMode(m);
    setCardIdx(0);
    setFlipped(false);
    flipAnim.setValue(0);
    setWriteIdx(0);
    resetQuiz();
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE} />

      {/* ── Header gradient ── */}
      <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
        <SafeAreaView style={s.topBar} edges={["top", "left", "right"]}>
          <View style={s.topBarInner}>
            <TouchableOpacity
              style={s.iconBtn}
              onPress={() => router.back()}
              hitSlop={8}
            >
              <Text style={s.backIcon}>‹</Text>
            </TouchableOpacity>
            <View style={s.titleBlock}>
              <Text style={s.topTitle} numberOfLines={1}>
                {title}
              </Text>
              <Text style={s.topSubtitle}>{filtered.length} chữ Kanji</Text>
            </View>
            <View style={s.iconBtn} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* ── Tab bar ── */}
      <View style={s.tabBar}>
        {(
          [
            { key: "flashcard", label: "📇 Flashcard" },
            { key: "quiz",      label: "📝 Quiz" },
            { key: "writing",   label: "✍️ Luyện viết" },
          ] as { key: Mode; label: string }[]
        ).map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[s.tabBtn, mode === key && s.tabActive]}
            onPress={() => switchMode(key)}
            activeOpacity={0.8}
          >
            <Text style={[s.tabText, mode === key && s.tabTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Search bar ── */}
      <View style={s.searchWrap}>
        <Text style={s.searchIcon}>🔍</Text>
        <TextInput
          style={s.searchInput}
          value={query}
          onChangeText={(t) => {
            setQuery(t);
            setCardIdx(0);
            setQuizIdx(0);
            setWriteIdx(0);
          }}
          placeholder="Tìm Kanji, Hán Việt, nghĩa..."
          placeholderTextColor="#94a3b8"
        />
      </View>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB: FLASHCARD — danh sách kanji (giống trang gốc)                  */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {mode === "flashcard" && (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {filtered.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyText}>Chưa có kanji nào phù hợp.</Text>
            </View>
          ) : (
            <>
              {/* Bộ đếm + thẻ lật */}
              <Text style={s.counter}>{safeCard + 1} / {filtered.length}</Text>

              <View style={s.cardWrap}>
                {/* Mặt trước */}
                <Animated.View
                  style={[s.card, s.cardFront, { transform: [{ rotateY: frontRot }] }]}
                >
                  <TouchableOpacity style={s.cardInner} onPress={doFlip} activeOpacity={0.85}>
                    <Text style={s.cardKanji}>{currentCard?.kanji}</Text>
                    <Text style={s.cardHanViet}>{currentCard?.hanViet}</Text>
                    <Text style={s.cardHint}>Nhấn để xem âm & nghĩa</Text>
                  </TouchableOpacity>
                </Animated.View>
                {/* Mặt sau */}
                <Animated.View
                  style={[s.card, s.cardBack, { transform: [{ rotateY: backRot }] }]}
                >
                  <TouchableOpacity style={s.cardInner} onPress={doFlip} activeOpacity={0.85}>
                    <Text style={s.cardKanjiSm}>{currentCard?.kanji}</Text>
                    {currentCard?.kunyomi.length > 0 && (
                      <Text style={s.cardReading}>訓 {currentCard.kunyomi.join("、")}</Text>
                    )}
                    {currentCard?.onyomi.length > 0 && (
                      <Text style={s.cardReading}>音 {currentCard.onyomi.join("、")}</Text>
                    )}
                    <View style={s.cardDivider} />
                    <Text style={s.cardMeaning}>
                      {currentCard?.meanings.slice(0, 3).join(" / ")}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              </View>

              {/* Trước / Sau */}
              <View style={s.navRow}>
                <TouchableOpacity style={s.navBtn} onPress={goPrev} activeOpacity={0.7}>
                  <Text style={s.navBtnText}>‹ Trước</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.navBtn} onPress={goNext} activeOpacity={0.7}>
                  <Text style={s.navBtnText}>Sau ›</Text>
                </TouchableOpacity>
              </View>

              {/* Danh sách bên dưới (nhấn để xem chi tiết) */}
              <Text style={s.listHeader}>Danh sách</Text>
              {filtered.map((it, idx) => (
                <TouchableOpacity
                  key={it.id}
                  style={s.row}
                  activeOpacity={0.7}
                  onPress={() =>
                    router.push({ pathname: "/kanji-detail", params: { id: it.id } })
                  }
                >
                  <View style={s.kanjiCol}>
                    <Text style={s.indexNum}>{idx + 1}.</Text>
                    <Text style={s.kanjiChar}>{it.kanji}</Text>
                  </View>
                  <View style={s.infoCol}>
                    <Text style={s.readings} numberOfLines={1}>
                      {[...it.kunyomi, ...it.onyomi].join("／") || "—"}
                    </Text>
                    <Text style={s.hanViet}>{it.hanViet}</Text>
                    <Text style={s.meaning} numberOfLines={2}>
                      {it.meanings[0] ?? ""}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}

          <View style={{ paddingHorizontal: 14, paddingTop: 4 }}>
            <FeedbackSection pageKey={`kanji::${level}`} />
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB: QUIZ                                                             */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {mode === "quiz" && (
        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
          {filtered.length < 4 ? (
            <View style={s.empty}>
              <Text style={s.emptyText}>Cần ít nhất 4 kanji để chơi quiz.</Text>
            </View>
          ) : quizDone ? (
            <View style={s.resultBox}>
              <Text style={s.resultEmoji}>{quizScore / filtered.length >= 0.8 ? "🎉" : "💪"}</Text>
              <Text style={s.resultTitle}>Kết quả Quiz</Text>
              <Text style={s.resultScore}>{quizScore} / {filtered.length}</Text>
              <Text style={s.resultPct}>{Math.round((quizScore / filtered.length) * 100)}%</Text>
              <TouchableOpacity style={s.retryBtn} onPress={resetQuiz} activeOpacity={0.8}>
                <Text style={s.retryBtnText}>Làm lại</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={s.counter}>{quizIdx + 1} / {filtered.length}</Text>
              <View style={s.quizCard}>
                <Text style={s.quizKanji}>{quizItem?.kanji}</Text>
                <Text style={s.quizHanViet}>{quizItem?.hanViet}</Text>
                <Text style={s.quizQuestion}>Nghĩa của chữ này là gì?</Text>
              </View>
              <View style={s.optionsWrap}>
                {quizOptions.map((opt) => {
                  const isChosen = quizAnswered === opt;
                  const isCorrect = opt === correctAnswer;
                  return (
                    <TouchableOpacity
                      key={opt}
                      style={[
                        s.optionBtn,
                        quizAnswered !== null && isCorrect && s.optionCorrect,
                        quizAnswered !== null && isChosen && !isCorrect && s.optionWrong,
                      ]}
                      onPress={() => handleAnswer(opt)}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          s.optionText,
                          quizAnswered !== null && isCorrect && s.optionTextCorrect,
                          quizAnswered !== null && isChosen && !isCorrect && s.optionTextWrong,
                        ]}
                      >
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={s.scoreHint}>Điểm: {quizScore} / {quizIdx}</Text>
            </>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB: LUYỆN VIẾT                                                       */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {mode === "writing" && (
        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
          {filtered.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyText}>Không tìm thấy Kanji phù hợp.</Text>
            </View>
          ) : (
            <>
              <Text style={s.counter}>{writeSafe + 1} / {filtered.length}</Text>
              <View style={s.writeCard}>
                <Text style={s.writeKanji}>{writeItem?.kanji}</Text>
                <Text style={s.writeHanViet}>{writeItem?.hanViet}</Text>
                {writeItem?.kunyomi.length > 0 && (
                  <Text style={s.writeReading}>訓 {writeItem.kunyomi.join("、")}</Text>
                )}
                {writeItem?.onyomi.length > 0 && (
                  <Text style={s.writeReading}>音 {writeItem.onyomi.join("、")}</Text>
                )}
                <Text style={s.writeMeaning}>
                  {writeItem?.meanings.slice(0, 2).join(" / ")}
                </Text>
                <View style={s.strokeWrap}>
                  <KanjiStrokeOrder kanji={writeItem?.kanji ?? ""} size={220} />
                </View>
                <Text style={s.strokeHint}>
                  Mỗi màu = 1 nét · Số bên cạnh là thứ tự viết (1 → {writeItem?.strokes})
                </Text>
              </View>
              <View style={s.navRow}>
                <TouchableOpacity
                  style={s.navBtn}
                  onPress={() => setWriteIdx((i) => Math.max(0, i - 1))}
                  activeOpacity={0.7}
                >
                  <Text style={s.navBtnText}>‹ Trước</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.navBtn}
                  onPress={() => setWriteIdx((i) => Math.min(filtered.length - 1, i + 1))}
                  activeOpacity={0.7}
                >
                  <Text style={s.navBtnText}>Sau ›</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f1f5f9" },

  // Header
  topBar: { backgroundColor: "transparent" },
  topBarInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  backIcon: { color: "#fff", fontSize: 32, fontWeight: "300", marginTop: -4 },
  titleBlock: { flex: 1, alignItems: "center" },
  topTitle: { color: "#fff", fontSize: 17, fontWeight: "800", textAlign: "center" },
  topSubtitle: { color: "rgba(255,255,255,0.82)", fontSize: 12, marginTop: 1 },

  // Tab bar
  tabBar: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e2e8f0",
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    backgroundColor: "#e2e8f0",
    borderRadius: 10,
    alignItems: "center",
  },
  tabActive: { backgroundColor: BLUE },
  tabText: { fontSize: 12, fontWeight: "600", color: "#475569" },
  tabTextActive: { color: "#fff" },

  // Search bar
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 14,
    marginVertical: 10,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    paddingHorizontal: 10,
  },
  searchIcon: { fontSize: 14, marginRight: 6, color: "#94a3b8" },
  searchInput: { flex: 1, height: 36, color: "#1a202c", fontSize: 14 },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 0 },

  counter: { textAlign: "center", color: "#64748b", fontSize: 13, marginBottom: 12 },

  // Flashcard
  cardWrap: { height: 240, marginBottom: 20 },
  card: { position: "absolute", width: "100%", height: 240, borderRadius: 20, backfaceVisibility: "hidden" },
  cardFront: {
    backgroundColor: "#fff",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  cardBack: {
    backgroundColor: "#4ECDC4",
    shadowColor: "#4ECDC4", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 4,
  },
  cardInner: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  cardKanji: { fontSize: 72, fontWeight: "700", color: RED, lineHeight: 82 },
  cardHanViet: { fontSize: 15, color: "#94a3b8", fontWeight: "700", letterSpacing: 1, marginTop: 4 },
  cardHint: { marginTop: 14, fontSize: 12, color: "#cbd5e1", fontStyle: "italic" },
  cardKanjiSm: { fontSize: 40, fontWeight: "700", color: "#fff", opacity: 0.9, marginBottom: 6 },
  cardReading: { fontSize: 14, color: "rgba(255,255,255,0.9)", marginBottom: 2, fontWeight: "500" },
  cardDivider: { width: 40, height: 1, backgroundColor: "rgba(255,255,255,0.4)", marginVertical: 8 },
  cardMeaning: { fontSize: 19, fontWeight: "800", color: "#fff", textAlign: "center" },

  listHeader: { fontSize: 13, fontWeight: "700", color: "#64748b", marginTop: 8, marginBottom: 6 },

  // Danh sách (flashcard tab)
  row: {
    flexDirection: "row", backgroundColor: "#fff",
    paddingVertical: 14, paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#e2e8f0",
  },
  kanjiCol: { width: 64, alignItems: "center", justifyContent: "center" },
  indexNum: { fontSize: 11, color: "#94a3b8", marginBottom: 2 },
  kanjiChar: { fontSize: 38, fontWeight: "700", color: RED, lineHeight: 44 },
  infoCol: { flex: 1, justifyContent: "center", paddingLeft: 6 },
  readings: { fontSize: 15, color: "#0f172a", fontWeight: "600", marginBottom: 2 },
  hanViet: { fontSize: 12, color: "#94a3b8", fontWeight: "700", letterSpacing: 0.5, marginBottom: 4 },
  meaning: { fontSize: 13, color: "#4ECDC4" },

  navRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  navBtn: {
    flex: 1, paddingVertical: 12, backgroundColor: "#fff",
    borderRadius: 12, alignItems: "center",
    borderWidth: 1.5, borderColor: "#e2e8f0",
  },
  navBtnText: { fontSize: 15, fontWeight: "700", color: "#334155" },

  // Quiz
  quizCard: {
    backgroundColor: "#fff", borderRadius: 20, padding: 28, alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  quizKanji: { fontSize: 68, fontWeight: "700", color: RED, lineHeight: 78 },
  quizHanViet: { fontSize: 13, color: "#94a3b8", fontWeight: "700", letterSpacing: 1, marginBottom: 6 },
  quizQuestion: { fontSize: 14, color: "#64748b" },
  optionsWrap: { gap: 10, marginBottom: 12 },
  optionBtn: {
    backgroundColor: "#fff", borderRadius: 12, paddingVertical: 14, paddingHorizontal: 18,
    borderWidth: 1.5, borderColor: "#e2e8f0",
  },
  optionCorrect: { backgroundColor: "#d1fae5", borderColor: "#10b981" },
  optionWrong: { backgroundColor: "#fee2e2", borderColor: "#ef4444" },
  optionText: { fontSize: 15, fontWeight: "600", color: "#334155", textAlign: "center" },
  optionTextCorrect: { color: "#065f46" },
  optionTextWrong: { color: "#991b1b" },
  scoreHint: { textAlign: "center", fontSize: 13, color: "#94a3b8", marginBottom: 8 },

  resultBox: {
    backgroundColor: "#fff", borderRadius: 20, padding: 32, alignItems: "center", marginTop: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  resultEmoji: { fontSize: 48, marginBottom: 12 },
  resultTitle: { fontSize: 18, fontWeight: "800", color: "#0f172a", marginBottom: 8 },
  resultScore: { fontSize: 52, fontWeight: "900", color: BLUE, lineHeight: 60 },
  resultPct: { fontSize: 20, color: "#64748b", marginBottom: 24 },
  retryBtn: { backgroundColor: BLUE, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 40 },
  retryBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  // Luyện viết
  writeCard: {
    backgroundColor: "#fff", borderRadius: 20, padding: 24, alignItems: "center", marginBottom: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  writeKanji: { fontSize: 52, fontWeight: "700", color: RED, lineHeight: 62 },
  writeHanViet: { fontSize: 13, color: "#94a3b8", fontWeight: "700", letterSpacing: 1, marginBottom: 4 },
  writeReading: { fontSize: 14, color: "#475569", marginBottom: 2 },
  writeMeaning: { fontSize: 16, fontWeight: "700", color: "#0f172a", marginBottom: 16, textAlign: "center" },
  strokeWrap: { alignItems: "center", marginVertical: 8 },
  strokeHint: { fontSize: 12, color: "#94a3b8", textAlign: "center", marginTop: 8 },

  // Common
  empty: { padding: 30, alignItems: "center" },
  emptyText: { color: "#64748b" },
});
