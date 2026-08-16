// ─────────────────────────────────────────────────────────────────────────────
// grammar.tsx
// Trang danh sách ngữ pháp theo cấp độ JLPT (N5 → N1).
// - Thanh trên cùng có 2 dropdown: Loại JLPT (Ngữ pháp / Từ vựng / Hán tự)
//   và Trình độ (N5–N1) — bấm vào sẽ mở 1 sheet trượt từ dưới lên (Modal).
// - 3 checkbox lọc hiển thị: Từ vựng (mẫu) / Phiên âm / Nghĩa.
// - Danh sách đánh số. Bấm 1 mục → vào trang chi tiết grammar-detail.
// ─────────────────────────────────────────────────────────────────────────────

import { useLocalSearchParams, useRouter } from "expo-router";
import { BottomTabBar } from "../components/BottomTabBar";
import { AdBanner } from "../components/AdBanner";
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
import {
  getGrammar,
  getGrammarByBook,
  type GrammarItem,
} from "../assets/data_nn";
import { FeedbackSection } from "../components/FeedbackSection";
import { useColors, useThemeMode, ThemeFadeOverlay } from "../artifacts/mirai-jp/hooks/useColors";

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
  // return (
  //   // <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
  //   //   <View style={ms.overlay}>
  //   //     <View style={ms.sheet}>
  //   //       {/* Tay cầm */}
  //   //       <View style={ms.handle} />
  //   //       <Text style={ms.title}>📊 Thống kê học Ngữ pháp</Text>
  //   //       {/* Cấp độ */}
  //   //       <View style={ms.card}>
  //   //         <Text style={ms.cardValue}>{level}</Text>
  //   //         <Text style={ms.cardLabel}>Cấp độ JLPT đang học</Text>
  //   //       </View>
  //   //       {/* Tổng số mẫu */}
  //   //       <View style={ms.card}>
  //   //         <Text style={ms.cardValue}>{totalCount}</Text>
  //   //         <Text style={ms.cardLabel}>Tổng số mẫu ngữ pháp</Text>
  //   //       </View>
  //   //       <View style={ms.divider} />
  //   //       <Text style={ms.sectionTitle}>🎯 Kết quả luyện tập</Text>
  //   //       <View style={ms.row}>
  //   //         <Text style={ms.rowLabel}>Quiz ngữ pháp:</Text>
  //   //         <Text style={ms.rowVal}>Sắp ra mắt</Text>
  //   //       </View>
  //   //       <View style={ms.row}>
  //   //         <Text style={ms.rowLabel}>Ghi chú đã lưu:</Text>
  //   //         <Text style={ms.rowVal}>Sắp ra mắt</Text>
  //   //       </View>
  //   //       <TouchableOpacity style={ms.closeBtn} onPress={onClose} activeOpacity={0.85}>
  //   //         <Text style={ms.closeBtnText}>Đóng</Text>
  //   //       </TouchableOpacity>
  //   //     </View>
  //   //   </View>
  //   // </Modal>
  // );
}

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
  c,
}: {
  visible: boolean;
  title: string;
  options: readonly T[];
  selected: T;
  onSelect: (v: T) => void;
  onClose: () => void;
  renderLabel: (v: T) => string;
  c: ReturnType<typeof useColors>;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={sheet.overlay}>
        <Pressable style={sheet.backdrop} onPress={onClose} />
        <View style={[sheet.sheet, { backgroundColor: c.card }]}>
          <View style={[sheet.header, { backgroundColor: c.primary }]}>
            <Text style={[sheet.headerTitle, { color: c.primaryForeground }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Text style={[sheet.headerClose, { color: c.primaryForeground }]}>Đóng</Text>
            </TouchableOpacity>
          </View>
          <View style={sheet.body}>
            {options.map((opt) => {
              const active = opt === selected;
              return (
                <TouchableOpacity
                  key={opt}
                  style={[sheet.option, active && { backgroundColor: c.muted }]}
                  onPress={() => {
                    onSelect(opt);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      sheet.optionText,
                      { color: c.mutedForeground },
                      active && { color: c.text, fontWeight: "700", fontSize: 20 },
                    ]}
                  >
                    {renderLabel(opt)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        <ThemeFadeOverlay />
      </View>
    </Modal>
  );
}

export default function GrammarScreen() {
  const c = useColors(); // bảng màu hiện tại — tự đổi theo giờ / lựa chọn người dùng
  const { themeMode, timeOfDay } = useThemeMode();
  const isDark = themeMode === "dark" || (themeMode === "auto" && timeOfDay === "night");

  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const params = useLocalSearchParams<{
    level?: string;
    title?: string;
    bookId?: string;
    week?: string;
  }>();
  const bookIdParam = typeof params.bookId === "string" ? params.bookId : "";
  const weekParam =
    typeof params.week === "string" ? parseInt(params.week, 10) : null;
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
      list = getGrammarByBook(bookIdParam);
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
        pathname: "/vocab",
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
    <View style={[s.root, { backgroundColor: c.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={c.background} />

      {/* ── Header trắng — giống kanji.tsx ──────────────────────────────── */}
      <View style={[s.headerRow, { backgroundColor: c.background }]}>
        {/* Nút quay lại */}
        <TouchableOpacity
          style={[s.backBtn, { backgroundColor: c.card, borderColor: c.border }]}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={[s.backBtnText, { color: c.primary }]}>‹</Text>
        </TouchableOpacity>

        {/* Tiêu đề + số mục */}
        <Text style={[s.headerTitle, { color: c.text }]} numberOfLines={1}>
          {typeof params.title === "string" && params.title
            ? params.title
            : `Ngữ pháp ${level}`}
        </Text>

        {/* Nút Thống kê + Menu */}
        <View style={s.headerBtns}>
          <TouchableOpacity
            style={[s.headerActionBtn, { backgroundColor: c.card, borderColor: c.border }]}
            onPress={() => setMenuOpen(true)}
            activeOpacity={0.8}
          >
            <View style={[s.menuLine, { backgroundColor: c.text }]} />
            <View style={[s.menuLine, { backgroundColor: c.text }]} />
            <View style={[s.menuLine, { backgroundColor: c.text }]} />
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
            <Text style={[s.emptyText, { color: c.text }]}>Chưa có ngữ pháp cho cấp độ này.</Text>
          </View>
        ) : (
          items.map((g, i) => (
            <TouchableOpacity
              key={g.id}
              style={[s.row, { backgroundColor: c.card }]}
              onPress={() =>
                router.push({
                  pathname: "/grammar-detail",
                  params: { id: g.id, level },
                })
              }
              activeOpacity={0.6}
            >
              <View style={s.rowMain}>
                <View style={s.rowTopLine}>
                  <Text style={[s.rowIndex, { color: c.accent }]}>{i + 1}.</Text>
                  {showVocab && (
                    <Text style={[s.rowPattern, { color: c.text }]}>{g.pattern}</Text>
                  )}
                  {!showVocab && showPhonetic && (
                    <Text style={[s.rowPattern, { color: c.text }]}>{g.phienAm}</Text>
                  )}
                </View>
                {showPhonetic && showVocab && g.phienAm !== g.pattern && (
                  <Text style={[s.rowPhonetic, { color: c.mutedForeground }]}>{g.phienAm}</Text>
                )}
                {showMeaning && (
                  <Text style={[s.rowMeaning, { color: c.primary }]}>{g.meaning}</Text>
                )}
              </View>
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
        c={c}
      />
      <BottomSheetPicker
        visible={levelSheet}
        title="Chọn trình độ JLPT"
        options={LEVELS}
        selected={level}
        onSelect={setLevel}
        onClose={() => setLevelSheet(false)}
        renderLabel={(v) => v}
        c={c}
      />
      {/* ── Modal thống kê ── */}
      <Modal
        visible={menuOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setMenuOpen(false)}
      >
        <View style={ms.overlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setMenuOpen(false)}
          />
          <View style={[ms.sheet, { backgroundColor: c.card }]}>
            <View style={[ms.handle, { backgroundColor: c.border }]} />
            <View style={ms.sheetHeader}>
              <Text style={[ms.sheetTitle, { color: c.text }]}>Tuỳ chọn</Text>
              <TouchableOpacity onPress={() => setMenuOpen(false)} hitSlop={10}>
                <Text style={[ms.sheetClose, { color: c.primary }]}>Đóng</Text>
              </TouchableOpacity>
            </View>
            <Text style={[ms.groupLabel, { color: c.mutedForeground }]}>Loại học</Text>
            <View style={ms.dropdownRow}>
              {TYPES.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    ms.chip,
                    { backgroundColor: c.muted, borderColor: c.border },
                    type === t.id && { backgroundColor: c.primary, borderColor: c.primary },
                  ]}
                  onPress={() => {
                    setType(t.id);
                    handleTypeChange(t.id);
                    setMenuOpen(false);
                  }}
                >
                  <Text
                    style={[
                      ms.chipText,
                      { color: c.mutedForeground },
                      type === t.id && { color: c.primaryForeground },
                    ]}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[ms.groupLabel, { color: c.mutedForeground }]}>Trình độ</Text>
            <View style={ms.dropdownRow}>
              {LEVELS.map((lv) => (
                <TouchableOpacity
                  key={lv}
                  style={[
                    ms.chip,
                    { backgroundColor: c.muted, borderColor: c.border },
                    level === lv && { backgroundColor: c.primary, borderColor: c.primary },
                  ]}
                  onPress={() => setLevel(lv)}
                >
                  <Text
                    style={[
                      ms.chipText,
                      { color: c.mutedForeground },
                      level === lv && { color: c.primaryForeground },
                    ]}
                  >
                    {lv}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[ms.groupLabel, { color: c.mutedForeground }]}>Hiển thị</Text>
            <View style={ms.checkRow}>
              <TouchableOpacity
                style={ms.checkItem}
                onPress={() => setShowVocab(!showVocab)}
              >
                <View
                  style={[
                    ms.checkBox,
                    { borderColor: c.border, backgroundColor: c.card },
                    showVocab && { backgroundColor: c.primary, borderColor: c.primary },
                  ]}
                >
                  {showVocab && <Text style={[ms.checkMark, { color: c.primaryForeground }]}>✓</Text>}
                </View>
                <Text style={[ms.checkLabel, { color: c.text }]}>Từ vựng</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={ms.checkItem}
                onPress={() => setShowPhonetic(!showPhonetic)}
              >
                <View
                  style={[
                    ms.checkBox,
                    { borderColor: c.border, backgroundColor: c.card },
                    showPhonetic && { backgroundColor: c.primary, borderColor: c.primary },
                  ]}
                >
                  {showPhonetic && <Text style={[ms.checkMark, { color: c.primaryForeground }]}>✓</Text>}
                </View>
                <Text style={[ms.checkLabel, { color: c.text }]}>Phiên âm</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={ms.checkItem}
                onPress={() => setShowMeaning(!showMeaning)}
              >
                <View
                  style={[
                    ms.checkBox,
                    { borderColor: c.border, backgroundColor: c.card },
                    showMeaning && { backgroundColor: c.primary, borderColor: c.primary },
                  ]}
                >
                  {showMeaning && <Text style={[ms.checkMark, { color: c.primaryForeground }]}>✓</Text>}
                </View>
                <Text style={[ms.checkLabel, { color: c.text }]}>Nghĩa</Text>
              </TouchableOpacity>
            </View>
          </View>
          <ThemeFadeOverlay />
        </View>
      </Modal>
      <BottomTabBar />
      <AdBanner />
    </View>
  );
}

// ── Checkbox đơn giản (không dùng trực tiếp trong menu mới, giữ lại để tương thích) ──
function CheckBox({
  label,
  value,
  onChange,
  c,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  c: ReturnType<typeof useColors>;
}) {
  return (
    <TouchableOpacity
      style={s.checkItem}
      onPress={() => onChange(!value)}
      hitSlop={6}
      activeOpacity={0.7}
    >
      <View
        style={[
          s.checkBox,
          { borderColor: c.border, backgroundColor: c.card },
          value && { backgroundColor: c.primary, borderColor: c.primary },
        ]}
      >
        {value && <Text style={[s.checkMark, { color: c.primaryForeground }]}>✓</Text>}
      </View>
      <Text style={[s.checkLabel, { color: c.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const ms = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
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
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  sheetTitle: { fontSize: 17, fontWeight: "800" },
  sheetClose: { fontSize: 15, fontWeight: "600" },
  groupLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 16,
  },
  dropdownRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  chipText: { fontSize: 14, fontWeight: "600" },
  checkRow: { flexDirection: "row", gap: 16, marginTop: 4 },
  checkItem: { flexDirection: "row", alignItems: "center" },
  checkBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  checkMark: { fontSize: 12, fontWeight: "900" },
  checkLabel: { fontSize: 14, fontWeight: "600" },
});

const s = StyleSheet.create({
  root: { flex: 1 },

  // Header
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  backBtnText: { fontSize: 28, lineHeight: 30 },
  titleBlock: { flex: 1, marginRight: 10 },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 3,
  },
  headerSubtitle: { fontSize: 13 },
  headerBtns: { flexDirection: "row", gap: 8, alignItems: "center" },
  headerActionBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  statsBtnText: { fontSize: 20 },
  menuLine: {
    width: 20,
    height: 2,
    borderRadius: 2,
    marginVertical: 2,
  },

  // Vùng controls (dropdown + checkbox) — hiện không hiển thị, giữ lại style
  controls: {
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
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
  },
  dropdownText: { fontSize: 15, fontWeight: "600" },
  dropdownCaret: { fontSize: 14, marginLeft: 6 },

  checkRow: { flexDirection: "row", alignItems: "center" },
  checkItem: { flexDirection: "row", alignItems: "center", marginRight: 16 },
  checkBox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  checkMark: { fontSize: 12, fontWeight: "900" },
  checkLabel: { fontSize: 14, fontWeight: "600" },

  // List
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 40,
  },
  row: {
    flexDirection: "row",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    alignItems: "flex-start",
  },
  rowMain: { flex: 1 },
  rowTopLine: { flexDirection: "row", alignItems: "baseline", marginBottom: 4 },
  rowIndex: {
    fontSize: 14,
    marginRight: 8,
    fontWeight: "700",
  },
  rowPattern: { fontSize: 18, fontWeight: "700", flex: 1 },
  rowPhonetic: { fontSize: 14, marginBottom: 2 },
  rowMeaning: { fontSize: 14 },

  empty: { paddingVertical: 60, alignItems: "center" },
  emptyText: { fontSize: 14 },
});

// ── Style cho bottom sheet ───────────────────────────────────────────────────
const sheet = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,23,42,0.45)",
  },
  sheet: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: "hidden",
    paddingBottom: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: { fontSize: 16, fontWeight: "800" },
  headerClose: { fontSize: 14, fontWeight: "600" },
  body: { paddingVertical: 8 },
  option: {
    paddingVertical: 16,
    alignItems: "center",
    marginHorizontal: 16,
    borderRadius: 20,
  },
  optionText: { fontSize: 18, fontWeight: "500" },
});