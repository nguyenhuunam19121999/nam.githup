// // ////4
// // // components/KanjiDetailInline.tsx
// // // PHIÊN BẢN TỐI ƯU - KHÔNG LAG LẦN ĐẦU + PRELOAD XUNG QUANH

// // import React, { useState, useEffect, useMemo, startTransition, useCallback } from 'react';
// // import {
// //   View,
// //   Text,
// //   StyleSheet,
// //   TouchableOpacity,
// //   ScrollView,
// //   ActivityIndicator,
// //   InteractionManager,
// // } from 'react-native';
// // import { KanjiStrokeOrder } from './KanjiStrokeOrder';
// // import { getKanjiByChar, type KanjiItem } from '../assets/data_JLPT_kanji';
// // import { preloader } from '../services/KanjiPreloader';

// // const TEAL = '#1F6F7A';
// // const TEAL_DARK = '#1c5765';
// // const TEXT_COLOR = '#e47b0b';

// // interface KanjiDetailInlineProps {
// //   kanjiChars: string[];
// //   initialIndex?: number;
// //   onClose?: () => void;
// // }

// // // ─── CACHE KANJI DATA (global để dùng chung toàn app) ──────────────────────
// // const kanjiDataCache = new Map<string, KanjiItem | null>();

// // function getCachedKanjiData(kanji: string): KanjiItem | null {
// //   if (kanjiDataCache.has(kanji)) {
// //     return kanjiDataCache.get(kanji) || null;
// //   }
// //   const data = getKanjiByChar(kanji) || null;
// //   kanjiDataCache.set(kanji, data);
// //   return data;
// // }

// // // ─── TabItem: React.memo, không re-render nếu props không đổi ────────────────
// // const TabItem = React.memo(({
// //   char,
// //   index,
// //   isActive,
// //   onPress,
// // }: {
// //   char: string;
// //   index: number;
// //   isActive: boolean;
// //   onPress: (idx: number) => void;
// // }) => (
// //   <TouchableOpacity
// //     style={[styles.tabItem, isActive && styles.tabItemActive]}
// //     onPress={() => onPress(index)}
// //   >
// //     <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
// //       {char}
// //     </Text>
// //   </TouchableOpacity>
// // ));

// // // ─── MemoizedStrokeOrder: dùng requestAnimationFrame thay vì InteractionManager
// // // requestAnimationFrame chỉ trễ 1 frame (~16ms) thay vì 100-300ms
// // const MemoizedStrokeOrder = React.memo(({ kanji }: { kanji: string }) => {
// //   const [renderStroke, setRenderStroke] = useState(false);

// //   useEffect(() => {
// //     setRenderStroke(false);
// //     const task = InteractionManager.runAfterInteractions(() => {
// //       const id = requestAnimationFrame(() => {
// //         setRenderStroke(true);
// //       });
// //       return () => cancelAnimationFrame(id);
// //     });
// //     return () => {
// //       task.cancel();
// //       setRenderStroke(false);
// //     };
// //   }, [kanji]);

// //   if (!renderStroke) {
// //     return (
// //       <View style={[styles.strokeWrap, { height: 180, justifyContent: 'center' }]}>
// //         <ActivityIndicator color={TEAL} />
// //       </View>
// //     );
// //   }

// //   return (
// //     <View style={styles.strokeWrap}>
// //       <KanjiStrokeOrder kanji={kanji} size={180} />
// //     </View>
// //   );
// // });

// // // ─── Skeleton cho sections đang chờ render ───────────────────────────────────
// // const SectionSkeleton = React.memo(() => (
// //   <View style={styles.skeletonWrap}>
// //     {[80, 120, 60, 100, 90].map((w, i) => (
// //       <View key={i} style={[styles.skeletonLine, { width: `${w}%` as any }]} />
// //     ))}
// //   </View>
// // ));

// // // ─── Banner "Sớm cập nhật" — hiện khi chữ không có trong CSDL ───────────────
// // const NoDataBanner = React.memo(({ char }: { char: string }) => (
// //   <View style={styles.noDataBanner}>
// //     <Text style={styles.noDataEmoji}>🔔</Text>
// //     <View style={styles.noDataTextWrap}>
// //       <Text style={styles.noDataTitle}>Sớm cập nhật</Text>
// //       <Text style={styles.noDataSub}>
// //         Chữ <Text style={styles.noDataChar}>"{char}"</Text> chưa có trong cơ sở dữ liệu.{'\n'}
// //         Chúng tôi sẽ bổ sung trong thời gian tới.
// //       </Text>
// //     </View>
// //   </View>
// // ));

// // // ════════════════════════════════════════════════════════════════════════════
// // // COMPONENT CHÍNH
// // // ════════════════════════════════════════════════════════════════════════════

// // export default function KanjiDetailInline({
// //   kanjiChars,
// //   initialIndex = 0,
// //   onClose,
// // }: KanjiDetailInlineProps) {
// //   const [currentIndex, setCurrentIndex] = useState(initialIndex);
// //   const [sectionsReady, setSectionsReady] = useState(false);

// //   const currentKanji = kanjiChars[currentIndex];
// //   const totalKanji = kanjiChars.length;

// //   // Lấy dữ liệu từ cache
// //   const kanjiData = useMemo(() => {
// //     if (!currentKanji) return null;
// //     return getCachedKanjiData(currentKanji);
// //   }, [currentKanji]);

// //   // ── PRELOAD: Các Kanji xung quanh index hiện tại ──────────────────────────
// //   useEffect(() => {
// //     if (totalKanji > 0) {
// //       preloader.preloadSurroundingKanji(kanjiChars, currentIndex, 2);
// //     }
// //   }, [currentIndex, kanjiChars, totalKanji]);

// //   // ── PHASED RENDERING ──────────────────────────────────────────────────────
// //   useEffect(() => {
// //     setSectionsReady(false);
// //     const task = InteractionManager.runAfterInteractions(() => {
// //       const id = requestAnimationFrame(() => {
// //         startTransition(() => setSectionsReady(true));
// //       });
// //     });
// //     return () => task.cancel();
// //   }, [currentKanji]);

// //   const handleIndexChange = useCallback((index: number) => {
// //     startTransition(() => setCurrentIndex(index));
// //   }, []);

// //   const goToNext = useCallback(() => {
// //     if (currentIndex + 1 < totalKanji) handleIndexChange(currentIndex + 1);
// //   }, [currentIndex, totalKanji, handleIndexChange]);

// //   const goToPrev = useCallback(() => {
// //     if (currentIndex > 0) handleIndexChange(currentIndex - 1);
// //   }, [currentIndex, handleIndexChange]);

// //   return (
// //     <View style={styles.container}>
// //       {/* Tab chuyển đổi kanji — LUÔN hiện kể cả khi không có dữ liệu */}
// //       {totalKanji > 1 && (
// //         <ScrollView
// //           horizontal
// //           showsHorizontalScrollIndicator={false}
// //           style={styles.tabBar}
// //           contentContainerStyle={{ paddingVertical: 0 }}
// //           removeClippedSubviews={true}
// //         >
// //           <View style={styles.tabContainer}>
// //             {kanjiChars.map((char, idx) => (
// //               <TabItem
// //                 key={`${char}_${idx}`}
// //                 char={char}
// //                 index={idx}
// //                 isActive={currentIndex === idx}
// //                 onPress={handleIndexChange}
// //               />
// //             ))}
// //           </View>
// //         </ScrollView>
// //       )}

// //       {/* ── Nếu không có dữ liệu: hiện banner, vẫn giữ nav bên dưới ──────── */}
// //       {!kanjiData ? (
// //         <View style={styles.noDataContainer}>
// //           <NoDataBanner char={currentKanji} />
// //         </View>
// //       ) : (
// //         <ScrollView
// //           style={styles.content}
// //           showsVerticalScrollIndicator={false}
// //           removeClippedSubviews={true}
// //         >
// //           {/* ── PHASE 1: Header + Stats — render ngay lập tức ──────────────────── */}
// //           <View style={styles.kanjiHeader}>
// //             <View style={styles.furiganaContainer}>
// //               {kanjiData.kunyomi.length > 0 && (
// //                 <Text style={styles.furiganaText}>{kanjiData.kunyomi[0]}</Text>
// //               )}
// //               {kanjiData.onyomi.length > 0 && kanjiData.kunyomi.length === 0 && (
// //                 <Text style={styles.furiganaText}>{kanjiData.onyomi[0]}</Text>
// //               )}
// //             </View>
// //             <Text style={styles.bigKanji}>{kanjiData.kanji}</Text>
// //             <Text style={styles.bigHanViet}>{kanjiData.hanViet}</Text>
// //           </View>

// //           {/* Stats row — nhẹ, render ngay cùng header */}
// //           <View style={styles.statsRow}>
// //             <View style={styles.statCol}>
// //               <View style={styles.statChip}>
// //                 <Text style={styles.statChipText}>Số nét</Text>
// //               </View>
// //               <Text style={styles.statValue}>{kanjiData.strokes}</Text>
// //             </View>
// //             <View style={styles.statCol}>
// //               <View style={styles.statChip}>
// //                 <Text style={styles.statChipText}>JLPT</Text>
// //               </View>
// //               <Text style={styles.statValue}>{kanjiData.level}</Text>
// //             </View>
// //             <View style={styles.statCol}>
// //               <View style={styles.statChip}>
// //                 <Text style={styles.statChipText}>Tần suất</Text>
// //               </View>
// //               <Text style={styles.statValue}>
// //                 {kanjiData.frequency ? `#${kanjiData.frequency}` : '—'}
// //               </Text>
// //             </View>
// //           </View>

// //           {/* ── PHASE 2: Sections nặng — chỉ render khi sectionsReady = true ── */}
// //           {!sectionsReady ? (
// //             <SectionSkeleton />
// //           ) : (
// //             <>
// //               {/* Phát âm */}
// //               <View style={styles.section}>
// //                 <Text style={styles.sectionTitle}>Phát âm</Text>
// //                 {kanjiData.kunyomi.length > 0 && (
// //                   <View style={styles.pronRow}>
// //                     <Text style={styles.diamond}>◆</Text>
// //                     <View>
// //                       <Text style={styles.pronLabel}>Kunyomi</Text>
// //                       <Text style={styles.pronValue}>
// //                         {kanjiData.kunyomi.join('、')}
// //                       </Text>
// //                     </View>
// //                   </View>
// //                 )}
// //                 {kanjiData.onyomi.length > 0 && (
// //                   <View style={styles.pronRow}>
// //                     <Text style={styles.diamond}>◆</Text>
// //                     <View>
// //                       <Text style={styles.pronLabel}>Onyomi</Text>
// //                       <Text style={styles.pronValue}>
// //                         {kanjiData.onyomi.join('、')}
// //                       </Text>
// //                     </View>
// //                   </View>
// //                 )}
// //               </View>

// //               {/* Thứ tự nét */}
// //               <View style={styles.section}>
// //                 <Text style={styles.sectionTitle}>Thứ tự nét</Text>
// //                 <MemoizedStrokeOrder kanji={kanjiData.kanji} />
// //               </View>

// //               {/* Bộ thủ & Phân tích */}
// //               {kanjiData.components && kanjiData.components.length > 0 && (
// //                 <View style={styles.section}>
// //                   <Text style={styles.sectionTitle}>Bộ & Phân tích</Text>
// //                   {kanjiData.components.map((comp, idx) => (
// //                     <View key={`${comp.kanji}_${idx}`} style={styles.componentRow}>
// //                       <View style={styles.componentBar} />
// //                       <Text style={styles.componentKanji}>{comp.kanji}</Text>
// //                       <Text style={styles.componentHanViet}>
// //                         「{comp.hanViet}」
// //                       </Text>
// //                     </View>
// //                   ))}
// //                 </View>
// //               )}

// //               {/* Nghĩa */}
// //               <View style={styles.section}>
// //                 <Text style={styles.sectionTitle}>Nghĩa</Text>
// //                 {kanjiData.meanings.map((m, idx) => (
// //                   <View key={idx} style={styles.meaningRow}>
// //                     <Text style={styles.meaningDot}>•</Text>
// //                     <Text style={styles.meaningText}>{m}</Text>
// //                   </View>
// //                 ))}
// //               </View>

// //               {/* Ví dụ */}
// //               {kanjiData.examples && kanjiData.examples.length > 0 && (
// //                 <View style={styles.section}>
// //                   <Text style={styles.sectionTitle}>Ví dụ</Text>
// //                   {kanjiData.examples.map((ex, idx) => (
// //                     <View key={idx} style={styles.exampleBox}>
// //                       <Text style={styles.exampleJp}>{ex.jp}</Text>
// //                       <Text style={styles.exampleReading}>{ex.reading}</Text>
// //                       <Text style={styles.exampleVi}>→ {ex.vi}</Text>
// //                     </View>
// //                   ))}
// //                 </View>
// //               )}
// //             </>
// //           )}

// //           <View style={{ height: 30 }} />
// //         </ScrollView>
// //       )}

// //       {/* Nút điều hướng — LUÔN hiện kể cả khi không có dữ liệu */}
// //       {totalKanji > 1 && (
// //         <View style={styles.navButtons}>
// //           <TouchableOpacity
// //             style={[styles.navBtn, currentIndex === 0 && styles.navBtnDisabled]}
// //             onPress={goToPrev}
// //             disabled={currentIndex === 0}
// //           >
// //             <Text style={styles.navBtnText}>◀ Trước</Text>
// //           </TouchableOpacity>
// //           <Text style={styles.navCounter}>
// //             {currentIndex + 1} / {totalKanji}
// //           </Text>
// //           <TouchableOpacity
// //             style={[
// //               styles.navBtn,
// //               currentIndex === totalKanji - 1 && styles.navBtnDisabled,
// //             ]}
// //             onPress={goToNext}
// //             disabled={currentIndex === totalKanji - 1}
// //           >
// //             <Text style={styles.navBtnText}>Sau ▶</Text>
// //           </TouchableOpacity>
// //         </View>
// //       )}
// //     </View>
// //   );
// // }

// // // ─── STYLES ───────────────────────────────────────────────────────────────────
// // const styles = StyleSheet.create({
// //   container: {
// //     flex: 1,
// //     backgroundColor: '#fff',
// //   },
// //   tabBar: {
// //     maxHeight: 50,
// //     borderBottomWidth: 1,
// //     borderColor: '#eee',
// //   },
// //   tabContainer: {
// //     flexDirection: 'row',
// //     paddingHorizontal: 10,
// //   },
// //   tabItem: {
// //     paddingHorizontal: 15,
// //     paddingVertical: 12,
// //     borderBottomWidth: 2,
// //     borderBottomColor: 'transparent',
// //   },
// //   tabItemActive: {
// //     borderBottomColor: TEAL,
// //   },
// //   tabText: {
// //     fontSize: 16,
// //     color: '#666',
// //   },
// //   tabTextActive: {
// //     color: TEAL,
// //     fontWeight: 'bold',
// //   },
// //   content: {
// //     flex: 1,
// //     padding: 15,
// //   },
// //   kanjiHeader: {
// //     alignItems: 'center',
// //     marginBottom: 20,
// //   },
// //   furiganaContainer: {
// //     height: 20,
// //     justifyContent: 'center',
// //   },
// //   furiganaText: {
// //     fontSize: 14,
// //     color: '#666',
// //   },
// //   bigKanji: {
// //     fontSize: 70,
// //     fontWeight: 'bold',
// //     color: '#333',
// //     marginVertical: 5,
// //   },
// //   bigHanViet: {
// //     fontSize: 20,
// //     color: TEXT_COLOR,
// //     fontWeight: 'bold',
// //     textTransform: 'uppercase',
// //   },
// //   statsRow: {
// //     flexDirection: 'row',
// //     justifyContent: 'space-around',
// //     marginBottom: 20,
// //     backgroundColor: '#f9f9f9',
// //     padding: 10,
// //     borderRadius: 8,
// //   },
// //   statCol: {
// //     alignItems: 'center',
// //   },
// //   statChip: {
// //     backgroundColor: TEAL,
// //     paddingHorizontal: 10,
// //     paddingVertical: 4,
// //     borderRadius: 12,
// //     marginBottom: 5,
// //   },
// //   statChipText: {
// //     color: '#fff',
// //     fontSize: 11,
// //     fontWeight: 'bold',
// //   },
// //   statValue: {
// //     fontSize: 16,
// //     fontWeight: 'bold',
// //     color: '#333',
// //   },
// //   skeletonWrap: {
// //     paddingTop: 16,
// //     paddingHorizontal: 4,
// //     gap: 12,
// //   },
// //   skeletonLine: {
// //     height: 14,
// //     backgroundColor: '#e2e8f0',
// //     borderRadius: 7,
// //     opacity: 0.6,
// //   },
// //   section: {
// //     marginBottom: 25,
// //   },
// //   sectionTitle: {
// //     fontSize: 18,
// //     fontWeight: 'bold',
// //     color: TEAL,
// //     marginBottom: 10,
// //     borderBottomWidth: 1,
// //     borderBottomColor: '#eee',
// //     paddingBottom: 5,
// //   },
// //   pronRow: {
// //     flexDirection: 'row',
// //     alignItems: 'flex-start',
// //     marginBottom: 8,
// //   },
// //   diamond: {
// //     color: TEAL,
// //     marginRight: 8,
// //     fontSize: 12,
// //     marginTop: 2,
// //   },
// //   pronLabel: {
// //     fontSize: 12,
// //     color: '#999',
// //   },
// //   pronValue: {
// //     fontSize: 16,
// //     color: '#333',
// //     fontWeight: '500',
// //   },
// //   strokeWrap: {
// //     alignItems: 'center',
// //     padding: 10,
// //     backgroundColor: '#fcfcfc',
// //     borderRadius: 8,
// //     borderWidth: 1,
// //     borderColor: '#eee',
// //   },
// //   componentRow: {
// //     flexDirection: 'row',
// //     alignItems: 'center',
// //     marginBottom: 8,
// //     paddingLeft: 8,
// //   },
// //   componentBar: {
// //     width: 3,
// //     height: 20,
// //     backgroundColor: TEAL,
// //     borderRadius: 2,
// //     marginRight: 10,
// //   },
// //   componentKanji: {
// //     fontSize: 20,
// //     fontWeight: 'bold',
// //     color: '#333',
// //     marginRight: 8,
// //   },
// //   componentHanViet: {
// //     fontSize: 14,
// //     color: '#666',
// //   },
// //   meaningRow: {
// //     flexDirection: 'row',
// //     alignItems: 'flex-start',
// //     marginBottom: 6,
// //   },
// //   meaningDot: {
// //     color: TEAL,
// //     marginRight: 8,
// //     fontSize: 16,
// //     lineHeight: 22,
// //   },
// //   meaningText: {
// //     fontSize: 15,
// //     color: '#444',
// //     flex: 1,
// //     lineHeight: 22,
// //   },
// //   exampleBox: {
// //     backgroundColor: '#f8fafc',
// //     borderRadius: 8,
// //     padding: 12,
// //     marginBottom: 10,
// //     borderLeftWidth: 3,
// //     borderLeftColor: TEAL,
// //   },
// //   exampleJp: {
// //     fontSize: 16,
// //     color: '#1e293b',
// //     fontWeight: '600',
// //     marginBottom: 4,
// //   },
// //   exampleReading: {
// //     fontSize: 13,
// //     color: '#64748b',
// //     marginBottom: 4,
// //   },
// //   exampleVi: {
// //     fontSize: 14,
// //     color: '#475569',
// //   },
// //   navButtons: {
// //     flexDirection: 'row',
// //     justifyContent: 'space-between',
// //     alignItems: 'center',
// //     padding: 12,
// //     borderTopWidth: 1,
// //     borderTopColor: '#eee',
// //     backgroundColor: '#fff',
// //   },
// //   navBtn: {
// //     paddingHorizontal: 20,
// //     paddingVertical: 10,
// //     backgroundColor: TEAL,
// //     borderRadius: 8,
// //   },
// //   navBtnDisabled: {
// //     backgroundColor: '#cbd5e1',
// //   },
// //   navBtnText: {
// //     color: '#fff',
// //     fontWeight: '700',
// //     fontSize: 14,
// //   },
// //   navCounter: {
// //     fontSize: 15,
// //     color: '#64748b',
// //     fontWeight: '600',
// //   },
// //   noDataContainer: {
// //     flex: 1,
// //     justifyContent: 'center',
// //     alignItems: 'center',
// //     padding: 24,
// //   },
// //   noDataBanner: {
// //     flexDirection: 'row',
// //     alignItems: 'flex-start',
// //     backgroundColor: '#fff7ed',
// //     borderRadius: 16,
// //     borderWidth: 1,
// //     borderColor: '#fed7aa',
// //     padding: 20,
// //     gap: 14,
// //     maxWidth: 340,
// //     width: '100%',
// //   },
// //   noDataEmoji: {
// //     fontSize: 32,
// //     marginTop: 2,
// //   },
// //   noDataTextWrap: {
// //     flex: 1,
// //   },
// //   noDataTitle: {
// //     fontSize: 16,
// //     fontWeight: '800',
// //     color: '#c2410c',
// //     marginBottom: 6,
// //   },
// //   noDataSub: {
// //     fontSize: 13,
// //     color: '#7c3aed',
// //     lineHeight: 20,
// //   },
// //   noDataChar: {
// //     fontWeight: '800',
// //     color: TEAL,
// //   },
// // });


// // ////3
// // KanjiDetailInline — PHIÊN BẢN TỐI ƯU
// //
// // Fix trong phiên bản này:
// //   1. Thay InteractionManager → requestAnimationFrame (nhanh hơn ~10-20x)
// //   2. Khi không có dữ liệu: hiện banner "Sớm cập nhật" ngay trong content,
// //      giữ nguyên tab bar + nút điều hướng để user chuyển sang chữ khác
// //   3. Banner tự tắt khi chuyển sang chữ có dữ liệu

// import React, {
//   useState,
//   useEffect,
//   useRef,
//   useTransition,
//   startTransition,
// } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   ScrollView,
//   ActivityIndicator,
//   Animated,
// } from 'react-native';
// import { KanjiStrokeOrder } from './KanjiStrokeOrder';
// import { getKanjiByChar, type KanjiItem } from '../assets/data_JLPT_kanji';

// const TEAL = '#1F6F7A';
// const TEAL_DARK = '#1c5765';
// const TEXT_COLOR = '#e47b0b';

// interface KanjiDetailInlineProps {
//   kanjiChars: string[];
//   initialIndex?: number;
//   onClose?: () => void;
// }

// // ─── TabItem: React.memo, không re-render nếu props không đổi ────────────────
// const TabItem = React.memo(
//   ({
//     char,
//     index,
//     isActive,
//     onPress,
//   }: {
//     char: string;
//     index: number;
//     isActive: boolean;
//     onPress: (idx: number) => void;
//   }) => (
//     <TouchableOpacity
//       style={[styles.tabItem, isActive && styles.tabItemActive]}
//       onPress={() => onPress(index)}
//     >
//       <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
//         {char}
//       </Text>
//     </TouchableOpacity>
//   )
// );

// // ─── MemoizedStrokeOrder: dùng requestAnimationFrame thay InteractionManager ──
// // requestAnimationFrame chỉ trễ 1 frame (~16ms) thay vì 100-300ms
// const MemoizedStrokeOrder = React.memo(({ kanji }: { kanji: string }) => {
//   const [renderStroke, setRenderStroke] = useState(false);

//   useEffect(() => {
//     setRenderStroke(false);
//     const id = requestAnimationFrame(() => {
//       setRenderStroke(true);
//     });
//     return () => {
//       cancelAnimationFrame(id);
//       setRenderStroke(false);
//     };
//   }, [kanji]);

//   if (!renderStroke) {
//     return (
//       <View style={[styles.strokeWrap, { height: 180, justifyContent: 'center' }]}>
//         <ActivityIndicator color={TEAL} />
//       </View>
//     );
//   }

//   return (
//     <View style={styles.strokeWrap}>
//       <KanjiStrokeOrder kanji={kanji} size={180} />
//     </View>
//   );
// });

// // ─── Skeleton cho sections đang chờ render ───────────────────────────────────
// const SectionSkeleton = React.memo(() => (
//   <View style={styles.skeletonWrap}>
//     {[80, 120, 60].map((w, i) => (
//       <View key={i} style={[styles.skeletonLine, { width: `${w}%` as any }]} />
//     ))}
//   </View>
// ));

// // ─── Banner "Sớm cập nhật" — hiện khi chữ không có trong CSDL ───────────────
// const NoDataBanner = React.memo(({ char }: { char: string }) => {
//   const fadeAnim = useRef(new Animated.Value(0)).current;

//   useEffect(() => {
//     Animated.timing(fadeAnim, {
//       toValue: 1,
//       duration: 250,
//       useNativeDriver: true,
//     }).start();
//   }, []);

//   return (
//     <Animated.View style={[styles.noDataBanner, { opacity: fadeAnim }]}>
//       <Text style={styles.noDataEmoji}>🔔</Text>
//       <View style={styles.noDataTextWrap}>
//         <Text style={styles.noDataTitle}>Sớm cập nhật</Text>
//         <Text style={styles.noDataSub}>
//           Chữ <Text style={styles.noDataChar}>"{char}"</Text> chưa có trong cơ sở dữ liệu.{'\n'}
//           Chúng tôi sẽ bổ sung trong thời gian tới.
//         </Text>
//       </View>
//     </Animated.View>
//   );
// });

// // ════════════════════════════════════════════════════════════════════════════
// // COMPONENT CHÍNH
// // ════════════════════════════════════════════════════════════════════════════

// export default function KanjiDetailInline({
//   kanjiChars,
//   initialIndex = 0,
// }: KanjiDetailInlineProps) {
//   const [currentIndex, setCurrentIndex] = useState(initialIndex);

//   // ── PHASED RENDERING ──────────────────────────────────────────────────────
//   // sectionsReady = false → chỉ render Header + Stats (nhẹ, < 1 frame)
//   // sectionsReady = true  → render toàn bộ sections (sau requestAnimationFrame)
//   const [sectionsReady, setSectionsReady] = useState(false);

//   const currentKanji = kanjiChars[currentIndex];
//   const totalKanji = kanjiChars.length;

//   // Sync dữ liệu kanji — useMemo để không re-compute khi re-render khác
//   const [kanjiData, setKanjiData] = useState<KanjiItem | null>(null);

//   useEffect(() => {
//     setKanjiData(null); // reset ngay → hiện skeleton
//     const id = requestAnimationFrame(() => {
//       setKanjiData(getKanjiByChar(currentKanji) || null);
//     });
//     return () => cancelAnimationFrame(id);
//   }, [currentKanji]);

//   // Khi currentKanji thay đổi: reset sections, dùng requestAnimationFrame
//   // (nhanh hơn InteractionManager ~10-20x: 1 frame ~16ms thay vì 100-300ms)
//   useEffect(() => {
//     setSectionsReady(false);
//     const id = requestAnimationFrame(() => {
//       startTransition(() => setSectionsReady(true));
//     });
//     return () => cancelAnimationFrame(id);
//   }, [currentKanji]);

//   const handleIndexChange = (index: number) => {
//     startTransition(() => setCurrentIndex(index));
//   };

//   const goToNext = () => {
//     if (currentIndex + 1 < totalKanji) handleIndexChange(currentIndex + 1);
//   };
//   const goToPrev = () => {
//     if (currentIndex > 0) handleIndexChange(currentIndex - 1);
//   };

//   return (
//     <View style={styles.container}>
//       {/* Tab chuyển đổi kanji — LUÔN hiện kể cả khi không có dữ liệu */}
//       {totalKanji > 1 && (
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           style={styles.tabBar}
//           contentContainerStyle={{ paddingVertical: 0 }}
//           removeClippedSubviews={true}
//         >
//           <View style={styles.tabContainer}>
//             {kanjiChars.map((char, idx) => (
//               <TabItem
//                 key={`${char}_${idx}`}
//                 char={char}
//                 index={idx}
//                 isActive={currentIndex === idx}
//                 onPress={handleIndexChange}
//               />
//             ))}
//           </View>
//         </ScrollView>
//       )}

//       {/* ── Nếu không có dữ liệu: hiện banner, vẫn giữ nav bên dưới ──────── */}
//       {!kanjiData ? (
//         <View style={styles.noDataContainer}>
//           <NoDataBanner char={currentKanji} />
//         </View>
//       ) : (
//         <ScrollView
//           style={styles.content}
//           showsVerticalScrollIndicator={false}
//           removeClippedSubviews={true}
//         >
//           {/* ── PHASE 1: Header — render ngay lập tức ──────────────────────── */}
//           <View style={styles.kanjiHeader}>
//             <View style={styles.furiganaContainer}>
//               {kanjiData.kunyomi.length > 0 && (
//                 <Text style={styles.furiganaText}>{kanjiData.kunyomi[0]}</Text>
//               )}
//               {kanjiData.onyomi.length > 0 &&
//                 kanjiData.kunyomi.length === 0 && (
//                   <Text style={styles.furiganaText}>{kanjiData.onyomi[0]}</Text>
//                 )}
//             </View>
//             <Text style={styles.bigKanji}>{kanjiData.kanji}</Text>
//             <Text style={styles.bigHanViet}>{kanjiData.hanViet}</Text>
//           </View>

//           {/* Stats row — nhẹ, render ngay cùng header */}
//           <View style={styles.statsRow}>
//             {/* <View style={styles.statCol}>
//               <View style={styles.statChip}>
//                 <Text style={styles.statChipText}>Số nét</Text>
//               </View>
//               <Text style={styles.statValue}>{kanjiData.strokes}</Text>
//             </View> */}
//             <View style={styles.statCol}>
//               <View style={styles.statChip}>
//                 <Text style={styles.statChipText}>JLPT</Text>
//               </View>
//               <Text style={styles.statValue}>{kanjiData.level}</Text>
//             </View>
//             <View style={styles.statCol}>
//               <View style={styles.statChip}>
//                 <Text style={styles.statChipText}>Tần suất</Text>
//               </View>
//               <Text style={styles.statValue}>
//                 {kanjiData.frequency ? `#${kanjiData.frequency}` : '—'}
//               </Text>
//             </View>
//           </View>

//           {/* ── PHASE 2: Sections nặng — chỉ render khi sectionsReady = true */}
//           {!sectionsReady ? (
//             <SectionSkeleton />
//           ) : (
//             <>
//               {/* Phát âm */}
//               <View style={styles.section}>
//                 <Text style={styles.sectionTitle}>Phát âm</Text>
//                 {kanjiData.kunyomi.length > 0 && (
//                   <View style={styles.pronRow}>
//                     <Text style={styles.diamond}>◆</Text>
//                     <View>
//                       <Text style={styles.pronLabel}>Kunyomi</Text>
//                       <Text style={styles.pronValue}>
//                         {kanjiData.kunyomi.join('、')}
//                       </Text>
//                     </View>
//                   </View>
//                 )}
//                 {kanjiData.onyomi.length > 0 && (
//                   <View style={styles.pronRow}>
//                     <Text style={styles.diamond}>◆</Text>
//                     <View>
//                       <Text style={styles.pronLabel}>Onyomi</Text>
//                       <Text style={styles.pronValue}>
//                         {kanjiData.onyomi.join('、')}
//                       </Text>
//                     </View>
//                   </View>
//                 )}
//               </View>

//               {/* Thứ tự nét */}
//               <View style={styles.section}>
//                 <Text style={styles.sectionTitle}>Thứ tự nét</Text>
//                 <MemoizedStrokeOrder kanji={kanjiData.kanji} />
//               </View>

//               {/* Bộ thủ & Phân tích */}
//               {kanjiData.components && kanjiData.components.length > 0 && (
//                 <View style={styles.section}>
//                   <Text style={styles.sectionTitle}>Bộ & Phân tích</Text>
//                   {kanjiData.components.map((comp, idx) => (
//                     <View key={`${comp.kanji}_${idx}`} style={styles.componentRow}>
//                       <View style={styles.componentBar} />
//                       <Text style={styles.componentKanji}>{comp.kanji}</Text>
//                       <Text style={styles.componentHanViet}>
//                         「{comp.hanViet}」
//                       </Text>
//                     </View>
//                   ))}
//                 </View>
//               )}

//               {/* Nghĩa */}
//               <View style={styles.section}>
//                 <Text style={styles.sectionTitle}>Nghĩa</Text>
//                 {kanjiData.meanings.map((m, idx) => (
//                   <View key={idx} style={styles.meaningRow}>
//                     <Text style={styles.meaningDot}>•</Text>
//                     <Text style={styles.meaningText}>{m}</Text>
//                   </View>
//                 ))}
//               </View>

//               {/* Ví dụ */}
//               {kanjiData.examples && kanjiData.examples.length > 0 && (
//                 <View style={styles.section}>
//                   <Text style={styles.sectionTitle}>Ví dụ</Text>
//                   {kanjiData.examples.map((ex, idx) => (
//                     <View key={idx} style={styles.exampleBox}>
//                       <Text style={styles.exampleJp}>{ex.jp}</Text>
//                       <Text style={styles.exampleReading}>{ex.reading}</Text>
//                       <Text style={styles.exampleVi}>→ {ex.vi}</Text>
//                     </View>
//                   ))}
//                 </View>
//               )}
//             </>
//           )}

//           <View style={{ height: 30 }} />
//         </ScrollView>
//       )}

//       {/* Nút điều hướng — LUÔN hiện kể cả khi không có dữ liệu */}
//       {totalKanji > 1 && (
//         <View style={styles.navButtons}>
//           <TouchableOpacity
//             style={[styles.navBtn, currentIndex === 0 && styles.navBtnDisabled]}
//             onPress={goToPrev}
//             disabled={currentIndex === 0}
//           >
//             <Text style={styles.navBtnText}>◀ Trước</Text>
//           </TouchableOpacity>
//           <Text style={styles.navCounter}>
//             {currentIndex + 1} / {totalKanji}
//           </Text>
//           <TouchableOpacity
//             style={[
//               styles.navBtn,
//               currentIndex === totalKanji - 1 && styles.navBtnDisabled,
//             ]}
//             onPress={goToNext}
//             disabled={currentIndex === totalKanji - 1}
//           >
//             <Text style={styles.navBtnText}>Sau ▶</Text>
//           </TouchableOpacity>
//         </View>
//       )}
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#fff',
//   },
//   tabBar: {
//     maxHeight: 50,
//     borderBottomWidth: 1,
//     borderColor: '#eee',
//   },
//   tabContainer: { flexDirection: 'row', paddingHorizontal: 10 },
//   tabItem: {
//     paddingHorizontal: 15,
//     paddingVertical: 12,
//     borderBottomWidth: 2,
//     borderBottomColor: 'transparent',
//   },
//   tabItemActive: { borderBottomColor: TEAL },
//   tabText: { fontSize: 16, color: '#666' },
//   tabTextActive: { color: TEAL, fontWeight: 'bold' },
//   content: { flex: 1, padding: 15 },
//   kanjiHeader: { alignItems: 'center', marginBottom: 20 },
//   furiganaContainer: { height: 20, justifyContent: 'center' },
//   furiganaText: { fontSize: 14, color: '#666' },
//   bigKanji: {
//     fontSize: 70,
//     fontWeight: 'bold',
//     color: '#333',
//     marginVertical: 5,
//   },
//   bigHanViet: {
//     fontSize: 20,
//     color: TEXT_COLOR,
//     fontWeight: 'bold',
//     textTransform: 'uppercase',
//   },
//   statsRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//     marginBottom: 20,
//     backgroundColor: '#f9f9f9',
//     padding: 10,
//     borderRadius: 8,
//   },
//   statCol: { alignItems: 'center' },
//   statChip: {
//     backgroundColor: TEAL,
//     paddingHorizontal: 10,
//     paddingVertical: 4,
//     borderRadius: 12,
//     marginBottom: 5,
//   },
//   statChipText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
//   statValue: { fontSize: 16, fontWeight: 'bold', color: '#333' },
//   // Skeleton
//   skeletonWrap: { paddingTop: 16, paddingHorizontal: 4, gap: 12 },
//   skeletonLine: {
//     height: 14,
//     backgroundColor: '#e2e8f0',
//     borderRadius: 7,
//     opacity: 0.6,
//   },
//   // Sections
//   section: { marginBottom: 25 },
//   sectionTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: TEAL,
//     marginBottom: 10,
//     borderBottomWidth: 1,
//     borderBottomColor: '#eee',
//     paddingBottom: 5,
//   },
//   pronRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
//   diamond: { color: TEAL, marginRight: 8, fontSize: 12, marginTop: 2 },
//   pronLabel: { fontSize: 12, color: '#999' },
//   pronValue: { fontSize: 16, color: '#333', fontWeight: '500' },
//   strokeWrap: {
//     alignItems: 'center',
//     padding: 10,
//     backgroundColor: '#fcfcfc',
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: '#eee',
//   },
//   componentRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 8,
//     paddingLeft: 8,
//   },
//   componentBar: {
//     width: 3,
//     height: 20,
//     backgroundColor: TEAL,
//     borderRadius: 2,
//     marginRight: 10,
//   },
//   componentKanji: { fontSize: 20, fontWeight: 'bold', color: '#333', marginRight: 8 },
//   componentHanViet: { fontSize: 14, color: '#666' },
//   meaningRow: { flexDirection: 'row', marginBottom: 6, alignItems: 'flex-start' },
//   meaningDot: { color: TEAL, marginRight: 8, fontSize: 16, lineHeight: 22 },
//   meaningText: { fontSize: 15, color: '#444', flex: 1, lineHeight: 22 },
//   exampleBox: {
//     backgroundColor: '#f8fafc',
//     borderRadius: 8,
//     padding: 12,
//     marginBottom: 10,
//     borderLeftWidth: 3,
//     borderLeftColor: TEAL,
//   },
//   exampleJp: { fontSize: 16, color: '#1e293b', fontWeight: '600', marginBottom: 4 },
//   exampleReading: { fontSize: 13, color: '#64748b', marginBottom: 4 },
//   exampleVi: { fontSize: 14, color: '#475569' },
//   navButtons: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     padding: 12,
//     borderTopWidth: 1,
//     borderTopColor: '#eee',
//     backgroundColor: '#fff',
//   },
//   navBtn: {
//     paddingHorizontal: 20,
//     paddingVertical: 10,
//     backgroundColor: TEAL,
//     borderRadius: 8,
//   },
//   navBtnDisabled: { backgroundColor: '#cbd5e1' },
//   navBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
//   navCounter: { fontSize: 15, color: '#64748b', fontWeight: '600' },

//   // Banner "Sớm cập nhật"
//   noDataContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     padding: 24,
//   },
//   noDataBanner: {
//     flexDirection: 'row',
//     alignItems: 'flex-start',
//     backgroundColor: '#fff7ed',
//     borderRadius: 16,
//     borderWidth: 1,
//     borderColor: '#fed7aa',
//     padding: 20,
//     gap: 14,
//     maxWidth: 340,
//     width: '100%',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.07,
//     shadowRadius: 8,
//     elevation: 3,
//   },
//   noDataEmoji: { fontSize: 32, marginTop: 2 },
//   noDataTextWrap: { flex: 1 },
//   noDataTitle: {
//     fontSize: 16,
//     fontWeight: '800',
//     color: '#c2410c',
//     marginBottom: 6,
//   },
//   noDataSub: {
//     fontSize: 13,
//     color: '#7c3aed',
//     lineHeight: 20,
//   },
//   noDataChar: {
//     fontWeight: '800',
//     color: TEAL,
//   },
// });



// /////2
// // // KanjiDetailInline — PHIÊN BẢN TỐI ƯU
// // //
// // // Nguyên nhân lag gốc:
// // //   - Tất cả sections (phát âm, nét, bộ thủ, nghĩa, ví dụ) render cùng lúc khi mount
// // //   - Block JS thread ~30-80ms tùy lượng ví dụ/components
// // //
// // // Fix được áp dụng:
// // //   1. PHASED RENDERING: Header hiện ngay (< 1 frame), sections còn lại
// // //      render SAU khi InteractionManager xác nhận UI đã ổn định
// // //   2. startTransition cho chuyển tab (giữ nguyên từ bản cũ)
// // //   3. React.memo cho TabItem (giữ nguyên từ bản cũ)
// // //   4. MemoizedStrokeOrder với InteractionManager (giữ nguyên từ bản cũ)

// // import React, {
// //   useState,
// //   useEffect,
// //   useMemo,
// //   useTransition,
// //   startTransition,
// // } from 'react';
// // import {
// //   View,
// //   Text,
// //   StyleSheet,
// //   TouchableOpacity,
// //   ScrollView,
// //   ActivityIndicator,
// //   InteractionManager,
// // } from 'react-native';
// // import { KanjiStrokeOrder } from './KanjiStrokeOrder';
// // import { getKanjiByChar, type KanjiItem } from '../assets/data_JLPT_kanji';

// // const TEAL = '#1F6F7A';
// // const TEAL_DARK = '#1c5765';
// // const TEXT_COLOR = '#e47b0b';

// // interface KanjiDetailInlineProps {
// //   kanjiChars: string[];
// //   initialIndex?: number;
// //   onClose?: () => void;
// // }

// // // ─── TabItem: React.memo, không re-render nếu props không đổi ────────────────
// // const TabItem = React.memo(
// //   ({
// //     char,
// //     index,
// //     isActive,
// //     onPress,
// //   }: {
// //     char: string;
// //     index: number;
// //     isActive: boolean;
// //     onPress: (idx: number) => void;
// //   }) => (
// //     <TouchableOpacity
// //       style={[styles.tabItem, isActive && styles.tabItemActive]}
// //       onPress={() => onPress(index)}
// //     >
// //       <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
// //         {char}
// //       </Text>
// //     </TouchableOpacity>
// //   )
// // );

// // // ─── MemoizedStrokeOrder: defer render nét bút đến sau animation ─────────────
// // const MemoizedStrokeOrder = React.memo(({ kanji }: { kanji: string }) => {
// //   const [renderStroke, setRenderStroke] = useState(false);

// //   useEffect(() => {
// //     const task = InteractionManager.runAfterInteractions(() => {
// //       setRenderStroke(true);
// //     });
// //     return () => {
// //       task.cancel();
// //       setRenderStroke(false);
// //     };
// //   }, [kanji]);

// //   if (!renderStroke) {
// //     return (
// //       <View style={[styles.strokeWrap, { height: 180, justifyContent: 'center' }]}>
// //         <ActivityIndicator color={TEAL} />
// //       </View>
// //     );
// //   }

// //   return (
// //     <View style={styles.strokeWrap}>
// //       <KanjiStrokeOrder kanji={kanji} size={180} />
// //     </View>
// //   );
// // });

// // // ─── Skeleton cho sections đang chờ render ───────────────────────────────────
// // const SectionSkeleton = React.memo(() => (
// //   <View style={styles.skeletonWrap}>
// //     {[80, 120, 60].map((w, i) => (
// //       <View key={i} style={[styles.skeletonLine, { width: `${w}%` as any }]} />
// //     ))}
// //   </View>
// // ));

// // // ════════════════════════════════════════════════════════════════════════════
// // // COMPONENT CHÍNH
// // // ════════════════════════════════════════════════════════════════════════════

// // export default function KanjiDetailInline({
// //   kanjiChars,
// //   initialIndex = 0,
// // }: KanjiDetailInlineProps) {
// //   const [currentIndex, setCurrentIndex] = useState(initialIndex);

// //   // ── PHASED RENDERING ──────────────────────────────────────────────────────
// //   // sectionsReady = false → chỉ render Header + Stats (nhẹ, < 1 frame)
// //   // sectionsReady = true  → render toàn bộ sections (sau khi UI ổn định)
// //   const [sectionsReady, setSectionsReady] = useState(false);

// //   const currentKanji = kanjiChars[currentIndex];
// //   const totalKanji = kanjiChars.length;

// //   // Sync dữ liệu kanji — useMemo để không re-compute khi re-render khác
// //   const kanjiData = useMemo(() => {
// //     if (!currentKanji) return null;
// //     return getKanjiByChar(currentKanji) || null;
// //   }, [currentKanji]);

// //   // Khi currentKanji thay đổi (chuyển tab): reset sections, defer lại
// //   useEffect(() => {
// //     setSectionsReady(false);

// //     const task = InteractionManager.runAfterInteractions(() => {
// //       // startTransition: React ưu tiên animation/input, render sections sau
// //       startTransition(() => setSectionsReady(true));
// //     });

// //     return () => task.cancel();
// //   }, [currentKanji]);

// //   const handleIndexChange = (index: number) => {
// //     // startTransition: chuyển tab không block scroll/touch
// //     startTransition(() => setCurrentIndex(index));
// //   };

// //   const goToNext = () => {
// //     if (currentIndex + 1 < totalKanji) handleIndexChange(currentIndex + 1);
// //   };
// //   const goToPrev = () => {
// //     if (currentIndex > 0) handleIndexChange(currentIndex - 1);
// //   };

// //   if (!kanjiData) {
// //     return (
// //       <View style={styles.errorContainer}>
// //         <Text style={styles.errorText}>
// //           Không tìm thấy dữ liệu cho chữ "{currentKanji}"
// //         </Text>
// //       </View>
// //     );
// //   }

// //   return (
// //     <View style={styles.container}>
// //       {/* Tab chuyển đổi kanji */}
// //       {totalKanji > 1 && (
// //         <ScrollView
// //           horizontal
// //           showsHorizontalScrollIndicator={false}
// //           style={styles.tabBar}
// //           contentContainerStyle={{ paddingVertical: 0 }}
// //           removeClippedSubviews={true}
// //         >
// //           <View style={styles.tabContainer}>
// //             {kanjiChars.map((char, idx) => (
// //               <TabItem
// //                 key={`${char}_${idx}`}
// //                 char={char}
// //                 index={idx}
// //                 isActive={currentIndex === idx}
// //                 onPress={handleIndexChange}
// //               />
// //             ))}
// //           </View>
// //         </ScrollView>
// //       )}

// //       <ScrollView
// //         style={styles.content}
// //         showsVerticalScrollIndicator={false}
// //         // removeClippedSubviews giúp unmount section ngoài viewport
// //         removeClippedSubviews={true}
// //       >
// //         {/* ── PHASE 1: Header — render ngay lập tức ────────────────────────
// //             Người dùng thấy kanji + đọc ngay, không cảm giác lag           */}
// //         <View style={styles.kanjiHeader}>
// //           <View style={styles.furiganaContainer}>
// //             {kanjiData.kunyomi.length > 0 && (
// //               <Text style={styles.furiganaText}>{kanjiData.kunyomi[0]}</Text>
// //             )}
// //             {kanjiData.onyomi.length > 0 &&
// //               kanjiData.kunyomi.length === 0 && (
// //                 <Text style={styles.furiganaText}>{kanjiData.onyomi[0]}</Text>
// //               )}
// //           </View>
// //           <Text style={styles.bigKanji}>{kanjiData.kanji}</Text>
// //           <Text style={styles.bigHanViet}>{kanjiData.hanViet}</Text>
// //         </View>

// //         {/* Stats row — nhẹ, render ngay cùng header */}
// //         <View style={styles.statsRow}>
// //           <View style={styles.statCol}>
// //             <View style={styles.statChip}>
// //               <Text style={styles.statChipText}>Số nét</Text>
// //             </View>
// //             <Text style={styles.statValue}>{kanjiData.strokes}</Text>
// //           </View>
// //           <View style={styles.statCol}>
// //             <View style={styles.statChip}>
// //               <Text style={styles.statChipText}>JLPT</Text>
// //             </View>
// //             <Text style={styles.statValue}>{kanjiData.level}</Text>
// //           </View>
// //           <View style={styles.statCol}>
// //             <View style={styles.statChip}>
// //               <Text style={styles.statChipText}>Tần suất</Text>
// //             </View>
// //             <Text style={styles.statValue}>
// //               {kanjiData.frequency ? `#${kanjiData.frequency}` : '—'}
// //             </Text>
// //           </View>
// //         </View>

// //         {/* ── PHASE 2: Sections nặng — chỉ render khi sectionsReady = true ─
// //             Trong lúc chờ hiện skeleton nhẹ để UI không trống              */}
// //         {!sectionsReady ? (
// //           <SectionSkeleton />
// //         ) : (
// //           <>
// //             {/* Phát âm */}
// //             <View style={styles.section}>
// //               <Text style={styles.sectionTitle}>Phát âm</Text>
// //               {kanjiData.kunyomi.length > 0 && (
// //                 <View style={styles.pronRow}>
// //                   <Text style={styles.diamond}>◆</Text>
// //                   <View>
// //                     <Text style={styles.pronLabel}>Kunyomi</Text>
// //                     <Text style={styles.pronValue}>
// //                       {kanjiData.kunyomi.join('、')}
// //                     </Text>
// //                   </View>
// //                 </View>
// //               )}
// //               {kanjiData.onyomi.length > 0 && (
// //                 <View style={styles.pronRow}>
// //                   <Text style={styles.diamond}>◆</Text>
// //                   <View>
// //                     <Text style={styles.pronLabel}>Onyomi</Text>
// //                     <Text style={styles.pronValue}>
// //                       {kanjiData.onyomi.join('、')}
// //                     </Text>
// //                   </View>
// //                 </View>
// //               )}
// //             </View>

// //             {/* Thứ tự nét — MemoizedStrokeOrder tự defer thêm 1 lần nữa */}
// //             <View style={styles.section}>
// //               <Text style={styles.sectionTitle}>Thứ tự nét</Text>
// //               <MemoizedStrokeOrder kanji={kanjiData.kanji} />
// //             </View>

// //             {/* Bộ thủ & Phân tích */}
// //             {kanjiData.components && kanjiData.components.length > 0 && (
// //               <View style={styles.section}>
// //                 <Text style={styles.sectionTitle}>Bộ & Phân tích</Text>
// //                 {kanjiData.components.map((comp, idx) => (
// //                   <View key={`${comp.kanji}_${idx}`} style={styles.componentRow}>
// //                     <View style={styles.componentBar} />
// //                     <Text style={styles.componentKanji}>{comp.kanji}</Text>
// //                     <Text style={styles.componentHanViet}>
// //                       「{comp.hanViet}」
// //                     </Text>
// //                   </View>
// //                 ))}
// //               </View>
// //             )}

// //             {/* Nghĩa */}
// //             <View style={styles.section}>
// //               <Text style={styles.sectionTitle}>Nghĩa</Text>
// //               {kanjiData.meanings.map((m, idx) => (
// //                 <View key={idx} style={styles.meaningRow}>
// //                   <Text style={styles.meaningDot}>•</Text>
// //                   <Text style={styles.meaningText}>{m}</Text>
// //                 </View>
// //               ))}
// //             </View>

// //             {/* Ví dụ */}
// //             {kanjiData.examples && kanjiData.examples.length > 0 && (
// //               <View style={styles.section}>
// //                 <Text style={styles.sectionTitle}>Ví dụ</Text>
// //                 {kanjiData.examples.map((ex, idx) => (
// //                   <View key={idx} style={styles.exampleBox}>
// //                     <Text style={styles.exampleJp}>{ex.jp}</Text>
// //                     <Text style={styles.exampleReading}>{ex.reading}</Text>
// //                     <Text style={styles.exampleVi}>→ {ex.vi}</Text>
// //                   </View>
// //                 ))}
// //               </View>
// //             )}
// //           </>
// //         )}

// //         <View style={{ height: 30 }} />
// //       </ScrollView>

// //       {/* Nút điều hướng */}
// //       {totalKanji > 1 && (
// //         <View style={styles.navButtons}>
// //           <TouchableOpacity
// //             style={[styles.navBtn, currentIndex === 0 && styles.navBtnDisabled]}
// //             onPress={goToPrev}
// //             disabled={currentIndex === 0}
// //           >
// //             <Text style={styles.navBtnText}>◀ Trước</Text>
// //           </TouchableOpacity>
// //           <Text style={styles.navCounter}>
// //             {currentIndex + 1} / {totalKanji}
// //           </Text>
// //           <TouchableOpacity
// //             style={[
// //               styles.navBtn,
// //               currentIndex === totalKanji - 1 && styles.navBtnDisabled,
// //             ]}
// //             onPress={goToNext}
// //             disabled={currentIndex === totalKanji - 1}
// //           >
// //             <Text style={styles.navBtnText}>Sau ▶</Text>
// //           </TouchableOpacity>
// //         </View>
// //       )}
// //     </View>
// //   );
// // }

// // const styles = StyleSheet.create({
// //   container: {
// //     flex: 1,
// //     backgroundColor: '#fff',
// //   },
// //   errorContainer: {
// //     flex: 1,
// //     justifyContent: 'center',
// //     alignItems: 'center',
// //     padding: 20,
// //   },
// //   errorText: { color: 'red', fontSize: 16 },
// //   tabBar: {
// //     maxHeight: 50,
// //     borderBottomWidth: 1,
// //     borderColor: '#eee',
// //   },
// //   tabContainer: { flexDirection: 'row', paddingHorizontal: 10 },
// //   tabItem: {
// //     paddingHorizontal: 15,
// //     paddingVertical: 12,
// //     borderBottomWidth: 2,
// //     borderBottomColor: 'transparent',
// //   },
// //   tabItemActive: { borderBottomColor: TEAL },
// //   tabText: { fontSize: 16, color: '#666' },
// //   tabTextActive: { color: TEAL, fontWeight: 'bold' },
// //   content: { flex: 1, padding: 15 },
// //   kanjiHeader: { alignItems: 'center', marginBottom: 20 },
// //   furiganaContainer: { height: 20, justifyContent: 'center' },
// //   furiganaText: { fontSize: 14, color: '#666' },
// //   bigKanji: {
// //     fontSize: 70,
// //     fontWeight: 'bold',
// //     color: '#333',
// //     marginVertical: 5,
// //   },
// //   bigHanViet: {
// //     fontSize: 20,
// //     color: TEXT_COLOR,
// //     fontWeight: 'bold',
// //     textTransform: 'uppercase',
// //   },
// //   statsRow: {
// //     flexDirection: 'row',
// //     justifyContent: 'space-around',
// //     marginBottom: 20,
// //     backgroundColor: '#f9f9f9',
// //     padding: 10,
// //     borderRadius: 8,
// //   },
// //   statCol: { alignItems: 'center' },
// //   statChip: {
// //     backgroundColor: TEAL,
// //     paddingHorizontal: 10,
// //     paddingVertical: 4,
// //     borderRadius: 12,
// //     marginBottom: 5,
// //   },
// //   statChipText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
// //   statValue: { fontSize: 16, fontWeight: 'bold', color: '#333' },
// //   // Skeleton
// //   skeletonWrap: { paddingTop: 16, paddingHorizontal: 4, gap: 12 },
// //   skeletonLine: {
// //     height: 14,
// //     backgroundColor: '#e2e8f0',
// //     borderRadius: 7,
// //     opacity: 0.6,
// //   },
// //   // Sections
// //   section: { marginBottom: 25 },
// //   sectionTitle: {
// //     fontSize: 18,
// //     fontWeight: 'bold',
// //     color: TEAL,
// //     marginBottom: 10,
// //     borderBottomWidth: 1,
// //     borderBottomColor: '#eee',
// //     paddingBottom: 5,
// //   },
// //   pronRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
// //   diamond: { color: TEAL, marginRight: 8, fontSize: 12, marginTop: 2 },
// //   pronLabel: { fontSize: 12, color: '#999' },
// //   pronValue: { fontSize: 16, color: '#333', fontWeight: '500' },
// //   strokeWrap: {
// //     alignItems: 'center',
// //     padding: 10,
// //     backgroundColor: '#fcfcfc',
// //     borderRadius: 8,
// //     borderWidth: 1,
// //     borderColor: '#eee',
// //   },
// //   componentRow: {
// //     flexDirection: 'row',
// //     alignItems: 'center',
// //     marginBottom: 8,
// //     paddingLeft: 8,
// //   },
// //   componentBar: {
// //     width: 3,
// //     height: 20,
// //     backgroundColor: TEAL,
// //     borderRadius: 2,
// //     marginRight: 10,
// //   },
// //   componentKanji: { fontSize: 20, fontWeight: 'bold', color: '#333', marginRight: 8 },
// //   componentHanViet: { fontSize: 14, color: '#666' },
// //   meaningRow: { flexDirection: 'row', marginBottom: 6, alignItems: 'flex-start' },
// //   meaningDot: { color: TEAL, marginRight: 8, fontSize: 16, lineHeight: 22 },
// //   meaningText: { fontSize: 15, color: '#444', flex: 1, lineHeight: 22 },
// //   exampleBox: {
// //     backgroundColor: '#f8fafc',
// //     borderRadius: 8,
// //     padding: 12,
// //     marginBottom: 10,
// //     borderLeftWidth: 3,
// //     borderLeftColor: TEAL,
// //   },
// //   exampleJp: { fontSize: 16, color: '#1e293b', fontWeight: '600', marginBottom: 4 },
// //   exampleReading: { fontSize: 13, color: '#64748b', marginBottom: 4 },
// //   exampleVi: { fontSize: 14, color: '#475569' },
// //   navButtons: {
// //     flexDirection: 'row',
// //     justifyContent: 'space-between',
// //     alignItems: 'center',
// //     padding: 12,
// //     borderTopWidth: 1,
// //     borderTopColor: '#eee',
// //     backgroundColor: '#fff',
// //   },
// //   navBtn: {
// //     paddingHorizontal: 20,
// //     paddingVertical: 10,
// //     backgroundColor: TEAL,
// //     borderRadius: 8,
// //   },
// //   navBtnDisabled: { backgroundColor: '#cbd5e1' },
// //   navBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
// //   navCounter: { fontSize: 15, color: '#64748b', fontWeight: '600' },
// // });



// ////goc
// // import React, { useState, useEffect, useMemo, startTransition } from 'react';
// // import {
// //   View,
// //   Text,
// //   StyleSheet,
// //   TouchableOpacity,
// //   ScrollView,
// //   ActivityIndicator,
// //   InteractionManager,
// // } from 'react-native';
// // import { KanjiStrokeOrder } from './KanjiStrokeOrder';
// // import { getKanjiByChar, type KanjiItem } from '../assets/data_JLPT_kanji';

// // const TEAL = "#1F6F7A";
// // const TEAL_DARK = "#1c5765";
// // const TEXT_COLOR = "#e47b0b";

// // interface KanjiDetailInlineProps {
// //   kanjiChars: string[];
// //   initialIndex?: number;
// //   onClose?: () => void;
// // }

// // const TabItem = React.memo(({ char, index, isActive, onPress }: { 
// //   char: string; index: number; isActive: boolean; onPress: (idx: number) => void 
// // }) => (
// //   <TouchableOpacity
// //     style={[styles.tabItem, isActive && styles.tabItemActive]}
// //     onPress={() => onPress(index)}
// //   >
// //     <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
// //       {char}
// //     </Text>
// //   </TouchableOpacity>
// // ));

// // const MemoizedStrokeOrder = React.memo(({ kanji }: { kanji: string }) => {
// //   const [renderStroke, setRenderStroke] = useState(false);

// //   useEffect(() => {
// //     const task = InteractionManager.runAfterInteractions(() => {
// //       setRenderStroke(true);
// //     });
// //     return () => {
// //       task.cancel();
// //       setRenderStroke(false);
// //     };
// //   }, [kanji]);

// //   if (!renderStroke) {
// //     return (
// //       <View style={[styles.strokeWrap, { height: 180, justifyContent: 'center' }]}>
// //         <ActivityIndicator color={TEAL} />
// //       </View>
// //     );
// //   }

// //   return (
// //     <View style={styles.strokeWrap}>
// //       <KanjiStrokeOrder kanji={kanji} size={180} />
// //     </View>
// //   );
// // });

// // export default function KanjiDetailInline({
// //   kanjiChars,
// //   initialIndex = 0,
// // }: KanjiDetailInlineProps) {
// //   const [currentIndex, setCurrentIndex] = useState(initialIndex);

// //   const currentKanji = kanjiChars[currentIndex];
// //   const totalKanji = kanjiChars.length;

// //   const kanjiData = useMemo(() => {
// //     if (!currentKanji) return null;
// //     return getKanjiByChar(currentKanji) || null;
// //   }, [currentKanji]);

// //   const handleIndexChange = (index: number) => {
// //     startTransition(() => {
// //       setCurrentIndex(index);
// //     });
// //   };

// //   const goToNext = () => {
// //     if (currentIndex + 1 < totalKanji) {
// //       handleIndexChange(currentIndex + 1);
// //     }
// //   };

// //   const goToPrev = () => {
// //     if (currentIndex > 0) {
// //       handleIndexChange(currentIndex - 1);
// //     }
// //   };

// //   if (!kanjiData) {
// //     return (
// //       <View style={styles.errorContainer}>
// //         <Text style={styles.errorText}>
// //           Không tìm thấy dữ liệu cho chữ "{currentKanji}"
// //         </Text>
// //       </View>
// //     );
// //   }

// //   return (
// //     <View style={styles.container}>
// //       {totalKanji > 1 && (
// //         <ScrollView 
// //           horizontal 
// //           showsHorizontalScrollIndicator={false} 
// //           style={styles.tabBar}
// //           contentContainerStyle={{ paddingVertical: 0 }}
// //           removeClippedSubviews={true}
// //         >
// //           <View style={styles.tabContainer}>
// //             {kanjiChars.map((char, idx) => (
// //               <TabItem 
// //                 key={`${char}_${idx}`}
// //                 char={char}
// //                 index={idx}
// //                 isActive={currentIndex === idx}
// //                 onPress={handleIndexChange}
// //               />
// //             ))}
// //           </View>
// //         </ScrollView>
// //       )}

// //       <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
// //         <View style={styles.kanjiHeader}>
// //           <View style={styles.furiganaContainer}>
// //             {kanjiData.kunyomi.length > 0 && (
// //               <Text style={styles.furiganaText}>{kanjiData.kunyomi}</Text>
// //             )}
// //             {kanjiData.onyomi.length > 0 && kanjiData.kunyomi.length === 0 && (
// //               <Text style={styles.furiganaText}>{kanjiData.onyomi}</Text>
// //             )}
// //           </View>
// //           <Text style={styles.bigKanji}>{kanjiData.kanji}</Text>
// //           <Text style={styles.bigHanViet}>{kanjiData.hanViet}</Text>
// //         </View>

// //         <View style={styles.statsRow}>
// //           <View style={styles.statCol}>
// //             <View style={styles.statChip}>
// //               <Text style={styles.statChipText}>Số nét</Text>
// //             </View>
// //             <Text style={styles.statValue}>{kanjiData.strokes}</Text>
// //           </View>
// //           <View style={styles.statCol}>
// //             <View style={styles.statChip}>
// //               <Text style={styles.statChipText}>JLPT</Text>
// //             </View>
// //             <Text style={styles.statValue}>{kanjiData.level}</Text>
// //           </View>
// //           <View style={styles.statCol}>
// //             <View style={styles.statChip}>
// //               <Text style={styles.statChipText}>Tần suất</Text>
// //             </View>
// //             <Text style={styles.statValue}>
// //               {kanjiData.frequency ? `#${kanjiData.frequency}` : '—'}
// //             </Text>
// //           </View>
// //         </View>

// //         <View style={styles.section}>
// //           <Text style={styles.sectionTitle}>Phát âm</Text>
// //           {kanjiData.kunyomi.length > 0 && (
// //             <View style={styles.pronRow}>
// //               <Text style={styles.diamond}>◆</Text>
// //               <View>
// //                 <Text style={styles.pronLabel}>Kunyomi</Text>
// //                 <Text style={styles.pronValue}>{kanjiData.kunyomi.join('、')}</Text>
// //               </View>
// //             </View>
// //           )}
// //           {kanjiData.onyomi.length > 0 && (
// //             <View style={styles.pronRow}>
// //               <Text style={styles.diamond}>◆</Text>
// //               <View>
// //                 <Text style={styles.pronLabel}>Onyomi</Text>
// //                 <Text style={styles.pronValue}>{kanjiData.onyomi.join('、')}</Text>
// //               </View>
// //             </View>
// //           )}
// //         </View>

// //         <View style={styles.section}>
// //           <Text style={styles.sectionTitle}>Thứ tự nét</Text>
// //           <MemoizedStrokeOrder kanji={kanjiData.kanji} />
// //         </View>

// //         <View style={styles.section}>
// //           <Text style={styles.sectionTitle}>Bộ & Phân tích</Text>
// //           {kanjiData.components?.map((comp, idx) => (
// //             <View key={`${comp.kanji}_${idx}`} style={styles.componentRow}>
// //               <View style={styles.componentBar} />
// //               <Text style={styles.componentKanji}>{comp.kanji}</Text>
// //               <Text style={styles.componentHanViet}>「{comp.hanViet}」</Text>
// //             </View>
// //           ))}
// //         </View>

// //         <View style={styles.section}>
// //           <Text style={styles.sectionTitle}>Nghĩa</Text>
// //           {kanjiData.meanings.map((m, idx) => (
// //             <View key={idx} style={styles.meaningRow}>
// //               <Text style={styles.meaningDot}>•</Text>
// //               <Text style={styles.meaningText}>{m}</Text>
// //             </View>
// //           ))}
// //         </View>

// //         {kanjiData.examples && kanjiData.examples.length > 0 && (
// //           <View style={styles.section}>
// //             <Text style={styles.sectionTitle}>Ví dụ</Text>
// //             {kanjiData.examples.map((ex, idx) => (
// //               <View key={idx} style={styles.exampleBox}>
// //                 <Text style={styles.exampleJp}>{ex.jp}</Text>
// //                 <Text style={styles.exampleReading}>{ex.reading}</Text>
// //                 <Text style={styles.exampleVi}>→ {ex.vi}</Text>
// //               </View>
// //             ))}
// //           </View>
// //         )}
// //       </ScrollView>

// //       {totalKanji > 1 && (
// //         <View style={styles.navButtons}>
// //           <TouchableOpacity
// //             style={[styles.navBtn, currentIndex === 0 && styles.navBtnDisabled]}
// //             onPress={goToPrev}
// //             disabled={currentIndex === 0}
// //           >
// //             <Text style={styles.navBtnText}>◀ Trước</Text>
// //           </TouchableOpacity>
// //           <Text style={styles.navCounter}>
// //             {currentIndex + 1} / {totalKanji}
// //           </Text>
// //           <TouchableOpacity
// //             style={[styles.navBtn, currentIndex === totalKanji - 1 && styles.navBtnDisabled]}
// //             onPress={goToNext}
// //             disabled={currentIndex === totalKanji - 1}
// //           >
// //             <Text style={styles.navBtnText}>Sau ▶</Text>
// //           </TouchableOpacity>
// //         </View>
// //       )}
// //     </View>
// //   );
// // }

// // const styles = StyleSheet.create({
// //   container: {
// //     flex: 1,
// //     backgroundColor: '#fff',
// //   },
// //   loadingContainer: {
// //     flex: 1,
// //     justifyContent: 'center',
// //     alignItems: 'center',
// //   },
// //   loadingText: {
// //     marginTop: 10,
// //     color: TEAL,
// //   },
// //   errorContainer: {
// //     flex: 1,
// //     justifyContent: 'center',
// //     alignItems: 'center',
// //     padding: 20,
// //   },
// //   errorText: {
// //     color: 'red',
// //     fontSize: 16,
// //   },
// //   tabBar: {
// //     maxHeight: 50,
// //     borderBottomWidth: 1,
// //     borderColor: '#eee',
// //   },
// //   tabContainer: {
// //     flexDirection: 'row',
// //     paddingHorizontal: 10,
// //   },
// //   tabItem: {
// //     paddingHorizontal: 15,
// //     paddingVertical: 12,
// //     borderBottomWidth: 2,
// //     borderBottomColor: 'transparent',
// //   },
// //   tabItemActive: {
// //     borderBottomColor: TEAL,
// //   },
// //   tabText: {
// //     fontSize: 16,
// //     color: '#666',
// //   },
// //   tabTextActive: {
// //     color: TEAL,
// //     fontWeight: 'bold',
// //   },
// //   content: {
// //     flex: 1,
// //     padding: 15,
// //   },
// //   kanjiHeader: {
// //     alignItems: 'center',
// //     marginBottom: 20,
// //   },
// //   furiganaContainer: {
// //     height: 20,
// //     justifyContent: 'center',
// //   },
// //   furiganaText: {
// //     fontSize: 14,
// //     color: '#666',
// //   },
// //   bigKanji: {
// //     fontSize: 70,
// //     fontWeight: 'bold',
// //     color: '#333',
// //     marginVertical: 5,
// //   },
// //   bigHanViet: {
// //     fontSize: 20,
// //     color: TEXT_COLOR,
// //     fontWeight: 'bold',
// //     textTransform: 'uppercase',
// //   },
// //   statsRow: {
// //     flexDirection: 'row',
// //     justifyContent: 'space-around',
// //     marginBottom: 20,
// //     backgroundColor: '#f9f9f9',
// //     padding: 10,
// //     borderRadius: 8,
// //   },
// //   statCol: {
// //     alignItems: 'center',
// //   },
// //   statChip: {
// //     backgroundColor: TEAL,
// //     paddingHorizontal: 10,
// //     paddingVertical: 4,
// //     borderRadius: 12,
// //     marginBottom: 5,
// //   },
// //   statChipText: {
// //     color: '#fff',
// //     fontSize: 11,
// //     fontWeight: 'bold',
// //   },
// //   statValue: {
// //     fontSize: 16,
// //     fontWeight: 'bold',
// //     color: '#333',
// //   },
// //   section: {
// //     marginBottom: 25,
// //   },
// //   sectionTitle: {
// //     fontSize: 18,
// //     fontWeight: 'bold',color: TEAL,marginBottom: 10,borderBottomWidth: 1,borderBottomColor: '#eee',paddingBottom: 5,},pronRow: {flexDirection: 'row',alignItems: 'flex-start',marginBottom: 8,},diamond: {color: TEAL,marginRight: 8,fontSize: 12,marginTop: 2,},pronLabel: {fontSize: 12,color: '#999',},pronValue: {fontSize: 16,color: '#333',fontWeight: '500',},strokeWrap: {alignItems: 'center',padding: 10,backgroundColor: '#fcfcfc',borderRadius: 8,borderWidth: 1,borderColor: '#eee',},componentRow: {flexDirection: 'row',alignItems: 'center',marginBottom: 6,},componentBar: {width: 4,height: 16,backgroundColor: TEXT_COLOR,marginRight: 8,borderRadius: 2,},componentKanji: {fontSize: 16,fontWeight: 'bold',color: '#333',},componentHanViet: {fontSize: 14,color: '#666',},meaningRow: {flexDirection: 'row',alignItems: 'flex-start',marginBottom: 6,},meaningDot: {color: TEXT_COLOR,marginRight: 8,fontSize: 16,lineHeight: 18,},meaningText: {fontSize: 15,color: '#333',flex: 1,lineHeight: 22,},exampleBox: {backgroundColor: '#f5f9f9',padding: 12,borderRadius: 8,marginBottom: 8,borderWidth: 1,borderColor: '#eef5f5',},exampleJp: {fontSize: 16,fontWeight: 'bold',color: '#333',marginBottom: 2,},exampleReading: {fontSize: 13,color: '#666',marginBottom: 4,},exampleVi: {fontSize: 14,color: TEXT_COLOR,},navButtons: {flexDirection: 'row',justifyContent: 'space-between',alignItems: 'center',padding: 12,borderTopWidth: 1,borderTopColor: '#eee',backgroundColor: '#fff',},navBtn: {paddingVertical: 8,paddingHorizontal: 16,backgroundColor: TEAL,borderRadius: 6,},navBtnDisabled: {backgroundColor: '#ccc',},navBtnText: {color: '#fff',fontWeight: 'bold',},navCounter: {fontSize: 14,color: '#666',fontWeight: '500',},});

// /////1
// // // // components/KanjiDetailInline.tsx
// // // import React, { useState, useEffect } from 'react';
// // // import {
// // //   View,
// // //   Text,
// // //   StyleSheet,
// // //   TouchableOpacity,
// // //   ScrollView,
// // //   ActivityIndicator,
// // // } from 'react-native';
// // // import { KanjiStrokeOrder } from './KanjiStrokeOrder';
// // // import { getKanjiByChar, type KanjiItem } from '../assets/data_JLPT_kanji';

// // // const TEAL = "#1F6F7A";
// // // const TEAL_DARK = "#1c5765";
// // // const TEXT_COLOR = "#e47b0b";

// // // interface KanjiDetailInlineProps {
// // //   kanjiChars: string[];
// // //   initialIndex?: number;
// // //   onClose?: () => void;
// // // }

// // // export default function KanjiDetailInline({
// // //   kanjiChars,
// // //   initialIndex = 0,
// // //   onClose,
// // // }: KanjiDetailInlineProps) {
// // //   const [currentIndex, setCurrentIndex] = useState(initialIndex);
// // //   const [kanjiData, setKanjiData] = useState<KanjiItem | null>(null);
// // //   const [loading, setLoading] = useState(true);

// // //   const currentKanji = kanjiChars[currentIndex];
// // //   const totalKanji = kanjiChars.length;

// // //   useEffect(() => {
// // //     if (!currentKanji) return;
// // //     setLoading(true);
// // //     const data = getKanjiByChar(currentKanji);
// // //     setKanjiData(data || null);
// // //     setLoading(false);
// // //   }, [currentKanji]);

// // //   const goToNext = () => {
// // //     if (currentIndex + 1 < totalKanji) {
// // //       setCurrentIndex(currentIndex + 1);
// // //     }
// // //   };

// // //   const goToPrev = () => {
// // //     if (currentIndex > 0) {
// // //       setCurrentIndex(currentIndex - 1);
// // //     }
// // //   };

// // //   const selectKanji = (index: number) => {
// // //     setCurrentIndex(index);
// // //   };

// // //   if (loading) {
// // //     return (
// // //       <View style={styles.loadingContainer}>
// // //         <ActivityIndicator size="large" color={TEAL} />
// // //         <Text style={styles.loadingText}>Đang tải...</Text>
// // //       </View>
// // //     );
// // //   }

// // //   if (!kanjiData) {
// // //     return (
// // //       <View style={styles.errorContainer}>
// // //         <Text style={styles.errorText}>
// // //           Không tìm thấy dữ liệu cho chữ "{currentKanji}"
// // //         </Text>
// // //       </View>
// // //     );
// // //   }

// // //   return (
// // //     <View style={styles.container}>
// // //       {/* Tab thanh chuyển đổi Kanji */}
// // //       {totalKanji > 1 && (
// // //         <ScrollView 
// // //             horizontal 
// // //             showsHorizontalScrollIndicator={false} 
// // //             style={styles.tabBar}
// // //             contentContainerStyle={{ paddingVertical: 0 }}
// // //             >
// // //           <View style={styles.tabContainer}>
// // //             {kanjiChars.map((char, idx) => (
// // //               <TouchableOpacity
// // //                 key={`${char}_${idx}`}
// // //                 style={[styles.tabItem, currentIndex === idx && styles.tabItemActive]}
// // //                 onPress={() => selectKanji(idx)}
// // //               >
// // //                 <Text style={[styles.tabText, currentIndex === idx && styles.tabTextActive]}>
// // //                   {char}
// // //                 </Text>
// // //               </TouchableOpacity>
// // //             ))}
// // //           </View>
// // //         </ScrollView>
// // //       )}

// // //       {/* Nội dung chi tiết Kanji */}
// // //       <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
// // //         {/* Chữ Kanji lớn */}
// // //         {/* <View style={styles.kanjiHeader}>
// // //           <Text style={styles.bigKanji}>{kanjiData.kanji}</Text>
// // //           <Text style={styles.bigHanViet}>{kanjiData.hanViet}</Text>
// // //         </View> */}

// // //         {/* Chữ Kanji lớn với Furigana (Hiragana phía trên) */}
// // //         <View style={styles.kanjiHeader}>
// // //           <View style={styles.furiganaContainer}>
// // //             {kanjiData.kunyomi.length > 0 && (
// // //               <Text style={styles.furiganaText}>{kanjiData.kunyomi[0]}</Text>
// // //             )}
// // //             {kanjiData.onyomi.length > 0 && kanjiData.kunyomi.length === 0 && (
// // //               <Text style={styles.furiganaText}>{kanjiData.onyomi[0]}</Text>
// // //             )}
// // //           </View>
// // //           <Text style={styles.bigKanji}>{kanjiData.kanji}</Text>
// // //           <Text style={styles.bigHanViet}>{kanjiData.hanViet}</Text>
// // //         </View>

// // //         {/* 3 cột thông tin */}
// // //         <View style={styles.statsRow}>
// // //           <View style={styles.statCol}>
// // //             <View style={styles.statChip}>
// // //               <Text style={styles.statChipText}>Số nét</Text>
// // //             </View>
// // //             <Text style={styles.statValue}>{kanjiData.strokes}</Text>
// // //           </View>
// // //           <View style={styles.statCol}>
// // //             <View style={styles.statChip}>
// // //               <Text style={styles.statChipText}>JLPT</Text>
// // //             </View>
// // //             <Text style={styles.statValue}>{kanjiData.level}</Text>
// // //           </View>
// // //           <View style={styles.statCol}>
// // //             <View style={styles.statChip}>
// // //               <Text style={styles.statChipText}>Tần suất</Text>
// // //             </View>
// // //             <Text style={styles.statValue}>
// // //               {kanjiData.frequency ? `#${kanjiData.frequency}` : '—'}
// // //             </Text>
// // //           </View>
// // //         </View>

// // //         {/* Phát âm */}
// // //         <View style={styles.section}>
// // //           <Text style={styles.sectionTitle}>Phát âm</Text>
// // //           {kanjiData.kunyomi.length > 0 && (
// // //             <View style={styles.pronRow}>
// // //               <Text style={styles.diamond}>◆</Text>
// // //               <View>
// // //                 <Text style={styles.pronLabel}>Kunyomi</Text>
// // //                 <Text style={styles.pronValue}>{kanjiData.kunyomi.join('、')}</Text>
// // //               </View>
// // //             </View>
// // //           )}
// // //           {kanjiData.onyomi.length > 0 && (
// // //             <View style={styles.pronRow}>
// // //               <Text style={styles.diamond}>◆</Text>
// // //               <View>
// // //                 <Text style={styles.pronLabel}>Onyomi</Text>
// // //                 <Text style={styles.pronValue}>{kanjiData.onyomi.join('、')}</Text>
// // //               </View>
// // //             </View>
// // //           )}
// // //         </View>

// // //         {/* Thứ tự nét */}
// // //         <View style={styles.section}>
// // //           <Text style={styles.sectionTitle}>Thứ tự nét</Text>
// // //           <View style={styles.strokeWrap}>
// // //             <KanjiStrokeOrder kanji={kanjiData.kanji} size={180} />
// // //           </View>
// // //         </View>

// // //         {/* Bộ thủ & Phân tích */}
// // //         <View style={styles.section}>
// // //           <Text style={styles.sectionTitle}>Bộ & Phân tích</Text>
// // //           {kanjiData.components?.map((comp, idx) => (
// // //             <View key={`${comp.kanji}_${idx}`} style={styles.componentRow}>
// // //               <View style={styles.componentBar} />
// // //               <Text style={styles.componentKanji}>{comp.kanji}</Text>
// // //               <Text style={styles.componentHanViet}>「{comp.hanViet}」</Text>
// // //             </View>
// // //           ))}
// // //         </View>

// // //         {/* Nghĩa */}
// // //         <View style={styles.section}>
// // //           <Text style={styles.sectionTitle}>Nghĩa</Text>
// // //           {kanjiData.meanings.map((m, idx) => (
// // //             <View key={idx} style={styles.meaningRow}>
// // //               <Text style={styles.meaningDot}>•</Text>
// // //               <Text style={styles.meaningText}>{m}</Text>
// // //             </View>
// // //           ))}
// // //         </View>

// // //         {/* Ví dụ */}
// // //         {kanjiData.examples && kanjiData.examples.length > 0 && (
// // //           <View style={styles.section}>
// // //             <Text style={styles.sectionTitle}>Ví dụ</Text>
// // //             {kanjiData.examples.map((ex, idx) => (
// // //               <View key={idx} style={styles.exampleBox}>
// // //                 <Text style={styles.exampleJp}>{ex.jp}</Text>
// // //                 <Text style={styles.exampleReading}>{ex.reading}</Text>
// // //                 <Text style={styles.exampleVi}>→ {ex.vi}</Text>
// // //               </View>
// // //             ))}
// // //           </View>
// // //         )}
// // //       </ScrollView>

// // //       {/* Nút điều hướng Trước/Sau */}
// // //       {totalKanji > 1 && (
// // //         <View style={styles.navButtons}>
// // //           <TouchableOpacity
// // //             style={[styles.navBtn, currentIndex === 0 && styles.navBtnDisabled]}
// // //             onPress={goToPrev}
// // //             disabled={currentIndex === 0}
// // //           >
// // //             <Text style={styles.navBtnText}>◀ Trước</Text>
// // //           </TouchableOpacity>
// // //           <Text style={styles.navCounter}>
// // //             {currentIndex + 1} / {totalKanji}
// // //           </Text>
// // //           <TouchableOpacity
// // //             style={[styles.navBtn, currentIndex === totalKanji - 1 && styles.navBtnDisabled]}
// // //             onPress={goToNext}
// // //             disabled={currentIndex === totalKanji - 1}
// // //           >
// // //             <Text style={styles.navBtnText}>Sau ▶</Text>
// // //           </TouchableOpacity>
// // //         </View>
// // //       )}
// // //     </View>
// // //   );
// // // }

// // // const styles = StyleSheet.create({
// // //   container: {
// // //     flex: 1,
// // //     backgroundColor: '#fff',
// // //   },
// // //   loadingContainer: {
// // //     padding: 40,
// // //     alignItems: 'center',
// // //   },
// // //   loadingText: {
// // //     marginTop: 12,
// // //     color: '#64748b',
// // //   },
// // //   errorContainer: {
// // //     padding: 40,
// // //     alignItems: 'center',
// // //   },
// // //   errorText: {
// // //     color: '#ef4444',
// // //     fontSize: 14,
// // //     textAlign: 'center',
// // //   },
// // //   tabBar: {
// // //     backgroundColor: '#fff',
// // //     borderBottomWidth: 1,
// // //     borderBottomColor: '#e2e8f0',   
// // //     height: "auto", 
// // //     flexGrow: 0, 
// // //   },
// // //   tabContainer: {
// // //     flexDirection: 'row',
// // //     paddingHorizontal: 12,
// // //     alignItems: 'center', 
// // //     height: '100%',
// // //   },
// // //   tabItem: {
// // //     paddingHorizontal: 16,
// // //     paddingVertical: 8,
// // //     marginHorizontal: 4,
// // //     borderRadius: 20,
// // //     backgroundColor: '#f1f5f9', 
// // //     alignItems: 'center',
// // //     justifyContent: 'center',
// // //   },
// // //   tabItemActive: {
// // //     backgroundColor: TEAL,
// // //   },
// // //   tabText: {
// // //     fontSize: 20,
// // //     color: '#475569',
// // //   },
// // //   tabTextActive: {
// // //     color: '#fff',
// // //   },
// // //   content: {
// // //     flex: 1,
// // //     padding: 16,
// // //   },
// // //   kanjiHeader: {
// // //     alignItems: 'center',
// // //     marginBottom: 20,
// // //   },
// // //   bigKanji: {
// // //     fontSize: 64,
// // //     fontWeight: '800',
// // //     color: TEAL_DARK,
// // //   },
// // //   bigHanViet: {
// // //     fontSize: 14,
// // //     color: '#64748b',
// // //     fontWeight: '600',
// // //     marginTop: 4,
// // //   },
// // //   statsRow: {
// // //     flexDirection: 'row',
// // //     marginBottom: 16,
// // //     paddingHorizontal: 4,
// // //   },
// // //   statCol: {
// // //     flex: 1,
// // //     alignItems: 'center',
// // //   },
// // //   statChip: {
// // //     paddingHorizontal: 10,
// // //     paddingVertical: 4,
// // //     borderRadius: 12,
// // //     borderWidth: 1,
// // //     borderColor: '#cbd5e1',
// // //     backgroundColor: '#f8fafc',
// // //   },
// // //   statChipText: {
// // //     fontSize: 11,
// // //     color: TEXT_COLOR,
// // //     fontWeight: '600',
// // //   },
// // //   statValue: {
// // //     fontSize: 18,
// // //     fontWeight: '800',
// // //     color: TEAL,
// // //     marginTop: 6,
// // //   },
// // //   section: {
// // //     marginBottom: 20,
// // //   },
// // //   sectionTitle: {
// // //     fontSize: 16,
// // //     fontWeight: '800',
// // //     color: '#0f172a',
// // //     marginBottom: 10,
// // //   },
// // //   pronRow: {
// // //     flexDirection: 'row',
// // //     alignItems: 'flex-start',
// // //     marginBottom: 10,
// // //   },
// // //   diamond: {
// // //     color: TEXT_COLOR,
// // //     fontSize: 16,
// // //     marginRight: 8,
// // //     marginTop: 2,
// // //   },
// // //   pronLabel: {
// // //     fontSize: 13,
// // //     fontWeight: '700',
// // //     color: TEAL,
// // //   },
// // //   pronValue: {
// // //     fontSize: 16,
// // //     color: TEAL_DARK,
// // //     marginTop: 2,
// // //   },
// // //   strokeWrap: {
// // //     // alignItems: 'center',
// // //     width: "100%",          // Đảm bảo chiếm hết chiều ngang
// // //     alignItems: 'stretch',
// // //   },
// // //   componentRow: {
// // //     flexDirection: 'row',
// // //     alignItems: 'center',
// // //     marginTop: 8,
// // //   },
// // //   componentBar: {
// // //     width: 3,
// // //     height: 18,
// // //     backgroundColor: TEXT_COLOR,
// // //     marginRight: 8,
// // //     borderRadius: 2,
// // //   },
// // //   componentKanji: {
// // //     fontSize: 24,
// // //     fontWeight: '700',
// // //     color: TEAL_DARK,
// // //     marginRight: 6,
// // //   },
// // //   componentHanViet: {
// // //     fontSize: 14,
// // //     color: TEAL,
// // //     fontWeight: '500',
// // //   },
// // //   meaningRow: {
// // //     flexDirection: 'row',
// // //     alignItems: 'flex-start',
// // //     marginBottom: 6,
// // //   },
// // //   meaningDot: {
// // //     fontSize: 16,
// // //     color: TEXT_COLOR,
// // //     marginRight: 8,
// // //   },
// // //   meaningText: {
// // //     flex: 1,
// // //     fontSize: 15,
// // //     color: '#1e293b',
// // //     lineHeight: 22,
// // //   },
// // //   exampleBox: {
// // //     marginBottom: 12,
// // //     backgroundColor: '#f8fafc',
// // //     padding: 12,
// // //     borderRadius: 12,
// // //   },
// // //   exampleJp: {
// // //     fontSize: 15,
// // //     fontWeight: '700',
// // //     color: '#0f172a',
// // //   },
// // //   exampleReading: {
// // //     fontSize: 13,
// // //     color: TEAL,
// // //     marginTop: 2,
// // //   },
// // //   exampleVi: {
// // //     fontSize: 13,
// // //     color: '#475569',
// // //     marginTop: 2,
// // //   },
// // //   navButtons: {
// // //     flexDirection: 'row',
// // //     alignItems: 'center',
// // //     justifyContent: 'space-between',
// // //     paddingHorizontal: 20,
// // //     paddingVertical: 12,
// // //     borderTopWidth: 1,
// // //     borderTopColor: '#e2e8f0',
// // //     backgroundColor: '#fff',
// // //   },
// // //   navBtn: {
// // //     paddingHorizontal: 20,
// // //     paddingVertical: 10,
// // //     backgroundColor: TEAL,
// // //     borderRadius: 20,
// // //   },
// // //   navBtnDisabled: {
// // //     backgroundColor: '#cbd5e1',
// // //   },
// // //   navBtnText: {
// // //     color: '#fff',
// // //     fontWeight: '600',
// // //     fontSize: 14,
// // //   },
// // //   navCounter: {
// // //     fontSize: 14,
// // //     color: '#475569',
// // //     fontWeight: '600',
// // //   },
// // //   // Thêm vào StyleSheet
// // //   furiganaContainer: {
// // //     minHeight: 24,
// // //     alignItems: 'center',
// // //   },
// // //   furiganaText: {
// // //     fontSize: 14,
// // //     color: '#64748b',
// // //     fontWeight: '500',
// // //     letterSpacing: 0.5,
// // //     marginBottom: 4,
// // //   },
// // // });