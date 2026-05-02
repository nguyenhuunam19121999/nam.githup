// ─────────────────────────────────────────────────────────────────────────────
// kanji-detail.tsx
// Trang chi tiết một chữ Kanji (xem ảnh mẫu 1 & 2).
// Hiển thị: chữ Kanji to, âm Hán Việt, các âm Kunyomi / Onyomi, ô minh hoạ
// chữ ở giữa (placeholder cho nét bút), 3 cột thông tin (Số nét / JLPT / Tần
// suất), các bộ thủ cấu thành, danh sách nghĩa, và ví dụ từ ghép. Cuối trang
// là khối "Đóng góp ý kiến" dùng chung.
// ─────────────────────────────────────────────────────────────────────────────

import { useLocalSearchParams, useRouter } from "expo-router";
import { BottomTabBar } from "@/components/BottomTabBar";
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

import { LinearGradient } from "expo-linear-gradient";
import { getKanjiById, type KanjiItem } from "../assets/data_JLPT_kanji";
import { FeedbackSection } from "../components/FeedbackSection";
import { KanjiStrokeOrder } from "../components/KanjiStrokeOrder";
import { WritingPracticeModal } from "../components/WritingPracticeModal";
import { KanjiNotesModal } from "../components/KanjiNotesModal";

// Màu chủ đạo — xanh ngọc teal rgb(78,205,196), đồng bộ toàn app
const BLUE = "#4ECDC4";
// Phiên bản tối hơn của teal — dùng cho nút, viền
const BLUE_DARK = "#3BB3AC";
// Gradient header: từ trên #4ECDC4 xuống dưới #5e9a95
const GRAD = ["#4ECDC4", "#5e9a95"] as const;

export default function KanjiDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === "string" ? params.id : "";
  const kanji = useMemo(() => getKanjiById(id), [id]);

  // State mở modal luyện viết khi nhấn nút bút ✎
  const [writingItem, setWritingItem] = useState<KanjiItem | null>(null);
  // State mở modal ghi chú khi nhấn icon 📋
  const [notesItem, setNotesItem] = useState<KanjiItem | null>(null);

  if (!kanji) {
    return (
      <View style={s.root}>
        <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
        <SafeAreaView style={s.topBar} edges={["top", "left", "right"]}>
          <View style={s.topBarInner}>
            <TouchableOpacity
              style={s.iconBtn}
              onPress={() => router.back()}
              hitSlop={8}
            >
              <Text style={s.backIcon}>‹</Text>
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
        <View style={{ padding: 24 }}>
          <Text>Không tìm thấy chữ Kanji này.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE} />

      {/* ── Thanh trên cùng ── */}
      <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
      <SafeAreaView style={s.topBar} edges={["top", "left", "right"]}>
        <View style={s.topBarInner}>
          <TouchableOpacity
            style={s.iconBtn}
            onPress={() => router.back()}
            hitSlop={8}
          >
            <Text style={s.backIcon}>‹</Text>
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
      >
        {/* ── Card thông tin chính ── */}
        <View style={s.card}>
          {/* Chữ kanji to + Hán Việt */}
          <View style={s.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.bigKanji}>{kanji.kanji}</Text>
              <Text style={s.bigHanViet}>{kanji.hanViet}</Text>
            </View>
            <View style={s.headerActions}>
              {/* Nút mở modal luyện viết */}
              <TouchableOpacity
                style={[s.actionBtn, s.actionBtnActive]}
                onPress={() => setWritingItem(kanji)}
                hitSlop={6}
              >
                <Text style={[s.actionIcon, s.actionIconActive]}>✎</Text>
              </TouchableOpacity>
              {/* Nút mở modal ghi chú */}
              <TouchableOpacity
                style={[s.actionBtn, s.actionBtnActive]}
                onPress={() => setNotesItem(kanji)}
                hitSlop={6}
              >
                <Text style={[s.actionIcon, s.actionIconActive]}>📋</Text>
              </TouchableOpacity>
              <View style={s.actionBtn}>
                <Text style={s.actionIcon}>＋</Text>
              </View>
            </View>
          </View>

          <View style={s.divider} />

          {/* Phát âm */}
          <Text style={s.sectionTitle}>Phát âm</Text>

          {kanji.kunyomi.length > 0 && (
            <View style={s.pronRow}>
              <Text style={s.diamond}>◆</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.pronLabel}>Kunyomi</Text>
                <Text style={s.pronValue}>{kanji.kunyomi.join("、")}</Text>
              </View>
            </View>
          )}

          {kanji.onyomi.length > 0 && (
            <View style={s.pronRow}>
              <Text style={s.diamond}>◆</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.pronLabel}>Onyomi</Text>
                <Text style={s.pronValue}>{kanji.onyomi.join("、")}</Text>
              </View>
            </View>
          )}

          {/* Cách viết — từng nét được tô màu khác nhau, có đánh số thứ tự */}
          <View style={s.strokeWrap}>
            <KanjiStrokeOrder kanji={kanji.kanji} size={210} containerSize={270} />
            <Text style={s.strokeHint}>
              Mỗi màu là một nét, số bên cạnh là thứ tự viết (1 → {kanji.strokes}).
            </Text>
          </View>

          {/* 3 cột: Số nét | JLPT | Tần suất */}
          <View style={s.statsRow}>
            <View style={s.statCol}>
              <View style={s.statChip}>
                <Text style={s.statChipText}>Số nét</Text>
              </View>
              <Text style={s.statValue}>{kanji.strokes}</Text>
            </View>
            <View style={s.statCol}>
              <View style={s.statChip}>
                <Text style={s.statChipText}>JLPT</Text>
              </View>
              <Text style={s.statValue}>{kanji.level}</Text>
            </View>
            <View style={s.statCol}>
              <View style={s.statChip}>
                <Text style={s.statChipText}>Tần suất</Text>
              </View>
              <Text style={[s.statValue, s.statLink]}>
                {kanji.frequency ? `#${kanji.frequency}/2500` : "—"}
              </Text>
            </View>
          </View>

          <View style={s.divider} />

          {/* Bộ thủ */}
          <View style={s.bushuHeader}>
            <Text style={s.sectionTitle}>Bộ</Text>
            <Text style={s.linkText}>↗ Phân tích Kanji</Text>
          </View>
          {(kanji.components ?? []).map((c, i) => (
            <View key={i} style={s.bushuRow}>
              <View style={s.bushuBar} />
              <Text style={s.bushuKanji}>{c.kanji}</Text>
              <Text style={s.bushuLabel}>「{c.hanViet}」</Text>
            </View>
          ))}

          <View style={s.divider} />

          {/* Nghĩa */}
          <Text style={s.sectionTitle}>Nghĩa</Text>
          {kanji.meanings.map((m, i) => (
            <View key={i} style={s.meaningRow}>
              <Text style={s.meaningDot}>•</Text>
              <Text style={s.meaningText}>{m}</Text>
            </View>
          ))}

          {/* Ví dụ */}
          {kanji.examples && kanji.examples.length > 0 && (
            <>
              <View style={s.divider} />
              <Text style={s.sectionTitle}>Ví dụ</Text>
              {kanji.examples.map((ex, i) => (
                <View key={i} style={s.exampleRow}>
                  <Text style={s.exampleJp}>{ex.jp}</Text>
                  <Text style={s.exampleReading}>{ex.reading}</Text>
                  <Text style={s.exampleVi}>→ {ex.vi}</Text>
                </View>
              ))}
            </>
          )}
        </View>

        {/* Khối đóng góp ý kiến */}
        <View style={{ paddingHorizontal: 12 }}>
          <FeedbackSection pageKey={`kanji-detail::${kanji.id}`} />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Modal luyện viết ── */}
      <WritingPracticeModal
        item={writingItem}
        onClose={() => setWritingItem(null)}
      />

      {/* ── Modal ghi chú ── */}
      <KanjiNotesModal
        item={notesItem}
        onClose={() => setNotesItem(null)}
      />

      <BottomTabBar />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f1f5f9" },

  // Thanh xanh trên cùng
  topBar: { backgroundColor: "transparent" },
  topBarInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: { color: "#fff", fontSize: 32, fontWeight: "300", marginTop: -4 },
  logoBadge: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 4, height: 50 },
  logoText: { color: "#fff", fontSize: 22, fontWeight: "800" as const, letterSpacing: 0.3 },
  logoDot:  { color: BLUE,   fontSize: 24, fontWeight: "900" as const },
  logoJP:   { color: "#fff", fontSize: 22, fontWeight: "900" as const, letterSpacing: 0.5 },
  topTitle: {
    flex: 1,
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },

  scroll: { flex: 1 },
  scrollContent: { padding: 12, paddingBottom: 12 },

  // Card chứa toàn bộ thông tin Kanji
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  headerRow: { flexDirection: "row", alignItems: "flex-start" },
  bigKanji: {
    fontSize: 56,
    fontWeight: "800",
    color: BLUE,
    lineHeight: 64,
  },
  bigHanViet: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "700",
    letterSpacing: 1,
    marginTop: 2,
  },
  headerActions: { flexDirection: "row", alignItems: "center" },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
    backgroundColor: "#fff",
  },
  actionIcon: { fontSize: 14, color: "#475569" },
  // Trạng thái active cho nút bút ✎
  actionBtnActive: { backgroundColor: "#f0fdfc", borderColor: BLUE },
  actionIconActive: { color: BLUE },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#e2e8f0",
    marginVertical: 14,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 10,
  },

  // Phát âm
  pronRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
  diamond: { color: BLUE, fontSize: 12, marginRight: 8, marginTop: 4 },
  pronLabel: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  pronValue: { fontSize: 15, color: BLUE, marginTop: 2 },

  // Vùng vẽ thứ tự nét
  strokeWrap: {
    alignItems: "center",
    marginVertical: 6,
  },
  strokeHint: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 16,
  },

  // 3 cột thông tin
  statsRow: {
    flexDirection: "row",
    marginTop: 14,
    paddingHorizontal: 4,
  },
  statCol: { flex: 1, alignItems: "center" },
  statChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
  },
  statChipText: { fontSize: 12, color: "#475569", fontWeight: "600" },
  statValue: { fontSize: 18, fontWeight: "800", color: "#0f172a", marginTop: 6 },
  statLink: { color: BLUE, textDecorationLine: "underline" },

  // Bộ thủ
  bushuHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  linkText: { fontSize: 13, color: BLUE, fontWeight: "600" },
  bushuRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  bushuBar: {
    width: 3,
    height: 18,
    backgroundColor: BLUE,
    marginRight: 8,
    borderRadius: 2,
  },
  bushuKanji: { fontSize: 18, fontWeight: "700", color: "#0f172a", marginRight: 6 },
  bushuLabel: { fontSize: 13, color: "#475569" },

  // Nghĩa
  meaningRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 6 },
  meaningDot: { fontSize: 16, color: "#0f172a", marginRight: 8 },
  meaningText: { flex: 1, fontSize: 15, color: "#0f172a", lineHeight: 22 },

  // Ví dụ
  exampleRow: { marginBottom: 10 },
  exampleJp: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  exampleReading: { fontSize: 13, color: BLUE, marginTop: 2 },
  exampleVi: { fontSize: 13, color: "#475569", marginTop: 2 },

  // Thanh dưới
  bottomBar: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  bottomInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  navArrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  navArrowText: { fontSize: 26, color: "#0f172a", marginTop: -4 },
  closeBtn: {
    flex: 1,
    marginHorizontal: 12,
    height: 44,
    borderRadius: 22,
    backgroundColor: BLUE,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
