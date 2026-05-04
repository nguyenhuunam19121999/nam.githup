import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import doc1go from "../assets/data_nghanh_hoc/thuc_pham/otafftn_1go.json";
import doc2go from "../assets/data_nghanh_hoc/thuc_pham/otafftn_2go.json";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ContentItem { type: "paragraph" | "bullet"; text: string }
interface Subsection  { title: string; content: ContentItem[] }
interface Section     { title: string; content: ContentItem[]; subsections: Subsection[] }
interface Chapter     { id: string; title: string; sections: Section[]; intro?: ContentItem[] }
interface DocData     { title: string; subtitle: string; chapters: Chapter[] }

const DOCS: Record<string, DocData> = {
  "1go": doc1go as unknown as DocData,
  "2go": doc2go as unknown as DocData,
};

const ACCENT: Record<string, string> = { "1go": "#2563EB", "2go": "#7C3AED" };

// ─── Sub-components ───────────────────────────────────────────────────────────
function ContentBlock({ items }: { items: ContentItem[] }) {
  if (!items?.length) return null;
  return (
    <>
      {items.map((item, i) =>
        item.type === "bullet" ? (
          <View key={i} style={s.bulletRow}>
            <View style={s.bulletDot} />
            <Text style={s.bulletText}>{item.text}</Text>
          </View>
        ) : (
          <Text key={i} style={s.paragraph}>{item.text}</Text>
        )
      )}
    </>
  );
}

function ChapterBlock({ ch, index, accent }: { ch: Chapter; index: number; accent: string }) {
  const [open, setOpen] = useState(index === 0);
  const anim = useRef(new Animated.Value(index === 0 ? 1 : 0)).current;

  function toggle() {
    const to = open ? 0 : 1;
    setOpen(!open);
    Animated.timing(anim, { toValue: to, duration: 220, useNativeDriver: false }).start();
  }

  const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "90deg"] });

  return (
    <View style={s.chapterCard}>
      <TouchableOpacity style={s.chapterHeader} onPress={toggle} activeOpacity={0.7}>
        <View style={[s.chapterBadge, { backgroundColor: accent }]}>
          <Text style={s.chapterNum}>{index + 1}</Text>
        </View>
        <Text style={s.chapterTitle} numberOfLines={3}>
          {ch.title.replace(/^第\s*\d+\s*章\s*/, "")}
        </Text>
        <Animated.Text style={[s.chevron, { transform: [{ rotate }] }]}>›</Animated.Text>
      </TouchableOpacity>

      {open && (
        <View style={s.chapterBody}>
          {ch.intro && <ContentBlock items={ch.intro} />}
          {ch.sections?.map((sec, si) => (
            <View key={si} style={s.sectionWrap}>
              <Text style={[s.sectionTitle, { color: accent }]}>{sec.title}</Text>
              <ContentBlock items={sec.content} />
              {sec.subsections?.map((sub, ssi) => (
                <View key={ssi} style={s.subsectionWrap}>
                  <Text style={s.subsectionTitle}>{sub.title}</Text>
                  <ContentBlock items={sub.content} />
                </View>
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function OTAFFtnViewerScreen() {
  const router = useRouter();
  const { docId } = useLocalSearchParams<{ docId?: string }>();
  const id = docId === "2go" ? "2go" : "1go";
  const doc = DOCS[id];
  const accent = ACCENT[id];

  return (
    <View style={s.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[s.header, { backgroundColor: accent }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backArrow}>‹</Text>
        </TouchableOpacity>
        <View style={s.titleWrap}>
          <Text style={s.titleMain} numberOfLines={1}>
            {id === "1go" ? "特定技能１号" : "特定技能２号"}
          </Text>
          <Text style={s.titleSub} numberOfLines={1}>{doc.subtitle}</Text>
        </View>
        <View style={[s.badgeWrap, { backgroundColor: "rgba(255,255,255,0.25)" }]}>
          <Text style={s.badgeText}>{id === "1go" ? "1号" : "2号"}</Text>
        </View>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* Cover */}
        <View style={[s.coverCard, { backgroundColor: accent }]}>
          <Text style={s.coverTitle}>{doc.title}</Text>
          <Text style={s.coverSub}>{doc.subtitle}</Text>
        </View>

        {doc.chapters.map((ch, i) => (
          <ChapterBlock key={ch.id ?? i} ch={ch} index={i} accent={accent} />
        ))}
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 52 : 16,
    paddingBottom: 12, paddingHorizontal: 12, gap: 10,
  },
  backBtn: {
    width: 36, height: 36, alignItems: "center", justifyContent: "center",
    borderRadius: 18, backgroundColor: "rgba(255,255,255,0.2)",
  },
  backArrow: { fontSize: 26, color: "#fff", lineHeight: 30, fontWeight: "300" },
  titleWrap: { flex: 1 },
  titleMain: { fontSize: 16, fontWeight: "700", color: "#fff" },
  titleSub: { fontSize: 11, color: "rgba(255,255,255,0.8)", marginTop: 1 },
  badgeWrap: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "800" },

  scroll: { flex: 1 },
  scrollContent: { padding: 14, gap: 12 },

  coverCard: { borderRadius: 14, padding: 18, marginBottom: 4 },
  coverTitle: { fontSize: 16, fontWeight: "800", color: "#fff", marginBottom: 6, lineHeight: 22 },
  coverSub: { fontSize: 12, color: "rgba(255,255,255,0.85)", lineHeight: 18 },

  chapterCard: {
    backgroundColor: "#fff", borderRadius: 14, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  chapterHeader: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  chapterBadge: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
  },
  chapterNum: { color: "#fff", fontSize: 15, fontWeight: "800" },
  chapterTitle: { flex: 1, fontSize: 14, fontWeight: "700", color: "#111827", lineHeight: 20 },
  chevron: { fontSize: 22, color: "#9CA3AF", fontWeight: "300" },

  chapterBody: { borderTopWidth: 1, borderTopColor: "#F3F4F6", padding: 14, gap: 14 },

  sectionWrap: { gap: 8 },
  sectionTitle: { fontSize: 13, fontWeight: "700", marginBottom: 2 },

  subsectionWrap: {
    marginTop: 4, paddingLeft: 12,
    borderLeftWidth: 2, borderLeftColor: "#E5E7EB", gap: 6,
  },
  subsectionTitle: { fontSize: 12, fontWeight: "700", color: "#374151", marginBottom: 2 },

  paragraph: { fontSize: 13, color: "#374151", lineHeight: 20 },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingLeft: 4 },
  bulletDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: "#9CA3AF", marginTop: 7,
  },
  bulletText: { flex: 1, fontSize: 13, color: "#374151", lineHeight: 20 },
});
