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
import { getGrammar, type GrammarItem } from "@/assets/data_nn";
import { FeedbackSection } from "@/components/FeedbackSection";

const BLUE = "#2F80ED";
const BLUE_DARK = "#1F5FBF";

const LEVELS = ["N5", "N4", "N3", "N2", "N1"] as const;
type Level = (typeof LEVELS)[number];

const TYPES = [
  { id: "vocab", label: "Từ vựng" },
  { id: "kanji", label: "Hán tự" },
  { id: "grammar", label: "Ngữ pháp" },
] as const;
type TypeId = (typeof TYPES)[number]["id"];

function BottomSheetPicker<T extends string>({
  visible, title, options, selected, onSelect, onClose, renderLabel,
}: {
  visible: boolean; title: string; options: readonly T[]; selected: T;
  onSelect: (v: T) => void; onClose: () => void; renderLabel: (v: T) => string;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={sheet.overlay}>
        <Pressable style={sheet.backdrop} onPress={onClose} />
        <View style={sheet.sheet}>
          <View style={sheet.header}>
            <Text style={sheet.headerTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}><Text style={sheet.headerClose}>Đóng</Text></TouchableOpacity>
          </View>
          <View style={sheet.body}>
            {options.map((opt) => {
              const active = opt === selected;
              return (
                <TouchableOpacity key={opt} style={[sheet.option, active && sheet.optionActive]} onPress={() => { onSelect(opt); onClose(); }} activeOpacity={0.7}>
                  <Text style={[sheet.optionText, active && sheet.optionTextActive]}>{renderLabel(opt)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function CheckBox({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <TouchableOpacity style={s.checkItem} onPress={() => onChange(!value)} hitSlop={6} activeOpacity={0.7}>
      <View style={[s.checkBox, value && s.checkBoxOn]}>{value && <Text style={s.checkMark}>✓</Text>}</View>
      <Text style={s.checkLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function GrammarScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ level?: string; title?: string }>();
  const initialLevel: Level = LEVELS.includes((params.level ?? "").toUpperCase() as Level) ? ((params.level ?? "").toUpperCase() as Level) : "N5";

  const [level, setLevel] = useState<Level>(initialLevel);
  const [type, setType] = useState<TypeId>("grammar");
  const [showVocab, setShowVocab] = useState(true);
  const [showPhonetic, setShowPhonetic] = useState(true);
  const [showMeaning, setShowMeaning] = useState(true);
  const [typeSheet, setTypeSheet] = useState(false);
  const [levelSheet, setLevelSheet] = useState(false);
  const [shuffleSeed, setShuffleSeed] = useState(0);

  const items = useMemo<GrammarItem[]>(() => {
    const list = getGrammar(level);
    if (shuffleSeed === 0) return list;
    return [...list].sort(() => Math.random() - 0.5);
  }, [level, shuffleSeed]);

  const handleTypeChange = (next: TypeId) => {
    if (next === "grammar") return;
    if (next === "vocab") {
      router.replace({ pathname: "/flashcard", params: { level, title: `Khoá học ${level}` } });
      return;
    }
    if (next === "kanji") {
      router.replace({ pathname: "/kanji", params: { level, title: `Học Kanji ${level}` } });
      return;
    }
    Alert.alert("Thông báo", "Nội dung sẽ được cập nhật sớm.");
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE} />
      <SafeAreaView style={s.topBar} edges={["top", "left", "right"]}>
        <View style={s.topBarInner}>
          <TouchableOpacity style={s.circleBtn} onPress={() => router.back()} hitSlop={10}>
            <Text style={s.circleBtnIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={s.topTitle}>JLPT</Text>
          <View style={s.circleBtn} />
        </View>
      </SafeAreaView>

      <View style={s.controls}>
        <View style={s.dropdownRow}>
          <TouchableOpacity style={s.dropdown} onPress={() => setTypeSheet(true)} activeOpacity={0.7}>
            <Text style={s.dropdownText}>{TYPES.find((t) => t.id === type)?.label}</Text>
            <Text style={s.dropdownCaret}>▾</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.dropdown} onPress={() => setLevelSheet(true)} activeOpacity={0.7}>
            <Text style={s.dropdownText}>{level}</Text>
            <Text style={s.dropdownCaret}>▾</Text>
          </TouchableOpacity>
        </View>
        <View style={s.checkRow}>
          <CheckBox label="Từ vựng" value={showVocab} onChange={setShowVocab} />
          <CheckBox label="Phiên âm" value={showPhonetic} onChange={setShowPhonetic} />
          <CheckBox label="Nghĩa" value={showMeaning} onChange={setShowMeaning} />
          <TouchableOpacity style={s.shuffleBtn} onPress={() => setShuffleSeed((x) => x + 1)} hitSlop={10}>
            <Text style={s.shuffleIcon}>⇄</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {items.length === 0 ? (
          <View style={s.empty}><Text style={s.emptyText}>Chưa có ngữ pháp cho cấp độ này.</Text></View>
        ) : (
          items.map((g, i) => (
            <TouchableOpacity
              key={g.id}
              style={s.row}
              onPress={() => router.push({ pathname: "/grammar-detail", params: { id: g.id, level } })}
              activeOpacity={0.6}
            >
              <Text style={s.rowTitle}>
                <Text style={s.rowIndex}>{i + 1}. </Text>
                {showVocab && <Text style={s.rowPattern}>{g.pattern}</Text>}
                {showPhonetic && showVocab && g.phienAm !== g.pattern && <Text style={s.rowPhonetic}> {g.phienAm}</Text>}
                {!showVocab && showPhonetic && <Text style={s.rowPattern}>{g.phienAm}</Text>}
              </Text>
              {showMeaning && <Text style={s.rowMeaning}>{g.meaning}</Text>}
            </TouchableOpacity>
          ))
        )}
        <View style={{ paddingHorizontal: 14, paddingTop: 4 }}>
          <FeedbackSection pageKey={`grammar::${level}`} />
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>

      <BottomSheetPicker
        visible={typeSheet}
        title="Chọn kiểu JLPT"
        options={TYPES.map((t) => t.id) as readonly TypeId[]}
        selected={type}
        onSelect={(v) => { setType(v); handleTypeChange(v); }}
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

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  topBar: { backgroundColor: BLUE },
  topBarInner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 10 },
  circleBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  circleBtnIcon: { color: "#fff", fontSize: 28, fontWeight: "300", marginTop: -3, marginLeft: -2 },
  topTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  controls: { backgroundColor: "#E5E7EB", paddingHorizontal: 14, paddingVertical: 12 },
  dropdownRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  dropdown: { flex: 1, backgroundColor: "#fff", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: "#cbd5e1" },
  dropdownText: { fontSize: 15, fontWeight: "600", color: "#0f172a" },
  dropdownCaret: { fontSize: 14, color: "#475569", marginLeft: 6 },
  checkRow: { flexDirection: "row", alignItems: "center", position: "relative" as const },
  checkItem: { flexDirection: "row", alignItems: "center", marginRight: 16 },
  checkBox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: "#94a3b8", backgroundColor: "#fff", alignItems: "center", justifyContent: "center", marginRight: 6 },
  checkBoxOn: { backgroundColor: BLUE, borderColor: BLUE },
  checkMark: { color: "#fff", fontSize: 12, fontWeight: "900" },
  checkLabel: { fontSize: 14, fontWeight: "600", color: "#0f172a" },
  shuffleBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center", position: "absolute" as const, right: 0 },
  shuffleIcon: { fontSize: 18, color: "#0f172a", fontWeight: "800", transform: [{ rotate: "20deg" }] },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 6 },
  row: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#e2e8f0" },
  rowTitle: { fontSize: 18, lineHeight: 24, color: "#0f172a" },
  rowIndex: { color: BLUE, fontSize: 18, fontWeight: "700" },
  rowPattern: { color: BLUE_DARK, fontSize: 18, fontWeight: "600" },
  rowPhonetic: { color: "#475569", fontSize: 16, fontWeight: "500" },
  rowMeaning: { marginTop: 6, fontSize: 15, color: "#0f172a" },
  empty: { paddingVertical: 60, alignItems: "center" },
  emptyText: { color: "#64748b", fontSize: 14 },
});

const sheet = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15,23,42,0.45)" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 12, borderTopRightRadius: 12, overflow: "hidden", paddingBottom: 24 },
  header: { backgroundColor: BLUE, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
  headerClose: { color: "#fff", fontSize: 14, fontWeight: "600" },
  body: { paddingVertical: 8 },
  option: { paddingVertical: 14, alignItems: "center", marginHorizontal: 16, borderRadius: 24 },
  optionActive: { backgroundColor: "#f1f5f9" },
  optionText: { color: "#cbd5e1", fontSize: 18, fontWeight: "500" },
  optionTextActive: { color: "#0f172a", fontWeight: "700", fontSize: 20 },
});
