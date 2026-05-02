// BottomTabBar — thanh điều hướng dưới cùng dùng chung cho tất cả trang
import { usePathname, useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const TEAL = "#4ECDC4";

export function BottomTabBar() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <SafeAreaView style={s.safe} edges={["bottom", "left", "right"]}>
      <View style={s.bar}>
        {/* Sách */}
        <TouchableOpacity
          style={s.tab}
          activeOpacity={0.7}
          onPress={() => router.push("/")}
        >
          <Text style={[s.icon, pathname === "/" && s.iconActive]}>📖</Text>
          <Text style={[s.label, pathname === "/" && s.labelActive]}>Sách</Text>
        </TouchableOpacity>

        {/* Năng lực */}
        <TouchableOpacity style={s.tab} activeOpacity={0.7}>
          <Text style={s.icon}>📊</Text>
          <Text style={s.label}>Năng lực</Text>
        </TouchableOpacity>

        {/* Spacer cho nút giữa nổi */}
        <View style={s.spacer} />

        {/* Flashcard */}
        <TouchableOpacity
          style={s.tab}
          activeOpacity={0.7}
          onPress={() => router.push("/")}
        >
          <Text style={[s.icon, pathname === "/flashcard" && s.iconActive]}>🃏</Text>
          <Text style={[s.label, pathname === "/flashcard" && s.labelActive]}>Flashcard</Text>
        </TouchableOpacity>

        {/* Lớp học */}
        <TouchableOpacity style={s.tab} activeOpacity={0.7}>
          <Text style={s.icon}>🎓</Text>
          <Text style={s.label}>Lớp học</Text>
        </TouchableOpacity>

        {/* Nút trung tâm nổi — con cú */}
        <View style={[s.center, { pointerEvents: "box-none" }]}>
          <TouchableOpacity
            style={s.owl}
            activeOpacity={0.85}
            onPress={() => router.push("/")}
          >
            <Text style={s.owlEmoji}>🦉</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 6,
    paddingBottom: 4,
    height: 64,
    position: "relative",
  },
  tab: { flex: 1, alignItems: "center", justifyContent: "center" },
  icon: { fontSize: 22, opacity: 0.45 },
  iconActive: { opacity: 1 },
  label: { fontSize: 11, color: "#475569", marginTop: 2, fontWeight: "600" },
  labelActive: { color: TEAL },
  spacer: { width: 70 },
  center: {
    position: "absolute",
    left: 0,
    right: 0,
    top: -22,
    alignItems: "center",
  },
  owl: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: TEAL,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#fff",
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  owlEmoji: { fontSize: 28 },
});
