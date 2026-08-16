import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors, useThemeMode, ThemeMode } from "../artifacts/mirai-jp/hooks/useColors";

/**
 * ThemeSettings — khối UI cho phép người dùng chọn cách hiển thị màu:
 *   - Tự động (theo giờ trong ngày)
 *   - Sáng (luôn cố định)
 *   - Tối (luôn cố định)
 *
 * Đặt component này vào bất kỳ màn hình Cài đặt / Profile nào, ví dụ:
 *   <ThemeSettings />
 */

const OPTIONS: { key: ThemeMode; label: string; icon: string; desc: string }[] = [
  { key: "auto", label: "Tự động", icon: "🌗", desc: "Đổi theo giờ trong ngày" },
  { key: "light", label: "Sáng", icon: "☀️", desc: "Luôn dùng giao diện sáng" },
  { key: "dark", label: "Tối", icon: "🌙", desc: "Luôn dùng giao diện tối" },
];

export function ThemeSettings() {
  const c = useColors();
  const { themeMode, setThemeMode, timeOfDay } = useThemeMode();

  return (
    <View style={[styles.wrap, { backgroundColor: c.card, borderColor: c.border }]}>
      <Text style={[styles.title, { color: c.text }]}>Giao diện</Text>
      {themeMode === "auto" && (
        <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
          Đang theo khung giờ: {timeOfDayLabel(timeOfDay)}
        </Text>
      )}

      <View style={styles.row}>
        {OPTIONS.map((opt) => {
          const active = themeMode === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[
                styles.option,
                {
                  borderColor: active ? c.primary : c.border,
                  backgroundColor: active ? c.primary + "14" : "transparent",
                },
              ]}
              activeOpacity={0.75}
              onPress={() => setThemeMode(opt.key)}
            >
              <Text style={styles.optionIcon}>{opt.icon}</Text>
              <Text
                style={[
                  styles.optionLabel,
                  { color: active ? c.primary : c.text },
                ]}
              >
                {opt.label}
              </Text>
              <Text style={[styles.optionDesc, { color: c.mutedForeground }]}>
                {opt.desc}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function timeOfDayLabel(t: string) {
  switch (t) {
    case "morning":
      return "Buổi sáng";
    case "day":
      return "Ban ngày";
    case "evening":
      return "Buổi tối";
    case "night":
      return "Ban đêm";
    default:
      return t;
  }
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  option: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  optionIcon: { fontSize: 22, marginBottom: 4 },
  optionLabel: { fontSize: 13, fontWeight: "700" },
  optionDesc: { fontSize: 10, textAlign: "center", marginTop: 2 },
});