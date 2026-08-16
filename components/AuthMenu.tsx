import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Alert,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth } from "../artifacts/mirai-jp/hooks/useAuth";
import { useColors, ThemeFadeOverlay} from "../artifacts/mirai-jp/hooks/useColors";
import { ThemeSettings } from "./ThemeSettings";

const SCREEN_WIDTH = Dimensions.get("window").width;
const PANEL_WIDTH = Math.min(360, SCREEN_WIDTH * 0.88);

type Mode = "login" | "register";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function AuthMenu({ visible, onClose }: Props) {
  const c = useColors(); // bảng màu hiện tại — tự đổi theo giờ / lựa chọn người dùng
  const { currentUser, login, register, logout, deleteAccount } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setError(null);
      Animated.timing(slide, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slide, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slide]);

  const translateX = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [PANEL_WIDTH + 40, 0],
  });
  const overlayOpacity = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const reset = () => {
    setUsername("");
    setPassword("");
    setError(null);
  };

  const handleSubmit = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    const result =
      mode === "login"
        ? await login(username, password)
        : await register(username, password);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Có lỗi xảy ra");
      return;
    }
    reset();
    onClose();
  };

  const handleLogout = async () => {
    await logout();
    reset();
    onClose();
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Xoá tài khoản",
      "Toàn bộ dữ liệu tài khoản (điểm thưởng, mã giới thiệu) sẽ bị xoá vĩnh viễn và không thể khôi phục. Bạn có chắc chắn?",
      [
        { text: "Huỷ", style: "cancel" },
        {
          text: "Xoá tài khoản",
          style: "destructive",
          onPress: async () => {
            const result = await deleteAccount();
            if (!result.ok) {
              Alert.alert("Lỗi", result.error ?? "Không thể xoá tài khoản");
              return;
            }
            reset();
            onClose();
          },
        },
      ],
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={s.root}>
        <Animated.View style={[s.overlay, { opacity: overlayOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            s.panel,
            { width: PANEL_WIDTH, transform: [{ translateX }], backgroundColor: c.card },
          ]}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1 }}
          >
            <View style={[s.header, { backgroundColor: c.primary }]}>
              <Text style={[s.headerTitle, { color: c.primaryForeground }]}>
                {currentUser ? "Tài khoản" : "Chào mừng"}
              </Text>
              <TouchableOpacity
                style={[s.closeBtn, { backgroundColor: c.primaryForeground + "40" }]}
                onPress={onClose}
                hitSlop={10}
              >
                <Text style={[s.closeIcon, { color: c.primaryForeground }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={s.body}>
              {currentUser ? (
                <View>
                  <View style={s.userBlock}>
                    <View style={[s.avatarBig, { backgroundColor: c.primary }]}>
                      <Text style={[s.avatarBigText, { color: c.primaryForeground }]}>
                        {currentUser.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={[s.userBigName, { color: c.text }]} numberOfLines={1}>
                      {currentUser}
                    </Text>
                    <Text style={[s.userMeta, { color: c.mutedForeground }]}>Đã đăng nhập</Text>
                  </View>

                  {/* ── Cài đặt giao diện Sáng / Tối / Tự động ─────────── */}
                  <ThemeSettings />

                  <TouchableOpacity
                    style={[s.primaryBtn, { backgroundColor: c.primary, marginTop: 20 }]}
                    onPress={handleLogout}
                  >
                    <Text style={[s.primaryBtnText, { color: c.primaryForeground }]}>Đăng xuất</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.deleteBtn}
                    onPress={handleDeleteAccount}
                  >
                    <Text style={s.deleteBtnText}>Xoá tài khoản</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  {/* ── Cài đặt giao diện cũng hiện cả khi chưa đăng nhập ── */}
                  <ThemeSettings />

                  <View style={[s.tabRow, { backgroundColor: c.muted, marginTop: 20 }]}>
                    <TouchableOpacity
                      style={[s.tabBtn, mode === "login" && { backgroundColor: c.card }]}
                      onPress={() => {
                        setMode("login");
                        setError(null);
                      }}
                    >
                      <Text
                        style={[
                          s.tabText,
                          { color: mode === "login" ? c.primary : c.mutedForeground },
                          mode === "login" && { fontWeight: "800" },
                        ]}
                      >
                        Đăng nhập
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.tabBtn, mode === "register" && { backgroundColor: c.card }]}
                      onPress={() => {
                        setMode("register");
                        setError(null);
                      }}
                    >
                      <Text
                        style={[
                          s.tabText,
                          { color: mode === "register" ? c.primary : c.mutedForeground },
                          mode === "register" && { fontWeight: "800" },
                        ]}
                      >
                        Đăng ký
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={[s.fieldLabel, { color: c.text }]}>Tên đăng nhập</Text>
                  <TextInput
                    style={[s.input, { backgroundColor: c.muted, borderColor: c.border, color: c.text }]}
                    value={username}
                    onChangeText={setUsername}
                    placeholder="Nhập tên đăng nhập"
                    placeholderTextColor={c.mutedForeground}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />

                  <Text style={[s.fieldLabel, { color: c.text }]}>Mật khẩu (tối đa 8 ký tự)</Text>
                  <TextInput
                    style={[s.input, { backgroundColor: c.muted, borderColor: c.border, color: c.text }]}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Nhập mật khẩu"
                    placeholderTextColor={c.mutedForeground}
                    secureTextEntry
                    maxLength={8}
                  />

                  {error && <Text style={s.errorText}>{error}</Text>}

                  <TouchableOpacity
                    style={[s.primaryBtn, { backgroundColor: c.primary }, loading && { opacity: 0.7 }]}
                    onPress={handleSubmit}
                    disabled={loading}
                  >
                    <Text style={[s.primaryBtnText, { color: c.primaryForeground }]}>
                      {mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
                    </Text>
                  </TouchableOpacity>

                  <Text style={[s.hint, { color: c.mutedForeground }]}>
                    Tài khoản được lưu cục bộ trên thiết bị của bạn.
                  </Text>
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
          <ThemeFadeOverlay />
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, flexDirection: "row" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,23,42,0.45)",
  },
  panel: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: -4, height: 0 },
    elevation: 12,
  },
  header: {
    paddingTop: Platform.OS === "ios" ? 56 : 28,
    paddingBottom: 18,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 20, fontWeight: "800" },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  closeIcon: { fontSize: 14, fontWeight: "800" },
  body: { padding: 20, flex: 1 },
  tabRow: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
    marginBottom: 18,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  tabText: { fontSize: 14, fontWeight: "600" },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
    marginTop: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 6,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 13,
    marginTop: 8,
    fontWeight: "600",
  },
  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 14,
  },
  primaryBtnText: { fontWeight: "800", fontSize: 15 },
  deleteBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#dc2626",
  },
  deleteBtnText: { color: "#dc2626", fontWeight: "800", fontSize: 15 },
  hint: {
    fontSize: 12,
    marginTop: 14,
    textAlign: "center",
  },
  userBlock: { alignItems: "center", marginBottom: 24 },
  avatarBig: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarBigText: { fontSize: 28, fontWeight: "800" },
  userBigName: { fontSize: 20, fontWeight: "800" },
  userMeta: { fontSize: 13, marginTop: 4 },
});