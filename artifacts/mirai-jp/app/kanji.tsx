import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getKanji, type KanjiItem } from "@/assets/data_JLPT_kanji";
import { FeedbackSection } from "@/components/FeedbackSection";

const TEAL = "#4ECDC4";
const LEVELS = ["N5", "N4", "N3", "N2", "N1"] as const;
type Level = (typeof LEVELS)[number];

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export default function KanjiScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ level?: string; title?: string }>();
  const initLevel = LEVELS.includes((params.level ?? "").toUpperCase() as Level)
    ? ((params.level ?? "").toUpperCase() as Level)
    : "N5";

  const [level, setLevel] = useState<Level>(initLevel);
  const [search, setSearch] = useState("");
  const [selectedRadical, setSelectedRadical] = useState<string | null>(null);
  const [levelSheet, setLevelSheet] = useState(false);

  const kanjiList = useMemo(() => getKanji(level), [level]);

  const radicals = useMemo(() => {
    const set = new Set<string>();
    kanjiList.forEach((k) => k.components.forEach((c) => c.kanji && set.add(c.kanji)));
    return ["すべて", ...Array.from(set).slice(0, 30)];
  }, [kanjiList]);

  const filtered = useMemo(() => {
    let list = kanjiList;
    if (selectedRadical && selectedRadical !== "すべて") {
      list = list.filter((k) => k.components.some((c) => c.kanji === selectedRadical));
    }
    if (search.trim()) {
      const q = normalize(search.trim());
      list = list.filter(
        (k) =>
          k.kanji.includes(q) ||
          k.meanings.some((m) => normalize(m).includes(q)) ||
          k.onyomi.some((o) => normalize(o).includes(q)) ||
          k.kunyomi.some((ku) => normalize(ku).includes(q)),
      );
    }
    return list;
  }, [kanjiList, selectedRadical, search]);

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={TEAL} />
      <SafeAreaView style={s.topBar} edges={["top", "left", "right"]}>
        <View style={s.topBarInner}>
          <TouchableOpacity style={s.circleBtn} onPress={() => router.back()} hitSlop={10}>
            <Text style={s.circleBtnIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={s.topTitle}>Học Kanji</Text>
          <TouchableOpacity style={s.circleBtn} onPress={() => setLevelSheet(true)} activeOpacity={0.7}>
            <Text style={s.levelPill}>{level}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <TextInput
        style={s.searchInput}
        placeholder="Tìm kanji, nghĩa, âm on, âm kun..."
        placeholderTextColor="#94a3b8"
        value={search}
        onChangeText={setSearch}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.radicalScroll} contentContainerStyle={s.radicalContent}>
        {radicals.map((r) => {
          const isActive = r === (selectedRadical ?? "すべて");
          return (
            <TouchableOpacity key={r} style={[s.radicalChip, isActive && s.radicalChipActive]} onPress={() => setSelectedRadical(r === "すべて" ? null : r)} activeOpacity={0.7}>
              <Text style={[s.radicalChipText, isActive && s.radicalChipTextActive]}>{r}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.kanji}
        numColumns={4}
        contentContainerStyle={s.grid}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
            <FeedbackSection pageKey={`kanji::${level}`} />
            <View style={{ height: 40 }} />
          </View>
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyText}>Không tìm thấy kanji nào.</Text>
          </View>
        }
        renderItem={({ item }: { item: KanjiItem }) => (
          <TouchableOpacity
            style={s.kanjiCell}
            onPress={() => router.push({ pathname: "/kanji-detail", params: { id: item.kanji, level } })}
            activeOpacity={0.7}
          >
            <Text style={s.kanjiChar}>{item.kanji}</Text>
            <Text style={s.kanjiMeaning} numberOfLines={1}>{item.meanings[0] ?? ""}</Text>
          </TouchableOpacity>
        )}
      />

      <Modal visible={levelSheet} transparent animationType="slide" onRequestClose={() => setLevelSheet(false)}>
        <View style={sh.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setLevelSheet(false)} />
          <View style={sh.sheet}>
            <View style={sh.header}>
              <Text style={sh.headerTitle}>Chọn cấp độ</Text>
              <TouchableOpacity onPress={() => setLevelSheet(false)} hitSlop={12}>
                <Text style={sh.headerClose}>Đóng</Text>
              </TouchableOpacity>
            </View>
            {LEVELS.map((lv) => {
              const active = lv === level;
              return (
                <TouchableOpacity key={lv} style={[sh.option, active && sh.optionActive]} onPress={() => { setLevel(lv); setLevelSheet(false); }} activeOpacity={0.7}>
                  <Text style={[sh.optionText, active && sh.optionTextActive]}>{lv}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f8fafc" },
  topBar: { backgroundColor: TEAL },
  topBarInner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 10 },
  circleBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  circleBtnIcon: { color: "#fff", fontSize: 28, fontWeight: "300", marginTop: -3, marginLeft: -2 },
  topTitle: { flex: 1, color: "#fff", fontSize: 18, fontWeight: "800", textAlign: "center" },
  levelPill: { color: "#fff", fontSize: 13, fontWeight: "800" },
  searchInput: { marginHorizontal: 16, marginTop: 12, marginBottom: 4, backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: "#0f172a", borderWidth: 1, borderColor: "#e2e8f0" },
  radicalScroll: { maxHeight: 44, marginBottom: 8 },
  radicalContent: { paddingHorizontal: 16, gap: 8, alignItems: "center" },
  radicalChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: "#e2e8f0", borderWidth: 1, borderColor: "#e2e8f0" },
  radicalChipActive: { backgroundColor: TEAL, borderColor: TEAL },
  radicalChipText: { fontSize: 13, fontWeight: "600", color: "#475569" },
  radicalChipTextActive: { color: "#fff" },
  grid: { paddingHorizontal: 8, paddingTop: 8 },
  kanjiCell: { flex: 1, margin: 5, backgroundColor: "#fff", borderRadius: 14, paddingVertical: 12, alignItems: "center", borderWidth: 1.5, borderColor: "#e0f2f1", minHeight: 76 },
  kanjiChar: { fontSize: 32, fontWeight: "700", color: "#0f172a" },
  kanjiMeaning: { fontSize: 10, color: "#64748b", marginTop: 4, textAlign: "center", paddingHorizontal: 4 },
  empty: { paddingVertical: 60, alignItems: "center" },
  emptyText: { color: "#64748b", fontSize: 14 },
});

const sh = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 12, borderTopRightRadius: 12, overflow: "hidden", paddingBottom: 24 },
  header: { backgroundColor: TEAL, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
  headerClose: { color: "#fff", fontSize: 14, fontWeight: "600" },
  option: { paddingVertical: 14, alignItems: "center", marginHorizontal: 16, borderRadius: 24 },
  optionActive: { backgroundColor: "#f1f5f9" },
  optionText: { color: "#cbd5e1", fontSize: 18, fontWeight: "500" },
  optionTextActive: { color: "#0f172a", fontWeight: "700", fontSize: 20 },
});
