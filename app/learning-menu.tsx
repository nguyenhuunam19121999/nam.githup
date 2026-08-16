// ─────────────────────────────────────────────────────────────────────────────
// learning-menu.tsx
// Trang menu trung gian hiển thị 4 lựa chọn học tập:
//   Đố vui · Từ Vựng · Ngữ Pháp · Kanji
// ─────────────────────────────────────────────────────────────────────────────

import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { BottomTabBar } from "../components/BottomTabBar";
import { AdBanner } from "../components/AdBanner";
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
import { useColors, useThemeMode } from "../artifacts/mirai-jp/hooks/useColors";

interface MenuItem {
  id: string;
  label: string;
  renderIcon: () => React.ReactNode;
  route?: string;
}

function HexIcon() {
  return (
    <View style={iconStyles.hexOuter}>
      <View style={iconStyles.hexInner} />
    </View>
  );
}

function BookIcon() {
  return (
    <View style={iconStyles.bookWrap}>
      <View style={iconStyles.bookSpine} />
      <Text style={iconStyles.bookStar}>✦</Text>
    </View>
  );
}


function buildItems(): MenuItem[] {
  return [
    {
      id: "guide",
      label: "Đang phát triển",
      renderIcon: () => <HexIcon />,
    },
    {
      id: "vocab",
      label: "Từ Vựng",
      renderIcon: () => <BookIcon />,
      route: "/vocab",
    },
  ];
}

export default function LearningMenuScreen() {
  const c = useColors(); // bảng màu hiện tại — tự đổi theo giờ / lựa chọn người dùng
  const { themeMode, timeOfDay } = useThemeMode();
  const isDark = themeMode === "dark" || (themeMode === "auto" && timeOfDay === "night");

  const router = useRouter();
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

  const handlePress = (item: MenuItem) => {
    if (item.route === "/vocab") {
      router.push({
        pathname: "/vocab",
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
    } else {
      Alert.alert(item.label, "Nội dung sẽ được cập nhật sớm.");
    }
  };

  return (
    <View style={[s.root, { backgroundColor: c.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={c.primary} />
      <LinearGradient
        colors={[c.primary, c.primary + "cc"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.headerGradient}
      >
        <SafeAreaView style={s.topBar} edges={["top", "left", "right"]}>
          <View style={s.topBarInner}>
            <TouchableOpacity
              style={s.backBtn}
              onPress={() => router.back()}
              activeOpacity={0.7}
              hitSlop={10}
            >
              <Text style={[s.backIcon, { color: c.primaryForeground }]}>‹</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <View style={s.logoBadge}>
              <Text style={[s.logoText, { color: c.primaryForeground }]}>Mirai</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {buildItems().map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[s.menuCard, { backgroundColor: c.card, borderColor: c.border }]}
            onPress={() => handlePress(item)}
            activeOpacity={0.7}
          >
            <View style={[s.iconBox, { backgroundColor: c.muted }]}>{item.renderIcon()}</View>
            <Text style={[s.menuLabel, { color: c.text }]} numberOfLines={2}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <BottomTabBar />
      <AdBanner />
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerGradient: {
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingBottom: 10,
  },
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
  logoBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    height: 50,
  },
  logoText: { fontSize: 22, fontWeight: "800", letterSpacing: 0.3 },
  backIcon: { fontSize: 32, fontWeight: "300", marginTop: -4 },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    marginLeft: 6,
    letterSpacing: 0.2,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 12 },

  menuCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderWidth: 1.5,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  menuLabel: {
    fontSize: 17,
    fontWeight: "700",
  },
});

// Icon trang trí — giữ màu sắc cố định (đây là icon minh hoạ nhiều màu,
// không phải text cần tương phản theo nền, nên không đổi theo theme).
const iconStyles = StyleSheet.create({
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
});