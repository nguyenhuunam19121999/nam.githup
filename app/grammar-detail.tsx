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
import { BottomTabBar } from "@/components/BottomTabBar";
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

// ✅ MÀU CHỦ ĐẠO MỚI
const TEAL = "#1F6F7A";
const TEAL_DARK = "#1c5765";
const GRAD = [TEAL, TEAL_DARK] as const;
const TEXT_COLOR = "#e47b0b";

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
      <StatusBar barStyle="light-content" backgroundColor={TEAL_DARK} />

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
      <BottomTabBar />
    </View>
  );
}

const s = StyleSheet.create({
  root: { 
    flex: 1, 
    backgroundColor: "#f1f5f9" 
  },

  topBar: {
     backgroundColor: "transparent" 
  },
  topBarInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: TEAL,
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
  logoBadge: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 4, height: 50 },
  logoText: { color: "#fff", fontSize: 22, fontWeight: "800" as const, letterSpacing: 0.3 },
  logoDot:  { color: TEAL,   fontSize: 24, fontWeight: "900" as const },
  logoJP:   { color: "#fff", fontSize: 22, fontWeight: "900" as const, letterSpacing: 0.5 },

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
});
