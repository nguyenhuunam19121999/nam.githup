// components/HomeSuggestions.tsx
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
import { getGrammar } from '../assets/data_nn';
import { EXAMPLE_SENTENCES } from '../assets/sentences';
import { ALL_INDUSTRY_VOCAB, INDUSTRY_INFO } from '../assets/data_nghanh_hoc';
import { useAuth } from '../artifacts/mirai-jp/hooks/useAuth';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TEAL      = '#1F6F7A';
const TEAL_DARK = '#0B3540';

const LEVEL_COLORS: Record<string, string> = {
  N5: '#22C55E', N4: '#3B82F6', N3: '#F59E0B', N2: '#EA580C', N1: '#C0392B',
};

const JLPT_LEVELS = [
  { label: 'N5', color: '#22C55E', bg: '#f0fdf4', desc: 'Cơ bản' },
  { label: 'N4', color: '#3B82F6', bg: '#eff6ff', desc: 'Sơ cấp' },
  { label: 'N3', color: '#F59E0B', bg: '#fffbeb', desc: 'Trung cấp' },
  { label: 'N2', color: '#EA580C', bg: '#fff7ed', desc: 'Cao cấp' },
  { label: 'N1', color: '#C0392B', bg: '#fef2f2', desc: 'Thành thạo' },
];

// Sử dụng chung danh mục ngành từ INDUSTRY_INFO
const PICK_INDUSTRIES = Object.values(INDUSTRY_INFO || {}).map((ind: any, idx: number) => ({
  key:   ind.key || ind.id || ind.bookId || `ind_fallback_${idx}`,
  emoji: ind.emoji || '🏭',
  label: ind.vi    || ind.name || '',
}));

type CardKind = 'vocab' | 'sentence' | 'grammar';

interface SuggCard {
  id: string;
  kind: CardKind;
  wordKey: string;
  primary: string;
  reading?: string;
  meaning: string;
  level?: string;
  searchQuery: string;
  searchTab: 'vocab' | 'sentence' | 'grammar';
}

interface HomeSuggestionsProps {
  onSelectSuggestion: (query: string, tab: 'vocab' | 'sentence' | 'grammar') => void;
}

async function getTopLevelFromHistory(history: { text: string }[], allVocab: any[]): Promise<string> {
  const stats: Record<string, number> = { N5: 0, N4: 0, N3: 0, N2: 0, N1: 0 };
  for (const item of history) {
    const found = allVocab.find((v: any) => v.kanji === item.text || v.hiragana === item.text);
    const level = found?.level || found?.Level || '';
    if (level && stats[level] !== undefined) stats[level]++;
  }
  let topLevel = 'N5';
  let topCount = 0;
  for (const [v, cnt] of Object.entries(stats)) {
    if (cnt > topCount) { topCount = cnt; topLevel = v; }
  }
  return topLevel;
}

export default function HomeSuggestions({ onSelectSuggestion }: HomeSuggestionsProps) {
  const { scopedKey, currentUser } = useAuth();
  const [cards, setCards] = useState<SuggCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsPicker, setNeedsPicker] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPausedRef = useRef(false);
  const [containerWidth, setContainerWidth] = useState(SCREEN_WIDTH);

  const [surveyLevel, setSurveyLevel] = useState<string>('');
  const [surveyIndustry, setSurveyIndustry] = useState<string>('');

  // ĐỒNG BỘ KEY LƯU TRỮ VỚI SEARCH SUGGESTIONS
  const KEY_LEVEL = scopedKey('user_custom_level');
  const KEY_MAJOR = scopedKey('user_custom_major');

  const buildCards = useCallback(async () => {
    setLoading(true);
    setNeedsPicker(false);
    try {
      const allVocab = (getVocab() || []) as any[];
      const allGrammar = (getGrammar() || []) as any[];

      // Đọc thông tin đồng bộ
      let savedLevel = await AsyncStorage.getItem(KEY_LEVEL);
      let savedMajor = await AsyncStorage.getItem(KEY_MAJOR);
      let hasHistory = false;

      if (!savedLevel) {
        try {
          const raw = await AsyncStorage.getItem(scopedKey('search_history_vocab'));
          if (raw) {
            const hist: { text: string }[] = JSON.parse(raw);
            if (hist && hist.length > 0) {
              savedLevel = await getTopLevelFromHistory(hist, allVocab);
              hasHistory = true;
            }
          }
        } catch (_) {}
      }

      // Chưa cài đặt mục tiêu & không có lịch sử -> Hiển thị form
      if (!savedLevel && !savedMajor && !hasHistory) {
        setNeedsPicker(true);
        setLoading(false);
        return;
      }

      let words: any[] = [];
      const currentLevel = savedLevel || 'N3';

      if (savedMajor) {
        const industryPool = (ALL_INDUSTRY_VOCAB as any[]).filter(
          v => v.industry === savedMajor || v.industryKey === savedMajor
        );
        if (savedLevel) {
          words = industryPool.filter(v => v.level === currentLevel || v.Level === currentLevel);
        } else {
          words = industryPool;
        }
        words = [...words].sort(() => Math.random() - 0.5).slice(0, 8);
      }
      
      if (words.length === 0 && savedLevel) {
        const filtered = allVocab.filter(v => v.level === currentLevel || v.Level === currentLevel);
        words = [...(filtered.length > 0 ? filtered : allVocab)].sort(() => Math.random() - 0.5).slice(0, 8);
      }

      // Logic lọc trùng lặp chéo
      const result: SuggCard[] = [];
      const seenWordKeys = new Set<string>();
      const seenSentenceTexts = new Set<string>();

      for (const v of words) {
        const kanji = v.kanji || '';
        const hira = v.hiragana || v.hira || '';
        const uniqueWordKey = kanji || hira;

        if (!uniqueWordKey || seenWordKeys.has(uniqueWordKey)) continue;
        seenWordKeys.add(uniqueWordKey);

        result.push({
          id: `vocab_${uniqueWordKey}`,
          kind: 'vocab',
          wordKey: uniqueWordKey,
          primary: kanji || hira,
          reading: kanji ? hira : '',
          meaning: v.meaning || v.nghia || '',
          level: v.level || v.Level || currentLevel,
          searchQuery: uniqueWordKey,
          searchTab: 'vocab',
        });

        const validSentences: string[] = [];
        if (v.example && v.example.trim()) {
          const finalJp1 = v.example.trim();
          if (!seenSentenceTexts.has(finalJp1)) {
            seenSentenceTexts.add(finalJp1);
            validSentences.push(finalJp1);
            const finalVi1 = v.exampleMeaning || v.exampleVi || '';
            result.push({
              id: `sent_internal_${uniqueWordKey}`,
              kind: 'sentence',
              wordKey: uniqueWordKey,
              primary: finalJp1.length > 44 ? finalJp1.slice(0, 44) + '…' : finalJp1,
              meaning: finalVi1.length > 52 ? finalVi1.slice(0, 52) + '…' : finalVi1,
              level: v.level || v.Level,
              searchQuery: uniqueWordKey,
              searchTab: 'sentence',
            });
          }
        }

        if (validSentences.length === 0) {
          const backupSent = EXAMPLE_SENTENCES.find(s => s.jp.includes(uniqueWordKey));
          if (backupSent) {
            const finalJp2 = backupSent.jp.trim();
            if (!seenSentenceTexts.has(finalJp2)) {
              seenSentenceTexts.add(finalJp2);
              validSentences.push(finalJp2);
              result.push({
                id: `sent_external_${uniqueWordKey}`,
                kind: 'sentence',
                wordKey: uniqueWordKey,
                primary: finalJp2.length > 44 ? finalJp2.slice(0, 44) + '…' : finalJp2,
                meaning: (backupSent.vi || '').length > 52 ? (backupSent.vi || '').slice(0, 52) + '…' : (backupSent.vi || ''),
                level: v.level || v.Level,
                searchQuery: uniqueWordKey,
                searchTab: 'sentence',
              });
            }
          }
        }

        const seenGrammarPatterns = new Set<string>();
        for (const textSentence of validSentences) {
          const gram = allGrammar.find(g => g.pattern && textSentence.includes(g.pattern));
          if (gram && !seenGrammarPatterns.has(gram.pattern)) {
            seenGrammarPatterns.add(gram.pattern);
            result.push({
              id: `gram_${uniqueWordKey}_${gram.pattern}`,
              kind: 'grammar',
              wordKey: uniqueWordKey,
              primary: gram.pattern,
              reading: gram.phienAm || '',
              meaning: gram.meaning || gram.nghia || '',
              level: gram.level,
              searchQuery: gram.pattern,
              searchTab: 'grammar',
            });
          }
        }
      }
      setCards(result);
    } catch (e) {
      console.error(e);
    } crystalline: { setLoading(false); }
  }, [KEY_LEVEL, KEY_MAJOR, scopedKey]);

  useEffect(() => { buildCards(); }, [buildCards]);

  const handleSaveSurvey = async () => {
    if (!surveyLevel && !surveyIndustry) return;
    try {
      if (surveyLevel) await AsyncStorage.setItem(KEY_LEVEL, surveyLevel);
      if (surveyIndustry) await AsyncStorage.setItem(KEY_MAJOR, surveyIndustry);
      buildCards();
    } catch (_) {}
  };

  useEffect(() => {
    if (cards.length <= 1) return;
    timerRef.current = setInterval(() => {
      if (isPausedRef.current) return;
      setActiveIdx(prev => {
        const next = (prev + 1) % cards.length;
        scrollRef.current?.scrollTo({ x: next * containerWidth, animated: true });
        return next;
      });
    }, 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [cards.length, containerWidth]);

  if (loading) {
    return (
      <View style={styles.loadingRow}>
        <ActivityIndicator size="small" color={TEAL} />
        <Text style={styles.loadingTxt}>Đang tải gợi ý...</Text>
      </View>
    );
  }

  if (needsPicker) {
    return (
      <View style={styles.pickerWrap}>
        <Text style={styles.pickerLabel}>Cấp độ mục tiêu</Text>
        <View style={styles.chipRow}>
          {JLPT_LEVELS.map(lv => (
            <TouchableOpacity
              key={lv.label}
              style={[styles.chip, surveyLevel === lv.label && styles.chipSelected]}
              onPress={() => setSurveyLevel(surveyLevel === lv.label ? '' : lv.label)}
            >
              <Text style={[styles.chipText, surveyLevel === lv.label && styles.chipTextSelected]}>
                {lv.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {PICK_INDUSTRIES.length > 0 && (
          <>
            <Text style={[styles.pickerLabel, { marginTop: 14 }]}>Ngành học</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 6, paddingRight: 16 }}>
                {PICK_INDUSTRIES.map(ind => (
                  <TouchableOpacity
                    key={ind.key}
                    style={[styles.chip, surveyIndustry === ind.key && styles.chipSelected]}
                    onPress={() => setSurveyIndustry(surveyIndustry === ind.key ? '' : ind.key)}
                  >
                    <Text style={[styles.chipText, surveyIndustry === ind.key && styles.chipTextSelected]}>
                      {ind.emoji} {ind.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </>
        )}

        <TouchableOpacity
          disabled={!surveyLevel && !surveyIndustry}
          style={[styles.confirmBtn, (!surveyLevel && !surveyIndustry) && styles.confirmBtnDisabled]}
          onPress={handleSaveSurvey}
        >
          <Text style={styles.confirmBtnText}>Xác nhận</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (cards.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <Text style={styles.titleTxt}>✨ Gợi ý tìm kiếm hôm nay</Text>
        <Text style={styles.countTxt}>{cards.length} thẻ</Text>
      </View>

      <View style={styles.sliderWrap} onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          snapToInterval={containerWidth}
          decelerationRate="fast"
          onScrollBeginDrag={() => { isPausedRef.current = true; }}
          onMomentumScrollEnd={(e) => {
            setActiveIdx(Math.round(e.nativeEvent.contentOffset.x / containerWidth) % cards.length);
            isPausedRef.current = false;
          }}
        >
          {cards.map(card => (
            <View key={card.id} style={{ width: containerWidth, paddingHorizontal: 4 }}>
              <TouchableOpacity
                style={[styles.cardSearchStyle, cardBg(card.kind)]}
                activeOpacity={0.82}
                onPress={() => onSelectSuggestion(card.searchQuery, card.searchTab)}
              >
                <Text style={styles.bgSearchIcon}>🔍</Text>
                <View style={[styles.kindBadge, kindBadgeStyle(card.kind)]}>
                  <Text style={styles.kindBadgeTxt}>{kindLabel(card.kind)}</Text>
                </View>

                {card.level && (
                  <View style={[styles.levelBadge, { backgroundColor: (LEVEL_COLORS[card.level] ?? '#64748b') + '22' }]}>
                    <Text style={[styles.levelTxt, { color: LEVEL_COLORS[card.level] ?? '#64748b' }]}>{card.level}</Text>
                  </View>
                )}

                <Text style={[styles.primary, primaryStyle(card.kind)]} numberOfLines={2}>{card.primary}</Text>
                {!!card.reading && <Text style={styles.reading} numberOfLines={1}>{card.reading}</Text>}
                <Text style={styles.meaning} numberOfLines={2}>{card.meaning}</Text>

                {card.kind !== 'vocab' && (
                  <View style={styles.wordRefRow}>
                    <Text style={styles.wordRefIcon}>📌</Text>
                    <Text style={styles.wordRef}>{card.wordKey}</Text>
                  </View>
                )}
                <View style={styles.searchAction}>
                  <Text style={styles.searchActionTxt}>Chạm để tra cứu ➔</Text>
                </View>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

function cardBg(kind: CardKind) {
  if (kind === 'vocab')    return { backgroundColor: '#f0fdf4' };
  if (kind === 'sentence') return { backgroundColor: '#eff6ff' };
  return { backgroundColor: '#fff7ed' };
}
function kindBadgeStyle(kind: CardKind) {
  if (kind === 'vocab')    return { backgroundColor: '#dcfce7' };
  if (kind === 'sentence') return { backgroundColor: '#dbeafe' };
  return { backgroundColor: '#ffedd5' };
}
function kindLabel(kind: CardKind) {
  if (kind === 'vocab')    return '📖 Từ vựng';
  if (kind === 'sentence') return '💬 Câu ví dụ';
  return '📝 Ngữ pháp';
}
function primaryStyle(kind: CardKind) {
  if (kind === 'vocab')    return { color: TEAL_DARK, fontSize: 26, fontWeight: '800' as const };
  if (kind === 'sentence') return { color: '#1e3a5f', fontSize: 15, fontWeight: '700' as const };
  return { color: '#7c2d12', fontSize: 18, fontWeight: '800' as const };
}

const styles = StyleSheet.create({
  wrap: { marginTop: 12, paddingBottom: 4 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, marginBottom: 10 },
  titleTxt: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  countTxt: { fontSize: 11, color: '#94a3b8' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 20, justifyContent: 'center' },
  loadingTxt: { fontSize: 12, color: '#94a3b8' },
  pickerWrap: {
  paddingVertical: 16,
  paddingHorizontal: 16,
},
  pickerLabel: {
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
    backgroundColor: TEAL,
    borderColor: TEAL,
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
    backgroundColor: TEAL,
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
  sliderWrap: { width: '100%' },
  cardSearchStyle: { borderRadius: 14, padding: 16, borderWidth: 1.5, borderColor: '#cbd5e177', borderStyle: 'dashed', minHeight: 140, position: 'relative', overflow: 'hidden' },
  bgSearchIcon: { position: 'absolute', right: 12, bottom: 30, fontSize: 45, opacity: 0.07, color: '#000' },
  kindBadge: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 10 },
  kindBadgeTxt: { fontSize: 11, fontWeight: '700', color: '#334155' },
  levelBadge: { position: 'absolute', top: 16, right: 16, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  levelTxt: { fontSize: 10, fontWeight: '700' },
  primary: { marginBottom: 4, lineHeight: 30 },
  reading: { fontSize: 13, color: '#64748b', marginBottom: 4 },
  meaning: { fontSize: 13, color: '#475569', lineHeight: 18, marginBottom: 8 },
  wordRefRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, marginBottom: 15 },
  wordRefIcon: { fontSize: 11 },
  wordRef: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  searchAction: { position: 'absolute', bottom: 12, right: 16 },
  searchActionTxt: { fontSize: 11, color: TEAL, fontWeight: '700' },
});