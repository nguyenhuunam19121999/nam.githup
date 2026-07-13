// ─────────────────────────────────────────────────────────────────────────────
// level-book.tsx
// Màn hình tổng quan học — dùng chung cho mọi cấp JLPT và sách.
// useWeeks=true  → accordion tuần → bài (Soumatome N2/N3)
// useWeeks=false → danh sách bài phẳng, không chia tuần (N5/N4/N1/Mimikara)
// ─────────────────────────────────────────────────────────────────────────────

import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { BottomTabBar } from "../components/BottomTabBar";
import React, { useMemo, useState } from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getKanjiByBook, KANJI_BOOK_CONFIG, type KanjiItem } from "../assets/data_JLPT_kanji";
import { getGrammarByBook, GRAMMAR_BOOK_CONFIG, type GrammarItem } from "../assets/data_nn";
import { getVocabByBook, VOCAB_BOOK_CONFIG } from "../assets/vocab";

// ✅ MÀU CHỦ ĐẠO MỚI
const TEAL = "#004370";
const TEAL_DARK = "#004370";
const GRAD = [TEAL, TEAL_DARK] as const;
const TEXT_COLOR_kanji = "#004370";
const TEXT_COLOR_vocab = "#004370";
const TEXT_COLOR_grammar = "#004370";

type Part = "kanji" | "vocab" | "grammar";

interface BookConfig {
  headerTitle: string;
  headerSub: string;
  useWeeks: boolean;
  kanjiWeeks: number;
  kanjiLPW: number;
  vocabWeeks: number;
  vocabLPW: number;
  grammarWeeks: number;
  hideKanji?: boolean;
}

// headerTitle/headerSub/useWeeks/hideKanji vẫn khai báo riêng ở đây, vì đây là
// thông tin thuần UI. Còn kanjiWeeks/kanjiLPW/vocabWeeks/vocabLPW/grammarWeeks
// được LẤY TỪ CÙNG 1 NGUỒN với assets/data_JLPT_kanji, assets/vocab,
// assets/data_nn (KANJI_BOOK_CONFIG, VOCAB_BOOK_CONFIG, GRAMMAR_BOOK_CONFIG)
// — sửa số bài chỉ cần sửa ở 3 file đó, không cần sửa lặp lại ở đây nữa.
interface BookMeta {
  headerTitle: string;
  headerSub: string;
  useWeeks: boolean;
  hideKanji?: boolean;
}

const BOOK_META: Record<string, BookMeta> = {
  "n5":           { headerTitle: "日本語能力試験 N5", headerSub: "JLPT · N5",      useWeeks: false },
  "n4":           { headerTitle: "日本語能力試験 N4", headerSub: "JLPT · N4",      useWeeks: false },
  "n1":           { headerTitle: "日本語能力試験 N1", headerSub: "JLPT · N1",      useWeeks: false },
  "soumatome-n3": { headerTitle: "総まとめ N3",      headerSub: "Soumatome · N3", useWeeks: true  },
  "mimikara-n3":  { headerTitle: "耳から覚える N3", headerSub: "Mimikara · N3", useWeeks: false, hideKanji: true },
  "mimikara-n2":  { headerTitle: "耳から覚える N2", headerSub: "Mimikara · N2", useWeeks: false, hideKanji: true },
};

const DEFAULT_LESSON_CONFIG = { weeks: 6, lessonsPerWeek: 6 };

function buildBookConfig(bookId: string): BookConfig {
  const meta = BOOK_META[bookId] ?? BOOK_META["n5"];
  const kanjiCfg = KANJI_BOOK_CONFIG[bookId] ?? DEFAULT_LESSON_CONFIG;
  const vocabCfg = VOCAB_BOOK_CONFIG[bookId] ?? DEFAULT_LESSON_CONFIG;
  const grammarCfg = GRAMMAR_BOOK_CONFIG[bookId] ?? { weeks: 6, daysPerWeek: 6 };
  return {
    ...meta,
    kanjiWeeks: kanjiCfg.weeks,
    kanjiLPW: kanjiCfg.lessonsPerWeek,
    vocabWeeks: vocabCfg.weeks,
    vocabLPW: vocabCfg.lessonsPerWeek,
    grammarWeeks: grammarCfg.weeks,
  };
}

const BOOK_CONFIGS: Record<string, BookConfig> = Object.fromEntries(
  Object.keys(BOOK_META).map((bookId) => [bookId, buildBookConfig(bookId)])
);

// ── Helpers ───────────────────────────────────────────────────────────────────

function groupByWeekLesson<T extends { week?: number; lesson?: number }>(
  items: T[],
  numWeeks: number,
  lessonsPerWeek: number,
): { week: number; total: number; lessons: { lesson: number; items: T[] }[] }[] {
  const actualWeeks = items.length > 0
    ? Math.max(...items.map((i) => i.week ?? 0), numWeeks)
    : numWeeks;

  return Array.from({ length: actualWeeks }, (_, wi) => {
    const w = wi + 1;
    const weekItems = items.filter((i) => i.week === w);

    const lessonsInWeek = weekItems.map((i) => i.lesson ?? 0);
    const isPerWeekLesson = lessonsInWeek.length > 0
      && lessonsInWeek.every((l) => l >= 1 && l <= lessonsPerWeek);

    const lessons = Array.from({ length: lessonsPerWeek }, (_, li) => {
      const globalL = wi * lessonsPerWeek + li + 1;
      const localL = li + 1;
      const targetLesson = isPerWeekLesson ? localL : globalL;
      return { lesson: globalL, items: weekItems.filter((i) => i.lesson === targetLesson) };
    });

    const total = lessons.reduce((s, l) => s + l.items.length, 0);
    return { week: w, total, lessons };
  });
}

function groupGrammarByWeek(items: GrammarItem[], numWeeks: number) {
  // Tự tính số tuần thực tế từ data, không dùng numWeeks hardcode
  const actualWeeks = items.length > 0
    ? Math.max(...items.map((g) => (g as any).week ?? 0))
    : numWeeks;
  const weeks = actualWeeks > 0 ? actualWeeks : numWeeks;

  return Array.from({ length: weeks }, (_, wi) => {
    const w = wi + 1;
    return { week: w, items: items.filter((g) => (g as any).week === w) };
  });
}

function getFlatLessons<T extends { lesson?: number }>(items: T[]): { lesson: number; items: T[] }[] {
  const max = items.reduce((m, i) => Math.max(m, i.lesson ?? 0), 0);
  return Array.from({ length: max }, (_, i) => {
    const l = i + 1;
    return { lesson: l, items: items.filter((x) => x.lesson === l) };
  }).filter((g) => g.items.length > 0);
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function LevelBookScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ bookId?: string }>();
  const bookId = typeof params.bookId === "string" ? params.bookId : "n5";
  const config = BOOK_CONFIGS[bookId] ?? BOOK_CONFIGS["n5"];

  // Mimikara không có kanji, mặc định mở vocab:
  const [activePart, setActivePart] = useState<Part>(
    config.hideKanji ? "vocab" : "kanji"
  );

  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set([1]));

  const kanjiData = useMemo(
    () => getKanjiByBook(bookId) as (KanjiItem & { lesson?: number; week?: number })[],
    [bookId]
  );
  const vocabData = useMemo(
    () => getVocabByBook(bookId), [bookId]
  );
  const grammarData = useMemo(
    () => getGrammarByBook(bookId),
    [bookId]
  );

  // Week-mode data
  const kanjiWeeks = useMemo(
    () => groupByWeekLesson(kanjiData, config.kanjiWeeks, config.kanjiLPW),
    [kanjiData, config]
  );
  const vocabWeeks = useMemo(
    () => groupByWeekLesson(vocabData, config.vocabWeeks, config.vocabLPW),
    [vocabData, config]
  );
  const grammarWeeks = useMemo(
    () => groupGrammarByWeek(grammarData, config.grammarWeeks),
    [grammarData, config]
  );

  // Flat-mode data
  const kanjiFlatLessons = useMemo(
    () => getFlatLessons(kanjiData),
    [kanjiData]
  );
  const vocabFlatLessons = useMemo(
    () => getFlatLessons(vocabData),
    [vocabData]
  );

  const PARTS = [
    ...(!config.hideKanji
      ? [{ key: "kanji" as Part, jpLabel: "漢字", color: TEXT_COLOR_kanji }]
      : []),
    { key: "vocab" as Part, jpLabel: "語彙", color: TEXT_COLOR_vocab },
    { key: "grammar" as Part, jpLabel: "文法", color: TEXT_COLOR_grammar },
  ];

  const currentPart = PARTS.find((p) => p.key === activePart)!;

  const toggleWeek = (w: number) => {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(w)) next.delete(w); else next.add(w);
      return next;
    });
  };

  const switchPart = (p: Part) => { setActivePart(p); setExpandedWeeks(new Set([1])); };

  // Navigation
  const goKanjiLesson = (lesson: number) =>
    router.push({ pathname: "/kanji", params: { bookId, lesson: String(lesson), title: `漢字 · Bài ${lesson}` } });
  const goVocabLesson = (lesson: number) =>
    router.push({ pathname: "/vocab", params: { bookId, lesson: String(lesson), title: `語彙 · Bài ${lesson}` } });
  const goGrammarWeek = (week: number, count: number) =>
    router.push({ pathname: "/grammar", params: { bookId, week: String(week), title: `文法 · Tuần ${week} (${count} mẫu)` } });
  const goGrammarAll = () =>
    router.push({ pathname: "/grammar", params: { bookId, title: `文法 · ${grammarData.length} mẫu` } });

  // ── Render: week accordion (Soumatome) ──────────────────────────────────────
  const renderWeekLesson = (
    weeks: ReturnType<typeof groupByWeekLesson>,
    color: string,
    onLesson: (l: number) => void,
  ) => weeks.map(({ week, total, lessons }) => {
    const isOpen = expandedWeeks.has(week);
    return (
      <View key={week} style={s.weekCard}>
        <TouchableOpacity
          style={[s.weekHeader, { borderLeftColor: color }]}
          onPress={() => toggleWeek(week)}
          activeOpacity={0.75}
        >
          <View style={[s.weekBadge, { backgroundColor: color }]}>
            <Text style={s.weekBadgeJP}>第{week}週</Text>
            <Text style={s.weekBadgeVI}>Tuần {week}</Text>
          </View>
          <View style={s.weekMeta}>
            <Text style={s.weekMetaLessons}>{lessons.length} bài học</Text>
            <Text style={s.weekMetaCount}>{total} mục</Text>
          </View>
          <View style={s.progressBar}>
            <View style={[s.progressFill, { backgroundColor: color, width: "0%" }]} />
          </View>
          <Text style={[s.chevron, isOpen && s.chevronOpen]}>›</Text>
        </TouchableOpacity>
        {isOpen && (
          <View style={s.lessonsWrap}>
            {lessons.map(({ lesson, items }) => (
              <TouchableOpacity key={lesson} style={s.lessonRow} onPress={() => onLesson(lesson)} activeOpacity={0.7}>
                <View style={[s.lessonNumCircle, { borderColor: color }]}>
                  <Text style={[s.lessonNumText, { color }]}>{lesson}</Text>
                </View>
                <View style={s.lessonInfo}>
                  <Text style={s.lessonTitle}>Bài {lesson}</Text>
                  <Text style={s.lessonCount}>{items.length} mục</Text>
                </View>
                <View style={[s.studyBtn, { backgroundColor: color }]}>
                  <Text style={s.studyBtnText}>Học ▶</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  });

  const renderGrammarWeeks = () => grammarWeeks.map(({ week, items }) => {
    const isOpen = expandedWeeks.has(week);
    const color = TEXT_COLOR_grammar;
    const preview = items.slice(0, 4).map((g) => g.pattern).join("・");
    return (
      <View key={week} style={s.weekCard}>
        <TouchableOpacity
          style={[s.weekHeader, { borderLeftColor: color }]}
          onPress={() => toggleWeek(week)}
          activeOpacity={0.75}
        >
          <View style={[s.weekBadge, { backgroundColor: color }]}>
            <Text style={s.weekBadgeJP}>第{week}週</Text>
            <Text style={s.weekBadgeVI}>Tuần {week}</Text>
          </View>
          <View style={s.weekMeta}>
            <Text style={s.weekMetaLessons}>{items.length} mẫu</Text>
            <Text style={s.weekMetaCount}>Ngữ pháp</Text>
          </View>
          <Text style={[s.chevron, isOpen && s.chevronOpen]}>›</Text>
        </TouchableOpacity>
        {isOpen && (
          <View style={s.grammarContent}>
            <Text style={s.grammarPreview} numberOfLines={2}>{preview}{items.length > 4 ? "..." : ""}</Text>
            <TouchableOpacity
              style={[s.grammarStudyBtn, { backgroundColor: color }]}
              onPress={() => goGrammarWeek(week, items.length)}
              activeOpacity={0.8}
            >
              <Text style={s.grammarStudyBtnText}>Học {items.length} mẫu ngữ pháp  ▶</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  });

  // ── Render: flat lesson list (no weeks) ─────────────────────────────────────
  const renderFlatLessons = (
    lessons: { lesson: number; items: { lesson?: number }[] }[],
    color: string,
    onLesson: (l: number) => void,
  ) => (
    <View style={s.flatCard}>
      {lessons.map(({ lesson, items }, idx) => (
        <TouchableOpacity
          key={lesson}
          style={[s.flatRow, idx < lessons.length - 1 && s.flatRowBorder]}
          onPress={() => onLesson(lesson)}
          activeOpacity={0.7}
        >
          <View style={[s.lessonNumCircle, { borderColor: color }]}>
            <Text style={[s.lessonNumText, { color }]}>{lesson}</Text>
          </View>
          <View style={s.lessonInfo}>
            <Text style={s.lessonTitle}>Bài {lesson}</Text>
            <Text style={s.lessonCount}>{items.length} mục</Text>
          </View>
          <View style={[s.studyBtn, { backgroundColor: color }]}>
            <Text style={s.studyBtnText}>Học ▶</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderFlatGrammar = () => {
    const color = TEXT_COLOR_grammar;
    const preview = grammarData.slice(0, 5).map((g) => g.pattern).join("・");
    return (
      <View style={s.flatCard}>
        <View style={[s.grammarAllHeader, { borderLeftColor: color }]}>
          <View style={[s.grammarAllBadge, { backgroundColor: color }]}>
            <Text style={s.grammarAllBadgeText}>{grammarData.length}</Text>
            <Text style={s.grammarAllBadgeSub}>mẫu</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.grammarAllTitle}>Tất cả mẫu ngữ pháp</Text>
            <Text style={s.grammarAllPreview} numberOfLines={2}>{preview}...</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[s.grammarStudyBtn, { backgroundColor: color, margin: 14, marginTop: 4 }]}
          onPress={goGrammarAll}
          activeOpacity={0.8}
        >
          <Text style={s.grammarStudyBtnText}>Học tất cả {grammarData.length} mẫu ngữ pháp  ▶</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ── Section metadata label ──────────────────────────────────────────────────
  const sectionMeta = () => {
    if (activePart === "grammar") {
      return config.useWeeks
        ? `${config.grammarWeeks} tuần`
        : `${grammarData.length} mẫu`;
    }
    if (activePart === "kanji") {
      return config.useWeeks
        ? `${config.kanjiWeeks} tuần · ${config.kanjiWeeks * config.kanjiLPW} bài`
        : `${kanjiFlatLessons.length} bài`;
    }
    return config.useWeeks
      ? `${config.vocabWeeks} tuần · ${config.vocabWeeks * config.vocabLPW} bài`
      : `${vocabFlatLessons.length} bài`;
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={TEAL} />

      <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
        <SafeAreaView edges={["top", "left", "right"]}>
          <View style={s.headerTopRow}>
            <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
              <Text style={s.backIcon}>‹</Text>
            </TouchableOpacity>
            <Text style={s.headerTitle}>{config.headerTitle}</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={s.partTabsRow}>
            {PARTS.map((p) => {
              const active = activePart === p.key;
              return (
                <TouchableOpacity
                  key={p.key}
                  style={[s.partTab, active && { backgroundColor: p.color }]}
                  onPress={() => switchPart(p.key)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.partTabJP, active && s.partTabJPActive]}>{p.jpLabel}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[s.sectionLabel, { borderLeftColor: currentPart.color }]}>
          <Text style={s.sectionLabelJP}>{currentPart.jpLabel}</Text>
          <Text style={s.sectionLabelMeta}>{sectionMeta()}</Text>
        </View>

        {config.useWeeks ? (
          <>
            {activePart === "kanji"   && renderWeekLesson(kanjiWeeks,        TEXT_COLOR_kanji, goKanjiLesson)}
            {activePart === "vocab"   && renderWeekLesson(vocabWeeks as any, TEXT_COLOR_vocab, goVocabLesson)}
            {activePart === "grammar" && renderGrammarWeeks()}
          </>
        ) : (
          <>
            {activePart === "kanji"   && renderFlatLessons(kanjiFlatLessons,        TEXT_COLOR_kanji, goKanjiLesson)}
            {activePart === "vocab"   && renderFlatLessons(vocabFlatLessons as any, TEXT_COLOR_vocab, goVocabLesson)}
            {activePart === "grammar" && renderFlatGrammar()}
          </>
        )}

        <View style={{ height: 16 }} />
      </ScrollView>
      <BottomTabBar />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f1f5f9" },

  headerTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingLeft: 12, paddingRight: 28, paddingTop: 6, paddingBottom: 0 },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  backIcon: { color: "#fff", fontSize: 32, fontWeight: "300", marginTop: -4 },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "900", letterSpacing: 0.3 },

  partTabsRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingBottom: 10,
    paddingTop: 10,
    gap: 8
  },
  partTab: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.18)" },
  partTabJP:       { color: "rgba(255,255,255,0.85)", fontSize: 16, fontWeight: "900" },
  partTabJPActive: { color: "#fff" },

  scroll: { flex: 1 },
  scrollContent: { padding: 12 },

  sectionLabel: { flexDirection: "row", alignItems: "center", borderLeftWidth: 3, paddingLeft: 10, marginBottom: 12, marginTop: 4 },
  sectionLabelJP:   { fontSize: 15, fontWeight: "900", color: "#0f172a" },
  sectionLabelMeta: { fontSize: 11, color: "#94a3b8", marginLeft: "auto" },

  // Week accordion cards
  weekCard: { backgroundColor: "#fff", borderRadius: 14, marginBottom: 10, overflow: "hidden", elevation: 2, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  weekHeader: { flexDirection: "row", alignItems: "center", padding: 12, borderLeftWidth: 4, gap: 10 },
  weekBadge: { width: 56, height: 56, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  weekBadgeJP: { color: "#fff", fontSize: 13, fontWeight: "900" },
  weekBadgeVI: { color: "rgba(255,255,255,0.85)", fontSize: 9, fontWeight: "700", marginTop: 1 },
  weekMeta: { flex: 1 },
  weekMetaLessons: { fontSize: 15, fontWeight: "800", color: "#0f172a" },
  weekMetaCount:   { fontSize: 12, color: "#64748b", marginTop: 2 },
  progressBar: { width: 60, height: 4, backgroundColor: "#e2e8f0", borderRadius: 2 },
  progressFill: { height: 4, borderRadius: 2 },
  chevron: { fontSize: 24, color: "#94a3b8" },
  chevronOpen: { transform: [{ rotate: "90deg" }] },

  lessonsWrap: { borderTopWidth: 1, borderTopColor: "#f1f5f9" },
  lessonRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f8fafc", gap: 12 },
  lessonNumCircle: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, alignItems: "center", justifyContent: "center", backgroundColor: "#f8fafc" },
  lessonNumText: { fontSize: 13, fontWeight: "800" },
  lessonInfo: { flex: 1 },
  lessonTitle: { fontSize: 14, fontWeight: "700", color: "#1e293b" },
  lessonCount: { fontSize: 11, color: "#64748b", marginTop: 1 },
  studyBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  studyBtnText: { color: "#fff", fontSize: 12, fontWeight: "800" },

  grammarContent: { padding: 14, borderTopWidth: 1, borderTopColor: "#f1f5f9" },
  grammarPreview: { fontSize: 13, color: "#475569", lineHeight: 20, marginBottom: 10, fontWeight: "500" },
  grammarStudyBtn: { borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  grammarStudyBtnText: { color: "#fff", fontSize: 14, fontWeight: "800" },

  // Flat list card
  flatCard: { backgroundColor: "#fff", borderRadius: 14, overflow: "hidden", elevation: 2, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  flatRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, gap: 12 },
  flatRowBorder: { borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },

  // Grammar all-in-one block
  grammarAllHeader: { flexDirection: "row", alignItems: "center", padding: 14, borderLeftWidth: 4, gap: 12 },
  grammarAllBadge: { width: 60, height: 60, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  grammarAllBadgeText: { color: "#fff", fontSize: 20, fontWeight: "900" },
  grammarAllBadgeSub: { color: "rgba(255,255,255,0.85)", fontSize: 10, fontWeight: "700" },
  grammarAllTitle: { fontSize: 15, fontWeight: "800", color: "#0f172a", marginBottom: 4 },
  grammarAllPreview: { fontSize: 12, color: "#64748b", lineHeight: 18 },
});

















// // ─────────────────────────────────────────────────────────────────────────────
// // level-book.tsx
// // Màn hình tổng quan học — dùng chung cho mọi cấp JLPT và sách.
// // useWeeks=true  → accordion tuần → bài (Soumatome N2/N3)
// // useWeeks=false → danh sách bài phẳng, không chia tuần (N5/N4/N1/Mimikara)
// // ─────────────────────────────────────────────────────────────────────────────

// import { useLocalSearchParams, useRouter } from "expo-router";
// import { LinearGradient } from "expo-linear-gradient";
// import { BottomTabBar } from "../components/BottomTabBar";
// import React, { useMemo, useState } from "react";
// import {
//   ScrollView,
//   StatusBar,
//   StyleSheet,
//   Text,
//   TouchableOpacity,
//   View,
// } from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context";
// import { getKanjiByBook, KANJI_BOOK_CONFIG, type KanjiItem } from "../assets/data_JLPT_kanji";
// import { getGrammarByBook, GRAMMAR_BOOK_CONFIG, type GrammarItem } from "../assets/data_nn";
// import { getVocabByBook, VOCAB_BOOK_CONFIG, type RawVocab } from "../assets/vocab";


// // ✅ MÀU CHỦ ĐẠO MỚI
// const TEAL = "#004370";
// const TEAL_DARK = "#004370";
// const GRAD = [TEAL, TEAL_DARK] as const;
// //const TEXT_COLOR = "#e47b0b";E03131
// const TEXT_COLOR_kanji = "#004370";
// const TEXT_COLOR_vocab = "#004370";
// const TEXT_COLOR_grammar = "#004370";


// type Part = "kanji" | "vocab" | "grammar";

// interface BookConfig {
//   headerTitle: string;
//   headerSub: string;
//   useWeeks: boolean;
//   kanjiWeeks: number;
//   kanjiLPW: number;
//   vocabWeeks: number;
//   vocabLPW: number;
//   grammarWeeks: number;
//   hideKanji?: boolean; 
// }

// // headerTitle/headerSub/useWeeks/grammarWeeks/hideKanji vẫn khai báo riêng ở đây,
// // vì đây là thông tin thuần UI. Còn kanjiWeeks/kanjiLPW/vocabWeeks/vocabLPW được
// // LẤY TỪ CÙNG 1 NGUỒN với assets/data_JLPT_kanji/index.ts và assets/vocab/index.ts
// // (KANJI_BOOK_CONFIG, VOCAB_BOOK_CONFIG) — sửa số bài chỉ cần sửa ở 2 file đó,
// // không cần sửa lặp lại ở đây nữa.
// interface BookMeta {
//   headerTitle: string;
//   headerSub: string;
//   useWeeks: boolean;
//   grammarWeeks: number;
//   hideKanji?: boolean;
// }

// const BOOK_META: Record<string, BookMeta> = {
//   "n5":           { headerTitle: "日本語能力試験 N5", headerSub: "JLPT · N5",      useWeeks: false, grammarWeeks: 4 },
//   "n4":           { headerTitle: "日本語能力試験 N4", headerSub: "JLPT · N4",      useWeeks: false, grammarWeeks: 5 },
//   "n1":           { headerTitle: "日本語能力試験 N1", headerSub: "JLPT · N1",      useWeeks: false, grammarWeeks: 8 },
//   "soumatome-n3": { headerTitle: "総まとめ N3",      headerSub: "Soumatome · N3", useWeeks: true,  grammarWeeks: 6 },
//   "mimikara-n3":  { headerTitle: "耳から覚える N3", headerSub: "Mimikara · N3", useWeeks: false, grammarWeeks: 4, hideKanji: true },
//   "mimikara-n2":  { headerTitle: "耳から覚える N2", headerSub: "Mimikara · N2", useWeeks: false, grammarWeeks: 4, hideKanji: true },
// };

// const DEFAULT_LESSON_CONFIG = { weeks: 6, lessonsPerWeek: 6 };

// function buildBookConfig(bookId: string): BookConfig {
//   const meta = BOOK_META[bookId] ?? BOOK_META["n5"];
//   const kanjiCfg = KANJI_BOOK_CONFIG[bookId] ?? DEFAULT_LESSON_CONFIG;
//   const vocabCfg = VOCAB_BOOK_CONFIG[bookId] ?? DEFAULT_LESSON_CONFIG;
//   const grammarCfg = GRAMMAR_BOOK_CONFIG[bookId] ?? DEFAULT_LESSON_CONFIG;
//   return {
//     ...meta,
//     kanjiWeeks: kanjiCfg.weeks,
//     kanjiLPW: kanjiCfg.lessonsPerWeek,
//     vocabWeeks: vocabCfg.weeks,
//     vocabLPW: vocabCfg.lessonsPerWeek,
//     grammarWeeks: grammarCfg.weeks, // ← lấy từ nguồn chung, bỏ giá trị hardcode trong BOOK_META
//   };
// }

// const BOOK_CONFIGS: Record<string, BookConfig> = Object.fromEntries(
//   Object.keys(BOOK_META).map((bookId) => [bookId, buildBookConfig(bookId)])
// );

// // ── Helpers ───────────────────────────────────────────────────────────────────

// function groupByWeekLesson<T extends { week?: number; lesson?: number }>(
//   items: T[],
//   numWeeks: number,
//   lessonsPerWeek: number,
// ): { week: number; total: number; lessons: { lesson: number; items: T[] }[] }[] {
//   const actualWeeks = items.length > 0
//     ? Math.max(...items.map((i) => i.week ?? 0), numWeeks)
//     : numWeeks;

//   return Array.from({ length: actualWeeks }, (_, wi) => {
//     const w = wi + 1;
//     const weekItems = items.filter((i) => i.week === w);

//     const lessonsInWeek = weekItems.map((i) => i.lesson ?? 0);
//     const isPerWeekLesson = lessonsInWeek.length > 0
//       && lessonsInWeek.every((l) => l >= 1 && l <= lessonsPerWeek);

//     const lessons = Array.from({ length: lessonsPerWeek }, (_, li) => {
//       const globalL = wi * lessonsPerWeek + li + 1;
//       const localL = li + 1;
//       const targetLesson = isPerWeekLesson ? localL : globalL;
//       return { lesson: globalL, items: weekItems.filter((i) => i.lesson === targetLesson) };
//     });

//     const total = lessons.reduce((s, l) => s + l.items.length, 0);
//     return { week: w, total, lessons };
//   });
// }

// function groupGrammarByWeek(items: GrammarItem[], numWeeks: number) {
//   // Tự tính số tuần thực tế từ data, không dùng numWeeks hardcode
//   const actualWeeks = items.length > 0
//     ? Math.max(...items.map((g) => (g as any).week ?? 0))
//     : numWeeks;
//   const weeks = actualWeeks > 0 ? actualWeeks : numWeeks;

//   return Array.from({ length: weeks }, (_, wi) => {
//     const w = wi + 1;
//     return { week: w, items: items.filter((g) => (g as any).week === w) };
//   });
// }

// // function groupGrammarByWeek(items: GrammarItem[], numWeeks: number) {
// //   return Array.from({ length: numWeeks }, (_, wi) => {
// //     const w = wi + 1;
// //     return { week: w, items: items.filter((g) => (g as GrammarItem & { week?: number }).week === w) };
// //   });
// // }

// function getFlatLessons<T extends { lesson?: number }>(items: T[]): { lesson: number; items: T[] }[] {
//   const max = items.reduce((m, i) => Math.max(m, i.lesson ?? 0), 0);
//   return Array.from({ length: max }, (_, i) => {
//     const l = i + 1;
//     return { lesson: l, items: items.filter((x) => x.lesson === l) };
//   }).filter((g) => g.items.length > 0);
// }

// // ── Main Screen ───────────────────────────────────────────────────────────────

// export default function LevelBookScreen() {
//   const router = useRouter();
//   const params = useLocalSearchParams<{ bookId?: string }>();
//   const bookId = typeof params.bookId === "string" ? params.bookId : "n5";
//   const config = BOOK_CONFIGS[bookId] ?? BOOK_CONFIGS["n5"];

//   // const [activePart, setActivePart] = useState<Part>("kanji");

//   // Sau — mimikara không có kanji, mặc định mở vocab:
//   const [activePart, setActivePart] = useState<Part>(
//     config.hideKanji ? "vocab" : "kanji"
//   );

//   const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set([1]));

//   const kanjiData = useMemo(
//     () => getKanjiByBook(bookId) as (KanjiItem & { lesson?: number; week?: number })[],
//     [bookId]  // ← chỉ phụ thuộc bookId, KHÔNG phụ thuộc activePart
//   );
//   const vocabData = useMemo(
//     () => getVocabByBook(bookId), [bookId]
//   );
//   const grammarData = useMemo(
//     () => getGrammarByBook(bookId),
//     [bookId]
//   );
  
//   // const kanjiData  = useMemo(
//   //   () => activePart === "kanji" ? getKanjiByBook(bookId) as (KanjiItem & { lesson?: number; week?: number })[] : [],
//   //   [bookId, activePart]
//   // );
//   // const vocabData  = useMemo(
//   //   () => activePart === "vocab" ? getVocab(undefined, bookId) as (RawVocab & { lesson?: number; week?: number })[] : [],
//   //   [bookId, activePart]
//   // );
//   // const grammarData = useMemo(
//   //   () => activePart === "grammar" ? getGrammarByBook(bookId) : [],
//   //   [bookId, activePart]
//   // );

//   // const kanjiData  = useMemo(() => getKanjiByBook(bookId)  as (KanjiItem   & { lesson?: number; week?: number })[], [bookId]);
//   // const vocabData  = useMemo(() => getVocab(undefined, bookId) as (RawVocab & { lesson?: number; week?: number })[], [bookId]);
//   // const grammarData = useMemo(() => getGrammarByBook(bookId), [bookId]);

//   // Week-mode data — CHỈ tính cho tab đang active, tránh tính cả 3 phần cùng
//   // lúc khi vừa mở sách (nguyên nhân gây lag khi json nặng hơn).
//   const kanjiWeeks = useMemo(
//     () => groupByWeekLesson(kanjiData, config.kanjiWeeks, config.kanjiLPW),
//     [kanjiData, config]
//   );
//   const vocabWeeks = useMemo(
//     () => groupByWeekLesson(vocabData, config.vocabWeeks, config.vocabLPW),
//     [vocabData, config]
//   );
//   const grammarWeeks = useMemo(
//     () => groupGrammarByWeek(grammarData, config.grammarWeeks),
//     [grammarData, config]
//   );
//   const kanjiFlatLessons = useMemo(
//     () => getFlatLessons(kanjiData),
//     [kanjiData]
//   );
//   const vocabFlatLessons = useMemo(
//     () => getFlatLessons(vocabData),
//     [vocabData]
//   );

//   const PARTS = [
//     ...(!config.hideKanji
//       ? [{ key: "kanji" as Part, jpLabel: "漢字", color: TEXT_COLOR_kanji }]
//       : []),
//     { key: "vocab" as Part, jpLabel: "語彙", color: TEXT_COLOR_vocab },
//     { key: "grammar" as Part, jpLabel: "文法", color: TEXT_COLOR_grammar },
//   ];

//   const currentPart = PARTS.find((p) => p.key === activePart)!;

//   const toggleWeek = (w: number) => {
//     setExpandedWeeks((prev) => {
//       const next = new Set(prev);
//       if (next.has(w)) next.delete(w); else next.add(w);
//       return next;
//     });
//   };

//   const switchPart = (p: Part) => { setActivePart(p); setExpandedWeeks(new Set([1])); };

//   // Navigation
//   const goKanjiLesson = (lesson: number) =>
//     router.push({ pathname: "/kanji", params: { bookId, lesson: String(lesson), title: `漢字 · Bài ${lesson}` } });
//   // // Sau — truyền week thay vì lesson, dùng param riêng tên "week":
//   // const goKanjiLesson = (lesson: number) =>
//   //   router.push({ pathname: "/kanji", params: { bookId, week: String(lesson), title: `漢字 · Tuần ${lesson}` } });
//   const goVocabLesson = (lesson: number) =>
//     router.push({ pathname: "/vocab", params: { bookId, lesson: String(lesson), title: `語彙 · Bài ${lesson}` } });
//   const goGrammarWeek = (week: number, count: number) =>
//     router.push({ pathname: "/grammar", params: { bookId, week: String(week), title: `文法 · Tuần ${week} (${count} mẫu)` } });
//   const goGrammarAll = () =>
//     router.push({ pathname: "/grammar", params: { bookId, title: `文法 · ${grammarData.length} mẫu` } });

//   // ── Render: week accordion (Soumatome) ──────────────────────────────────────
//   const renderWeekLesson = (
//     weeks: ReturnType<typeof groupByWeekLesson>,
//     color: string,
//     onLesson: (l: number) => void,
//   ) => weeks.map(({ week, total, lessons }) => {
//     const isOpen = expandedWeeks.has(week);
//     return (
//       <View key={week} style={s.weekCard}>
//         <TouchableOpacity
//           style={[s.weekHeader, { borderLeftColor: color }]}
//           onPress={() => toggleWeek(week)}
//           activeOpacity={0.75}
//         >
//           <View style={[s.weekBadge, { backgroundColor: color }]}>
//             <Text style={s.weekBadgeJP}>第{week}週</Text>
//             <Text style={s.weekBadgeVI}>Tuần {week}</Text>
//           </View>
//           <View style={s.weekMeta}>
//             <Text style={s.weekMetaLessons}>{lessons.length} bài học</Text>
//             <Text style={s.weekMetaCount}>{total} mục</Text>
//           </View>
//           <View style={s.progressBar}>
//             <View style={[s.progressFill, { backgroundColor: color, width: "0%" }]} />
//           </View>
//           <Text style={[s.chevron, isOpen && s.chevronOpen]}>›</Text>
//         </TouchableOpacity>
//         {isOpen && (
//           <View style={s.lessonsWrap}>
//             {lessons.map(({ lesson, items }) => (
//               <TouchableOpacity key={lesson} style={s.lessonRow} onPress={() => onLesson(lesson)} activeOpacity={0.7}>
//                 <View style={[s.lessonNumCircle, { borderColor: color }]}>
//                   <Text style={[s.lessonNumText, { color }]}>{lesson}</Text>
//                 </View>
//                 <View style={s.lessonInfo}>
//                   <Text style={s.lessonTitle}>Bài {lesson}</Text>
//                   <Text style={s.lessonCount}>{items.length} mục</Text>
//                 </View>
//                 <View style={[s.studyBtn, { backgroundColor: color }]}>
//                   <Text style={s.studyBtnText}>Học ▶</Text>
//                 </View>
//               </TouchableOpacity>
//             ))}
//           </View>
//         )}
//       </View>
//     );
//   });

//   const renderGrammarWeeks = () => grammarWeeks.map(({ week, items }) => {
//     const isOpen = expandedWeeks.has(week);
//     const color = TEXT_COLOR_grammar;
//     const preview = items.slice(0, 4).map((g) => g.pattern).join("・");
//     return (
//       <View key={week} style={s.weekCard}>
//         <TouchableOpacity
//           style={[s.weekHeader, { borderLeftColor: color }]}
//           onPress={() => toggleWeek(week)}
//           activeOpacity={0.75}
//         >
//           <View style={[s.weekBadge, { backgroundColor: color }]}>
//             <Text style={s.weekBadgeJP}>第{week}週</Text>
//             <Text style={s.weekBadgeVI}>Tuần {week}</Text>
//           </View>
//           <View style={s.weekMeta}>
//             <Text style={s.weekMetaLessons}>{items.length} mẫu</Text>
//             <Text style={s.weekMetaCount}>Ngữ pháp</Text>
//           </View>
//           <Text style={[s.chevron, isOpen && s.chevronOpen]}>›</Text>
//         </TouchableOpacity>
//         {isOpen && (
//           <View style={s.grammarContent}>
//             <Text style={s.grammarPreview} numberOfLines={2}>{preview}{items.length > 4 ? "..." : ""}</Text>
//             <TouchableOpacity
//               style={[s.grammarStudyBtn, { backgroundColor: color }]}
//               onPress={() => goGrammarWeek(week, items.length)}
//               activeOpacity={0.8}
//             >
//               <Text style={s.grammarStudyBtnText}>Học {items.length} mẫu ngữ pháp  ▶</Text>
//             </TouchableOpacity>
//           </View>
//         )}
//       </View>
//     );
//   });

//   // ── Render: flat lesson list (no weeks) ─────────────────────────────────────
//   const renderFlatLessons = (
//     lessons: { lesson: number; items: { lesson?: number }[] }[],
//     color: string,
//     onLesson: (l: number) => void,
//   ) => (
//     <View style={s.flatCard}>
//       {lessons.map(({ lesson, items }, idx) => (
//         <TouchableOpacity
//           key={lesson}
//           style={[s.flatRow, idx < lessons.length - 1 && s.flatRowBorder]}
//           onPress={() => onLesson(lesson)}
//           activeOpacity={0.7}
//         >
//           <View style={[s.lessonNumCircle, { borderColor: color }]}>
//             <Text style={[s.lessonNumText, { color }]}>{lesson}</Text>
//           </View>
//           <View style={s.lessonInfo}>
//             <Text style={s.lessonTitle}>Bài {lesson}</Text>
//             <Text style={s.lessonCount}>{items.length} mục</Text>
//           </View>
//           <View style={[s.studyBtn, { backgroundColor: color }]}>
//             <Text style={s.studyBtnText}>Học ▶</Text>
//           </View>
//         </TouchableOpacity>
//       ))}
//     </View>
//   );

//   const renderFlatGrammar = () => {
//     const color = TEXT_COLOR_grammar;
//     const preview = grammarData.slice(0, 5).map((g) => g.pattern).join("・");
//     return (
//       <View style={s.flatCard}>
//         <View style={[s.grammarAllHeader, { borderLeftColor: color }]}>
//           <View style={[s.grammarAllBadge, { backgroundColor: color }]}>
//             <Text style={s.grammarAllBadgeText}>{grammarData.length}</Text>
//             <Text style={s.grammarAllBadgeSub}>mẫu</Text>
//           </View>
//           <View style={{ flex: 1 }}>
//             <Text style={s.grammarAllTitle}>Tất cả mẫu ngữ pháp</Text>
//             <Text style={s.grammarAllPreview} numberOfLines={2}>{preview}...</Text>
//           </View>
//         </View>
//         <TouchableOpacity
//           style={[s.grammarStudyBtn, { backgroundColor: color, margin: 14, marginTop: 4 }]}
//           onPress={goGrammarAll}
//           activeOpacity={0.8}
//         >
//           <Text style={s.grammarStudyBtnText}>Học tất cả {grammarData.length} mẫu ngữ pháp  ▶</Text>
//         </TouchableOpacity>
//       </View>
//     );
//   };

//   // ── Section metadata label ──────────────────────────────────────────────────
//   const sectionMeta = () => {
//     if (activePart === "grammar") {
//       return config.useWeeks
//         ? `${config.grammarWeeks} tuần`
//         : `${grammarData.length} mẫu`;
//     }
//     if (activePart === "kanji") {
//       return config.useWeeks
//         ? `${config.kanjiWeeks} tuần · ${config.kanjiWeeks * config.kanjiLPW} bài`
//         : `${kanjiFlatLessons.length} bài`;
//     }
//     return config.useWeeks
//       ? `${config.vocabWeeks} tuần · ${config.vocabWeeks * config.vocabLPW} bài`
//       : `${vocabFlatLessons.length} bài`;
//   };

//   return (
//     <View style={s.root}>
//       <StatusBar barStyle="light-content" backgroundColor={TEAL} />

//       <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
//         <SafeAreaView edges={["top", "left", "right"]}>
//           <View style={s.headerTopRow}>
//             <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
//               <Text style={s.backIcon}>‹</Text>
//             </TouchableOpacity>
//             <Text style={s.headerTitle}>{config.headerTitle}</Text>
//             <View style={{ width: 40 }} />
//           </View>

//           <View style={s.partTabsRow}>
//             {PARTS.map((p) => {
//               const active = activePart === p.key;
//               return (
//                 <TouchableOpacity
//                   key={p.key}
//                   style={[s.partTab, active && { backgroundColor: p.color }]}
//                   onPress={() => switchPart(p.key)}
//                   activeOpacity={0.8}
//                 >
//                   <Text style={[s.partTabJP, active && s.partTabJPActive]}>{p.jpLabel}</Text>
//                 </TouchableOpacity>
//               );
//             })}
//           </View>
//         </SafeAreaView>
//       </LinearGradient>

//       <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
//         <View style={[s.sectionLabel, { borderLeftColor: currentPart.color }]}>
//           <Text style={s.sectionLabelJP}>{currentPart.jpLabel}</Text>
//           <Text style={s.sectionLabelMeta}>{sectionMeta()}</Text>
//         </View>

//         {config.useWeeks ? (
//           <>
//             {activePart === "kanji"   && renderWeekLesson(kanjiWeeks,        TEXT_COLOR_kanji, goKanjiLesson)}
//             {activePart === "vocab"   && renderWeekLesson(vocabWeeks as any, TEXT_COLOR_vocab, goVocabLesson)}
//             {activePart === "grammar" && renderGrammarWeeks()}
//           </>
//         ) : (
//           <>
//             {activePart === "kanji"   && renderFlatLessons(kanjiFlatLessons,        TEXT_COLOR_kanji, goKanjiLesson)}
//             {activePart === "vocab"   && renderFlatLessons(vocabFlatLessons as any, TEXT_COLOR_vocab, goVocabLesson)}
//             {activePart === "grammar" && renderFlatGrammar()}
//           </>
//         )}

//         <View style={{ height: 16 }} />
//       </ScrollView>
//       <BottomTabBar />
//     </View>
//   );
// }

// // ─── Styles ───────────────────────────────────────────────────────────────────
// const s = StyleSheet.create({
//   root: { flex: 1, backgroundColor: "#f1f5f9" },

//   headerTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingLeft: 12, paddingRight: 28, paddingTop: 6, paddingBottom: 0 },
//   titleWrap: { flex: 1 },
//   backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
//   backIcon: { color: "#fff", fontSize: 32, fontWeight: "300", marginTop: -4 },
//   headerTitle: { color: "#fff", fontSize: 18, fontWeight: "900", letterSpacing: 0.3 },
//   headerSub:   { color: "rgba(255,255,255,0.75)", fontSize: 11, fontWeight: "600", marginTop: 2 },

//   summaryRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", paddingVertical: 2, paddingHorizontal: 20 },
//   summaryChip: { flex: 1, alignItems: "center" },
//   summaryNum:  { color: "#fff", fontSize: 18, fontWeight: "900" },
//   summaryLbl:  { color: "rgba(255,255,255,0.75)", fontSize: 11, fontWeight: "600", marginTop: 1 },
//   summaryDivider: { width: 1, height: 32, backgroundColor: "rgba(255,255,255,0.3)" },

//   partTabsRow: { 
//     flexDirection: "row", 
//     paddingHorizontal: 12, 
//     paddingBottom: 10, 
//     paddingTop: 10,
//     gap: 8 
//   },
//   partTab: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.18)" },
//   partTabJP:       { color: "rgba(255,255,255,0.85)", fontSize: 16, fontWeight: "900" },
//   partTabJPActive: { color: "#fff" },
//   partTabVI:       { color: "rgba(255,255,255,0.65)", fontSize: 9, fontWeight: "600", marginTop: 1 },
//   partTabVIActive: { color: "rgba(255,255,255,0.9)" },

//   scroll: { flex: 1 },
//   scrollContent: { padding: 12 },

//   sectionLabel: { flexDirection: "row", alignItems: "center", borderLeftWidth: 3, paddingLeft: 10, marginBottom: 12, marginTop: 4 },
//   sectionLabelJP:   { fontSize: 15, fontWeight: "900", color: "#0f172a" },
//   //sectionLabelVI:   { fontSize: 13, fontWeight: "700", color: "#475569" },
//   sectionLabelMeta: { fontSize: 11, color: "#94a3b8", marginLeft: "auto" },

//   // Week accordion cards
//   weekCard: { backgroundColor: "#fff", borderRadius: 14, marginBottom: 10, overflow: "hidden", elevation: 2, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
//   weekHeader: { flexDirection: "row", alignItems: "center", padding: 12, borderLeftWidth: 4, gap: 10 },
//   weekBadge: { width: 56, height: 56, borderRadius: 10, alignItems: "center", justifyContent: "center" },
//   weekBadgeJP: { color: "#fff", fontSize: 13, fontWeight: "900" },
//   weekBadgeVI: { color: "rgba(255,255,255,0.85)", fontSize: 9, fontWeight: "700", marginTop: 1 },
//   weekMeta: { flex: 1 },
//   weekMetaLessons: { fontSize: 15, fontWeight: "800", color: "#0f172a" },
//   weekMetaCount:   { fontSize: 12, color: "#64748b", marginTop: 2 },
//   progressBar: { width: 60, height: 4, backgroundColor: "#e2e8f0", borderRadius: 2 },
//   progressFill: { height: 4, borderRadius: 2 },
//   chevron: { fontSize: 24, color: "#94a3b8" },
//   chevronOpen: { transform: [{ rotate: "90deg" }] },

//   lessonsWrap: { borderTopWidth: 1, borderTopColor: "#f1f5f9" },
//   lessonRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f8fafc", gap: 12 },
//   lessonNumCircle: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, alignItems: "center", justifyContent: "center", backgroundColor: "#f8fafc" },
//   lessonNumText: { fontSize: 13, fontWeight: "800" },
//   lessonInfo: { flex: 1 },
//   lessonTitle: { fontSize: 14, fontWeight: "700", color: "#1e293b" },
//   lessonCount: { fontSize: 11, color: "#64748b", marginTop: 1 },
//   studyBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
//   studyBtnText: { color: "#fff", fontSize: 12, fontWeight: "800" },

//   grammarContent: { padding: 14, borderTopWidth: 1, borderTopColor: "#f1f5f9" },
//   grammarPreview: { fontSize: 13, color: "#475569", lineHeight: 20, marginBottom: 10, fontWeight: "500" },
//   grammarStudyBtn: { borderRadius: 10, paddingVertical: 10, alignItems: "center" },
//   grammarStudyBtnText: { color: "#fff", fontSize: 14, fontWeight: "800" },

//   // Flat list card
//   flatCard: { backgroundColor: "#fff", borderRadius: 14, overflow: "hidden", elevation: 2, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
//   flatRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, gap: 12 },
//   flatRowBorder: { borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },

//   // Grammar all-in-one block
//   grammarAllHeader: { flexDirection: "row", alignItems: "center", padding: 14, borderLeftWidth: 4, gap: 12 },
//   grammarAllBadge: { width: 60, height: 60, borderRadius: 10, alignItems: "center", justifyContent: "center" },
//   grammarAllBadgeText: { color: "#fff", fontSize: 20, fontWeight: "900" },
//   grammarAllBadgeSub: { color: "rgba(255,255,255,0.85)", fontSize: 10, fontWeight: "700" },
//   grammarAllTitle: { fontSize: 15, fontWeight: "800", color: "#0f172a", marginBottom: 4 },
//   grammarAllPreview: { fontSize: 12, color: "#64748b", lineHeight: 18 },
// });
