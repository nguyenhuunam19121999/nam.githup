// ─────────────────────────────────────────────────────────────────────────────
// learning-menu.tsx
// Trang menu trung gian hiển thị 4 lựa chọn học tập:
//   Đố vui · Từ Vựng · Ngữ Pháp · Kanji
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

const TEAL = "#4ECDC4";
const GRAD = ["#4ECDC4", "#5e9a95"] as const;

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
      label: "Đố vui",
      renderIcon: () => <HexIcon />,
    },
    {
      id: "vocab",
      label: "Từ Vựng",
      renderIcon: () => <BookIcon />,
      route: "/flashcard",
    },
  ];
}

export default function LearningMenuScreen() {
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
    } else {
      Alert.alert(item.label, "Nội dung sẽ được cập nhật sớm.");
    }
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={TEAL} />

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
          <View style={s.logoBadge}>
            <Text style={s.logoText}>Mirai</Text>
            <Text style={s.logoDot}>.</Text>
            <Text style={s.logoJP}>JP</Text>
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

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f1f5f9" },

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
  logoText: { color: "#fff", fontSize: 22, fontWeight: "800", letterSpacing: 0.3 },
  logoDot:  { color: TEAL,  fontSize: 24, fontWeight: "900" },
  logoJP:   { color: "#fff", fontSize: 22, fontWeight: "900", letterSpacing: 0.5 },
  backIcon: { color: "#fff", fontSize: 32, fontWeight: "300", marginTop: -4 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 12 },

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
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
    marginRight: 16,
  },
  menuLabel: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0f172a",
  },
});

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
