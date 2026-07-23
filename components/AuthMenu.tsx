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

// ✅ MÀU CHỦ ĐẠO MỚI
const TEAL = "#004370";
// const TEAL = "#1F6F7A";
const TEAL_DARK = "#004370";
const GRAD = [TEAL, TEAL_DARK] as const;
const SCREEN_WIDTH = Dimensions.get("window").width;
const PANEL_WIDTH = Math.min(360, SCREEN_WIDTH * 0.88);

type Mode = "login" | "register";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function AuthMenu({ visible, onClose }: Props) {
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
            { width: PANEL_WIDTH, transform: [{ translateX }] },
          ]}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1 }}
          >
            <View style={s.header}>
              <Text style={s.headerTitle}>
                {currentUser ? "Tài khoản" : "Chào mừng"}
              </Text>
              <TouchableOpacity
                style={s.closeBtn}
                onPress={onClose}
                hitSlop={10}
              >
                <Text style={s.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={s.body}>
              {currentUser ? (
                <View>
                  <View style={s.userBlock}>
                    <View style={s.avatarBig}>
                      <Text style={s.avatarBigText}>
                        {currentUser.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={s.userBigName} numberOfLines={1}>
                      {currentUser}
                    </Text>
                    <Text style={s.userMeta}>Đã đăng nhập</Text>
                  </View>
                  <TouchableOpacity
                    style={s.primaryBtn}
                    onPress={handleLogout}
                  >
                    <Text style={s.primaryBtnText}>Đăng xuất</Text>
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
                  <View style={s.tabRow}>
                    <TouchableOpacity
                      style={[s.tabBtn, mode === "login" && s.tabBtnActive]}
                      onPress={() => {
                        setMode("login");
                        setError(null);
                      }}
                    >
                      <Text
                        style={[
                          s.tabText,
                          mode === "login" && s.tabTextActive,
                        ]}
                      >
                        Đăng nhập
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.tabBtn, mode === "register" && s.tabBtnActive]}
                      onPress={() => {
                        setMode("register");
                        setError(null);
                      }}
                    >
                      <Text
                        style={[
                          s.tabText,
                          mode === "register" && s.tabTextActive,
                        ]}
                      >
                        Đăng ký
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={s.fieldLabel}>Tên đăng nhập</Text>
                  <TextInput
                    style={s.input}
                    value={username}
                    onChangeText={setUsername}
                    placeholder="Nhập tên đăng nhập"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />

                  <Text style={s.fieldLabel}>Mật khẩu (tối đa 8 ký tự)</Text>
                    <TextInput
                      style={s.input}
                      value={password}
                      onChangeText={setPassword}
                      placeholder="Nhập mật khẩu"
                      placeholderTextColor="#94a3b8"
                      secureTextEntry
                      maxLength={8}
                    />

                  {error && <Text style={s.errorText}>{error}</Text>}

                  <TouchableOpacity
                    style={[s.primaryBtn, loading && { opacity: 0.7 }]}
                    onPress={handleSubmit}
                    disabled={loading}
                  >
                    <Text style={s.primaryBtnText}>
                      {mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
                    </Text>
                  </TouchableOpacity>

                  <Text style={s.hint}>
                    Tài khoản được lưu cục bộ trên thiết bị của bạn.
                  </Text>
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
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
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: -4, height: 0 },
    elevation: 12,
  },
  header: {
    backgroundColor: TEAL,
    paddingTop: Platform.OS === "ios" ? 56 : 28,
    paddingBottom: 18,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "800" },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeIcon: { color: "#fff", fontSize: 14, fontWeight: "800" },
  body: { padding: 20, flex: 1 },
  tabRow: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
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
  tabBtnActive: { backgroundColor: "#fff" },
  tabText: { fontSize: 14, fontWeight: "600", color: "#64748b" },
  tabTextActive: { color: TEAL_DARK, fontWeight: "800" },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
    marginTop: 6,
  },
  input: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#0f172a",
    marginBottom: 6,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 13,
    marginTop: 8,
    fontWeight: "600",
  },
  primaryBtn: {
    backgroundColor: TEAL,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 14,
  },
  primaryBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
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
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 14,
    textAlign: "center",
  },
  userBlock: { alignItems: "center", marginBottom: 24 },
  avatarBig: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: TEAL,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarBigText: { color: "#fff", fontSize: 28, fontWeight: "800" },
  userBigName: { fontSize: 20, fontWeight: "800", color: "#0f172a" },
  userMeta: { color: "#64748b", fontSize: 13, marginTop: 4 },
});
