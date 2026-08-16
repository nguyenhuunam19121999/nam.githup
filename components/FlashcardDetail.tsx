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
import * as Speech from 'expo-speech';
import { AdBanner } from "../components/AdBanner";
import { useColors, useThemeMode, ThemeFadeOverlay } from "../artifacts/mirai-jp/hooks/useColors";

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  c,
}: {
  label: string;
  value: boolean;
  onToggle: () => void;
  isLast: boolean;
  c: ReturnType<typeof useColors>;
}) {
  return (
    <TouchableOpacity
      style={[styles.menuRow, { borderBottomColor: c.border }, isLast && { borderBottomWidth: 0 }]}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <Text style={[styles.menuRowLabel, { color: c.text }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: c.border, true: c.primary }}
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
  const c = useColors(); // bảng màu hiện tại — tự đổi theo giờ / lựa chọn người dùng
  const { themeMode, timeOfDay } = useThemeMode();
  const isDark = themeMode === "dark" || (themeMode === "auto" && timeOfDay === "night");

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
          <Text style={[styles.fieldLabel, { color: c.mutedForeground }]}>{FIELD_LABELS[field]}</Text>
          <Text style={[styles.fieldText, { fontSize, color: c.text }]}>
            {value}
          </Text>
        </View>
      );
    });
  };

    // Render mặt sau — nằm trên nền c.primary, nên chữ dùng c.primaryForeground
  const renderBackContent = () => {
    return backFields.map((field) => {
      if (field === 'example') {
        if (!currentVocab.example) return null;
        return (
          <View
            key={field}
            style={[styles.exampleContainer, { borderTopColor: c.primaryForeground + '33' }]}
          >
            <Text style={[styles.exampleLabel, { color: c.primaryForeground + '99' }]}>
              📖 {FIELD_LABELS[field]}
            </Text>
            <Text style={[styles.exampleText, { color: c.primaryForeground }]}>
              {currentVocab.example}
            </Text>
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
          <Text style={[styles.fieldLabel, { color: c.primaryForeground + '99' }]}>
            {FIELD_LABELS[field]}
          </Text>
          <Text style={[styles.fieldTextBack, { fontSize, color: c.primaryForeground }]}>
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
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={c.background} />
      <View style={[styles.container, { backgroundColor: c.background }]}>
        {/* Header - ✅ ĐÃ THAY icon 🏠 thành nút back ← */}
        <View style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
          <TouchableOpacity onPress={handleBack} style={styles.headerBtn}>
            <Text style={[styles.headerIcon, { color: c.text }]}>←</Text>
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: c.text }]}>
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
          <View style={[styles.progressBar, { backgroundColor: c.border }]}>
            <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: c.primary }]} />
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
                  backgroundColor: c.card,
                  borderColor: c.border,
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
                  backgroundColor: c.primary,
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
        <View style={[styles.navigation, { backgroundColor: c.card, borderTopColor: c.border }]}>
          <TouchableOpacity
            style={[
              styles.navButton,
              { backgroundColor: c.muted },
              currentIndex === 0 && styles.navButtonDisabled,
            ]}
            onPress={goToPrevious}
            disabled={currentIndex === 0}
          >
            <Text style={[styles.navButtonText, { color: c.text }]}>◀ Trước</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.navButton,
              styles.navButtonNext,
              { backgroundColor: c.primary },
              currentIndex === total - 1 && styles.navButtonDisabled,
            ]}
            onPress={goToNext}
            disabled={currentIndex === total - 1}
          >
            <Text style={[styles.navButtonText, { color: c.primaryForeground }]}>Tiếp ▶</Text>
          </TouchableOpacity>
        </View>

        {/* Nút xáo trộn và đặt lại */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: isShuffled ? c.primary : c.muted },
            ]}
            onPress={handleShuffle}
          >
            <Text style={[styles.actionButtonText, { color: isShuffled ? c.primaryForeground : c.text }]}>
              🔀 Xáo trộn
            </Text>
          </TouchableOpacity>
          
          {isShuffled && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: c.muted }]}
              onPress={handleReset}
            >
              <Text style={[styles.actionButtonText, { color: c.text }]}>↺ Đặt lại</Text>
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
          <View style={[styles.menuSheet, { backgroundColor: c.card }]}>
            <View style={[styles.menuSheetHandle, { backgroundColor: c.border }]} />
            <View style={styles.menuSheetHeader}>
              <Text style={[styles.menuSheetTitle, { color: c.text }]}>Cài đặt thẻ</Text>
              <TouchableOpacity onPress={() => setMenuOpen(false)} hitSlop={10}>
                <Text style={[styles.menuSheetClose, { color: c.primary }]}>Đóng</Text>
              </TouchableOpacity>
            </View>

            {/* Tự động cuộn */}
            <Text style={[styles.menuGroupLabel, { color: c.mutedForeground }]}>Tự động cuộn</Text>
            <ToggleRow
              label="Bật tự động cuộn"
              value={autoScroll}
              onToggle={() => setAutoScroll(!autoScroll)}
              isLast
              c={c}
            />
            
            {autoScroll && (
              <>
                <Text style={[styles.autoScrollHint, { color: c.mutedForeground }]}>
                  Thời gian giữa mỗi thẻ
                </Text>
                <View style={styles.autoScrollChips}>
                  {AUTO_SCROLL_PRESETS.map((sec) => (
                    <TouchableOpacity
                      key={sec}
                      style={[
                        styles.autoScrollChip,
                        { backgroundColor: c.muted, borderColor: c.border },
                        sec === autoScrollSec && { backgroundColor: c.primary, borderColor: c.primary },
                      ]}
                      onPress={() => setAutoScrollSec(sec)}
                    >
                      <Text
                        style={[
                          styles.autoScrollChipText,
                          { color: c.text },
                          sec === autoScrollSec && { color: c.primaryForeground },
                        ]}
                      >
                        {sec}s
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Mặt trước */}
            <Text style={[styles.menuGroupLabel, { color: c.mutedForeground, marginTop: 16 }]}>
              Mặt trước
            </Text>
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
                c={c}
              />
            ))}
            
            {/* Mặt sau */}
            <Text style={[styles.menuGroupLabel, { color: c.mutedForeground, marginTop: 14 }]}>
              Mặt sau
            </Text>
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
                c={c}
              />
            ))}
          </View>
          <ThemeFadeOverlay />
        </View>
      </Modal>
      <AdBanner />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    borderBottomWidth: 1,
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
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
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
    borderWidth: 2,
  },
  cardBack: {},

  // Field text styles
  fieldText: {
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '600',
  },
  fieldTextBack: {
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
  },
  exampleLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  exampleText: {
    fontSize: 16,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 6,
  },
  exampleMeaningText: {
    // Giữ màu vàng nổi bật cố định — luôn dễ đọc trên nền c.primary dù theme nào
    fontSize: 13,
    color: '#f6e05e',
    textAlign: 'center',
  },

  // Navigation buttons
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  navButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  navButtonNext: {},
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Auto-scroll indicator — luôn nền tối/chữ trắng cố định, không đổi theo
  // theme vì đây là lớp phủ nổi trên thẻ, cần tương phản ổn định mọi lúc.
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
  },
  menuSheetClose: {
    fontSize: 14,
    fontWeight: "600",
  },
  menuGroupLabel: {
    fontSize: 11,
    fontWeight: "700",
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
  },
  menuRowLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  autoScrollHint: {
    fontSize: 12,
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
  },
  autoScrollChipText: {
    fontSize: 13,
    fontWeight: "700",
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
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
});