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
// import {
//   type KanjiItem,
//   type KanjiExample,
// } from '../assets/data_JLPT_kanji';
// import {
//   getKanjiByChar,
//   getExamplesByKanjiChar,
// } from '../services/kanjiRepository';
import { preloader } from '../services/KanjiPreloader';
import VocabDetailInline from './VocabDetailInline';

const TEAL = '#1F6F7A';
// const TEAL_DARK = '#1c5765';
const TEXT_COLOR = '#e47b0b';
const textColor = "#1d4ed8";

interface KanjiDetailInlineProps {
  kanjiChars: string[];
  initialIndex?: number;
  onClose?: () => void;
}

// ─── TabItem: React.memo, không re-render nếu props không đổi ────────────────
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
      <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
        {char}
      </Text>
    </TouchableOpacity>
  )
);
TabItem.displayName = 'TabItem';

// ─── MemoizedStrokeOrder: dùng requestAnimationFrame thay InteractionManager ──
// requestAnimationFrame chỉ trễ 1 frame (~16ms) thay vì 100-300ms
const MemoizedStrokeOrder = React.memo(({ kanji }: { kanji: string }) => {
  const [renderStroke, setRenderStroke] = useState(false);

  useEffect(() => {
    setRenderStroke(false);
    const id = requestAnimationFrame(() => {
      setRenderStroke(true);
    });
    return () => {
      cancelAnimationFrame(id);
      setRenderStroke(false);
    };
  }, [kanji]);

  if (!renderStroke) {
    return (
      <View style={[styles.strokeWrap, { height: 180, justifyContent: 'center' }]}>
        <ActivityIndicator color={textColor} />
      </View>
    );
  }

  return (
    <View style={styles.strokeWrap}>
      <KanjiStrokeOrder kanji={kanji} size={180} />
    </View>
  );
});
MemoizedStrokeOrder.displayName = 'MemoizedStrokeOrder';

// ─── Skeleton cho sections đang chờ render ───────────────────────────────────
const SectionSkeleton = React.memo(() => (
  <View style={styles.skeletonWrap}>
    {[80, 120, 60].map((w, i) => (
      <View key={i} style={[styles.skeletonLine, { width: `${w}%` as any }]} />
    ))}
  </View>
));
SectionSkeleton.displayName = 'SectionSkeleton';

// ─── Banner "Sớm cập nhật" — hiện khi chữ không có trong CSDL ───────────────
const NoDataBanner = React.memo(({ char }: { char: string }) => {
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
          Chữ <Text style={styles.noDataChar}>&quot;{char}&quot;</Text> chưa có trong cơ sở dữ liệu.{'\n'}
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
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [selectedExample, setSelectedExample] = useState<KanjiExample | null>(null);

  // ── PHASED RENDERING ──────────────────────────────────────────────────────
  // sectionsReady = false → chỉ render Header + Stats (nhẹ, < 1 frame)
  // sectionsReady = true  → render toàn bộ sections (sau requestAnimationFrame)
  const [sectionsReady, setSectionsReady] = useState(false);

  const currentKanji = kanjiChars[currentIndex];
  const totalKanji = kanjiChars.length;

  // Dữ liệu kanji chính
  const [kanjiData, setKanjiData] = useState<KanjiItem | null>(null);

  // Ví dụ tra từ toàn bộ từ vựng (JLPT + ngành nghề)
  const [examples, setExamples] = useState<KanjiExample[]>([]);

  // Khi currentKanji thay đổi: load dữ liệu + ví dụ cùng lúc
  useEffect(() => {
    setKanjiData(null);
    setExamples([]);
    const id = requestAnimationFrame(() => {
      setKanjiData(getKanjiByCharFull(currentKanji) || null);
      setExamples(getExamplesByKanjiChar(currentKanji));
    });
    // const id = requestAnimationFrame(async () => {
    //   setKanjiData(await getKanjiByChar(currentKanji) || null);
    //   setExamples(await getExamplesByKanjiChar(currentKanji));
    // });
    return () => cancelAnimationFrame(id);
  }, [currentKanji]);

  // Khi currentKanji thay đổi: reset sections, dùng requestAnimationFrame
  // (nhanh hơn InteractionManager ~10-20x: 1 frame ~16ms thay vì 100-300ms)
  useEffect(() => {
    setSectionsReady(false);
    const id = requestAnimationFrame(() => {
      startTransition(() => setSectionsReady(true));
    });
    return () => cancelAnimationFrame(id);
  }, [currentKanji]);

  const handleIndexChange = (index: number) => {
    startTransition(() => setCurrentIndex(index));
    preloader.preloadSurroundingKanji(kanjiChars, index);
  };

  return (
    <View style={styles.container}>
      {/* Tab chuyển đổi kanji — LUÔN hiện kể cả khi không có dữ liệu */}
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
                isActive={currentIndex === idx}
                onPress={handleIndexChange}
              />
            ))}
          </View>
        </ScrollView>
      )}

      {/* ── Nếu không có dữ liệu: hiện banner, vẫn giữ nav bên dưới ──────── */}
      {!kanjiData ? (
        <View style={styles.noDataContainer}>
          <NoDataBanner char={currentKanji} />
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
        >
          {/* ── PHASE 1: Header — render ngay lập tức ──────────────────────── */}
          <View style={styles.kanjiHeader}>
            <View style={styles.furiganaContainer}>
              {/* Ưu tiên kunyomi, fallback onyomi nếu không có kunyomi */}
              {/* {kanjiData.readings.kunyomi.length > 0 && (
                <Text style={styles.furiganaText}>{kanjiData.readings.kunyomi[0]}</Text>
              )} */}
              {kanjiData.readings.onyomi.length > 0 &&
                kanjiData.readings.kunyomi.length === 0 && (
                  <Text style={styles.furiganaText}>{kanjiData.readings.onyomi[0]}</Text>
                )}
            </View>
            <Text style={styles.bigKanji}>{kanjiData.kanji}</Text>
            <Text style={styles.bigHanViet}>{kanjiData.hanviet.join(' • ')}</Text>
          </View>

          {/* Stats row — nhẹ, render ngay cùng header */}
          <View style={styles.statsRow}>
            {/* <View style={styles.statCol}>
              <View style={styles.statChip}>
                <Text style={styles.statChipText}>Số nét</Text>
              </View>
              <Text style={styles.statValue}>{kanjiData.strokes}</Text>
            </View> */}
            <View style={styles.statCol}>
              <View style={styles.statChip}>
                <Text style={styles.statChipText}>JLPT</Text>
              </View>
              <Text style={styles.statValue}>{kanjiData.jlpt}</Text>
            </View>
            <View style={styles.statCol}>
              <View style={styles.statChip}>
                <Text style={styles.statChipText}>Tần suất</Text>
              </View>
              <Text style={styles.statValue}>
                {kanjiData.freq ? `#${kanjiData.freq}` : '—'}
              </Text>
            </View>
          </View>

          {/* ── PHASE 2: Sections nặng — chỉ render khi sectionsReady = true */}
          {!sectionsReady ? (
            <SectionSkeleton />
          ) : (
            <>
              {/* Phát âm */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Phát âm</Text>
                {kanjiData.readings.kunyomi.length > 0 && (
                  <View style={styles.pronRow}>
                    <Text style={styles.diamond}>◆</Text>
                    <View>
                      <Text style={styles.pronLabel}>Kunyomi</Text>
                      <Text style={styles.pronValue}>
                        {kanjiData.readings.kunyomi.join('、')}
                      </Text>
                    </View>
                  </View>
                )}
                {kanjiData.readings.onyomi.length > 0 && (
                  <View style={styles.pronRow}>
                    <Text style={styles.diamond}>◆</Text>
                    <View>
                      <Text style={styles.pronLabel}>Onyomi</Text>
                      <Text style={styles.pronValue}>
                        {kanjiData.readings.onyomi.join('、')}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Thứ tự nét */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Thứ tự nét</Text>
                <MemoizedStrokeOrder kanji={kanjiData.kanji} />
              </View>

              {/* Bộ thủ & Phân tích */}
              {kanjiData.components && kanjiData.components.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Bộ & Phân tích</Text>
                  {kanjiData.components.map((comp, idx) => (
                    <View key={`${comp.kanji}_${idx}`} style={styles.componentRow}>
                      <View style={styles.componentBar} />
                      <Text style={styles.componentKanji}>{comp.kanji}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Nghĩa */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Nghĩa</Text>
                {kanjiData.meanings_vi.map((m, idx) => (
                  <View key={idx} style={styles.meaningRow}>
                    <Text style={styles.meaningDot}>•</Text>
                    <Text style={styles.meaningText}>{m}</Text>
                  </View>
                ))}
              </View>

              {/* Ví dụ — tra từ toàn bộ từ vựng (JLPT + ngành nghề) */}
              {/* Ví dụ — nhấn vào để xem chi tiết từ vựng */}
              {examples.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    Ví dụ {examples.length}
                  </Text>
                  {examples.map((ex, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.exampleBox, { borderLeftColor: '#10b981' }]}
                      onPress={() => setSelectedExample(ex)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.exampleJp}>{ex.jp}</Text>
                      <Text style={styles.exampleReading}>{ex.reading}</Text>
                      <Text style={styles.exampleVi}>→ {ex.vi}</Text>
                      <Text style={{ fontSize: 48, marginTop: 8, right: 8, opacity: 0.05, position: 'absolute', zIndex: -1 }}>
                        🔍 
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {/* {examples.map((ex, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.exampleBox}
                  onPress={() => setSelectedExample(ex)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.exampleJp}>{ex.jp}</Text>
                  <Text style={styles.exampleReading}>{ex.reading}</Text>
                  <Text style={styles.exampleVi}>→ {ex.vi}</Text>
                </TouchableOpacity>
              ))} */}
            </>
          )}
          <View style={{ height: 30 }} />
        </ScrollView>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  tabBar: {
    maxHeight: 50,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  tabContainer: { flexDirection: 'row', paddingHorizontal: 10 },
  tabItem: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: { borderBottomColor: textColor },
  tabText: { fontSize: 16, color: '#666' },
  tabTextActive: { color: textColor, fontWeight: 'bold' },
  content: { flex: 1, padding: 15 },
  kanjiHeader: { alignItems: 'center', marginBottom: 20 },
  furiganaContainer: { height: 20, justifyContent: 'center' },
  furiganaText: { fontSize: 14, color: '#666' },
  bigKanji: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 5,
  },
  bigHanViet: {
    fontSize: 18,
    color: textColor,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 8,
  },
  statCol: { alignItems: 'center' },
  statChip: {
    backgroundColor: textColor,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 5,
  },
  statChipText: { 
    color: '#fff', 
    fontSize: 11, 
    fontWeight: 'bold' 
  },
  statValue: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#333' 
  },
  skeletonWrap: { 
    paddingTop: 16, 
    paddingHorizontal: 4, 
    gap: 12 
  },
  skeletonLine: {
    height: 14,
    backgroundColor: '#e2e8f0',
    borderRadius: 7,
    opacity: 0.6,
  },
  section: { 
    marginBottom: 25 
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: textColor,
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
    color: textColor, 
    marginRight: 8, 
    fontSize: 12, 
    marginTop: 2 
  },
  pronLabel: { 
    fontSize: 12, 
    color: '#999' 
  },
  pronValue: 
  { 
    fontSize: 16, 
    color: '#333', 
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
    backgroundColor: textColor,
    borderRadius: 2,
    marginRight: 10,
  },
  componentKanji: { fontSize: 20, fontWeight: 'bold', color: '#333', marginRight: 8 },
  componentHanViet: { fontSize: 14, color: '#666' },
  meaningRow: { flexDirection: 'row', marginBottom: 6, alignItems: 'flex-start' },
  meaningDot: { color: textColor, marginRight: 8, fontSize: 16, lineHeight: 22 },
  meaningText: { fontSize: 15, color: '#444', flex: 1, lineHeight: 22 },
  exampleBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: textColor,
  },
  exampleJp: { fontSize: 16, color: '#1e293b', fontWeight: '600', marginBottom: 4 },
  exampleReading: { fontSize: 13, color: '#64748b', marginBottom: 4 },
  exampleVi: { fontSize: 14, color: '#475569' },

  // Banner "Sớm cập nhật"
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
    color: textColor,
  },
});