// ─────────────────────────────────────────────────────────────────────────────
// kanji.tsx
// Trang học Kanji theo cấp độ JLPT — có 3 chế độ học:
//   📇 Flashcard : thẻ lật (trước=kanji, sau=âm+nghĩa)
//   📝 Quiz      : trắc nghiệm 4 đáp án
//   ✍️ Luyện viết: xem thứ tự nét theo KanjiStrokeOrder
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
import { KanjiStrokeOrder } from "../components/KanjiStrokeOrder";

// Màu chủ đạo — xanh ngọc teal rgb(78,205,196), đồng bộ toàn app
const BLUE = "#4ECDC4";
// Màu đỏ dùng riêng cho chữ Kanji
const RED = "#E03131";
// Gradient header: từ trên #4ECDC4 xuống dưới #5e9a95
const GRAD = ["#4ECDC4", "#5e9a95"] as const;

type Mode = "flashcard" | "quiz" | "writing";

// ─── Helper: tạo 4 đáp án quiz ngẫu nhiên ────────────────────────────────────
function makeOptions(correct: KanjiItem, pool: KanjiItem[]): string[] {
  const others = pool
    .filter((k) => k.id !== correct.id)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map((k) => k.meanings[0] ?? k.hanViet);
  const opts = [correct.meanings[0] ?? correct.hanViet, ...others].sort(
    () => Math.random() - 0.5,
  );
  return opts;
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

  // ── Chế độ học ──────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<Mode>("flashcard");

  // ── Tìm kiếm (chỉ dùng trong chế độ list — hiện tại ẩn khi flashcard/quiz) ─
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

  // ── Flashcard state ─────────────────────────────────────────────────────────
  const [cardIdx, setCardIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;

  const safeIdx = Math.min(cardIdx, Math.max(0, filtered.length - 1));
  const current = filtered[safeIdx];

  const doFlip = useCallback(() => {
    Animated.spring(flipAnim, {
      toValue: flipped ? 0 : 1,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start(() => setFlipped((f) => !f));
  }, [flipped, flipAnim]);

  // Front xoay 0→90, Back xoay -90→0
  const frontRotate = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ["0deg", "90deg", "90deg"],
  });
  const backRotate = flipAnim.interpolate({
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

  // ── Quiz state ──────────────────────────────────────────────────────────────
  const [quizIdx, setQuizIdx] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizAnswered, setQuizAnswered] = useState<string | null>(null); // answer chosen
  const [quizDone, setQuizDone] = useState(false);

  const quizSafe = Math.min(quizIdx, Math.max(0, filtered.length - 1));
  const quizItem = filtered[quizSafe];
  const quizOptions = useMemo(
    () => (quizItem ? makeOptions(quizItem, filtered) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [quizSafe, filtered],
  );
  const correctAnswer = quizItem?.meanings[0] ?? quizItem?.hanViet ?? "";

  const handleQuizAnswer = (ans: string) => {
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

  // ── Writing (Luyện viết) state ──────────────────────────────────────────────
  const [writeIdx, setWriteIdx] = useState(0);
  const writeSafe = Math.min(writeIdx, Math.max(0, filtered.length - 1));
  const writeItem = filtered[writeSafe];

  // ── Đổi mode → reset chỉ số ─────────────────────────────────────────────────
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

      {/* ── Thanh trên cùng ── */}
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

        {/* Ô tìm kiếm — dùng chung cho mọi chế độ */}
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
            placeholderTextColor="#cbd5e1"
          />
        </View>
      </SafeAreaView>
      </LinearGradient>

      {/* ── Tab chọn chế độ ──────────────────────────────────────────────────── */}
      <View style={s.modeSwitch}>
        {(
          [
            { key: "flashcard", label: "📇 Flashcard" },
            { key: "quiz",      label: "📝 Quiz" },
            { key: "writing",   label: "✍️ Luyện viết" },
          ] as { key: Mode; label: string }[]
        ).map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[s.modeBtn, mode === key && s.modeActive]}
            onPress={() => switchMode(key)}
            activeOpacity={0.8}
          >
            <Text style={[s.modeBtnText, mode === key && s.modeBtnTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* CHẾ ĐỘ FLASHCARD                                                     */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {mode === "flashcard" && (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {filtered.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyText}>Không tìm thấy Kanji phù hợp.</Text>
            </View>
          ) : (
            <>
              {/* Bộ đếm */}
              <Text style={s.counter}>
                {safeIdx + 1} / {filtered.length}
              </Text>

              {/* Thẻ lật */}
              <View style={s.cardWrap}>
                {/* Mặt trước: chữ Kanji */}
                <Animated.View
                  style={[
                    s.card,
                    s.cardFront,
                    { transform: [{ rotateY: frontRotate }] },
                  ]}
                >
                  <TouchableOpacity
                    style={s.cardInner}
                    onPress={doFlip}
                    activeOpacity={0.85}
                  >
                    <Text style={s.cardKanji}>{current?.kanji}</Text>
                    <Text style={s.cardHanViet}>{current?.hanViet}</Text>
                    <Text style={s.cardHint}>Nhấn để xem âm & nghĩa</Text>
                  </TouchableOpacity>
                </Animated.View>

                {/* Mặt sau: âm + nghĩa */}
                <Animated.View
                  style={[
                    s.card,
                    s.cardBack,
                    { transform: [{ rotateY: backRotate }] },
                  ]}
                >
                  <TouchableOpacity
                    style={s.cardInner}
                    onPress={doFlip}
                    activeOpacity={0.85}
                  >
                    <Text style={s.cardKanjiSmall}>{current?.kanji}</Text>
                    {current?.kunyomi.length > 0 && (
                      <Text style={s.cardReading}>
                        訓 {current.kunyomi.join("、")}
                      </Text>
                    )}
                    {current?.onyomi.length > 0 && (
                      <Text style={s.cardReading}>
                        音 {current.onyomi.join("、")}
                      </Text>
                    )}
                    <View style={s.cardDivider} />
                    <Text style={s.cardMeaning}>
                      {current?.meanings.slice(0, 3).join(" / ")}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              </View>

              {/* Nút trước / sau */}
              <View style={s.navRow}>
                <TouchableOpacity
                  style={s.navBtn}
                  onPress={goPrev}
                  activeOpacity={0.7}
                >
                  <Text style={s.navBtnText}>‹ Trước</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.navBtn}
                  onPress={goNext}
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

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* CHẾ ĐỘ QUIZ                                                           */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {mode === "quiz" && (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {filtered.length < 4 ? (
            <View style={s.empty}>
              <Text style={s.emptyText}>
                Cần ít nhất 4 kanji để chơi quiz.
              </Text>
            </View>
          ) : quizDone ? (
            // ─── Màn hình kết quả ──────────────────────────────────────────
            <View style={s.resultBox}>
              <Text style={s.resultEmoji}>
                {quizScore / filtered.length >= 0.8 ? "🎉" : "💪"}
              </Text>
              <Text style={s.resultTitle}>Kết quả Quiz</Text>
              <Text style={s.resultScore}>
                {quizScore} / {filtered.length}
              </Text>
              <Text style={s.resultPct}>
                {Math.round((quizScore / filtered.length) * 100)}%
              </Text>
              <TouchableOpacity
                style={s.retryBtn}
                onPress={resetQuiz}
                activeOpacity={0.8}
              >
                <Text style={s.retryBtnText}>Làm lại</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // ─── Câu hỏi ──────────────────────────────────────────────────
            <>
              <Text style={s.counter}>
                {quizIdx + 1} / {filtered.length}
              </Text>

              {/* Thẻ câu hỏi */}
              <View style={s.quizCard}>
                <Text style={s.quizKanji}>{quizItem?.kanji}</Text>
                <Text style={s.quizHanViet}>{quizItem?.hanViet}</Text>
                <Text style={s.quizQuestion}>Nghĩa của chữ này là gì?</Text>
              </View>

              {/* 4 đáp án */}
              <View style={s.optionsWrap}>
                {quizOptions.map((opt) => {
                  const isChosen = quizAnswered === opt;
                  const isCorrect = opt === correctAnswer;
                  let btnStyle = s.optionBtn;
                  if (quizAnswered !== null) {
                    if (isCorrect)
                      btnStyle = { ...s.optionBtn, ...s.optionCorrect };
                    else if (isChosen)
                      btnStyle = { ...s.optionBtn, ...s.optionWrong };
                  }
                  return (
                    <TouchableOpacity
                      key={opt}
                      style={btnStyle}
                      onPress={() => handleQuizAnswer(opt)}
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

              {/* Điểm hiện tại */}
              <Text style={s.scoreHint}>
                Điểm: {quizScore} / {quizIdx}
              </Text>
            </>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* CHẾ ĐỘ LUYỆN VIẾT                                                    */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {mode === "writing" && (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {filtered.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyText}>Không tìm thấy Kanji phù hợp.</Text>
            </View>
          ) : (
            <>
              <Text style={s.counter}>
                {writeSafe + 1} / {filtered.length}
              </Text>

              <View style={s.writeCard}>
                {/* Thông tin chữ */}
                <Text style={s.writeKanji}>{writeItem?.kanji}</Text>
                <Text style={s.writeHanViet}>{writeItem?.hanViet}</Text>
                {writeItem?.kunyomi.length > 0 && (
                  <Text style={s.writeReading}>
                    訓 {writeItem.kunyomi.join("、")}
                  </Text>
                )}
                {writeItem?.onyomi.length > 0 && (
                  <Text style={s.writeReading}>
                    音 {writeItem.onyomi.join("、")}
                  </Text>
                )}
                <Text style={s.writeMeaning}>
                  {writeItem?.meanings.slice(0, 2).join(" / ")}
                </Text>

                {/* Thứ tự nét */}
                <View style={s.strokeWrap}>
                  <KanjiStrokeOrder kanji={writeItem?.kanji ?? ""} size={220} />
                </View>
                <Text style={s.strokeHint}>
                  Mỗi màu là 1 nét — số bên cạnh là thứ tự viết (1 →{" "}
                  {writeItem?.strokes})
                </Text>
              </View>

              {/* Nút trước / sau */}
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
                  onPress={() =>
                    setWriteIdx((i) =>
                      Math.min(filtered.length - 1, i + 1),
                    )
                  }
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

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f1f5f9" },

  // ── Top bar ────────────────────────────────────────────────────────────────
  topBar: { backgroundColor: "transparent" },
  topBarInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: { color: "#fff", fontSize: 32, fontWeight: "300", marginTop: -4 },
  titleBlock: { flex: 1, alignItems: "center" },
  topTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
  },
  topSubtitle: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 12,
    marginTop: 1,
  },

  // ── Tìm kiếm ──────────────────────────────────────────────────────────────
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
    marginBottom: 10,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  searchIcon: { fontSize: 14, marginRight: 6, color: "#fff" },
  searchInput: {
    flex: 1,
    height: 36,
    color: "#fff",
    fontSize: 14,
  },

  // ── Tab chế độ ────────────────────────────────────────────────────────────
  modeSwitch: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e2e8f0",
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 9,
    backgroundColor: "#e2e8f0",
    borderRadius: 10,
    alignItems: "center",
  },
  modeActive: { backgroundColor: BLUE },
  modeBtnText: { fontSize: 12, fontWeight: "600", color: "#475569" },
  modeBtnTextActive: { color: "#fff" },

  // ── Vùng cuộn chung ───────────────────────────────────────────────────────
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 0 },

  counter: {
    textAlign: "center",
    color: "#64748b",
    fontSize: 13,
    marginBottom: 12,
  },

  // ── Flashcard ─────────────────────────────────────────────────────────────
  cardWrap: {
    height: 260,
    marginBottom: 20,
    // perspective để flip nhìn đẹp hơn
  },
  card: {
    position: "absolute",
    width: "100%",
    height: 260,
    borderRadius: 20,
    backfaceVisibility: "hidden",
  },
  cardFront: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardBack: {
    backgroundColor: "#4ECDC4",
    shadowColor: "#4ECDC4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  cardInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  cardKanji: {
    fontSize: 80,
    fontWeight: "700",
    color: RED,
    lineHeight: 90,
  },
  cardHanViet: {
    fontSize: 16,
    color: "#94a3b8",
    fontWeight: "700",
    letterSpacing: 1,
    marginTop: 4,
  },
  cardHint: {
    marginTop: 16,
    fontSize: 12,
    color: "#cbd5e1",
    fontStyle: "italic",
  },
  cardKanjiSmall: {
    fontSize: 42,
    fontWeight: "700",
    color: "#fff",
    opacity: 0.9,
    marginBottom: 8,
  },
  cardReading: {
    fontSize: 15,
    color: "rgba(255,255,255,0.9)",
    marginBottom: 2,
    fontWeight: "500",
  },
  cardDivider: {
    width: 40,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.4)",
    marginVertical: 10,
  },
  cardMeaning: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
  },

  navRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  navBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
  },
  navBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#334155",
  },

  // ── Quiz ──────────────────────────────────────────────────────────────────
  quizCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  quizKanji: {
    fontSize: 72,
    fontWeight: "700",
    color: RED,
    lineHeight: 82,
  },
  quizHanViet: {
    fontSize: 14,
    color: "#94a3b8",
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 8,
  },
  quizQuestion: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 6,
  },
  optionsWrap: { gap: 10, marginBottom: 12 },
  optionBtn: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
  },
  optionCorrect: {
    backgroundColor: "#d1fae5",
    borderColor: "#10b981",
  },
  optionWrong: {
    backgroundColor: "#fee2e2",
    borderColor: "#ef4444",
  },
  optionText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#334155",
    textAlign: "center",
  },
  optionTextCorrect: { color: "#065f46" },
  optionTextWrong: { color: "#991b1b" },
  scoreHint: {
    textAlign: "center",
    fontSize: 13,
    color: "#94a3b8",
    marginBottom: 8,
  },

  // Kết quả quiz
  resultBox: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  resultEmoji: { fontSize: 48, marginBottom: 12 },
  resultTitle: { fontSize: 18, fontWeight: "800", color: "#0f172a", marginBottom: 8 },
  resultScore: { fontSize: 52, fontWeight: "900", color: BLUE, lineHeight: 60 },
  resultPct: { fontSize: 20, color: "#64748b", marginBottom: 24 },
  retryBtn: {
    backgroundColor: BLUE,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 40,
  },
  retryBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  // ── Luyện viết ────────────────────────────────────────────────────────────
  writeCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  writeKanji: {
    fontSize: 52,
    fontWeight: "700",
    color: RED,
    lineHeight: 62,
  },
  writeHanViet: {
    fontSize: 14,
    color: "#94a3b8",
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 4,
  },
  writeReading: {
    fontSize: 14,
    color: "#475569",
    marginBottom: 2,
  },
  writeMeaning: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 16,
    textAlign: "center",
  },
  strokeWrap: {
    alignItems: "center",
    marginVertical: 8,
  },
  strokeHint: {
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 8,
  },

  // ── Chung ─────────────────────────────────────────────────────────────────
  empty: { padding: 30, alignItems: "center" },
  emptyText: { color: "#64748b" },
});
