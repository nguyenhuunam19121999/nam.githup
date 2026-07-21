// ─────────────────────────────────────────────────────────────────────────────
// kanji-detail.tsx
// Trang chi tiết Kanji — hỗ trợ nhiều chữ (tab chuyển đổi)
// Tìm dữ liệu từ kanjifull.json (ưu tiên) → fallback n5→n1
// ─────────────────────────────────────────────────────────────────────────────

import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { BottomTabBar } from "../components/BottomTabBar";
import {
  ScrollView,
  // StatusBar,
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

const TEAL = "#004370";
const TEAL_DARK = "#004370";
const BG_GRAY = "#f0f4f8";
const TEXT_COLOR = "#e47b0b";

const MAX_EXAMPLES = 15

// Thêm gần đầu file, cùng chỗ các hằng số TEAL...
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
  char, index, isActive, onPress,
}: {
  char: string; index: number; isActive: boolean; onPress: (idx: number) => void;
}) => (
  <TouchableOpacity
    style={[styles.tabItem, isActive && styles.tabItemActive]}
    onPress={() => onPress(index)}
  >
    <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{char}</Text>
  </TouchableOpacity>
));

export default function KanjiDetailScreen() {
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
  // const kanjiChars = useMemo(() => {
  //   if (params.kanjiChars) {
  //     try { return JSON.parse(params.kanjiChars) as string[]; }
  //     catch { return params.kanjiChars.split(',').filter(Boolean); }
  //   }
  //   if (id) {
  //     const chars = [...id.replace(/\s+/g, '')].filter(Boolean);
  //     return chars.length > 0 ? chars : [id];
  //   }
  //   return [];
  // }, [params.kanjiChars, id]);

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

    // requestAnimationFrame: ~16ms, không block UI
    const rafId = requestAnimationFrame(() => {
      // getKanjiByCharFull → getKanjiById → tìm kanjifull trước, fallback n5→n1
      const data = getKanjiByCharFull(activeChar) || null;
      setKanjiData(data);

      // LẤY TỪ JSON + BỔ SUNG TỪ TỪ VỰNG:
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
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtnHeader} hitSlop={8}>
        <Text style={styles.backIcon}>‹</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Chi tiết Kanji</Text>
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
        style={styles.tabBar}
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
      <View style={styles.root}>
        {/* <Stack.Screen options={{ headerShown: false }} /> */}
        <StatusBar style="dark" />
        {renderHeader()}
        {renderTabs()}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: TEAL, fontSize: 15 }}>Đang tải...</Text>
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
        <View style={styles.root}>
          <StatusBar style="dark" />
          {renderHeader()}
          {renderTabs()}
          <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
            <Text style={{ fontSize: 16, color: '#475569' }}>
              Không tìm thấy chữ{activeChar ? ` "${activeChar}"` : ""} trong cơ sở dữ liệu.
            </Text>
          </View>
          <BottomTabBar />
        </View>
      </>
    );
  }
  // if (!kanjiData) {
  //   return (
  //     <View style={styles.root}>
  //       <Stack.Screen options={{ headerShown: false }} />
  //       <StatusBar style="dark" />
  //       {renderHeader()}
  //       {renderTabs()}
  //       <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
  //         <Text style={{ fontSize: 16, color: '#475569' }}>
  //           Không tìm thấy chữ{activeChar ? ` "${activeChar}"` : ""} trong cơ sở dữ liệu.
  //         </Text>
  //       </View>
  //       <BottomTabBar />
  //     </View>
  //   );
  // }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.root}>
        {/* <Stack.Screen options={{ headerShown: false }} /> */}
        <StatusBar style="dark" />
        {renderHeader()}
        {renderTabs()}

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            {/* ── Header: Chữ kanji + Hán Việt + Actions ── */}
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.bigKanji}>{kanjiData.kanji}</Text>
                <Text style={styles.bigHanViet}>{kanjiData.hanviet?.join(' • ') || ''}</Text>
              </View>
              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnActive]}
                  onPress={() => setWritingItem(kanjiData)} hitSlop={6}>
                  <Text style={[styles.actionIcon, styles.actionIconActive]}>✎</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnActive]}
                  onPress={() => setNotesItem(kanjiData)} hitSlop={6}>
                  <Text style={[styles.actionIcon, styles.actionIconActive]}>📋</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.divider} />

            {/* ── Phát âm ── */}
            <Text style={styles.sectionTitle}>Phát âm</Text>
            {kanjiData.readings?.kunyomi?.length > 0 && (
              <View style={styles.pronRow}>
                <Text style={styles.diamond}>◆</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pronLabel}>Kunyomi</Text>
                  <Text style={styles.pronValue}>{kanjiData.readings.kunyomi.join("、")}</Text>
                </View>
              </View>
            )}
            {kanjiData.readings?.onyomi?.length > 0 && (
              <View style={styles.pronRow}>
                <Text style={styles.diamond}>◆</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pronLabel}>Onyomi</Text>
                  <Text style={styles.pronValue}>{kanjiData.readings.onyomi.join("、")}</Text>
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
                <View style={styles.statChip}><Text style={styles.statChipText}>JLPT</Text></View>
                <Text style={styles.statValue}>{kanjiData.jlpt || "—"}</Text>
              </View>
              <View style={styles.statCol}>
                <View style={styles.statChip}><Text style={styles.statChipText}>Tần suất</Text></View>
                <Text style={styles.statValue}>{kanjiData.freq ? `#${kanjiData.freq}/2500` : "—"}</Text>
              </View>
              <View style={styles.statCol}>
                <View style={styles.statChip}><Text style={styles.statChipText}>Số nét</Text></View>
                <Text style={styles.statValue}>{kanjiData.strokes || "—"}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* ── Bộ thủ ── */}
            {(kanjiData.components ?? []).length > 0 && (
              <>
                <View style={styles.bushuHeader}>
                  <Text style={styles.sectionTitle}>Bộ & Phân tích</Text>
                </View>
                {(kanjiData.components ?? []).map((c, i) => (
                  <View key={i} style={styles.bushuRow}>
                    <View style={styles.bushuBar} />
                    <Text style={styles.bushuKanji}>{c.kanji}</Text>
                    {c.hanViet ? <Text style={styles.bushuHanViet}>{c.hanViet}</Text> : null}
                  </View>
                ))}
                <View style={styles.divider} />
              </>
            )}

            {/* ── Nghĩa ── */}
            <Text style={styles.sectionTitle}>Nghĩa</Text>
            {kanjiData.meanings_vi?.map((m, i) => (
              <View key={i} style={styles.meaningRow}>
                <Text style={styles.meaningDot}>•</Text>
                <Text style={styles.meaningText}>{m}</Text>
              </View>
            ))}

            {/* ── Ví dụ ── */}
            {examples.length > 0 && (
              <>
                <View style={styles.divider} />
                <Text style={styles.sectionTitle}>Ví dụ {examples.length}</Text>
                {examples.map((ex, i) => (
                  <View key={i} style={styles.exampleRow}>
                    <Text style={styles.exampleJp}>{ex.jp}</Text>
                    <Text style={styles.exampleReading}>{ex.reading}</Text>
                    <Text style={styles.exampleVi}>→ {ex.vi}</Text>
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
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG_GRAY },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: BG_GRAY,
  },
  backBtnHeader: {
    width: 42,
    height: 42,
    backgroundColor: '#fff',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEAL_DARK,
  },
  iconBtn: {
    width: 42,
    height: 42,
    backgroundColor: '#fff',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  backIcon: {
    fontSize: 28,
    color: TEAL_DARK,
    fontWeight: '300',
    marginTop: -4,
  },
  // Tab
  tabBar: { 
    maxHeight: 60, 
    borderBottomWidth: 1, 
    borderBottomColor: "#eee", 
    backgroundColor: "#fff",
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
    borderBottomColor: "transparent",
    minHeight: 40,              
    justifyContent: "center", 
  },
  tabItemActive: { 
    borderBottomColor: TEAL 
  },
  tabText: { 
    fontSize: 22, 
    fontWeight: "700", 
    color: "#666" 
  },
  tabTextActive: { 
    color: TEAL, 
    fontWeight: "bold" 
  },

  scroll: { 
    flex: 1 
  },
  scrollContent: { 
    padding: 12, 
    paddingBottom: 12 
  },

  // Card
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "#e2e8f0" },
  headerRow: { flexDirection: "row", alignItems: "flex-start" },
  bigKanji: { fontSize: 32, fontWeight: "800", color: TEAL_DARK, lineHeight: 40 },
  bigHanViet: { fontSize: 18, color: "#475569", fontWeight: "700", letterSpacing: 1, marginTop: 2 },
  headerActions: { flexDirection: "row", alignItems: "center" },
  actionBtn: { width: 42, height: 42, borderRadius: 12, borderWidth: 1.5, borderColor: "#e2e8f0", alignItems: "center", justifyContent: "center", marginLeft: 6, backgroundColor: "#fff" },
  actionIcon: { fontSize: 20 },
  actionBtnActive: { backgroundColor: "#fff", borderColor: "#e2e8f0" },
  actionIconActive: { color: TEAL_DARK },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: "#e2e8f0", marginVertical: 14 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a", marginBottom: 10 },

  // Phát âm
  pronRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10, flexWrap: "wrap" },
  diamond: { color: TEXT_COLOR, fontSize: 16, marginRight: 8, marginTop: 4 },
  pronLabel: { fontSize: 14, fontWeight: "700", color: TEAL },
  pronValue: { fontSize: 20, color: TEAL_DARK, marginTop: 2, flex: 1, flexWrap: "wrap", paddingRight: 8 },

  // Thứ tự nét
  strokeWrap: { alignItems: "center", marginVertical: 6 },

  // Stats
  statsRow: { flexDirection: "row", marginTop: 14, paddingHorizontal: 4 },
  statCol: { flex: 1, alignItems: "center" },
  statChip: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 14, borderWidth: 1, borderColor: "#cbd5e1", backgroundColor: "#f8fafc" },
  statChipText: { fontSize: 12, color: TEXT_COLOR, fontWeight: "600" },
  statValue: { fontSize: 18, fontWeight: "800", color: TEAL, marginTop: 6 },

  // Bộ thủ
  bushuHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  bushuRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  bushuBar: { width: 3, height: 18, backgroundColor: TEXT_COLOR, marginRight: 8, borderRadius: 2 },
  bushuKanji: { fontSize: 28, fontWeight: "700", color: TEAL_DARK, marginRight: 6 },
  bushuHanViet: { fontSize: 14, color: "#64748b" },

  // Nghĩa
  meaningRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 6 },
  meaningDot: { fontSize: 18, color: TEXT_COLOR, marginRight: 8 },
  meaningText: { flex: 1, fontSize: 18, color: TEAL, lineHeight: 22 },

  // Ví dụ
  exampleRow: { marginBottom: 12, paddingLeft: 4 },
  exampleJp: { fontSize: 20, fontWeight: "700", color: "#0f172a" },
  exampleReading: { fontSize: 16, color: TEAL, marginTop: 2 },
  exampleVi: { fontSize: 16, color: TEAL_DARK, marginTop: 2 },
});
