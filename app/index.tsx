// app/index.tsx
import { useRouter } from "expo-router";
import { BottomTabBar } from "../components/BottomTabBar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthMenu } from "../components/AuthMenu";
import { useAuth } from "../artifacts/mirai-jp/hooks/useAuth";
import SearchInline from "../components/SearchInline";
import HomeSuggestions from "../components/HomeSuggestions";
import ReferralScreen from "../components/ReferralScreen";
import ReferralQRScreen from "../components/ReferralQRScreen";
import { Animated, Easing } from "react-native";
import { AdBanner } from "../components/AdBanner";
import { useGiftPromo } from "../artifacts/mirai-jp/hooks/useGiftPromo";
import { GiftIconAnimated } from "../components/GiftIconAnimated";
import { GiftPromoModal } from "../components/GiftPromoModal";
import { useColors, useThemeMode } from "../artifacts/mirai-jp/hooks/useColors";

const TEAL = "#004370";
const TEAL_DARK = "#003354";
const GRAD = [TEAL, TEAL_DARK] as const;
const BG_GRAY = "#EEF2F6";

// ── Sunrise accent (gắn với ý nghĩa "Mirai" - tương lai / bình minh) ────────
const SUN_CORAL = "#FF7A59";
const SUN_GOLD = "#FFB238";
const SUN_GRAD = [SUN_CORAL, SUN_GOLD] as const;

// const headerColor = "#f1f5f9";

interface Item {
  id: string;
  emoji: string;
  jp: string;
  vi: string;
  route: "/vocab";
  bookId?: string;
}

const INDUSTRIES: Item[] = [
  {
    id: "food",
    emoji: "🍱",
    jp: "飲食料品製造業",
    vi: "Thực phẩm",
    route: "/vocab",
    bookId: "industry-food",
  }, // đã xong
  {
    id: "construction",
    emoji: "🏗️",
    jp: "建設業",
    vi: "Xây dựng",
    route: "/vocab",
    bookId: "industry-construction",
  }, //đã xong
  {
    id: "nursing",
    emoji: "🧑‍⚕️",
    jp: "介護",
    vi: "Điều dưỡng",
    route: "/vocab",
    bookId: "industry-nursing",
  }, //đã xong
  {
    id: "agriculture",
    emoji: "🌾",
    jp: "農業",
    vi: "Nông nghiệp",
    route: "/vocab",
    bookId: "industry-agriculture",
  }, //đã xong
  {
    id: "hotel",
    emoji: "🏨",
    jp: "宿泊業",
    vi: "Khách sạn",
    route: "/vocab",
    bookId: "industry-hotel",
  }, //đã xong
  {
    id: "restaurant",
    emoji: "🍜",
    jp: "外食業",
    vi: "Nhà hàng",
    route: "/vocab",
    bookId: "industry-restaurant",
  }, //đã xong
  {
    id: "auto",
    emoji: "🚗",
    jp: "自動車整備",
    vi: "Ô tô",
    route: "/vocab",
    bookId: "industry-auto",
  }, //đã xong
  {
    id: "cleaning",
    emoji: "🧹",
    jp: "ビルクリーニング",
    vi: "Vệ sinh",
    route: "/vocab",
    bookId: "industry-cleaning",
  }, //đã xong
  {
    id: "machinery",
    emoji: "⚙️",
    jp: "素形材・産業機械",
    vi: "Cơ khí",
    route: "/vocab",
    bookId: "industry-machinery",
  }, //đã xong
  {
    id: "electronics",
    emoji: "⚡",
    jp: "電気・電子情報",
    vi: "Điện tử",
    route: "/vocab",
    bookId: "industry-electronics",
  }, //đã xong
  {
    id: "shipbuilding",
    emoji: "🚢",
    jp: "造船・舶用工業",
    vi: "Đóng tàu",
    route: "/vocab",
    bookId: "industry-shipbuilding",
  }, // đã xong
  {
    id: "textile",
    emoji: "👘",
    jp: "繊維・衣服",
    vi: "Dệt may",
    route: "/vocab",
    bookId: "industry-textile",
  }, // đã xong
  {
    id: "fishing",
    emoji: "🦈",
    jp: "漁業",
    vi: "Ngư nghiệp",
    route: "/vocab",
    bookId: "industry-fishing",
  }, // đã xong
  {
    id: "manufacturing",
    emoji: "🏭",
    jp: "工業製品製造業",
    vi: "Sản xuất CN",
    route: "/vocab",
    bookId: "industry-manufacturing",
  },
];

const JLPT_LEVELS: Item[] = [
  { id: "n5", emoji: "🌱", jp: "N5", vi: "Sơ cấp", route: "/vocab" },
  { id: "n4", emoji: "🌿", jp: "N4", vi: "Sơ trung cấp", route: "/vocab" },
  { id: "n3", emoji: "🌸", jp: "N3", vi: "Trung cấp", route: "/vocab" },
  { id: "n2", emoji: "🗻", jp: "N2", vi: "Thượng trung cấp", route: "/vocab" },
  { id: "n1", emoji: "🏆", jp: "N1", vi: "Cao cấp", route: "/vocab" },
];

// ── Màu badge JLPT — có bản riêng cho theme sáng và tối ─────────────────────
const JLPT_COLORS_LIGHT: Record<string, { badge: string; outer: string }> = {
  N5: { badge: "#dcfce7", outer: "#dcfce7" },
  N4: { badge: "#dbeafe", outer: "#dbeafe" },
  N3: { badge: "#fef3c7", outer: "#fef3c7" },
  N2: { badge: "#ffedd5", outer: "#ffedd5" },
  N1: { badge: "#fee2e2", outer: "#fee2e2" },
};

const JLPT_COLORS_DARK: Record<string, { badge: string; outer: string }> = {
  N5: { badge: "#123524", outer: "#1d4a34" },
  N4: { badge: "#122a45", outer: "#1c3f63" },
  N3: { badge: "#3a2e12", outer: "#5c481d" },
  N2: { badge: "#3a2210", outer: "#5c3617" },
  N1: { badge: "#3a1414", outer: "#5c1f1f" },
};

// ── Màu badge ngành nghề — có bản riêng cho theme sáng và tối ───────────────
const INDUSTRY_BADGE_LIGHT = { badge: "#fef3c7", outer: "#fef3c7" };
const INDUSTRY_BADGE_DARK = { badge: "#3a2e12", outer: "#5c481d" };

const BANNERS = [
  {
    id: "promo",
    title: "Nhật ngữ chuyên ngành",
    subtitle: "Đúng 100%",
    badge: "Chạm là nhớ\nhọc là mơ",
    cta: "Học ngay",
    bg: ["#F97316", "#EA580C"],
  },
  {
    id: "jlpt",
    title: "Lộ trình JLPT",
    subtitle: "N5 → N1",
    badge: "Học từ vựng\ntheo cấp độ",
    cta: "Khám phá",
    bg: ["#eb3c15", "#ccef1c"],
  },
  {
    id: "tokutei",
    title: "Tokutei Ginou",
    subtitle: "14 ngành nghề",
    badge: "Từ vựng\nchuyên ngành",
    cta: "Bắt đầu",
    bg: ["#10B981", "#047857"],
  },
];

// ── Placeholder chạy song ngữ cho ô tìm kiếm ────────────────────────────────
const SEARCH_PLACEHOLDERS = [
  "Tìm từ vựng, kanji, ngữ pháp...",
  "単語・漢字・文法を検索...",
  "Ví dụ: 食べる, ăn cơm...",
  "Ví dụ: 水を飲む, uống nước...",
  "Ví dụ: 日本語を勉強する, học tiếng Nhật...",
  "Ví dụ: 本を読む, đọc sách...",
  "Ví dụ: 音楽を聞く, nghe nhạc...",
  "Ví dụ: 写真を撮る, chụp ảnh...",
  "Ví dụ: 映画を見る, xem phim...",
  "Ví dụ: 友達に会う, gặp bạn bè...",
];

function getGreeting(): { vi: string; jp: string } {
  const h = new Date().getHours();
  if (h < 11) return { vi: "Chào buổi sáng", jp: "おはようございます" };
  if (h < 17) return { vi: "Chào buổi chiều", jp: "こんにちは" };
  return { vi: "Chào buổi tối", jp: "こんばんは" };
}

const SCREEN_WIDTH = Dimensions.get("window").width;
const BANNER_WIDTH = SCREEN_WIDTH - 32;

export default function HomeScreen() {
  const c = useColors(); // bảng màu hiện tại — tự đổi theo giờ / lựa chọn người dùng
  const { themeMode, timeOfDay } = useThemeMode();
  // Đang ở giao diện tối khi: người dùng chọn "dark" thủ công,
  // hoặc đang ở chế độ "auto" và khung giờ hiện tại là ban đêm.
  const isDark = themeMode === "dark" || (themeMode === "auto" && timeOfDay === "night");
  const JLPT_COLORS = isDark ? JLPT_COLORS_DARK : JLPT_COLORS_LIGHT;
  const INDUSTRY_BADGE_COLOR = isDark ? INDUSTRY_BADGE_DARK : INDUSTRY_BADGE_LIGHT;

  const router = useRouter();
  const { currentUser, scopedKey } = useAuth();
  const { config: giftConfig, showPopup, closePopup } = useGiftPromo();

  const [bannerIdx, setBannerIdx] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);
  const [showChoiceMenu, setShowChoiceMenu] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // ── SearchInline overlay state ───────────────────────────────────────────
  const [searchActive, setSearchActive] = useState(false);
  const [autoOpenDrawer, setAutoOpenDrawer] = useState(false);
  const [searchInitQuery, setSearchInitQuery] = useState("");
  const [searchInitTab, setSearchInitTab] = useState<
    "all" | "vocab" | "kanji" | "sentence" | "grammar"
  >("all");

  // ── Placeholder chạy chữ cho ô tìm kiếm ──────────────────────────────────
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const placeholderOpacity = useRef(new Animated.Value(1)).current;

  const bannerRef = useRef<ScrollView>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const isPaused = useRef(false);
  const searchAnim = useRef(new Animated.Value(0)).current;

  // Hiệu ứng nổi lên khi vào màn hình (hero search dock)
  const heroEnterAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(heroEnterAnim, {
      toValue: 1,
      duration: 480,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  // ── Banner auto-scroll ───────────────────────────────────────────────────
  const scrollToNext = useCallback(() => {
    if (isPaused.current) return;
    setBannerIdx((prev) => {
      const next = (prev + 1) % BANNERS.length;
      bannerRef.current?.scrollTo({ x: next * BANNER_WIDTH, animated: true });
      return next;
    });
  }, []);

  useEffect(() => {
    const id = setInterval(scrollToNext, 20000);
    return () => clearInterval(id);
  }, [scrollToNext]);

  const onBannerScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    setBannerIdx(Math.round(x / BANNER_WIDTH));
  };

  // ── Vòng lặp đổi placeholder song ngữ ────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      Animated.timing(placeholderOpacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start(() => {
        setPlaceholderIdx((p) => (p + 1) % SEARCH_PLACEHOLDERS.length);
        Animated.timing(placeholderOpacity, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }).start();
      });
    }, 2600);
    return () => clearInterval(id);
  }, []);

  // ── Mở SearchInline ──────────────────────────────────────────────────────

  const openSearch = useCallback(() => {
    setAutoOpenDrawer(false);
    setSearchInitQuery("");
    setSearchInitTab("all");
    setSearchActive(true);
    searchAnim.setValue(0);
    Animated.spring(searchAnim, {
      toValue: 1,
      useNativeDriver: true,
      bounciness: 6,
      speed: 11,
    }).start();
  }, []);

  const openSearchWithDrawer = useCallback(() => {
    setAutoOpenDrawer(true);
    setSearchInitQuery("");
    setSearchInitTab("kanji");
    setSearchActive(true);
    searchAnim.setValue(0);
    Animated.spring(searchAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, []);

  const openSearchFromSuggestion = useCallback(
    (query: string, tab: "vocab" | "sentence" | "grammar") => {
      setAutoOpenDrawer(false);
      setSearchInitQuery(query);
      setSearchInitTab(tab);
      setSearchActive(true);
      searchAnim.setValue(0);
      Animated.spring(searchAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    },
    [],
  );

  const closeSearch = useCallback(() => {
    Animated.timing(searchAnim, {
      toValue: 0,
      duration: 200,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      setSearchActive(false);
      setAutoOpenDrawer(false);
      setSearchInitQuery("");
    });
  }, []);
  // ── Navigation helpers ───────────────────────────────────────────────────
  const goLearningMenu = (opts: {
    level?: string;
    bookId?: string;
    title?: string;
  }) => {
    router.push({
      pathname: "/learning-menu",
      params: {
        ...(opts.level ? { level: opts.level } : {}),
        ...(opts.bookId ? { bookId: opts.bookId } : {}),
        ...(opts.title ? { title: opts.title } : {}),
      },
    });
  };

  const goBookSelect = (level: "N3" | "N2") => {
    router.push({ pathname: "/book-select", params: { level } });
  };

  const goLevelBook = (bookId: string) => {
    router.push({ pathname: "/level-book", params: { bookId } });
  };

  const greeting = getGreeting();

  return (
    <View style={[s.root, { backgroundColor: c.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={c.primary} />

      {/* ── Header gradient + "bình minh" (gắn ý nghĩa Mirai) ─────────────── */}
      <LinearGradient colors={[c.primary, c.primary + "cc"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.headerGradient}>
        {/* Vòng mặt trời mọc trang trí, mờ nhẹ, không phá màu thương hiệu */}
        <View pointerEvents="none" style={s.sunWrap}>
          <LinearGradient
            colors={[SUN_GOLD + "33", SUN_CORAL + "00"]}
            style={s.sunRingOuter}
          />
          <LinearGradient
            colors={[SUN_CORAL + "55", SUN_GOLD + "00"]}
            style={s.sunRingInner}
          />
        </View>

        <SafeAreaView style={s.topBar} edges={["top", "left", "right"]}>
          <View style={s.topBarInner}>
            <View style={s.logoBadge}>
              <Text style={[s.logoText, { color: c.primaryForeground }]}>Mirai</Text>
            </View>

            {currentUser ? (
              <View style={s.userRow}>
                <View style={[s.userAvatar, { backgroundColor: c.primaryForeground + "30", borderColor: c.primaryForeground }]}>
                  <Text style={[s.userAvatarText, { color: c.primaryForeground }]}>
                    {currentUser.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ marginLeft: 10 }}>
                  <Text style={[s.userHello, { color: c.primaryForeground + "d9" }]}>Xin chào,</Text>
                  <Text style={[s.userName, { color: c.primaryForeground }]} numberOfLines={1}>
                    {currentUser}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={{ flex: 1 }} />
            )}

            <TouchableOpacity
              style={[s.iconBtn, { backgroundColor: c.primaryForeground + "26" }]}
              activeOpacity={0.8}
              onPress={() => setMenuVisible(true)}
            >
              <View style={s.hamburger}>
                <View style={[s.hamburgerLine, { backgroundColor: c.primaryForeground }]} />
                <View style={[s.hamburgerLine, { backgroundColor: c.primaryForeground }]} />
                <View style={[s.hamburgerLine, { backgroundColor: c.primaryForeground }]} />
              </View>
            </TouchableOpacity>
          </View>

          <View style={s.greetingRow}>
            <Text style={[s.greetingJp, { color: c.primaryForeground + "a6" }]}>{greeting.jp}</Text>
            <Text style={[s.greetingVi, { color: c.primaryForeground }]}>{greeting.vi} 👋</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <AuthMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />

      {/* ── Main scroll ─────────────────────────────────────────────────── */}
      <ScrollView
        ref={scrollViewRef}
        style={s.scrollArea}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Search dock nổi — điểm nhấn chính của trang chủ ─────────────── */}
        <Animated.View
          style={[
            s.heroSearchWrap,
            {
              opacity: heroEnterAnim,
              transform: [
                {
                  translateY: heroEnterAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [18, 0],
                  }),
                },
                {
                  scale: heroEnterAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.97, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={SUN_GRAD}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.heroSearchBorder}
          >
            <View style={[s.heroSearchInner, { backgroundColor: c.card }]}>
              <TouchableOpacity
                style={s.heroSearchTap}
                onPress={openSearch}
                activeOpacity={0.85}
              >
                <View style={[s.heroSearchIconBadge, { backgroundColor: c.muted }]}>
                  <Text style={s.heroSearchIconText}>🔍</Text>
                </View>
                <Animated.Text
                  style={[
                    s.heroSearchPlaceholder,
                    { opacity: placeholderOpacity, color: c.mutedForeground },
                  ]}
                  numberOfLines={1}
                >
                  {SEARCH_PLACEHOLDERS[placeholderIdx]}
                </Animated.Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.heroDrawBtn}
                onPress={openSearchWithDrawer}
                activeOpacity={0.8}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <LinearGradient colors={SUN_GRAD} style={s.heroDrawBtnGrad}>
                  <Text style={s.heroDrawIcon}>✍️</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>

          <View style={s.heroSuggWrap}>
            <HomeSuggestions onSelectSuggestion={openSearchFromSuggestion} />
          </View>
        </Animated.View>

        {/* Banner */}
        <View style={s.bannerWrap}>
          <ScrollView
            ref={bannerRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScrollBeginDrag={() => {
              isPaused.current = true;
            }}
            onMomentumScrollEnd={(e) => {
              onBannerScroll(e);
              isPaused.current = false;
            }}
            decelerationRate="fast"
            snapToInterval={BANNER_WIDTH}
          >
            {BANNERS.map((b) => (
              <View
                key={b.id}
                style={[
                  s.banner,
                  { backgroundColor: b.bg[0], width: BANNER_WIDTH },
                ]}
              >
                <View style={[s.bannerAccent, { backgroundColor: b.bg[1] }]} />
                <View style={s.bannerLeft}>
                  <Text style={s.bannerTitle}>{b.title}</Text>
                  <Text style={s.bannerSub}>{b.subtitle}</Text>
                </View>
                <View style={s.bannerRight}>
                  <Text style={s.bannerBadge}>{b.badge}</Text>
                  <TouchableOpacity
                    style={s.bannerCta}
                    activeOpacity={0.8}
                    onPress={() => {
                      if (b.id === "jlpt") {
                        goLevelBook("n5");
                      } else if (b.id === "tokutei") {
                        goLearningMenu({
                          bookId: INDUSTRIES[0].bookId,
                          title: `Ngành: ${INDUSTRIES[0].vi}`,
                        });
                      } else {
                        openSearch();
                      }
                    }}
                  >
                    <Text style={s.bannerCtaText}>{b.cta}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
          <View style={s.dotsRow}>
            {BANNERS.map((_, i) => (
              <View
                key={i}
                style={[
                  s.dot,
                  { backgroundColor: c.border },
                  i === bannerIdx && { backgroundColor: c.primary, width: 18 },
                ]}
              />
            ))}
          </View>
        </View>

        {/* ── JLPT levels ────────────────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={[s.sectionH1, { color: c.text }]}>📚 Trình độ JLPT</Text>
          <View style={[s.cardPanel, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={s.grid}>
              {JLPT_LEVELS.map((it) => (
                <TouchableOpacity
                  key={it.id}
                  style={s.gridItem}
                  onPress={() => {
                    if (it.jp === "N3" || it.jp === "N2") goBookSelect(it.jp);
                    else goLevelBook(it.jp.toLowerCase());
                  }}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      s.jlptBadgeOuter,
                      {
                        borderColor: JLPT_COLORS[it.jp]?.outer,
                        backgroundColor: c.card,
                      },
                    ]}
                  >
                    <View
                      style={[
                        s.jlptBadge,
                        { backgroundColor: JLPT_COLORS[it.jp]?.badge },
                      ]}
                    >
                      <Text style={s.jlptBadgeEmoji}>{it.emoji}</Text>
                    </View>
                  </View>
                  <Text style={[s.gridLabel, { color: c.text }]}>{it.jp}</Text>
                  <Text style={[s.gridSubLabel, { color: c.mutedForeground }]}>{it.vi}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* ── Ngành nghề ──────────────────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={[s.sectionH1, { color: c.text }]}>🏭 Khoá học theo ngành</Text>
          <View style={[s.cardPanel, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={s.grid}>
              {INDUSTRIES.map((it) => (
                <TouchableOpacity
                  key={it.id}
                  style={s.gridItem}
                  onPress={() =>
                    goLearningMenu({
                      bookId: it.bookId,
                      title: `Ngành: ${it.vi}`,
                    })
                  }
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      s.industryBadgeOuter,
                      {
                        borderColor: INDUSTRY_BADGE_COLOR.outer,
                        backgroundColor: c.card,
                      },
                    ]}
                  >
                    <View
                      style={[
                        s.industryBadge,
                        { backgroundColor: INDUSTRY_BADGE_COLOR.badge },
                      ]}
                    >
                      <Text style={s.industryEmoji}>{it.emoji}</Text>
                    </View>
                  </View>
                  <Text style={[s.gridLabel, { color: c.text }]} numberOfLines={1}>
                    {it.vi}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal
        visible={showChoiceMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowChoiceMenu(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(15,23,42,0.45)",
            justifyContent: "center",
            alignItems: "center",
          }}
          onPress={() => setShowChoiceMenu(false)}
        >
          <View
            style={{
              backgroundColor: c.card,
              borderRadius: 16,
              padding: 20,
              width: 280,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "800",
                color: c.text,
                marginBottom: 16,
                textAlign: "center",
              }}
            >
              Chọn hành động
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: c.primary,
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: "center",
                marginBottom: 10,
              }}
              onPress={() => {
                setShowChoiceMenu(false);
                setShowReferralModal(true);
              }}
            >
              <Text style={{ color: c.primaryForeground, fontWeight: "800" }}>
                📷 Quét mã người khác
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                backgroundColor: "#e1b12c",
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: "center",
              }}
              onPress={() => {
                setShowChoiceMenu(false);
                setShowQrModal(true);
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "800" }}>
                🎫 Xem mã của tôi
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Màn hình quét mã (User B) */}
      <Modal
        visible={showReferralModal}
        animationType="slide"
        onRequestClose={() => setShowReferralModal(false)}
      >
        <ReferralScreen
          currentUser={currentUser!}
          scopedKey={scopedKey}
          onClose={() => setShowReferralModal(false)}
        />
      </Modal>

      {/* Màn hình xem QR của tôi (User A) */}
      <Modal
        visible={showQrModal}
        animationType="slide"
        onRequestClose={() => setShowQrModal(false)}
      >
        <ReferralQRScreen onClose={() => setShowQrModal(false)} />
      </Modal>
        <GiftPromoModal
        visible={showPopup}
        title={giftConfig.title}
        message={giftConfig.message}
        onClose={closePopup}
        onViewNow={() => {
          closePopup();
          setShowChoiceMenu(true);
        }}
      />
      {currentUser && (
        <TouchableOpacity
          style={s.floatingGiftBtn}
          activeOpacity={0.85}
          onPress={() => setShowChoiceMenu(true)}
        >
          <GiftIconAnimated>
            <Text style={s.floatingGiftIcon}>🎁</Text>
          </GiftIconAnimated>
        </TouchableOpacity>
      )}

      <BottomTabBar />
      <AdBanner />

      {/* ── SearchInline overlay toàn màn hình ──────────────────────────── */}
      <Animated.View
        pointerEvents={searchActive ? "auto" : "none"}
        style={[
          StyleSheet.absoluteFill,
          {
            zIndex: searchActive ? 100 : -1,
            opacity: searchAnim,
            transform: [
              {
                translateY: searchAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [80, 0],
                }),
              },
              {
                scale: searchAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.94, 1],
                }),
              },
            ],
          },
        ]}
      >
        <SearchInline
          active={searchActive}
          onBack={closeSearch}
          autoOpenDrawer={autoOpenDrawer}
          onDrawerOpened={() => setAutoOpenDrawer(false)}
          initialTab={searchInitTab}
          initialQuery={searchInitQuery}
        />
      </Animated.View>
    </View>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  headerGradient: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingBottom: 18,
    overflow: "hidden",
  },
  adContainer: {
    alignItems: "center", 
    justifyContent: "center", 
    backgroundColor: "#fff", 
    borderTopWidth: 1, 
    borderTopColor: "#E5E7EB", 
    paddingVertical: 4, 
  },
  root: {
    flex: 1,
    backgroundColor: BG_GRAY,
  },
  topBar: { 
    backgroundColor: "transparent" ,
  },
  topBarInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 6,
  },

  // Trang trí "mặt trời mọc" ở góc header — gợi ý Mirai (tương lai)
  sunWrap: {
    position: "absolute",
    top: -40,
    right: -30,
  },
  sunRingOuter: {
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  sunRingInner: {
    position: "absolute",
    top: 30,
    right: 30,
    width: 110,
    height: 110,
    borderRadius: 55,
  },

  greetingRow: {
    paddingHorizontal: 16,
    marginTop: 4,
  },
  greetingJp: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 12,
    fontWeight: "600",
  },
  greetingVi: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 2,
  },

  userRow: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
    flex: 1,
  },
  userAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderWidth: 2,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  userAvatarText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  userHello: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    fontWeight: "600",
  },
  userName: { color: "#fff", fontSize: 15, fontWeight: "800", maxWidth: 180 },

  logoBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    height: 50,
    marginRight: 10,
  },
  logoText: {
    color: "#fff",
    fontSize: 27,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    marginLeft: 10,
  },
  hamburger: { width: 22, height: 16, justifyContent: "space-between" },
  hamburgerLine: {
    width: "100%",
    height: 2.5,
    backgroundColor: "#fff",
    borderRadius: 2,
  },

  scrollArea: { flex: 1 },
  scrollContent: { paddingBottom: 24 },

  // ── Hero search dock (điểm nhấn chính) ──────────────────────────────────
  heroSearchWrap: {
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 4,
    zIndex: 20,
  },
  heroSearchBorder: {
    borderRadius: 52,
    padding: 2, // độ dày viền gradient
    shadowColor: SUN_CORAL,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 10,
  },
  heroSearchInner: {
    backgroundColor: "#fff",
    borderRadius: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 6,
    paddingRight: 6,
    height: 60,
  },
  heroSearchTap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  heroSearchIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF1EC",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  heroSearchIconText: { fontSize: 17 },
  heroSearchPlaceholder: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: "600",
    color: "#334155",
  },
  heroDrawBtn: {
    marginLeft: 6,
  },
  heroDrawBtnGrad: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  heroDrawIcon: { fontSize: 18 },
  heroSuggWrap: {
    marginTop: 10,
  },

  // Banner
  bannerWrap: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  banner: {
    height: 150,
    borderRadius: 14,
    flexDirection: "row",
    overflow: "hidden",
    padding: 18,
  },
  bannerAccent: {
    position: "absolute",
    right: -30,
    top: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    opacity: 0.4,
  },
  bannerLeft: { flex: 1, justifyContent: "space-between" },
  bannerTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  bannerSub: { color: "#fff", fontSize: 36, fontWeight: "900", marginTop: 4 },
  bannerRight: {
    width: 130,
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  bannerBadge: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    textAlign: "right",
    lineHeight: 18,
  },
  bannerCta: {
    backgroundColor: "#FACC15",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  bannerCtaText: { color: "#7C2D12", fontWeight: "800", fontSize: 12 },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
  },
  dot: { 
    width: 6, 
    height: 6, 
    borderRadius: 3, 
    backgroundColor: "#cbd5e1" 
  },
  dotActive: { 
    backgroundColor: TEAL, 
    width: 18 
  },

  // Sections
  section: { paddingHorizontal: 16, marginTop: 14 },
  sectionH1: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 10,
  },
  cardPanel: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  gridItem: { width: "33.33%", alignItems: "center", paddingVertical: 12 },

  // JLPT badges
  jlptBadgeOuter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  jlptBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  jlptBadgeEmoji: { fontSize: 28, fontWeight: "700", color: "#334155" },

  // Industry badges
  industryBadgeOuter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  industryBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  industryEmoji: { fontSize: 26 },

  gridLabel: {
    fontSize: 12,
    color: "#334155",
    textAlign: "center",
    fontWeight: "600",
    paddingHorizontal: 4,
  },
  gridSubLabel: {
    fontSize: 10,
    color: "#64748b",
    textAlign: "center",
    marginTop: 2,
  },
  floatingGiftBtn: {
    position: "absolute",
    right: 16,
    bottom: 110,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#e1b12c",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 50,
  },
  floatingGiftIcon: { fontSize: 28 },
});