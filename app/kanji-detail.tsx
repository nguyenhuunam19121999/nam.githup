
// // ─────────────────────────────────────────────────────────────────────────────
// kanji-detail.tsx───

import { useLocalSearchParams, useRouter } from "expo-router";
import { BottomTabBar } from "@/components/BottomTabBar";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LinearGradient } from "expo-linear-gradient";
// import {
//   getKanjiById,
//   getKanjiByCharFull,
//   getExamplesByKanjiChar,
//   type KanjiItem,
//   type KanjiExample,
// } from "../assets/data_JLPT_kanji";
import {
  type KanjiItem,
  type KanjiExample,
} from "../assets/data_JLPT_kanji";
import {
  getKanjiByChar,
  getExamplesByKanjiChar,
} from "../services/kanjiRepository";
import { FeedbackSection } from "../components/FeedbackSection";
import { KanjiStrokeOrder } from "../components/KanjiStrokeOrder";
import { WritingPracticeModal } from "../components/WritingPracticeModal";
import { KanjiNotesModal } from "../components/KanjiNotesModal";
import React, { useMemo, useState, useEffect, useRef } from "react";

// ✅ MÀU CHỦ ĐẠO
const TEAL = "#1F6F7A";
const TEAL_DARK = "#1c5765";
const GRAD = [TEAL, TEAL_DARK] as const;
const TEXT_COLOR = "#e47b0b";

// ─── TabItem: hiển thị từng chữ Kanji trên thanh tab ───────
const TabItem = React.memo(
  ({
    char,
    index,
    isActive,
    onPress,
  }: {
    char: string;
    index: number;
    isActive: boolean;
    onPress: (idx: number) => void;
  }) => (
    <TouchableOpacity
      style={[styles.tabItem, isActive && styles.tabItemActive]}
      onPress={() => onPress(index)}
    >
      <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{char}</Text>
    </TouchableOpacity>
  )
);

export default function KanjiDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ 
    id?: string;
    kanjiChars?: string;  // ← THÊM: nhận danh sách chữ từ params
    fromSearch?: string;
    currentIndex?: string;
    totalResults?: string;
    kanjiList?: string;
  }>();
  
  const id = typeof params.id === "string" ? params.id : "";
  
  // 🔥 LẤY DANH SÁCH CHỮ KANJI
  // Ưu tiên: nếu có kanjiChars (mảng) thì dùng, nếu không thì dùng id
  const kanjiChars = useMemo(() => {
    // Ưu tiên kanjiChars (JSON array)
    if (params.kanjiChars) {
      try {
        return JSON.parse(params.kanjiChars) as string[];
      } catch {
        return params.kanjiChars.split(',').filter(Boolean);
      }
    }
    // Fallback: id có thể là "握 金" (nhiều chữ cách nhau bởi khoảng trắng)
    if (id) {
      const chars = id.split(/\s+/).filter(Boolean);
      return chars.length > 0 ? chars : [id];
    }
    return [];
  }, [params.kanjiChars, id]);

  const totalKanji = kanjiChars.length;

  // Tab đang chọn
  const [tabIndex, setTabIndex] = useState(0);
  useEffect(() => {
    setTabIndex(0);
  }, [kanjiChars.join(',')]);

  const handleTabChange = (index: number) => {
    setTabIndex(index);
  };

  const activeChar = kanjiChars[tabIndex] ?? kanjiChars[0] ?? "";

  // 🔥 TRA CỨU CHỮ KANJI TỪ kanjifull.json (giống KanjiDetailInline)
  const [kanjiData, setKanjiData] = useState<KanjiItem | null>(null);
  const [examples, setExamples] = useState<KanjiExample[]>([]);
  const [loading, setLoading] = useState(true);

  // Load dữ liệu khi activeChar thay đổi
  useEffect(() => {
    if (!activeChar) {
      setKanjiData(null);
      setExamples([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setKanjiData(null);
    setExamples([]);

    const rafId = requestAnimationFrame(async () => {
      const data = await getKanjiByChar(activeChar);
      setKanjiData(data);
      setExamples(await getExamplesByKanjiChar(activeChar));
      setLoading(false);
    });

    return () => cancelAnimationFrame(rafId );
  }, [activeChar]);

  // State mở modal
  const [writingItem, setWritingItem] = useState<KanjiItem | null>(null);
  const [notesItem, setNotesItem] = useState<KanjiItem | null>(null);
  const [kanjiList, setKanjiList] = useState<KanjiItem[]>([]);
  const [currentKanjIdx, setCurrentKanjIdx] = useState(0);
  const [isFromSearch, setIsFromSearch] = useState(false);

  // Nếu đến từ trang tìm kiếm
  // useEffect(() => {
  //   if (params.fromSearch === 'true' && params.kanjiList) {
  //     setIsFromSearch(true);
  //     try {
  //       const ids = JSON.parse(params.kanjiList);
  //       // const kanjis = ids.map((id: string) => getKanjiById(id)).filter(Boolean);
  //       const kanjis = (await Promise.all(
  //         ids.map((id: string) => getKanjiByChar(id))
  //       )).filter(Boolean);
  //       setKanjiList(kanjis as KanjiItem[]);
  //       setCurrentKanjIdx(parseInt(params.currentIndex || '0', 10));
  //     } catch (e) {
  //       // ignore
  //     }
  //   }
  // }, [params.fromSearch, params.kanjiList, params.currentIndex]);

  useEffect(() => {
  if (params.fromSearch === 'true' && params.kanjiList) {
      setIsFromSearch(true);
      (async () => {
        try {
          const ids = JSON.parse(params.kanjiList!);
          const kanjis = (await Promise.all(
            ids.map((id: string) => getKanjiByChar(id))
          )).filter(Boolean);
          setKanjiList(kanjis as KanjiItem[]);
          setCurrentKanjIdx(parseInt(params.currentIndex || '0', 10));
        } catch (e) {}
      })();
    }
  }, [params.fromSearch, params.kanjiList, params.currentIndex]);

  const goToNextKanji = () => {
    if (kanjiList.length > 0 && currentKanjIdx + 1 < kanjiList.length) {
      const nextKanji = kanjiList[currentKanjIdx + 1];
      router.setParams({ id: nextKanji.id });
      setCurrentKanjIdx(currentKanjIdx + 1);
    }
  };

  const goToPrevKanji = () => {
    if (kanjiList.length > 0 && currentKanjIdx > 0) {
      const prevKanji = kanjiList[currentKanjIdx - 1];
      router.setParams({ id: prevKanji.id });
      setCurrentKanjIdx(currentKanjIdx - 1);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={TEAL} />

      <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
        <SafeAreaView style={styles.topBar} edges={["top", "left", "right"]}>
          <View style={styles.topBarInner}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()} hitSlop={8}>
              <Text style={styles.backIcon}>‹</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <View style={styles.logoBadge}>
              <Text style={styles.logoText}>Mirai</Text>
              <Text style={styles.logoDot}>.</Text>
              <Text style={styles.logoJP}>JP</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* ─── TAB: luôn render nếu có nhiều chữ, kể cả đang loading ─── */}
      {totalKanji > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabBar}
          contentContainerStyle={{ paddingVertical: 0 }}
          removeClippedSubviews={true}
        >
          <View style={styles.tabContainer}>
            {kanjiChars.map((char, idx) => (
              <TabItem
                key={`${char}_${idx}`}
                char={char}
                index={idx}
                isActive={tabIndex === idx}
                onPress={handleTabChange}
              />
            ))}
          </View>
        </ScrollView>
      )}

      {/* ─── NỘI DUNG: 3 trạng thái loading / not found / data ─── */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: TEAL, fontSize: 15 }}>Đang tải...</Text>
        </View>
      ) : !kanjiData ? (
        <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
          <Text>Không tìm thấy chữ "{activeChar}".</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* giữ nguyên toàn bộ phần card + FeedbackSection như cũ */}
          <View style={styles.card}>
            {/* ... không đổi gì ... */}
          </View>
          <View style={{ paddingHorizontal: 12 }}>
            <FeedbackSection pageKey={`kanji-detail::${kanjiData.id}`} />
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      <WritingPracticeModal item={writingItem} onClose={() => setWritingItem(null)} />
      <KanjiNotesModal item={notesItem} onClose={() => setNotesItem(null)} />
      <BottomTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f1f5f9" },
  topBar: { backgroundColor: "transparent" },
  topBarInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  backIcon: { color: "#fff", fontSize: 32, fontWeight: "300", marginTop: -4 },
  logoBadge: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 4, height: 50 },
  logoText: { color: "#fff", fontSize: 22, fontWeight: "800", letterSpacing: 0.3 },
  logoDot: { color: "#fff", fontSize: 24, fontWeight: "900" },
  logoJP: { color: "#fff", fontSize: 22, fontWeight: "900", letterSpacing: 0.5 },
  scroll: { flex: 1 },
  scrollContent: { padding: 12, paddingBottom: 12 },

  // ─── TAB STYLES ───
  tabBar: { maxHeight: 50, marginBottom: 10 },
  tabContainer: { flexDirection: "row", paddingHorizontal: 4, gap: 8 },
  tabItem: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#fff",
  },
  tabItemActive: { backgroundColor: TEAL, borderColor: TEAL_DARK },
  tabText: { fontSize: 22, fontWeight: "700", color: TEAL_DARK },
  tabTextActive: { color: "#fff" },

  // ─── CARD STYLES (GIỮ NGUYÊN) ───
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  headerRow: { flexDirection: "row", alignItems: "flex-start" },
  bigKanji: { fontSize: 42, fontWeight: "800", color: TEAL_DARK, lineHeight: 64 },
  bigHanViet: { fontSize: 18, color: "#475569", fontWeight: "700", letterSpacing: 1, marginTop: 2 },
  headerActions: { flexDirection: "row", alignItems: "center" },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
    backgroundColor: "#fff",
  },
  actionIcon: { fontSize: 14, color: "#94a3b8" },
  actionBtnActive: { backgroundColor: "#fff", borderColor: TEAL_DARK },
  actionIconActive: { color: TEAL_DARK },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: "#e2e8f0", marginVertical: 14 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a", marginBottom: 10 },
  pronRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10, flexWrap: "wrap" },
  diamond: { color: TEXT_COLOR, fontSize: 16, marginRight: 8, marginTop: 4 },
  pronLabel: { fontSize: 14, fontWeight: "700", color: TEAL },
  pronValue: { fontSize: 20, color: TEAL_DARK, marginTop: 2, flex: 1, flexWrap: "wrap", paddingRight: 8 },
  strokeWrap: { alignItems: "center", marginVertical: 6 },
  statsRow: { flexDirection: "row", marginTop: 14, paddingHorizontal: 4 },
  statCol: { flex: 1, alignItems: "center" },
  statChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
  },
  statChipText: { fontSize: 12, color: TEXT_COLOR, fontWeight: "600" },
  statValue: { fontSize: 18, fontWeight: "800", color: TEAL, marginTop: 6 },
  statLink: { color: TEAL, textDecorationLine: "underline" },
  bushuHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  linkText: { fontSize: 13, color: TEXT_COLOR, fontWeight: "600" },
  bushuRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  bushuBar: { width: 3, height: 18, backgroundColor: TEXT_COLOR, marginRight: 8, borderRadius: 2 },
  bushuKanji: { fontSize: 28, fontWeight: "700", color: TEAL_DARK, marginRight: 6 },
  meaningRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 6 },
  meaningDot: { fontSize: 18, color: TEXT_COLOR, marginRight: 8 },
  meaningText: { flex: 1, fontSize: 18, color: TEAL, lineHeight: 22 },
  exampleRow: { marginBottom: 10 },
  exampleJp: { fontSize: 20, fontWeight: "700", color: "#0f172a" },
  exampleReading: { fontSize: 18, color: TEAL, marginTop: 2 },
  exampleVi: { fontSize: 18, color: TEAL_DARK, marginTop: 2 },
});



































// // // ─────────────────────────────────────────────────────────────────────────────
// // kanji-detail.tsx
// // Trang chi tiết một chữ Kanji (xem ảnh mẫu 1 & 2).
// // Hiển thị: chữ Kanji to, âm Hán Việt, các âm Kunyomi / Onyomi, ô minh hoạ
// // chữ ở giữa (placeholder cho nét bút), 3 cột thông tin (Số nét / JLPT / Tần
// // suất), các bộ thủ cấu thành, danh sách nghĩa, và ví dụ từ ghép. Cuối trang
// // là khối "Đóng góp ý kiến" dùng chung.
// // ─────────────────────────────────────────────────────────────────────────────
// import { useLocalSearchParams, useRouter } from "expo-router";
// import { BottomTabBar } from "@/components/BottomTabBar";
// import {
//   ScrollView,
//   StatusBar,
//   StyleSheet,
//   Text,
//   TouchableOpacity,
//   View,
// } from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context";

// import { LinearGradient } from "expo-linear-gradient";
// import {
//   getKanjiById,
//   getExamplesByKanjiChar,
//   type KanjiItem,
//   type KanjiExample,
// } from "../assets/data_JLPT_kanji";
// import { FeedbackSection } from "../components/FeedbackSection";
// import { KanjiStrokeOrder } from "../components/KanjiStrokeOrder";
// import { WritingPracticeModal } from "../components/WritingPracticeModal";
// import { KanjiNotesModal } from "../components/KanjiNotesModal";
// import React, { useMemo, useState, useEffect } from "react";  

// // ✅ MÀU CHỦ ĐẠO MỚI
// const TEAL = "#1F6F7A";
// const TEAL_DARK = "#1c5765";
// const GRAD = [TEAL, TEAL_DARK] as const;
// const TEXT_COLOR = "#e47b0b";

// export default function KanjiDetailScreen() {
//   const router = useRouter();
//   const params = useLocalSearchParams<{ 
//     id?: string
//     fromSearch?: string;
//     currentIndex?: string;
//     totalResults?: string;
//     kanjiList?: string;
//   }>();
//   const id = typeof params.id === "string" ? params.id : "";
//   const kanji = useMemo(() => getKanjiById(id), [id]);

//   // State mở modal luyện viết khi nhấn nút bút ✎
//   const [writingItem, setWritingItem] = useState<KanjiItem | null>(null);
//   // State mở modal ghi chú khi nhấn icon 📋
//   const [notesItem, setNotesItem] = useState<KanjiItem | null>(null);
//   const [kanjiList, setKanjiList] = useState<KanjiItem[]>([]);
//   const [currentKanjIdx, setCurrentKanjIdx] = useState(0);
//   const [isFromSearch, setIsFromSearch] = useState(false);

//   // Ví dụ tra từ toàn bộ từ vựng (JLPT + ngành nghề)
//   const [examples, setExamples] = useState<KanjiExample[]>([]);

//   // Load ví dụ mỗi khi kanji thay đổi
//   useEffect(() => {
//     if (kanji?.kanji) {
//       setExamples(getExamplesByKanjiChar(kanji.kanji));
//     } else {
//       setExamples([]);
//     }
//   }, [kanji]);

//   // Nếu đến từ trang tìm kiếm, lấy danh sách Kanji
//   useEffect(() => {
//     if (params.fromSearch === 'true' && params.kanjiList) {
//       setIsFromSearch(true);
//       try {
//         const ids = JSON.parse(params.kanjiList);
//         const kanjis = ids.map((id: string) => getKanjiById(id)).filter(Boolean);
//         setKanjiList(kanjis as KanjiItem[]);
//         setCurrentKanjIdx(parseInt(params.currentIndex || '0', 10));
//       } catch (e) {
//       }
//     }
//   }, [params.fromSearch, params.kanjiList, params.currentIndex]);

//   // Hàm chuyển tiếp
//   const goToNextKanji = () => {
//     if (kanjiList.length > 0 && currentKanjIdx + 1 < kanjiList.length) {
//       const nextKanji = kanjiList[currentKanjIdx + 1];
//       router.setParams({ id: nextKanji.id });
//       setCurrentKanjIdx(currentKanjIdx + 1);
//     }
//   };

//   // Hàm quay lại
//   const goToPrevKanji = () => {
//     if (kanjiList.length > 0 && currentKanjIdx > 0) {
//       const prevKanji = kanjiList[currentKanjIdx - 1];
//       router.setParams({ id: prevKanji.id });
//       setCurrentKanjIdx(currentKanjIdx - 1);
//     }
//   };

//   if (!kanji) {
//     return (
//       <View style={s.root}>
//         <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
//         <SafeAreaView style={s.topBar} edges={["top", "left", "right"]}>
//           <View style={s.topBarInner}>
//             <TouchableOpacity
//               style={s.iconBtn}
//               onPress={() => router.back()}
//               hitSlop={8}
//             >
//               <Text style={s.backIcon}>‹</Text>
//             </TouchableOpacity>
//             <View style={{ flex: 1 }} />
//             <View style={s.logoBadge}>
//               <Text style={s.logoText}>Mirai</Text>
//               <Text style={s.logoDot}>.</Text>
//               <Text style={s.logoJP}>JP</Text>
//             </View>
//           </View>
//         </SafeAreaView>
//         </LinearGradient>
//         <View style={{ padding: 24 }}>
//           <Text>Không tìm thấy chữ Kanji này.</Text>
//         </View>
//       </View>
//     );
//   }

//   return (
//     <View style={s.root}>
//       <StatusBar barStyle="light-content" backgroundColor={TEAL} />

//       {/* ── Thanh trên cùng ── */}
//       <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
//       <SafeAreaView style={s.topBar} edges={["top", "left", "right"]}>
//         <View style={s.topBarInner}>
//           <TouchableOpacity
//             style={s.iconBtn}
//             onPress={() => router.back()}
//             hitSlop={8}
//           >
//             <Text style={s.backIcon}>‹</Text>
//           </TouchableOpacity>
//           <View style={{ flex: 1 }} />
//           <View style={s.logoBadge}>
//             <Text style={s.logoText}>Mirai</Text>
//             <Text style={s.logoDot}>.</Text>
//             <Text style={s.logoJP}>JP</Text>
//           </View>
//         </View>
//       </SafeAreaView>
//       </LinearGradient>

//       <ScrollView
//         style={s.scroll}
//         contentContainerStyle={s.scrollContent}
//         showsVerticalScrollIndicator={false}
//       >
//         {/* ── Card thông tin chính ── */}
//         <View style={s.card}>
//           {/* Chữ kanji to + Hán Việt */}
//           <View style={s.headerRow}>
//             <View style={{ flex: 1 }}>
//               <Text style={s.bigKanji}>{kanji.kanji}</Text>
//               <Text style={s.bigHanViet}>{kanji.hanviet.join(' • ')}</Text>
//             </View>
//             <View style={s.headerActions}>
//               {/* Nút mở modal luyện viết */}
//               <TouchableOpacity
//                 style={[s.actionBtn, s.actionBtnActive]}
//                 onPress={() => setWritingItem(kanji)}
//                 hitSlop={6}
//               >
//                 <Text style={[s.actionIcon, s.actionIconActive]}>✎</Text>
//               </TouchableOpacity>
//               {/* Nút mở modal ghi chú */}
//               <TouchableOpacity
//                 style={[s.actionBtn, s.actionBtnActive]}
//                 onPress={() => setNotesItem(kanji)}
//                 hitSlop={6}
//               >
//                 <Text style={[s.actionIcon, s.actionIconActive]}>📋</Text>
//               </TouchableOpacity>
//               <View style={s.actionBtn}>
//                 <Text style={s.actionIcon}>＋</Text>
//               </View>
//             </View>
//           </View>

//           <View style={s.divider} />

//           {/* Phát âm */}
//           <Text style={s.sectionTitle}>Phát âm</Text>

//           {kanji.readings.kunyomi.length > 0 && (
//             <View style={s.pronRow}>
//               <Text style={s.diamond}>◆</Text>
//               <View style={{ flex: 1 }}>
//                 <Text style={s.pronLabel}>Kunyomi</Text>
//                 <Text style={s.pronValue}>{kanji.readings.kunyomi.join("、")}</Text>
//               </View>
//             </View>
//           )}

//           {kanji.readings.onyomi.length > 0 && (
//             <View style={s.pronRow}>
//               <Text style={s.diamond}>◆</Text>
//               <View style={{ flex: 1 }}>
//                 <Text style={s.pronLabel}>Onyomi</Text>
//                 <Text style={s.pronValue}>{kanji.readings.onyomi.join("、")}</Text>
//               </View>
//             </View>
//           )}

//           {/* Cách viết — từng nét được tô màu khác nhau, có đánh số thứ tự */}
//           <View style={s.strokeWrap}>
//             <KanjiStrokeOrder kanji={kanji.kanji} size={180} />
//             {/* <Text style={s.strokeHint}>
//               Mỗi màu là một nét, số bên cạnh là thứ tự viết (1 → {kanji.strokes}).
//             </Text> */}
//           </View>

//           {/* 3 cột: Số nét | JLPT | Tần suất */}
//           <View style={s.statsRow}>
//             {/* <View style={s.statCol}>
//               <View style={s.statChip}>
//                 <Text style={s.statChipText}>Số nét</Text>
//               </View>
//               <Text style={s.statValue}>{kanji.strokes}</Text>
//             </View> */}
//             <View style={s.statCol}>
//               <View style={s.statChip}>
//                 <Text style={s.statChipText}>JLPT</Text>
//               </View>
//               <Text style={s.statValue}>{kanji.jlpt}</Text>
//             </View>
//             <View style={s.statCol}>
//               <View style={s.statChip}>
//                 <Text style={s.statChipText}>Tần suất</Text>
//               </View>
//               <Text style={[s.statValue, s.statLink]}>
//                 {kanji.freq ? `#${kanji.freq}/2500` : "—"}
//               </Text>
//             </View>
//           </View>

//           <View style={s.divider} />

//           {/* Bộ thủ */}
//           <View style={s.bushuHeader}>
//             <Text style={s.sectionTitle}>Bộ</Text>
//             <Text style={s.linkText}>↗ Phân tích Kanji</Text>
//           </View>
//           {(kanji.components ?? []).map((c, i) => (
//             <View key={i} style={s.bushuRow}>
//               <View style={s.bushuBar} />
//               <Text style={s.bushuKanji}>{c.kanji}</Text>
//               {/* hanViet đã bỏ khỏi components theo cấu trúc JSON mới */}
//             </View>
//           ))}

//           <View style={s.divider} />

//           {/* Nghĩa */}
//           <Text style={s.sectionTitle}>Nghĩa</Text>
//           {kanji.meanings_vi.map((m, i) => (
//             <View key={i} style={s.meaningRow}>
//               <Text style={s.meaningDot}>•</Text>
//               <Text style={s.meaningText}>{m}</Text>
//             </View>
//           ))}

//           {/* Ví dụ — tra từ toàn bộ từ vựng (JLPT + ngành nghề) */}
//           {examples.length > 0 && (
//             <>
//               <View style={s.divider} />
//               <Text style={s.sectionTitle}>Ví dụ</Text>
//               {examples.map((ex, i) => (
//                 <View key={i} style={s.exampleRow}>
//                   <Text style={s.exampleJp}>{ex.jp}</Text>
//                   <Text style={s.exampleReading}>{ex.reading}</Text>
//                   <Text style={s.exampleVi}>→ {ex.vi}</Text>
//                 </View>
//               ))}
//             </>
//           )}
//         </View>

//         {/* Khối đóng góp ý kiến */}
//         <View style={{ paddingHorizontal: 12 }}>
//           <FeedbackSection pageKey={`kanji-detail::${kanji.id}`} />
//         </View>

//         <View style={{ height: 40 }} />
//       </ScrollView>

//       {/* ── Modal luyện viết ── */}
//       <WritingPracticeModal
//         item={writingItem}
//         onClose={() => setWritingItem(null)}
//       />

//       {/* ── Modal ghi chú ── */}
//       <KanjiNotesModal
//         item={notesItem}
//         onClose={() => setNotesItem(null)}
//       />

//       <BottomTabBar />
//     </View>
//   );
// }

// const s = StyleSheet.create({
//   root: { flex: 1, backgroundColor: "#f1f5f9" },

//   // Thanh xanh trên cùng
//   topBar: { backgroundColor: "transparent" },
//   topBarInner: {
//     flexDirection: "row",
//     alignItems: "center",
//     paddingHorizontal: 12,
//     paddingVertical: 10,
//   },
//   iconBtn: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   backIcon: { color: "#fff", fontSize: 32, fontWeight: "300", marginTop: -4 },
//   logoBadge: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 4, height: 50 },
//   logoText: { color: "#fff", fontSize: 22, fontWeight: "800" as const, letterSpacing: 0.3 },
//   logoDot:  { color: "#fff",   fontSize: 24, fontWeight: "900" as const },
//   logoJP:   { color: "#fff", fontSize: 22, fontWeight: "900" as const, letterSpacing: 0.5 },
//   topTitle: {
//     flex: 1,
//     color: "#fff",
//     fontSize: 18,
//     fontWeight: "800",
//     textAlign: "center",
//   },

//   scroll: { flex: 1 },
//   scrollContent: { padding: 12, paddingBottom: 12 },

//   // Card chứa toàn bộ thông tin Kanji
//   card: {
//     backgroundColor: "#fff",
//     borderRadius: 14,
//     padding: 16,
//     borderWidth: 1,
//     borderColor: "#e2e8f0",
//   },
//   headerRow: { flexDirection: "row", alignItems: "flex-start" },
//   bigKanji: {
//     fontSize: 42,
//     fontWeight: "800",
//     color: TEAL_DARK,
//     lineHeight: 64,
//   },
//   bigHanViet: {
//     fontSize: 18,
//     color: "#475569",
//     fontWeight: "700",
//     letterSpacing: 1,
//     marginTop: 2,
//   },
//   headerActions: { flexDirection: "row", alignItems: "center" },
//   actionBtn: {
//     width: 32,
//     height: 32,
//     borderRadius: 6,
//     borderWidth: 1,
//     borderColor: "#cbd5e1",
//     alignItems: "center",
//     justifyContent: "center",
//     marginLeft: 6,
//     backgroundColor: "#fff",
//   },
//   actionIcon: { fontSize: 14, color: "#e5eaf1" },
//   // Trạng thái active cho nút bút ✎
//   actionBtnActive: { backgroundColor: "#fff", borderColor: TEAL_DARK },
//   actionIconActive: { color: TEAL_DARK },

//   divider: {
//     height: StyleSheet.hairlineWidth,
//     backgroundColor: "#e2e8f0",
//     marginVertical: 14,
//   },

//   sectionTitle: {
//     fontSize: 16,
//     fontWeight: "800",
//     color: "#0f172a",
//     marginBottom: 10,
//   },

//   // Phát âm
//   pronRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
//   diamond: { color: TEXT_COLOR, fontSize: 16, marginRight: 8, marginTop: 4 },
//   pronLabel: { fontSize: 14, fontWeight: "700", color: TEAL },
//   pronValue: { fontSize: 20, color: TEAL_DARK, marginTop: 2 },

//   // Vùng vẽ thứ tự nét
//   strokeWrap: {
//     alignItems: "center",
//     marginVertical: 6,
//   },
//   // strokeHint: {
//   //   fontSize: 11,
//   //   color: "#94a3b8",
//   //   marginTop: 8,
//   //   textAlign: "center",
//   //   paddingHorizontal: 16,
//   // },
//   // 3 cột thông tin
//   statsRow: {
//     flexDirection: "row",
//     marginTop: 14,
//     paddingHorizontal: 4,
//   },
//   statCol: { flex: 1, alignItems: "center" },
//   statChip: {
//     paddingHorizontal: 12,
//     paddingVertical: 4,
//     borderRadius: 14,
//     borderWidth: 1,
//     borderColor: "#cbd5e1",
//     backgroundColor: "#f8fafc",
//   },
//   statChipText: { fontSize: 12, color: TEXT_COLOR, fontWeight: "600" },
//   statValue: { fontSize: 18, fontWeight: "800", color: TEAL, marginTop: 6 },
//   statLink: { color: TEAL, textDecorationLine: "underline" },

//   // Bộ thủ
//   bushuHeader: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//     marginBottom: 6,
//   },
//   linkText: { fontSize: 13, color: TEXT_COLOR, fontWeight: "600" },
//   bushuRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
//   bushuBar: {
//     width: 3,
//     height: 18,
//     backgroundColor: TEXT_COLOR,
//     marginRight: 8,
//     borderRadius: 2,
//   },
//   bushuKanji: { fontSize: 28, fontWeight: "700", color: TEAL_DARK, marginRight: 6 },
//   bushuLabel: { fontSize: 16, color: TEAL, fontWeight: "500" },

//   // Nghĩa
//   meaningRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 6 },
//   meaningDot: { fontSize: 18, color: TEXT_COLOR, marginRight: 8 },
//   meaningText: { flex: 1, fontSize: 18, color: TEAL, lineHeight: 22 },

//   // Ví dụ
//   exampleRow: { marginBottom: 10 },
//   exampleJp: { fontSize: 20, fontWeight: "700", color: "#0f172a" },
//   exampleReading: { fontSize: 18, color: TEAL, marginTop: 2 },
//   exampleVi: { fontSize: 18, color: TEAL_DARK, marginTop: 2 },

//   // Thanh dưới
//   bottomBar: {
//     backgroundColor: "#ffffff",
//     borderTopWidth: 1,
//     borderTopColor: "#e2e8f0",
//   },
//   bottomInner: {
//     flexDirection: "row",
//     alignItems: "center",
//     paddingHorizontal: 16,
//     paddingVertical: 10,
//   },
//   navArrow: {
//     width: 44,
//     height: 44,
//     borderRadius: 22,
//     borderWidth: 1,
//     borderColor: "#e2e8f0",
//     alignItems: "center",
//     justifyContent: "center",
//     backgroundColor: "#fff",
//   },
//   navArrowText: { fontSize: 26, color: "#0f172a", marginTop: -4 },
//   closeBtn: {
//     flex: 1,
//     marginHorizontal: 12,
//     height: 44,
//     borderRadius: 22,
//     backgroundColor: TEAL_DARK,
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   closeBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
//   navButtons: {
//     flexDirection: 'row',
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginTop: 16,
//     marginBottom: 8,
//     gap: 16,
//   },
//   navArrowBtn: {
//     width: 44,
//     height: 44,
//     borderRadius: 22,
//     backgroundColor: TEAL,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   navCounter: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#475569',
//   },
//   navBtnDisabled: {
//     opacity: 0.4,
//   },
// });