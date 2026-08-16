// components/SearchSuggestions.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getVocab } from '../assets/vocab';
import { getKanji } from '../assets/data_JLPT_kanji';
import { getGrammar } from '../assets/data_nn';
import { EXAMPLE_SENTENCES } from '../assets/sentences';
import { ALL_INDUSTRY_VOCAB, INDUSTRY_INFO } from '../assets/data_nghanh_hoc';
import { useAuth } from '../artifacts/mirai-jp/hooks/useAuth';
import { useColors } from '../artifacts/mirai-jp/hooks/useColors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type SearchType = 'vocab' | 'kanji' | 'sentence' | 'grammar';

interface SearchSuggestionsProps {
  activeTab: SearchType;
  onSelectSuggestion: (text: string, tab: SearchType) => void;
  visible?: boolean;
}

interface SuggestionItem {
  id: string;
  text: string;
  subtitle: string;   // furigana / Hán Việt / phiên âm / nguồn — dòng 1
  meaning: string;    // nghĩa tiếng Việt — dòng 2, riêng biệt
  type: SearchType;
  level?: string;
}

// Màu theo cấp độ JLPT — giữ cố định, không đổi theo theme.
const LEVEL_COLORS: Record<string, string> = {
  N5: '#22C55E', N4: '#3B82F6', N3: '#F59E0B', N2: '#EA580C', N1: '#C0392B',
};

const SYSTEM_MAJORS = Object.values(INDUSTRY_INFO || {}).map((ind: any, idx: number) => ({
  id: ind.key || ind.id || ind.bookId || `ind_fallback_${idx}`,
  name: `${ind.emoji || '🏭'} ${ind.vi || ind.name || ''}`,
}));

export default function SearchSuggestions({
  activeTab,
  onSelectSuggestion,
  visible = true,
}: SearchSuggestionsProps) {
  const c = useColors();
  const { scopedKey, currentUser } = useAuth();
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [topLevel, setTopLevel] = useState<string>('N5');
  const scrollViewRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(SCREEN_WIDTH);

  const [showSurvey, setShowSurvey] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [selectedMajor, setSelectedMajor] = useState<string>('');

  const KEY_LEVEL = scopedKey('user_custom_level');
  const KEY_MAJOR = scopedKey('user_custom_major');

  const getLevelStatsFromHistory = useCallback(async (): Promise<{ stats: Record<string, number>; hasHistory: boolean }> => {
    if (!currentUser) return { stats: {}, hasHistory: false };
    try {
      const key = scopedKey(`search_history_${activeTab}`);
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return { stats: {}, hasHistory: false };

      const history = JSON.parse(raw);
      if (history.length === 0) return { stats: {}, hasHistory: false };

      const stats: Record<string, number> = { N5: 0, N4: 0, N3: 0, N2: 0, N1: 0 };
      let validCount = 0;

      for (const item of history) {
        const keyword = item.text;
        let level = '';

        if (activeTab === 'vocab' || activeTab === 'sentence') {
          const allVocab = (getVocab() || []) as any[];
          const found = allVocab.find((v: any) => v.kanji === keyword || v.hiragana === keyword || v.hira === keyword);
          if (found) level = found.level || found.Level || '';
        } else if (activeTab === 'kanji') {
          const allKanji = (getKanji() || []) as any[];
          const found = allKanji.find(k => k.jlpt && k.kanji === keyword);
          if (found) level = found.jlpt;
        } else if (activeTab === 'grammar') {
          const allGrammar = (getGrammar() || []) as any[];
          const found = allGrammar.find(g => g.pattern === keyword);
          if (found) level = found.level;
        }

        if (level && stats[level] !== undefined) {
          stats[level]++;
          validCount++;
        }
      }
      return { stats, hasHistory: validCount > 0 };
    } catch (error) {
      return { stats: {}, hasHistory: false };
    }
  }, [currentUser, scopedKey, activeTab]);

  const getSuggestionsByLevel = useCallback(async (level: string, major?: string): Promise<SuggestionItem[]> => {
    const items: SuggestionItem[] = [];

    if (activeTab === 'vocab') {
      let pool = (getVocab() || []) as any[];

      if (major) {
        const industryPool = (ALL_INDUSTRY_VOCAB as any[]).filter(
          v => v.industry === major || v.industryKey === major
        );
        if (industryPool.length > 0) pool = industryPool;
      }

      let filtered = pool.filter((v: any) => v.level === level || v.Level === level);
      if (filtered.length === 0) filtered = pool;

      const shuffled = filtered.sort(() => Math.random() - 0.5).slice(0, 10);
      items.push(...shuffled.map((v: any, idx: number) => {
        const furigana = v.hiragana || v.hira || '';
        const meaning = v.nghia || v.mean || v.meaning || '';

        return {
          id: `suggest_vocab_${idx}_${Date.now()}`,
          text: v.kanji || v.hiragana || v.hira || 'Từ vựng',
          subtitle: furigana,   // dòng 1: chỉ furigana
          meaning,              // dòng 2: nghĩa tiếng Việt riêng
          type: 'vocab' as SearchType,
          level: v.level || v.Level || level,
        };
      }));
    }
    else if (activeTab === 'kanji') {
      const filtered = getKanji(level) || [];
      const finalFiltered = filtered.length > 0 ? filtered : (getKanji('N5') || []);
      const shuffled = [...finalFiltered].sort(() => Math.random() - 0.5).slice(0, 10);

      items.push(...shuffled.map((k, idx) => ({
        id: `suggest_kanji_${idx}_${Date.now()}`,
        text: k.kanji,
        subtitle: k.hanviet?.[0] || '',   // dòng 1: Hán Việt
        meaning: k.meanings_vi?.[0] || '', // dòng 2: nghĩa
        type: 'kanji' as SearchType,
        level: k.jlpt || level,
      })));
    }
    else if (activeTab === 'grammar') {
      const allGrammar = getGrammar() || [];
      const filtered = allGrammar.filter(g => g.level === level);
      const finalFiltered = filtered.length > 0 ? filtered : allGrammar;
      const shuffled = [...finalFiltered].sort(() => Math.random() - 0.5).slice(0, 10);

      items.push(...shuffled.map((g, idx) => ({
        id: `suggest_grammar_${idx}_${Date.now()}`,
        text: g.pattern,
        subtitle: g.phienAm || '',          // dòng 1: phiên âm
        meaning: (g as any).meaning || '',   // dòng 2: nghĩa
        type: 'grammar' as SearchType,
        level: g.level || level,
      })));
    }
    else if (activeTab === 'sentence') {
      const tempPool: Array<{ jp: string; vi: string; sourceInfo: string }> = [];
      const seenSentences = new Set<string>();

      const allVocab = getVocab() || [];
      const filteredVocab = allVocab.filter((v: any) => (v.level === level || v.Level === level) && v.example && v.example.trim());
      const shuffledVocab = [...(filteredVocab.length > 0 ? filteredVocab : allVocab)].sort(() => Math.random() - 0.5).slice(0, 5);

      shuffledVocab.forEach((v: any) => {
        if (v.example) {
          const jpSentence = v.example.trim();
          if (!seenSentences.has(jpSentence)) {
            seenSentences.add(jpSentence);
            tempPool.push({ jp: jpSentence, vi: v.exampleMeaning || v.exampleVi || 'Mẫu câu', sourceInfo: `📌 Từ vựng: ${v.kanji || ''}` });
          }
        }
      });

      const allSentences = EXAMPLE_SENTENCES || [];
      const shuffledSentences = [...allSentences].sort(() => Math.random() - 0.5).slice(0, 5);
      shuffledSentences.forEach((s) => {
        const jpSentence = s.jp.trim();
        if (!seenSentences.has(jpSentence)) {
          seenSentences.add(jpSentence);
          tempPool.push({ jp: jpSentence, vi: s.vi || '', sourceInfo: '📚 Ví dụ tổng hợp' });
        }
      });

      const finalPool = tempPool.sort(() => Math.random() - 0.5).slice(0, 10);
      items.push(...finalPool.map((s, idx) => ({
        id: `suggest_sentence_${idx}_${Date.now()}`,
        text: s.jp.length > 40 ? s.jp.slice(0, 40) + '...' : s.jp,
        subtitle: s.sourceInfo,   // dòng 1: nguồn
        meaning: s.vi || '',      // dòng 2: nghĩa
        type: 'sentence' as SearchType,
        level: level,
      })));
    }
    return items;
  }, [activeTab]);

  const loadSuggestions = useCallback(async () => {
    if (!visible) return;
    setLoading(true);
    try {
      const { stats, hasHistory } = await getLevelStatsFromHistory();
      const savedLevel = await AsyncStorage.getItem(KEY_LEVEL);
      const savedMajor = await AsyncStorage.getItem(KEY_MAJOR);

      if (hasHistory) {
        setShowSurvey(false);
        let maxLevel = 'N5';
        let maxCount = 0;
        for (const [lvl, count] of Object.entries(stats)) {
          if (count > maxCount) { maxCount = count; maxLevel = lvl; }
        }
        setTopLevel(maxLevel);
        const items = await getSuggestionsByLevel(maxLevel, savedMajor || undefined);
        setSuggestions(items);
      }
      else if (savedLevel) {
        setShowSurvey(false);
        setTopLevel(savedLevel);
        const items = await getSuggestionsByLevel(savedLevel, savedMajor || undefined);
        setSuggestions(items);
      }
      else {
        setShowSurvey(true);
        setSuggestions([]);
      }
      setActiveIndex(0);
    } catch (error) {
      console.error('Lỗi tải gợi ý:', error);
    } finally {
      setLoading(false);
    }
  }, [visible, KEY_LEVEL, KEY_MAJOR, getLevelStatsFromHistory, getSuggestionsByLevel]);

  const handleSaveSurvey = async () => {
    if (!selectedLevel && !selectedMajor) return;
    try {
      await AsyncStorage.setItem(KEY_LEVEL, selectedLevel);
      await AsyncStorage.setItem(KEY_MAJOR, selectedMajor);
      loadSuggestions();
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (visible) loadSuggestions();
  }, [visible, activeTab, loadSuggestions]);

  useEffect(() => {
    if (suggestions.length <= 1 || showSurvey) return;
    const interval = setInterval(() => {
      const nextIndex = (activeIndex + 1) % suggestions.length;
      setActiveIndex(nextIndex);
      scrollViewRef.current?.scrollTo({ x: nextIndex * containerWidth, animated: true });
    }, 5000);
    return () => clearInterval(interval);
  }, [suggestions.length, activeIndex, containerWidth, showSurvey]);

  if (!visible) return null;

  return (
    <View style={styles.container}>
      {showSurvey ? (
        <View style={[styles.surveyWrapper, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.surveyLabel, { color: c.mutedForeground }]}>Cấp độ mục tiêu</Text>
          <View style={styles.chipRow}>
            {['N5', 'N4', 'N3', 'N2', 'N1'].map(lvl => (
              <TouchableOpacity
                key={lvl}
                style={[
                  styles.chip,
                  { backgroundColor: c.card, borderColor: c.border },
                  selectedLevel === lvl && { backgroundColor: c.primary, borderColor: c.primary },
                ]}
                onPress={() => setSelectedLevel(selectedLevel === lvl ? '' : lvl)}
              >
                <Text style={[styles.chipText, { color: c.text }, selectedLevel === lvl && { color: c.primaryForeground }]}>
                  {lvl}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.surveyLabel, { color: c.mutedForeground, marginTop: 14 }]}>Ngành học</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            <View style={{ flexDirection: 'row', gap: 6, paddingRight: 16 }}>
              {SYSTEM_MAJORS.map(m => (
                <TouchableOpacity
                  key={m.id}
                  style={[
                    styles.chip,
                    { backgroundColor: c.card, borderColor: c.border },
                    selectedMajor === m.id && { backgroundColor: c.primary, borderColor: c.primary },
                  ]}
                  onPress={() => setSelectedMajor(selectedMajor === m.id ? '' : m.id)}
                >
                  <Text style={[styles.chipText, { color: c.text }, selectedMajor === m.id && { color: c.primaryForeground }]}>
                    {m.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <TouchableOpacity
            disabled={!selectedLevel && !selectedMajor}
            style={[
              styles.confirmBtn,
              { backgroundColor: c.primary },
              (!selectedLevel && !selectedMajor) && { backgroundColor: c.muted },
            ]}
            onPress={handleSaveSurvey}
          >
            <Text style={[styles.confirmBtnText, { color: c.primaryForeground }]}>Xác nhận</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <Text style={[styles.title, { color: c.primary }]}>
              ✨ Gợi ý {activeTab === 'vocab' ? 'từ vựng' : activeTab === 'kanji' ? 'Hán tự' : activeTab === 'grammar' ? 'ngữ pháp' : 'mẫu câu'} [{topLevel}]
            </Text>
            <Text style={[styles.count, { color: c.mutedForeground }]}>{suggestions.length} gợi ý</Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={c.primary} />
            </View>
          ) : suggestions.length === 0 ? null : (
            <View
              style={[styles.sliderWrapper, { backgroundColor: c.card, borderColor: c.border }]}
              onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
            >
              <ScrollView
                ref={scrollViewRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / containerWidth))}
                snapToInterval={containerWidth}
                decelerationRate="fast"
                scrollEventThrottle={16}
              >
                {suggestions.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.suggestionCard, { width: containerWidth }]}
                    onPress={() => onSelectSuggestion(item.text, item.type)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.suggestionText, { color: c.primary }]}>{item.text}</Text>

                    {/* Dòng 1: furigana / Hán Việt / phiên âm / nguồn */}
                    {item.subtitle ? (
                      <Text style={[styles.suggestionSubtext, { color: c.mutedForeground }]} numberOfLines={1}>
                        {item.subtitle}
                      </Text>
                    ) : null}

                    {/* Dòng 2: nghĩa tiếng Việt — tách riêng, không nối chung */}
                    {item.meaning ? (
                      <Text style={[styles.suggestionMeaning, { color: c.text }]} numberOfLines={2}>
                        {item.meaning}
                      </Text>
                    ) : null}

                    {item.level && (
                      <View style={[styles.levelBadge, { backgroundColor: LEVEL_COLORS[item.level] + '15' }]}>
                        <Text style={[styles.levelText, { color: LEVEL_COLORS[item.level] }]}>{item.level}</Text>
                      </View>
                    )}
                    <View style={styles.suggestionArrow}>
                      <Text style={[styles.arrowText, { color: c.primary }]}>›</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 8, marginBottom: 4 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10 },
  title: { fontSize: 13, fontWeight: '700' },
  count: { fontSize: 11 },
  loadingContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  sliderWrapper: { width: '100%', borderRadius: 16, overflow: 'hidden', borderWidth: 1 },
  suggestionCard: { padding: 20, minHeight: 135, position: 'relative' },
  suggestionText: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  // Dòng furigana/Hán Việt/phiên âm — nhỏ, phụ
  suggestionSubtext: { fontSize: 13, marginBottom: 4, lineHeight: 18, paddingRight: 32 },
  // Dòng nghĩa tiếng Việt — tách riêng hẳn, đậm hơn subtext để dễ đọc
  suggestionMeaning: { fontSize: 14, fontWeight: '600', lineHeight: 20, paddingRight: 32, marginTop: 2 },
  levelBadge: { position: 'absolute', top: 18, right: 16, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  levelText: { fontSize: 10, fontWeight: '700' },
  suggestionArrow: { position: 'absolute', bottom: 16, right: 18 },
  arrowText: { fontSize: 22, fontWeight: '600' },
  surveyWrapper: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 0.5,
    marginHorizontal: 16,
  },
  surveyLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 0.5,
  },
  chipText: {
    fontSize: 13,
  },
  confirmBtn: {
    marginTop: 18,
    height: 42,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
});