import React, { useState, useEffect } from "react";
import {
  View,
  StatusBar,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  TextInput,
} from "react-native";
import DeviceInfo from "react-native-device-info";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Keychain from "react-native-keychain";
import firestore from "@react-native-firebase/firestore";
import { useAuth } from "../artifacts/mirai-jp/hooks/useAuth";
import { useColors, useThemeMode, ThemeFadeOverlay } from "../artifacts/mirai-jp/hooks/useColors";

interface ReferralScreenProps {
  currentUser: string;
  scopedKey: (key: string) => string;
  onClose: () => void;
}

export default function ReferralScreen({
  currentUser,
  scopedKey,
  onClose,
}: ReferralScreenProps) {
  const c = useColors(); // bảng màu hiện tại — tự đổi theo giờ / lựa chọn người dùng
  const { themeMode, timeOfDay } = useThemeMode();
  const isDark = themeMode === "dark" || (themeMode === "auto" && timeOfDay === "night");

  const { referralCode: myOwnCode } = useAuth();
  const [loading, setLoading] = useState(false);
  const [localPoints, setLocalPoints] = useState(0);
  const [manualCode, setManualCode] = useState("");

  const myDeviceId = DeviceInfo.getUniqueIdSync();

  useEffect(() => {
    (async () => {
      const savedPoints = await AsyncStorage.getItem(scopedKey("points"));
      if (savedPoints) {
        setLocalPoints(parseInt(savedPoints, 10));
      }
    })();
  }, [scopedKey]);

  const processReferralCode = async (code: string) => {
    if (loading) return;

    const cleanCode = code.trim().toUpperCase();

    if (!cleanCode) {
      Alert.alert("Lỗi", "Vui lòng nhập mã giới thiệu.");
      return;
    }

    if (myOwnCode && cleanCode === myOwnCode) {
      Alert.alert("Lỗi", "Bạn không thể tự giới thiệu chính mình.");
      return;
    }

    setLoading(true);

    try {
      const keychainCheck = await Keychain.getGenericPassword({
        service: "com.miraiapp.referral",
      });

      if (keychainCheck) {
        Alert.alert("Từ chối", "Thiết bị này đã dùng rồi, từ chối cộng điểm!");
        setLoading(false);
        return;
      }

      const deviceRef = firestore()
        .collection("activated_devices")
        .doc(myDeviceId);
      const deviceDoc = await deviceRef.get();

      if (deviceDoc.exists()) {
        Alert.alert("Từ chối", "Thiết bị này đã dùng rồi, từ chối cộng điểm!");
        setLoading(false);
        return;
      }

      const querySnapshot = await firestore()
        .collection("users")
        .where("referralCode", "==", cleanCode)
        .limit(1)
        .get();

      if (querySnapshot.empty) {
        Alert.alert("Lỗi", "Mã giới thiệu không tồn tại.");
        setLoading(false);
        return;
      }

      const referrerUid = querySnapshot.docs[0].id;
      const referrerRef = firestore().collection("users").doc(referrerUid);

      try {
        await firestore().runTransaction(async (transaction) => {
          const referrerDoc = await transaction.get(referrerRef);
          const alreadyClaimed = referrerDoc.data()?.codeClaimed === true;

          if (alreadyClaimed) {
            throw new Error("CODE_ALREADY_CLAIMED");
          }

          transaction.update(referrerRef, {
            referralPoints: firestore.FieldValue.increment(1),
            codeClaimed: true,
          });
        });
      } catch (err: any) {
        if (err.message === "CODE_ALREADY_CLAIMED") {
          Alert.alert(
            "Từ chối",
            "Mã giới thiệu này đã được dùng để nhận thưởng rồi, không thể dùng lại lần nữa.",
          );
        } else {
          Alert.alert(
            "Lỗi kết nối",
            "Không thể kết nối đến Firestore. Vui lòng kiểm tra mạng Internet.",
          );
        }
        setLoading(false);
        return;
      }

      await deviceRef.set({
        referrerUid,
        scannedBy: currentUser,
        scannedAt: firestore.FieldValue.serverTimestamp(),
      });

      await Keychain.setGenericPassword("referral_used", "true", {
        service: "com.miraiapp.referral",
      });

      const newPoints = localPoints + 1;
      await AsyncStorage.setItem(scopedKey("points"), newPoints.toString());
      setLocalPoints(newPoints);

      Alert.alert(
        "Thành công",
        "Bạn đã nhập mã và người giới thiệu được cộng 1 điểm thưởng!",
      );
      onClose();
    } catch (error) {
      Alert.alert(
        "Lỗi kết nối",
        "Không thể kết nối đến Firestore. Vui lòng kiểm tra mạng Internet.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={c.background} />
      <View style={[styles.header, { backgroundColor: c.card, borderColor: c.accent }]}>
        <Text style={[styles.headerTitle, { color: c.text }]}>Hệ Thống Nhận Điểm Thưởng</Text>
        <TouchableOpacity style={[styles.closeButton, { backgroundColor: c.destructive }]} onPress={onClose}>
          <Text style={[styles.closeText, { color: c.destructiveForeground }]}>Đóng ✕</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.infoBox, { backgroundColor: c.card }]}>
        <Text style={[styles.userText, { color: c.mutedForeground }]}>
          Tài khoản: <Text style={{ fontWeight: "bold", color: c.text }}>{currentUser}</Text>
        </Text>
        <Text style={[styles.pointsText, { color: c.text }]}>
          Điểm tích lũy: <Text style={[styles.pointNum, { color: c.accent }]}>{localPoints}</Text>
        </Text>
      </View>

      <View style={styles.content}>
        <Text style={[styles.hintText, { color: c.text }]}>Nhập mã giới thiệu của người khác</Text>

        <View style={[styles.manualCard, { backgroundColor: c.card }]}>
          <TextInput
            style={[styles.manualInput, { backgroundColor: c.muted, borderColor: c.border, color: c.text }]}
            placeholder="Nhập mã giới thiệu (VD: A1B2C3)"
            placeholderTextColor={c.mutedForeground}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
            value={manualCode}
            onChangeText={setManualCode}
            editable={!loading}
          />
          <TouchableOpacity
            style={[styles.manualSubmitBtn, { backgroundColor: c.primary }]}
            disabled={loading}
            onPress={() => processReferralCode(manualCode)}
          >
            {loading ? (
              <ActivityIndicator size="small" color={c.primaryForeground} />
            ) : (
              <Text style={[styles.manualSubmitText, { color: c.primaryForeground }]}>Xác nhận</Text>
            )}
          </TouchableOpacity>
        </View>
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
  infoBox: {
    padding: 16,
    margin: 16,
    borderRadius: 8,
    elevation: 2,
  },
  userText: { fontSize: 14 },
  pointsText: { fontSize: 16, marginTop: 4 },
  pointNum: { fontSize: 24, fontWeight: "bold" },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 40,
  },
  hintText: {
    textAlign: "center",
    marginBottom: 20,
    fontSize: 15,
    fontWeight: "500",
  },
  manualCard: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    borderRadius: 16,
    padding: 20,
    elevation: 2,
  },
  manualInput: {
    height: 52,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 3,
    textAlign: "center",
    marginBottom: 14,
  },
  manualSubmitBtn: {
    borderRadius: 10,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  manualSubmitText: { fontWeight: "800", fontSize: 15 },
});