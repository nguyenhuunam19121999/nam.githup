import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getGrammarById } from "@/assets/data_nn";
import { FeedbackSection } from "@/components/FeedbackSection";

const BLUE = "#2F80ED";

export default function GrammarDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; level?: string }>();
  const id = typeof params.id === "string" ? params.id : "";
  const level = typeof params.level === "string" ? params.level : "N5";
  const grammar = getGrammarById(id);

  if (!grammar) {
    return (
      <View style={s.root}>
        <StatusBar barStyle="light-content" backgroundColor={BLUE} />
        <SafeAreaView style={s.topBar} edges={["top", "left", "right"]}>
          <View style={s.topBarInner}>
            <TouchableOpacity style={s.circleBtn} onPress={() => router.back()} hitSlop={10}>
              <Text style={s.circleBtnIcon}>‹</Text>
            </TouchableOpacity>
            <Text style={s.topTitle}>Chi tiết ngữ pháp</Text>
            <View style={s.circleBtn} />
          </View>
        </SafeAreaView>
        <View style={s.notFoundWrap}>
          <Text style={s.notFoundText}>Không tìm thấy ngữ pháp này.</Text>
          <TouchableOpacity style={s.notFoundBtn} onPress={() => router.back()}>
            <Text style={s.notFoundBtnText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE} />
      <SafeAreaView style={s.topBar} edges={["top", "left", "right"]}>
        <View style={s.topBarInner}>
          <TouchableOpacity style={s.circleBtn} onPress={() => router.back()} hitSlop={10}>
            <Text style={s.circleBtnIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={s.topTitle} numberOfLines={1}>{grammar.pattern}</Text>
          <View style={s.circleBtn} />
        </View>
      </SafeAreaView>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.headerCard}>
          <Text style={s.levelBadgeText}>{level}</Text>
          <Text style={s.patternText}>{grammar.pattern}</Text>
          {grammar.phienAm && grammar.phienAm !== grammar.pattern && (
            <Text style={s.phonetic}>{grammar.phienAm}</Text>
          )}
          <View style={s.divider} />
          <Text style={s.meaningText}>{grammar.meaning}</Text>
        </View>

        {grammar.structure ? (
          <View style={s.block}>
            <Text style={s.blockTitle}>📌 Cấu trúc</Text>
            <View style={s.structureBox}>
              <Text style={s.structureText}>{grammar.structure}</Text>
            </View>
          </View>
        ) : null}

        {grammar.explanation ? (
          <View style={s.block}>
            <Text style={s.blockTitle}>📖 Giải thích</Text>
            <Text style={s.explanationText}>{grammar.explanation}</Text>
          </View>
        ) : null}

        {grammar.examples && grammar.examples.length > 0 && (
          <View style={s.block}>
            <Text style={s.blockTitle}>💡 Ví dụ</Text>
            {grammar.examples.map((ex, i) => (
              <View key={i} style={s.exampleCard}>
                <Text style={s.exampleJp}>{ex.jp}</Text>
                {ex.vi && <Text style={s.exampleVi}>{ex.vi}</Text>}
              </View>
            ))}
          </View>
        )}

        <View style={{ paddingHorizontal: 4 }}>
          <FeedbackSection pageKey={`grammar-detail::${id}`} />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f8fafc" },
  topBar: { backgroundColor: BLUE },
  topBarInner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 10 },
  circleBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  circleBtnIcon: { color: "#fff", fontSize: 28, fontWeight: "300", marginTop: -3, marginLeft: -2 },
  topTitle: { flex: 1, color: "#fff", fontSize: 18, fontWeight: "800", textAlign: "center" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 24 },
  headerCard: { backgroundColor: BLUE, borderRadius: 20, padding: 20, alignItems: "center", marginBottom: 18 },
  levelBadgeText: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: "800", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 8 },
  patternText: { color: "#fff", fontSize: 30, fontWeight: "900", textAlign: "center" },
  phonetic: { color: "rgba(255,255,255,0.8)", fontSize: 16, marginTop: 6, textAlign: "center" },
  divider: { width: 60, height: 2, backgroundColor: "rgba(255,255,255,0.4)", borderRadius: 1, marginVertical: 14 },
  meaningText: { color: "#fff", fontSize: 20, fontWeight: "700", textAlign: "center" },
  block: { marginBottom: 18 },
  blockTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a", marginBottom: 10 },
  structureBox: { backgroundColor: "#fff", borderRadius: 12, padding: 14, borderLeftWidth: 4, borderLeftColor: BLUE, borderWidth: 1, borderColor: "#e2e8f0" },
  structureText: { fontFamily: "monospace", fontSize: 14, color: "#1e40af", lineHeight: 22 },
  explanationText: { backgroundColor: "#fff", borderRadius: 12, padding: 14, fontSize: 15, color: "#334155", lineHeight: 22, borderWidth: 1, borderColor: "#e2e8f0" },
  exampleCard: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#e2e8f0" },
  exampleJp: { fontSize: 18, fontWeight: "600", color: "#0f172a", lineHeight: 26 },
  exampleVi: { fontSize: 14, color: "#3b82f6", marginTop: 4 },
  exampleMeaning: { fontSize: 13, color: "#64748b", marginTop: 2 },
  notFoundWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  notFoundText: { fontSize: 18, color: "#475569", marginBottom: 20 },
  notFoundBtn: { backgroundColor: BLUE, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  notFoundBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
