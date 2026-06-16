// components/FlashcardDetail.tsx
// ─────────────────────────────────────────────────────────────────────────────
// FlashcardDetail.tsx — Component lật thẻ từ vựng
//
// Tính năng:
//   • Lật thẻ xem mặt trước (từ vựng) / mặt sau (nghĩa)
//   • Phát âm tiếng Nhật (expo-speech)
//   • Đánh dấu từ yêu thích (bookmark)
//   • Điều hướng Trước / Tiếp
//   • Thanh tiến trình học tập
//   • Vuốt trái/phải để chuyển thẻ
//   • Tự động lật thẻ (auto-scroll) với cấu hình thời gian
//   • Cấu hình mặt trước/sau (chọn field hiển thị)
//   • Xáo trộn thẻ ngẫu nhiên
//   • Đặt lại thứ tự thẻ
//   • Menu cài đặt (Modal)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  PanResponder,
  StatusBar,
  Alert,
  Modal,
  Pressable,
  Switch,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import * as Speech from 'expo-speech';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Màu chủ đạo
const TEAL = "#1F6F7A";
const TEAL_DARK = "#1c5765";

export interface VocabItem {
  id: string;
  kanji: string;
  hiragana: string;
  han: string;
  nghia: string;
  example?: string;
  exampleMeaning?: string;
}

export type Field = "kanji" | "hiragana" | "han" | "nghia" | "example";

export const ALL_FIELDS: Field[] = ["kanji", "hiragana", "han", "nghia", "example"];

export const FIELD_LABELS: Record<Field, string> = {
  kanji: "Kanji",
  hiragana: "Hiragana",
  han: "Hán Việt",
  nghia: "Nghĩa",
  example: "Ví dụ",
};

interface FlashcardDetailProps {
  vocabList: VocabItem[];
  initialIndex: number;
  onClose: () => void;
  onBookmarkToggle?: (vocabId: string) => void;
  isBookmarked?: (vocabId: string) => boolean;
  onNext?: () => void;
  onPrev?: () => void;
  frontFields?: Field[];
  backFields?: Field[];
  autoScroll?: boolean;
  autoScrollSec?: number;
  onAutoScrollChange?: (enabled: boolean, seconds: number) => void;
  onFieldsChange?: (front: Field[], back: Field[]) => void;
}

// Hàm xáo trộn mảng
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Component ToggleRow
function ToggleRow({
  label,
  value,
  onToggle,
  isLast,
}: {
  label: string;
  value: boolean;
  onToggle: () => void;
  isLast: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.menuRow, isLast && { borderBottomWidth: 0 }]}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <Text style={styles.menuRowLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: "#cbd5e1", true: TEAL }}
        thumbColor="#fff"
      />
    </TouchableOpacity>
  );
}

export default function FlashcardDetail({
  vocabList: initialVocabList,
  initialIndex,
  onClose,
  onBookmarkToggle,
  isBookmarked,
  onNext,
  onPrev,
  frontFields: initialFrontFields = ["kanji", "hiragana"],
  backFields: initialBackFields = ["nghia", "han", "example"],
  autoScroll: initialAutoScroll = false,
  autoScrollSec: initialAutoScrollSec = 3,
  onAutoScrollChange,
  onFieldsChange,
}: FlashcardDetailProps) {
  // State cho danh sách từ vựng (có thể bị xáo trộn)
  const [vocabList, setVocabList] = useState<VocabItem[]>(initialVocabList);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [flipped, setFlipped] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Cấu hình mặt trước/sau
  const [frontFields, setFrontFields] = useState<Field[]>(initialFrontFields);
  const [backFields, setBackFields] = useState<Field[]>(initialBackFields);
  
  // Tự động cuộn
  const AUTO_SCROLL_PRESETS = [2, 3, 5, 8, 10, 15] as const;
  const [autoScroll, setAutoScroll] = useState(initialAutoScroll);
  const [autoScrollSec, setAutoScrollSec] = useState(initialAutoScrollSec);
  
  const flipAnim = useRef(new Animated.Value(0)).current;
  const autoScrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentVocab = vocabList[currentIndex];
  const total = vocabList.length;
  const progress = ((currentIndex + 1) / total) * 100;

  // Lưu cấu hình khi thay đổi
  useEffect(() => {
    if (onFieldsChange) {
      onFieldsChange(frontFields, backFields);
    }
  }, [frontFields, backFields]);

  useEffect(() => {
    if (onAutoScrollChange) {
      onAutoScrollChange(autoScroll, autoScrollSec);
    }
  }, [autoScroll, autoScrollSec]);

  // Animation lật thẻ
  useEffect(() => {
    Animated.spring(flipAnim, {
      toValue: flipped ? 1 : 0,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
  }, [flipped, flipAnim]);

  // Tự động chuyển thẻ
  useEffect(() => {
    if (autoScrollTimer.current) {
      clearTimeout(autoScrollTimer.current);
      autoScrollTimer.current = null;
    }
    
    if (autoScroll && !flipped) {
      autoScrollTimer.current = setTimeout(() => {
        if (currentIndex + 1 < total) {
          goToNext();
        } else if (currentIndex + 1 === total) {
          setCurrentIndex(0);
          setFlipped(false);
        }
      }, autoScrollSec * 1000);
    }
    
    return () => {
      if (autoScrollTimer.current) {
        clearTimeout(autoScrollTimer.current);
      }
    };
  }, [autoScroll, currentIndex, flipped, total, autoScrollSec]);

  const frontRotate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });
  const backRotate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });
  const frontOpacity = flipAnim.interpolate({
    inputRange: [0, 0.5, 0.5, 1],
    outputRange: [1, 1, 0, 0],
  });
  const backOpacity = flipAnim.interpolate({
    inputRange: [0, 0.5, 0.5, 1],
    outputRange: [0, 0, 1, 1],
  });

  // Vuốt trái/phải để chuyển thẻ
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 50 && currentIndex > 0) {
          goToPrevious();
        } else if (gestureState.dx < -50 && currentIndex < total - 1) {
          goToNext();
        }
      },
    })
  ).current;

  const goToNext = () => {
    if (onNext) {
      onNext();
    } else if (currentIndex < total - 1) {
      setFlipped(false);
      flipAnim.setValue(0);
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goToPrevious = () => {
    if (onPrev) {
      onPrev();
    } else if (currentIndex > 0) {
      setFlipped(false);
      flipAnim.setValue(0);
      setCurrentIndex(currentIndex - 1);
    }
  };

  // Xáo trộn thẻ
  const handleShuffle = () => {
    const shuffled = shuffleArray(vocabList);
    setVocabList(shuffled);
    setCurrentIndex(0);
    setFlipped(false);
    setIsShuffled(true);
    Alert.alert("🔀 Xáo trộn", "Các thẻ đã được xáo trộn ngẫu nhiên!");
  };

  // Đặt lại thứ tự gốc
  const handleReset = () => {
    setVocabList(initialVocabList);
    setCurrentIndex(initialIndex);
    setFlipped(false);
    setIsShuffled(false);
    Alert.alert("↺ Đặt lại", "Đã khôi phục thứ tự thẻ ban đầu!");
  };

  const speakWord = () => {
    if (currentVocab?.kanji) {
      Speech.speak(currentVocab.kanji, { language: 'ja-JP', pitch: 1, rate: 0.9 });
    }
  };

  const handleFlip = () => {
    setFlipped(!flipped);
  };

  const isCurrentBookmarked = isBookmarked ? isBookmarked(currentVocab?.id || '') : false;

  const handleBookmark = () => {
    if (onBookmarkToggle && currentVocab) {
      onBookmarkToggle(currentVocab.id);
    }
  };

  // ✅ THAY ĐỔI: Đổi tên hàm và chức năng thành nút back
  const handleBack = () => {
    onClose(); // Gọi onClose để quay lại màn hình danh sách
  };

  // Render mặt trước
  const renderFrontContent = () => {
    return frontFields.map((field) => {
      let value = currentVocab[field as keyof VocabItem];
      if (!value) return null;
      
      let fontSize = 32;
      if (field === 'kanji') fontSize = 56;
      if (field === 'hiragana') fontSize = 20;
      if (field === 'han') fontSize = 16;
      if (field === 'nghia') fontSize = 24;
      if (field === 'example') fontSize = 14;
      
      return (
        <View key={field} style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>{FIELD_LABELS[field]}</Text>
          <Text style={[styles.fieldText, { fontSize }]}>
            {value}
          </Text>
        </View>
      );
    });
  };

    // Render mặt sau
  const renderBackContent = () => {
    return backFields.map((field) => {
      if (field === 'example') {
        if (!currentVocab.example) return null;
        return (
          <View key={field} style={styles.exampleContainer}>
            <Text style={styles.exampleLabel}>📖 {FIELD_LABELS[field]}</Text>
            <Text style={styles.exampleText}>{currentVocab.example}</Text>
            {currentVocab.exampleMeaning && (
              <Text style={styles.exampleMeaningText}>→ {currentVocab.exampleMeaning}</Text>
            )}
          </View>
        );
      }
      
      let value = currentVocab[field as keyof VocabItem];
      if (!value) return null;
      
      let fontSize = 24;
      if (field === 'kanji') fontSize = 56;
      if (field === 'hiragana') fontSize = 18;
      if (field === 'han') fontSize = 16;
      if (field === 'nghia') fontSize = 28;
      
      return (
        <View key={field} style={styles.fieldBlock}>
          <Text style={[styles.fieldLabel, styles.fieldLabelBack]}>{FIELD_LABELS[field]}</Text>
          <Text style={[styles.fieldTextBack, { fontSize }]}>
            {value}
          </Text>
        </View>
      );
    });
  };

  if (!currentVocab) {
    return null;
  }

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#f0f4f8" />
      <View style={styles.container}>
        {/* Header - ✅ ĐÃ THAY icon 🏠 thành nút back ← */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.headerBtn}>
            <Text style={styles.headerIcon}>←</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            {currentIndex + 1} / {total}
          </Text>

          <View style={styles.headerRight}>
            <TouchableOpacity onPress={handleBookmark} style={styles.headerBtn}>
              <Text style={styles.headerIcon}>
                {isCurrentBookmarked ? '⭐' : '☆'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={speakWord} style={styles.headerBtn}>
              <Text style={styles.headerIcon}>🔊</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMenuOpen(true)} style={styles.headerBtn}>
              <Text style={styles.headerIcon}>⚙️</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Thanh tiến trình */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>

        {/* Nội dung thẻ lật */}
        {/* Nội dung thẻ lật - NHẤN VÀO THẺ ĐỂ LẬT */}
        <View style={styles.cardContainer} {...panResponder.panHandlers}>
          <TouchableOpacity 
            activeOpacity={0.9} 
            onPress={handleFlip} 
            style={styles.cardTouch}
          >
            {/* Mặt trước */}
            <Animated.View
              style={[
                styles.card,
                styles.cardFront,
                {
                  opacity: frontOpacity,
                  transform: [{ perspective: 1000 }, { rotateY: frontRotate }],
                },
              ]}
            >
              {renderFrontContent()}
            </Animated.View>

            {/* Mặt sau */}
            <Animated.View
              style={[
                styles.card,
                styles.cardBack,
                {
                  opacity: backOpacity,
                  transform: [{ perspective: 1000 }, { rotateY: backRotate }],
                },
              ]}
            >
              {renderBackContent()}
            </Animated.View>
          </TouchableOpacity>
        </View>

        {/* Nút điều hướng chính */}
        <View style={styles.navigation}>
          <TouchableOpacity
            style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
            onPress={goToPrevious}
            disabled={currentIndex === 0}
          >
            <Text style={styles.navButtonText}>◀ Trước</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navButton, styles.navButtonNext, currentIndex === total - 1 && styles.navButtonDisabled]}
            onPress={goToNext}
            disabled={currentIndex === total - 1}
          >
            <Text style={styles.navButtonText}>Tiếp ▶</Text>
          </TouchableOpacity>
        </View>

        {/* Nút xáo trộn và đặt lại */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, isShuffled && styles.actionButtonActive]}
            onPress={handleShuffle}
          >
            <Text style={styles.actionButtonText}>🔀 Xáo trộn</Text>
          </TouchableOpacity>
          
          {isShuffled && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleReset}
            >
              <Text style={styles.actionButtonText}>↺ Đặt lại</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Auto-scroll indicator */}
        {autoScroll && !flipped && (
          <View style={styles.autoScrollIndicator}>
            <Text style={styles.autoScrollText}>
              ⏳ Tự động chuyển sau {autoScrollSec}s
            </Text>
          </View>
        )}
      </View>

      {/* Menu cài đặt Modal */}
      <Modal visible={menuOpen} transparent animationType="slide" onRequestClose={() => setMenuOpen(false)}>
        <View style={styles.menuModalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuOpen(false)} />
          <View style={styles.menuSheet}>
            <View style={styles.menuSheetHandle} />
            <View style={styles.menuSheetHeader}>
              <Text style={styles.menuSheetTitle}>Cài đặt thẻ</Text>
              <TouchableOpacity onPress={() => setMenuOpen(false)} hitSlop={10}>
                <Text style={styles.menuSheetClose}>Đóng</Text>
              </TouchableOpacity>
            </View>

            {/* Tự động cuộn */}
            <Text style={styles.menuGroupLabel}>Tự động cuộn</Text>
            <ToggleRow
              label="Bật tự động cuộn"
              value={autoScroll}
              onToggle={() => setAutoScroll(!autoScroll)}
              isLast
            />
            
            {autoScroll && (
              <>
                <Text style={styles.autoScrollHint}>Thời gian giữa mỗi thẻ</Text>
                <View style={styles.autoScrollChips}>
                  {AUTO_SCROLL_PRESETS.map((sec) => (
                    <TouchableOpacity
                      key={sec}
                      style={[
                        styles.autoScrollChip,
                        sec === autoScrollSec && styles.autoScrollChipActive,
                      ]}
                      onPress={() => setAutoScrollSec(sec)}
                    >
                      <Text style={[
                        styles.autoScrollChipText,
                        sec === autoScrollSec && styles.autoScrollChipTextActive
                      ]}>
                        {sec}s
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Mặt trước */}
            <Text style={[styles.menuGroupLabel, { marginTop: 16 }]}>Mặt trước</Text>
            {ALL_FIELDS.map((f, i) => (
              <ToggleRow
                key={`front-${f}`}
                label={FIELD_LABELS[f]}
                value={frontFields.includes(f)}
                onToggle={() => {
                  if (frontFields.includes(f)) {
                    setFrontFields(frontFields.filter(ff => ff !== f));
                  } else {
                    setFrontFields([...frontFields, f]);
                  }
                }}
                isLast={i === ALL_FIELDS.length - 1}
              />
            ))}
            
            {/* Mặt sau */}
            <Text style={[styles.menuGroupLabel, { marginTop: 14 }]}>Mặt sau</Text>
            {ALL_FIELDS.map((f, i) => (
              <ToggleRow
                key={`back-${f}`}
                label={FIELD_LABELS[f]}
                value={backFields.includes(f)}
                onToggle={() => {
                  if (backFields.includes(f)) {
                    setBackFields(backFields.filter(bf => bf !== f));
                  } else {
                    setBackFields([...backFields, f]);
                  }
                }}
                isLast={i === ALL_FIELDS.length - 1}
              />
            ))}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerIcon: {
    fontSize: 22,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },

  // Progress bar
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: TEAL,
    borderRadius: 2,
  },

  // Card container
  cardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    position: 'absolute',
    width: SCREEN_WIDTH - 40,
    minHeight: 420,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    backfaceVisibility: 'hidden',
  },
  cardFront: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  cardBack: {
    backgroundColor: TEAL,
  },

  // Field text styles
  fieldText: {
    color: '#1a202c',
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '600',
  },
  fieldTextBack: {
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '600',
  },

  // Example styles
  exampleContainer: {
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  exampleLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 8,
  },
  exampleText: {
    fontSize: 16,
    color: '#fff',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 6,
  },
  exampleMeaningText: {
    fontSize: 13,
    color: '#f6e05e',
    textAlign: 'center',
  },

  // Flip button
  flipButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 28,
    backgroundColor: '#f0f0f0',
    borderRadius: 30,
  },
  flipButtonText: {
    fontSize: 16,
    color: TEAL,
    fontWeight: '600',
  },

  // Navigation buttons
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 12,
  },
  navButton: {
    flex: 1,
    backgroundColor: '#e2e8f0',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  navButtonNext: {
    backgroundColor: TEAL,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  // closeButton: {
  //   backgroundColor: '#fff',
  //   paddingVertical: 12,
  //   paddingHorizontal: 24,
  //   borderRadius: 12,
  //   borderWidth: 1.5,
  //   borderColor: TEAL,
  // },
  // closeButtonText: {
  //   fontSize: 15,
  //   fontWeight: '600',
  //   color: TEAL,
  // },

  // Action buttons
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#e2e8f0',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonActive: {
    backgroundColor: TEAL,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a202c',
  },
  
  // Auto-scroll indicator
  autoScrollIndicator: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  autoScrollText: {
    color: '#fff',
    fontSize: 12,
  },

  // Menu Modal styles
  menuModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    justifyContent: "flex-end",
  },
  menuSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 28,
  },
  menuSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#cbd5e1",
    alignSelf: "center",
    marginBottom: 10,
  },
  menuSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  menuSheetTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  menuSheetClose: {
    fontSize: 14,
    fontWeight: "600",
    color: TEAL,
  },
  menuGroupLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  menuRowLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1e293b",
  },
  autoScrollHint: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 10,
    marginBottom: 6,
  },
  autoScrollChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 6,
  },
  autoScrollChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  autoScrollChipActive: {
    backgroundColor: TEAL,
    borderColor: TEAL,
  },
  autoScrollChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1e293b",
  },
  autoScrollChipTextActive: {
    color: "#fff",
  },
  cardTouch: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Thêm vào styles (đặt sau phần fieldText, fieldTextBack)
  fieldBlock: { 
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  fieldLabelBack: {
    color: 'rgba(255,255,255,0.6)',
  },
});