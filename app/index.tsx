// app/index.tsx
import { useRouter } from "expo-router";
import { BottomTabBar } from "../components/BottomTabBar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
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
import { Animated, Easing } from "react-native";
import { BannerAd, BannerAdSize, TestIds, MobileAds } from "react-native-google-mobile-ads";
import remoteConfig from "@react-native-firebase/remote-config";
import { requestTrackingPermissionsAsync } from "expo-tracking-transparency";

const TEAL = "#004370";
const TEAL_DARK = "#004370";
const GRAD = [TEAL, TEAL_DARK] as const;
const BG_GRAY = "#f0f4f8";
const bgrColor = "#f1f5f9";

interface Item {
  id: string;
  emoji: string;
  jp: string;
  vi: string;
  route: "/vocab";
  bookId?: string;
}

const INDUSTRIES: Item[] = [
  { id: "food",         emoji: "🍱",   jp: "飲食料品製造業",      vi: "Thực phẩm",  route: "/vocab", bookId: "industry-food" }, // đã xong
  { id: "construction", emoji: "🏗️",  jp: "建設業",             vi: "Xây dựng",   route: "/vocab", bookId: "industry-construction" }, //đã xong
  { id: "nursing",      emoji: "🧑‍⚕️", jp: "介護",              vi: "Điều dưỡng", route: "/vocab", bookId: "industry-nursing" }, //đã xong
  { id: "agriculture",  emoji: "🌾",   jp: "農業",               vi: "Nông nghiệp", route: "/vocab", bookId: "industry-agriculture" }, //đã xong
  { id: "hotel",        emoji: "🏨",   jp: "宿泊業",             vi: "Khách sạn",  route: "/vocab", bookId: "industry-hotel" }, //đã xong
  { id: "restaurant",   emoji: "🍜",   jp: "外食業",             vi: "Nhà hàng",   route: "/vocab", bookId: "industry-restaurant" }, //đã xong
  { id: "auto",         emoji: "🚗",   jp: "自動車整備",          vi: "Ô tô",       route: "/vocab", bookId: "industry-auto" }, //đã xong
  { id: "cleaning",     emoji: "🧹",   jp: "ビルクリーニング",     vi: "Vệ sinh",    route: "/vocab", bookId: "industry-cleaning" }, //đã xong
  { id: "machinery",    emoji: "⚙️",   jp: "素形材・産業機械",     vi: "Cơ khí",     route: "/vocab", bookId: "industry-machinery" }, //đã xong
  { id: "electronics",  emoji: "⚡",   jp: "電気・電子情報",       vi: "Điện tử",    route: "/vocab", bookId: "industry-electronics" }, //đã xong
  { id: "shipbuilding", emoji: "🚢",   jp: "造船・舶用工業",       vi: "Đóng tàu",   route: "/vocab", bookId: "industry-shipbuilding" }, // đã xong
  { id: "textile",      emoji: "👘",   jp: "繊維・衣服",          vi: "Dệt may",    route: "/vocab", bookId: "industry-textile" }, // đã xong
  { id: "fishing",      emoji: "🦈",   jp: "漁業",               vi: "Ngư nghiệp",  route: "/vocab", bookId: "industry-fishing" }, // đã xong
  { id: "manufacturing", emoji: "🏭",  jp: "工業製品製造業",       vi: "Sản xuất CN", route: "/vocab", bookId: "industry-manufacturing" },
];

const JLPT_LEVELS: Item[] = [
  { id: "n5", emoji: "🌱", jp: "N5", vi: "Sơ cấp",        route: "/vocab" },
  { id: "n4", emoji: "🌿", jp: "N4", vi: "Sơ trung cấp",  route: "/vocab" },
  { id: "n3", emoji: "🌸", jp: "N3", vi: "Trung cấp",     route: "/vocab" },
  { id: "n2", emoji: "🗻", jp: "N2", vi: "Thượng trung cấp", route: "/vocab" },
  { id: "n1", emoji: "🏆", jp: "N1", vi: "Cao cấp",       route: "/vocab" },
];

const JLPT_COLORS: Record<string, { badge: string; outer: string }> = {
  N5: { badge: "#dcfce7", outer: "#dcfce7" },
  N4: { badge: "#dbeafe", outer: "#dbeafe" },
  N3: { badge: "#fef3c7", outer: "#fef3c7" },
  N2: { badge: "#ffedd5", outer: "#ffedd5" },
  N1: { badge: "#fee2e2", outer: "#fee2e2" },
};

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

const SCREEN_WIDTH = Dimensions.get("window").width;
const BANNER_WIDTH = SCREEN_WIDTH - 32;

export default function HomeScreen() {
  const router = useRouter();
  const { currentUser } = useAuth();

  const [bannerIdx, setBannerIdx] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);

  // ── SearchInline overlay state ───────────────────────────────────────────
  const [searchActive, setSearchActive] = useState(false);
  const [autoOpenDrawer, setAutoOpenDrawer] = useState(false);
  const [searchInitQuery, setSearchInitQuery] = useState('');
  const [searchInitTab,   setSearchInitTab]   = useState<'vocab' | 'kanji' | 'sentence' | 'grammar'>('vocab');

  const bannerRef = useRef<ScrollView>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const isPaused = useRef(false);
  const searchAnim = useRef(new Animated.Value(0)).current;
  // Đơn vị ID quảng cáo lưu động lấy tự động từ đám mây Firebase
  const [adBannerUnitId, setAdBannerUnitId] = useState<string>(TestIds.BANNER);

  // ── Banner auto-scroll ───────────────────────────────────────────────────
  const scrollToNext = useCallback(() => {
    if (isPaused.current) return;
    setBannerIdx(prev => {
      const next = (prev + 1) % BANNERS.length;
      bannerRef.current?.scrollTo({ x: next * BANNER_WIDTH, animated: true });
      return next;
    });
  }, []);

  useEffect(() => {
    const id = setInterval(scrollToNext, 20000);
    return () => clearInterval(id);
  }, [scrollToNext]);

  // ── Initialize AdMob ─────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      // Xin quyền App Tracking Transparency TRƯỚC khi khởi tạo quảng cáo — bắt buộc theo yêu cầu Apple
      await requestTrackingPermissionsAsync();

      MobileAds().initialize();

      remoteConfig().setDefaults({
        ad_banner_id: TestIds.BANNER,
      });

      remoteConfig()
        .fetchAndActivate()
        .then(() => {
          const idTuXa = remoteConfig().getValue('ad_banner_id').asString();
          if (idTuXa) {
            setAdBannerUnitId(idTuXa);
          }
        })
        .catch(error => console.log("Lỗi Firebase: ", error));
    })();
  }, []);


  const onBannerScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    setBannerIdx(Math.round(x / BANNER_WIDTH));
  };

  // ── Mở SearchInline ──────────────────────────────────────────────────────

  const openSearch = useCallback(() => {
  setAutoOpenDrawer(false);
  setSearchInitQuery('');
  setSearchInitTab('vocab');
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
  setSearchInitQuery('');
  setSearchInitTab('kanji');
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
  (query: string, tab: 'vocab' | 'sentence' | 'grammar') => {
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
    setSearchInitQuery('');
  });
}, []);
  // ── Navigation helpers ───────────────────────────────────────────────────
  const goLearningMenu = (opts: { level?: string; bookId?: string; title?: string }) => {
    router.push({
      pathname: "/learning-menu",
      params: {
        ...(opts.level  ? { level:  opts.level  } : {}),
        ...(opts.bookId ? { bookId: opts.bookId } : {}),
        ...(opts.title  ? { title:  opts.title  } : {}),
      },
    });
  };

  const goBookSelect = (level: "N3" | "N2") => {
    router.push({ pathname: "/book-select", params: { level } });
  };

  const goLevelBook = (bookId: string) => {
    router.push({ pathname: "/level-book", params: { bookId } });
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={TEAL} />

      {/* ── Header gradient ──────────────────────────────────────────────── */}
      <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
        <SafeAreaView style={s.topBar} edges={["top", "left", "right"]}>
          <View style={s.topBarInner}>
            <View style={s.logoBadge}>
              <Text style={s.logoText}>Mirai</Text>
              <Text style={s.logoDot}>.</Text>
              <Text style={s.logoJP}>JP</Text>
            </View>

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
              <View style={{ flex: 1 }} />
            )}

            <TouchableOpacity
              style={s.iconBtn}
              activeOpacity={0.8}
              onPress={() => setMenuVisible(true)}
            >
              <View style={s.hamburger}>
                <View style={s.hamburgerLine} />
                <View style={s.hamburgerLine} />
                <View style={s.hamburgerLine} />
              </View>
            </TouchableOpacity>
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
        {/* Banner */}
        <View style={s.bannerWrap}>
          <ScrollView
            ref={bannerRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScrollBeginDrag={() => { isPaused.current = true; }}
            onMomentumScrollEnd={e => { onBannerScroll(e); isPaused.current = false; }}
            decelerationRate="fast"
            snapToInterval={BANNER_WIDTH}
          >
            {BANNERS.map(b => (
              <View
                key={b.id}
                style={[s.banner, { backgroundColor: b.bg[0], width: BANNER_WIDTH }]}
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
                        goLearningMenu({ bookId: INDUSTRIES[0].bookId, title: `Ngành: ${INDUSTRIES[0].vi}` });
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
              <View key={i} style={[s.dot, i === bannerIdx && s.dotActive]} />
            ))}
          </View>
        </View>

        {/* ── Search bar + HomeSuggestions ───────────────────────────────── */}
        <View style={s.searchSection}>
          <View style={s.searchCard}>
            {/* Dải màu teal nổi bật ở đầu khung */}
            <View style={s.searchCardAccent} />

            {/* Thanh tìm kiếm — tap để mở SearchInline */}
            {/* ✅ Ô TÌM KIẾM MỚI CHUẨN TỪ ĐIỂN CAO CẤP */}
            <TouchableOpacity
              style={s.premiumSearchBar}
              onPress={openSearch}
              activeOpacity={0.9}
            >
              <View style={s.premiumSearchLeft}>
                <Text style={s.premiumSearchIcon}>🔍</Text>
                <Text style={s.premiumSearchPlaceholder}>
                  Tìm từ vựng, kanji, ngữ pháp...
                </Text>
              </View>
              
              {/* Nút viết tay/vẽ chữ nằm gọn gàng bên phải thanh tìm kiếm */}
              <TouchableOpacity
                style={s.premiumDrawBtn}
                onPress={openSearchWithDrawer}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={s.premiumDrawIcon}>✍️</Text>
              </TouchableOpacity>
            </TouchableOpacity>

            {/* Divider */}
            <View style={s.suggDivider} />

            {/* Gợi ý: từ vựng → câu → ngữ pháp → từ tiếp theo */}
            <View style={s.suggWrap}>
              <HomeSuggestions onSelectSuggestion={openSearchFromSuggestion} />
            </View>
          </View>
        </View>

        {/* ── JLPT levels ────────────────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionH1}>📚 Trình độ JLPT</Text>
          <View style={s.cardPanel}>
            <View style={s.grid}>
              {JLPT_LEVELS.map(it => (
                <TouchableOpacity
                  key={it.id}
                  style={s.gridItem}
                  onPress={() => {
                    if (it.jp === "N3" || it.jp === "N2") goBookSelect(it.jp);
                    else goLevelBook(it.jp.toLowerCase());
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[s.jlptBadgeOuter, { borderColor: JLPT_COLORS[it.jp]?.outer }]}>
                    <View style={[s.jlptBadge, { backgroundColor: JLPT_COLORS[it.jp]?.badge }]}>
                      <Text style={s.jlptBadgeEmoji}>{it.emoji}</Text>
                    </View>
                  </View>
                  <Text style={s.gridLabel}>{it.jp}</Text>
                  <Text style={s.gridSubLabel}>{it.vi}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* ── Ngành nghề ──────────────────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionH1}>🏭 Khoá học theo ngành</Text>
          <View style={s.cardPanel}>
            <View style={s.grid}>
              {INDUSTRIES.map(it => (
                <TouchableOpacity
                  key={it.id}
                  style={s.gridItem}
                  onPress={() => goLearningMenu({ bookId: it.bookId, title: `Ngành: ${it.vi}` })}
                  activeOpacity={0.7}
                >
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

        <View style={{ height: 100 }} />
      </ScrollView>
      <BottomTabBar />

      {/* ── AdMob Banner Ad ──────────────────────────────────────────────── */}
      <View style={s.adContainer}>
        <BannerAd
          unitId={adBannerUnitId} 
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{
            requestNonPersonalizedAdsOnly: true,
          }}
        />  
      </View>

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

  // ============================================================================
  // ─── BƯỚC 4: ĐỊNH DẠNG STYLE NỀN CHO VÙNG QUẢNG CÁO ĐÁY ──────────────────────
  // ============================================================================
  adContainer: {
    alignItems: "center",      // Căn giữa banner theo chiều ngang
    justifyContent: "center", // Căn giữa banner theo chiều dọc
    backgroundColor: "#fff",  // Màu nền trắng bao quanh quảng cáo để tăng độ tương phản
    borderTopWidth: 1,        // Đường viền kẻ mỏng phía trên phân cách với khu vực nội dung App
    borderTopColor: "#E5E7EB",// Màu viền xám nhạt tinh tế
    paddingVertical: 4,       // Tạo khoảng cách lề trên và dưới 4px để banner không bị dính chặt vào viền app
  },

  root: { flex: 1, backgroundColor: "#f3f9f1" },

  topBar: { backgroundColor: "transparent" },
  topBarInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  userRow: { flexDirection: "row", alignItems: "center", flexShrink: 1, flex: 1 },
  userAvatar: {
    width: 38, height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderWidth: 2, borderColor: "#fff",
    alignItems: "center", justifyContent: "center",
  },
  userAvatarText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  userHello: { color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: "600" },
  userName: { color: "#fff", fontSize: 15, fontWeight: "800", maxWidth: 180 },

  logoBadge: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingHorizontal: 8, height: 50, marginRight: 10,
  },
  logoText: { color: "#fff", fontSize: 27, fontWeight: "800", letterSpacing: 0.3 },
  logoDot:  { color: TEAL,   fontSize: 24, fontWeight: "900" },
  logoJP:   { color: "#fff", fontSize: 22, fontWeight: "900", letterSpacing: 0.5 },

  iconBtn: {
    width: 42, height: 42, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)", marginLeft: 10,
  },
  hamburger: { width: 22, height: 16, justifyContent: "space-between" },
  hamburgerLine: { width: "100%", height: 2.5, backgroundColor: "#fff", borderRadius: 2 },

  scrollArea: { flex: 1 },
  scrollContent: { paddingBottom: 24 },

  // Banner
  bannerWrap: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  banner: { height: 150, borderRadius: 14, flexDirection: "row", overflow: "hidden", padding: 18 },
  bannerAccent: { position: "absolute", right: -30, top: -30, width: 140, height: 140, borderRadius: 70, opacity: 0.4 },
  bannerLeft: { flex: 1, justifyContent: "space-between" },
  bannerTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  bannerSub:   { color: "#fff", fontSize: 36, fontWeight: "900", marginTop: 4 },
  bannerRight: { width: 130, justifyContent: "space-between", alignItems: "flex-end" },
  bannerBadge: { color: "#fff", fontSize: 14, fontWeight: "800", textAlign: "right", lineHeight: 18 },
  bannerCta:   { backgroundColor: "#FACC15", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  bannerCtaText: { color: "#7C2D12", fontWeight: "800", fontSize: 12 },
  dotsRow: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 10 },
  dot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: "#cbd5e1" },
  dotActive: { backgroundColor: TEAL, width: 18 },

  // Search bar (tap-target — mở SearchInline overlay)
  // ── Thay bằng đoạn Style mới chuẩn từ điển cao cấp:
  searchSection: { 
    paddingHorizontal: 16, 
    marginTop: 12, 
    marginBottom: 4, 
    zIndex: 10 
  },
  searchCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  searchCardAccent: {
    height: 4,
    backgroundColor: "#1d7d80", 
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  premiumSearchBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    borderRadius: 24,           
    height: 48,                 
    marginHorizontal: 12,       
    marginTop: 14,
    marginBottom: 12,           
    paddingLeft: 14,
    paddingRight: 5,
    borderWidth: 1,
    borderColor: "#e2e8f0",     
  },
  premiumSearchLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  premiumSearchIcon: {
    fontSize: 16,
    color: "#94a3b8",
    marginRight: 10,
  },
  premiumSearchPlaceholder: {
    fontSize: 14,
    fontWeight: "500",
    color: "#94a3b8",           // Màu chữ mờ tinh tế hơn màu đậm cũ
  },
  premiumDrawBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#f1f5f9", // Màu nền xám nhạt tạo điểm nhấn công nghệ cho nút vẽ chữ
    alignItems: "center",
    justifyContent: "center",
  },
  premiumDrawIcon: {
    fontSize: 16,
  },

  // Sections
  section: { paddingHorizontal: 16, marginTop: 14 },
  sectionH1: { fontSize: 18, fontWeight: "800", color: "#0f172a", marginBottom: 10 },
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
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: "#fff",
    borderWidth: 2, borderColor: "#fef3c7",
    alignItems: "center", justifyContent: "center",
    marginBottom: 8,
  },
  jlptBadge: {
    width: 50, height: 50, borderRadius: 25,
    alignItems: "center", justifyContent: "center",
  },
  jlptBadgeEmoji: { fontSize: 28, fontWeight: "700", color: "#334155" },

  // Industry badges
  industryBadgeOuter: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: "#ffffff",
    borderWidth: 2, borderColor: "#fef3c7",
    alignItems: "center", justifyContent: "center",
    marginBottom: 8,
  },
  industryBadge: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: "#fef3c7",
    alignItems: "center", justifyContent: "center",
  },
  industryEmoji: { fontSize: 26 },

  gridLabel: {
    fontSize: 12, color: "#334155",
    textAlign: "center", fontWeight: "600",
    paddingHorizontal: 4,
  },
  gridSubLabel: {
    fontSize: 10, color: "#64748b",
    textAlign: "center", marginTop: 2,
  },
  suggDivider: { height: 1, backgroundColor: '#f1f5f9', marginHorizontal: 14 },
  suggWrap:    { paddingHorizontal: 14, paddingBottom: 14 },
});