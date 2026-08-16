// ============================================
// FILE: app/exam.tsx
// TRANG LÀM BÀI THI
// ============================================
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, Stack } from "expo-router";
import { BottomTabBar } from "../components/BottomTabBar";
import { AdBanner } from "../components/AdBanner";
import remoteConfig from "@react-native-firebase/remote-config";
import { useColors, useThemeMode } from "../artifacts/mirai-jp/hooks/useColors";

// Màu định danh riêng cho từng cấp độ đề thi (giống JLPT_COLORS ở trang chủ)
// — giữ cố định, không đổi theo theme, để luôn phân biệt được cấp độ.
const OPEN_COLORS: Record<string, string> = {
  n5: "#22C55E",
  n4: "#06B6D4",
  n3: "#F59E0B",
  n2: "#3B82F6",
  n1: "#EF4444",
};
const CLOSED_COLOR = "#94A3B8";

// ✅ Cấu trúc danh sách đề thi phẳng đơn giản
interface FlatExamOption {
  name: string; // Tên hiển thị: ví dụ "Đề số 1"
  file: string; // Tên file map code: ví dụ "n3_01"
  description: string; // Mô tả phụ: ví dụ "Cấu trúc chuẩn JLPT"
}

interface ExamLevel {
  id: string;
  level: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  exams: FlatExamOption[]; 
  isUpdated: boolean;
}

// ✅ Định nghĩa danh sách đề thi trực tiếp không qua năm tháng
const examLevels: ExamLevel[] = [
  {
    id: "n5",
    level: "N5",
    title: "Sơ cấp",
    description: "Đề thi JLPT N5 (Sắp ra mắt)",
    icon: "🌱",
    color: "#94A3B8", // đóng đề thi
    exams: [],
    isUpdated: false, // đóng đề thi 
  },
  {
    id: "n4",
    level: "N4",
    title: "Sơ trung cấp",
    description: "Đề thi JLPT N4 (Sắp ra mắt)",
    icon: "🌿",
    color: "#94A3B8", // đóng đề thi
    exams: [],
    isUpdated: false, // đóng đề thi
  },
  {
    id: "n3",
    level: "N3",
    title: "Trung cấp",
    description: "Tổng hợp bộ đề thi JLPT N3",
    icon: "🌸",
    color: "#94A3B8", // đóng đề thi
    isUpdated: false, // đóng đề thi
    exams: [
      {
        name: "Đề luyện thi số 1",
        file: "n3_01",
        description: "Từ vựng, Ngữ pháp, Đọc hiểu & Nghe hiểu",
      },
      {
        name: "Đề luyện thi số 2",
        file: "n3_02",
        description: "Từ vựng, Ngữ pháp, Đọc hiểu & Nghe hiểu",
      },
      {
        name: "Đề luyện thi số 3",
        file: "n3_03",
        description: "Từ vựng, Ngữ pháp, Đọc hiểu & Nghe hiểu",
      },
      {
        name: "Đề luyện thi số 4",
        file: "n3_04",
        description: "Từ vựng, Ngữ pháp, Đọc hiểu & Nghe hiểu",
      },
      {
        name: "Đề luyện thi số 5",
        file: "n3_05",
        description: "Từ vựng, Ngữ pháp, Đọc hiểu & Nghe hiểu",
      },
    ],
  },
  {
    id: "n2",
    level: "N2",
    title: "Thượng trung cấp",
    description: "Tổng hợp bộ đề thi JLPT N2",
    icon: "🗻",
    color: "#94A3B8", // đóng đề thi
    isUpdated: false, // đóng đề thi
    exams: [
      {
        name: "Đề luyện thi số 1",
        file: "n2_01",
        description: "Từ vựng, Ngữ pháp, Đọc hiểu & Nghe hiểu",
      },
      {
        name: "Đề luyện thi số 2",
        file: "n2_02",
        description: "Từ vựng, Ngữ pháp, Đọc hiểu & Nghe hiểu",
      },
      {
        name: "Đề luyện thi số 3",
        file: "n2_03",
        description: "Từ vựng, Ngữ pháp, Đọc hiểu & Nghe hiểu",
      },
      {
        name: "Đề luyện thi số 4",
        file: "n2_04",
        description: "Từ vựng, Ngữ pháp, Đọc hiểu & Nghe hiểu",
      },
      {
        name: "Đề luyện thi số 5",
        file: "n2_05",
        description: "Từ vựng, Ngữ pháp, Đọc hiểu & Nghe hiểu",
      },
    ],
  },
  {
    id: "n1",
    level: "N1",
    title: "Cao cấp",
    description: "Đề thi JLPT N1 (Sắp ra mắt)",
    icon: "🏆",
    color: "#94A3B8", // đóng đề thi
    exams: [],
    isUpdated: false, // đóng đề thi
  },
];

export default function ExamScreen() {
  const c = useColors(); // bảng màu hiện tại — tự đổi theo giờ / lựa chọn người dùng
  const { themeMode, timeOfDay } = useThemeMode();
  const isDark = themeMode === "dark" || (themeMode === "auto" && timeOfDay === "night");

  const router = useRouter();
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);

  const [levelStatus, setLevelStatus] = useState<Record<string, boolean>>({
  n5: false,
  n4: false,
  n3: false,
  n2: false,
  n1: false,
});

useEffect(() => {
  (async () => {
    try {
      await remoteConfig().setDefaults({
        exam_n5_open: false,
        exam_n4_open: false,
        exam_n3_open: true,
        exam_n2_open: true,
        exam_n1_open: false,
      });
      await remoteConfig().fetchAndActivate();
      setLevelStatus({
        n5: remoteConfig().getValue("exam_n5_open").asBoolean(),
        n4: remoteConfig().getValue("exam_n4_open").asBoolean(),
        n3: remoteConfig().getValue("exam_n3_open").asBoolean(),
        n2: remoteConfig().getValue("exam_n2_open").asBoolean(),
        n1: remoteConfig().getValue("exam_n1_open").asBoolean(),
      });
    } catch (err) {
      console.error("Lỗi tải cấu hình đề thi:", err);
    }
  })();
}, []);

const displayLevels = examLevels.map((lv) => {
  const isUpdated = levelStatus[lv.id] ?? lv.isUpdated;
  return {
    ...lv,
    isUpdated,
    color: isUpdated ? OPEN_COLORS[lv.id] : CLOSED_COLOR,
  };
});

  const handleLevelSelect = (exam: ExamLevel) => {
    if (exam.isUpdated) {
      setSelectedLevel(exam.id);
    } else {
      Alert.alert("📢 Thông báo về vấn đề bản quyền", `Đề thi ${exam.level} sẽ mở tính năng trước ngày thi chính thức 30 ngày`, [
        { text: "OK", style: "default" },
      ]);
    }
  };

  const handleStartExam = (examFile: string) => {
    router.push({
      pathname: "/exam-detail",
      params: { id: examFile }, 
    });
  };

  const selectedExam = displayLevels.find((l) => l.id === selectedLevel);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.root, { backgroundColor: c.background }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={c.primary} />
        <LinearGradient
          colors={[c.primary, c.primary + "cc"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <SafeAreaView style={styles.topBar}>
            <View style={styles.topBarInner}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() =>
                  selectedLevel ? setSelectedLevel(null) : router.back()
                }
              >
                <Text style={[styles.backIcon, { color: c.primaryForeground }]}>‹</Text>
              </TouchableOpacity>
              <View style={{ flex: 1 }} />
              <View style={styles.logoBadge}>
                <Text style={[styles.logoText, { color: c.primaryForeground }]}>Mirai</Text>
              </View>
            </View>
            <Text style={[styles.headerTitle, { color: c.primaryForeground }]}>
              {selectedLevel
                ? `📝 ${selectedExam?.level} - Danh sách đề`
                : "📝 Luyện đề JLPT"}
            </Text>
          </SafeAreaView>
        </LinearGradient>

        <ScrollView style={styles.content}>
          {!selectedLevel
            ? // LỰA CHỌN CẤP ĐỘ (N5 - N1)
              displayLevels.map((exam) => (
                <TouchableOpacity
                  key={exam.id}
                  style={[
                    styles.examCard,
                    { backgroundColor: c.card, borderColor: c.border },
                    !exam.isUpdated && { opacity: 0.6, backgroundColor: c.muted },
                  ]}
                  onPress={() => handleLevelSelect(exam)}
                >
                  <View
                    style={[
                      styles.examIcon,
                      { backgroundColor: exam.color + "20" },
                    ]}
                  >
                    <Text style={styles.examIconText}>{exam.icon}</Text>
                  </View>
                  <View style={styles.examInfo}>
                    <View style={styles.examHeader}>
                      <Text style={[styles.examLevel, { color: exam.color }]}>
                        {exam.level}
                      </Text>
                      <Text style={[styles.examTitle, { color: c.mutedForeground }]}>
                        {exam.title}
                      </Text>
                    </View>
                    <Text style={[styles.examDescription, { color: c.mutedForeground }]}>
                      {exam.description}
                    </Text>
                  </View>
                  {exam.isUpdated ? (
                    <Text style={[styles.arrowIcon, { color: c.mutedForeground }]}>›</Text>
                  ) : (
                    <Text style={styles.lockIcon}>🔒</Text>
                  )}
                </TouchableOpacity>
              ))
            : // ✅ GIAO DIỆN PHẲNG MỚI: LIỆT KÊ TRỰC TIẾP DANH SÁCH ĐỀ THI
              selectedExam && (
                <View style={styles.examListContainer}>
                  <View
                    style={[
                      styles.infoBox,
                      { backgroundColor: c.primary + "14", borderColor: c.primary + "40" },
                    ]}
                  >
                    <Text style={[styles.infoText, { color: c.primary }]}>
                      📊 Hệ thống có: {selectedExam.exams.length} đề thi sẵn
                      sàng
                    </Text>
                  </View>

                  {selectedExam.exams.map((item, index) => (
                    <TouchableOpacity
                      key={item.file}
                      style={[styles.flatExamCard, { backgroundColor: c.card, borderColor: c.border }]}
                      onPress={() => handleStartExam(item.file)}
                    >
                      <View style={[styles.flatExamBadge, { backgroundColor: c.primary }]}>
                        <Text style={[styles.flatExamBadgeText, { color: c.primaryForeground }]}>
                          {index + 1}
                        </Text>
                      </View>
                      <View style={styles.flatExamInfo}>
                        <Text style={[styles.flatExamName, { color: c.text }]}>{item.name}</Text>
                        <Text style={[styles.flatExamDesc, { color: c.mutedForeground }]}>
                          {item.description}
                        </Text>
                      </View>
                      <View style={styles.startBadge}>
                        <Text style={styles.startBadgeText}>VÀO THI</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
        </ScrollView>
        <BottomTabBar />
        <AdBanner />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  headerGradient: {
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingBottom: 10,
  },
  root: { flex: 1 },
  topBar: { backgroundColor: "transparent", paddingBottom: 16 },
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
  logoBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    height: 50,
  },
  logoText: { fontSize: 22, fontWeight: "800" },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },

  // Cấp độ Card
  examCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  examIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  examIconText: { fontSize: 28 },
  examInfo: { flex: 1 },
  examHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  examLevel: { fontSize: 16, fontWeight: "800" },
  examTitle: { fontSize: 14 },
  examDescription: { fontSize: 13 },
  arrowIcon: { fontSize: 24, marginLeft: 8 },
  lockIcon: { fontSize: 16, marginLeft: 8, opacity: 0.6 },

  infoBox: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    alignItems: "center",
    borderWidth: 1,
  },
  infoText: { fontSize: 14, fontWeight: "700" },

  // ✅ Style cho danh sách đề thi phẳng mới
  examListContainer: { paddingBottom: 24 },
  flatExamCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  flatExamBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  flatExamBadgeText: {
    fontWeight: "700",
    fontSize: 14,
  },
  flatExamInfo: {
    flex: 1,
    marginRight: 8,
  },
  flatExamName: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  flatExamDesc: {
    fontSize: 12,
  },
  // Nút "VÀO THI" — giữ màu cam CTA cố định (giống các nút CTA banner khác
  // trong app), không đổi theo theme để luôn là điểm nhấn hành động rõ ràng.
  startBadge: {
    backgroundColor: "#F59E0B",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  startBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },
});