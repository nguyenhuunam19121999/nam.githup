import { useRouter } from "expo-router";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { WebView } from "react-native-webview";

const PDF_WEB_PATH = "/otafftv.pdf";

function getPdfSource() {
  if (Platform.OS === "web") {
    return { uri: PDF_WEB_PATH };
  }
  const encodedUrl = encodeURIComponent(
    `https://${process.env.EXPO_PUBLIC_DOMAIN}/otafftv.pdf`
  );
  return { uri: `https://docs.google.com/gview?embedded=true&url=${encodedUrl}` };
}

export default function OTAFFtvDocScreen() {
  const router = useRouter();

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backArrow}>‹</Text>
        </TouchableOpacity>
        <View style={s.titleWrap}>
          <Text style={s.titleMain} numberOfLines={1}>
            Tài liệu từ OTAFFtv
          </Text>
          <Text style={s.titleSub} numberOfLines={1}>
            Kỹ năng Đặc định Số 1 — Thực phẩm
          </Text>
        </View>
        <View style={s.badgeWrap}>
          <Text style={s.badge}>TV</Text>
        </View>
      </View>

      <WebView
        style={s.webview}
        source={getPdfSource()}
        originWhitelist={["*"]}
        startInLoadingState
        renderLoading={() => (
          <View style={s.loadingWrap}>
            <Text style={s.loadingText}>Đang tải tài liệu…</Text>
          </View>
        )}
      />
    </View>
  );
}

const TEAL = "#4ECDC4";
const RED = "#DC2626";

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: TEAL,
    paddingTop: Platform.OS === "ios" ? 52 : 16,
    paddingBottom: 12,
    paddingHorizontal: 12,
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  backArrow: {
    fontSize: 26,
    color: "#fff",
    lineHeight: 30,
    fontWeight: "300",
  },
  titleWrap: {
    flex: 1,
  },
  titleMain: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  titleSub: {
    fontSize: 11,
    color: "rgba(255,255,255,0.8)",
    marginTop: 1,
  },
  badgeWrap: {
    backgroundColor: RED,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badge: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },
  webview: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 8,
  },
});
