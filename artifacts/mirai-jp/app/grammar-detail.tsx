// ─────────────────────────────────────────────────────────────────────────────
// grammar-detail.tsx
// Trang chi tiết của 1 mẫu ngữ pháp. Hiển thị:
//   - Tên mẫu (kanji/kana lớn, màu xanh)
//   - Nghĩa tiếng Việt
//   - Nhãn JLPT (N1 → N5)
//   - Mục "Cấu trúc" và "Nghĩa" (giải thích)
//   - Danh sách ví dụ (nếu có)
// ─────────────────────────────────────────────────────────────────────────────

import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LinearGradient } from "expo-linear-gradient";
import { getGrammarById } from "../assets/data_nn";
import { FeedbackSection } from "../components/FeedbackSection";

// Màu chủ đạo — xanh ngọc teal rgb(78,205,196), đồng bộ toàn app
const BLUE = "#4ECDC4";
// Phiên bản sáng hơn của teal — dùng cho text phụ trên nền tối
const BLUE_LIGHT = "#7EDDD9";
// Màu cam — dùng cho nhãn JLPT level
const ORANGE = "#F59E0B";
// Gradient header: từ trên #4ECDC4 xuống dưới #5e9a95
const GRAD = ["#4ECDC4", "#5e9a95"] as const;

export default function GrammarDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === "string" ? params.id : "";
  const grammar = getGrammarById(id);

  if (!grammar) {
    return (
      <View style={s.root}>
        <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
        <SafeAreaView style={s.topBar} edges={["top", "left", "right"]}>
          <View style={s.topBarInner}>
            <TouchableOpacity
              style={s.circleBtn}
              onPress={() => router.back()}
              hitSlop={10}
            >
              <Text style={s.circleBtnIcon}>‹</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <View style={s.logoBadge}>
              <Text style={s.logoText}>Mirai</Text>
              <Text style={s.logoDot}>.</Text>
              <Text style={s.logoJP}>JP</Text>
            </View>
          </View>
        </SafeAreaView>
        </LinearGradient>
        <View style={s.empty}>
          <Text style={s.emptyText}>Không tìm thấy mẫu ngữ pháp.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE} />

      {/* Top bar */}
      <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
      <SafeAreaView style={s.topBar} edges={["top", "left", "right"]}>
        <View style={s.topBarInner}>
          <TouchableOpacity
            style={s.circleBtn}
            onPress={() => router.back()}
            hitSlop={10}
          >
            <Text style={s.circleBtnIcon}>‹</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <View style={s.logoBadge}>
            <Text style={s.logoText}>Mirai</Text>
            <Text style={s.logoDot}>.</Text>
            <Text style={s.logoJP}>JP</Text>
          </View>
        </View>
      </SafeAreaView>
      </LinearGradient>

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
              <View style={[s.actionBtn, { marginLeft: 6 }]}>
                <Text style={[s.actionIcon, { fontSize: 20 }]}>+</Text>
              </View>
            </View>
          </View>

          <View style={s.levelBadge}>
            <Text style={s.levelBadgeText}>JLPT {grammar.level}</Text>
          </View>

          {/* Cấu trúc */}
          <Text style={s.sectionTitle}>Cấu trúc</Text>
          <View style={s.sectionContent}>
            <Text style={s.bulletDot}>◆</Text>
            <Text style={s.sectionBody}>{grammar.structure}</Text>
          </View>

          <View style={s.divider} />

          {/* Nghĩa */}
          <Text style={s.sectionTitle}>Nghĩa</Text>
          <View style={s.sectionContent}>
            <Text style={s.bulletDot}>◆</Text>
            <Text style={s.sectionBody}>{grammar.explanation}</Text>
          </View>

          {grammar.examples && grammar.examples.length > 0 && (
            <>
              <View style={s.divider} />
              <Text style={s.sectionTitle}>Ví dụ</Text>
              {grammar.examples.map((ex, i) => (
                <View key={i} style={s.exampleBlock}>
                  <Text style={s.exampleJp}>
                    {i + 1}. {ex.jp}
                  </Text>
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
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f1f5f9" },

  topBar: { backgroundColor: "transparent" },
  topBarInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  circleBtnIcon: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "300",
    marginTop: -3,
    marginLeft: -2,
  },
  topTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  logoBadge: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.28)", borderRadius: 10, paddingHorizontal: 10, height: 40, borderWidth: 1, borderColor: "rgba(255,255,255,0.18)" },
  logoText: { color: "#fff", fontSize: 15, fontWeight: "800" as const, letterSpacing: 0.3 },
  logoDot:  { color: BLUE,   fontSize: 17, fontWeight: "900" as const },
  logoJP:   { color: "#fff", fontSize: 15, fontWeight: "900" as const, letterSpacing: 0.5 },

  scroll: { flex: 1 },
  scrollContent: { padding: 14 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 18,
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start" },
  pattern: {
    color: BLUE_LIGHT,
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 6,
  },
  meaning: { color: "#334155", fontSize: 16, lineHeight: 22 },
  headerActions: { flexDirection: "row" },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  actionIcon: { fontSize: 16, color: "#475569" },

  levelBadge: {
    alignSelf: "flex-start",
    backgroundColor: ORANGE,
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
    color: BLUE_LIGHT,
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
  exampleJp: { fontSize: 15, color: "#0f172a", lineHeight: 22 },
  exampleVi: { fontSize: 14, color: "#475569", marginTop: 2 },

  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { color: "#64748b", fontSize: 14 },
});
