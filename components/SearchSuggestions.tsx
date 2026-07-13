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
// import { searchKanji } from '../services/kanjiRepository';
import { getGrammar } from '../assets/data_nn';
import { EXAMPLE_SENTENCES } from '../assets/sentences';
import { ALL_INDUSTRY_VOCAB, INDUSTRY_INFO } from '../assets/data_nghanh_hoc'; // Thêm để lọc ngành chính xác
import { useAuth } from '../artifacts/mirai-jp/hooks/useAuth';
// import { getKanjiByChar, getKanjiByLevel } from '../services/kanjiRepository';

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
  subtitle: string;
  type: SearchType;
  level?: string;
}

const LEVEL_COLORS: Record<string, string> = {
  N5: '#22C55E', N4: '#3B82F6', N3: '#F59E0B', N2: '#EA580C', N1: '#C0392B',
};

const TAB_COLORS: Record<SearchType, { primary: string; sub: string }> = {
  vocab: { primary: '#1976D2', sub: '#546E7A' },
  kanji: { primary: '#E65100', sub: '#78909C' },
  grammar: { primary: '#2E7D32', sub: '#546E7A' },
  sentence: { primary: '#00838F', sub: '#607D8B' },
};

// ĐỒNG BỘ: Chuyển sang lấy danh sách ngành chuẩn từ INDUSTRY_INFO
const SYSTEM_MAJORS = Object.values(INDUSTRY_INFO || {}).map((ind: any, idx: number) => ({
  id: ind.key || ind.id || ind.bookId || `ind_fallback_${idx}`,
  name: `${ind.emoji || '🏭'} ${ind.vi || ind.name || ''}`,
}));

export default function SearchSuggestions({
  activeTab,
  onSelectSuggestion,
  visible = true,
}: SearchSuggestionsProps) {
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

  // ĐỒNG BỘ ĐÚNG THỐNG NHẤT KEY LƯU TRỮ CHUNG TOÀN APP
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
          // const found = await getKanjiByChar(keyword);
          // const level_found = found ? found.jlpt : '';
          // if (level_found && stats[level_found] !== undefined) {
          //   stats[level_found]++;
          //   validCount++;
          // }
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
      
      // ĐỒNG BỘ LOGIC: Ưu tiên lọc từ vựng ngành theo cấu trúc tệp chuyên ngành thật
      if (major) {
        const industryPool = (ALL_INDUSTRY_VOCAB as any[]).filter(
          v => v.industry === major || v.industryKey === major
        );
        if (industryPool.length > 0) pool = industryPool;
      }
      
      let filtered = pool.filter((v: any) => v.level === level || v.Level === level);
      if (filtered.length === 0) filtered = pool;
      
      const shuffled = filtered.sort(() => Math.random() - 0.5).slice(0, 10);
      items.push(...shuffled.map((v: any, idx: number) => ({
        id: `suggest_vocab_${idx}_${Date.now()}`,
        text: v.kanji || v.hiragana || v.hira || 'Từ vựng',
        subtitle: v.kanji ? (v.hiragana || v.hira || v.mean || v.meaning || '') : (v.mean || v.meaning || ''),
        type: 'vocab' as SearchType,
        level: v.level || v.Level || level,
      })));
    }
    else if (activeTab === 'kanji') {
      // const allKanji = await getKanjiByLevel(level);
      // const filtered = allKanji.length > 0 ? allKanji : await getKanjiByLevel('N5');
      const filtered = getKanji(level) || [];
      const finalFiltered = filtered.length > 0 ? filtered : (getKanji('N5') || []);
      // const allKanji = getKanji() || [];
      // const filtered = allKanji.filter(k => k.jlpt === level);
      // const finalFiltered = filtered.length > 0 ? filtered : allKanji;
      const shuffled = [...finalFiltered].sort(() => Math.random() - 0.5).slice(0, 10);
      
      items.push(...shuffled.map((k, idx) => ({
        id: `suggest_kanji_${idx}_${Date.now()}`,
        text: k.kanji,
        subtitle: k.hanviet?.[0] || '',
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
        subtitle: g.phienAm || '',
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
        subtitle: `${s.sourceInfo}${s.vi ? ` — ${s.vi}` : ''}`,
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
  const currentTabTheme = TAB_COLORS[activeTab] || TAB_COLORS.vocab;

  return (
    <View style={styles.container}>
      {showSurvey ? (
        <View style={styles.surveyWrapper}>
    <Text style={styles.surveyLabel}>Cấp độ mục tiêu</Text>
    <View style={styles.chipRow}>
      {['N5', 'N4', 'N3', 'N2', 'N1'].map(lvl => (
        <TouchableOpacity
          key={lvl}
          style={[styles.chip, selectedLevel === lvl && styles.chipSelected]}
          onPress={() => setSelectedLevel(selectedLevel === lvl ? '' : lvl)}
        >
          <Text style={[styles.chipText, selectedLevel === lvl && styles.chipTextSelected]}>
            {lvl}
          </Text>
        </TouchableOpacity>
      ))}
    </View>

    <Text style={[styles.surveyLabel, { marginTop: 14 }]}>Ngành học</Text>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
    >
      <View style={{ flexDirection: 'row', gap: 6, paddingRight: 16 }}>
        {SYSTEM_MAJORS.map(m => (
          <TouchableOpacity
            key={m.id}
            style={[styles.chip, selectedMajor === m.id && styles.chipSelected]}
            onPress={() => setSelectedMajor(selectedMajor === m.id ? '' : m.id)}
          >
            <Text style={[styles.chipText, selectedMajor === m.id && styles.chipTextSelected]}>
              {m.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>

    <TouchableOpacity
      disabled={!selectedLevel && !selectedMajor}
      style={[styles.confirmBtn, (!selectedLevel && !selectedMajor) && styles.confirmBtnDisabled]}
      onPress={handleSaveSurvey}
    >
      <Text style={styles.confirmBtnText}>Xác nhận</Text>
    </TouchableOpacity>
  </View>
      ) : (
        <>
          <View style={styles.header}>
            <Text style={[styles.title, { color: currentTabTheme.primary }]}>
              ✨ Gợi ý {activeTab === 'vocab' ? 'từ vựng' : activeTab === 'kanji' ? 'Hán tự' : activeTab === 'grammar' ? 'ngữ pháp' : 'mẫu câu'} [{topLevel}]
            </Text>
            <Text style={styles.count}>{suggestions.length} gợi ý</Text>
          </View>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={currentTabTheme.primary} />
            </View>
          ) : suggestions.length === 0 ? null : (
            <View style={styles.sliderWrapper} onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}>
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
                    <Text style={[styles.suggestionText, { color: currentTabTheme.primary }]}>{item.text}</Text>
                    {item.subtitle ? <Text style={[styles.suggestionSubtext, { color: currentTabTheme.sub }]} numberOfLines={2}>{item.subtitle}</Text> : null}
                    {item.level && (
                      <View style={[styles.levelBadge, { backgroundColor: LEVEL_COLORS[item.level] + '15' }]}>
                        <Text style={[styles.levelText, { color: LEVEL_COLORS[item.level] }]}>{item.level}</Text>
                      </View>
                    )}
                    <View style={styles.suggestionArrow}>
                      <Text style={[styles.arrowText, { color: currentTabTheme.primary }]}>›</Text>
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
  count: { fontSize: 11, color: '#94a3b8' },
  loadingContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  sliderWrapper: { width: '100%', backgroundColor: '#ffffff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0' },
  suggestionCard: { padding: 20, minHeight: 135, position: 'relative' },
  suggestionText: { fontSize: 22, fontWeight: '800', marginBottom: 6 },
  suggestionSubtext: { fontSize: 14, marginBottom: 4, lineHeight: 20, paddingRight: 32 },
  levelBadge: { position: 'absolute', top: 18, right: 16, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  levelText: { fontSize: 10, fontWeight: '700' },
  suggestionArrow: { position: 'absolute', bottom: 16, right: 18 },
  arrowText: { fontSize: 22, fontWeight: '600' },
  surveyWrapper: {
  backgroundColor: '#ffffff',
  borderRadius: 14,
  padding: 16,
  borderWidth: 0.5,
  borderColor: '#e2e8f0',
  marginHorizontal: 16,
},
surveyLabel: {
  fontSize: 12,
  color: '#64748b',
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
  borderColor: '#cbd5e1',
  backgroundColor: '#ffffff',
},
chipSelected: {
  backgroundColor: '#1F6F7A',
  borderColor: '#1F6F7A',
},
chipText: {
  fontSize: 13,
  color: '#334155',
},
chipTextSelected: {
  color: '#ffffff',
},
confirmBtn: {
  marginTop: 18,
  height: 42,
  borderRadius: 8,
  backgroundColor: '#1F6F7A',
  justifyContent: 'center',
  alignItems: 'center',
},
confirmBtnDisabled: {
  backgroundColor: '#cbd5e1',
},
confirmBtnText: {
  color: '#ffffff',
  fontSize: 14,
  fontWeight: '500',
},
});