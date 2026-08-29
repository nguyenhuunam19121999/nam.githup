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
import { AdBanner } from "../components/AdBanner";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getGrammarById } from "../assets/data_nn";
import { FeedbackSection } from "../components/FeedbackSection";
import AIExplainPanel from "../components/AIExplainPanel";
import { KeyboardAwareScrollViewCompat } from "../components/KeyboardAwareScrollViewCompat";
import { useColors, useThemeMode } from "../artifacts/mirai-jp/hooks/useColors";

export default function GrammarDetailScreen() {
  const c = useColors(); // bảng màu hiện tại — tự đổi theo giờ / lựa chọn người dùng
  const { themeMode, timeOfDay } = useThemeMode();
  const isDark = themeMode === "dark" || (themeMode === "auto" && timeOfDay === "night");

  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === "string" ? params.id : "";
  const grammar = getGrammarById(id);

  if (!grammar) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[s.root, { backgroundColor: c.background }]}>
          <View style={[s.header, { backgroundColor: c.background }]}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={[s.backBtnHeader, { backgroundColor: c.card, borderColor: c.border }]}
            >
              <Text style={[s.backIcon, { color: c.primary }]}>‹</Text>
            </TouchableOpacity>
            <Text style={[s.headerTitle, { color: c.primary }]}>Chi tiết Ngữ pháp</Text>
            <View style={{ width: 42 }} />
          </View>
          <View style={s.empty}>
            <Text style={[s.emptyText, { color: c.text }]}>Không tìm thấy mẫu ngữ pháp.</Text>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[s.root, { backgroundColor: c.background }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={c.background} />

        {/* Top bar */}
        <View style={[s.header, { backgroundColor: c.background }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[s.backBtnHeader, { backgroundColor: c.card, borderColor: c.border }]}
          >
            <Text style={[s.backIcon, { color: c.primary }]}>‹</Text>
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: c.primary }]}>Chi tiết Ngữ pháp</Text>
          <View style={{ width: 42 }} />
        </View>

        <KeyboardAwareScrollViewCompat
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Card chi tiết */}
          <View style={[s.card, { backgroundColor: c.card }]}>
            <View style={s.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[s.pattern, { color: c.primary }]}>{grammar.pattern}</Text>
                <Text style={[s.meaning, { color: c.text }]}>{grammar.meaning}</Text>
              </View>
              <View style={s.headerActions}>
                <View style={[s.actionBtn, { borderColor: c.primary }]}>
                  <Text style={[s.actionIcon, { color: c.mutedForeground }]}>📌</Text>
                </View>
              </View>
            </View>

            <View style={[s.levelBadge, { backgroundColor: c.accent }]}>
              <Text style={s.levelBadgeText}>JLPT {grammar.level}</Text>
            </View>

            {(grammar.week || grammar.day) && (
              <View style={s.weekRow}>
                {grammar.week && (
                  <Text style={[s.weekText, { color: c.mutedForeground }]}>Tuần {grammar.week}</Text>
                )}
                {grammar.day && (
                  <Text style={[s.weekText, { color: c.mutedForeground }]}> · Ngày {grammar.day}</Text>
                )}
                {(grammar as any).day_title && (
                  <Text style={[s.dayTitle, { color: c.primary }]}>
                    {" "}
                    · {(grammar as any).day_title}
                  </Text>
                )}
              </View>
            )}

            <Text style={[s.sectionTitle, { color: c.text }]}>Cấu trúc</Text>
            <View style={s.sectionContent}>
              <Text style={[s.bulletDot, { color: c.accent }]}>◆</Text>
              <Text style={[s.sectionBody, { color: c.text }]}>{grammar.structure}</Text>
            </View>

            <View style={[s.divider, { backgroundColor: c.border }]} />
            <Text style={[s.sectionTitle, { color: c.text }]}>Giải thích</Text>
            <View style={s.sectionContent}>
              <Text style={[s.bulletDot, { color: c.accent }]}>◆</Text>
              <Text style={[s.sectionBody, { color: c.text }]}>{grammar.explanation}</Text>
            </View>

            {/* Tra cứu từ AI */}
            <View style={{ marginTop: 18 }}>
              <AIExplainPanel type="grammar" word={grammar.pattern} context={grammar.meaning} />
            </View>
            {grammar.notes && (
              <>
                <View style={[s.divider, { backgroundColor: c.border }]} />
                <Text style={[s.sectionTitle, { color: c.text }]}>Ghi chú</Text>
                <View style={s.sectionContent}>
                  <Text style={[s.bulletDot, { color: c.accent }]}>◆</Text>
                  <Text style={[s.sectionBody, { color: c.text }]}>{grammar.notes}</Text>
                </View>
              </>
            )}

            {grammar.caution ? (
              <>
                <View style={[s.divider, { backgroundColor: c.border }]} />
                <Text style={[s.sectionTitle, { color: c.text }]}>⚠️ Chú ý</Text>
                <View style={s.cautionBox}>
                  <Text style={s.cautionText}>{grammar.caution}</Text>
                </View>
              </>
            ) : null}

            {grammar.related_forms && grammar.related_forms.length > 0 && (
              <>
                <View style={[s.divider, { backgroundColor: c.border }]} />
                <Text style={[s.sectionTitle, { color: c.text }]}>Dạng liên quan</Text>
                <View style={s.relatedRow}>
                  {grammar.related_forms.map((f, i) => (
                    <View
                      key={i}
                      style={[s.relatedChip, { backgroundColor: c.muted, borderColor: c.border }]}
                    >
                      <Text style={[s.relatedChipText, { color: c.primary }]}>{f}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {grammar.examples && grammar.examples.length > 0 && (
              <>
                <View style={[s.divider, { backgroundColor: c.border }]} />
                <Text style={[s.sectionTitle, { color: c.text }]}>Ví dụ</Text>
                {grammar.examples.map((ex, i) => (
                  <View key={i} style={s.exampleBlock}>
                    <Text style={[s.exampleJp, { color: c.primary }]}>
                      {i + 1}. {ex.jp}
                    </Text>
                    {(ex as any).paraphrase ? (
                      <Text style={[s.exampleParaphrase, { color: c.mutedForeground }]}>
                        {(ex as any).paraphrase}
                      </Text>
                    ) : null}
                    <Text style={[s.exampleVi, { color: c.text }]}>→ {ex.vi}</Text>
                  </View>
                ))}
              </>
            )}
          </View>
          <FeedbackSection pageKey={`grammar-detail::${grammar.id}`} />
          <View style={{ height: 40 }} />
        </KeyboardAwareScrollViewCompat>
        <BottomTabBar />
        <AdBanner />
      </View>
    </>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 14 },
  card: {
    borderRadius: 14,
    padding: 18,
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start" },
  pattern: {
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 6,
  },
  meaning: {
    fontSize: 16,
    lineHeight: 22,
  },
  headerActions: {
    flexDirection: "row",
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  actionIcon: { fontSize: 16 },

  levelBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 14,
  },
  // Chữ trên badge JLPT luôn trắng — nền badge (c.accent) luôn đủ đậm để tương phản
  levelBadgeText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginTop: 18,
    marginBottom: 8,
  },
  sectionContent: { flexDirection: "row" },
  bulletDot: {
    fontSize: 14,
    marginRight: 8,
    marginTop: 4,
  },
  sectionBody: {
    flex: 1,
    fontSize: 15,
    lineHeight: 24,
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    marginTop: 18,
  },

  exampleBlock: { marginTop: 10 },
  exampleJp: { fontSize: 15, lineHeight: 22, fontWeight: "600" },
  exampleVi: { fontSize: 14, marginTop: 2 },

  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 14 },

  weekRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    marginBottom: 4,
  },
  weekText: { fontSize: 13, fontWeight: "600" },
  dayTitle: { fontSize: 13, fontWeight: "600" },
  // Hộp cảnh báo — giữ màu cam/vàng cố định (semantic warning), không theo theme
  cautionBox: {
    backgroundColor: "#fff7ed",
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#f97316",
  },
  cautionText: { fontSize: 14, color: "#9a3412", lineHeight: 20 },
  relatedRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  relatedChip: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  relatedChipText: { fontSize: 13, fontWeight: "600" },
  exampleParaphrase: {
    fontSize: 13,
    fontStyle: "italic",
    marginTop: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
  },
  backBtnHeader: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  backIcon: {
    fontSize: 28,
    fontWeight: "300",
    marginTop: -4,
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
});