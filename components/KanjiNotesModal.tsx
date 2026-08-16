// ─────────────────────────────────────────────────────────────────────────────
// KanjiNotesModal.tsx — Modal ghi chú cá nhân cho từng chữ Kanji
//
// Tính năng:
//   • Mở bottom-sheet ghi chú riêng cho từng kanji (theo ID)
//   • Tải ghi chú đã lưu từ AsyncStorage khi mở
//   • CHỈ lưu khi đã đăng nhập (currentUser !== null)
//   • Khi chưa đăng nhập: hiển thị banner cảnh báo, vô hiệu nút Lưu
//   • Khoá AsyncStorage: scopedKey("kanjiNote::<id>")
// ─────────────────────────────────────────────────────────────────────────────

import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { type KanjiItem } from "../assets/data_JLPT_kanji";
import { useAuth } from "../artifacts/mirai-jp/hooks/useAuth";
import { useColors, ThemeFadeOverlay } from "../artifacts/mirai-jp/hooks/useColors";

// ─────────────────────────────────────────────────────────────────────────────
export function KanjiNotesModal({
  item,
  onClose,
}: {
  item: KanjiItem | null;
  onClose: () => void;
}) {
  const c = useColors(); // bảng màu hiện tại — tự đổi theo giờ / lựa chọn người dùng
  const { currentUser, scopedKey } = useAuth();
  const isLoggedIn = currentUser !== null;

  const [text, setText]       = useState("");
  const [saved, setSaved]     = useState(false);   // hiệu ứng "Đã lưu ✓"
  const [loading, setLoading] = useState(false);
  const inputRef              = useRef<TextInput>(null);

  // Tải ghi chú khi mở modal (hoặc khi item thay đổi)
  useEffect(() => {
    if (!item) return;
    setSaved(false);
    setText("");
    if (!isLoggedIn) return; // khách không có ghi chú đã lưu
    (async () => {
      setLoading(true);
      try {
        const key = scopedKey(`kanjiNote::${item.id}`);
        const raw = await AsyncStorage.getItem(key);
        setText(raw ?? "");
      } catch {
        // bỏ qua lỗi đọc
      } finally {
        setLoading(false);
      }
    })();
  }, [item?.id, isLoggedIn]);

  // Lưu ghi chú vào AsyncStorage
  const handleSave = async () => {
    if (!item || !isLoggedIn) return;
    Keyboard.dismiss();
    try {
      const key = scopedKey(`kanjiNote::${item.id}`);
      await AsyncStorage.setItem(key, text);
      setSaved(true);
      // Tắt hiệu ứng "Đã lưu ✓" sau 2 giây
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // bỏ qua lỗi ghi
    }
  };

  if (!item) return null;

  return (
    <Modal
      visible={!!item}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={n.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <TouchableOpacity
          style={[n.backdrop, { backgroundColor: "rgba(0,0,0,0.5)" }]}
          activeOpacity={1}
          onPress={() => { Keyboard.dismiss(); onClose(); }}
        />

        <View style={[n.sheet, { backgroundColor: c.card }]}>
          {/* Handle + tiêu đề */}
          <View style={[n.handle, { backgroundColor: c.border }]} />
          <View style={n.sheetHeader}>
            <Text style={[n.sheetTitle, { color: c.text }]}>📋 Ghi chú — {item.kanji}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Text style={[n.closeText, { color: c.primary }]}>Đóng</Text>
            </TouchableOpacity>
          </View>

          {/* Banner cảnh báo khi chưa đăng nhập — giữ màu vàng cảnh báo
              cố định (không đổi theo theme) vì đây là màu ngữ nghĩa. */}
          {!isLoggedIn && (
            <View style={n.warningBanner}>
              <Text style={n.warningIcon}>🔒</Text>
              <Text style={n.warningText}>
                Đăng nhập để lưu ghi chú. Ghi chú hiện tại sẽ không được lưu lại.
              </Text>
            </View>
          )}

          {/* Thông tin chữ mini */}
          <View style={[n.infoChip, { backgroundColor: c.muted }]}>
            <Text style={[n.infoKanji, { color: c.destructive }]}>{item.kanji}</Text>
            <Text style={[n.infoHanViet, { color: c.mutedForeground }]}> {item.hanviet?.[0] ?? ""}</Text>
            <Text style={[n.infoDash, { color: c.mutedForeground }]}> — </Text>
            <Text style={[n.infoMeaning, { color: c.text }]} numberOfLines={1}>
              {item.meanings_vi?.[0] ?? ""}
            </Text>
          </View>

          {/* Vùng nhập ghi chú */}
          <ScrollView style={n.scrollArea} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <TextInput
              ref={inputRef}
              style={[
                n.textInput,
                { backgroundColor: c.muted, borderColor: c.border, color: c.text },
                !isLoggedIn && { backgroundColor: c.muted, color: c.mutedForeground },
              ]}
              value={loading ? "Đang tải..." : text}
              onChangeText={setText}
              placeholder={
                isLoggedIn
                  ? "Viết ghi chú của bạn ở đây…\nVí dụ: mẹo nhớ, cách dùng, ví dụ thêm…"
                  : "Bạn đang xem ở chế độ khách. Đăng nhập để lưu ghi chú."
              }
              placeholderTextColor={c.mutedForeground}
              multiline
              textAlignVertical="top"
              editable={isLoggedIn && !loading}
              autoFocus={isLoggedIn}
            />
          </ScrollView>

          {/* Nút Lưu */}
          <TouchableOpacity
            style={[
              n.saveBtn,
              { backgroundColor: c.primary },
              (!isLoggedIn || loading) && { backgroundColor: c.muted },
            ]}
            onPress={handleSave}
            activeOpacity={0.85}
            disabled={!isLoggedIn || loading}
          >
            <Text
              style={[
                n.saveBtnText,
                { color: c.primaryForeground },
                (!isLoggedIn || loading) && { color: c.mutedForeground },
              ]}
            >
              {saved ? "✓ Đã lưu" : "💾 Lưu ghi chú"}
            </Text>
          </TouchableOpacity>
        </View>
        <ThemeFadeOverlay />
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Styles (chỉ layout — màu gán inline theo theme ở trên) ───────────────────
const n = StyleSheet.create({
  flex: { flex: 1, justifyContent: "flex-end" },

  // Lớp tối phía sau sheet
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },

  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 36, paddingTop: 12,
    maxHeight: "85%",
  },
  handle: {
    alignSelf: "center", width: 40, height: 4,
    borderRadius: 2, marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 14,
  },
  sheetTitle: { fontSize: 17, fontWeight: "800" },
  closeText:  { fontSize: 15, fontWeight: "600" },

  // Banner cảnh báo chưa đăng nhập — màu vàng cố định (ngữ nghĩa, không theo theme)
  warningBanner: {
    flexDirection: "row", alignItems: "flex-start",
    backgroundColor: "#fffbeb", borderRadius: 12,
    borderWidth: 1, borderColor: "#fde68a",
    padding: 12, marginBottom: 12, gap: 8,
  },
  warningIcon: { fontSize: 16 },
  warningText: { flex: 1, fontSize: 13, color: "#92400e", lineHeight: 18 },

  // Chip thông tin chữ
  infoChip: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
    marginBottom: 12,
  },
  infoKanji:   { fontSize: 20, fontWeight: "700" },
  infoHanViet: { fontSize: 13, fontWeight: "700" },
  infoDash:    { fontSize: 13 },
  infoMeaning: { flex: 1, fontSize: 13 },

  scrollArea: { maxHeight: 220, marginBottom: 14 },

  // TextInput
  textInput: {
    borderRadius: 14, borderWidth: 1.5,
    padding: 14, fontSize: 15,
    lineHeight: 22, minHeight: 160,
  },

  // Nút lưu
  saveBtn: {
    borderRadius: 14,
    paddingVertical: 14, alignItems: "center",
  },
  saveBtnText: { fontWeight: "700", fontSize: 16 },
});