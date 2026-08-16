// ─────────────────────────────────────────────────────────────────────────────
// soumatome-n2.tsx
// Màn hình tổng quan sách Soumatome N2 — chia theo tuần và bài học.
//
// PART ① 漢字: 36 bài (6 tuần × 6 bài), 200 chữ kanji
// PART ② 語彙: 24 bài (4 tuần × 6 bài), 631 từ vựng
// PART ③ 文法: 7 tuần, 207 mẫu ngữ pháp
// ─────────────────────────────────────────────────────────────────────────────

import { useRouter } from "expo-router";
import { BottomTabBar } from "../components/BottomTabBar";
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
import { getVocab, getVocabByBook, type RawVocab } from "../assets/vocab";
import { useColors } from "../artifacts/mirai-jp/hooks/useColors";

type Part = "kanji" | "vocab" | "grammar";

interface PartConfig {
  key: Part;
  label: string;
  jpLabel: string;
  weeks: number;
  lessonsPerWeek: number;
}

// Bỏ "color" cố định khỏi config — 3 phần dùng chung c.primary hiện tại của theme,
// gán ở nơi dùng (bên trong component, nơi có quyền truy cập c).
type PartConfigBase = Omit<PartConfig, "color">;

const PARTS_BASE: PartConfigBase[] = [
  { key: "kanji", label: "Hán tự", jpLabel: "漢字", weeks: 8, lessonsPerWeek: 6 },
  { key: "vocab", label: "Từ vựng", jpLabel: "語彙", weeks: 8, lessonsPerWeek: 6 },
  { key: "grammar", label: "Ngữ pháp", jpLabel: "文法", weeks: 8, lessonsPerWeek: 0 },
];

// ─── Group kanji/vocab by week → lesson ──────────────────────────────────────
function groupByWeekLesson<T extends { week?: number; lesson?: number }>(
  items: T[],
  numWeeks: number,
  lessonsPerWeek: number,
): {
  week: number;
  total: number;
  lessons: { lesson: number; items: T[] }[];
}[] {
  const actualWeeks =
    items.length > 0
      ? Math.max(...items.map((i) => i.week ?? 0), numWeeks)
      : numWeeks;

  return Array.from({ length: actualWeeks }, (_, wi) => {
    const w = wi + 1;
    const weekItems = items.filter((i) => i.week === w);

    const lessonsInWeek = weekItems.map((i) => i.lesson ?? 0);
    const isPerWeekLesson =
      lessonsInWeek.length > 0 &&
      lessonsInWeek.every((l) => l >= 1 && l <= lessonsPerWeek);

    const lessons = Array.from({ length: lessonsPerWeek }, (_, li) => {
      const globalL = wi * lessonsPerWeek + li + 1;
      const localL = li + 1;
      const targetLesson = isPerWeekLesson ? localL : globalL;
      return {
        lesson: globalL,
        items: weekItems.filter((i) => i.lesson === targetLesson),
      };
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
    return {
      week: w,
      items: items.filter(
        (g) => (g as GrammarItem & { week?: number }).week === w,
      ),
    };
  });
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function SoumatomeN2Screen() {
  const c = useColors(); // bảng màu hiện tại — tự đổi theo giờ / lựa chọn người dùng
  const router = useRouter();
  const [activePart, setActivePart] = useState<Part>("kanji");
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set([1]));

  // 3 phần dùng chung màu primary hiện tại của theme
  const PARTS: PartConfig[] = PARTS_BASE.map((p) => ({ ...p, color: c.primary }));

  const kanjiData = useMemo(
    () =>
      getKanjiByBook("soumatome-n2") as (KanjiItem & {
        lesson?: number;
        week?: number;
      })[],
    [],
  );
  const vocabData = useMemo(
    () =>
      getVocabByBook("soumatome-n2") as (RawVocab & {
        lesson?: number;
        week?: number;
      })[],
    [],
  );
  const grammarData = useMemo(() => getGrammarByBook("soumatome-n2"), []);

  const kanjiWeeks = useMemo(
    () => groupByWeekLesson(kanjiData, 8, 6),
    [kanjiData],
  );
  const vocabWeeks = useMemo(
    () => groupByWeekLesson(vocabData, 8, 6),
    [vocabData],
  );
  const grammarWeeks = useMemo(() => {
    const actualWeeks =
      grammarData.length > 0
        ? Math.max(...grammarData.map((g) => (g as any).week ?? 0))
        : 8;
    return groupGrammarByWeek(grammarData, actualWeeks);
  }, [grammarData]);

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
      params: {
        bookId: "soumatome-n2",
        lesson: String(lesson),
        title: `漢字 · Bài ${lesson}`,
      },
    });
  };

  const goVocabLesson = (lesson: number) => {
    router.push({
      pathname: "/vocab",
      params: {
        bookId: "soumatome-n2",
        lesson: String(lesson),
        title: `語彙 · Bài ${lesson}`,
      },
    });
  };

  const goGrammarWeek = (week: number, count: number) => {
    router.push({
      pathname: "/grammar",
      params: {
        bookId: "soumatome-n2",
        week: String(week),
        title: `文法 · Tuần ${week} (${count} mẫu)`,
      },
    });
  };

  // ── Render week/lesson accordion for Kanji & Vocab ─────────────────────────
  const renderWeekLesson = (
    weeks: ReturnType<typeof groupByWeekLesson>,
    color: string,
    onLesson: (l: number) => void,
  ) =>
    weeks.map(({ week, total, lessons }) => {
      const isOpen = expandedWeeks.has(week);
      return (
        <View key={week} style={[s.weekCard, { backgroundColor: c.card }]}>
          {/* Week header row */}
          <TouchableOpacity
            style={[s.weekHeader, { borderLeftColor: color }]}
            onPress={() => toggleWeek(week)}
            activeOpacity={0.75}
          >
            <View style={[s.weekBadge, { backgroundColor: color }]}>
              <Text style={[s.weekBadgeJP, { color: c.primaryForeground }]}>第{week}週</Text>
              <Text style={[s.weekBadgeVI, { color: c.primaryForeground + "d9" }]}>Tuần {week}</Text>
            </View>
            <View style={s.weekMeta}>
              <Text style={[s.weekMetaLessons, { color: c.text }]}>{lessons.length} bài học</Text>
              <Text style={[s.weekMetaCount, { color: c.mutedForeground }]}>{total} mục</Text>
            </View>
            <View style={[s.progressBar, { backgroundColor: c.muted }]}>
              <View
                style={[
                  s.progressFill,
                  { backgroundColor: color, width: "0%" },
                ]}
              />
            </View>
            <Text style={[s.chevron, { color: c.mutedForeground }, isOpen && s.chevronOpen]}>›</Text>
          </TouchableOpacity>

          {/* Lessons inside week */}
          {isOpen && (
            <View style={[s.lessonsWrap, { borderTopColor: c.border }]}>
              {lessons.map(({ lesson, items }) => (
                <TouchableOpacity
                  key={lesson}
                  style={[s.lessonRow, { borderBottomColor: c.border }]}
                  onPress={() => onLesson(lesson)}
                  activeOpacity={0.7}
                >
                  <View style={[s.lessonNumCircle, { borderColor: color, backgroundColor: c.muted }]}>
                    <Text style={[s.lessonNumText, { color }]}>{lesson}</Text>
                  </View>
                  <View style={s.lessonInfo}>
                    <Text style={[s.lessonTitle, { color: c.text }]}>Bài {lesson}</Text>
                    <Text style={[s.lessonCount, { color: c.mutedForeground }]}>{items.length} mục</Text>
                  </View>
                  <View style={[s.studyBtn, { backgroundColor: color }]}>
                    <Text style={[s.studyBtnText, { color: c.primaryForeground }]}>Học ▶</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      );
    });

  // ── Render grammar weeks ────────────────────────────────────────────────────
  const renderGrammarWeeks = () =>
    grammarWeeks.map(({ week, items }) => {
      const isOpen = expandedWeeks.has(week);
      const color = c.primary;
      const preview = items
        .slice(0, 4)
        .map((g) => g.pattern)
        .join("・");
      return (
        <View key={week} style={[s.weekCard, { backgroundColor: c.card }]}>
          <TouchableOpacity
            style={[s.weekHeader, { borderLeftColor: color }]}
            onPress={() => toggleWeek(week)}
            activeOpacity={0.75}
          >
            <View style={[s.weekBadge, { backgroundColor: color }]}>
              <Text style={[s.weekBadgeJP, { color: c.primaryForeground }]}>第{week}週</Text>
              <Text style={[s.weekBadgeVI, { color: c.primaryForeground + "d9" }]}>Tuần {week}</Text>
            </View>
            <View style={s.weekMeta}>
              <Text style={[s.weekMetaLessons, { color: c.text }]}>{items.length} mẫu</Text>
              <Text style={[s.weekMetaCount, { color: c.mutedForeground }]}>Ngữ pháp</Text>
            </View>
            <Text style={[s.chevron, { color: c.mutedForeground }, isOpen && s.chevronOpen]}>›</Text>
          </TouchableOpacity>
          {isOpen && (
            <View style={[s.grammarContent, { borderTopColor: c.border }]}>
              <Text style={[s.grammarPreview, { color: c.text }]} numberOfLines={2}>
                {preview}
                {items.length > 4 ? "..." : ""}
              </Text>
              <TouchableOpacity
                style={[s.grammarStudyBtn, { backgroundColor: color }]}
                onPress={() => goGrammarWeek(week, items.length)}
                activeOpacity={0.8}
              >
                <Text style={[s.grammarStudyBtnText, { color: c.primaryForeground }]}>
                  Học {items.length} mẫu ngữ pháp ▶
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      );
    });

  return (
    <View style={[s.root, { backgroundColor: c.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={c.primary} />

      {/* ── Header ── */}
      <LinearGradient colors={[c.primary, c.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.headerGradient}>
        <SafeAreaView edges={["top", "left", "right"]}>
          <View style={s.headerTopRow}>
            <TouchableOpacity
              style={s.backBtn}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Text style={[s.backIcon, { color: c.primaryForeground }]}>‹</Text>
            </TouchableOpacity>
            <Text style={[s.headerTitle, { color: c.primaryForeground }]}>総まとめ N2</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Part tabs */}
          <View style={s.partTabsRow}>
            {PARTS.map((p) => {
              const active = activePart === p.key;
              return (
                <TouchableOpacity
                  key={p.key}
                  style={[
                    s.partTab,
                    { backgroundColor: c.primaryForeground + "2e" },
                    active && { backgroundColor: p.color },
                  ]}
                  onPress={() => switchPart(p.key)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      s.partTabJP,
                      { color: c.primaryForeground + "d9" },
                      active && { color: c.primaryForeground },
                    ]}
                  >
                    {p.jpLabel}
                  </Text>
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
          <Text style={[s.sectionLabelJP, { color: c.text }]}>{currentPart.jpLabel}</Text>
          <Text style={[s.sectionLabelVI, { color: c.mutedForeground }]}> · {currentPart.label}</Text>
          {activePart !== "grammar" && (
            <Text style={[s.sectionLabelMeta, { color: c.mutedForeground }]}>
              {currentPart.weeks} tuần ·{" "}
              {currentPart.weeks * currentPart.lessonsPerWeek} bài
            </Text>
          )}
          {activePart === "grammar" && (
            <Text style={[s.sectionLabelMeta, { color: c.mutedForeground }]}>{currentPart.weeks} tuần</Text>
          )}
        </View>

        {activePart === "kanji" &&
          renderWeekLesson(kanjiWeeks, c.primary, goKanjiLesson)}
        {activePart === "vocab" &&
          renderWeekLesson(vocabWeeks as any, c.primary, goVocabLesson)}
        {activePart === "grammar" && renderGrammarWeeks()}

        <View style={{ height: 16 }} />
      </ScrollView>
      <BottomTabBar />
    </View>
  );
}

// ─── Styles (chỉ layout — màu gán inline theo theme ở trên) ───────────────────
const s = StyleSheet.create({
  root: { 
    flex: 1, 
  },
  headerGradient: {
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingBottom: 10,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 12,
    paddingRight: 28,
    paddingTop: 6,
    paddingBottom: 0,
  },
  titleWrap: { flex: 1 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: { fontSize: 32, fontWeight: "300", marginTop: -4 },
  headerTitle: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  headerSub: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },

  /* Part tabs */
  partTabsRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingBottom: 10,
    paddingTop: 10,
    gap: 8,
  },
  partTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 12,
  },
  partTabJP: {
    fontSize: 16,
    fontWeight: "900",
  },

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
  sectionLabelJP: { fontSize: 15, fontWeight: "900" },
  sectionLabelVI: { fontSize: 13, fontWeight: "700" },
  sectionLabelMeta: { fontSize: 11, marginLeft: "auto" },

  /* Week card */
  weekCard: {
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
    width: 56,
    height: 56,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  weekBadgeJP: { fontSize: 13, fontWeight: "900" },
  weekBadgeVI: {
    fontSize: 9,
    fontWeight: "700",
    marginTop: 1,
  },
  weekMeta: { flex: 1 },
  weekMetaLessons: { fontSize: 15, fontWeight: "800" },
  weekMetaCount: { fontSize: 12, marginTop: 2 },
  progressBar: {
    width: 60,
    height: 4,
    borderRadius: 2,
  },
  progressFill: { height: 4, borderRadius: 2 },
  chevron: { fontSize: 24, transform: [{ rotate: "0deg" }] },
  chevronOpen: { transform: [{ rotate: "90deg" }] },

  /* Lessons inside week */
  lessonsWrap: { borderTopWidth: 1 },
  lessonRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 12,
  },
  lessonNumCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  lessonNumText: { fontSize: 13, fontWeight: "800" },
  lessonInfo: { flex: 1 },
  lessonTitle: { fontSize: 14, fontWeight: "700" },
  lessonCount: { fontSize: 11, marginTop: 1 },
  studyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  studyBtnText: { fontSize: 12, fontWeight: "800" },

  /* Grammar specific */
  grammarContent: {
    padding: 14,
    borderTopWidth: 1,
  },
  grammarPreview: {
    fontSize: 13,
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
    fontSize: 14,
    fontWeight: "800",
  },
});