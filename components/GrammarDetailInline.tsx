// components/GrammarDetailInline.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import AIExplainPanel from "./AIExplainPanel";
import { useColors } from "../artifacts/mirai-jp/hooks/useColors";

interface GrammarDetailInlineProps {
  id?: string;
  pattern: string;
  reading?: string;
  meaning: string;
  structure?: string;
  note?: string;
  level?: string;
  examples?: Array<{
    jp?: string;
    sentence?: string;
    vi?: string;
    translation?: string;
  }>;
  onClose: () => void;
}

export default function GrammarDetailInline({
  pattern,
  reading,
  meaning,
  structure,
  note,
  level,
  examples = [],
  onClose,
}: GrammarDetailInlineProps) {
  const c = useColors(); // bảng màu hiện tại — tự đổi theo giờ / lựa chọn người dùng
  const [showStructure, setShowStructure] = useState(false);

  // Màu badge cấp độ JLPT — cố định theo cấp, không đổi theo theme
  const getLevelColor = (lv: string) => {
    switch (lv) {
      case "N5":
        return "#22C55E";
      case "N4":
        return "#3B82F6";
      case "N3":
        return "#F59E0B";
      case "N2":
        return "#EA580C";
      case "N1":
        return "#C0392B";
      default:
        return "#94A3B8";
    }
  };

  return (
    // <View style={[styles.container, { backgroundColor: c.background }]}>
    //   {/* Header */}
    //   <View style={[styles.header, { backgroundColor: c.background, borderBottomColor: c.border }]}>
    //     <TouchableOpacity onPress={onClose} style={[styles.backBtn, { backgroundColor: c.card, borderColor: c.border }]}>
    //       <Text style={[styles.backIcon, { color: c.primary }]}>‹</Text>
    //     </TouchableOpacity>
    //     <Text style={[styles.headerTitle, { color: c.primary }]}>Chi tiết ngữ pháp</Text>
    //     <View style={styles.headerPlaceholder} />
    //   </View>

    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      {/* Pattern card */}
      <View
        style={[
          styles.patternCard,
          { backgroundColor: c.card, borderColor: c.border },
        ]}
      >
        <View style={styles.patternRow}>
          <Text style={[styles.patternText, { color: c.primary }]}>
            {pattern}
          </Text>
        </View>
        {reading ? (
          <Text style={[styles.readingText, { color: c.mutedForeground }]}>
            {reading}
          </Text>
        ) : null}
        {level ? (
          <View
            style={[
              styles.levelBadge,
              { backgroundColor: getLevelColor(level) + "20" },
            ]}
          >
            <Text style={[styles.levelText, { color: getLevelColor(level) }]}>
              JLPT {level}
            </Text>
          </View>
        ) : null}
      </View>

            {/* Meaning */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: c.mutedForeground }]}>
          📖 Ý nghĩa
        </Text>
        <View
          style={[
            styles.meaningBox,
            { backgroundColor: c.card, borderColor: c.border },
          ]}
        >
          <Text style={[styles.meaningText, { color: c.text }]}>{meaning}</Text>
        </View>
      </View>

      {/* Tra cứu từ AI */}
      <View style={{ marginTop: 4 }}>
        <AIExplainPanel type="grammar" word={pattern} context={meaning} />
      </View>

      {/* Structure (optional) — giữ tông xanh lá nhạt cố định, khối highlight */}
      {structure ? (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.structureHeader}
            onPress={() => setShowStructure(!showStructure)}
          >
            <Text style={[styles.sectionLabel, { color: c.mutedForeground }]}>
              🔧 Cấu trúc
            </Text>
            <Text style={[styles.toggleBtn, { color: c.primary }]}>
              {showStructure ? "Thu gọn ▲" : "Xem ▼"}
            </Text>
          </TouchableOpacity>
          {showStructure && (
            <View style={styles.structureBox}>
              <Text style={styles.structureText}>{structure}</Text>
            </View>
          )}
        </View>
      ) : null}

      {/* Note — giữ tông vàng nhạt cố định, khối highlight */}
      {note ? (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: c.mutedForeground }]}>
            💡 Ghi chú
          </Text>
          <View style={styles.noteBox}>
            <Text style={styles.noteText}>{note}</Text>
          </View>
        </View>
      ) : null}

      {/* Examples */}
      {examples.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: c.mutedForeground }]}>
            ✏️ Ví dụ ({examples.length})
          </Text>
          {examples.map((ex, idx) => {
            const jp = ex.jp || ex.sentence || "";
            const vi = ex.vi || ex.translation || "";
            return (
              <View
                key={idx}
                style={[
                  styles.exampleCard,
                  { backgroundColor: c.card, borderColor: c.border },
                ]}
              >
                <View
                  style={[styles.exNumBadge, { backgroundColor: c.primary }]}
                >
                  <Text
                    style={[styles.exNumText, { color: c.primaryForeground }]}
                  >
                    {idx + 1}
                  </Text>
                </View>
                <View style={styles.exContent}>
                  <Text style={[styles.exJp, { color: c.primary }]}>{jp}</Text>
                  {vi ? (
                    <Text style={[styles.exVi, { color: c.mutedForeground }]}>
                      {vi}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
    // </View>
  );
}

// ─── Styles (chỉ layout — màu gán inline theo theme ở trên) ───────────────────
// Riêng structureBox / noteBox giữ nguyên hex cố định (khối highlight theo
// ngữ cảnh — xanh lá/vàng nhạt), không đổi theo theme.
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  backIcon: { fontSize: 28, fontWeight: "300", marginTop: -4 },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  headerPlaceholder: { width: 42 },
  content: { flex: 1, paddingHorizontal: 16 },
  patternCard: {
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    marginBottom: 4,
    alignItems: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  patternRow: { marginBottom: 8 },
  patternText: {
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
  },
  readingText: {
    fontSize: 15,
    fontWeight: "500",
    marginBottom: 10,
  },
  levelBadge: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 16,
  },
  levelText: { fontSize: 12, fontWeight: "700" },
  section: { marginTop: 16 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  structureHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  toggleBtn: { fontSize: 12, fontWeight: "600" },
  meaningBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  meaningText: { fontSize: 16, lineHeight: 26 },
  structureBox: {
    backgroundColor: "#f0fdf4",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  structureText: {
    fontSize: 14,
    color: "#166534",
    lineHeight: 22,
    fontFamily: "monospace",
  },
  noteBox: {
    backgroundColor: "#fefce8",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  noteText: { fontSize: 14, color: "#713f12", lineHeight: 22 },
  exampleCard: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    gap: 12,
  },
  exNumBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    flexShrink: 0,
  },
  exNumText: { fontSize: 11, fontWeight: "700" },
  exContent: { flex: 1 },
  exJp: { fontSize: 16, fontWeight: "700", marginBottom: 6, lineHeight: 24 },
  exVi: { fontSize: 13, lineHeight: 20 },
});
