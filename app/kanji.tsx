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

import {
  getKanji,
  getKanjiByBook,
  type KanjiItem,
  getKunyomiFromFull,
} from "../assets/data_JLPT_kanji";
import { FeedbackSection } from "../components/FeedbackSection";
import { KanjiStrokeOrder } from "../components/KanjiStrokeOrder";
import { WritingPracticeModal } from "../components/WritingPracticeModal";
import { AdBanner } from "../components/AdBanner";
import { useAuth } from "../artifacts/mirai-jp/hooks/useAuth";
import { useColors, useThemeMode, ThemeFadeOverlay } from "../artifacts/mirai-jp/hooks/useColors";
import type { ColorTokens } from "../artifacts/mirai-jp/constants/colors";

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
  const answer = correct.meanings_vi[0] ?? correct.hanviet[0] ?? "";
  const others = pool
    .filter((k) => k.id !== correct.id)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map((k) => k.meanings_vi[0] ?? k.hanviet[0] ?? "");
  return [answer, ...others].sort(() => Math.random() - 0.5);
}

function StatsModal({
  visible,
  onClose,
  totalCount,
  bookmarkCount,
  onShowBookmarks,
  scopedKey,
}: {
  visible: boolean;
  onClose: () => void;
  totalCount: number;
  bookmarkCount: number;
  onShowBookmarks: () => void;
  scopedKey: (k: string) => string;
}) {
  const c = useColors(); // bảng màu hiện tại — tự đổi theo giờ / lựa chọn người dùng
  const [stats, setStats] = useState({
    bestScore: 0,
    totalPlayed: 0,
    avgScore: 0,
  });

  useEffect(() => {
    if (!visible) return;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(scopedKey("kanjiQuizStats"));
        if (raw) setStats(JSON.parse(raw));
        else setStats({ bestScore: 0, totalPlayed: 0, avgScore: 0 });
      } catch {
        /* ignore */
      }
    })();
  }, [visible, scopedKey]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={[ms.overlay, { backgroundColor: "rgba(0,0,0,0.45)" }]}>
        <View style={[ms.sheet, { backgroundColor: c.card }]}>
          <Text style={[ms.title, { color: c.text }]}>📊 Thống kê học Kanji</Text>
          <View style={[ms.card, { backgroundColor: c.muted }]}>
            <Text style={[ms.cardValue, { color: c.text }]}>{totalCount}</Text>
            <Text style={[ms.cardLabel, { color: c.mutedForeground }]}>Tổng số chữ Kanji</Text>
          </View>
          <TouchableOpacity
            style={[
              ms.card,
              ms.cardTap,
              { backgroundColor: c.accent + "1a", borderColor: c.accent },
            ]}
            activeOpacity={0.75}
            onPress={() => {
              onClose();
              onShowBookmarks();
            }}
          >
            <Text style={[ms.cardValue, { color: c.text }]}>⭐ {bookmarkCount}</Text>
            <Text style={[ms.cardLabel, ms.cardLabelHint, { color: c.accentForeground === "#ffffff" ? c.text : c.accentForeground }]}>
              Chữ đã ghim · Nhấn để xem
            </Text>
          </TouchableOpacity>
          <View style={[ms.divider, { backgroundColor: c.border }]} />
          <Text style={[ms.sectionTitle, { color: c.text }]}>🎯 Kết quả Quiz</Text>
          <View style={ms.row}>
            <Text style={[ms.rowLabel, { color: c.mutedForeground }]}>Điểm cao nhất:</Text>
            <Text style={[ms.rowVal, { color: c.text }]}>{stats.bestScore}%</Text>
          </View>
          <View style={ms.row}>
            <Text style={[ms.rowLabel, { color: c.mutedForeground }]}>Trung bình:</Text>
            <Text style={[ms.rowVal, { color: c.text }]}>{stats.avgScore}%</Text>
          </View>
          <View style={ms.row}>
            <Text style={[ms.rowLabel, { color: c.mutedForeground }]}>Đã chơi:</Text>
            <Text style={[ms.rowVal, { color: c.text }]}>{stats.totalPlayed} lần</Text>
          </View>
          <TouchableOpacity
            style={[ms.closeBtn, { backgroundColor: c.primary }]}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={[ms.closeBtnText, { color: c.primaryForeground }]}>Đóng</Text>
          </TouchableOpacity>
        </View>
        <ThemeFadeOverlay />
      </View>
    </Modal>
  );
}

export default function KanjiListScreen() {
  const c = useColors(); 
  const { themeMode, timeOfDay } = useThemeMode();
  const isDark = themeMode === "dark" || (themeMode === "auto" && timeOfDay === "night");
  const router = useRouter();
  const { scopedKey } = useAuth();
  const params = useLocalSearchParams<{
    level?: string;
    bookId?: string;
    title?: string;
    lesson?: string;
  }>();
  const level = (
    typeof params.level === "string" ? params.level : "N5"
  ).toUpperCase();
  const bookId = typeof params.bookId === "string" ? params.bookId : "";
  const lessonParam =
    typeof params.lesson === "string" ? parseInt(params.lesson, 10) : null;
  const title =
    typeof params.title === "string" && params.title
      ? params.title
      : `Học Kanji ${level}`;

  const BASE: KanjiItem[] = useMemo(() => {
    const all = bookId
      ? (getKanjiByBook(bookId) ?? getKanji(level))
      : getKanji(level);
    if (lessonParam !== null)
      return all.filter((k) => (k as any).lesson === lessonParam);
    return all;
  }, [bookId, level, lessonParam]);

  const [items, setItems] = useState<KanjiItem[]>([]);
  useEffect(() => {
    setItems([...BASE]);
  }, [BASE]);

  const [mode, setMode] = useState<Mode>("list");
  const [showStats, setShowStats] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [writingItem, setWritingItem] = useState<KanjiItem | null>(null);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const bmKey = bookId
    ? `kanjiBookmarks::${bookId}`
    : `kanjiBookmarks::${level}`;

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(scopedKey(bmKey));
        setBookmarks(raw ? new Set(JSON.parse(raw)) : new Set());
      } catch {
        /* ignore */
      }
    })();
  }, [scopedKey, bmKey]);

  const saveBookmarks = async (bm: Set<string>) => {
    try {
      await AsyncStorage.setItem(scopedKey(bmKey), JSON.stringify([...bm]));
    } catch {
      /* ignore */
    }
  };

  const toggleBookmark = (id: string) => {
    const next = new Set(bookmarks);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setBookmarks(next);
    saveBookmarks(next);
  };

  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    let base = showBookmarksOnly
      ? items.filter((it) => bookmarks.has(it.id ?? it.kanji))
      : items;
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((it) => {
      if (
        it.kanji.includes(q) ||
        it.hanviet.some((h) => h.toLowerCase().includes(q)) ||
        it.meanings_vi.some((m) => m.toLowerCase().includes(q)) ||
        it.readings.onyomi.some((o) => o.includes(q))
      )
        return true;

      const chars = [...it.kanji.replace(/\s+/g, "")];
      return chars.some((char) => {
        const kun = getKunyomiFromFull(char);
        return kun.some((k) => k.includes(q));
      });
    });
  }, [items, query, showBookmarksOnly, bookmarks]);

  const [isShuffled, setIsShuffled] = useState(false);
  const doShuffle = () => {
    setItems(shuffle(BASE));
    setIsShuffled(true);
    setQuery("");
    setMenuOpen(false);
    Alert.alert("🔀 Xáo trộn", "Danh sách đã được xáo trộn!");
  };
  const doReset = () => {
    setItems([...BASE]);
    setIsShuffled(false);
    setQuery("");
    setMenuOpen(false);
  };

  const [quizIdx, setQuizIdx] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizAnswered, setQuizAnswered] = useState<string | null>(null);
  const [quizDone, setQuizDone] = useState(false);
  const quizSafe = Math.min(quizIdx, Math.max(0, filtered.length - 1));
  const quizItem = filtered[quizSafe];
  const quizOptions = useMemo(
    () =>
      quizItem && filtered.length >= 4 ? makeOptions(quizItem, filtered) : [],
    [quizSafe, filtered.length],
  );
  const correctAnswer = quizItem?.meanings_vi[0] ?? quizItem?.hanviet[0] ?? "";

  const saveQuizResult = async (finalScore: number, total: number) => {
    try {
      const raw = await AsyncStorage.getItem(scopedKey("kanjiQuizStats"));
      const cur = raw
        ? JSON.parse(raw)
        : { bestScore: 0, totalPlayed: 0, avgScore: 0 };
      const newTotal = cur.totalPlayed + 1;
      const pct = Math.round((finalScore / total) * 100);
      await AsyncStorage.setItem(
        scopedKey("kanjiQuizStats"),
        JSON.stringify({
          bestScore: Math.max(cur.bestScore, pct),
          totalPlayed: newTotal,
          avgScore: Math.round(
            (cur.avgScore * cur.totalPlayed + pct) / newTotal,
          ),
        }),
      );
    } catch {
      /* ignore */
    }
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

  const [writeIdx, setWriteIdx] = useState(0);
  const writeSafe = Math.min(writeIdx, Math.max(0, filtered.length - 1));
  const writeItem = filtered[writeSafe];

  const switchMode = (m: Mode) => {
    setMode(m);
    setQuizIdx(0);
    setWriteIdx(0);
    resetQuiz();
  };

  return (
    <View style={[s.root, { backgroundColor: c.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={c.background} />
      <View style={[s.headerRow, { backgroundColor: c.background }]}>
        <TouchableOpacity
          style={[s.backBtn, { backgroundColor: c.card, borderColor: c.border }]}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={[s.backBtnText, { color: c.primary }]}>‹</Text>
        </TouchableOpacity>
        <View style={s.titleBlock}>
          <Text style={[s.headerTitle, { color: c.text }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[s.headerSubtitle, { color: c.mutedForeground }]}>{BASE.length} chữ Kanji</Text>
        </View>
        <View style={s.headerBtns}>
          <TouchableOpacity
            style={[s.headerActionBtn, { backgroundColor: c.card, borderColor: c.border }]}
            onPress={() => setShowStats(true)}
            activeOpacity={0.8}
          >
            <Text style={s.statsBtnText}>📊</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.headerActionBtn, { backgroundColor: c.card, borderColor: c.border }]}
            onPress={() => setMenuOpen(true)}
            activeOpacity={0.8}
          >
            <View style={[s.menuLine, { backgroundColor: c.text }]} />
            <View style={[s.menuLine, { backgroundColor: c.text }]} />
            <View style={[s.menuLine, { backgroundColor: c.text }]} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[s.tabBar, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        {(
          [
            {
              key: "quiz",
              label: "📝 Quiz",
            } /*, { key: "writing", label: "✍️ Luyện viết" }*/,
          ] as { key: Mode; label: string }[]
        ).map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[
              s.tabBtn,
              { backgroundColor: c.muted },
              mode === key && { backgroundColor: c.primary },
            ]}
            onPress={() => switchMode(mode === key ? "list" : key)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                s.tabText,
                { color: c.mutedForeground },
                mode === key && { color: c.primaryForeground },
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {showBookmarksOnly && (
        <TouchableOpacity
          style={[
            s.bookmarkBanner,
            { backgroundColor: c.accent + "1a", borderColor: c.accent },
          ]}
          onPress={() => {
            setShowBookmarksOnly(false);
            setQuizIdx(0);
          }}
          activeOpacity={0.85}
        >
          <Text style={[s.bookmarkBannerText, { color: c.text }]}>
            ⭐ Đang xem {filtered.length} chữ đã ghim · Nhấn để xem tất cả
          </Text>
        </TouchableOpacity>
      )}

      {/* ── DANH SÁCH ── */}
      {mode === "list" && (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {filtered.length === 0 ? (
            <View style={s.empty}>
              <Text style={[s.emptyText, { color: c.text }]}>Chưa có kanji nào phù hợp.</Text>
            </View>
          ) : (
            filtered.map((it, idx) => (
              <TouchableOpacity
                key={`${it.id ?? it.kanji}_${idx}`}
                style={[s.row, { backgroundColor: c.card }]}
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
                    <Text style={[s.indexNum, { color: c.mutedForeground }]}>{idx + 1}.</Text>
                    <Text style={[s.kanjiChar, { color: c.text }]}>{it.kanji}</Text>
                  </View>
                  <Text style={[s.hanViet, { color: c.primary }]}>{it.hanviet.join(" • ")}</Text>
                  <Text style={[s.readings, { color: c.text }]} numberOfLines={1}>
                    {it.readings.onyomi.join("／") || "—"}
                  </Text>
                  <Text style={[s.meaning, { color: c.mutedForeground }]} numberOfLines={2}>
                    {it.meanings_vi[0] ?? ""}
                  </Text>
                </View>
                <View style={s.rowActions}>
                  <TouchableOpacity
                    style={s.starBtn}
                    onPress={() => toggleBookmark(it.id ?? it.kanji)}
                    hitSlop={8}
                  >
                    <Text style={s.starIcon}>
                      {bookmarks.has(it.id ?? it.kanji) ? "⭐" : "☆"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
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
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {filtered.length < 4 ? (
            <View style={s.empty}>
              <Text style={[s.emptyText, { color: c.text }]}>Cần ít nhất 4 kanji để chơi quiz.</Text>
            </View>
          ) : quizDone ? (
            <View style={[s.resultBox, { backgroundColor: c.card }]}>
              <Text style={s.resultEmoji}>
                {quizScore / filtered.length >= 0.8 ? "🎉" : "💪"}
              </Text>
              <Text style={[s.resultTitle, { color: c.text }]}>Kết quả Quiz</Text>
              <Text style={[s.resultScore, { color: c.primary }]}>
                {quizScore} / {filtered.length}
              </Text>
              <Text style={[s.resultPct, { color: c.mutedForeground }]}>
                {Math.round((quizScore / filtered.length) * 100)}%
              </Text>
              <TouchableOpacity
                style={[s.retryBtn, { backgroundColor: c.primary }]}
                onPress={resetQuiz}
                activeOpacity={0.8}
              >
                <Text style={[s.retryBtnText, { color: c.primaryForeground }]}>Làm lại</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={[s.counter, { color: c.mutedForeground }]}>
                {quizIdx + 1} / {filtered.length}
              </Text>
              <View style={[s.quizCard, { backgroundColor: c.card }]}>
                <Text style={[s.quizKanji, { color: c.text }]}>{quizItem?.kanji}</Text>
                <Text style={[s.quizHanViet, { color: c.mutedForeground }]}>
                  {quizItem?.hanviet.join(" • ")}
                </Text>
                <Text style={[s.quizQuestion, { color: c.mutedForeground }]}>Nghĩa của chữ này là gì?</Text>
              </View>
              <View style={s.optionsWrap}>
                {quizOptions.map((opt, optIdx) => {
                  const isChosen = quizAnswered === opt;
                  const isCorrect = opt === correctAnswer;
                  return (
                    <TouchableOpacity
                      key={`${opt}_${optIdx}`}
                      style={[
                        s.optionBtn,
                        { backgroundColor: c.card, borderColor: c.border },
                        quizAnswered !== null && isCorrect && s.optionCorrect,
                        quizAnswered !== null &&
                          isChosen &&
                          !isCorrect && [
                            s.optionWrong,
                            { backgroundColor: c.destructive + "1a", borderColor: c.destructive },
                          ],
                      ]}
                      onPress={() => handleAnswer(opt)}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          s.optionText,
                          { color: c.text },
                          quizAnswered !== null &&
                            isCorrect &&
                            s.optionTextCorrect,
                          quizAnswered !== null &&
                            isChosen &&
                            !isCorrect && [
                              s.optionTextWrong,
                              { color: c.destructive },
                            ],
                        ]}
                      >
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={[s.scoreHint, { color: c.mutedForeground }]}>
                Điểm: {quizScore} / {quizIdx}
              </Text>
            </>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ── LUYỆN VIẾT ── */}
      {mode === "writing" && (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {filtered.length === 0 ? (
            <View style={s.empty}>
              <Text style={[s.emptyText, { color: c.text }]}>Không tìm thấy Kanji phù hợp.</Text>
            </View>
          ) : (
            <>
              <Text style={[s.counter, { color: c.mutedForeground }]}>
                {writeSafe + 1} / {filtered.length}
              </Text>
              <View style={[s.writeCard, { backgroundColor: c.card }]}>
                <Text style={[s.writeKanji, { color: c.text }]}>{writeItem?.kanji}</Text>
                <Text style={[s.writeHanViet, { color: c.primary }]}>
                  {writeItem?.hanviet.join(" • ")}
                </Text>
                {(() => {
                  const kun = writeItem
                    ? getKunyomiFromFull(writeItem.kanji)
                    : [];
                  return kun.length > 0 ? (
                    <Text style={[s.writeReading, { color: c.text }]}>訓 {kun.join("、")}</Text>
                  ) : null;
                })()}
                {(writeItem?.readings.onyomi.length ?? 0) > 0 && (
                  <Text style={[s.writeReading, { color: c.text }]}>
                    音 {writeItem!.readings.onyomi.join("、")}
                  </Text>
                )}
                <Text style={[s.writeMeaning, { color: c.text }]}>
                  {writeItem?.meanings_vi.slice(0, 2).join(" / ")}
                </Text>
                <View style={s.strokeWrap}>
                  <KanjiStrokeOrder kanji={writeItem?.kanji ?? ""} size={220} />
                </View>
                <Text style={[s.strokeHint, { color: c.mutedForeground }]}>
                  Mỗi màu = 1 nét · Thứ tự viết: 1 → {writeItem?.strokes ?? "?"}
                </Text>
              </View>
              <View style={s.navRow}>
                <TouchableOpacity
                  style={[s.navBtn, { backgroundColor: c.card, borderColor: c.border }]}
                  onPress={() => setWriteIdx((i) => Math.max(0, i - 1))}
                  activeOpacity={0.7}
                >
                  <Text style={[s.navBtnText, { color: c.text }]}>‹ Trước</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.navBtn, { backgroundColor: c.card, borderColor: c.border }]}
                  onPress={() =>
                    setWriteIdx((i) => Math.min(filtered.length - 1, i + 1))
                  }
                  activeOpacity={0.7}
                >
                  <Text style={[s.navBtnText, { color: c.text }]}>Sau ›</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      <WritingPracticeModal
        item={writingItem}
        onClose={() => setWritingItem(null)}
      />
      <StatsModal
        visible={showStats}
        onClose={() => setShowStats(false)}
        totalCount={BASE.length}
        bookmarkCount={bookmarks.size}
        onShowBookmarks={() => {
          setShowBookmarksOnly(true);
          setMode("list");
          setQuizIdx(0);
        }}
        scopedKey={scopedKey}
      />

      <Modal
        visible={menuOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setMenuOpen(false)}
      >
        <View style={[ms.overlay, { backgroundColor: "rgba(0,0,0,0.45)" }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setMenuOpen(false)}
          />
          <View style={[ms.sheet, { backgroundColor: c.card }]}>
            <View style={[ms.handle, { backgroundColor: c.border }]} />
            <View style={ms.sheetHeader}>
              <Text style={[ms.sheetTitle, { color: c.text }]}>Tuỳ chọn</Text>
              <TouchableOpacity onPress={() => setMenuOpen(false)} hitSlop={10}>
                <Text style={[ms.sheetClose, { color: c.primary }]}>Đóng</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[ms.menuItem, { borderBottomColor: c.border }]}
              onPress={doShuffle}
              activeOpacity={0.75}
            >
              <Text style={ms.menuItemIcon}>🔀</Text>
              <Text style={[ms.menuItemText, { color: c.text }]}>Xáo trộn danh sách</Text>
              {isShuffled && (
                <Text style={[ms.menuItemBadge, { backgroundColor: c.primary, color: c.primaryForeground }]}>
                  Đang xáo
                </Text>
              )}
            </TouchableOpacity>
            {isShuffled && (
              <TouchableOpacity
                style={[ms.menuItem, { borderBottomColor: c.border }]}
                onPress={doReset}
                activeOpacity={0.75}
              >
                <Text style={ms.menuItemIcon}>↩️</Text>
                <Text style={[ms.menuItemText, { color: c.text }]}>Đặt lại thứ tự gốc</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[ms.menuItem, { borderBottomColor: c.border }]}
              onPress={() => {
                setShowBookmarksOnly((v) => !v);
                setMode("list");
                setMenuOpen(false);
              }}
              activeOpacity={0.75}
            >
              <Text style={ms.menuItemIcon}>⭐</Text>
              <Text style={[ms.menuItemText, { color: c.text }]}>
                {showBookmarksOnly ? "Xem tất cả chữ" : "Chỉ xem chữ đã ghim"}
              </Text>
              {bookmarks.size > 0 && (
                <Text style={[ms.menuItemBadge, { backgroundColor: c.primary, color: c.primaryForeground }]}>
                  {bookmarks.size}
                </Text>
              )}
            </TouchableOpacity>
          </View>
          <ThemeFadeOverlay />
        </View>
      </Modal>
      <BottomTabBar />
      <AdBanner />
    </View>
  );
}

// ─── Styles (chỉ layout — màu gán inline theo theme ở trên) ───────────────────
const s = StyleSheet.create({
  root: { flex: 1 },
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
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 3,
  },
  headerSubtitle: { fontSize: 13 },
  headerBtns: { flexDirection: "row", gap: 8, alignItems: "center" },
  headerActionBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  statsBtnText: { fontSize: 20 },
  menuLine: {
    width: 20,
    height: 2,
    borderRadius: 2,
    marginVertical: 2,
  },
  searchRow: {
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  searchInput: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
  },
  tabBar: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: "center",
  },
  tabText: { fontSize: 13, fontWeight: "600" },
  bookmarkBanner: {
    marginHorizontal: 14,
    marginBottom: 6,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  bookmarkBannerText: { fontSize: 13, fontWeight: "600" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4 },
  counter: {
    textAlign: "center",
    fontSize: 13,
    marginBottom: 12,
    marginTop: 8,
  },

  row: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "flex-start",
    borderRadius: 12,
    marginBottom: 8,
  },
  rowMain: { flex: 1 },
  rowTopLine: { flexDirection: "row", alignItems: "baseline", marginBottom: 4 },
  indexNum: { fontSize: 14, marginRight: 8 },
  kanjiChar: { fontSize: 20, fontWeight: "700" },
  readings: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  hanViet: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  meaning: { fontSize: 14 },
  rowActions: { flexDirection: "row", alignItems: "center", marginLeft: 8 },
  writeBtn: { padding: 6, marginRight: 2 },
  writeBtnIcon: { fontSize: 18 },
  starBtn: { padding: 6 },
  starIcon: { fontSize: 20 },

  kanjiCol: {
    minWidth: 60,
    maxWidth: 110,
    alignItems: "center",
    justifyContent: "center",
  },
  quizCard: {
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
    fontSize: 68,
    fontWeight: "700",
    lineHeight: 78,
  },
  quizHanViet: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 6,
  },
  quizQuestion: { fontSize: 14 },
  optionsWrap: { gap: 10, marginBottom: 12 },
  optionBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderWidth: 1.5,
  },
  optionCorrect: { backgroundColor: "#d1fae5", borderColor: "#10b981" },
  optionWrong: {},
  optionText: {
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },
  optionTextCorrect: { color: "#065f46" },
  optionTextWrong: {},
  scoreHint: {
    textAlign: "center",
    fontSize: 13,
    marginBottom: 8,
  },
  resultBox: {
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
  resultTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
  },
  resultScore: { fontSize: 52, fontWeight: "900", lineHeight: 60 },
  resultPct: { fontSize: 20, marginBottom: 24 },
  retryBtn: {
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 40,
  },
  retryBtnText: { fontWeight: "700", fontSize: 16 },
  writeCard: {
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
    lineHeight: 62,
  },
  writeHanViet: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 4,
  },
  writeReading: { fontSize: 16, marginBottom: 2 },
  writeMeaning: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  strokeWrap: { alignItems: "center", marginVertical: 8, width: "100%" },
  strokeHint: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
  },
  navRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  navBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1.5,
  },
  navBtnText: { fontSize: 15, fontWeight: "700" },
  empty: { padding: 30, alignItems: "center" },
  emptyText: { fontSize: 16, fontWeight: "600" },
});

const ms = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 12,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  sheetTitle: { fontSize: 17, fontWeight: "800" },
  sheetClose: { fontSize: 15, fontWeight: "600" },
  title: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 16,
    textAlign: "center",
  },
  card: {
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginBottom: 10,
  },
  cardTap: {
    borderWidth: 1.5,
  },
  cardValue: { fontSize: 28, fontWeight: "900" },
  cardLabel: { fontSize: 13, marginTop: 4 },
  cardLabelHint: {},
  divider: { height: 1, marginVertical: 14 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  rowLabel: { fontSize: 14 },
  rowVal: { fontSize: 14, fontWeight: "700" },
  closeBtn: {
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 18,
  },
  closeBtnText: { fontWeight: "700", fontSize: 16 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuItemIcon: { fontSize: 20, marginRight: 12 },
  menuItemText: { flex: 1, fontSize: 15, fontWeight: "500" },
  menuItemBadge: {
    fontSize: 12,
    fontWeight: "700",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
});