// BottomTabBar — thanh điều hướng dưới cùng dùng chung cho tất cả trang
import { usePathname, useRouter } from "expo-router";
import React from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ✅ MÀU CHỦ ĐẠO MỚI
const TEAL = "#1F6F7A";
const TEAL_DARK = "#0B3540";

export function BottomTabBar() {
  const router = useRouter();
  const pathname = usePathname();

  // Hàm xử lý khi nhấn vào Tin Tức
  const handleNewsPress = () => {
    Alert.alert(
      "📢 Thông báo",
      "Đang phát triển",
      [{ text: "OK", style: "default" }]
    );
  };

  return (
    <SafeAreaView style={s.safe} edges={["bottom", "left", "right"]}>
      <View style={s.bar}>
        {/* Thi thử JLPT - Trái */}
        <TouchableOpacity
          style={s.tab}
          activeOpacity={0.7}
          onPress={() => router.push("/exam")}
        >
          <Text style={[s.icon, pathname === "/exam" && s.iconActive]}>🎓</Text>
          <Text style={[s.label, pathname === "/exam" && s.labelActive]}>
            Đang phát triển
          </Text>
        </TouchableOpacity>

        {/* Spacer cho nút giữa nổi */}
        <View style={s.spacer} />

        {/* Tin Tức - Phải */}
        <TouchableOpacity 
          style={s.tab} 
          activeOpacity={0.7}
          onPress={handleNewsPress}
        >
          {/* ✅ Đã cập nhật pathname thành /news để đồng bộ với tính năng Tin Tức */}
          <Text style={[s.icon, pathname === "/news" && s.iconActive]}>📝</Text>
          <Text style={[s.label, pathname === "/news" && s.labelActive]}>
            Đang phát triển 
          </Text>
        </TouchableOpacity>

        {/* Nút trung tâm nổi home */}
        <View style={[s.center, { pointerEvents: "box-none" }]}>
          <TouchableOpacity
            style={s.owl}
            activeOpacity={0.85}
            onPress={() => router.push("/")}
          >
            <Text style={s.owlEmoji}>🏠</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    backgroundColor: "#e5e4e4",
    borderTopWidth: 1,
    borderTopColor: TEAL_DARK,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 6,
    height: 32,
    position: "relative",
  },
  tab: { 
    flex: 1, 
    alignItems: "center", 
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  icon: { 
    fontSize: 22, 
    opacity: 0.45,
  },
  iconActive: { 
    opacity: 1,
    color: TEAL,
  },
  label: { 
    fontSize: 12, 
    color: "#475569", 
    marginTop: 2, 
    fontWeight: "600", 
  },
  labelActive: { 
    color: TEAL,
    fontWeight: "700",
  },
  spacer: { 
    width: 70 
  },
  center: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    alignItems: "center",
  },
  owl: {
    width: 60,
    height: 60,
    borderRadius: 30,
    // backgroundColor: TEAL,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#d9ccd5",
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  owlEmoji: { 
    fontSize: 28 
  },
});
