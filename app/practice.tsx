import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, Stack } from "expo-router";
import { BottomTabBar } from "../components/BottomTabBar";

// const TEAL = "#7C3AED";
// const GRAD = ["#7C3AED", "#5B21B6"] as const;
// ✅ MÀU CHỦ ĐẠO MỚI
const TEAL = "#004370";
const TEAL_DARK = "#004370";
const GRAD = [TEAL, TEAL_DARK] as const;

interface PracticeItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  route: string;
}

const practiceItems: PracticeItem[] = [
  {
    id: "vocab",
    title: "Từ vựng",
    description: "Luyện tập từ vựng theo chủ đề",
    icon: "📖",
    color: "#3B82F6",
    route: "/vocab-practice",
  },
  {
    id: "kanji",
    title: "Hán tự",
    description: "Luyện viết và nhận diện Kanji",
    icon: "🈳",
    color: "#EF4444",
    route: "/kanji-practice",
  },
  {
    id: "grammar",
    title: "Ngữ pháp",
    description: "Luyện tập cấu trúc ngữ pháp",
    icon: "📝",
    color: "#10B981",
    route: "/grammar-practice",
  },
  {
    id: "listening",
    title: "Nghe hiểu",
    description: "Luyện kỹ năng nghe",
    icon: "🎧",
    color: "#F59E0B",
    route: "/listening-practice",
  },
];

export default function PracticeScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor={TEAL} />
        
        <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
          <SafeAreaView style={styles.topBar}>
            <View style={styles.topBarInner}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => router.back()}
                activeOpacity={0.7}
                hitSlop={10}
              >
                <Text style={styles.backIcon}>‹</Text>
              </TouchableOpacity>
              <View style={{ flex: 1 }} />
              <View style={styles.logoBadge}>
                <Text style={styles.logoText}>Mirai</Text>
                <Text style={styles.logoDot}>.</Text>
                <Text style={styles.logoJP}>JP</Text>
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>🎓 Luyện Thi</Text>
            <Text style={styles.headerSubtitle}>Chọn kỹ năng để luyện tập</Text>
          </View>

          {practiceItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.practiceCard}
              onPress={() => router.push(item.route)}
              activeOpacity={0.8}
            >
              <View style={[styles.practiceIcon, { backgroundColor: item.color + "20" }]}>
                <Text style={styles.practiceIconText}>{item.icon}</Text>
              </View>
              <View style={styles.practiceInfo}>
                <Text style={styles.practiceTitle}>{item.title}</Text>
                <Text style={styles.practiceDescription}>{item.description}</Text>
              </View>
              <Text style={styles.arrowIcon}>›</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        <BottomTabBar />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#f1f5f9",
  },
  topBar: {
    backgroundColor: "transparent",
  },
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
  backIcon: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "300",
    marginTop: -4,
  },
  logoBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    height: 50,
  },
  logoText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  logoDot: {
    color: TEAL,
    fontSize: 24,
    fontWeight: "900",
  },
  logoJP: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  headerText: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1e293b",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  practiceCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  practiceIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  practiceIconText: {
    fontSize: 28,
  },
  practiceInfo: {
    flex: 1,
  },
  practiceTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
  },
  practiceDescription: {
    fontSize: 13,
    color: "#64748b",
  },
  arrowIcon: {
    fontSize: 24,
    color: "#cbd5e1",
    marginLeft: 8,
  },
});
