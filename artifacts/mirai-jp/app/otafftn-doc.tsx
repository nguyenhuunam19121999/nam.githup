import { Stack, useRouter } from "expo-router";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const TEAL = "#4ECDC4";

const OPTIONS = [
  {
    id: "1go",
    kanji: "特定技能１号",
    kana: "とくていぎのう いちごう",
    sub: "基本的な知識・技能",
    color: "#2563EB",
    badge: "1号",
    emoji: "①",
    route: "/otafftn-viewer",
  },
  {
    id: "2go",
    kanji: "特定技能２号",
    kana: "とくていぎのう にごう",
    sub: "職長レベルの知識・技能",
    color: "#7C3AED",
    badge: "2号",
    emoji: "②",
    route: "/otafftn-viewer",
  },
];

export default function OTAFFtnDocScreen() {
  const router = useRouter();

  return (
    <View style={s.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backArrow}>‹</Text>
        </TouchableOpacity>
        <View style={s.titleWrap}>
          <Text style={s.titleMain}>Tài liệu từ OTAFFtn</Text>
          <Text style={s.titleSub}>Chọn cấp độ kỹ năng đặc định</Text>
        </View>
        <View style={s.badgeWrap}>
          <Text style={s.badge}>TN</Text>
        </View>
      </View>

      {/* Selection cards */}
      <View style={s.body}>
        <Text style={s.prompt}>Hãy chọn tài liệu bạn muốn học:</Text>

        {OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.id}
            style={[s.card, { borderLeftColor: opt.color }]}
            activeOpacity={0.85}
            onPress={() =>
              router.push({ pathname: "/otafftn-viewer", params: { docId: opt.id } })
            }
          >
            <View style={[s.cardBadge, { backgroundColor: opt.color }]}>
              <Text style={s.cardBadgeText}>{opt.badge}</Text>
            </View>
            <View style={s.cardBody}>
              <Text style={s.cardKanji}>{opt.kanji}</Text>
              <Text style={s.cardKana}>{opt.kana}</Text>
              <Text style={s.cardSub}>{opt.sub}</Text>
            </View>
            <Text style={[s.cardArrow, { color: opt.color }]}>›</Text>
          </TouchableOpacity>
        ))}

        <View style={s.note}>
          <Text style={s.noteText}>
            💡 特定技能１号 là cấp cơ bản. 特定技能２号 yêu cầu đã nắm vững 1号 và có kỹ năng giám sát (職長).
          </Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
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
    width: 36, height: 36,
    alignItems: "center", justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  backArrow: { fontSize: 26, color: "#fff", lineHeight: 30, fontWeight: "300" },
  titleWrap: { flex: 1 },
  titleMain: { fontSize: 16, fontWeight: "700", color: "#fff" },
  titleSub: { fontSize: 11, color: "rgba(255,255,255,0.8)", marginTop: 1 },
  badgeWrap: {
    backgroundColor: "#DC2626", borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  badge: { color: "#fff", fontSize: 12, fontWeight: "800" },

  body: { flex: 1, padding: 16, gap: 14 },
  prompt: { fontSize: 14, color: "#6B7280", marginBottom: 4 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderLeftWidth: 5,
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  cardBadge: {
    width: 48, height: 48,
    borderRadius: 24,
    alignItems: "center", justifyContent: "center",
  },
  cardBadgeText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  cardBody: { flex: 1, gap: 2 },
  cardKanji: { fontSize: 16, fontWeight: "800", color: "#111827" },
  cardKana: { fontSize: 11, color: "#9CA3AF" },
  cardSub: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  cardArrow: { fontSize: 28, fontWeight: "300" },

  note: {
    backgroundColor: "#FEF9C3",
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  noteText: { fontSize: 12, color: "#713F12", lineHeight: 18 },
});
