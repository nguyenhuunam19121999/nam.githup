import React, { useRef, useState } from "react";
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  visible: boolean;
  onClose: () => void;
}

type Mode = "menu" | "login" | "register";

export function AuthMenu({ visible, onClose }: Props) {
  const { currentUser, login, register, logout } = useAuth();
  const [mode, setMode] = useState<Mode>("menu");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên đăng nhập và mật khẩu.");
      return;
    }
    setLoading(true);
    const ok = await login(username.trim(), password);
    setLoading(false);
    if (ok) {
      setUsername("");
      setPassword("");
      setMode("menu");
      onClose();
    } else {
      Alert.alert("Lỗi", "Sai tên đăng nhập hoặc mật khẩu.");
    }
  };

  const handleRegister = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ thông tin.");
      return;
    }
    if (password.length < 4) {
      Alert.alert("Lỗi", "Mật khẩu phải có ít nhất 4 ký tự.");
      return;
    }
    setLoading(true);
    const ok = await register(username.trim(), password);
    setLoading(false);
    if (ok) {
      setUsername("");
      setPassword("");
      setMode("menu");
      onClose();
    } else {
      Alert.alert("Lỗi", "Tên đăng nhập đã tồn tại.");
    }
  };

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  const handleClose = () => {
    setMode("menu");
    setUsername("");
    setPassword("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={s.overlay}>
        <Pressable style={s.backdrop} onPress={handleClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={s.sheetWrapper}
        >
          <View style={s.sheet}>
            <View style={s.handle} />

            {currentUser ? (
              <ScrollView>
                <View style={s.userInfo}>
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>{currentUser.charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text style={s.userName}>{currentUser}</Text>
                  <Text style={s.userSub}>Đã đăng nhập</Text>
                </View>
                <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
                  <Text style={s.logoutText}>Đăng xuất</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : mode === "menu" ? (
              <View style={s.menuBody}>
                <Text style={s.menuTitle}>Tài khoản</Text>
                <Text style={s.menuSub}>Đăng nhập để lưu tiến độ học tập của bạn</Text>
                <TouchableOpacity style={s.primaryBtn} onPress={() => setMode("login")} activeOpacity={0.8}>
                  <Text style={s.primaryBtnText}>Đăng nhập</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.secondaryBtn} onPress={() => setMode("register")} activeOpacity={0.8}>
                  <Text style={s.secondaryBtnText}>Tạo tài khoản mới</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView keyboardShouldPersistTaps="handled">
                <Text style={s.formTitle}>
                  {mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
                </Text>
                <Text style={s.inputLabel}>Tên đăng nhập</Text>
                <TextInput
                  style={s.input}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Nhập tên đăng nhập..."
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text style={s.inputLabel}>Mật khẩu</Text>
                <TextInput
                  style={s.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Nhập mật khẩu..."
                  placeholderTextColor="#94a3b8"
                  secureTextEntry
                />
                <TouchableOpacity
                  style={[s.primaryBtn, loading && { opacity: 0.6 }]}
                  onPress={mode === "login" ? handleLogin : handleRegister}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <Text style={s.primaryBtnText}>
                    {loading ? "Đang xử lý..." : mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.backBtn} onPress={() => setMode("menu")} activeOpacity={0.7}>
                  <Text style={s.backBtnText}>← Quay lại</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  sheetWrapper: { justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    minHeight: 300,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#e2e8f0",
    alignSelf: "center",
    marginBottom: 20,
  },
  userInfo: { alignItems: "center", paddingVertical: 20 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#4ECDC4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: { color: "#fff", fontSize: 32, fontWeight: "800" },
  userName: { fontSize: 20, fontWeight: "800", color: "#0f172a" },
  userSub: { fontSize: 14, color: "#64748b", marginTop: 4 },
  logoutBtn: {
    marginTop: 20,
    backgroundColor: "#fee2e2",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  logoutText: { color: "#dc2626", fontSize: 16, fontWeight: "700" },
  menuBody: { paddingVertical: 10 },
  menuTitle: { fontSize: 22, fontWeight: "800", color: "#0f172a", marginBottom: 8 },
  menuSub: { fontSize: 14, color: "#64748b", marginBottom: 24, lineHeight: 20 },
  primaryBtn: {
    backgroundColor: "#4ECDC4",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  secondaryBtn: {
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryBtnText: { color: "#0f172a", fontSize: 16, fontWeight: "600" },
  formTitle: { fontSize: 22, fontWeight: "800", color: "#0f172a", marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: "600", color: "#475569", marginBottom: 6 },
  input: {
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#0f172a",
    marginBottom: 16,
  },
  backBtn: { paddingVertical: 12, alignItems: "center" },
  backBtnText: { color: "#64748b", fontSize: 14 },
});
