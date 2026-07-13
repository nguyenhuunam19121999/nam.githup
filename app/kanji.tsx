// ──────────────────────────────────────────────────────────
// // ─────────────────────────────────────────────────────────────────────────────
// // app/kanji.tsx
// // MÀN HÌNH DANH SÁCH KANJI - PHIÊN BẢN ĐIỀU HƯỚNG SANG FILE TĨNH KANJI-DETAIL
// // ─────────────────────────────────────────────────────────────────────────────

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { BottomTabBar } from "../components/BottomTabBar";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { getKanji, getKanjiByBook, type KanjiItem, getKunyomiFromFull } from "../assets/data_JLPT_kanji";
import { FeedbackSection } from "../components/FeedbackSection";
import { KanjiStrokeOrder } from "../components/KanjiStrokeOrder";
import { WritingPracticeModal } from "../components/WritingPracticeModal";
import { useAuth } from "../artifacts/mirai-jp/hooks/useAuth";

// const SCREEN_W = Dimensions.get("window").width;
const TEAL = "#1F6F7A";
const TEAL_DARK = "#1c5765";
const TEXT_COLOR = "#e47b0b";
// const bgrColor = "#f1f5f9";
// const textColor = "#1d4ed8";

type Mode = "list" | "quiz" | "writing";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeOptions(correct: KanjiItem, pool: KanjiItem[]): string[] {
  const answer = correct.meanings_vi[0] ?? correct.hanviet[0] ?? '';
  const others = pool
    .filter((k) => k.id !== correct.id)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map((k) => k.meanings_vi[0] ?? k.hanviet[0] ?? '');
  return [answer, ...others].sort(() => Math.random() - 0.5);
}

function StatsModal({
  visible, onClose, totalCount, bookmarkCount, onShowBookmarks, scopedKey,
}: {
  visible: boolean; onClose: () => void; totalCount: number;
  bookmarkCount: number; onShowBookmarks: () => void; scopedKey: (k: string) => string;
}) {
  const [stats, setStats] = useState({ bestScore: 0, totalPlayed: 0, avgScore: 0 });

  useEffect(() => {
    if (!visible) return;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(scopedKey("kanjiQuizStats"));
        if (raw) setStats(JSON.parse(raw));
        else setStats({ bestScore: 0, totalPlayed: 0, avgScore: 0 });
      } catch { /* ignore */ }
    })();
  }, [visible, scopedKey]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={ms.overlay}>
        <View style={ms.sheet}>
          <Text style={ms.title}>📊 Thống kê học Kanji</Text>
          <View style={ms.card}>
            <Text style={ms.cardValue}>{totalCount}</Text>
            <Text style={ms.cardLabel}>Tổng số chữ Kanji</Text>
          </View>
          <TouchableOpacity style={[ms.card, ms.cardTap]} activeOpacity={0.75}
            onPress={() => { onClose(); onShowBookmarks(); }}>
            <Text style={ms.cardValue}>⭐ {bookmarkCount}</Text>
            <Text style={[ms.cardLabel, ms.cardLabelHint]}>Chữ đã ghim · Nhấn để xem</Text>
          </TouchableOpacity>
          <View style={ms.divider} />
          <Text style={ms.sectionTitle}>🎯 Kết quả Quiz</Text>
          <View style={ms.row}><Text style={ms.rowLabel}>Điểm cao nhất:</Text><Text style={ms.rowVal}>{stats.bestScore}%</Text></View>
          <View style={ms.row}><Text style={ms.rowLabel}>Trung bình:</Text><Text style={ms.rowVal}>{stats.avgScore}%</Text></View>
          <View style={ms.row}><Text style={ms.rowLabel}>Đã chơi:</Text><Text style={ms.rowVal}>{stats.totalPlayed} lần</Text></View>
          <TouchableOpacity style={ms.closeBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={ms.closeBtnText}>Đóng</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function KanjiListScreen() {
  const router = useRouter();
  const { scopedKey } = useAuth();
  const params = useLocalSearchParams<{ level?: string; bookId?: string; title?: string; lesson?: string }>();
  // const params = useLocalSearchParams<{ level?: string; bookId?: string; title?: string; lesson?: string; week?: string }>();
  // const weekParam = typeof params.week === "string" ? parseInt(params.week, 10) : null;
  const level = (typeof params.level === "string" ? params.level : "N5").toUpperCase();
  const bookId = typeof params.bookId === "string" ? params.bookId : "";
  const lessonParam = typeof params.lesson === "string" ? parseInt(params.lesson, 10) : null;
  const title = typeof params.title === "string" && params.title ? params.title : `Học Kanji ${level}`;

  // const BASE: KanjiItem[] = useMemo(() => {
  // const all = bookId ? (getKanjiByBook(bookId) ?? getKanji(level)) : getKanji(level);
  //   if (weekParam !== null) return all.filter((k) => k.week === weekParam);
  //   if (lessonParam !== null) return all.filter((k) => (k as any).lesson === lessonParam);
  //   return all;
  // }, [bookId, level, lessonParam, weekParam]);

  const BASE: KanjiItem[] = useMemo(() => {
    const all = bookId ? (getKanjiByBook(bookId) ?? getKanji(level)) : getKanji(level);
    // Sau — lesson giờ đã là số bài toàn cục đúng từ getKanjiByBook:
    if (lessonParam !== null) return all.filter((k) => (k as any).lesson === lessonParam);  
    // if (lessonParam !== null) return all.filter((k) => k.week === lessonParam);
    return all;
  }, [bookId, level, lessonParam]);

  const [items, setItems] = useState<KanjiItem[]>([]);
  useEffect(() => { setItems([...BASE]); }, [BASE]);

  const [mode, setMode] = useState<Mode>("list");
  const [showStats, setShowStats] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [writingItem, setWritingItem] = useState<KanjiItem | null>(null);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const bmKey = bookId ? `kanjiBookmarks::${bookId}` : `kanjiBookmarks::${level}`;

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(scopedKey(bmKey));
        setBookmarks(raw ? new Set(JSON.parse(raw)) : new Set());
      } catch { /* ignore */ }
    })();
  }, [scopedKey, bmKey]);

  const saveBookmarks = async (bm: Set<string>) => {
    try { await AsyncStorage.setItem(scopedKey(bmKey), JSON.stringify([...bm])); } catch { /* ignore */ }
  };

  const toggleBookmark = (id: string) => {
    const next = new Set(bookmarks);
    if (next.has(id)) next.delete(id); else next.add(id);
    setBookmarks(next);
    saveBookmarks(next);
  };

  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    let base = showBookmarksOnly ? items.filter((it) => bookmarks.has(it.id ?? it.kanji)) : items;
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((it) => {
      if (
        it.kanji.includes(q) ||
        it.hanviet.some((h) => h.toLowerCase().includes(q)) ||
        it.meanings_vi.some((m) => m.toLowerCase().includes(q)) ||
        it.readings.onyomi.some((o) => o.includes(q))
      ) return true;

      // Tìm kunyomi đúng từ kanjifull — tra từng chữ đơn trong entry
      // vì kunyomi trong n5-n1 là âm đọc cả từ ghép, không phải từng chữ riêng.
      const chars = [...it.kanji.replace(/\s+/g, '')];
      return chars.some(char => {
        const kun = getKunyomiFromFull(char);
        return kun.some((k) => k.includes(q));
      });
    });
  }, [items, query, showBookmarksOnly, bookmarks]);
  // const filtered = useMemo(() => {
  //   let base = showBookmarksOnly ? items.filter((it) => bookmarks.has(it.id ?? it.kanji)) : items;
  //   const q = query.trim().toLowerCase();
  //   if (!q) return base;
  //   return base.filter((it) =>
  //     it.kanji.includes(q) ||
  //     it.hanviet.some((h) => h.toLowerCase().includes(q)) ||
  //     it.meanings_vi.some((m) => m.toLowerCase().includes(q)) ||
  //     it.readings.kunyomi.some((k) => k.includes(q)) ||
  //     it.readings.onyomi.some((o) => o.includes(q)),
  //   );
  // }, [items, query, showBookmarksOnly, bookmarks]);

  const [isShuffled, setIsShuffled] = useState(false);
  const doShuffle = () => { setItems(shuffle(BASE)); setIsShuffled(true); setQuery(""); setMenuOpen(false); Alert.alert("🔀 Xáo trộn", "Danh sách đã được xáo trộn!"); };
  const doReset = () => { setItems([...BASE]); setIsShuffled(false); setQuery(""); setMenuOpen(false); };

  const [quizIdx, setQuizIdx] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizAnswered, setQuizAnswered] = useState<string | null>(null);
  const [quizDone, setQuizDone] = useState(false);
  const quizSafe = Math.min(quizIdx, Math.max(0, filtered.length - 1));
  const quizItem = filtered[quizSafe];
  const quizOptions = useMemo(
    () => (quizItem && filtered.length >= 4 ? makeOptions(quizItem, filtered) : []),
    [quizSafe, filtered.length],
  );
  const correctAnswer = quizItem?.meanings_vi[0] ?? quizItem?.hanviet[0] ?? "";

  const saveQuizResult = async (finalScore: number, total: number) => {
    try {
      const raw = await AsyncStorage.getItem(scopedKey("kanjiQuizStats"));
      const cur = raw ? JSON.parse(raw) : { bestScore: 0, totalPlayed: 0, avgScore: 0 };
      const newTotal = cur.totalPlayed + 1;
      const pct = Math.round((finalScore / total) * 100);
      await AsyncStorage.setItem(scopedKey("kanjiQuizStats"), JSON.stringify({
        bestScore: Math.max(cur.bestScore, pct),
        totalPlayed: newTotal,
        avgScore: Math.round((cur.avgScore * cur.totalPlayed + pct) / newTotal),
      }));
    } catch { /* ignore */ }
  };

  const handleAnswer = (ans: string) => {
    if (quizAnswered !== null) return;
    const correct = ans === correctAnswer;
    setQuizAnswered(ans);
    if (correct) setQuizScore((s) => s + 1);
    setTimeout(() => {
      if (quizIdx + 1 >= filtered.length) {
        setQuizDone(true);
        saveQuizResult(quizScore + (correct ? 1 : 0), filtered.length);
      } else { setQuizIdx((i) => i + 1); setQuizAnswered(null); }
    }, 900);
  };

  const resetQuiz = () => { setQuizIdx(0); setQuizScore(0); setQuizAnswered(null); setQuizDone(false); };

  const [writeIdx, setWriteIdx] = useState(0);
  const writeSafe = Math.min(writeIdx, Math.max(0, filtered.length - 1));
  const writeItem = filtered[writeSafe];

  const switchMode = (m: Mode) => { setMode(m); setQuizIdx(0); setWriteIdx(0); resetQuiz(); };

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#f0f4f8" />
      <View style={s.headerRow}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={s.backBtnText}>‹</Text>
        </TouchableOpacity>
        <View style={s.titleBlock}>
          <Text style={s.headerTitle} numberOfLines={1}>{title}</Text>
          <Text style={s.headerSubtitle}>{BASE.length} chữ Kanji</Text>
        </View>
        <View style={s.headerBtns}>
          <TouchableOpacity style={s.headerActionBtn} onPress={() => setShowStats(true)} activeOpacity={0.8}>
            <Text style={s.statsBtnText}>📊</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.headerActionBtn} onPress={() => setMenuOpen(true)} activeOpacity={0.8}>
            <View style={s.menuLine} /><View style={s.menuLine} /><View style={s.menuLine} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.tabBar}>
        {/* {([{ key: "quiz", label: "📝 Quiz" }, { key: "writing", label: "✍️ Luyện viết" }] as { key: Mode; label: string }[]).map(({ key, label }) => ( */}
        {([{ key: "quiz", label: "📝 Quiz" }/*, { key: "writing", label: "✍️ Luyện viết" }*/] as { key: Mode; label: string }[]).map(({ key, label }) => (
          <TouchableOpacity key={key} style={[s.tabBtn, mode === key && s.tabActive]}
            onPress={() => switchMode(mode === key ? "list" : key)} activeOpacity={0.8}>
            <Text style={[s.tabText, mode === key && s.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {showBookmarksOnly && (
        <TouchableOpacity style={s.bookmarkBanner}
          onPress={() => { setShowBookmarksOnly(false); setQuizIdx(0); }} activeOpacity={0.85}>
          <Text style={s.bookmarkBannerText}>⭐ Đang xem {filtered.length} chữ đã ghim · Nhấn để xem tất cả</Text>
        </TouchableOpacity>
      )}

      {/* ── DANH SÁCH ── */}
      {mode === "list" && (
        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {filtered.length === 0 ? (
            <View style={s.empty}><Text style={s.emptyText}>Chưa có kanji nào phù hợp.</Text></View>
          ) : (
            filtered.map((it, idx) => (

              <TouchableOpacity
                // key={it.id ?? it.kanji}
                key={`${it.id ?? it.kanji}_${idx}`}
                style={s.row}
                activeOpacity={0.7}
                onPress={() =>
                  router.push({
                    pathname: "/kanji-detail",
                    params: {
                      id: it.kanji,
                      kanji: it.kanji,
                      kanjiChars: JSON.stringify([it.kanji]),
                      fromSearch: "lesson-list",
                    },
                  })
                }
              >
                <View style={s.rowMain}>
                  <View style={s.rowTopLine}>
                    <Text style={s.indexNum}>{idx + 1}.</Text>
                    <Text style={s.kanjiChar}>{it.kanji}</Text>
                  </View>
                  <Text style={s.hanViet}>{it.hanviet.join(' • ')}</Text>
                  <Text style={s.readings} numberOfLines={1}>
                    {it.readings.onyomi.join("／") || "—"}
                  </Text>
                  <Text style={s.meaning} numberOfLines={2}>{it.meanings_vi[0] ?? ""}</Text>
                </View>
                <View style={s.rowActions}>
                  {/* <TouchableOpacity style={s.writeBtn} onPress={() => setWritingItem(it)} hitSlop={8}>
                    <Text style={s.writeBtnIcon}>✏️</Text>
                  </TouchableOpacity> */}
                  <TouchableOpacity style={s.starBtn} onPress={() => toggleBookmark(it.id ?? it.kanji)} hitSlop={8}>
                    <Text style={s.starIcon}>{bookmarks.has(it.id ?? it.kanji) ? "⭐" : "☆"}</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>

              // <TouchableOpacity
              //   key={it.id ?? it.kanji}
              //   style={s.row}
              //   activeOpacity={0.7}
              //   onPress={() =>
              //     router.push({
              //       pathname: "/kanji-detail",
              //       params: {
              //         // ✅ QUAN TRỌNG: dùng it.kanji (ký tự thật) thay vì it.id (unicode)
              //         // Nếu kanji có nhiều chữ "握 金" thì tab sẽ tự tách và hiện đúng
              //         id: it.kanji,
              //       }
              //     })
              //   }
              // >
              //   {/* <View style={s.kanjiCol}>
              //     <Text style={s.indexNum}>{idx + 1}.</Text>
              //     <Text style={s.kanjiChar}>{it.kanji}</Text>
              //   </View> */}
              //   <View style={s.kanjiCol}>
              //     <Text style={s.indexNum}>{idx + 1}.</Text>
              //     <Text
              //       style={[s.kanjiChar, it.kanji.length >= 4 && s.kanjiCharSmall]}
              //       numberOfLines={1}
              //       adjustsFontSizeToFit
              //     >
              //       {it.kanji}
              //     </Text>
              //   </View>
              //   <View style={s.infoCol}>
              //     <Text style={s.readings} numberOfLines={1}>
              //       {[...it.readings.kunyomi, ...it.readings.onyomi].join("／") || "—"}
              //     </Text>
              //     <Text style={s.hanViet}>{it.hanviet.join(' • ')}</Text>
              //     <Text style={s.meaning} numberOfLines={2}>{it.meanings_vi[0] ?? ""}</Text>
              //   </View>
              //   <TouchableOpacity style={s.writeBtn} onPress={() => setWritingItem(it)} hitSlop={8}>
              //     <Text style={s.writeBtnIcon}>✏️</Text>
              //   </TouchableOpacity>
              //   <TouchableOpacity style={s.starBtn} onPress={() => toggleBookmark(it.id ?? it.kanji)} hitSlop={8}>
              //     <Text style={s.starIcon}>{bookmarks.has(it.id ?? it.kanji) ? "⭐" : "☆"}</Text>
              //   </TouchableOpacity>
              // </TouchableOpacity>
            ))
          )}
          <View style={{ paddingHorizontal: 14, paddingTop: 4 }}>
            <FeedbackSection pageKey={`kanji::${level}`} />
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ── QUIZ ── */}
      {mode === "quiz" && (
        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {filtered.length < 4 ? (
            <View style={s.empty}><Text style={s.emptyText}>Cần ít nhất 4 kanji để chơi quiz.</Text></View>
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
                <Text style={s.quizHanViet}>{quizItem?.hanviet.join(' • ')}</Text>
                <Text style={s.quizQuestion}>Nghĩa của chữ này là gì?</Text>
              </View>
              <View style={s.optionsWrap}>
                {quizOptions.map((opt, optIdx) => {
                  const isChosen = quizAnswered === opt;
                  const isCorrect = opt === correctAnswer;
                  return (
                    <TouchableOpacity key={`${opt}_${optIdx}`}
                      style={[s.optionBtn, quizAnswered !== null && isCorrect && s.optionCorrect,
                        quizAnswered !== null && isChosen && !isCorrect && s.optionWrong]}
                      onPress={() => handleAnswer(opt)} activeOpacity={0.75}>
                      <Text style={[s.optionText, quizAnswered !== null && isCorrect && s.optionTextCorrect,
                        quizAnswered !== null && isChosen && !isCorrect && s.optionTextWrong]}>{opt}</Text>
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

      {/* ── LUYỆN VIẾT ── */}
      {mode === "writing" && (
        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {filtered.length === 0 ? (
            <View style={s.empty}><Text style={s.emptyText}>Không tìm thấy Kanji phù hợp.</Text></View>
          ) : (
            <>
              <Text style={s.counter}>{writeSafe + 1} / {filtered.length}</Text>
              <View style={s.writeCard}>
                <Text style={s.writeKanji}>{writeItem?.kanji}</Text>
                <Text style={s.writeHanViet}>{writeItem?.hanviet.join(' • ')}</Text>
                {(() => {
                  const kun = writeItem ? getKunyomiFromFull(writeItem.kanji) : [];
                  return kun.length > 0
                    ? <Text style={s.writeReading}>訓 {kun.join("、")}</Text>
                    : null;
                })()}
                {/* {(writeItem?.readings.kunyomi.length ?? 0) > 0 && (
                  <Text style={s.writeReading}>訓 {writeItem!.readings.kunyomi.join("、")}</Text>
                )} */}
                {(writeItem?.readings.onyomi.length ?? 0) > 0 && (
                  <Text style={s.writeReading}>音 {writeItem!.readings.onyomi.join("、")}</Text>
                )}
                <Text style={s.writeMeaning}>{writeItem?.meanings_vi.slice(0, 2).join(" / ")}</Text>
                <View style={s.strokeWrap}>
                  <KanjiStrokeOrder kanji={writeItem?.kanji ?? ""} size={220} />
                </View>
                {/* <Text style={s.strokeHint}>Mỗi màu = 1 nét · Thứ tự viết: 1 → {writeItem?.strokes}</Text> */}
                <Text style={s.strokeHint}>Mỗi màu = 1 nét · Thứ tự viết: 1 → {writeItem?.strokes ?? "?"}</Text>
              </View>
              <View style={s.navRow}>
                <TouchableOpacity style={s.navBtn} onPress={() => setWriteIdx((i) => Math.max(0, i - 1))} activeOpacity={0.7}>
                  <Text style={s.navBtnText}>‹ Trước</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.navBtn} onPress={() => setWriteIdx((i) => Math.min(filtered.length - 1, i + 1))} activeOpacity={0.7}>
                  <Text style={s.navBtnText}>Sau ›</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      <WritingPracticeModal item={writingItem} onClose={() => setWritingItem(null)} />
      <StatsModal visible={showStats} onClose={() => setShowStats(false)} totalCount={BASE.length}
        bookmarkCount={bookmarks.size} onShowBookmarks={() => { setShowBookmarksOnly(true); setMode("list"); setQuizIdx(0); }}
        scopedKey={scopedKey} />

      <Modal visible={menuOpen} transparent animationType="slide" onRequestClose={() => setMenuOpen(false)}>
        <View style={ms.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuOpen(false)} />
          <View style={ms.sheet}>
            <View style={ms.handle} />
            <View style={ms.sheetHeader}>
              <Text style={ms.sheetTitle}>Tuỳ chọn</Text>
              <TouchableOpacity onPress={() => setMenuOpen(false)} hitSlop={10}>
                <Text style={ms.sheetClose}>Đóng</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={ms.menuItem} onPress={doShuffle} activeOpacity={0.75}>
              <Text style={ms.menuItemIcon}>🔀</Text>
              <Text style={ms.menuItemText}>Xáo trộn danh sách</Text>
              {isShuffled && <Text style={ms.menuItemBadge}>Đang xáo</Text>}
            </TouchableOpacity>
            {isShuffled && (
              <TouchableOpacity style={ms.menuItem} onPress={doReset} activeOpacity={0.75}>
                <Text style={ms.menuItemIcon}>↩️</Text>
                <Text style={ms.menuItemText}>Đặt lại thứ tự gốc</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={ms.menuItem}
              onPress={() => { setShowBookmarksOnly((v) => !v); setMode("list"); setMenuOpen(false); }}
              activeOpacity={0.75}>
              <Text style={ms.menuItemIcon}>⭐</Text>
              <Text style={ms.menuItemText}>{showBookmarksOnly ? "Xem tất cả chữ" : "Chỉ xem chữ đã ghim"}</Text>
              {bookmarks.size > 0 && <Text style={ms.menuItemBadge}>{bookmarks.size}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <BottomTabBar />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f0f4f8" },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12, backgroundColor: "#f0f4f8" },
  backBtn: { width: 42, height: 42, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1.5, borderColor: "#e2e8f0", alignItems: "center", justifyContent: "center", marginRight: 10 },
  backBtnText: { fontSize: 28, color: TEAL, lineHeight: 30 },
  titleBlock: { flex: 1, marginRight: 10 },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#2d3748", marginBottom: 3 },
  headerSubtitle: { fontSize: 13, color: "#718096" },
  headerBtns: { flexDirection: "row", gap: 8, alignItems: "center" },
  headerActionBtn: { width: 42, height: 42, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1.5, borderColor: "#e2e8f0", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 6, elevation: 3 },
  statsBtnText: { fontSize: 20 },
  menuLine: { width: 20, height: 2, backgroundColor: "#1e293b", borderRadius: 2, marginVertical: 2 },
  searchRow: { paddingHorizontal: 14, paddingBottom: 8, backgroundColor: "#f0f4f8" },
  searchInput: { backgroundColor: "#fff", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: "#1e293b", borderWidth: 1, borderColor: "#e2e8f0" },
  tabBar: { flexDirection: "row", gap: 8, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: "#fff", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#e2e8f0" },
  tabBtn: { flex: 1, paddingVertical: 9, backgroundColor: "#e2e8f0", borderRadius: 10, alignItems: "center" },
  tabActive: { backgroundColor: TEAL_DARK },
  tabText: { fontSize: 13, fontWeight: "600", color: "#475569" },
  tabTextActive: { color: "#fff" },
  bookmarkBanner: { marginHorizontal: 14, marginBottom: 6, paddingVertical: 9, paddingHorizontal: 14, backgroundColor: "#fefce8", borderRadius: 10, borderWidth: 1, borderColor: "#fde047" },
  bookmarkBannerText: { color: "#854d0e", fontSize: 13, fontWeight: "600" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4 },
  counter: { textAlign: "center", color: "#64748b", fontSize: 13, marginBottom: 12, marginTop: 8 },
  // row: { flexDirection: "row", backgroundColor: "#fff", paddingVertical: 12, paddingHorizontal: 14, alignItems: "center", borderRadius: 12, marginBottom: 8 },
  // kanjiCol: { width: 60, alignItems: "center", justifyContent: "center" },
  // indexNum: { fontSize: 14, color: TEXT_COLOR, marginBottom: 2 },
  // kanjiChar: { fontSize: 36, fontWeight: "700", color: TEAL_DARK, lineHeight: 42 },

  row: { flexDirection: "row", backgroundColor: "#fff", paddingVertical: 12, paddingHorizontal: 14, alignItems: "flex-start", borderRadius: 12, marginBottom: 8 },
  rowMain: { flex: 1 },
  rowTopLine: { flexDirection: "row", alignItems: "baseline", marginBottom: 4 },
  indexNum: { fontSize: 14, color: TEXT_COLOR, marginRight: 8 },
  kanjiChar: { fontSize: 20, fontWeight: "700", color: TEAL_DARK },
  readings: { fontSize: 16, color: TEAL_DARK, fontWeight: "600", marginBottom: 2 },
  hanViet: { fontSize: 14, color: TEAL, fontWeight: "700", letterSpacing: 0.5, marginBottom: 3 },
  meaning: { fontSize: 14, color: TEAL },
  rowActions: { flexDirection: "row", alignItems: "center", marginLeft: 8 },
  writeBtn: { padding: 6, marginRight: 2 },
  writeBtnIcon: { fontSize: 18 },
  starBtn: { padding: 6 },
  starIcon: { fontSize: 20 },

  kanjiCol: { minWidth: 60, maxWidth: 110, alignItems: "center", justifyContent: "center" },
  // indexNum: { fontSize: 14, color: TEXT_COLOR, marginBottom: 2 },
  // kanjiChar: { fontSize: 36, fontWeight: "700", color: TEAL_DARK, lineHeight: 42 },
  // kanjiCharSmall: { fontSize: 22, lineHeight: 26 },
  // infoCol: { flex: 1, justifyContent: "center", paddingLeft: 6 },
  // readings: { fontSize: 16, color: TEAL_DARK, fontWeight: "600", marginBottom: 2 },
  // hanViet: { fontSize: 14, color: TEAL, fontWeight: "700", letterSpacing: 0.5, marginBottom: 3 },
  // meaning: { fontSize: 14, color: TEAL },
  // writeBtn: { padding: 6, marginRight: 2 },
  // writeBtnIcon: { fontSize: 18 },
  // starBtn: { padding: 6 },
  // starIcon: { fontSize: 20 },
  quizCard: { backgroundColor: "#fff", borderRadius: 20, padding: 28, alignItems: "center", marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  quizKanji: { fontSize: 68, fontWeight: "700", color: TEAL_DARK, lineHeight: 78 },
  quizHanViet: { fontSize: 13, color: "#94a3b8", fontWeight: "700", letterSpacing: 1, marginBottom: 6 },
  quizQuestion: { fontSize: 14, color: "#64748b" },
  optionsWrap: { gap: 10, marginBottom: 12 },
  optionBtn: { backgroundColor: "#fff", borderRadius: 12, paddingVertical: 14, paddingHorizontal: 18, borderWidth: 1.5, borderColor: "#e2e8f0" },
  optionCorrect: { backgroundColor: "#d1fae5", borderColor: "#10b981" },
  optionWrong: { backgroundColor: "#fee2e2", borderColor: "#ef4444" },
  optionText: { fontSize: 15, fontWeight: "600", color: "#334155", textAlign: "center" },
  optionTextCorrect: { color: "#065f46" },
  optionTextWrong: { color: "#991b1b" },
  scoreHint: { textAlign: "center", fontSize: 13, color: "#94a3b8", marginBottom: 8 },
  resultBox: { backgroundColor: "#fff", borderRadius: 20, padding: 32, alignItems: "center", marginTop: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  resultEmoji: { fontSize: 48, marginBottom: 12 },
  resultTitle: { fontSize: 18, fontWeight: "800", color: "#0f172a", marginBottom: 8 },
  resultScore: { fontSize: 52, fontWeight: "900", color: TEAL, lineHeight: 60 },
  resultPct: { fontSize: 20, color: "#64748b", marginBottom: 24 },
  retryBtn: { backgroundColor: TEAL, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 40 },
  retryBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  writeCard: { backgroundColor: "#fff", borderRadius: 20, padding: 24, alignItems: "center", marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  writeKanji: { fontSize: 52, fontWeight: "700", color: TEAL_DARK, lineHeight: 62 },
  writeHanViet: { fontSize: 16, color: TEXT_COLOR, fontWeight: "700", letterSpacing: 1, marginBottom: 4 },
  writeReading: { fontSize: 16, color: TEAL, marginBottom: 2 },
  writeMeaning: { fontSize: 16, fontWeight: "700", color: TEAL_DARK, marginBottom: 16, textAlign: "center" },
  strokeWrap: { alignItems: "center", marginVertical: 8,width:"100%" },
  strokeHint: { fontSize: 12, color: TEXT_COLOR, textAlign: "center", marginTop: 8 },
  navRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  navBtn: { flex: 1, paddingVertical: 12, backgroundColor: "#fff", borderRadius: 12, alignItems: "center", borderWidth: 1.5, borderColor: "#e2e8f0" },
  navBtnText: { fontSize: 15, fontWeight: "700", color: TEAL_DARK },
  empty: { padding: 30, alignItems: "center" },
  emptyText: { color: TEAL_DARK, fontSize: 16, fontWeight: "600" },
});

const ms = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 36, paddingTop: 12 },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: "#e2e8f0", marginBottom: 16 },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  sheetTitle: { fontSize: 17, fontWeight: "800", color: "#0f172a" },
  sheetClose: { fontSize: 15, color: TEAL, fontWeight: "600" },
  title: { fontSize: 18, fontWeight: "800", color: "#0f172a", marginBottom: 16, textAlign: "center" },
  card: { backgroundColor: "#f1f5f9", borderRadius: 14, padding: 16, alignItems: "center", marginBottom: 10 },
  cardTap: { borderWidth: 1.5, borderColor: "#fde047", backgroundColor: "#fefce8" },
  cardValue: { fontSize: 28, fontWeight: "900", color: "#0f172a" },
  cardLabel: { fontSize: 13, color: "#64748b", marginTop: 4 },
  cardLabelHint: { color: "#854d0e" },
  divider: { height: 1, backgroundColor: "#e2e8f0", marginVertical: 14 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#0f172a", marginBottom: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  rowLabel: { fontSize: 14, color: "#475569" },
  rowVal: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  closeBtn: { backgroundColor: TEAL, borderRadius: 14, paddingVertical: 13, alignItems: "center", marginTop: 18 },
  closeBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  menuItem: { flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#e2e8f0" },
  menuItemIcon: { fontSize: 20, marginRight: 12 },
  menuItemText: { flex: 1, fontSize: 15, color: "#0f172a", fontWeight: "500" },
  menuItemBadge: { backgroundColor: TEAL, color: "#fff", fontSize: 12, fontWeight: "700", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
});

