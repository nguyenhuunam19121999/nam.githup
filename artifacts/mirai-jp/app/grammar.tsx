// ─────────────────────────────────────────────────────────────────────────────
// grammar.tsx
// Trang danh sách ngữ pháp theo cấp độ JLPT (N5 → N1).
// - Thanh trên cùng có 2 dropdown: Loại JLPT (Ngữ pháp / Từ vựng / Hán tự)
//   và Trình độ (N5–N1) — bấm vào sẽ mở 1 sheet trượt từ dưới lên (Modal).
// - 3 checkbox lọc hiển thị: Từ vựng (mẫu) / Phiên âm / Nghĩa.
// - Danh sách đánh số. Bấm 1 mục → vào trang chi tiết grammar-detail.
// ─────────────────────────────────────────────────────────────────────────────

import { useLocalSearchParams, useRouter } from "expo-router";
import { BottomTabBar } from "@/components/BottomTabBar";
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
import { getGrammar, type GrammarItem } from "../assets/data_nn";
import { FeedbackSection } from "../components/FeedbackSection";

// ─── Modal thống kê ngữ pháp ─────────────────────────────────────────────────
function GrammarStatsModal({
  visible,
  onClose,
  totalCount,
  level,
}: {
  visible: boolean;
  onClose: () => void;
  totalCount: number;
  level: string;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={ms.overlay}>
        <View style={ms.sheet}>
          {/* Tay cầm */}
          <View style={ms.handle} />
          <Text style={ms.title}>📊 Thống kê học Ngữ pháp</Text>

          {/* Cấp độ */}
          <View style={ms.card}>
            <Text style={ms.cardValue}>{level}</Text>
            <Text style={ms.cardLabel}>Cấp độ JLPT đang học</Text>
          </View>

          {/* Tổng số mẫu */}
          <View style={ms.card}>
            <Text style={ms.cardValue}>{totalCount}</Text>
            <Text style={ms.cardLabel}>Tổng số mẫu ngữ pháp</Text>
          </View>

          <View style={ms.divider} />
          <Text style={ms.sectionTitle}>🎯 Kết quả luyện tập</Text>
          <View style={ms.row}>
            <Text style={ms.rowLabel}>Quiz ngữ pháp:</Text>
            <Text style={ms.rowVal}>Sắp ra mắt</Text>
          </View>
          <View style={ms.row}>
            <Text style={ms.rowLabel}>Ghi chú đã lưu:</Text>
            <Text style={ms.rowVal}>Sắp ra mắt</Text>
          </View>

          <TouchableOpacity style={ms.closeBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={ms.closeBtnText}>Đóng</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// Màu chủ đạo — xanh ngọc teal rgb(78,205,196), đồng bộ toàn app
const BLUE = "#7C3AED" /* old: #4ECDC4 */;
// Phiên bản tối hơn của teal — dùng cho viền, hover
const BLUE_DARK = "#3BB3AC";
// Gradient header: từ trên #7C3AED xuống dưới #5B21B6 /* old: #4ECDC4 → #5e9a95 */
const GRAD = ["#7C3AED", "#5B21B6"] /* old: ["#7C3AED","#5B21B6"] */ as const;

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
  const params = useLocalSearchParams<{ level?: string; title?: string; bookId?: string; week?: string }>();
  const bookIdParam = typeof params.bookId === "string" ? params.bookId : "";
  const weekParam = typeof params.week === "string" ? parseInt(params.week, 10) : null;
  const initialLevel: Level = LEVELS.includes(
    (params.level ?? "").toUpperCase() as Level,
  )
    ? ((params.level ?? "").toUpperCase() as Level)
    : "N2";

  const [level, setLevel] = useState<Level>(initialLevel);
  const [type, setType] = useState<TypeId>("grammar");
  // Modal thống kê
  const [showStats, setShowStats] = useState(false);

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
    let list: GrammarItem[];
    if (bookIdParam) {
      list = getGrammar(undefined, bookIdParam);
    } else {
      list = getGrammar(level);
    }
    if (weekParam !== null) {
      list = list.filter((g) => g.week === weekParam);
    }
    if (shuffleSeed === 0) return list;
    return [...list].sort(() => Math.random() - 0.5);
  }, [level, bookIdParam, weekParam, shuffleSeed]);

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
    // Chuyển sang trang Kanji với đúng cấp độ hiện tại
    router.replace({
      pathname: "/kanji",
      params: { level, title: `Học Kanji ${level}` },
    });
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#f0f4f8" />

      {/* ── Header trắng — giống kanji.tsx ──────────────────────────────── */}
      <View style={s.headerRow}>
        {/* Nút quay lại */}
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={s.backBtnText}>‹</Text>
        </TouchableOpacity>

        {/* Tiêu đề + số mục */}
        <View style={s.titleBlock}>
          <Text style={s.headerTitle} numberOfLines={1}>Ngữ pháp {level}</Text>
          <Text style={s.headerSubtitle}>{items.length} mẫu ngữ pháp</Text>
        </View>

        {/* Nút Thống kê + Menu */}
        <View style={s.headerBtns}>
          <TouchableOpacity style={s.headerActionBtn} onPress={() => setShowStats(true)} activeOpacity={0.8}>
            <Text style={s.statsBtnText}>📊</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.headerActionBtn} onPress={() => Alert.alert("Tuỳ chọn", "Tính năng sắp ra mắt.")} activeOpacity={0.8}>
            <View style={s.menuLine} />
            <View style={s.menuLine} />
            <View style={s.menuLine} />
          </TouchableOpacity>
        </View>
      </View>

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
      {/* ── Modal thống kê ── */}
      <GrammarStatsModal
        visible={showStats}
        onClose={() => setShowStats(false)}
        totalCount={items.length}
        level={level}
      />
      <BottomTabBar />
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
  root: { flex: 1, backgroundColor: "#f0f4f8" },

  // Header — nền trắng giống kanji.tsx
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: "#f0f4f8",
  },
  backBtn: {
    width: 42, height: 42, backgroundColor: "#fff", borderRadius: 12,
    borderWidth: 1.5, borderColor: "#e2e8f0",
    alignItems: "center", justifyContent: "center", marginRight: 10,
  },
  backBtnText: { fontSize: 28, color: BLUE, lineHeight: 30 },
  titleBlock: { flex: 1, marginRight: 10 },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#2d3748", marginBottom: 3 },
  headerSubtitle: { fontSize: 13, color: "#718096" },
  headerBtns: { flexDirection: "row", gap: 8, alignItems: "center" },
  headerActionBtn: {
    width: 42, height: 42, backgroundColor: "#fff", borderRadius: 12,
    borderWidth: 1.5, borderColor: "#e2e8f0",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  statsBtnText: { fontSize: 20 },
  menuLine: { width: 20, height: 2, backgroundColor: "#1e293b", borderRadius: 2, marginVertical: 2 },

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

// ── Styles modal thống kê ────────────────────────────────────────────────────
const ms = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 12,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#e2e8f0",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 16,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#f1f5f9",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginBottom: 10,
  },
  cardValue: { fontSize: 28, fontWeight: "900", color: "#0f172a" },
  cardLabel: { fontSize: 13, color: "#64748b", marginTop: 4 },
  divider: { height: 1, backgroundColor: "#e2e8f0", marginVertical: 14 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  rowLabel: { fontSize: 14, color: "#475569" },
  rowVal: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  closeBtn: {
    marginTop: 20,
    backgroundColor: BLUE,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  closeBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
