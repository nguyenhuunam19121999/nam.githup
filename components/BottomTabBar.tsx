// BottomTabBar — thanh điều hướng dưới cùng dùng chung cho tất cả trang
import { usePathname, useRouter } from "expo-router";
import React from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColors } from "../artifacts/mirai-jp/hooks/useColors";

export function BottomTabBar() {
  const c = useColors(); // bảng màu hiện tại — tự đổi theo giờ / lựa chọn người dùng
  const router = useRouter();
  const pathname = usePathname();

  // Hàm xử lý khi nhấn vào
  const handleNewsPress = () => {
    Alert.alert(
      "📢 Thông báo",
      "Đang phát triển",
      [{ text: "OK", style: "default" }]
    );
  };

  return (
    <SafeAreaView
      style={[s.safe, { backgroundColor: c.card, borderTopColor: c.border }]}
      edges={["bottom", "left", "right"]}
    >
      <View style={s.bar}>
        {/* Thi thử JLPT - Trái */}
        <TouchableOpacity
          style={s.tab}
          activeOpacity={0.7}
          onPress={() => router.push("/exam")}
        >
          <View style={s.tabContent}>
            <Text style={[s.icon, pathname === "/exam" && { color: c.primary, opacity: 1 }]}>
              🎓
            </Text>
            <Text
              style={[
                s.label,
                { color: c.mutedForeground },
                pathname === "/exam" && { color: c.primary, fontWeight: "700" },
              ]}
            >
              Luyện thi
            </Text>
          </View>
        </TouchableOpacity>

        {/* Spacer cho nút giữa nổi */}
        <View style={s.spacer} />

        {/* đang phát triển - Phải */}
        <TouchableOpacity
          style={s.tab}
          activeOpacity={0.7}
          onPress={handleNewsPress}
        >
          <Text style={[s.icon, pathname === "/news" && { color: c.primary, opacity: 1 }]}>
            📝
          </Text>
          <Text
            style={[
              s.label,
              { color: c.mutedForeground },
              pathname === "/news" && { color: c.primary, fontWeight: "700" },
            ]}
          >
            Đang phát triển
          </Text>
        </TouchableOpacity>

        {/* Nút trung tâm nổi home */}
        <View style={[s.center, { pointerEvents: "box-none" }]}>
          <TouchableOpacity
            style={[s.owl, { borderColor: c.border, shadowColor: c.primary }]}
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
    borderTopWidth: 1,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 26,
    height: 32,
    position: "relative",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    height: 32,
    paddingVertical: 0,
  },
  tabContent: {
    alignItems: "center",
    justifyContent: "center",
    height: 32,
    marginTop: 0,
    paddingVertical: 0,
  },
  icon: {
    fontSize: 18,
    opacity: 0.7,
  },
  label: {
    fontSize: 12,
    marginTop: 0,
    fontWeight: "600",
  },
  spacer: {
    width: 70,
  },
  center: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    alignItems: "center",
    height: 70,
    justifyContent: "center",
  },
  owl: {
    width: 56,
    height: 56,
    borderRadius: 30,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
    marginTop: -5,
  },
  owlEmoji: {
    fontSize: 26,
  },
});











// // BottomTabBar — thanh điều hướng dưới cùng dùng chung cho tất cả trang
// import { usePathname, useRouter } from "expo-router";
// import React from "react";
// import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context";

// // ✅ MÀU CHỦ ĐẠO MỚI
// const TEAL = "#004370";
// const TEAL_DARK = "#0B3540";

// export function BottomTabBar() {
//   const router = useRouter();
//   const pathname = usePathname();

//   // Hàm xử lý khi nhấn vào
//   const handleNewsPress = () => {
//     Alert.alert(
//       "📢 Thông báo",
//       "Đang phát triển",
//       [{ text: "OK", style: "default" }]
//     );
//   };

//   return (
//     <SafeAreaView style={s.safe} edges={["bottom", "left", "right"]}>
//       <View style={s.bar}>
//         {/* Thi thử JLPT - Trái */}
//         <TouchableOpacity
//           style={s.tab}
//           activeOpacity={0.7}
//           onPress={() => router.push("/exam")}
//         >
//           <View style={s.tabContent}>
//             <Text style={[s.icon, pathname === "/exam" && s.iconActive]}>🎓</Text>
//             <Text style={[s.label, pathname === "/exam" && s.labelActive]}>
//               Luyện thi
//             </Text>
//           </View>
//         </TouchableOpacity>

//         {/* Spacer cho nút giữa nổi */}
//         <View style={s.spacer} />

//         {/* đang phát triển - Phải */}
//         <TouchableOpacity 
//           style={s.tab} 
//           activeOpacity={0.7}
//           onPress={handleNewsPress}
//         >
//           <Text style={[s.icon, pathname === "/news" && s.iconActive]}>📝</Text>
//           <Text style={[s.label, pathname === "/news" && s.labelActive]}>
//             Đang phát triển 
//           </Text>
//         </TouchableOpacity>

//         {/* Nút trung tâm nổi home */}
//         <View style={[s.center, { pointerEvents: "box-none" }]}>
//           <TouchableOpacity
//             style={s.owl}
//             activeOpacity={0.85}
//             onPress={() => router.push("/")}
//           >
//             <Text style={s.owlEmoji}>🏠</Text>
//           </TouchableOpacity>
//         </View>
//       </View>
//     </SafeAreaView>
//   );
// }

// const s = StyleSheet.create({
//   safe: {
//     backgroundColor: "#e5e4e4",
//     borderTopWidth: 1,
//     borderTopColor: TEAL_DARK,
//   },
//   bar: {
//     flexDirection: "row",
//     alignItems: "center",
//     paddingTop: 26,
//     height: 32,
//     position: "relative",
//   },
//   tab: { 
//     flex: 1, 
//     alignItems: "center", 
//     justifyContent: "center",
//     paddingHorizontal: 8,
//     height: 32,
//     paddingVertical: 0,
//   },
//    tabContent: {
//     alignItems: "center",
//     justifyContent: "center",
//     height: 32, 
//     marginTop: 0,
//     paddingVertical: 0, 
//   },
//   icon: { 
//     fontSize: 18, 
//   },
//   iconActive: { 
//     opacity: 1,
//     color: TEAL,
//   },
//   label: { 
//     fontSize: 12, 
//     color: "#475569", 
//     marginTop: 0, 
//     fontWeight: "600", 
//   },
//   labelActive: { 
//     color: TEAL,
//     fontWeight: "700",
//   },
//   spacer: { 
//     width: 70 
//   },
//   center: {
//     position: "absolute",
//     left: 0,
//     right: 0,
//     top: 0,
//     alignItems: "center",
//     height: 70,
//     justifyContent: "center",
//   },
//   owl: {
//     width: 56,
//     height: 56,
//     borderRadius: 30,
//     // backgroundColor: TEAL,
//     backgroundColor: "transparent",
//     alignItems: "center",
//     justifyContent: "center",
//     borderWidth: 4,
//     borderColor: "#d9ccd5",
//     shadowColor: TEAL,
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.35,
//     shadowRadius: 8,
//     elevation: 8,
//     marginTop: -5,
//   },
//   owlEmoji: { 
//     fontSize: 26 
//   },
// });