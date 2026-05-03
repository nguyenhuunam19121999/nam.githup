// ─────────────────────────────────────────────────────────────────────────────
// book-select.tsx
// Trang chọn sách giáo trình cho cấp độ N3 / N2.
// Hiện 2 đầu sách phổ biến: Mimikara và Soumatome theo đúng cấp.
// Bấm vào 1 cuốn sẽ mở trang menu học (Hướng Dẫn / Từ Vựng / Ngữ Pháp / Kanji).
// ─────────────────────────────────────────────────────────────────────────────

import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { BottomTabBar } from "@/components/BottomTabBar";
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

// Màu chủ đạo (đồng bộ với toàn app)
const TEAL = "#4ECDC4";
// Gradient header: từ trên #4ECDC4 xuống dưới #5e9a95
const GRAD = ["#4ECDC4", "#5e9a95"] as const;

// Cấu trúc 1 cuốn sách hiển thị trong danh sách
interface Book {
  id: string;
  // Tên đầu sách (Mimikara / Soumatome)
  series: "mimikara" | "soumatome";
  // Cấp độ JLPT của cuốn này
  level: "N3" | "N2";
  // Tên hiển thị, ví dụ "Mimikara N3"
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
  const router = useRouter();
  // Nhận tham số `level` để biết cần lọc sách nào (N3 hoặc N2)
  const params = useLocalSearchParams<{ level?: string }>();
  const level = params.level === "N2" ? "N2" : "N3";

  // Lọc danh sách sách theo cấp độ đang chọn
  const books = BOOKS.filter((b) => b.level === level);

  // Khi bấm 1 cuốn sách → mở màn hình học theo tuần/bài
  // Soumatome N2 → màn hình riêng; các sách khác → level-book chung
  const handleSelect = (book: Book) => {
    if (book.id === "soumatome-n2") {
      router.push({ pathname: "/soumatome-n2" });
      return;
    }
    router.push({
      pathname: "/level-book",
      params: { bookId: book.id },
    });
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={TEAL} />

      {/* ── Thanh trên cùng: nút quay lại + tiêu đề ── */}
      <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
      <SafeAreaView style={s.topBar} edges={["top", "left", "right"]}>
        <View style={s.topBarInner}>
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
            hitSlop={10}
          >
            <Text style={s.backIcon}>‹</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          {/* Logo thương hiệu góc phải */}
          <View style={s.logoBadge}>
            <Text style={s.logoText}>Mirai</Text>
            <Text style={s.logoDot}>.</Text>
            <Text style={s.logoJP}>JP</Text>
          </View>
        </View>
      </SafeAreaView>
      </LinearGradient>

      {/* ── Danh sách sách (xếp theo cột, mỗi cuốn 1 viên thuốc bo tròn) ── */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {books.map((book) => (
          <TouchableOpacity
            key={book.id}
            style={s.bookCard}
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
            <Text style={s.bookLabel} numberOfLines={1}>
              {book.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <BottomTabBar />
    </View>
  );
}

// ─── Style chung của trang ────────────────────────────────────────────────────
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
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: { color: "#fff", fontSize: 32, fontWeight: "300", marginTop: -4 },
  logoBadge: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 4, height: 50 },
  logoText: { color: "#fff", fontSize: 22, fontWeight: "800" as const, letterSpacing: 0.3 },
  logoDot:  { color: TEAL,   fontSize: 24, fontWeight: "900" as const },
  logoJP:   { color: "#fff", fontSize: 22, fontWeight: "900" as const, letterSpacing: 0.5 },
  topTitle: {
    flex: 1,
    color: "#fff",
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
    backgroundColor: "#ffffff",
    borderRadius: 32,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: "#bfdbfe",
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
    color: "#0f172a",
    marginLeft: 14,
  },
});

// ─── Style cho các bìa sách (Mimikara / Soumatome) ────────────────────────────
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
