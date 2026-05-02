import { useRouter } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
  Dimensions,
  Keyboard,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ALL_VOCAB, type RawVocab } from "@/assets/vocab";
import { AuthMenu } from "@/components/AuthMenu";
import { useAuth } from "@/hooks/useAuth";

const TEAL = "#4ECDC4";

interface Item {
  id: string;
  emoji: string;
  jp: string;
  vi: string;
  route: "/flashcard";
  bookId?: string;
}

const INDUSTRIES: Item[] = [
  { id: "food", emoji: "🍱", jp: "飲食料品製造業", vi: "Thực phẩm", route: "/flashcard", bookId: "industry-food" },
  { id: "construction", emoji: "🏗️", jp: "建設業", vi: "Xây dựng", route: "/flashcard", bookId: "industry-construction" },
  { id: "nursing", emoji: "🧑‍⚕️", jp: "介護", vi: "Điều dưỡng", route: "/flashcard", bookId: "industry-nursing" },
  { id: "agriculture", emoji: "🌾", jp: "農業", vi: "Nông nghiệp", route: "/flashcard", bookId: "industry-agriculture" },
  { id: "hotel", emoji: "🏨", jp: "宿泊業", vi: "Khách sạn", route: "/flashcard", bookId: "industry-hotel" },
  { id: "restaurant", emoji: "🍜", jp: "外食業", vi: "Nhà hàng", route: "/flashcard", bookId: "industry-restaurant" },
  { id: "auto", emoji: "🚗", jp: "自動車整備", vi: "Ô tô", route: "/flashcard", bookId: "industry-auto" },
  { id: "cleaning", emoji: "🧹", jp: "ビルクリーニング", vi: "Vệ sinh", route: "/flashcard", bookId: "industry-cleaning" },
];

const JLPT_LEVELS: Item[] = [
  { id: "n5", emoji: "N5", jp: "N5", vi: "Khoá học N5", route: "/flashcard" },
  { id: "n4", emoji: "N4", jp: "N4", vi: "Khoá học N4", route: "/flashcard" },
  { id: "n3", emoji: "N3", jp: "N3", vi: "Khoá học N3", route: "/flashcard" },
  { id: "n2", emoji: "N2", jp: "N2", vi: "Khoá học N2", route: "/flashcard" },
  { id: "n1", emoji: "N1", jp: "N1", vi: "Khoá học N1", route: "/flashcard" },
];

const BANNERS = [
  { id: "promo", title: "Nhật ngữ chuyên ngành", subtitle: "Giảm 80%", badge: "MỪNG ĐẠI LỄ\n30/4 — 1/5", cta: "Đăng ký ngay", bg: ["#F97316", "#EA580C"] },
  { id: "jlpt", title: "Lộ trình JLPT", subtitle: "N5 → N1", badge: "Học từ vựng\ntheo cấp độ", cta: "Khám phá", bg: ["#eb3c15", "#ccef1c"] },
  { id: "tokutei", title: "Tokutei Ginou", subtitle: "14 ngành nghề", badge: "Từ vựng\nchuyên ngành", cta: "Bắt đầu", bg: ["#10B981", "#047857"] },
];

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

const SCREEN_WIDTH = Dimensions.get("window").width;
const BANNER_WIDTH = SCREEN_WIDTH - 32;

export default function HomeScreen() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [query, setQuery] = useState("");
  const [bannerIdx, setBannerIdx] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);
  const bannerRef = useRef<ScrollView>(null);

  const q = normalize(query.trim());
  const vocabResults = useMemo(() => {
    if (!q) return [] as RawVocab[];
    return ALL_VOCAB.filter(
      (v) =>
        v.kanji.includes(q) ||
        normalize(v.hiragana).includes(q) ||
        normalize(v.han).includes(q) ||
        normalize(v.nghia).includes(q),
    ).slice(0, 10);
  }, [q]);

  const goFlashcard = (params?: { q?: string }) => {
    router.push({ pathname: "/flashcard", params: params?.q ? { q: params.q } : {} });
  };

  const goLearningMenu = (opts: { level?: string; bookId?: string; title?: string }) => {
    router.push({ pathname: "/learning-menu", params: { ...(opts.level ? { level: opts.level } : {}), ...(opts.bookId ? { bookId: opts.bookId } : {}), ...(opts.title ? { title: opts.title } : {}) } });
  };

  const goBookSelect = (level: "N3" | "N2") => {
    router.push({ pathname: "/book-select", params: { level } });
  };

  const onBannerScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    setBannerIdx(Math.round(x / BANNER_WIDTH));
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={TEAL} />

      <SafeAreaView style={s.topBar} edges={["top", "left", "right"]}>
        <View style={s.topBarInner}>
          {currentUser ? (
            <View style={s.userRow}>
              <View style={s.userAvatar}>
                <Text style={s.userAvatarText}>{currentUser.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ marginLeft: 10 }}>
                <Text style={s.userHello}>Xin chào,</Text>
                <Text style={s.userName} numberOfLines={1}>{currentUser}</Text>
              </View>
            </View>
          ) : (
            <View style={s.brandRow}>
              <Text style={s.brandText}>Mirai.JP</Text>
            </View>
          )}
          <TouchableOpacity style={s.iconBtn} activeOpacity={0.8} onPress={() => setMenuVisible(true)}>
            <View style={s.hamburger}>
              <View style={s.hamburgerLine} />
              <View style={s.hamburgerLine} />
              <View style={s.hamburgerLine} />
            </View>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <AuthMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />

      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView style={s.scrollArea} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={s.tealBg} />

          <View style={s.bannerWrap}>
            <ScrollView ref={bannerRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onBannerScroll} decelerationRate="fast" snapToInterval={BANNER_WIDTH}>
              {BANNERS.map((b) => (
                <View key={b.id} style={[s.banner, { backgroundColor: b.bg[0], width: BANNER_WIDTH }]}>
                  <View style={[s.bannerAccent, { backgroundColor: b.bg[1] }]} />
                  <View style={s.bannerLeft}>
                    <Text style={s.bannerTitle}>{b.title}</Text>
                    <Text style={s.bannerSub}>{b.subtitle}</Text>
                  </View>
                  <View style={s.bannerRight}>
                    <Text style={s.bannerBadge}>{b.badge}</Text>
                    <View style={s.bannerCta}><Text style={s.bannerCtaText}>{b.cta}</Text></View>
                  </View>
                </View>
              ))}
            </ScrollView>
            <View style={s.dotsRow}>
              {BANNERS.map((_, i) => (
                <View key={i} style={[s.dot, i === bannerIdx && s.dotActive]} />
              ))}
            </View>
          </View>

          <View style={s.searchWrap}>
            <Text style={s.searchIcon}>🔍</Text>
            <TextInput
              style={s.searchInput}
              placeholder="Tìm từ vựng (kanji, hiragana, nghĩa)..."
              placeholderTextColor="#94a3b8"
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery("")} style={s.clearBtn}>
                <Text style={s.clearText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {vocabResults.length > 0 && (
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>Từ vựng phù hợp</Text>
                <Text style={s.sectionCount}>{vocabResults.length}</Text>
              </View>
              {vocabResults.map((v, i) => (
                <TouchableOpacity key={`${v.id}-${i}`} style={s.vocabCard} onPress={() => goFlashcard({ q: v.kanji })} activeOpacity={0.7}>
                  <View style={s.vocabKanjiWrap}>
                    <Text style={s.vocabKanji}>{v.kanji}</Text>
                  </View>
                  <View style={s.vocabBody}>
                    <Text style={s.vocabHira}>{v.hiragana}</Text>
                    <Text style={s.vocabMeaning} numberOfLines={1}>{v.han ? `${v.han} · ` : ""}{v.nghia}</Text>
                  </View>
                  <Text style={s.cardArrow}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {q === "" && (
            <>
              <View style={s.section}>
                <Text style={s.sectionH1}>Khoá học JLPT</Text>
                <View style={s.cardPanel}>
                  <View style={s.grid}>
                    {JLPT_LEVELS.map((it) => (
                      <TouchableOpacity
                        key={it.id}
                        style={s.gridItem}
                        onPress={() => {
                          if (it.jp === "N3" || it.jp === "N2") {
                            goBookSelect(it.jp as "N3" | "N2");
                          } else {
                            goLearningMenu({ level: it.jp, title: `Khoá học ${it.jp}` });
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={s.jlptBadgeOuter}>
                          <View style={s.jlptBadge}>
                            <Text style={s.jlptBadgeText}>{it.jp}</Text>
                          </View>
                        </View>
                        <Text style={s.gridLabel}>{it.vi}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <View style={s.section}>
                <Text style={s.sectionH1}>Khoá học theo ngành</Text>
                <View style={s.cardPanel}>
                  <View style={s.grid}>
                    {INDUSTRIES.map((it) => (
                      <TouchableOpacity key={it.id} style={s.gridItem} onPress={() => goLearningMenu({ bookId: it.bookId, title: `Ngành: ${it.vi}` })} activeOpacity={0.7}>
                        <View style={s.industryBadgeOuter}>
                          <View style={s.industryBadge}>
                            <Text style={s.industryEmoji}>{it.emoji}</Text>
                          </View>
                        </View>
                        <Text style={s.gridLabel} numberOfLines={1}>{it.vi}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </TouchableWithoutFeedback>

      <View style={[s.floatBtn, { pointerEvents: "box-none" } as object]}>
        <TouchableOpacity style={s.floatBtnInner} activeOpacity={0.85}>
          <Text style={s.floatBtnText}>Thi thử JLPT</Text>
          <Text style={s.floatBtnEmoji}>🏋️</Text>
        </TouchableOpacity>
      </View>

      <SafeAreaView style={s.tabBarSafe} edges={["bottom", "left", "right"]}>
        <View style={s.tabBar}>
          <TouchableOpacity style={s.tab} activeOpacity={0.7}>
            <Text style={s.tabIcon}>📖</Text>
            <Text style={s.tabLabel}>Sách</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.tab} activeOpacity={0.7}>
            <Text style={s.tabIcon}>📊</Text>
            <Text style={s.tabLabel}>Năng lực</Text>
          </TouchableOpacity>
          <View style={s.tabSpacer} />
          <TouchableOpacity style={s.tab} activeOpacity={0.7} onPress={() => goFlashcard()}>
            <Text style={s.tabIcon}>🃏</Text>
            <Text style={s.tabLabel}>Flashcard</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.tab} activeOpacity={0.7}>
            <Text style={s.tabIcon}>🎓</Text>
            <Text style={s.tabLabel}>Lớp học</Text>
          </TouchableOpacity>
          <View style={[s.tabCenter, { pointerEvents: "box-none" } as object]}>
            <TouchableOpacity style={s.mascotBtn} activeOpacity={0.85} onPress={() => goFlashcard()}>
              <Text style={s.mascotEmoji}>🦉</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f1f5f9" },
  topBar: { backgroundColor: TEAL },
  topBarInner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10 },
  userRow: { flexDirection: "row", alignItems: "center", flexShrink: 1, flex: 1 },
  userAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.25)", borderWidth: 2, borderColor: "#fff", alignItems: "center", justifyContent: "center" },
  userAvatarText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  userHello: { color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: "600" },
  userName: { color: "#fff", fontSize: 15, fontWeight: "800", maxWidth: 180 },
  brandRow: { flex: 1, justifyContent: "center" },
  brandText: { color: "#fff", fontSize: 22, fontWeight: "900", letterSpacing: 0.5 },
  iconBtn: { width: 42, height: 42, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.18)", marginLeft: 10 },
  hamburger: { width: 22, height: 16, justifyContent: "space-between" },
  hamburgerLine: { width: "100%", height: 2.5, backgroundColor: "#fff", borderRadius: 2 },
  scrollArea: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  tealBg: { position: "absolute", top: 0, left: 0, right: 0, height: 80, backgroundColor: TEAL },
  bannerWrap: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  banner: { height: 150, borderRadius: 14, flexDirection: "row", overflow: "hidden", padding: 16 },
  bannerAccent: { position: "absolute", right: -30, top: -30, width: 140, height: 140, borderRadius: 70, opacity: 0.4 },
  bannerLeft: { flex: 1, justifyContent: "space-between" },
  bannerTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  bannerSub: { color: "#fff", fontSize: 36, fontWeight: "900", marginTop: 4 },
  bannerRight: { width: 130, justifyContent: "space-between", alignItems: "flex-end" },
  bannerBadge: { color: "#fff", fontSize: 14, fontWeight: "800", textAlign: "right", lineHeight: 18 },
  bannerCta: { backgroundColor: "#FACC15", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  bannerCtaText: { color: "#7C2D12", fontWeight: "800", fontSize: 12 },
  dotsRow: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#cbd5e1" },
  dotActive: { backgroundColor: TEAL, width: 18 },
  searchWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "#ffffff", borderRadius: 12, paddingHorizontal: 12, height: 46, marginHorizontal: 16, marginTop: 10, marginBottom: 8, borderWidth: 1, borderColor: "#e2e8f0" },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: "#0f172a", height: "100%" },
  clearBtn: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#e2e8f0", alignItems: "center", justifyContent: "center" },
  clearText: { fontSize: 12, color: "#475569", fontWeight: "700" },
  section: { paddingHorizontal: 16, marginTop: 14 },
  sectionH1: { fontSize: 18, fontWeight: "800", color: "#0f172a", marginBottom: 10 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#334155" },
  sectionCount: { fontSize: 12, color: "#64748b", backgroundColor: "#e2e8f0", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: "hidden" },
  cardPanel: { backgroundColor: "#fff", borderRadius: 16, padding: 12, borderWidth: 1, borderColor: "#e2e8f0" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  gridItem: { width: "33.33%", alignItems: "center", paddingVertical: 12 },
  jlptBadgeOuter: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#fff", borderWidth: 2, borderColor: "#e0f2f1", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  jlptBadge: { width: 50, height: 50, borderRadius: 25, backgroundColor: TEAL, alignItems: "center", justifyContent: "center" },
  jlptBadgeText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  industryBadgeOuter: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#ffffff", borderWidth: 2, borderColor: "#fef3c7", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  industryBadge: { width: 50, height: 50, borderRadius: 25, backgroundColor: "#fef3c7", alignItems: "center", justifyContent: "center" },
  industryEmoji: { fontSize: 24 },
  gridLabel: { fontSize: 11, color: "#475569", fontWeight: "600", textAlign: "center" },
  vocabCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#ffffff", borderRadius: 12, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: "#dbeafe" },
  vocabKanjiWrap: { minWidth: 50, height: 46, paddingHorizontal: 8, borderRadius: 10, backgroundColor: "#eff6ff", alignItems: "center", justifyContent: "center", marginRight: 10 },
  vocabKanji: { fontSize: 20, fontWeight: "700", color: "#1e40af" },
  vocabBody: { flex: 1 },
  vocabHira: { fontSize: 14, color: "#1e40af", fontWeight: "600" },
  vocabMeaning: { fontSize: 13, color: "#475569", marginTop: 2 },
  cardArrow: { fontSize: 24, color: "#3b82f6", fontWeight: "300", marginLeft: 6 },
  floatBtn: { position: "absolute", right: 12, bottom: 96 },
  floatBtnInner: { backgroundColor: "#FACC15", flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 24, gap: 6 },
  floatBtnText: { fontWeight: "800", color: "#7C2D12", fontSize: 12 },
  floatBtnEmoji: { fontSize: 18 },
  tabBarSafe: { backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e2e8f0" },
  tabBar: { flexDirection: "row", alignItems: "center", paddingTop: 6, paddingBottom: 4, height: 64, position: "relative" },
  tab: { flex: 1, alignItems: "center", justifyContent: "center" },
  tabIcon: { fontSize: 22 },
  tabLabel: { fontSize: 11, color: "#475569", marginTop: 2, fontWeight: "600" },
  tabSpacer: { width: 70 },
  tabCenter: { position: "absolute", left: 0, right: 0, top: -22, alignItems: "center" },
  mascotBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: TEAL, alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: "#fff" },
  mascotEmoji: { fontSize: 28 },
});
