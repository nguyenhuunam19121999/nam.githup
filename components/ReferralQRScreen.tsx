import React, { useEffect, useState } from "react";
import {
  View,
  StatusBar,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import firestore from "@react-native-firebase/firestore";
import { useAuth } from "../artifacts/mirai-jp/hooks/useAuth";

interface Props {
  onClose: () => void;
}

export default function ReferralQRScreen({ onClose }: Props) {
  const { currentUser, firebaseUid, referralCode } = useAuth();
  const [livePoints, setLivePoints] = useState<number>(0);

  // Lắng nghe realtime điểm số — chỉ hoạt động khi màn hình này đang mở,
  // tự hủy khi đóng màn hình nên không tốn tài nguyên nền
  useEffect(() => {
    if (!firebaseUid) return;
    const unsubscribe = firestore()
      .collection("users")
      .doc(firebaseUid)
      .onSnapshot((doc) => {
        const points = doc.data()?.referralPoints;
        if (typeof points === "number") setLivePoints(points);
      });
    return unsubscribe;
  }, [firebaseUid]);

  const qrValue = referralCode ? `PUBLICAPP-REF|${referralCode}` : null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f0f4f8" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mã Giới Thiệu Của Bạn</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeText}>Đóng ✕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.userText}>
          Tài khoản: <Text style={{ fontWeight: "bold" }}>{currentUser}</Text>
        </Text>

        <Text style={styles.hintText}>
          Đưa mã QR này cho người khác quét, hoặc đọc mã cho họ nhập tay nếu ở xa
        </Text>

        <View style={styles.qrBox}>
          {qrValue ? (
            <QRCode value={qrValue} size={220} />
          ) : (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#004370" />
              <Text style={{ marginTop: 10, color: "#64748b" }}>
                Đang khởi tạo mã, vui lòng chờ...
              </Text>
            </View>
          )}
        </View>

        {referralCode && (
          <Text style={styles.codeText}>{referralCode}</Text>
        )}

        <Text style={styles.pointsText}>
          Điểm hiện có: <Text style={styles.pointNum}>{livePoints}</Text>
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f6fa" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#e1b12c",
  },
  headerTitle: { fontSize: 16, fontWeight: "bold", color: "#2f3640" },
  closeButton: { padding: 6, backgroundColor: "#e74c3c", borderRadius: 4 },
  closeText: { color: "#fff", fontWeight: "bold", fontSize: 12 },
  content: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  userText: { fontSize: 14, color: "#7f8c8d", marginBottom: 8 },
  hintText: {
    textAlign: "center",
    marginBottom: 24,
    color: "#353b48",
    fontSize: 14,
    fontWeight: "500",
  },
  qrBox: {
    width: 260,
    height: 260,
    backgroundColor: "#fff",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  loadingBox: { alignItems: "center" },
  codeText: {
    marginTop: 20,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 4,
    color: "#004370",
  },
  pointsText: { marginTop: 16, fontSize: 14, color: "#64748b" },
  pointNum: { fontSize: 18, fontWeight: "bold", color: "#4cd137" },
});