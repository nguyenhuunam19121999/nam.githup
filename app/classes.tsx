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
import { useRouter } from "expo-router";

const TEAL = "#1fcb44";
const GRAD = ["#42f719", "#16f07c"] as const;

interface ClassItem {
  id: string;
  name: string;
  level: string;
  students: number;
  icon: string;
  color: string;
}

const classes: ClassItem[] = [
  { id: "n5", name: "Lớp Sơ cấp", level: "N5", students: 45, icon: "🌱", color: "#22C55E" },
  { id: "n4", name: "Lớp Sơ trung cấp", level: "N4", students: 38, icon: "🌿", color: "#3B82F6" },
  { id: "n3", name: "Lớp Trung cấp", level: "N3", students: 32, icon: "🌸", color: "#F59E0B" },
  { id: "n2", name: "Lớp Thượng trung cấp", level: "N2", students: 28, icon: "🗻", color: "#EA580C" },
  { id: "n1", name: "Lớp Cao cấp", level: "N1", students: 25, icon: "🏆", color: "#C0392B" },
];

export default function ClassesScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={TEAL} />
      
      <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
        <SafeAreaView style={styles.header}>
          <Text style={styles.headerTitle}>📚 Lớp học của tôi</Text>
          <Text style={styles.headerSubtitle}>Chọn lớp để tiếp tục học</Text>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {classes.map((classItem) => (
          <TouchableOpacity
            key={classItem.id}
            style={styles.classCard}
            onPress={() => router.push(`/class-detail?id=${classItem.id}&level=${classItem.level}`)}
            activeOpacity={0.8}
          >
            <View style={[styles.classIcon, { backgroundColor: classItem.color + "20" }]}>
              <Text style={styles.classIconText}>{classItem.icon}</Text>
            </View>
            <View style={styles.classInfo}>
              <View style={styles.classHeader}>
                <Text style={styles.className}>{classItem.name}</Text>
                <Text style={[styles.classLevel, { color: classItem.color }]}>
                  {classItem.level}
                </Text>
              </View>
              <View style={styles.classStats}>
                <Text style={styles.classStudents}>👥 {classItem.students} học viên</Text>
              </View>
            </View>
            <Text style={styles.arrowIcon}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f1f5f9",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  classCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  classIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  classIconText: {
    fontSize: 28,
  },
  classInfo: {
    flex: 1,
  },
  classHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  className: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
  },
  classLevel: {
    fontSize: 12,
    fontWeight: "700",
  },
  classStats: {
    flexDirection: "row",
    gap: 16,
  },
  classStudents: {
    fontSize: 12,
    color: "#94a3b8",
  },
  arrowIcon: {
    fontSize: 24,
    color: "#cbd5e1",
    marginLeft: 8,
  },
});
