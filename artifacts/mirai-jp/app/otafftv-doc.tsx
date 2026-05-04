import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import docData from "../assets/data_nghanh_hoc/thuc_pham/otafftv.json";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ContentItem {
  type: "paragraph" | "bullet";
  text: string;
}
interface Subsection {
  title: string;
  content: ContentItem[];
}
interface Section {
  title: string;
  content: ContentItem[];
  subsections: Subsection[];
}
interface Chapter {
  id: string;
  title: string;
  sections: Section[];
}
interface DocData {
  title: string;
  subtitle: string;
  version: string;
  publisher: string;
  chapters: Chapter[];
}

const doc = docData as DocData;

// ─── Sub-components ───────────────────────────────────────────────────────────
function ContentBlock({ items }: { items: ContentItem[] }) {
  return (
    <>
      {items.map((item, i) =>
        item.type === "bullet" ? (
          <View key={i} style={s.bulletRow}>
            <View style={s.bulletDot} />
            <Text style={s.bulletText}>{item.text}</Text>
          </View>
        ) : (
          <Text key={i} style={s.paragraph}>
            {item.text}
          </Text>
        )
      )}
    </>
  );
}

function SubsectionBlock({ sub }: { sub: Subsection }) {
  return (
    <View style={s.subsectionWrap}>
      <Text style={s.subsectionTitle}>{sub.title}</Text>
      <ContentBlock items={sub.content} />
    </View>
  );
}

function ChapterBlock({ ch, index }: { ch: Chapter; index: number }) {
  const [open, setOpen] = useState(index === 0);
  const anim = useRef(new Animated.Value(index === 0 ? 1 : 0)).current;

  function toggle() {
    const toVal = open ? 0 : 1;
    setOpen(!open);
    Animated.timing(anim, {
      toValue: toVal,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }

  const rotate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "90deg"],
  });

  return (
    <View style={s.chapterCard}>
      <TouchableOpacity style={s.chapterHeader} onPress={toggle} activeOpacity={0.7}>
        <View style={s.chapterNumBadge}>
          <Text style={s.chapterNum}>{index + 1}</Text>
        </View>
        <Text style={s.chapterTitle} numberOfLines={3}>
          {ch.title.replace(/^Chương\s+\d+[:：]\s*/, "")}
        </Text>
        <Animated.Text style={[s.chevron, { transform: [{ rotate }] }]}>›</Animated.Text>
      </TouchableOpacity>

      {open && (
        <View style={s.chapterBody}>
          {ch.sections.map((sec, si) => (
            <View key={si} style={s.sectionWrap}>
              <Text style={s.sectionTitle}>{sec.title}</Text>
              <ContentBlock items={sec.content} />
              {(sec.subsections ?? []).map((sub, ssi) => (
                <SubsectionBlock key={ssi} sub={sub} />
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function OTAFFtvDocScreen() {
  const router = useRouter();

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backArrow}>‹</Text>
        </TouchableOpacity>
        <View style={s.titleWrap}>
          <Text style={s.titleMain} numberOfLines={1}>
            Tài liệu từ OTAFFtv
          </Text>
          <Text style={s.titleSub} numberOfLines={1}>
            {doc.subtitle}
          </Text>
        </View>
        <View style={s.badgeWrap}>
          <Text style={s.badge}>TV</Text>
        </View>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Cover card */}
        <View style={s.coverCard}>
          <Text style={s.coverTitle}>{doc.title}</Text>
          <Text style={s.coverVersion}>{doc.version}</Text>
          <Text style={s.coverPublisher}>{doc.publisher}</Text>
        </View>

        {/* Chapters */}
        {doc.chapters.map((ch, i) => (
          <ChapterBlock key={ch.id} ch={ch} index={i} />
        ))}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const TEAL = "#4ECDC4";
const RED = "#DC2626";

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },

  // Header
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
    backgroundColor: RED, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  badge: { color: "#fff", fontSize: 12, fontWeight: "800" },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { padding: 14, gap: 12 },

  // Cover card
  coverCard: {
    backgroundColor: RED,
    borderRadius: 14,
    padding: 18,
    marginBottom: 4,
  },
  coverTitle: { fontSize: 16, fontWeight: "800", color: "#fff", marginBottom: 8, lineHeight: 22 },
  coverVersion: { fontSize: 12, color: "rgba(255,255,255,0.85)", marginBottom: 4 },
  coverPublisher: { fontSize: 11, color: "rgba(255,255,255,0.7)", lineHeight: 16 },

  // Chapter card
  chapterCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  chapterHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  chapterNumBadge: {
    width: 32, height: 32,
    borderRadius: 16,
    backgroundColor: TEAL,
    alignItems: "center", justifyContent: "center",
  },
  chapterNum: { color: "#fff", fontSize: 15, fontWeight: "800" },
  chapterTitle: { flex: 1, fontSize: 14, fontWeight: "700", color: "#111827", lineHeight: 20 },
  chevron: { fontSize: 22, color: "#9CA3AF", fontWeight: "300" },

  chapterBody: {
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    padding: 14,
    paddingTop: 12,
    gap: 16,
  },

  // Section
  sectionWrap: { gap: 8 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: RED,
    marginBottom: 2,
  },

  // Subsection
  subsectionWrap: {
    marginTop: 4,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: "#FCA5A5",
    gap: 6,
  },
  subsectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 2,
  },

  // Content
  paragraph: {
    fontSize: 13,
    color: "#374151",
    lineHeight: 20,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingLeft: 4,
  },
  bulletDot: {
    width: 6, height: 6,
    borderRadius: 3,
    backgroundColor: TEAL,
    marginTop: 7,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    color: "#374151",
    lineHeight: 20,
  },
});
