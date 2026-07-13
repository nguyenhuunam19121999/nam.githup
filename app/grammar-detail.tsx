// ─────────────────────────────────────────────────────────────────────────────
// grammar-detail.tsx
// Trang chi tiết của 1 mẫu ngữ pháp. Hiển thị:
//   - Tên mẫu (kanji/kana lớn, màu xanh)
//   - Nghĩa tiếng Việt
//   - Nhãn JLPT (N1 → N5)
//   - Mục "Cấu trúc" và "Nghĩa" (giải thích)
//   - Danh sách ví dụ (nếu có)
// ─────────────────────────────────────────────────────────────────────────────

import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import React from "react";
import { BottomTabBar } from "../components/BottomTabBar";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context";

// import { LinearGradient } from "expo-linear-gradient";
import { getGrammarById } from "../assets/data_nn";
import { FeedbackSection } from "../components/FeedbackSection";

// ✅ MÀU CHỦ ĐẠO MỚI
const TEAL = "#1F6F7A";
const TEAL_DARK = "#1c5765";
// const GRAD = [TEAL, TEAL_DARK] as const;
const TEXT_COLOR = "#e47b0b";

export default function GrammarDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === "string" ? params.id : "";
  const grammar = getGrammarById(id);

  if (!grammar) {
    return (
      <> 
        <Stack.Screen options={{ headerShown: false }} />
        <View style={s.root}>
          <View style={s.header}>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtnHeader}>
              <Text style={s.backIcon}>‹</Text>
            </TouchableOpacity>
            <Text style={s.headerTitle}>Chi tiết Ngữ pháp</Text>
            <View style={{ width: 42 }} />
          </View>
          <View style={s.empty}>
            <Text style={s.emptyText}>Không tìm thấy mẫu ngữ pháp.</Text>
          </View>
        </View>
      </>
    );
  }

  return (
    <> 
      <Stack.Screen options={{ headerShown: false }} />
      <View style={s.root}>
        <StatusBar barStyle="dark-content" backgroundColor="#f1f5f9" />

        {/* Top bar */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtnHeader}>
            <Text style={s.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Chi tiết Ngữ pháp</Text>
          <View style={{ width: 42 }} />
        </View>

        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Card chi tiết */}
            <View style={s.card}>
              <View style={s.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={s.pattern}>{grammar.pattern}</Text>
                  <Text style={s.meaning}>{grammar.meaning}</Text>
                </View>
                <View style={s.headerActions}>
                  <View style={s.actionBtn}>
                    <Text style={s.actionIcon}>📌</Text>
                  </View>
                </View>
              </View>

              <View style={s.levelBadge}>
                <Text style={s.levelBadgeText}>JLPT {grammar.level}</Text>
              </View>

              {(grammar.week || grammar.day) && (
                <View style={s.weekRow}>
                  {grammar.week && <Text style={s.weekText}>Tuần {grammar.week}</Text>}
                  {grammar.day && <Text style={s.weekText}> · Ngày {grammar.day}</Text>}
                  {(grammar as any).day_title && <Text style={s.dayTitle}> · {(grammar as any).day_title}</Text>}
                </View>
              )}

              <Text style={s.sectionTitle}>Cấu trúc</Text>
              <View style={s.sectionContent}>
                <Text style={s.bulletDot}>◆</Text>
                <Text style={s.sectionBody}>{grammar.structure}</Text>
              </View>

              <View style={s.divider} />

              <Text style={s.sectionTitle}>Giải thích</Text>
              <View style={s.sectionContent}>
                <Text style={s.bulletDot}>◆</Text>
                <Text style={s.sectionBody}>{grammar.explanation}</Text>
              </View>

              {grammar.notes && (
                <>
                  <View style={s.divider} />
                  <Text style={s.sectionTitle}>Ghi chú</Text>
                  <View style={s.sectionContent}>
                    <Text style={s.bulletDot}>◆</Text>
                    <Text style={s.sectionBody}>{grammar.notes}</Text>
                  </View>
                </>
              )}

              {grammar.caution ? (
                <>
                  <View style={s.divider} />
                  <Text style={s.sectionTitle}>⚠️ Chú ý</Text>
                  <View style={s.cautionBox}>
                    <Text style={s.cautionText}>{grammar.caution}</Text>
                  </View>
                </>
              ) : null}

              {grammar.related_forms && grammar.related_forms.length > 0 && (
                <>
                  <View style={s.divider} />
                  <Text style={s.sectionTitle}>Dạng liên quan</Text>
                  <View style={s.relatedRow}>
                    {grammar.related_forms.map((f, i) => (
                      <View key={i} style={s.relatedChip}>
                        <Text style={s.relatedChipText}>{f}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}

              {grammar.examples && grammar.examples.length > 0 && (
                <>
                  <View style={s.divider} />
                  <Text style={s.sectionTitle}>Ví dụ</Text>
                  {grammar.examples.map((ex, i) => (
                    <View key={i} style={s.exampleBlock}>
                      <Text style={s.exampleJp}>{i + 1}. {ex.jp}</Text>
                      {(ex as any).paraphrase ? (
                        <Text style={s.exampleParaphrase}>{(ex as any).paraphrase}</Text>
                      ) : null}
                      <Text style={s.exampleVi}>→ {ex.vi}</Text>
                    </View>
                  ))}
                </>
              )}
            </View>

          {/* ── Đóng góp ý kiến ── */}
          <FeedbackSection pageKey={`grammar-detail::${grammar.id}`} />

          <View style={{ height: 40 }} />
        </ScrollView>
        <BottomTabBar />
      </View>
    </>
  );
}

const s = StyleSheet.create({
  root: { 
    flex: 1, 
    backgroundColor: "#f1f5f9" 
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 14 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 18,
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start" },
  pattern: {
    color: TEAL,
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 6,
  },
  meaning: { 
    color: "#334155", 
    fontSize: 16, 
    lineHeight: 22 
  },
  headerActions: { 
    flexDirection: "row" 
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: TEAL,
    alignItems: "center",
    justifyContent: "center",
  },
  actionIcon: { fontSize: 16, color: "#475569" },

  levelBadge: {
    alignSelf: "flex-start",
    backgroundColor: TEXT_COLOR,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 14,
  },
  levelBadgeText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
    marginTop: 18,
    marginBottom: 8,
  },
  sectionContent: { flexDirection: "row" },
  bulletDot: {
    color: TEAL,
    fontSize: 14,
    marginRight: 8,
    marginTop: 4,
  },
  sectionBody: {
    flex: 1,
    fontSize: 15,
    lineHeight: 24,
    color: "#0f172a",
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#e2e8f0",
    marginTop: 18,
  },

  exampleBlock: { marginTop: 10 },
  exampleJp: { fontSize: 15, color: TEAL, lineHeight: 22, fontWeight: "600" },
  exampleVi: { fontSize: 14, color: TEAL_DARK, marginTop: 2 },

  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { color: TEXT_COLOR, fontSize: 14 },

  weekRow: {
  flexDirection: 'row', flexWrap: 'wrap',
  marginTop: 8, marginBottom: 4,
},
  weekText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  dayTitle: { fontSize: 13, color: TEAL, fontWeight: '600' },
  cautionBox: {
    backgroundColor: '#fff7ed', borderRadius: 8, padding: 12,
    borderLeftWidth: 3, borderLeftColor: '#f97316',
  },
  cautionText: { fontSize: 14, color: '#9a3412', lineHeight: 20 },
  relatedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  relatedChip: {
    backgroundColor: '#f1f5f9', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  relatedChipText: { fontSize: 13, color: TEAL_DARK, fontWeight: '600' },
  exampleParaphrase: {
    fontSize: 13, color: '#94a3b8',
    fontStyle: 'italic', marginTop: 2,
  },
  header: {
  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16,
  backgroundColor: '#f1f5f9',
},
backBtnHeader: {
  width: 42, height: 42, backgroundColor: '#fff', borderRadius: 12,
  alignItems: 'center', justifyContent: 'center',
  borderWidth: 1.5, borderColor: '#e2e8f0',
},
backIcon: { fontSize: 28, color: TEAL_DARK, fontWeight: '300', marginTop: -4 },
headerTitle: { fontSize: 18, fontWeight: '700', color: TEAL_DARK },
});
