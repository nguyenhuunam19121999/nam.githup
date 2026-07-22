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

interface ReferralScreenProps {
  currentUser: string;
  scopedKey: (key: string) => string;
  onClose: () => void;
}

export default function ReferralScreen({ currentUser, scopedKey, onClose }: ReferralScreenProps) {
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

      const deviceRef = firestore().collection("activated_devices").doc(myDeviceId);
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

      await deviceRef.set({
        referrerUid,
        scannedBy: currentUser,
        scannedAt: firestore.FieldValue.serverTimestamp(),
      });

      await Keychain.setGenericPassword("referral_used", "true", {
        service: "com.miraiapp.referral",
      });

      await firestore().collection("users").doc(referrerUid).update({
        referralPoints: firestore.FieldValue.increment(1),
      });

      const newPoints = localPoints + 1;
      await AsyncStorage.setItem(scopedKey("points"), newPoints.toString());
      setLocalPoints(newPoints);

      Alert.alert("Thành công", "Bạn đã nhập mã và người giới thiệu được cộng 1 điểm thưởng!");
      onClose();
    } catch (error) {
      Alert.alert("Lỗi kết nối", "Không thể kết nối đến Firestore. Vui lòng kiểm tra mạng Internet.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f0f4f8" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Hệ Thống Nhận Điểm Thưởng</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeText}>Đóng ✕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.userText}>Tài khoản: <Text style={{fontWeight: 'bold'}}>{currentUser}</Text></Text>
        <Text style={styles.pointsText}>Điểm tích lũy: <Text style={styles.pointNum}>{localPoints}</Text></Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.hintText}>Nhập mã giới thiệu của người khác</Text>

        <View style={styles.manualCard}>
          <TextInput
            style={styles.manualInput}
            placeholder="Nhập mã giới thiệu (VD: A3K9XZ)"
            placeholderTextColor="#94a3b8"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
            value={manualCode}
            onChangeText={setManualCode}
            editable={!loading}
          />
          <TouchableOpacity
            style={styles.manualSubmitBtn}
            disabled={loading}
            onPress={() => processReferralCode(manualCode)}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.manualSubmitText}>Xác nhận</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f6fa" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderColor: "#e1b12c" },
  headerTitle: { fontSize: 16, fontWeight: "bold", color: "#2f3640" },
  closeButton: { padding: 6, backgroundColor: "#e74c3c", borderRadius: 4 },
  closeText: { color: "#fff", fontWeight: "bold", fontSize: 12 },
  infoBox: { padding: 16, backgroundColor: "#fff", margin: 16, borderRadius: 8, elevation: 2 },
  userText: { fontSize: 14, color: "#7f8c8d" },
  pointsText: { fontSize: 16, marginTop: 4, color: "#2c3e50" },
  pointNum: { fontSize: 24, fontWeight: "bold", color: "#4cd137" },
  content: { flex: 1, alignItems: "center", paddingHorizontal: 16, paddingTop: 40 },
  hintText: { textAlign: "center", marginBottom: 20, color: "#353b48", fontSize: 15, fontWeight: "500" },
  manualCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    elevation: 2,
  },
  manualInput: {
    height: 52,
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 14,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 3,
    color: "#0f172a",
    textAlign: "center",
    marginBottom: 14,
  },
  manualSubmitBtn: {
    backgroundColor: "#004370",
    borderRadius: 10,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  manualSubmitText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});