import React, { useEffect, useState } from "react";
import {
  View,
  StatusBar,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import firestore from "@react-native-firebase/firestore";
import { useAuth } from "../artifacts/mirai-jp/hooks/useAuth";

// 👇 Số điểm cần để đổi 1 lần thưởng — đổi số này nếu bạn muốn ngưỡng khác
const REWARD_THRESHOLD = 100;

interface Props {
  onClose: () => void;
}

export default function ReferralQRScreen({ onClose }: Props) {
  const { currentUser, firebaseUid, referralCode } = useAuth();
  const [livePoints, setLivePoints] = useState<number>(0);
  const [claiming, setClaiming] = useState(false);

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
  const canClaim = livePoints >= REWARD_THRESHOLD;

  const handleClaimReward = async () => {
    if (!firebaseUid || claiming) return;

    Alert.alert(
      "🎁 Đổi thưởng",
      `Bạn có chắc muốn đổi thưởng? Sẽ trừ ${REWARD_THRESHOLD} điểm, phần dư (nếu có) vẫn được giữ nguyên.`,
      [
        { text: "Huỷ", style: "cancel" },
        {
          text: "Đổi ngay",
          onPress: async () => {
            setClaiming(true);
            try {
              const userRef = firestore().collection("users").doc(firebaseUid);

              // Dùng transaction để đảm bảo an toàn: đọc điểm mới nhất và trừ
              // đúng lúc, tránh trường hợp 2 người quét mã cùng lúc gây sai số.
              await firestore().runTransaction(async (transaction) => {
                const doc = await transaction.get(userRef);
                const currentPoints = doc.data()?.referralPoints ?? 0;

                if (currentPoints < REWARD_THRESHOLD) {
                  throw new Error("Bạn không đủ điểm để đổi thưởng.");
                }

                const newPoints = currentPoints - REWARD_THRESHOLD;
                transaction.update(userRef, { referralPoints: newPoints });

                // Ghi lại lịch sử đổi thưởng — để đối chiếu sau này nếu cần
                const redemptionRef = userRef.collection("redemptions").doc();
                transaction.set(redemptionRef, {
                  pointsClaimed: REWARD_THRESHOLD,
                  pointsBefore: currentPoints,
                  pointsAfter: newPoints,
                  claimedAt: firestore.FieldValue.serverTimestamp(),
                });
              });

              Alert.alert("🎉 Thành công", "Bạn đã đổi thưởng! Điểm dư (nếu có) vẫn được giữ nguyên.");
            } catch (error: any) {
              Alert.alert("Lỗi", error?.message || "Không thể đổi thưởng lúc này, thử lại sau.");
            } finally {
              setClaiming(false);
            }
          },
        },
      ]
    );
  };

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
          Đọc mã này cho người khác để họ nhập vào và bạn được cộng điểm thưởng
        </Text>

        <View style={styles.qrBox}>
          {qrValue ? (
            <QRCode value={qrValue} size={180} />
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

        {/* Hộp quà + điểm */}
        <TouchableOpacity
          style={[styles.giftBox, canClaim && styles.giftBoxReady]}
          disabled={!canClaim || claiming}
          onPress={handleClaimReward}
          activeOpacity={0.8}
        >
          <Text style={styles.giftEmoji}>{canClaim ? "🎁" : "📦"}</Text>
          <Text style={styles.giftPoints}>{livePoints} điểm</Text>
          {claiming ? (
            <ActivityIndicator size="small" color="#004370" style={{ marginTop: 6 }} />
          ) : (
            <Text style={[styles.giftStatus, canClaim && styles.giftStatusReady]}>
              {canClaim ? `Chạm để đổi thưởng (${REWARD_THRESHOLD} điểm)` : `Cần đủ ${REWARD_THRESHOLD} điểm để đổi thưởng`}
            </Text>
          )}
        </TouchableOpacity>
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
    marginBottom: 20,
    color: "#353b48",
    fontSize: 14,
    fontWeight: "500",
  },
  qrBox: {
    width: 220,
    height: 220,
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
    marginTop: 16,
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 4,
    color: "#004370",
  },
  giftBox: {
    marginTop: 24,
    width: "100%",
    backgroundColor: "#f1f5f9",
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e2e8f0",
  },
  giftBoxReady: {
    backgroundColor: "#fffbeb",
    borderColor: "#e1b12c",
  },
  giftEmoji: { fontSize: 40, marginBottom: 6 },
  giftPoints: { fontSize: 20, fontWeight: "900", color: "#0f172a" },
  giftStatus: { marginTop: 6, fontSize: 12, color: "#94a3b8", textAlign: "center" },
  giftStatusReady: { color: "#b45309", fontWeight: "700" },
});