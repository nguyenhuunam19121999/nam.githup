// ─────────────────────────────────────────────────────────────────────────────
// book-select.tsx
// Trang chọn sách giáo trình cho cấp độ N3 / N2.
// Hiện 2 đầu sách phổ biến: Mimikara và Soumatome theo đúng cấp.
// Bấm vào 1 cuốn sẽ mở trang menu học (Hướng Dẫn / Từ Vựng / Ngữ Pháp / Kanji).
// ─────────────────────────────────────────────────────────────────────────────

import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { BottomTabBar } from "../components/BottomTabBar";
import { AdBanner } from "../components/AdBanner";
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
import { useColors } from "../artifacts/mirai-jp/hooks/useColors";

interface Book {
  id: string;
  series: "mimikara" | "soumatome";
  level: "N3" | "N2";
  label: string;
}

// Danh sách toàn bộ sách trong app
const BOOKS: Book[] = [
  { id: "mimikara-n3", series: "mimikara", level: "N3", label: "Mimikara N3" },
  { id: "mimikara-n2", series: "mimikara", level: "N2", label: "Mimikara N2" },
  { id: "soumatome-n3", series: "soumatome", level: "N3", label: "Soumatome N3" },
  { id: "soumatome-n2", series: "soumatome", level: "N2", label: "Soumatome N2" },
];

// ── Vẽ icon bìa sách Mimikara (nền trắng, chữ "日本語" đỏ, dải đỏ ở dưới) ──
// Giữ nguyên màu thương hiệu của bìa sách thật (đỏ/vàng cam) — không đổi
// theo theme, vì đây là bản sao thiết kế bìa sách in thật, không phải UI app.
function MimikaraCover({ level }: { level: "N3" | "N2" }) {
  return (
    <View style={cover.wrap}>
      <Text style={cover.mimiTopJp}>日本語</Text>
      <Text style={cover.mimiTitle}>みみから</Text>
      <View style={cover.mimiBottom}>
        <Text style={cover.mimiBottomText}>MIMIKARA {level}</Text>
      </View>
    </View>
  );
}

// ── Vẽ icon bìa sách Soumatome (nền trắng, dải vàng cam ở dưới) ──
function SoumatomeCover({ level }: { level: "N3" | "N2" }) {
  return (
    <View style={cover.wrap}>
      <Text style={cover.souTopJp}>日本語</Text>
      <Text style={cover.souTitle}>総まとめ</Text>
      <View style={cover.souBottom}>
        <Text style={cover.souBottomText}>{level}</Text>
      </View>
    </View>
  );
}

export default function BookSelectScreen() {
  const c = useColors(); // bảng màu hiện tại — tự đổi theo giờ / lựa chọn người dùng
  const router = useRouter();
  const params = useLocalSearchParams<{ level?: string }>();
  const level = params.level === "N2" ? "N2" : "N3";
  const books = BOOKS.filter((b) => b.level === level);

  const handleSelect = (book: Book) => {
    if (book.id === "soumatome-n2") {
      router.push({ pathname: "/soumatome-n2" });
      return;
    }
    router.push({ pathname: "/level-book", params: { bookId: book.id } });
  };

  return (
    <View style={[s.root, { backgroundColor: c.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={c.primary} />
      <LinearGradient colors={[c.primary, c.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.headerGradient}>
      <SafeAreaView style={s.topBar} edges={["top", "left", "right"]}>
        <View style={s.topBarInner}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7} hitSlop={10}>
            <Text style={[s.backIcon, { color: c.primaryForeground }]}>‹</Text>
          </TouchableOpacity>
          <Text style={[s.topTitle, { color: c.primaryForeground }]}>Chọn sách · JLPT {level}</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {books.map((book) => (
          <TouchableOpacity
            key={book.id}
            style={[s.bookCard, { backgroundColor: c.card, borderColor: c.border }]}
            onPress={() => handleSelect(book)}
            activeOpacity={0.7}
          >
            {/* Bìa sách bên trái */}
            <View style={s.coverWrap}>
              {book.series === "mimikara" ? (
                <MimikaraCover level={book.level} />
              ) : (
                <SoumatomeCover level={book.level} />
              )}
            </View>
            {/* Tên sách bên phải */}
            <Text style={[s.bookLabel, { color: c.text }]} numberOfLines={1}>
              {book.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <BottomTabBar />
      <AdBanner />
    </View>
  );
}

// ─── Style chung của trang (chỉ layout — màu gán inline theo theme ở trên) ────
const s = StyleSheet.create({

   headerGradient: {
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingBottom: 10,
  },
  root: { flex: 1 },

  // Thanh trên cùng
  topBar: { backgroundColor: "transparent" },
  topBarInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: { fontSize: 32, fontWeight: "300", marginTop: -4 },
  topTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },

  // Vùng cuộn chứa danh sách sách
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  // Mỗi viên thuốc bo tròn dài chứa 1 cuốn sách
  bookCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 32,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    marginBottom: 14,
    minHeight: 78,
  },
  // Vùng chứa bìa sách
  coverWrap: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  // Tên sách hiển thị bên phải bìa
  bookLabel: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 14,
  },
});

// ─── Style cho các bìa sách (Mimikara / Soumatome) ────────────────────────────
// Giữ nguyên hex cố định — đây là màu thương hiệu bìa sách thật (đỏ Mimikara,
// vàng cam Soumatome), không phải màu giao diện app nên KHÔNG đổi theo theme.
const cover = StyleSheet.create({
  // Khung chung của bìa sách: vuông trắng có viền xám nhạt
  wrap: {
    width: 50,
    height: 50,
    backgroundColor: "#fff",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "flex-start",
    overflow: "hidden",
    paddingTop: 3,
  },

  // ── Bìa Mimikara ──────────────────────────────────────────────────────
  // Chữ "日本語" nhỏ màu đỏ ở trên đỉnh
  mimiTopJp: { fontSize: 7, color: "#dc2626", fontWeight: "800" },
  // Chữ "みみから" giữa bìa
  mimiTitle: {
    fontSize: 8,
    color: "#1f2937",
    fontWeight: "800",
    marginTop: 2,
  },
  // Dải đỏ chứa tên series ở đáy bìa
  mimiBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#dc2626",
    paddingVertical: 2,
    alignItems: "center",
  },
  mimiBottomText: { color: "#fff", fontSize: 6, fontWeight: "900" },

  // ── Bìa Soumatome ─────────────────────────────────────────────────────
  // Chữ "日本語" nhỏ màu xám ở trên đỉnh
  souTopJp: { fontSize: 7, color: "#1f2937", fontWeight: "800" },
  // Chữ "総まとめ" giữa bìa
  souTitle: {
    fontSize: 8,
    color: "#dc2626",
    fontWeight: "800",
    marginTop: 2,
  },
  // Dải vàng cam ở đáy bìa
  souBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#f59e0b",
    paddingVertical: 2,
    alignItems: "center",
  },
  souBottomText: { color: "#fff", fontSize: 7, fontWeight: "900" },
});