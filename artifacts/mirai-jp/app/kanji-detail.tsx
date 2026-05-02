import { useLocalSearchParams, useRouter } from "expo-router";
import * as Speech from "expo-speech";
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
import { findKanjiById } from "@/assets/data_JLPT_kanji";
import { KanjiStrokeOrder } from "@/components/KanjiStrokeOrder";
import { FeedbackSection } from "@/components/FeedbackSection";

const TEAL = "#4ECDC4";

function InfoChip({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <View style={s.chip}>
      <Text style={s.chipLabel}>{label}</Text>
      <Text style={s.chipValue}>{value}</Text>
    </View>
  );
}

export default function KanjiDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; level?: string }>();
  const id = typeof params.id === "string" ? params.id : "";
  const level = typeof params.level === "string" ? params.level : "N5";
  const kanji = findKanjiById(id);

  const speak = (text: string) => {
    if (!text) return;
    Speech.speak(text, { language: "ja-JP", pitch: 1, rate: 0.8 });
  };

  if (!kanji) {
    return (
      <View style={s.root}>
        <StatusBar barStyle="light-content" backgroundColor={TEAL} />
        <SafeAreaView style={s.topBar} edges={["top", "left", "right"]}>
          <View style={s.topBarInner}>
            <TouchableOpacity style={s.circleBtn} onPress={() => router.back()} hitSlop={10}>
              <Text style={s.circleBtnIcon}>‹</Text>
            </TouchableOpacity>
            <Text style={s.topTitle}>Chi tiết Kanji</Text>
            <View style={s.circleBtn} />
          </View>
        </SafeAreaView>
        <View style={s.notFoundWrap}>
          <Text style={s.notFoundText}>Không tìm thấy kanji này.</Text>
          <TouchableOpacity style={s.notFoundBtn} onPress={() => router.back()}>
            <Text style={s.notFoundBtnText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={TEAL} />
      <SafeAreaView style={s.topBar} edges={["top", "left", "right"]}>
        <View style={s.topBarInner}>
          <TouchableOpacity style={s.circleBtn} onPress={() => router.back()} hitSlop={10}>
            <Text style={s.circleBtnIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={s.topTitle} numberOfLines={1}>{kanji.kanji} — {kanji.meaning}</Text>
          <View style={s.circleBtn} />
        </View>
      </SafeAreaView>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.headerCard}>
          <View style={s.kanjiCircle}>
            <Text style={s.kanjiChar}>{kanji.kanji}</Text>
          </View>
          <TouchableOpacity style={s.speakerBtn} onPress={() => speak(kanji.onyomi[0] || kanji.kanji)} activeOpacity={0.7}>
            <Text style={s.speakerIcon}>🔊</Text>
          </TouchableOpacity>
          <Text style={s.levelBadge}>{level}</Text>
          <Text style={s.meaningText}>{kanji.meanings.join(", ")}</Text>
          {kanji.strokes ? <Text style={s.strokesText}>Số nét: {kanji.strokes}</Text> : null}
        </View>

        <View style={s.chipsRow}>
          <InfoChip label="Âm On" value={kanji.onyomi.join(" · ")} />
          <InfoChip label="Âm Kun" value={kanji.kunyomi.join(" · ")} />
          {kanji.components.length > 0 ? <InfoChip label="Bộ phận" value={kanji.components.map((c) => c.kanji).join(" ")} /> : null}
        </View>

        <View style={s.block}>
          <Text style={s.blockTitle}>✍️ Thứ tự nét viết</Text>
          <KanjiStrokeOrder kanji={kanji.kanji} />
        </View>


        {kanji.examples && kanji.examples.length > 0 && (
          <View style={s.block}>
            <Text style={s.blockTitle}>💡 Ví dụ</Text>
            {kanji.examples.map((ex, i) => (
              <View key={i} style={s.exampleCard}>
                <Text style={s.exampleJp}>{ex.jp}</Text>
                {ex.reading ? <Text style={s.exampleReading}>{ex.reading}</Text> : null}
                {ex.vi && <Text style={s.exampleVi}>{ex.vi}</Text>}
              </View>
            ))}
          </View>
        )}

        <View style={{ paddingHorizontal: 4 }}>
          <FeedbackSection pageKey={`kanji-detail::${id}`} />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f8fafc" },
  topBar: { backgroundColor: TEAL },
  topBarInner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 10 },
  circleBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  circleBtnIcon: { color: "#fff", fontSize: 28, fontWeight: "300", marginTop: -3, marginLeft: -2 },
  topTitle: { flex: 1, color: "#fff", fontSize: 16, fontWeight: "800", textAlign: "center" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 24 },
  headerCard: { backgroundColor: TEAL, borderRadius: 20, padding: 20, alignItems: "center", marginBottom: 16, position: "relative" },
  kanjiCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", marginBottom: 12, borderWidth: 3, borderColor: "rgba(255,255,255,0.5)" },
  kanjiChar: { fontSize: 56, fontWeight: "700", color: "#0f172a" },
  speakerBtn: { position: "absolute", top: 14, right: 14, width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center" },
  speakerIcon: { fontSize: 18 },
  levelBadge: { color: "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: "800", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 8 },
  meaningText: { color: "#fff", fontSize: 24, fontWeight: "800", textAlign: "center" },
  strokesText: { color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 6 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  chip: { flex: 1, minWidth: 100, backgroundColor: "#fff", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#e2e8f0", alignItems: "center" },
  chipLabel: { fontSize: 10, fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 },
  chipValue: { fontSize: 16, fontWeight: "700", color: "#0f172a", textAlign: "center" },
  block: { marginBottom: 18 },
  blockTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a", marginBottom: 10 },
  vocabRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: "#e2e8f0" },
  vocabKanji: { fontSize: 18, fontWeight: "700", color: "#0f172a", width: 64, marginRight: 10 },
  vocabReading: { fontSize: 13, color: "#3b82f6", flex: 1 },
  vocabMeaning: { fontSize: 13, color: "#475569", flex: 2, textAlign: "right" },
  exampleCard: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#e2e8f0" },
  exampleJp: { fontSize: 16, fontWeight: "600", color: "#0f172a" },
  exampleReading: { fontSize: 13, color: "#64748b", marginTop: 2 },
  exampleVi: { fontSize: 13, color: "#3b82f6", marginTop: 2 },
  notFoundWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  notFoundText: { fontSize: 18, color: "#475569", marginBottom: 20 },
  notFoundBtn: { backgroundColor: TEAL, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  notFoundBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
