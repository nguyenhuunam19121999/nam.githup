// ─────────────────────────────────────────────────────────────────────────────
// kanji.tsx
// Trang danh sách Kanji theo cấp độ JLPT (N5 → N1).
// Bố cục mô phỏng kiểu "Soumatome - Kanji" (xem ảnh 3): mỗi mục hiển thị
// chữ Kanji (đỏ) ở trên, các âm Kun/On bên dưới, sau đó là âm Hán Việt và
// nghĩa tiếng Việt. Bấm vào mục sẽ mở trang chi tiết Kanji.
// ─────────────────────────────────────────────────────────────────────────────

import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getKanji, type KanjiItem } from "../assets/data_JLPT_kanji";
import { FeedbackSection } from "../components/FeedbackSection";

const BLUE = "#2F80ED";
const RED = "#E03131";

export default function KanjiListScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ level?: string; title?: string }>();
  const level = (typeof params.level === "string" ? params.level : "N5").toUpperCase();
  const title =
    typeof params.title === "string" && params.title
      ? params.title
      : `Học Kanji ${level}`;

  const items: KanjiItem[] = useMemo(() => getKanji(level), [level]);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (it) =>
        it.kanji.includes(q) ||
        it.hanViet.toLowerCase().includes(q) ||
        it.meanings.some((m) => m.toLowerCase().includes(q)) ||
        it.kunyomi.some((k) => k.includes(q)) ||
        it.onyomi.some((o) => o.includes(q)),
    );
  }, [items, query]);

  const goDetail = (id: string) => {
    router.push({ pathname: "/kanji-detail", params: { id } });
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE} />

      {/* ── Thanh trên cùng ── */}
      <SafeAreaView style={s.topBar} edges={["top", "left", "right"]}>
        <View style={s.topBarInner}>
          <TouchableOpacity
            style={s.iconBtn}
            onPress={() => router.back()}
            hitSlop={8}
          >
            <Text style={s.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={s.topTitle} numberOfLines={1}>
            {title}
          </Text>
          <View style={s.iconBtn} />
        </View>

        {/* Ô tìm kiếm */}
        <View style={s.searchWrap}>
          <Text style={s.searchIcon}>🔍</Text>
          <TextInput
            style={s.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Tìm Kanji, Hán Việt, nghĩa..."
            placeholderTextColor="#cbd5e1"
          />
        </View>
      </SafeAreaView>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {filtered.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyText}>Chưa có kanji nào phù hợp.</Text>
          </View>
        ) : (
          filtered.map((it, idx) => (
            <TouchableOpacity
              key={it.id}
              style={s.row}
              activeOpacity={0.7}
              onPress={() => goDetail(it.id)}
            >
              {/* Chữ Kanji to (màu đỏ) — như ảnh mẫu */}
              <View style={s.kanjiCol}>
                <Text style={s.indexNum}>{idx + 1}.</Text>
                <Text style={s.kanjiChar}>{it.kanji}</Text>
              </View>

              {/* Cột thông tin bên phải */}
              <View style={s.infoCol}>
                <Text style={s.readings} numberOfLines={1}>
                  {[...it.kunyomi, ...it.onyomi].join("／") || "—"}
                </Text>
                <Text style={s.hanViet}>{it.hanViet}</Text>
                <Text style={s.meaning} numberOfLines={2}>
                  {it.meanings[0] ?? ""}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Khối đóng góp ý kiến */}
        <View style={{ paddingHorizontal: 14, paddingTop: 4 }}>
          <FeedbackSection pageKey={`kanji::${level}`} />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f1f5f9" },

  // Thanh xanh trên cùng
  topBar: { backgroundColor: BLUE },
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
  topTitle: {
    flex: 1,
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },

  // Ô tìm kiếm
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
    marginBottom: 10,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  searchIcon: { fontSize: 14, marginRight: 6, color: "#fff" },
  searchInput: {
    flex: 1,
    height: 36,
    color: "#fff",
    fontSize: 14,
  },

  // Vùng cuộn
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 8, paddingBottom: 0 },

  // Mỗi dòng kanji
  row: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e2e8f0",
  },
  kanjiCol: {
    width: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  indexNum: {
    fontSize: 11,
    color: "#94a3b8",
    marginBottom: 2,
  },
  kanjiChar: {
    fontSize: 38,
    fontWeight: "700",
    color: RED,
    lineHeight: 44,
  },
  infoCol: {
    flex: 1,
    justifyContent: "center",
    paddingLeft: 6,
  },
  readings: { fontSize: 15, color: "#0f172a", fontWeight: "600", marginBottom: 2 },
  hanViet: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  meaning: { fontSize: 13, color: "#2563eb" },

  empty: { padding: 30, alignItems: "center" },
  emptyText: { color: "#64748b" },
});
