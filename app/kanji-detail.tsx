// ─────────────────────────────────────────────────────────────────────────────
// kanji-detail.tsx
// Trang chi tiết Kanji — hỗ trợ nhiều chữ (tab chuyển đổi)
// Tìm dữ liệu từ kanjifull.json (ưu tiên) → fallback n5→n1
// ─────────────────────────────────────────────────────────────────────────────

import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { BottomTabBar } from "../components/BottomTabBar";
import { AdBanner } from "../components/AdBanner";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { StatusBar } from 'expo-status-bar';
import {
  getKanjiByCharFull,
  getExamplesByKanjiChar,
  type KanjiItem,
  type KanjiExample,
} from "../assets/data_JLPT_kanji";
import { FeedbackSection } from "../components/FeedbackSection";
import { KanjiStrokeOrder } from "../components/KanjiStrokeOrder";
import { WritingPracticeModal } from "../components/WritingPracticeModal";
import { KanjiNotesModal } from "../components/KanjiNotesModal";
import React, { useMemo, useState, useEffect } from "react";
import { useColors, useThemeMode } from "../artifacts/mirai-jp/hooks/useColors";

const MAX_EXAMPLES = 15

function extractKanjiChars(text: string): string[] {
  const chars: string[] = [];
  const seen = new Set<string>();
  for (const c of text) {
    if (/[\u3400-\u9fff\uf900-\ufaff]/.test(c) && !seen.has(c)) {
      seen.add(c);
      chars.push(c);
    }
  }
  return chars;
}

// ─── TabItem ─────────────────────────────────────────────────────────────────
const TabItem = React.memo(({
  char, index, isActive, onPress, c,
}: {
  char: string; index: number; isActive: boolean; onPress: (idx: number) => void;
  c: ReturnType<typeof useColors>;
}) => (
  <TouchableOpacity
    style={[
      styles.tabItem,
      { borderBottomColor: isActive ? c.primary : "transparent" },
    ]}
    onPress={() => onPress(index)}
  >
    <Text style={[styles.tabText, { color: isActive ? c.primary : c.mutedForeground }, isActive && { fontWeight: "bold" }]}>
      {char}
    </Text>
  </TouchableOpacity>
));

export default function KanjiDetailScreen() {
  const c = useColors(); // bảng màu hiện tại — tự đổi theo giờ / lựa chọn người dùng
  const { themeMode, timeOfDay } = useThemeMode();
  // StatusBar: "dark" = chữ/icon đen (dùng trên nền sáng),
  // "light" = chữ/icon trắng (dùng trên nền tối). Nếu để cố định "dark",
  // giờ/wifi sẽ biến mất trên nền tối vì đen trên đen.
  const isDark = themeMode === "dark" || (themeMode === "auto" && timeOfDay === "night");
  const statusBarStyle = isDark ? "light" : "dark";

  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    kanji?: string;
    kanjiChars?: string;
    fromSearch?: string;
    currentIndex?: string;
    kanjiList?: string;
  }>();

  const id = typeof params.id === "string" ? params.id : "";
  const directKanji = typeof params.kanji === "string" ? params.kanji : "";
  const kanjiChars = useMemo(() => {
    const candidates = [params.kanjiChars, id || directKanji].filter(Boolean) as string[];

    for (const candidate of candidates) {
      if (!candidate) continue;

      let raw: string[] = [];
      try {
        raw = JSON.parse(candidate) as string[];
      } catch {
        raw = candidate.split(',').filter(Boolean);
      }

      const seen = new Set<string>();
      const result: string[] = [];
      for (const entry of raw) {
        for (const c of extractKanjiChars(entry)) {
          if (!seen.has(c)) { seen.add(c); result.push(c); }
        }
      }

      if (result.length > 0) {
        return result;
      }

      if (raw.length > 0) {
        return raw;
      }
    }

    if (id) {
      const chars = extractKanjiChars(id.replace(/\s+/g, ''));
      return chars.length > 0 ? chars : [id];
    }

    if (directKanji) {
      const chars = extractKanjiChars(directKanji.replace(/\s+/g, ''));
      return chars.length > 0 ? chars : [directKanji];
    }

    return [];
  }, [params.kanjiChars, id, directKanji]);

  const totalKanji = kanjiChars.length;

  // ── Tab state ─────────────────────────────────────────────────────────────
  const [tabIndex, setTabIndex] = useState(0);
  useEffect(() => { setTabIndex(0); }, [kanjiChars.join(',')]);

  const activeChar = kanjiChars[tabIndex] ?? kanjiChars[0] ?? "";

  // ── Load dữ liệu ──────────────────────────────────────────────────────────
  const [kanjiData, setKanjiData] = useState<KanjiItem | null>(null);
  const [examples, setExamples] = useState<KanjiExample[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeChar) { setKanjiData(null); setExamples([]); setLoading(false); return; }

    setLoading(true);
    setKanjiData(null);
    setExamples([]);

    const rafId = requestAnimationFrame(() => {
      const data = getKanjiByCharFull(activeChar) || null;
      setKanjiData(data);

      const inlineExamples = (data as any)?.examples || [];
      const vocabExamples = getExamplesByKanjiChar(activeChar, MAX_EXAMPLES);
      const combined = [...inlineExamples];
      for (const ex of vocabExamples) {
        if (combined.length >= MAX_EXAMPLES) break;
        if (!combined.some(c => c.jp === ex.jp)) {
          combined.push(ex);
        }
      }
      setExamples(combined);
      setLoading(false);
    });

    return () => cancelAnimationFrame(rafId);
  }, [activeChar]);
  // ── Modal state ───────────────────────────────────────────────────────────
  const [writingItem, setWritingItem] = useState<KanjiItem | null>(null);
  const [notesItem, setNotesItem] = useState<KanjiItem | null>(null);

  // ── Header chung (dùng lại ở nhiều trạng thái) ───────────────────────────
  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: c.background }]}>
      <TouchableOpacity
        onPress={() => router.back()}
        style={[styles.backBtnHeader, { backgroundColor: c.card, borderColor: c.border }]}
        hitSlop={8}
      >
        <Text style={[styles.backIcon, { color: c.text }]}>‹</Text>
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: c.text }]}>Chi tiết Kanji</Text>
      <View style={{ width: 42 }} />
    </View>
  );

  // ── Tab bar (luôn hiện khi có nhiều chữ, kể cả đang loading) ─────────────
  const renderTabs = () => {
    if (totalKanji <= 1) return null;
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.tabBar, { backgroundColor: c.card, borderBottomColor: c.border }]}
        contentContainerStyle={{ paddingVertical: 0 }}
        removeClippedSubviews={true}
      >
        <View style={styles.tabContainer}>
          {kanjiChars.map((char, idx) => (
            <TabItem
              key={`${char}_${idx}`}
              char={char}
              index={idx}
              isActive={tabIndex === idx}
              onPress={setTabIndex}
              c={c}
            />
          ))}
        </View>
      </ScrollView>
    );
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.root, { backgroundColor: c.background }]}>
        <StatusBar style={statusBarStyle} />
        {renderHeader()}
        {renderTabs()}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: c.primary, fontSize: 15 }}>Đang tải...</Text>
        </View>
        <BottomTabBar />
      </View>
      </>
    );
  }

  // ── Không tìm thấy ────────────────────────────────────────────────────────
  if (!kanjiData) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.root, { backgroundColor: c.background }]}>
          <StatusBar style={statusBarStyle} />
          {renderHeader()}
          {renderTabs()}
          <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
            <Text style={{ fontSize: 16, color: c.mutedForeground }}>
              Không tìm thấy chữ{activeChar ? ` "${activeChar}"` : ""} trong cơ sở dữ liệu.
            </Text>
          </View>
          <BottomTabBar />
        </View>
      </>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.root, { backgroundColor: c.background }]}>
        <StatusBar style={statusBarStyle} />
        {renderHeader()}
        {renderTabs()}

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
            {/* ── Header: Chữ kanji + Hán Việt + Actions ── */}
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.bigKanji, { color: c.text }]}>{kanjiData.kanji}</Text>
                <Text style={[styles.bigHanViet, { color: c.mutedForeground }]}>{kanjiData.hanviet?.join(' • ') || ''}</Text>
              </View>
              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: c.card, borderColor: c.border }]}
                  onPress={() => setWritingItem(kanjiData)} hitSlop={6}>
                  <Text style={[styles.actionIcon, { color: c.text }]}>✎</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: c.card, borderColor: c.border }]}
                  onPress={() => setNotesItem(kanjiData)} hitSlop={6}>
                  <Text style={[styles.actionIcon, { color: c.text }]}>📋</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: c.border }]} />

            {/* ── Phát âm ── */}
            <Text style={[styles.sectionTitle, { color: c.text }]}>Phát âm</Text>
            {kanjiData.readings?.kunyomi?.length > 0 && (
              <View style={styles.pronRow}>
                <Text style={[styles.diamond, { color: c.accent }]}>◆</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.pronLabel, { color: c.primary }]}>Kunyomi</Text>
                  <Text style={[styles.pronValue, { color: c.text }]}>{kanjiData.readings.kunyomi.join("、")}</Text>
                </View>
              </View>
            )}
            {kanjiData.readings?.onyomi?.length > 0 && (
              <View style={styles.pronRow}>
                <Text style={[styles.diamond, { color: c.accent }]}>◆</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.pronLabel, { color: c.primary }]}>Onyomi</Text>
                  <Text style={[styles.pronValue, { color: c.text }]}>{kanjiData.readings.onyomi.join("、")}</Text>
                </View>
              </View>
            )}

            {/* ── Thứ tự nét ── */}
            <View style={styles.strokeWrap}>
              <KanjiStrokeOrder kanji={kanjiData.kanji} size={180} />
            </View>

            {/* ── Thống kê ── */}
            <View style={styles.statsRow}>
              <View style={styles.statCol}>
                <View style={[styles.statChip, { backgroundColor: c.muted, borderColor: c.border }]}>
                  <Text style={[styles.statChipText, { color: c.mutedForeground }]}>JLPT</Text>
                </View>
                <Text style={[styles.statValue, { color: c.primary }]}>{kanjiData.jlpt || "—"}</Text>
              </View>
              <View style={styles.statCol}>
                <View style={[styles.statChip, { backgroundColor: c.muted, borderColor: c.border }]}>
                  <Text style={[styles.statChipText, { color: c.mutedForeground }]}>Tần suất</Text>
                </View>
                <Text style={[styles.statValue, { color: c.primary }]}>{kanjiData.freq ? `#${kanjiData.freq}/2500` : "—"}</Text>
              </View>
              <View style={styles.statCol}>
                <View style={[styles.statChip, { backgroundColor: c.muted, borderColor: c.border }]}>
                  <Text style={[styles.statChipText, { color: c.mutedForeground }]}>Số nét</Text>
                </View>
                <Text style={[styles.statValue, { color: c.primary }]}>{kanjiData.strokes || "—"}</Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: c.border }]} />

            {/* ── Bộ thủ ── */}
            {(kanjiData.components ?? []).length > 0 && (
              <>
                <View style={styles.bushuHeader}>
                  <Text style={[styles.sectionTitle, { color: c.text }]}>Bộ & Phân tích</Text>
                </View>
                {(kanjiData.components ?? []).map((comp, i) => (
                  <View key={i} style={styles.bushuRow}>
                    <View style={[styles.bushuBar, { backgroundColor: c.accent }]} />
                    <Text style={[styles.bushuKanji, { color: c.text }]}>{comp.kanji}</Text>
                    {comp.hanViet ? <Text style={[styles.bushuHanViet, { color: c.mutedForeground }]}>{comp.hanViet}</Text> : null}
                  </View>
                ))}
                <View style={[styles.divider, { backgroundColor: c.border }]} />
              </>
            )}

            {/* ── Nghĩa ── */}
            <Text style={[styles.sectionTitle, { color: c.text }]}>Nghĩa</Text>
            {kanjiData.meanings_vi?.map((m, i) => (
              <View key={i} style={styles.meaningRow}>
                <Text style={[styles.meaningDot, { color: c.accent }]}>•</Text>
                <Text style={[styles.meaningText, { color: c.text }]}>{m}</Text>
              </View>
            ))}

            {/* ── Ví dụ ── */}
            {examples.length > 0 && (
              <>
                <View style={[styles.divider, { backgroundColor: c.border }]} />
                <Text style={[styles.sectionTitle, { color: c.text }]}>Ví dụ {examples.length}</Text>
                {examples.map((ex, i) => (
                  <View key={i} style={styles.exampleRow}>
                    <Text style={[styles.exampleJp, { color: c.text }]}>{ex.jp}</Text>
                    <Text style={[styles.exampleReading, { color: c.primary }]}>{ex.reading}</Text>
                    <Text style={[styles.exampleVi, { color: c.mutedForeground }]}>→ {ex.vi}</Text>
                  </View>
                ))}
              </>
            )}
          </View>

          <View style={{ paddingHorizontal: 12 }}>
            <FeedbackSection pageKey={`kanji-detail::${kanjiData.id}`} />
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>

        <WritingPracticeModal item={writingItem} onClose={() => setWritingItem(null)} />
        <KanjiNotesModal item={notesItem} onClose={() => setNotesItem(null)} />
        <BottomTabBar />
        <AdBanner />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
  },
  backBtnHeader: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  backIcon: {
    fontSize: 28,
    fontWeight: '300',
    marginTop: -4,
  },
  // Tab
  tabBar: {
    maxHeight: 60,
    borderBottomWidth: 1,
  },
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 10,
    alignItems: "center",
  },
  tabItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 2,
    minHeight: 40,
    justifyContent: "center",
  },
  tabText: {
    fontSize: 22,
    fontWeight: "700",
  },

  scroll: {
    flex: 1
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 12
  },

  // Card
  card: { borderRadius: 14, padding: 16, borderWidth: 1 },
  headerRow: { flexDirection: "row", alignItems: "flex-start" },
  bigKanji: { fontSize: 32, fontWeight: "800", lineHeight: 40 },
  bigHanViet: { fontSize: 18, fontWeight: "700", letterSpacing: 1, marginTop: 2 },
  headerActions: { flexDirection: "row", alignItems: "center" },
  actionBtn: { width: 42, height: 42, borderRadius: 12, borderWidth: 1.5, alignItems: "center", justifyContent: "center", marginLeft: 6 },
  actionIcon: { fontSize: 20 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 14 },
  sectionTitle: { fontSize: 16, fontWeight: "800", marginBottom: 10 },

  // Phát âm
  pronRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10, flexWrap: "wrap" },
  diamond: { fontSize: 16, marginRight: 8, marginTop: 4 },
  pronLabel: { fontSize: 14, fontWeight: "700" },
  pronValue: { fontSize: 20, marginTop: 2, flex: 1, flexWrap: "wrap", paddingRight: 8 },

  // Thứ tự nét
  strokeWrap: { alignItems: "center", marginVertical: 6 },

  // Stats
  statsRow: { flexDirection: "row", marginTop: 14, paddingHorizontal: 4 },
  statCol: { flex: 1, alignItems: "center" },
  statChip: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 14, borderWidth: 1 },
  statChipText: { fontSize: 12, fontWeight: "600" },
  statValue: { fontSize: 18, fontWeight: "800", marginTop: 6 },

  // Bộ thủ
  bushuHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  bushuRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  bushuBar: { width: 3, height: 18, marginRight: 8, borderRadius: 2 },
  bushuKanji: { fontSize: 28, fontWeight: "700", marginRight: 6 },
  bushuHanViet: { fontSize: 14 },

  // Nghĩa
  meaningRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 6 },
  meaningDot: { fontSize: 18, marginRight: 8 },
  meaningText: { flex: 1, fontSize: 18, lineHeight: 22 },

  // Ví dụ
  exampleRow: { marginBottom: 12, paddingLeft: 4 },
  exampleJp: { fontSize: 20, fontWeight: "700" },
  exampleReading: { fontSize: 16, marginTop: 2 },
  exampleVi: { fontSize: 16, marginTop: 2 },
});