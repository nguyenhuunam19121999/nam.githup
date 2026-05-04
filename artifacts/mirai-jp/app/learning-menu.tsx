// ─────────────────────────────────────────────────────────────────────────────
// learning-menu.tsx
// Trang menu trung gian hiển thị 4 lựa chọn học tập:
//   Hướng Dẫn Học · Từ Vựng · Ngữ Pháp · Kanji
// Người dùng đến trang này sau khi chọn 1 cấp độ JLPT (N5 → N1) hoặc
// 1 ngành nghề ở trang chính. Bấm "Từ Vựng" sẽ vào màn flashcard như cũ.
// ─────────────────────────────────────────────────────────────────────────────

import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { BottomTabBar } from "@/components/BottomTabBar";
import {
  Alert,
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

// Định nghĩa 1 mục trong menu
interface MenuItem {
  id: string;
  label: string;
  // Hàm vẽ phần biểu tượng bên trong khung icon (vẽ bằng View, không dùng emoji)
  renderIcon: () => React.ReactNode;
  // Đường dẫn điều hướng khi bấm vào, bỏ trống nếu chưa làm
  route?: string;
}

// ── Vẽ icon hình lục giác xanh lá có ngũ giác xanh dương (Hướng Dẫn Học) ──
function HexIcon() {
  return (
    <View style={iconStyles.hexOuter}>
      <View style={iconStyles.hexInner} />
    </View>
  );
}

// ── Vẽ icon quyển sách xanh có ngôi sao (Từ Vựng) ─────────────────────────
function BookIcon() {
  return (
    <View style={iconStyles.bookWrap}>
      <View style={iconStyles.bookSpine} />
      <Text style={iconStyles.bookStar}>✦</Text>
    </View>
  );
}

// ── Vẽ icon chữ "A✓" tím (Ngữ Pháp) ───────────────────────────────────────
function GrammarIcon() {
  return (
    <View style={iconStyles.grammarWrap}>
      <Text style={iconStyles.grammarA}>A</Text>
      <Text style={iconStyles.grammarCheck}>✓</Text>
    </View>
  );
}

// ── Vẽ icon mặt trời vàng (Kanji) ─────────────────────────────────────────
function SunIcon() {
  return (
    <View style={iconStyles.sunWrap}>
      {/* 8 tia nắng xếp xung quanh */}
      {Array.from({ length: 8 }).map((_, i) => (
        <View
          key={i}
          style={[
            iconStyles.sunRay,
            { transform: [{ rotate: `${i * 45}deg` }, { translateY: -18 }] },
          ]}
        />
      ))}
      <View style={iconStyles.sunCircle} />
    </View>
  );
}

// ── Icon tài liệu OTAFFtn — cờ Nhật (nền trắng + vòng tròn đỏ) ─────────────
function DocJPIcon() {
  return (
    <View style={iconStyles.docWrap}>
      {/* Thân tài liệu */}
      <View style={iconStyles.docBody}>
        {/* Góc gấp trên phải */}
        <View style={iconStyles.docFold} />
        {/* Vòng tròn đỏ — biểu tượng cờ Nhật */}
        <View style={iconStyles.jpCircle} />
        {/* Dòng kẻ nội dung */}
        <View style={[iconStyles.docLine, { width: "55%", marginTop: 4 }]} />
        <View style={[iconStyles.docLine, { width: "70%" }]} />
      </View>
      {/* Nhãn "TN" nhỏ dưới góc */}
      <Text style={iconStyles.docBadgeJP}>TN</Text>
    </View>
  );
}

// ── Icon tài liệu OTAFFtv — cờ Việt (nền đỏ + ngôi sao vàng) ───────────────
function DocVNIcon() {
  return (
    <View style={iconStyles.docWrap}>
      <View style={[iconStyles.docBody, iconStyles.docBodyVN]}>
        <View style={[iconStyles.docFold, iconStyles.docFoldVN]} />
        {/* Ngôi sao vàng 5 cánh đơn giản */}
        <Text style={iconStyles.vnStar}>★</Text>
        <View style={[iconStyles.docLine, { width: "55%", marginTop: 4, backgroundColor: "rgba(255,255,255,0.5)" }]} />
        <View style={[iconStyles.docLine, { width: "70%", backgroundColor: "rgba(255,255,255,0.5)" }]} />
      </View>
      <Text style={iconStyles.docBadgeVN}>TV</Text>
    </View>
  );
}

// Nhãn tuỳ biến theo bookId
const LABEL_OVERRIDES: Record<string, Partial<Record<string, string>>> = {
  "industry-food": {
    grammar: "Tài liệu từ OTAFFtn",
    kanji:   "Tài liệu từ OTAFFtv",
  },
};

function buildItems(bookId: string): MenuItem[] {
  const overrides = LABEL_OVERRIDES[bookId] ?? {};
  const isFoodIndustry = bookId === "industry-food";
  return [
    {
      id: "guide",
      label: "Đố vui",
      renderIcon: () => <HexIcon />,
    },
    {
      id: "vocab",
      label: "Từ Vựng",
      renderIcon: () => <BookIcon />,
      route: "/flashcard",
    },
    {
      id: "grammar",
      label: overrides["grammar"] ?? "Ngữ Pháp",
      renderIcon: () => isFoodIndustry ? <DocJPIcon /> : <GrammarIcon />,
      route: "/grammar",
    },
    {
      id: "kanji",
      label: overrides["kanji"] ?? "Kanji",
      renderIcon: () => isFoodIndustry ? <DocVNIcon /> : <SunIcon />,
      route: "/kanji",
    },
  ];
}

export default function LearningMenuScreen() {
  const router = useRouter();
  // Nhận thêm tham số `level` (ví dụ "N3") hoặc `title` để hiển thị tiêu đề
  const params = useLocalSearchParams<{
    level?: string;
    bookId?: string;
    title?: string;
  }>();
  const level = typeof params.level === "string" ? params.level : "";
  const bookId = typeof params.bookId === "string" ? params.bookId : "";
  const title =
    typeof params.title === "string" && params.title
      ? params.title
      : level
        ? `Khoá học ${level}`
        : "Chọn nội dung học";

  // Xử lý khi bấm 1 mục menu
  const handlePress = (item: MenuItem) => {
    if (item.route === "/flashcard") {
      router.push({
        pathname: "/flashcard",
        params: {
          ...(level ? { level } : {}),
          ...(bookId ? { bookId } : {}),
          ...(title ? { title } : {}),
        },
      });
    } else if (item.route === "/grammar") {
      router.push({
        pathname: "/grammar",
        params: {
          ...(level ? { level } : {}),
          ...(title ? { title } : {}),
        },
      });
    } else if (item.route === "/kanji") {
      router.push({
        pathname: "/kanji",
        params: {
          ...(level ? { level } : {}),
          ...(bookId ? { bookId } : {}),
          ...(title ? { title: `Học Kanji ${title || level || ""}`.trim() } : {}),
        },
      });
    } else {
      // Các mục chưa có nội dung — hiển thị thông báo tạm
      Alert.alert(item.label, "Nội dung sẽ được cập nhật sớm.");
    }
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

      {/* ── 4 hàng dọc · 1 cột ── */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {buildItems(bookId).map((item) => (
          <TouchableOpacity
            key={item.id}
            style={s.menuCard}
            onPress={() => handlePress(item)}
            activeOpacity={0.7}
          >
            <View style={s.iconBox}>{item.renderIcon()}</View>
            <Text style={s.menuLabel} numberOfLines={2}>
              {item.label}
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
  // Logo badge góc phải header
  logoBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    height: 50,
  },
  logoText: { color: "#fff", fontSize: 22, fontWeight: "800", letterSpacing: 0.3 },
  logoDot:  { color: TEAL,  fontSize: 24, fontWeight: "900" },
  logoJP:   { color: "#fff", fontSize: 22, fontWeight: "900", letterSpacing: 0.5 },
  backIcon: { color: "#fff", fontSize: 32, fontWeight: "300", marginTop: -4 },
  topTitle: {
    flex: 1,
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },

  // Vùng cuộn dọc
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 12 },

  // Mỗi thẻ: full-width, icon trái · nhãn phải
  menuCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderWidth: 1.5,
    borderColor: "#bfdbfe",
  },
  // Khung icon vuông bo góc bên trái
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
    marginRight: 16,
  },
  // Nhãn bên phải icon
  menuLabel: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0f172a",
  },
});

// ─── Style chi tiết cho từng icon ──────────────────────────────────────────────
const iconStyles = StyleSheet.create({
  // Icon Hexagon (Hướng Dẫn Học) — nền xanh lá, ngũ giác xanh dương ở giữa
  hexOuter: {
    width: 40,
    height: 40,
    backgroundColor: "#86C152",
    transform: [{ rotate: "30deg" }],
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
  },
  hexInner: {
    width: 22,
    height: 22,
    backgroundColor: "#4A90E2",
    borderRadius: 4,
    transform: [{ rotate: "-30deg" }],
  },

  // Icon sách xanh có ngôi sao (Từ Vựng)
  bookWrap: {
    width: 36,
    height: 44,
    backgroundColor: "#3B82F6",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  bookSpine: {
    position: "absolute",
    left: 4,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: "#1E3A8A",
  },
  bookStar: {
    color: "#FDE68A",
    fontSize: 22,
    fontWeight: "900",
  },

  // Icon sách tím với "A✓" (Ngữ Pháp)
  grammarWrap: {
    width: 36,
    height: 44,
    backgroundColor: "#A78BFA",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  grammarA: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 24,
  },
  grammarCheck: {
    position: "absolute",
    right: 4,
    bottom: 4,
    color: "#34D399",
    fontSize: 12,
    fontWeight: "900",
  },

  // Icon mặt trời vàng (Kanji)
  sunWrap: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  sunCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FBBF24",
  },
  sunRay: {
    position: "absolute",
    width: 4,
    height: 7,
    borderRadius: 2,
    backgroundColor: "#FBBF24",
  },

  // Icon tài liệu — dùng chung cho DocJPIcon & DocVNIcon
  docWrap: {
    width: 44,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  docBody: {
    width: 36,
    height: 44,
    backgroundColor: "#fff",
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  docFold: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    backgroundColor: "#FECACA",
    borderBottomLeftRadius: 4,
  },
  jpCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#DC2626",
    marginBottom: 2,
  },
  docLine: {
    height: 2,
    backgroundColor: "#FCA5A5",
    borderRadius: 1,
    marginTop: 3,
  },
  docBadgeJP: {
    position: "absolute",
    bottom: 0,
    right: 0,
    fontSize: 9,
    fontWeight: "800",
    color: "#DC2626",
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 3,
    borderRadius: 3,
  },

  // DocVNIcon — nền đỏ cờ Việt
  docBodyVN: {
    backgroundColor: "#DC2626",
    borderColor: "#991B1B",
  },
  docFoldVN: {
    backgroundColor: "#991B1B",
  },
  vnStar: {
    fontSize: 20,
    color: "#FBBF24",
    lineHeight: 22,
    marginBottom: 2,
  },
  docBadgeVN: {
    position: "absolute",
    bottom: 0,
    right: 0,
    fontSize: 9,
    fontWeight: "800",
    color: "#DC2626",
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 3,
    borderRadius: 3,
  },
});
