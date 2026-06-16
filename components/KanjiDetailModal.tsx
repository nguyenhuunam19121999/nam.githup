// // components/KanjiDetailModal.tsx
// import React, { useState, useEffect } from 'react';
// import {
//   Modal,
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   ScrollView,
//   Dimensions,
//   Pressable,
// } from 'react-native';
// import { LinearGradient } from 'expo-linear-gradient';
// import { KanjiStrokeOrder } from './KanjiStrokeOrder';
// import { getKanjiByChar, type KanjiItem } from '../assets/data_JLPT_kanji';

// const TEAL = "#1F6F7A";
// const TEAL_DARK = "#1c5765";
// const TEXT_COLOR = "#e47b0b";
// const { width: SCREEN_WIDTH } = Dimensions.get('window');

// interface KanjiDetailModalProps {
//   visible: boolean;
//   kanjiChars: string[];           // Danh sách các chữ Kanji tìm được
//   initialIndex?: number;          // Vị trí hiện tại
//   onClose: () => void;
// }

// export default function KanjiDetailModal({
//   visible,
//   kanjiChars,
//   initialIndex = 0,
//   onClose,
// }: KanjiDetailModalProps) {
//   const [currentIndex, setCurrentIndex] = useState(initialIndex);
//   const [kanjiData, setKanjiData] = useState<KanjiItem | null>(null);
//   const [loading, setLoading] = useState(true);

//   const currentKanji = kanjiChars[currentIndex];
//   const totalKanji = kanjiChars.length;

//   // Tải dữ liệu khi chuyển Kanji
//   useEffect(() => {
//     if (!currentKanji || !visible) return;
//     setLoading(true);
//     const data = getKanjiByChar(currentKanji);
//     setKanjiData(data || null);
//     setLoading(false);
//   }, [currentKanji, visible]);

//   // Chuyển sang Kanji tiếp theo
//   const goToNext = () => {
//     if (currentIndex + 1 < totalKanji) {
//       setCurrentIndex(currentIndex + 1);
//     }
//   };

//   // Chuyển sang Kanji trước đó
//   const goToPrev = () => {
//     if (currentIndex > 0) {
//       setCurrentIndex(currentIndex - 1);
//     }
//   };

//   // Chọn trực tiếp từ danh sách tab
//   const selectKanji = (index: number) => {
//     setCurrentIndex(index);
//   };

//   if (!visible) return null;

//   return (
//     <Modal
//       visible={visible}
//       animationType="slide"
//       transparent
//       onRequestClose={onClose}
//     >
//       <View style={styles.modalOverlay}>
//         <Pressable style={styles.backdrop} onPress={onClose} />
        
//         <View style={styles.modalContainer}>
//           {/* Header với gradient */}
//           <LinearGradient
//             colors={[TEAL, TEAL_DARK]}
//             start={{ x: 0, y: 0 }}
//             end={{ x: 1, y: 0 }}
//             style={styles.header}
//           >
//             <View style={styles.headerContent}>
//               <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
//                 <Text style={styles.closeBtnText}>✕</Text>
//               </TouchableOpacity>
//               <Text style={styles.headerTitle}>Chi tiết Hán tự</Text>
//               <View style={{ width: 32 }} />
//             </View>
//           </LinearGradient>

//           {/* Tab thanh chuyển đổi Kanji */}
//           {totalKanji > 1 && (
//             <View style={styles.tabBar}>
//               <ScrollView horizontal showsHorizontalScrollIndicator={false}>
//                 <View style={styles.tabContainer}>
//                   {kanjiChars.map((char, idx) => (
//                     <TouchableOpacity
//                       key={char}
//                       style={[
//                         styles.tabItem,
//                         currentIndex === idx && styles.tabItemActive,
//                       ]}
//                       onPress={() => selectKanji(idx)}
//                       activeOpacity={0.7}
//                     >
//                       <Text
//                         style={[
//                           styles.tabText,
//                           currentIndex === idx && styles.tabTextActive,
//                         ]}
//                       >
//                         {char}
//                       </Text>
//                     </TouchableOpacity>
//                   ))}
//                 </View>
//               </ScrollView>
//             </View>
//           )}

//           {/* Nội dung chi tiết Kanji */}
//           <ScrollView
//             style={styles.content}
//             showsVerticalScrollIndicator={false}
//             contentContainerStyle={styles.contentContainer}
//           >
//             {loading ? (
//               <View style={styles.loadingContainer}>
//                 <Text style={styles.loadingText}>Đang tải...</Text>
//               </View>
//             ) : !kanjiData ? (
//               <View style={styles.errorContainer}>
//                 <Text style={styles.errorText}>
//                   Không tìm thấy dữ liệu cho chữ "{currentKanji}"
//                 </Text>
//               </View>
//             ) : (
//               <>
//                 {/* Chữ Kanji lớn */}
//                 <View style={styles.kanjiHeader}>
//                   <Text style={styles.bigKanji}>{kanjiData.kanji}</Text>
//                   <Text style={styles.bigHanViet}>{kanjiData.hanViet}</Text>
//                 </View>

//                 {/* 3 cột thông tin */}
//                 <View style={styles.statsRow}>
//                   <View style={styles.statCol}>
//                     <View style={styles.statChip}>
//                       <Text style={styles.statChipText}>Số nét</Text>
//                     </View>
//                     <Text style={styles.statValue}>{kanjiData.strokes}</Text>
//                   </View>
//                   <View style={styles.statCol}>
//                     <View style={styles.statChip}>
//                       <Text style={styles.statChipText}>JLPT</Text>
//                     </View>
//                     <Text style={styles.statValue}>{kanjiData.level}</Text>
//                   </View>
//                   <View style={styles.statCol}>
//                     <View style={styles.statChip}>
//                       <Text style={styles.statChipText}>Tần suất</Text>
//                     </View>
//                     <Text style={styles.statValue}>
//                       {kanjiData.frequency ? `#${kanjiData.frequency}` : '—'}
//                     </Text>
//                   </View>
//                 </View>

//                 {/* Thanh tần suất */}
//                 {kanjiData.frequency && (
//                   <View style={styles.frequencyContainer}>
//                     <View style={styles.frequencyBar}>
//                       <View
//                         style={[
//                           styles.frequencyFill,
//                           { width: `${(kanjiData.frequency / 2500) * 100}%` },
//                         ]}
//                       />
//                     </View>
//                     <Text style={styles.frequencyText}>
//                       #{kanjiData.frequency} / 2500
//                     </Text>
//                   </View>
//                 )}

//                 {/* Phát âm */}
//                 <View style={styles.section}>
//                   <Text style={styles.sectionTitle}>Phát âm</Text>
//                   {kanjiData.kunyomi.length > 0 && (
//                     <View style={styles.pronRow}>
//                       <Text style={styles.diamond}>◆</Text>
//                       <View>
//                         <Text style={styles.pronLabel}>Kunyomi</Text>
//                         <Text style={styles.pronValue}>
//                           {kanjiData.kunyomi.join('、')}
//                         </Text>
//                       </View>
//                     </View>
//                   )}
//                   {kanjiData.onyomi.length > 0 && (
//                     <View style={styles.pronRow}>
//                       <Text style={styles.diamond}>◆</Text>
//                       <View>
//                         <Text style={styles.pronLabel}>Onyomi</Text>
//                         <Text style={styles.pronValue}>
//                           {kanjiData.onyomi.join('、')}
//                         </Text>
//                       </View>
//                     </View>
//                   )}
//                 </View>

//                 {/* Thứ tự nét */}
//                 <View style={styles.section}>
//                   <Text style={styles.sectionTitle}>Thứ tự nét</Text>
//                   <View style={styles.strokeWrap}>
//                     <KanjiStrokeOrder kanji={kanjiData.kanji} size={200} />
//                   </View>
//                 </View>

//                 {/* Bộ thủ & Phân tích */}
//                 <View style={styles.section}>
//                   <View style={styles.bushuHeader}>
//                     <Text style={styles.sectionTitle}>Bộ & Phân tích</Text>
//                   </View>
//                   {kanjiData.components?.map((comp, idx) => (
//                     <View key={idx} style={styles.componentRow}>
//                       <View style={styles.componentBar} />
//                       <Text style={styles.componentKanji}>{comp.kanji}</Text>
//                       <Text style={styles.componentHanViet}>「{comp.hanViet}」</Text>
//                     </View>
//                   ))}
//                 </View>

//                 {/* Nghĩa */}
//                 <View style={styles.section}>
//                   <Text style={styles.sectionTitle}>Nghĩa</Text>
//                   {kanjiData.meanings.map((m, idx) => (
//                     <View key={idx} style={styles.meaningRow}>
//                       <Text style={styles.meaningDot}>•</Text>
//                       <Text style={styles.meaningText}>{m}</Text>
//                     </View>
//                   ))}
//                 </View>

//                 {/* Ví dụ */}
//                 {kanjiData.examples && kanjiData.examples.length > 0 && (
//                   <View style={styles.section}>
//                     <Text style={styles.sectionTitle}>Ví dụ</Text>
//                     {kanjiData.examples.map((ex, idx) => (
//                       <View key={idx} style={styles.exampleBox}>
//                         <Text style={styles.exampleJp}>{ex.jp}</Text>
//                         <Text style={styles.exampleReading}>{ex.reading}</Text>
//                         <Text style={styles.exampleVi}>→ {ex.vi}</Text>
//                       </View>
//                     ))}
//                   </View>
//                 )}
//               </>
//             )}
//           </ScrollView>

//           {/* Nút điều hướng Trước/Sau */}
//           {totalKanji > 1 && (
//             <View style={styles.navButtons}>
//               <TouchableOpacity
//                 style={[styles.navBtn, currentIndex === 0 && styles.navBtnDisabled]}
//                 onPress={goToPrev}
//                 disabled={currentIndex === 0}
//               >
//                 <Text style={styles.navBtnText}>◀ Trước</Text>
//               </TouchableOpacity>
//               <Text style={styles.navCounter}>
//                 {currentIndex + 1} / {totalKanji}
//               </Text>
//               <TouchableOpacity
//                 style={[styles.navBtn, currentIndex === totalKanji - 1 && styles.navBtnDisabled]}
//                 onPress={goToNext}
//                 disabled={currentIndex === totalKanji - 1}
//               >
//                 <Text style={styles.navBtnText}>Sau ▶</Text>
//               </TouchableOpacity>
//             </View>
//           )}
//         </View>
//       </View>
//     </Modal>
//   );
// }

// const styles = StyleSheet.create({
//   modalOverlay: {
//     flex: 1,
//     justifyContent: 'flex-end',
//   },
//   backdrop: {
//     ...StyleSheet.absoluteFillObject,
//     backgroundColor: 'rgba(0,0,0,0.5)',
//   },
//   modalContainer: {
//     backgroundColor: '#fff',
//     borderTopLeftRadius: 24,
//     borderTopRightRadius: 24,
//     maxHeight: '92%',
//     minHeight: '70%',
//     overflow: 'hidden',
//   },
//   header: {
//     borderTopLeftRadius: 24,
//     borderTopRightRadius: 24,
//     overflow: 'hidden',
//   },
//   headerContent: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     paddingHorizontal: 16,
//     paddingVertical: 16,
//   },
//   closeBtn: {
//     width: 32,
//     height: 32,
//     borderRadius: 16,
//     backgroundColor: 'rgba(255,255,255,0.2)',
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   closeBtnText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: '600',
//   },
//   headerTitle: {
//     color: '#fff',
//     fontSize: 18,
//     fontWeight: '700',
//   },
//   tabBar: {
//     backgroundColor: '#fff',
//     borderBottomWidth: 1,
//     borderBottomColor: '#e2e8f0',
//   },
//   tabContainer: {
//     flexDirection: 'row',
//     paddingHorizontal: 12,
//     paddingVertical: 8,
//   },
//   tabItem: {
//     paddingHorizontal: 20,
//     paddingVertical: 8,
//     borderRadius: 20,
//     marginHorizontal: 4,
//     backgroundColor: '#f1f5f9',
//   },
//   tabItemActive: {
//     backgroundColor: TEAL,
//   },
//   tabText: {
//     fontSize: 18,
//     fontWeight: '700',
//     color: '#475569',
//   },
//   tabTextActive: {
//     color: '#fff',
//   },
//   content: {
//     flex: 1,
//   },
//   contentContainer: {
//     padding: 16,
//     paddingBottom: 30,
//   },
//   loadingContainer: {
//     padding: 40,
//     alignItems: 'center',
//   },
//   loadingText: {
//     color: '#94a3b8',
//     fontSize: 14,
//   },
//   errorContainer: {
//     padding: 40,
//     alignItems: 'center',
//   },
//   errorText: {
//     color: '#ef4444',
//     fontSize: 14,
//     textAlign: 'center',
//   },
//   kanjiHeader: {
//     alignItems: 'center',
//     marginBottom: 20,
//   },
//   bigKanji: {
//     fontSize: 64,
//     fontWeight: '800',
//     color: TEAL_DARK,
//   },
//   bigHanViet: {
//     fontSize: 14,
//     color: '#64748b',
//     fontWeight: '600',
//     marginTop: 4,
//   },
//   statsRow: {
//     flexDirection: 'row',
//     marginBottom: 16,
//     paddingHorizontal: 4,
//   },
//   statCol: {
//     flex: 1,
//     alignItems: 'center',
//   },
//   statChip: {
//     paddingHorizontal: 10,
//     paddingVertical: 4,
//     borderRadius: 12,
//     borderWidth: 1,
//     borderColor: '#cbd5e1',
//     backgroundColor: '#f8fafc',
//   },
//   statChipText: {
//     fontSize: 11,
//     color: TEXT_COLOR,
//     fontWeight: '600',
//   },
//   statValue: {
//     fontSize: 18,
//     fontWeight: '800',
//     color: TEAL,
//     marginTop: 6,
//   },
//   frequencyContainer: {
//     marginBottom: 16,
//   },
//   frequencyBar: {
//     height: 6,
//     backgroundColor: '#e2e8f0',
//     borderRadius: 3,
//     overflow: 'hidden',
//   },
//   frequencyFill: {
//     height: 6,
//     backgroundColor: TEAL,
//     borderRadius: 3,
//   },
//   frequencyText: {
//     fontSize: 10,
//     color: '#94a3b8',
//     marginTop: 4,
//     textAlign: 'center',
//   },
//   section: {
//     marginBottom: 20,
//   },
//   sectionTitle: {
//     fontSize: 16,
//     fontWeight: '800',
//     color: '#0f172a',
//     marginBottom: 10,
//   },
//   pronRow: {
//     flexDirection: 'row',
//     alignItems: 'flex-start',
//     marginBottom: 10,
//   },
//   diamond: {
//     color: TEXT_COLOR,
//     fontSize: 16,
//     marginRight: 8,
//     marginTop: 2,
//   },
//   pronLabel: {
//     fontSize: 13,
//     fontWeight: '700',
//     color: TEAL,
//   },
//   pronValue: {
//     fontSize: 16,
//     color: TEAL_DARK,
//     marginTop: 2,
//   },
//   strokeWrap: {
//     alignItems: 'center',
//   },
//   bushuHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     marginBottom: 6,
//   },
//   componentRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginTop: 8,
//   },
//   componentBar: {
//     width: 3,
//     height: 18,
//     backgroundColor: TEXT_COLOR,
//     marginRight: 8,
//     borderRadius: 2,
//   },
//   componentKanji: {
//     fontSize: 24,
//     fontWeight: '700',
//     color: TEAL_DARK,
//     marginRight: 6,
//   },
//   componentHanViet: {
//     fontSize: 14,
//     color: TEAL,
//     fontWeight: '500',
//   },
//   meaningRow: {
//     flexDirection: 'row',
//     alignItems: 'flex-start',
//     marginBottom: 6,
//   },
//   meaningDot: {
//     fontSize: 16,
//     color: TEXT_COLOR,
//     marginRight: 8,
//   },
//   meaningText: {
//     flex: 1,
//     fontSize: 15,
//     color: '#1e293b',
//     lineHeight: 22,
//   },
//   exampleBox: {
//     marginBottom: 12,
//     backgroundColor: '#f8fafc',
//     padding: 12,
//     borderRadius: 12,
//   },
//   exampleJp: {
//     fontSize: 15,
//     fontWeight: '700',
//     color: '#0f172a',
//   },
//   exampleReading: {
//     fontSize: 13,
//     color: TEAL,
//     marginTop: 2,
//   },
//   exampleVi: {
//     fontSize: 13,
//     color: '#475569',
//     marginTop: 2,
//   },
//   navButtons: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     paddingHorizontal: 20,
//     paddingVertical: 12,
//     borderTopWidth: 1,
//     borderTopColor: '#e2e8f0',
//     backgroundColor: '#fff',
//   },
//   navBtn: {
//     paddingHorizontal: 20,
//     paddingVertical: 10,
//     backgroundColor: TEAL,
//     borderRadius: 20,
//   },
//   navBtnDisabled: {
//     backgroundColor: '#cbd5e1',
//   },
//   navBtnText: {
//     color: '#fff',
//     fontWeight: '600',
//     fontSize: 14,
//   },
//   navCounter: {
//     fontSize: 14,
//     color: '#475569',
//     fontWeight: '600',
//   },
// });