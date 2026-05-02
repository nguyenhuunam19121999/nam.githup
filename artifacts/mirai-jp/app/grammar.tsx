// ─────────────────────────────────────────────────────────────────────────────
// grammar.tsx
// Trang danh sách ngữ pháp theo cấp độ JLPT (N5 → N1).
// - Thanh trên cùng có 2 dropdown: Loại JLPT (Ngữ pháp / Từ vựng / Hán tự)
//   và Trình độ (N5–N1) — bấm vào sẽ mở 1 sheet trượt từ dưới lên (Modal).
// - 3 checkbox lọc hiển thị: Từ vựng (mẫu) / Phiên âm / Nghĩa.
// - Danh sách đánh số. Bấm 1 mục → vào trang chi tiết grammar-detail.
// ─────────────────────────────────────────────────────────────────────────────

import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getGrammar, type GrammarItem } from "../assets/data_nn";
import { FeedbackSection } from "../components/FeedbackSection";

const BLUE = "#4ECDC4";
const BLUE_DARK = "#3BB3AC";

const LEVELS = ["N5", "N4", "N3", "N2", "N1"] as const;
type Level = (typeof LEVELS)[number];

const TYPES = [
  { id: "vocab", label: "Từ vựng" },
  { id: "kanji", label: "Hán tự" },
  { id: "grammar", label: "Ngữ pháp" },
] as const;
type TypeId = (typeof TYPES)[number]["id"];

// ── Bottom sheet picker dùng chung cho 2 dropdown ────────────────────────────
function BottomSheetPicker<T extends string>({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
  renderLabel,
}: {
  visible: boolean;
  title: string;
  options: readonly T[];
  selected: T;
  onSelect: (v: T) => void;
  onClose: () => void;
  renderLabel: (v: T) => string;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={sheet.overlay}>
        <Pressable style={sheet.backdrop} onPress={onClose} />
        <View style={sheet.sheet}>
          <View style={sheet.header}>
            <Text style={sheet.headerTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Text style={sheet.headerClose}>Đóng</Text>
            </TouchableOpacity>
          </View>
          <View style={sheet.body}>
            {options.map((opt) => {
              const active = opt === selected;
              return (
                <TouchableOpacity
                  key={opt}
                  style={[sheet.option, active && sheet.optionActive]}
                  onPress={() => {
                    onSelect(opt);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[sheet.optionText, active && sheet.optionTextActive]}>
                    {renderLabel(opt)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function GrammarScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ level?: string; title?: string }>();
  const initialLevel: Level = LEVELS.includes(
    (params.level ?? "").toUpperCase() as Level,
  )
    ? ((params.level ?? "").toUpperCase() as Level)
    : "N2";

  const [level, setLevel] = useState<Level>(initialLevel);
  const [type, setType] = useState<TypeId>("grammar");

  // Bộ lọc hiển thị (3 checkbox)
  const [showVocab, setShowVocab] = useState(true); // hiển thị mẫu ngữ pháp (kanji)
  const [showPhonetic, setShowPhonetic] = useState(true);
  const [showMeaning, setShowMeaning] = useState(true);

  // Modal pickers
  const [typeSheet, setTypeSheet] = useState(false);
  const [levelSheet, setLevelSheet] = useState(false);

  // Trộn ngẫu nhiên thứ tự danh sách
  const [shuffleSeed, setShuffleSeed] = useState(0);

  const items = useMemo<GrammarItem[]>(() => {
    const list = getGrammar(level);
    if (shuffleSeed === 0) return list;
    return [...list].sort(() => Math.random() - 0.5);
  }, [level, shuffleSeed]);

  // Chuyển sang chế độ Từ vựng / Hán tự
  const handleTypeChange = (next: TypeId) => {
    if (next === "grammar") return;
    if (next === "vocab") {
      router.replace({
        pathname: "/flashcard",
        params: { level, title: `Khoá học ${level}` },
      });
      return;
    }
    Alert.alert("Hán tự", "Phần Hán tự sẽ được cập nhật sớm.");
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE} />

      {/* ── Top bar xanh ────────────────────────────────────────────────── */}
      <SafeAreaView style={s.topBar} edges={["top", "left", "right"]}>
        <View style={s.topBarInner}>
          <TouchableOpacity
            style={s.circleBtn}
            onPress={() => router.back()}
            hitSlop={10}
          >
            <Text style={s.circleBtnIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={s.topTitle}>JLPT</Text>
          <TouchableOpacity style={s.circleBtn} hitSlop={10} activeOpacity={0.7}>
            <Text style={s.downloadIcon}>⤓</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* ── Khu dropdown + filter ───────────────────────────────────────── */}
      <View style={s.controls}>
        <View style={s.dropdownRow}>
          <TouchableOpacity
            style={s.dropdown}
            onPress={() => setTypeSheet(true)}
            activeOpacity={0.7}
          >
            <Text style={s.dropdownText}>
              {TYPES.find((t) => t.id === type)?.label}
            </Text>
            <Text style={s.dropdownCaret}>▾</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.dropdown}
            onPress={() => setLevelSheet(true)}
            activeOpacity={0.7}
          >
            <Text style={s.dropdownText}>{level}</Text>
            <Text style={s.dropdownCaret}>▾</Text>
          </TouchableOpacity>
        </View>

        <View style={s.checkRow}>
          <CheckBox
            label="Từ vựng"
            value={showVocab}
            onChange={setShowVocab}
          />
          <CheckBox
            label="Phiên âm"
            value={showPhonetic}
            onChange={setShowPhonetic}
          />
          <CheckBox
            label="Nghĩa"
            value={showMeaning}
            onChange={setShowMeaning}
          />
          <TouchableOpacity
            style={s.shuffleBtn}
            onPress={() => setShuffleSeed((x) => x + 1)}
            hitSlop={10}
          >
            <Text style={s.shuffleIcon}>⇄</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Danh sách ngữ pháp ─────────────────────────────────────────── */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {items.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyText}>Chưa có ngữ pháp cho cấp độ này.</Text>
          </View>
        ) : (
          items.map((g, i) => (
            <TouchableOpacity
              key={g.id}
              style={s.row}
              onPress={() =>
                router.push({
                  pathname: "/grammar-detail",
                  params: { id: g.id, level },
                })
              }
              activeOpacity={0.6}
            >
              <Text style={s.rowTitle}>
                <Text style={s.rowIndex}>{i + 1}. </Text>
                {showVocab && <Text style={s.rowPattern}>{g.pattern}</Text>}
                {showPhonetic && showVocab && g.phienAm !== g.pattern && (
                  <Text style={s.rowPhonetic}> {g.phienAm}</Text>
                )}
                {!showVocab && showPhonetic && (
                  <Text style={s.rowPattern}>{g.phienAm}</Text>
                )}
              </Text>
              {showMeaning && (
                <Text style={s.rowMeaning}>{g.meaning}</Text>
              )}
            </TouchableOpacity>
          ))
        )}

        {/* ── Đóng góp ý kiến ── */}
        <View style={{ paddingHorizontal: 14, paddingTop: 4 }}>
          <FeedbackSection pageKey={`grammar::${level}`} />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Bottom sheets ──────────────────────────────────────────────── */}
      <BottomSheetPicker
        visible={typeSheet}
        title="Chọn kiểu JLPT"
        options={TYPES.map((t) => t.id) as readonly TypeId[]}
        selected={type}
        onSelect={(v) => {
          setType(v);
          handleTypeChange(v);
        }}
        onClose={() => setTypeSheet(false)}
        renderLabel={(v) => TYPES.find((t) => t.id === v)?.label ?? v}
      />
      <BottomSheetPicker
        visible={levelSheet}
        title="Chọn trình độ JLPT"
        options={LEVELS}
        selected={level}
        onSelect={setLevel}
        onClose={() => setLevelSheet(false)}
        renderLabel={(v) => v}
      />
    </View>
  );
}

// ── Checkbox đơn giản ────────────────────────────────────────────────────────
function CheckBox({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <TouchableOpacity
      style={s.checkItem}
      onPress={() => onChange(!value)}
      hitSlop={6}
      activeOpacity={0.7}
    >
      <View style={[s.checkBox, value && s.checkBoxOn]}>
        {value && <Text style={s.checkMark}>✓</Text>}
      </View>
      <Text style={s.checkLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },

  // Top bar xanh
  topBar: { backgroundColor: BLUE },
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
  downloadIcon: { color: "#fff", fontSize: 18, fontWeight: "700" },
  topTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },

  // Vùng controls (dropdown + checkbox)
  controls: {
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  dropdown: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  dropdownText: { fontSize: 15, fontWeight: "600", color: "#0f172a" },
  dropdownCaret: { fontSize: 14, color: "#475569", marginLeft: 6 },

  checkRow: { flexDirection: "row", alignItems: "center" },
  checkItem: { flexDirection: "row", alignItems: "center", marginRight: 16 },
  checkBox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#94a3b8",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  checkBoxOn: { backgroundColor: BLUE, borderColor: BLUE },
  checkMark: { color: "#fff", fontSize: 12, fontWeight: "900" },
  checkLabel: { fontSize: 14, fontWeight: "600", color: "#0f172a" },
  shuffleBtn: {
    marginLeft: "auto",
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  shuffleIcon: {
    fontSize: 18,
    color: "#0f172a",
    fontWeight: "800",
    transform: [{ rotate: "20deg" }],
  },

  // List
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 6 },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e2e8f0",
  },
  rowTitle: { fontSize: 18, lineHeight: 24, color: "#0f172a" },
  rowIndex: { color: BLUE, fontSize: 18, fontWeight: "700" },
  rowPattern: { color: BLUE_DARK, fontSize: 18, fontWeight: "600" },
  rowPhonetic: { color: "#475569", fontSize: 16, fontWeight: "500" },
  rowMeaning: { marginTop: 6, fontSize: 15, color: "#0f172a" },

  empty: { paddingVertical: 60, alignItems: "center" },
  emptyText: { color: "#64748b", fontSize: 14 },
});

// ── Style cho bottom sheet ───────────────────────────────────────────────────
const sheet = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,23,42,0.45)",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: "hidden",
    paddingBottom: 24,
  },
  header: {
    backgroundColor: BLUE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
  headerClose: { color: "#fff", fontSize: 14, fontWeight: "600" },
  body: { paddingVertical: 8 },
  option: {
    paddingVertical: 14,
    alignItems: "center",
    marginHorizontal: 16,
    borderRadius: 24,
  },
  optionActive: { backgroundColor: "#f1f5f9" },
  optionText: { color: "#cbd5e1", fontSize: 18, fontWeight: "500" },
  optionTextActive: { color: "#0f172a", fontWeight: "700", fontSize: 20 },
});
