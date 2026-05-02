import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface Props {
  pageKey: string;
}

export function FeedbackSection({ pageKey }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!text.trim()) return;
    try {
      const existing = await AsyncStorage.getItem("feedback_list");
      const list = existing ? JSON.parse(existing) : [];
      list.push({ pageKey, text, date: new Date().toISOString() });
      await AsyncStorage.setItem("feedback_list", JSON.stringify(list));
    } catch {}
    setText("");
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setOpen(false);
    }, 2000);
  };

  if (!open) {
    return (
      <TouchableOpacity style={s.trigger} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Text style={s.triggerText}>💬 Đóng góp ý kiến</Text>
      </TouchableOpacity>
    );
  }

  if (sent) {
    return (
      <View style={s.card}>
        <Text style={s.thankText}>✅ Cảm ơn bạn đã góp ý!</Text>
      </View>
    );
  }

  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>Góp ý cho trang này</Text>
      <TextInput
        style={s.input}
        value={text}
        onChangeText={setText}
        placeholder="Nhập ý kiến của bạn..."
        placeholderTextColor="#94a3b8"
        multiline
        numberOfLines={3}
      />
      <View style={s.row}>
        <TouchableOpacity style={s.cancelBtn} onPress={() => setOpen(false)} activeOpacity={0.7}>
          <Text style={s.cancelText}>Hủy</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.submitBtn} onPress={submit} activeOpacity={0.7}>
          <Text style={s.submitText}>Gửi</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  trigger: {
    paddingVertical: 12,
    alignItems: "center",
  },
  triggerText: {
    color: "#64748b",
    fontSize: 13,
  },
  card: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 14,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 10,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 10,
    fontSize: 14,
    color: "#0f172a",
    minHeight: 70,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 10,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cancelText: { color: "#64748b", fontSize: 14, fontWeight: "600" },
  submitBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#4ECDC4",
  },
  submitText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  thankText: {
    textAlign: "center",
    color: "#22c55e",
    fontSize: 15,
    fontWeight: "700",
    paddingVertical: 8,
  },
});
