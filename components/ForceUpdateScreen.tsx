import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from "react-native";

export function ForceUpdateScreen({ storeUrl }: { storeUrl: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🚀</Text>
      <Text style={styles.title}>Đã có phiên bản mới!</Text>
      <Text style={styles.desc}>
        Vui lòng cập nhật lên phiên bản mới nhất để tiếp tục sử dụng ứng dụng.
      </Text>
      <TouchableOpacity
        style={styles.btn}
        onPress={() => Linking.openURL(storeUrl)}
        activeOpacity={0.85}
      >
        <Text style={styles.btnText}>Cập nhật ngay</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    padding: 24,
  },
  emoji: { fontSize: 56, marginBottom: 16 },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 10,
    textAlign: "center",
  },
  desc: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 28,
    lineHeight: 20,
  },
  btn: {
    backgroundColor: "#004370",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
