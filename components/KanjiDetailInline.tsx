///////KanjiDetailInline.tsx
import React, {
  useState,
  useEffect,
  useRef,
  useTransition,
  startTransition,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { KanjiStrokeOrder } from './KanjiStrokeOrder';
import {
  getKanjiByCharFull,
  getExamplesByKanjiChar,
  type KanjiItem,
  type KanjiExample,
} from '../assets/data_JLPT_kanji';
import { preloader } from '../services/KanjiPreloader';
import VocabDetailInline from './VocabDetailInline';
import { KeyboardAwareScrollViewCompat } from './KeyboardAwareScrollViewCompat';
import { FeedbackSection } from './FeedbackSection';
import AIExplainPanel from './AIExplainPanel';
import { useColors } from '../artifacts/mirai-jp/hooks/useColors';

// Giữ cố định — màu cam của viên kim cương "◆" trước Kunyomi/Onyomi là điểm
// nhấn trang trí riêng, không phải màu giao diện chính, nên không đổi theo theme.
const icon_line_COLOR = '#e47b0b';

interface KanjiDetailInlineProps {
  kanjiChars: string[];
  initialIndex?: number;
  onClose?: () => void;
}

// ─── TabItem: React.memo, không re-render nếu props không đổi ────────────────
// Nhận thêm "color" (c.primary hiện tại) làm prop vì component đã memo hoá —
// nếu chỉ đọc useColors() bên trong, đổi theme sẽ KHÔNG trigger re-render vì
// props không đổi. Truyền color qua prop để memo so sánh đúng.
const TabItem = React.memo(
  ({
    char,
    index,
    isActive,
    onPress,
    activeColor,
    inactiveTextColor,
  }: {
    char: string;
    index: number;
    isActive: boolean;
    onPress: (idx: number) => void;
    activeColor: string;
    inactiveTextColor: string;
  }) => (
    <TouchableOpacity
      style={[
        styles.tabItem,
        { borderBottomColor: isActive ? activeColor : 'transparent' },
      ]}
      onPress={() => onPress(index)}
    >
      <Text
        style={[
          styles.tabText,
          { color: isActive ? activeColor : inactiveTextColor },
          isActive && styles.tabTextActive,
        ]}
      >
        {char}
      </Text>
    </TouchableOpacity>
  )
);
TabItem.displayName = 'TabItem';

const MemoizedStrokeOrder = React.memo(({ kanji, spinnerColor }: { kanji: string; spinnerColor: string }) => {
  const [renderStroke, setRenderStroke] = useState(false);

  useEffect(() => {
    console.log(`[MemoizedStrokeOrder] "${kanji}" — bắt đầu effect, đặt renderStroke=false`);
    setRenderStroke(false);
    const id = requestAnimationFrame(() => {
      console.log(`[MemoizedStrokeOrder] "${kanji}" — rAF chạy, đặt renderStroke=true`);
      setRenderStroke(true);
    });
    return () => {
      console.log(`[MemoizedStrokeOrder] "${kanji}" — cleanup, hủy rAF`);
      cancelAnimationFrame(id);
      setRenderStroke(false);
    };
  }, [kanji]);

  console.log(`[MemoizedStrokeOrder] render "${kanji}" — renderStroke =`, renderStroke);

  if (!renderStroke) {
    return (
      <View style={[styles.strokeWrap, { height: 180, justifyContent: 'center' }]}>
        <ActivityIndicator color={spinnerColor} />
      </View>
    );
  }

  return (
    <View style={styles.strokeWrap}>
      <KanjiStrokeOrder key={kanji} kanji={kanji} size={180} />
    </View>
  );
});

MemoizedStrokeOrder.displayName = 'MemoizedStrokeOrder';

// ─── Skeleton cho sections đang chờ render ───────────────────────────────────
const SectionSkeleton = React.memo(({ lineColor }: { lineColor: string }) => (
  <View style={styles.skeletonWrap}>
    {[80, 120, 60].map((w, i) => (
      <View key={i} style={[styles.skeletonLine, { width: `${w}%` as any, backgroundColor: lineColor }]} />
    ))}
  </View>
));
SectionSkeleton.displayName = 'SectionSkeleton';

// ─── Banner "Sớm cập nhật" — hiện khi chữ không có trong CSDL ───────────────
// Giữ nguyên tông màu cam cảnh báo cố định — đây là banner thông báo đặc
// biệt, không phải UI nền chính, nên không đổi theo theme.
const NoDataBanner = React.memo(({ char, accentColor }: { char: string; accentColor: string }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[styles.noDataBanner, { opacity: fadeAnim }]}>
      <Text style={styles.noDataEmoji}>🔔</Text>
      <View style={styles.noDataTextWrap}>
        <Text style={styles.noDataTitle}>Sớm cập nhật</Text>
        <Text style={styles.noDataSub}>
          Chữ <Text style={[styles.noDataChar, { color: accentColor }]}>&quot;{char}&quot;</Text> chưa có trong cơ sở dữ liệu.{'\n'}
          Chúng tôi sẽ bổ sung trong thời gian tới.
        </Text>
      </View>
    </Animated.View>
  );
});
NoDataBanner.displayName = 'NoDataBanner';

// ════════════════════════════════════════════════════════════════════════════
// COMPONENT CHÍNH
// ════════════════════════════════════════════════════════════════════════════

export default function KanjiDetailInline({
  kanjiChars,
  initialIndex = 0,
}: KanjiDetailInlineProps) {
  const c = useColors(); // bảng màu hiện tại — tự đổi theo giờ / lựa chọn người dùng
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [selectedExample, setSelectedExample] = useState<KanjiExample | null>(null);
  const [sectionsReady, setSectionsReady] = useState(false);
  const currentKanji = kanjiChars[currentIndex];
  const totalKanji = kanjiChars.length;
  const [kanjiData, setKanjiData] = useState<KanjiItem | null>(null);
  const [examples, setExamples] = useState<KanjiExample[]>([]);

  useEffect(() => {
    setKanjiData(null);
    setExamples([]);
    const id = requestAnimationFrame(() => {
      const data = getKanjiByCharFull(currentKanji) || null;
      const hexCurrent = [...currentKanji].map(c => c.codePointAt(0)!.toString(16));
      const hexDataKanji = data?.kanji ? [...data.kanji].map(c => c.codePointAt(0)!.toString(16)) : [];
      console.log('[KanjiDetail] currentKanji =', JSON.stringify(currentKanji), 'length=', currentKanji.length, 'hex=', hexCurrent);
      console.log('[KanjiDetail] kanjiData.kanji =', JSON.stringify(data?.kanji), 'length=', data?.kanji?.length, 'hex=', hexDataKanji);
      console.log('[KanjiDetail] ⚖️ SO SÁNH: currentKanji === kanjiData.kanji ?', currentKanji === data?.kanji);
      setKanjiData(data);
      setExamples(getExamplesByKanjiChar(currentKanji));
    });
    return () => cancelAnimationFrame(id);
  }, [currentKanji]);

  useEffect(() => {
    setSectionsReady(false);
    const id = requestAnimationFrame(() => {
      startTransition(() => setSectionsReady(true));
    });
    return () => cancelAnimationFrame(id);
  }, [currentKanji]);

  const handleIndexChange = (index: number) => {
    console.log('[Tab] Bấm tab index =', index, 'kanji =', JSON.stringify(kanjiChars[index]));
    startTransition(() => setCurrentIndex(index));
    preloader.preloadSurroundingKanji(kanjiChars, index);
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      {/* Tab chuyển đổi kanji — LUÔN hiện kể cả khi không có dữ liệu */}
      {totalKanji > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.tabBar, { borderColor: c.border }]}
          contentContainerStyle={{ paddingVertical: 0 }}
          removeClippedSubviews={true}
        >
          <View style={styles.tabContainer}>
            {kanjiChars.map((char, idx) => (
              <TabItem
                key={`${char}_${idx}`}
                char={char}
                index={idx}
                isActive={currentIndex === idx}
                onPress={handleIndexChange}
                activeColor={c.primary}
                inactiveTextColor={c.mutedForeground}
              />
            ))}
          </View>
        </ScrollView>
      )}

      {/* ── Nếu không có dữ liệu: hiện banner, vẫn giữ nav bên dưới ──────── */}
      {!kanjiData ? (
        <View style={styles.noDataContainer}>
          <NoDataBanner char={currentKanji} accentColor={c.primary} />
        </View>
      ) : (
        <KeyboardAwareScrollViewCompat
          style={styles.content}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
        >
          {/* ── PHASE 1: Header — render ngay lập tức ──────────────────────── */}
          <View style={styles.kanjiHeader}>
            <View style={styles.furiganaContainer}>
              {kanjiData.readings.onyomi.length > 0 &&
                kanjiData.readings.kunyomi.length === 0 && (
                  <Text style={[styles.furiganaText, { color: c.mutedForeground }]}>{kanjiData.readings.onyomi[0]}</Text>
                )}
            </View>
            <Text style={[styles.bigKanji, { color: c.text }]}>{kanjiData.kanji}</Text>
            <Text style={[styles.bigHanViet, { color: c.primary }]}>{kanjiData.hanviet.join(' • ')}</Text>
          </View>

          {/* Stats row — nhẹ, render ngay cùng header */}
          <View style={[styles.statsRow, { backgroundColor: c.muted }]}>
            <View style={styles.statCol}>
              <View style={[styles.statChip, { backgroundColor: c.primary }]}>
                <Text style={[styles.statChipText, { color: c.primaryForeground }]}>JLPT</Text>
              </View>
              <Text style={[styles.statValue, { color: c.text }]}>{kanjiData.jlpt}</Text>
            </View>
            <View style={styles.statCol}>
              <View style={[styles.statChip, { backgroundColor: c.primary }]}>
                <Text style={[styles.statChipText, { color: c.primaryForeground }]}>Tần suất</Text>
              </View>
              <Text style={[styles.statValue, { color: c.text }]}>
                {kanjiData.freq ? `#${kanjiData.freq}` : '—'}
              </Text>
            </View>
          </View>

          {/* ── PHASE 2: Sections nặng — chỉ render khi sectionsReady = true */}
          {!sectionsReady ? (
            <SectionSkeleton lineColor={c.muted} />
          ) : (
            <>
              {/* Phát âm */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: c.primary }]}>Phát âm</Text>
                {kanjiData.readings.kunyomi.length > 0 && (
                  <View style={styles.pronRow}>
                    <Text style={[styles.diamond, { color: icon_line_COLOR }]}>◆</Text>
                    <View>
                      <Text style={[styles.pronLabel, { color: c.mutedForeground }]}>Kunyomi</Text>
                      <Text style={[styles.pronValue, { color: c.text }]}>
                        {kanjiData.readings.kunyomi.join('、')}
                      </Text>
                    </View>
                  </View>
                )}
                {kanjiData.readings.onyomi.length > 0 && (
                  <View style={styles.pronRow}>
                    <Text style={[styles.diamond, { color: icon_line_COLOR }]}>◆</Text>
                    <View>
                      <Text style={[styles.pronLabel, { color: c.mutedForeground }]}>Onyomi</Text>
                      <Text style={[styles.pronValue, { color: c.text }]}>
                        {kanjiData.readings.onyomi.join('、')}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Thứ tự nét */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: c.primary }]}>Thứ tự nét</Text>
                <MemoizedStrokeOrder key={kanjiData.kanji} kanji={kanjiData.kanji} spinnerColor={c.primary} />
              </View>

              {/* Bộ thủ & Phân tích */}
              {kanjiData.components && kanjiData.components.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: c.primary }]}>Bộ & Phân tích</Text>
                  {kanjiData.components.map((comp, idx) => (
                    <View key={`${comp.kanji}_${idx}`} style={styles.componentRow}>
                      <View style={[styles.componentBar, { backgroundColor: c.primary }]} />
                      <Text style={[styles.componentKanji, { color: c.text }]}>{comp.kanji}</Text>
                      {comp.hanViet ? (
                        <Text style={[styles.componentHanViet, { color: c.mutedForeground }]}>{comp.hanViet}</Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              )}

              {/* Nghĩa */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: c.primary }]}>Nghĩa</Text>
                {kanjiData.meanings_vi.map((m, idx) => (
                  <View key={idx} style={styles.meaningRow}>
                    <Text style={[styles.meaningDot, { color: c.primary }]}>•</Text>
                    <Text style={[styles.meaningText, { color: c.text }]}>{m}</Text>
                  </View>
                ))}
              </View>

              {/* Tra cứu từ AI */}
              <AIExplainPanel
                type="kanji"
                word={kanjiData.kanji}
                context={kanjiData.meanings_vi.join(', ')}
              />
              {examples.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: c.primary }]}>
                    Ví dụ {examples.length}
                  </Text>
                  {examples.map((ex, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.exampleBox, { backgroundColor: c.muted, borderLeftColor: c.primary }]}
                      onPress={() => setSelectedExample(ex)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.exampleJp, { color: c.text }]}>{ex.jp}</Text>
                      <Text style={[styles.exampleReading, { color: c.mutedForeground }]}>{ex.reading}</Text>
                      <Text style={[styles.exampleVi, { color: c.mutedForeground }]}>→ {ex.vi}</Text>
                      <Text style={{ fontSize: 48, marginTop: 16, right: 8, opacity: 0.06, position: 'absolute', zIndex: -1 }}>
                        🔍 
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <FeedbackSection pageKey={`kanji-detail::${kanjiData.kanji}`} />
            </>
          )}
          <View style={{ height: 30 }} />
        </KeyboardAwareScrollViewCompat>
      )}
      {selectedExample && (
      <View style={StyleSheet.absoluteFill}>
        <VocabDetailInline
          kanji={selectedExample.jp}
          hiragana={selectedExample.reading}
          nghia={selectedExample.vi}
          han=""
          level={kanjiData?.jlpt || 'N3'}
          example=""
          exampleMeaning=""
          id={selectedExample.jp}
          onClose={() => setSelectedExample(null)}
        />
      </View>
    )}
    </View>
  );
}

// ─── Styles (chỉ layout — màu gán inline theo theme ở trên) ───────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    maxHeight: 50,
    borderBottomWidth: 1,
  },
  tabContainer: { 
    flexDirection: 'row', 
    paddingHorizontal: 10 
  },
  tabItem: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 2,
  },
  tabText: { 
    fontSize: 16, 
  },
  tabTextActive: { 
    fontWeight: 'bold' 
  },
  content: { 
    flex: 1, 
    padding: 15, 
    paddingTop: 0 
  },
  kanjiHeader: { 
    alignItems: 'center', 
    marginBottom: 20 
  },
  furiganaContainer: { 
    height: 20, 
    justifyContent: 'center' 
  },
  furiganaText: { 
    fontSize: 14, 
  },
  bigKanji: {
    fontSize: 42,
    fontWeight: 'bold',
    marginVertical: 5,
  },
  bigHanViet: {
    fontSize: 18,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    padding: 10,
    borderRadius: 8,
  },
  statCol: { alignItems: 'center' },
  statChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 5,
  },
  statChipText: { 
    fontSize: 11, 
    fontWeight: 'bold' 
  },
  statValue: { 
    fontSize: 16, 
    fontWeight: 'bold', 
  },
  skeletonWrap: { 
    paddingTop: 16, 
    paddingHorizontal: 4, 
    gap: 12 
  },
  skeletonLine: {
    height: 14,
    borderRadius: 7,
    opacity: 0.6,
  },
  section: { 
    marginBottom: 25 
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    paddingBottom: 5,
  },
  pronRow: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    marginBottom: 8, 
    flexWrap: 'wrap',  
  },
  diamond: { 
    marginRight: 8, 
    fontSize: 12, 
    marginTop: 2 
  },
  pronLabel: { 
    fontSize: 12, 
  },
  pronValue: 
  { 
    fontSize: 16, 
    fontWeight: '500',
    flex: 1,                 
    flexWrap: 'wrap',        
    paddingRight: 8,
   },
  strokeWrap: {
    width: "100%",
    alignItems: 'stretch',       
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  componentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingLeft: 8,
  },
  componentBar: {
    width: 3,
    height: 20,
    borderRadius: 2,
    marginRight: 10,
  },
  componentKanji: { fontSize: 20, fontWeight: 'bold', marginRight: 8 },
  componentHanViet: { fontSize: 14 },
  meaningRow: { flexDirection: 'row', marginBottom: 6, alignItems: 'flex-start' },
  meaningDot: { marginRight: 8, fontSize: 16, lineHeight: 22 },
  meaningText: { fontSize: 15, flex: 1, lineHeight: 22 },
  exampleBox: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
  },
  exampleJp: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  exampleReading: { fontSize: 13, marginBottom: 4 },
  exampleVi: { fontSize: 14 },

  // Banner "Sớm cập nhật" — tông cam cố định, không đổi theo theme (xem comment ở component)
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  noDataBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff7ed',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fed7aa',
    padding: 20,
    gap: 14,
    maxWidth: 340,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  noDataEmoji: { fontSize: 32, marginTop: 2 },
  noDataTextWrap: { flex: 1 },
  noDataTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#c2410c',
    marginBottom: 6,
  },
  noDataSub: {
    fontSize: 13,
    color: '#7c3aed',
    lineHeight: 20,
  },
  noDataChar: {
    fontWeight: '800',
  },
});