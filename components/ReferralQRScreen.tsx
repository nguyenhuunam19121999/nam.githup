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
  Linking,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import firestore from "@react-native-firebase/firestore";
import { useAuth } from "../artifacts/mirai-jp/hooks/useAuth";
import remoteConfig from "@react-native-firebase/remote-config";
import { useColors, useThemeMode, ThemeFadeOverlay } from "../artifacts/mirai-jp/hooks/useColors";

interface Props {
  onClose: () => void;
}

const REWARD_CONTACT_FB_URL =
  "https://www.facebook.com/profile.php?id=61592659400404";

export default function ReferralQRScreen({ onClose }: Props) {
  const c = useColors(); // bảng màu hiện tại — tự đổi theo giờ / lựa chọn người dùng
  const { themeMode, timeOfDay } = useThemeMode();
  const isDark = themeMode === "dark" || (themeMode === "auto" && timeOfDay === "night");

  const { currentUser, firebaseUid, referralCode } = useAuth();
  const [livePoints, setLivePoints] = useState<number>(0);
  const [claiming, setClaiming] = useState(false);
  const [rewardThreshold, setRewardThreshold] = useState<number>(100);

  useEffect(() => {
    (async () => {
      try {
        await remoteConfig().setDefaults({ reward_threshold: 100 });
        await remoteConfig().fetchAndActivate();
        const value = remoteConfig().getValue("reward_threshold").asNumber();
        setRewardThreshold(value);
      } catch (err) {
        console.error("Lỗi tải cấu hình ngưỡng thưởng:", err);
      }
    })();
  }, []);

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
  const canClaim = livePoints >= rewardThreshold;

  const handleClaimReward = async () => {
    if (!firebaseUid || claiming) return;

    Alert.alert(
      "🎁 Đổi thưởng",
      `Bạn có chắc muốn đổi thưởng? Sẽ trừ ${rewardThreshold} điểm, phần dư (nếu có) vẫn được giữ nguyên.`,
      [
        { text: "Huỷ", style: "cancel" },
        {
          text: "Đổi ngay",
          onPress: async () => {
            setClaiming(true);
            try {
              const userRef = firestore().collection("users").doc(firebaseUid);

              await firestore().runTransaction(async (transaction) => {
                const doc = await transaction.get(userRef);
                const currentPoints = doc.data()?.referralPoints ?? 0;

                if (currentPoints < rewardThreshold) {
                  throw new Error("Bạn không đủ điểm để đổi thưởng.");
                }

                const newPoints = currentPoints - rewardThreshold;
                transaction.update(userRef, { referralPoints: newPoints });

                const redemptionRef = userRef.collection("redemptions").doc();
                transaction.set(redemptionRef, {
                  pointsClaimed: rewardThreshold,
                  pointsBefore: currentPoints,
                  pointsAfter: newPoints,
                  claimedAt: firestore.FieldValue.serverTimestamp(),
                });
              });

              Alert.alert(
                "🎉 Thành công",
                "Bạn đã đổi thưởng! Chụp lại màn hình này và gửi qua Facebook để nhận quà. Điểm dư (nếu có) vẫn được giữ nguyên.",
                [
                  { text: "Đóng", style: "cancel" },
                  {
                    text: "Mở Facebook",
                    onPress: () => {
                      Linking.openURL(REWARD_CONTACT_FB_URL).catch(() => {
                        Alert.alert(
                          "Lỗi",
                          "Không thể mở Facebook, vui lòng thử lại.",
                        );
                      });
                    },
                  },
                ],
              );
            } catch (error: any) {
              Alert.alert(
                "Lỗi",
                error?.message || "Không thể đổi thưởng lúc này, thử lại sau.",
              );
            } finally {
              setClaiming(false);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={c.background} />
      <View style={[styles.header, { backgroundColor: c.card, borderColor: c.accent }]}>
        <Text style={[styles.headerTitle, { color: c.text }]}>Mã Giới Thiệu Của Bạn</Text>
        <TouchableOpacity style={[styles.closeButton, { backgroundColor: c.destructive }]} onPress={onClose}>
          <Text style={[styles.closeText, { color: c.destructiveForeground }]}>Đóng ✕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={[styles.userText, { color: c.mutedForeground }]}>
          Tài khoản: <Text style={{ fontWeight: "bold", color: c.text }}>{currentUser}</Text>
        </Text>

        <Text style={[styles.hintText, { color: c.text }]}>
          Đọc mã này cho người khác để họ nhập vào và bạn được cộng điểm thưởng
        </Text>

        <View style={[styles.qrBox, { backgroundColor: c.card }]}>
          {qrValue ? (
            // QR luôn cần nền trắng + module đen để máy quét đọc được —
            // giữ nguyên bất kể theme, không đổi theo màu tối.
            <View style={{ backgroundColor: "#fff", padding: 12, borderRadius: 8 }}>
              <QRCode value={qrValue} size={180} />
            </View>
          ) : (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={c.primary} />
              <Text style={{ marginTop: 10, color: c.mutedForeground }}>
                Đang khởi tạo mã, vui lòng chờ...
              </Text>
            </View>
          )}
        </View>

        {referralCode && <Text style={[styles.codeText, { color: c.primary }]}>{referralCode}</Text>}

        {/* Hộp quà + điểm — trạng thái "sẵn sàng đổi" giữ màu vàng ấm cố
            định (không đổi theo theme) vì đây là tín hiệu ăn mừng/kêu gọi
            hành động đặc biệt, cần luôn nổi bật nhất quán. */}
        <TouchableOpacity
          style={[
            styles.giftBox,
            { backgroundColor: c.muted, borderColor: c.border },
            canClaim && styles.giftBoxReady,
          ]}
          disabled={!canClaim || claiming}
          onPress={handleClaimReward}
          activeOpacity={0.8}
        >
          <Text style={styles.giftEmoji}>{canClaim ? "🎁" : "📦"}</Text>
          <Text style={[styles.giftPoints, { color: c.text }]}>{livePoints} điểm</Text>
          {claiming ? (
            <ActivityIndicator
              size="small"
              color={c.primary}
              style={{ marginTop: 6 }}
            />
          ) : (
            <Text
              style={[
                styles.giftStatus,
                { color: c.mutedForeground },
                canClaim && styles.giftStatusReady,
              ]}
            >
              {canClaim
                ? `Chạm để đổi thưởng (${rewardThreshold} điểm)`
                : `Cần đủ ${rewardThreshold} điểm để đổi thưởng`}
            </Text>
          )}
        </TouchableOpacity>
      </View>
      <ThemeFadeOverlay />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 16, fontWeight: "bold" },
  closeButton: { padding: 6, borderRadius: 4 },
  closeText: { fontWeight: "bold", fontSize: 12 },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  userText: { fontSize: 14, marginBottom: 8 },
  hintText: {
    textAlign: "center",
    marginBottom: 20,
    fontSize: 14,
    fontWeight: "500",
  },
  qrBox: {
    width: 220,
    height: 220,
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
  },
  giftBox: {
    marginTop: 24,
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: "center",
    borderWidth: 2,
  },
  // Giữ cố định — trạng thái "đủ điểm, sẵn sàng đổi thưởng"
  giftBoxReady: {
    backgroundColor: "#fffbeb",
    borderColor: "#e1b12c",
  },
  giftEmoji: { fontSize: 40, marginBottom: 6 },
  giftPoints: { fontSize: 20, fontWeight: "900" },
  giftStatus: {
    marginTop: 6,
    fontSize: 12,
    textAlign: "center",
  },
  giftStatusReady: { color: "#b45309", fontWeight: "700" },
});