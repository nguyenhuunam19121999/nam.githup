// ─────────────────────────────────────────────────────────────────────────────
// soumatome-n2.tsx
// Màn hình tổng quan sách Soumatome N2 — chia theo tuần và bài học.
//
// PART ① 漢字: 36 bài (6 tuần × 6 bài), 200 chữ kanji
// PART ② 語彙: 24 bài (4 tuần × 6 bài), 631 từ vựng
// PART ③ 文法: 7 tuần, 207 mẫu ngữ pháp
// ─────────────────────────────────────────────────────────────────────────────

import { useRouter } from "expo-router";
import { BottomTabBar } from "@/components/BottomTabBar";
import { LinearGradient } from "expo-linear-gradient";
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
import { getKanjiByBook, type KanjiItem } from "../assets/data_JLPT_kanji";
import { getGrammarByBook, type GrammarItem } from "../assets/data_nn";
import { getVocab, type RawVocab } from "../assets/vocab";

const TEAL = "#7C3AED" /* old: #4ECDC4 */;
const GRAD = ["#7C3AED", "#5B21B6"] /* old: ["#7C3AED","#5B21B6"] */ as const;

type Part = "kanji" | "vocab" | "grammar";

interface PartConfig {
  key: Part;
  label: string;
  jpLabel: string;
  color: string;
  weeks: number;
  lessonsPerWeek: number;
}

const PARTS: PartConfig[] = [
  { key: "kanji",   label: "Hán tự",  jpLabel: "漢字", color: "#E03131", weeks: 6, lessonsPerWeek: 6 },
  { key: "vocab",   label: "Từ vựng", jpLabel: "語彙", color: "#2563EB", weeks: 4, lessonsPerWeek: 6 },
  { key: "grammar", label: "Ngữ pháp",jpLabel: "文法", color: "#7C3AED", weeks: 7, lessonsPerWeek: 0 },
];

// ─── Group kanji/vocab by week → lesson ──────────────────────────────────────
function groupByWeekLesson<T extends { week?: number; lesson?: number }>(
  items: T[],
  numWeeks: number,
  lessonsPerWeek: number,
): { week: number; total: number; lessons: { lesson: number; items: T[] }[] }[] {
  return Array.from({ length: numWeeks }, (_, wi) => {
    const w = wi + 1;
    const lessons = Array.from({ length: lessonsPerWeek }, (_, li) => {
      const l = wi * lessonsPerWeek + li + 1;
      return { lesson: l, items: items.filter((i) => i.lesson === l) };
    });
    const total = lessons.reduce((s, l) => s + l.items.length, 0);
    return { week: w, total, lessons };
  });
}

// ─── Group grammar by week only (no lesson subdivision) ─────────────────────
function groupGrammarByWeek(
  items: GrammarItem[],
  numWeeks: number,
): { week: number; items: GrammarItem[] }[] {
  return Array.from({ length: numWeeks }, (_, wi) => {
    const w = wi + 1;
    return { week: w, items: items.filter((g) => (g as GrammarItem & { week?: number }).week === w) };
  });
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function SoumatomeN2Screen() {
  const router = useRouter();
  const [activePart, setActivePart] = useState<Part>("kanji");
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set([1]));

  const kanjiData = useMemo(() => getKanjiByBook("soumatome-n2") as (KanjiItem & { lesson?: number; week?: number })[], []);
  const vocabData  = useMemo(() => getVocab(undefined, "soumatome-n2") as (RawVocab & { lesson?: number; week?: number })[], []);
  const grammarData = useMemo(() => getGrammarByBook("soumatome-n2"), []);

  const kanjiWeeks   = useMemo(() => groupByWeekLesson(kanjiData, 6, 6), [kanjiData]);
  const vocabWeeks   = useMemo(() => groupByWeekLesson(vocabData, 4, 6), [vocabData]);
  const grammarWeeks = useMemo(() => groupGrammarByWeek(grammarData, 7), [grammarData]);

  const currentPart = PARTS.find((p) => p.key === activePart)!;

  const toggleWeek = (w: number) => {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(w)) next.delete(w);
      else next.add(w);
      return next;
    });
  };

  const switchPart = (p: Part) => {
    setActivePart(p);
    setExpandedWeeks(new Set([1]));
  };

  // ── Navigation ─────────────────────────────────────────────────────────────
  const goKanjiLesson = (lesson: number) => {
    router.push({
      pathname: "/kanji",
      params: { bookId: "soumatome-n2", lesson: String(lesson), title: `漢字 · Bài ${lesson}` },
    });
  };

  const goVocabLesson = (lesson: number) => {
    router.push({
      pathname: "/vocab",
      params: { bookId: "soumatome-n2", lesson: String(lesson), title: `語彙 · Bài ${lesson}` },
    });
  };

  const goGrammarWeek = (week: number, count: number) => {
    router.push({
      pathname: "/grammar",
      params: { bookId: "soumatome-n2", week: String(week), title: `文法 · Tuần ${week} (${count} mẫu)` },
    });
  };

  // ── Render week/lesson accordion for Kanji & Vocab ─────────────────────────
  const renderWeekLesson = (
    weeks: ReturnType<typeof groupByWeekLesson>,
    color: string,
    onLesson: (l: number) => void,
  ) => weeks.map(({ week, total, lessons }) => {
    const isOpen = expandedWeeks.has(week);
    return (
      <View key={week} style={s.weekCard}>
        {/* Week header row */}
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
          <View style={[s.progressBar]}>
            <View style={[s.progressFill, { backgroundColor: color, width: "0%" }]} />
          </View>
          <Text style={[s.chevron, isOpen && s.chevronOpen]}>›</Text>
        </TouchableOpacity>

        {/* Lessons inside week */}
        {isOpen && (
          <View style={s.lessonsWrap}>
            {lessons.map(({ lesson, items }) => (
              <TouchableOpacity
                key={lesson}
                style={s.lessonRow}
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
        )}
      </View>
    );
  });

  // ── Render grammar weeks ────────────────────────────────────────────────────
  const renderGrammarWeeks = () => grammarWeeks.map(({ week, items }) => {
    const isOpen = expandedWeeks.has(week);
    const color = "#7C3AED";
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
            <Text style={s.grammarPreview} numberOfLines={2}>
              {preview}{items.length > 4 ? "..." : ""}
            </Text>
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

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={TEAL} />

      {/* ── Header ── */}
      <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
        <SafeAreaView edges={["top", "left", "right"]}>
          <View style={s.headerTopRow}>
            <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
              <Text style={s.backIcon}>‹</Text>
            </TouchableOpacity>
            <View style={s.logoBadge}>
              <Text style={s.logoMirai}>Mirai</Text>
              <Text style={s.logoDot}>.</Text>
              <Text style={s.logoJP}>JP</Text>
            </View>
          </View>
          <View style={s.headerTitleRow}>
            <Text style={s.headerTitle}>総まとめ N2</Text>
          </View>

          {/* Summary chips */}
          <View style={s.summaryRow}>
            <View style={s.summaryChip}>
              <Text style={s.summaryNum}>{kanjiData.length}</Text>
              <Text style={s.summaryLbl}>Kanji</Text>
            </View>
            <View style={s.summaryDivider} />
            <View style={s.summaryChip}>
              <Text style={s.summaryNum}>{vocabData.length}</Text>
              <Text style={s.summaryLbl}>Từ vựng</Text>
            </View>
            <View style={s.summaryDivider} />
            <View style={s.summaryChip}>
              <Text style={s.summaryNum}>{grammarData.length}</Text>
              <Text style={s.summaryLbl}>Ngữ pháp</Text>
            </View>
          </View>

          {/* Part tabs */}
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
                  <Text style={[s.partTabVI, active && s.partTabVIActive]}>{p.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* ── Week/lesson accordion list ── */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Section title */}
        <View style={[s.sectionLabel, { borderLeftColor: currentPart.color }]}>
          <Text style={s.sectionLabelJP}>{currentPart.jpLabel}</Text>
          <Text style={s.sectionLabelVI}> · {currentPart.label}</Text>
          {activePart !== "grammar" && (
            <Text style={s.sectionLabelMeta}>
              {currentPart.weeks} tuần · {currentPart.weeks * currentPart.lessonsPerWeek} bài
            </Text>
          )}
          {activePart === "grammar" && (
            <Text style={s.sectionLabelMeta}>{currentPart.weeks} tuần</Text>
          )}
        </View>

        {activePart === "kanji"   && renderWeekLesson(kanjiWeeks, "#E03131", goKanjiLesson)}
        {activePart === "vocab"   && renderWeekLesson(vocabWeeks as any, "#2563EB", goVocabLesson)}
        {activePart === "grammar" && renderGrammarWeeks()}

        <View style={{ height: 16 }} />
      </ScrollView>
      <BottomTabBar />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f1f5f9" },

  /* Header */
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 12,
    paddingRight: 28,
    paddingTop: 6,
    paddingBottom: 0,
  },
  headerTitleRow: {
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 8,
  },
  titleWrap: { flex: 1 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
  },
  backIcon: { color: "#fff", fontSize: 32, fontWeight: "300", marginTop: -4 },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "900", letterSpacing: 0.5 },
  headerSub:   { color: "rgba(255,255,255,0.75)", fontSize: 11, fontWeight: "600", marginTop: 2 },
  logoBadge: { flexDirection: "row", alignItems: "center" },
  logoMirai: { color: "#fff", fontSize: 22, fontWeight: "800" },
  logoDot:   { color: "#fff", fontSize: 22, fontWeight: "900" },
  logoJP:    { color: "#fff", fontSize: 20, fontWeight: "900" },

  /* Summary chips */
  summaryRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 20,
    gap: 0,
  },
  summaryChip: { flex: 1, alignItems: "center" },
  summaryNum:  { color: "#fff", fontSize: 22, fontWeight: "900" },
  summaryLbl:  { color: "rgba(255,255,255,0.75)", fontSize: 11, fontWeight: "600", marginTop: 1 },
  summaryDivider: { width: 1, height: 32, backgroundColor: "rgba(255,255,255,0.3)" },

  /* Part tabs */
  partTabsRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 8,
  },
  partTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  partTabJP:       { color: "rgba(255,255,255,0.85)", fontSize: 16, fontWeight: "900" },
  partTabJPActive: { color: "#fff" },
  partTabVI:       { color: "rgba(255,255,255,0.65)", fontSize: 9,  fontWeight: "600", marginTop: 1 },
  partTabVIActive: { color: "rgba(255,255,255,0.9)" },

  /* Scroll */
  scroll: { flex: 1 },
  scrollContent: { padding: 12 },

  /* Section label */
  sectionLabel: {
    flexDirection: "row",
    alignItems: "center",
    borderLeftWidth: 3,
    paddingLeft: 10,
    marginBottom: 12,
    marginTop: 4,
  },
  sectionLabelJP:   { fontSize: 15, fontWeight: "900", color: "#0f172a" },
  sectionLabelVI:   { fontSize: 13, fontWeight: "700", color: "#475569" },
  sectionLabelMeta: { fontSize: 11, color: "#94a3b8", marginLeft: "auto" },

  /* Week card */
  weekCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    marginBottom: 10,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  weekHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderLeftWidth: 4,
    gap: 10,
  },
  weekBadge: {
    width: 56, height: 56, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  weekBadgeJP: { color: "#fff", fontSize: 13, fontWeight: "900" },
  weekBadgeVI: { color: "rgba(255,255,255,0.85)", fontSize: 9, fontWeight: "700", marginTop: 1 },
  weekMeta:   { flex: 1 },
  weekMetaLessons: { fontSize: 15, fontWeight: "800", color: "#0f172a" },
  weekMetaCount:   { fontSize: 12, color: "#64748b", marginTop: 2 },
  progressBar:     { width: 60, height: 4, backgroundColor: "#e2e8f0", borderRadius: 2 },
  progressFill:    { height: 4, borderRadius: 2 },
  chevron:         { fontSize: 24, color: "#94a3b8", transform: [{ rotate: "0deg" }] },
  chevronOpen:     { transform: [{ rotate: "90deg" }] },

  /* Lessons inside week */
  lessonsWrap: { borderTopWidth: 1, borderTopColor: "#f1f5f9" },
  lessonRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f8fafc",
    gap: 12,
  },
  lessonNumCircle: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 1.5, alignItems: "center", justifyContent: "center",
    backgroundColor: "#f8fafc",
  },
  lessonNumText: { fontSize: 13, fontWeight: "800" },
  lessonInfo:    { flex: 1 },
  lessonTitle:   { fontSize: 14, fontWeight: "700", color: "#1e293b" },
  lessonCount:   { fontSize: 11, color: "#64748b", marginTop: 1 },
  studyBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8,
  },
  studyBtnText: { color: "#fff", fontSize: 12, fontWeight: "800" },

  /* Grammar specific */
  grammarContent: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  grammarPreview: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 20,
    marginBottom: 10,
    fontWeight: "500",
  },
  grammarStudyBtn: {
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  grammarStudyBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
});
