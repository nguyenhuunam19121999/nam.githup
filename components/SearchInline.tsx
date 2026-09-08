// //////////Searchinline.tsx ////////////
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useTransition,
  useDeferredValue,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  FlatList,
  Keyboard,
  ActivityIndicator,
  Alert,
  InteractionManager,
  Animated,
  LayoutAnimation,   
  Platform,          
  UIManager,   
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getVocab } from '../assets/vocab';
import { getGrammar } from '../assets/data_nn';
import { EXAMPLE_SENTENCES } from '../assets/sentences';
import {
  ALL_INDUSTRY_VOCAB,
  INDUSTRY_VOCAB,
  INDUSTRY_INFO,
} from '../assets/data_nghanh_hoc';
import KanjiDetailInline from './KanjiDetailInline';
import KanjiDrawSearchModal from './KanjiDrawSearchModal';
import VocabDetailInline from './VocabDetailInline';
import GrammarDetailInline from './GrammarDetailInline';
import SentenceDetailInline from './SentenceDetailInline';
import { SearchHistory, SearchHistoryRef } from './SearchHistory';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../artifacts/mirai-jp/hooks/useAuth';
import { useColors } from '../artifacts/mirai-jp/hooks/useColors';
import SearchSuggestions from './SearchSuggestions';
import { preloader } from '../services/KanjiPreloader';
import { searchKanji } from '../assets/data_JLPT_kanji';
import { AdBanner } from "../components/AdBanner";
const MemoAdBanner = React.memo(AdBanner);

// Bật LayoutAnimation trên Android (mặc định chỉ có sẵn trên iOS)
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Giả định kiểu dữ liệu cho KanjiItem nếu chưa được import từ file gốc
interface KanjiItem {
  id: string;
  kanji: string;
  hanviet?: string[];
  meanings_vi?: string[];
  readings?: { kunyomi: string[]; onyomi: string[] };
  strokes?: number;
  jlpt?: string;
}

// ── Sunrise accent — đồng bộ với ô tìm kiếm nổi bật ở trang chủ ─────────────
const SUN_CORAL = '#FF7A59';
const SUN_GOLD = '#FFB238';
const SUN_GRAD = [SUN_CORAL, SUN_GOLD] as const;

// ── Chữ mẫu chạy tự động khi ô tìm kiếm đang trống ──────────────────────────
const SEARCH_PLACEHOLDERS = [
  'Tìm từ vựng, kanji, ngữ pháp...',
  '単語・漢字・文法を検索...',
  'Ví dụ: 食べる, ăn cơm...',
  'Ví dụ: 水を飲む, uống nước...',
  'Ví dụ: 日本語を勉強する, học tiếng Nhật...',
];

const TAB_LIST = [
  { id: 'all',      label: 'Tất cả',  icon: '🌐' },
  { id: 'vocab',    label: 'Từ vựng', icon: '📖' },
  { id: 'kanji',    label: 'Hán tự',  icon: '🈳' },
  { id: 'sentence', label: 'Mẫu câu', icon: '📚' },
  { id: 'grammar',  label: 'Ngữ pháp', icon: '📝' },
] as const;

type SearchType = 'vocab' | 'kanji' | 'sentence' | 'grammar' | 'all';

interface SearchResult {
  id: string;
  type: SearchType;
  title: string;
  subtitle: string;
  description: string;
  data?: any;
  sourceLabel?: string;
}

export interface SearchInlineProps {
  onBack?: () => void;
  autoOpenDrawer?: boolean;
  onDrawerOpened?: () => void;
  initialTab?: SearchType;
  initialQuery?: string;
  active?: boolean;
}

// ─── UTILS ───────────────────────────────────────────────────────────────────

function normalizeString(s: string) {
  if (!s || typeof s !== 'string') return '';
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function hiraganaToRomaji(hiragana: string): string {
  const map: Record<string, string> = {
    A: 'a', い: 'i', う: 'u', え: 'e', お: 'o',
    か: 'ka', き: 'ki', く: 'ku', け: 'ke', こ: 'ko',
    さ: 'sa', し: 'shi', す: 'su', せ: 'se', そ: 'so',
    た: 'ta', ち: 'chi', つ: 'tsu', て: 'te', と: 'to',
    な: 'na', に: 'ni', ぬ: 'nu', ね: 'ne', の: 'no',
    は: 'ha', ひ: 'hi', ふ: 'fu', へ: 'he', ほ: 'ho',
    ま: 'ma', み: 'mi', む: 'mu', め: 'me', も: 'mo',
    や: 'ya', ゆ: 'yu', よ: 'yo',
    ら: 'ra', り: 'ri', る: 'ru', れ: 're', ろ: 'ro',
    わ: 'wa', を: 'wo', ん: 'n',
    が: 'ga', ぎ: 'gi', ぐ: 'gu', げ: 'ge', ご: 'go',
    ざ: 'za', じ: 'ji', ず: 'zu', ぜ: 'ze', ぞ: 'zo',
    だ: 'da', ぢ: 'ji', づ: 'zu', で: 'de', ど: 'do',
    ば: 'ba', び: 'bi', ぶ: 'bu', べ: 'be', ぼ: 'bo',
    ぱ: 'pa', ぴ: 'pi', ぷ: 'pu', ぺ: 'pe', ぽ: 'po',
  };
  let result = '';
  let i = 0;
  while (i < hiragana.length) {
    const two = hiragana.slice(i, i + 2);
    if (map[two]) { result += map[two]; i += 2; }
    else { result += map[hiragana[i]] || hiragana[i]; i++; }
  }
  return result;
}

const yieldToUI = (): Promise<void> =>
  new Promise(resolve => requestAnimationFrame(() => resolve()));

function groupByLevel<T extends Record<string, any>>(items: T[]): T[][] {
  const byLevel: Record<string, T[]> = {
    N5: [], N4: [], N3: [], N2: [], N1: [], other: [],
  };
  for (const item of items) {
    const lv = item.level || item.jlpt || '';
    if (byLevel[lv]) byLevel[lv].push(item);
    else byLevel.other.push(item);
  }
  const ordered = ['N5', 'N4', 'N3', 'N2', 'N1']
    .map(lv => byLevel[lv])
    .filter(arr => arr.length > 0);
  if (byLevel.other.length > 0) ordered.push(byLevel.other);
  return ordered;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function extractKanjiChars(text: string): string[] {
  const chars: string[] = [];
  for (const c of text) {
    if (/[\u3400-\u9fff\uf900-\ufaff]/.test(c)) chars.push(c);
  }
  return chars;
}

function getIndustryLabel(bookId: string): string {
  const info = INDUSTRY_INFO[bookId];
  if (!info) return '🏭 Chuyên ngành';
  return `${info.emoji} ${info.vi}`;
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENT CHÍNH
// ════════════════════════════════════════════════════════════════════════════

interface JishoEntry {
  japanese?: { word?: string; reading?: string }[];
  senses?: { english_definitions?: string[]; parts_of_speech?: string[] }[];
}

async function translateText(text: string, from: string, to: string): Promise<string | null> {
  const t = text?.trim();
  if (!t) return null;
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(t)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const translated = (data?.[0] || []).map((chunk: any) => chunk?.[0]).join('');
    return translated || null;
  } catch (_) {
    return null;
  }
}

async function translateBatch(texts: string[], from: string, to: string): Promise<(string | null)[]> {
  const items = texts.map(t => (t || '').trim());
  const validIdx = items.reduce<number[]>((acc, t, i) => { if (t) acc.push(i); return acc; }, []);
  if (validIdx.length === 0) return items.map(() => null);

  const DELIM = ' ||| ';
  const joined = validIdx.map(i => items[i]).join(DELIM);

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(joined)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('bad status');
    const data = await res.json();
    const translatedJoined = (data?.[0] || []).map((chunk: any) => chunk?.[0]).join('');

    const parts = translatedJoined.split(/\s*\|\|\|\s*/).map((p: string) => p.trim());
    if (parts.length !== validIdx.length) throw new Error('mismatch');

    const result: (string | null)[] = items.map(() => null);
    validIdx.forEach((idx, k) => { result[idx] = parts[k] || null; });
    return result;
  } catch (_) {
    const fallback = await Promise.all(
      validIdx.map(i => translateText(items[i], from, to))
    );
    const result: (string | null)[] = items.map(() => null);
    validIdx.forEach((idx, k) => { result[idx] = fallback[k]; });
    return result;
  }
}

// ─── CACHE kết quả Jisho vào AsyncStorage ───────────────────────────────
const JISHO_CACHE_PREFIX = 'jisho_cache_v1:';
const JISHO_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 ngày

function buildJishoCacheKey(query: string): string {
  return JISHO_CACHE_PREFIX + query.trim().toLowerCase();
}

async function getCachedJishoResults(cacheKey: string): Promise<SearchResult[] | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.results)) return null;
    if (Date.now() - parsed.savedAt > JISHO_CACHE_TTL_MS) {
      AsyncStorage.removeItem(cacheKey).catch(() => {});
      return null;
    }
    if (!parsed.translated) {
      AsyncStorage.removeItem(cacheKey).catch(() => {});
      return null;
    }
    return parsed.results as SearchResult[];
  } catch (_) {
    return null;
  }
}

async function setCachedJishoResults(
  cacheKey: string,
  results: SearchResult[],
  translated: boolean
): Promise<void> {
  if (results.length === 0) return;
  try {
    await AsyncStorage.setItem(
      cacheKey,
      JSON.stringify({ savedAt: Date.now(), results, translated })
    );
  } catch (_) {}
}

async function searchJisho(query: string, isVietnameseQuery: boolean): Promise<SearchResult[]> {
  const q = query.trim();
  if (!q) return [];
  const cacheKey = buildJishoCacheKey(q);
  const cached = await getCachedJishoResults(cacheKey);
  if (cached) return cached;
  let jishoKeyword = q;
  if (isVietnameseQuery) {
    const translatedQuery = await translateText(q, 'vi', 'en');
    if (translatedQuery) jishoKeyword = translatedQuery;
  }

  try {
    const url = `https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(jishoKeyword)}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    const data: JishoEntry[] = Array.isArray(json?.data) ? json.data : [];
    const sliced = data.slice(0, 12);
    const prepared = sliced.map(entry => {
      const jp = entry.japanese?.[0] || {};
      const title = jp.word || jp.reading || '';
      const subtitle = jp.reading || '';
      const sense = entry.senses?.[0];
      const meaningEn = sense?.english_definitions?.join(', ') || '';
      const pos = sense?.parts_of_speech?.join(', ') || '';
      return { title, subtitle, meaningEn, pos };
    }).filter(p => !!p.title);

    const translatedList = await translateBatch(prepared.map(p => p.meaningEn), 'en', 'vi');
    const allTranslated = prepared.every(
      (p, idx) => !p.meaningEn || !!translatedList[idx]
    );

    const mapped: SearchResult[] = prepared.map((p, idx) => {
      const meaningVi = translatedList[idx];
      const displayMeaning = meaningVi || p.meaningEn;
      return {
        id: `jisho_${idx}_${p.title}`,
        type: 'vocab',
        title: p.title,
        subtitle: p.subtitle,
        description: displayMeaning,
        data: {
          kanji: p.title,
          hiragana: p.subtitle,
          nghia: displayMeaning,
          jisho_meaning_en: p.meaningEn,
          wordType: p.pos,
          level: '',
        },
        sourceLabel: '🌍',
      };
    });

    setCachedJishoResults(cacheKey, mapped, allTranslated);
    return mapped;
  } catch (_) {
    return [];
  }
}

export default function SearchInline({
  onBack,
  autoOpenDrawer = false,
  onDrawerOpened,
  initialTab,
  initialQuery = '',
  active = true,
}: SearchInlineProps) {
  const c = useColors(); 

  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [inputFocused, setInputFocused] = useState(false);
  const placeholderOpacity = useRef(new Animated.Value(1)).current;
  const [query, setQuery] = useState(initialQuery);
    useEffect(() => {
    const id = setInterval(() => {
      if (inputFocused || query.length > 0) return;
      Animated.timing(placeholderOpacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start(() => {
        setPlaceholderIdx((p) => (p + 1) % SEARCH_PLACEHOLDERS.length);
        Animated.timing(placeholderOpacity, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }).start();
      });
    }, 2600);
    return () => clearInterval(id);
  }, [inputFocused, query.length]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<SearchType>(initialTab ?? 'vocab');
  const inputRef = useRef<TextInput>(null);
  const [drawModalVisible, setDrawModalVisible] = useState(false);
  const [kanjiModalVisible, setKanjiModalVisible] = useState(false);
  const kanjiModalVisibleRef = useRef(false);
  useEffect(() => {
    kanjiModalVisibleRef.current = kanjiModalVisible;
  }, [kanjiModalVisible]);

  const [foundKanjiChars, setFoundKanjiChars] = useState<string[]>([]);
  const [currentKanjiResults, setCurrentKanjiResults] = useState<string[]>([]);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);

  const { scopedKey, currentUser } = useAuth();
  const historyRef = useRef<SearchHistoryRef>(null);
  const drawModalRef = useRef<any>(null);
  const [historyKey, setHistoryKey] = useState(0);

  const [isPending, startTransition] = useTransition();
  const deferredResults = useDeferredValue(results);
  const debouncedQuery = useDebounce(query, 350);

  // ── Cache dữ liệu ──────────────────────────────────────────────────────────
  const allVocab = useMemo(() => getVocab(), []);
  const allGrammar = useMemo(() => getGrammar(), []);
  const allSentences = useMemo(() => EXAMPLE_SENTENCES, []);
  const industryVocab = useMemo(() => ALL_INDUSTRY_VOCAB, []);

  const vocabByLevel = useMemo(() => groupByLevel(allVocab), [allVocab]);

  const searchTokenRef = useRef(0);

  const saveToHistory = async (text: string, tab: SearchType) => {
    if (!currentUser || !text.trim()) return;
    const histType = (tab === 'kanji' || tab === 'all') ? 'vocab' : tab;
    const key = scopedKey(`search_history_${histType}`);
    try {
      const raw = await AsyncStorage.getItem(key);
      let items = raw ? JSON.parse(raw) : [];
      items = items.filter((i: any) => i.text !== text.trim());
      items.unshift({
        id: Date.now().toString(),
        text: text.trim(),
        timestamp: Date.now(),
        type: histType,
      });
      if (items.length > 20) items = items.slice(0, 20);
      await AsyncStorage.setItem(key, JSON.stringify(items));
    } catch (_) {}
  };

  // ══════════════════════════════════════════════════════════════════════════
  // CORE SEARCH LOGIC
  // ══════════════════════════════════════════════════════════════════════════

  const executeSearchLogic = useCallback(
    (targetQuery: string, targetTab: SearchType) => {
      setSelectedResult(null);
      setKanjiModalVisible(false);

      if (!targetQuery.trim()) {
        setResults([]);
        setLoading(false);
        return;
      }

      const token = ++searchTokenRef.current;
      setLoading(true);

      InteractionManager.runAfterInteractions(() => {
        if (token !== searchTokenRef.current) return;

        startTransition(() => setResults([]));

        const nq = normalizeString(targetQuery);
        const lq = targetQuery.toLowerCase();
        const isEnglish = /[a-zA-Z]/.test(targetQuery);
        const isVietnamese =
          /[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠƯàáâãèéêìíòóôõùúăđĩũơư]/i.test(targetQuery);

        const matchVocabItem = (v: any): boolean => {
          const hira = v.hiragana || v.hira || '';
          const romaji = isEnglish ? hiraganaToRomaji(hira) : '';
          return !!(
            v.kanji?.includes(targetQuery) ||
            hira.includes(targetQuery) ||
            (romaji && romaji.includes(lq)) ||
            normalizeString(v.han || '').includes(nq) ||
            normalizeString(v.nghia || '').includes(nq)
          );
        };

        const toVocabResult = (
          v: any,
          idx: number,
          prefix: string,
          sourceLabel?: string
        ): SearchResult => {
          const hira = v.hiragana || v.hira || '';
          return {
            id: `${prefix}_${idx}`,
            type: 'vocab',
            title: v.kanji || hira,
            subtitle: hira,
            description: v.nghia || '',
            data: v,
            sourceLabel,
          };
        };

        // ── VOCAB ──────────────────────────────────────────────────────────
        const runJLPTVocabStream = async () => {
          const seen = new Map<string, boolean>();
          let totalFound = 0;

          for (const chunk of vocabByLevel) {
            if (token !== searchTokenRef.current) return;
            if (seen.size >= 30) break;

            const found: SearchResult[] = [];
            for (const v of chunk) {
              if (seen.size >= 30) break;
              if (!v.kanji || seen.has(v.kanji)) continue;
              if (matchVocabItem(v)) {
                seen.set(v.kanji, true);
                found.push(toVocabResult(v, totalFound + found.length, 'jlpt'));
              }
            }

            if (found.length > 0) {
              totalFound += found.length;
              startTransition(() => setResults(prev => [...prev, ...found]));
              preloader.preloadVocabBatch(found.map(f => f.title));
            }
            await yieldToUI();
          }
        };

        const runIndustryVocabStream = async () => {
          const seenIndustry = new Map<string, boolean>();
          let idx = 0;

          for (const [bookId, items] of Object.entries(INDUSTRY_VOCAB) as [string, any[]][]) {
            if (token !== searchTokenRef.current) return;
            const label = getIndustryLabel(bookId);
            const CHUNK = 100;

            for (let i = 0; i < items.length; i += CHUNK) {
              if (token !== searchTokenRef.current) return;

              const slice = items.slice(i, i + CHUNK) as any[];
              const found: SearchResult[] = [];

              for (const v of slice) {
                if (seenIndustry.size >= 40) break;
                const key = `${bookId}_${v.kanji || v.hira || v.hiragana}`;
                if (!v.kanji && !v.hira && !v.hiragana) continue;
                if (seenIndustry.has(key)) continue;
                if (matchVocabItem(v)) {
                  seenIndustry.set(key, true);
                  found.push(toVocabResult(v, idx++, `industry_${bookId}`, label));
                }
              }

              if (found.length > 0) {
                startTransition(() => setResults(prev => [...prev, ...found]));
                preloader.preloadVocabBatch(found.map(f => f.title));
              }
              await yieldToUI();
            }
            if (seenIndustry.size >= 40) break;
          }
        };

        const runKanjiEntryStream = async () => {
          if (targetTab !== 'vocab') return;
          const kanjiFound = searchKanji(targetQuery);
          if (token !== searchTokenRef.current || kanjiFound.length === 0) return;
                  const mapped: SearchResult[] = kanjiFound.slice(0, 20).map((k, idx) => ({
            id: `kanjidict_${idx}_${k.kanji}`,
            type: 'vocab',
            title: k.kanji,
            subtitle: k.hanviet.join(' • '),
            description: k.meanings_vi.join(', '),
            data: k,
            sourceLabel: '🈳 Hán tự',
          }));
          startTransition(() => setResults(prev => [...prev, ...mapped]));
        };

        const runVocabStream = async () => {
          if (targetTab !== 'vocab') return;

          const jishoStream = (async () => {
            const jishoResults = await searchJisho(targetQuery, isVietnamese);
            if (token !== searchTokenRef.current || jishoResults.length === 0) return;
            LayoutAnimation.configureNext(
              LayoutAnimation.create(
                280,
                LayoutAnimation.Types.easeInEaseOut,
                LayoutAnimation.Properties.opacity
              )
            );
            startTransition(() => setResults(prev => [...jishoResults, ...prev]));
          })();

          await Promise.all([
            runJLPTVocabStream(),
            runIndustryVocabStream(),
            runKanjiEntryStream(),
            jishoStream,
          ]);
          if (token === searchTokenRef.current) setLoading(false);
        };

        // ── KANJI STREAM (Giải quyết hoàn toàn bằng việc tách ký tự) ───────
        const runKanjiStream = async () => {
          if (targetTab !== 'kanji') return;

          const seenKanji = new Map<string, boolean>();
          const allFoundKanji: KanjiItem[] = [];
          const queryChars = targetQuery.split('').filter(c => /[\u3000-\u9fff]/.test(c));

          const updateUI = () => {
          const sorted = [...allFoundKanji].sort((a, b) => {
            const aIdx = queryChars.indexOf(a.kanji);
            const bIdx = queryChars.indexOf(b.kanji);
            if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
            if (aIdx !== -1) return -1;
            if (bIdx !== -1) return 1;
            return 0;
          });
          const chars = sorted.map(k => k.kanji);
          startTransition(() => {
            setCurrentKanjiResults(chars);
            setFoundKanjiChars(chars);
            if (chars.length > 0 && !kanjiModalVisibleRef.current) {
              setKanjiModalVisible(true);
            }
          });
        };
          const searchVocabKanji = async () => {
            if (token !== searchTokenRef.current) return;
            if (seenKanji.size >= 50) return;

            const searchChars = targetQuery.split('').filter(c => /[\u3000-\u9fff]/.test(c));
            
            for (const chunk of vocabByLevel) {
              if (token !== searchTokenRef.current) return;
              if (seenKanji.size >= 50) break;

              const newKanjiItems: KanjiItem[] = [];
              
              for (const v of chunk) {
                const word = v.kanji || '';
                if (!word) continue;
                
                let wordMatches = false;
                if (isVietnamese) {
                  wordMatches = normalizeString(v.nghia || '').includes(nq) ||
                                normalizeString(v.han || '').includes(nq);
                } else {
                  wordMatches = searchChars.length > 0 
                    ? searchChars.some(c => word.includes(c))
                    : word.includes(targetQuery);
                }
                
                if (wordMatches) {
                  for (const c of extractKanjiChars(word)) {
                    if (!seenKanji.has(c)) {
                      seenKanji.set(c, true);
                      newKanjiItems.push({
                        id: `vocab_${c}`,
                        kanji: c,
                        hanviet: [],
                        meanings_vi: [`📖 Từ vựng: ${word}`],
                        readings: { kunyomi: [], onyomi: [] },
                        strokes: 0,
                        jlpt: 'N5',
                      } as unknown as KanjiItem);
                    }
                  }
                }
              }

              if (newKanjiItems.length > 0) {
                allFoundKanji.push(...newKanjiItems);
                updateUI();
                preloader.preloadKanjiBatch(newKanjiItems.map(k => k.kanji));
              }
              await yieldToUI();
            }
          };

          const searchIndustryKanji = async () => {
            if (token !== searchTokenRef.current) return;
            if (seenKanji.size >= 50) return;

            const searchChars = targetQuery.split('').filter(c => /[\u3000-\u9fff]/.test(c));
            
            for (const [bookId, items] of Object.entries(INDUSTRY_VOCAB) as [string, any[]][]) {
              if (token !== searchTokenRef.current) return;
              if (seenKanji.size >= 50) break;

              const CHUNK = 100;
              for (let i = 0; i < items.length; i += CHUNK) {
                if (token !== searchTokenRef.current) return;
                if (seenKanji.size >= 50) break;

                const slice = items.slice(i, i + CHUNK) as any[];
                const newKanjiItems: KanjiItem[] = [];

                for (const v of slice) {
                  const word = v.kanji || '';
                  if (!word) continue;
                  
                  let wordMatches = false;
                  if (isVietnamese) {
                    wordMatches = normalizeString(v.nghia || '').includes(nq) ||
                                  normalizeString(v.han || '').includes(nq);
                  } else {
                    wordMatches = searchChars.length > 0 
                      ? searchChars.some(c => word.includes(c))
                      : word.includes(targetQuery);
                  }
                  
                  if (wordMatches) {
                    for (const c of extractKanjiChars(word)) {
                      if (!seenKanji.has(c)) {
                        seenKanji.set(c, true);
                        const label = getIndustryLabel(bookId);
                        newKanjiItems.push({
                          id: `industry_${bookId}_${c}`,
                          kanji: c,
                          hanviet: [],
                          meanings_vi: [`${label} · ${word}`],
                          readings: { kunyomi: [], onyomi: [] },
                          strokes: 0,
                          jlpt: (v as any).jlpt || (v as any).level || 'N5',
                        } as unknown as KanjiItem);
                      }
                    }
                  }
                }

                if (newKanjiItems.length > 0) {
                  allFoundKanji.push(...newKanjiItems);
                  updateUI();
                  preloader.preloadKanjiBatch(newKanjiItems.map(k => k.kanji));
                }
                await yieldToUI();
              }
            }
          };

          const kanjiResults = searchKanji(targetQuery);
          if (token === searchTokenRef.current && kanjiResults.length > 0) {
            const searchChars = targetQuery.split('').filter(c => /[\u3000-\u9fff]/.test(c));
            const directMatches: KanjiItem[] = [];
            const indirectMatches: KanjiItem[] = [];

            for (const k of kanjiResults) {
              const rawField = k.kanji || '';
              const realChars = extractKanjiChars(rawField);
              if (realChars.length === 0) continue;

              for (const c of realChars) {
                if (seenKanji.has(c)) continue;
                seenKanji.set(c, true);

                const item: KanjiItem =
                  rawField === c
                    ? (k as unknown as KanjiItem)
                    : ({
                        ...(k as any),
                        kanji: c,
                      } as unknown as KanjiItem);

                const isDirect = searchChars.includes(c);
                if (isDirect) directMatches.push(item);
                else indirectMatches.push(item);
              }
            }

            const sorted = [
              ...directMatches.sort((a, b) =>
                searchChars.indexOf(a.kanji) - searchChars.indexOf(b.kanji)
              ),
              ...indirectMatches,
            ];

            if (sorted.length > 0) {
              allFoundKanji.push(...sorted);
              updateUI();
              preloader.preloadKanjiBatch(sorted.map(k => k.kanji));
            }
          }

          await Promise.all([
            searchVocabKanji(),
            searchIndustryKanji(),
          ]);

          if (token === searchTokenRef.current) setLoading(false);
        };

        // ── SENTENCE ───────────────────────────────────────────────────────
        const runSentenceStream = async () => {
          if (targetTab !== 'sentence') return;
          const seen = new Map<string, boolean>();
          const CHUNK = 300;
          let total = 0;

          for (let i = 0; i < allSentences.length; i += CHUNK) {
            if (token !== searchTokenRef.current) return;
            if (total >= 30) break;

            const slice = allSentences.slice(i, i + CHUNK);
            const found: SearchResult[] = [];

            for (const s of slice) {
              if (!s?.jp) continue;
              const match =
                s.jp.includes(targetQuery) ||
                normalizeString(s.vi || '').includes(nq);
              if (match && !seen.has(s.jp)) {
                seen.set(s.jp, true);
                found.push({
                  id: `sentence_${total + found.length}`,
                  type: 'sentence',
                  title: s.jp.length > 60 ? s.jp.slice(0, 60) + '...' : s.jp,
                  subtitle:
                    s.source === 'grammar'
                      ? `📝 ${s.pattern || 'Ngữ pháp'}`
                      : s.level ? `📚 ${s.level}` : '',
                  description: s.vi,
                  data: s,
                });
                if (total + found.length >= 30) break;
              }
            }

            if (found.length > 0) {
              total += found.length;
              startTransition(() => setResults(prev => [...prev, ...found]));
              found.forEach(f => preloader.preloadSentence(f.id));
            }
            await yieldToUI();
          }
          if (token === searchTokenRef.current) setLoading(false);
        };

        // ── GRAMMAR ────────────────────────────────────────────────────────
        const runGrammarStream = async () => {
          if (targetTab !== 'grammar') return;
          const seen = new Map<string, boolean>();
          const CHUNK = 100;
          let total = 0;

          for (let i = 0; i < allGrammar.length; i += CHUNK) {
            if (token !== searchTokenRef.current) return;
            if (total >= 30) break;

            const slice = allGrammar.slice(i, i + CHUNK);
            const found: SearchResult[] = [];

            for (const g of slice) {
              const match =
                g.pattern?.includes(targetQuery) ||
                normalizeString(g.phienAm || '').includes(nq) ||
                normalizeString(g.meaning || '').includes(nq);
              if (match && !seen.has(g.pattern)) {
                seen.set(g.pattern, true);
                found.push({
                  id: `grammar_${total + found.length}`,
                  type: 'grammar',
                  title: g.pattern,
                  subtitle: g.phienAm || '',
                  description: g.meaning,
                  data: g,
                });
                if (total + found.length >= 30) break;
              }
            }

            if (found.length > 0) {
              total += found.length;
              startTransition(() => setResults(prev => [...prev, ...found]));
              preloader.preloadGrammarBatch(found.map(f => f.title));
            }
            await yieldToUI();
          }
          if (token === searchTokenRef.current) setLoading(false);
        };

        // ── ALL (gộp 4 nguồn local + Jisho) ──────────────────────────────────
        const runAllStream = async () => {
          const localVocab = (async () => {
            const seen = new Map<string, boolean>();
            let totalFound = 0;
            for (const chunk of vocabByLevel) {
              if (token !== searchTokenRef.current) return;
              if (seen.size >= 15) break;
              const found: SearchResult[] = [];
              for (const v of chunk) {
                if (seen.size >= 15) break;
                if (!v.kanji || seen.has(v.kanji)) continue;
                if (matchVocabItem(v)) {
                  seen.set(v.kanji, true);
                  found.push(toVocabResult(v, totalFound + found.length, 'all_jlpt', '📖 Từ vựng'));
                }
              }
              if (found.length > 0) {
                totalFound += found.length;
                startTransition(() => setResults(prev => [...prev, ...found]));
                preloader.preloadVocabBatch(found.map(f => f.title));
              }
              await yieldToUI();
            }
          })();

          const localIndustry = (async () => {
            const seen = new Map<string, boolean>();
            let idx = 0;
            for (const [bookId, items] of Object.entries(INDUSTRY_VOCAB) as [string, any[]][]) {
              if (token !== searchTokenRef.current) return;
              if (seen.size >= 10) break;
              const label = getIndustryLabel(bookId);
              for (const v of items) {
                if (seen.size >= 10) break;
                const key = `${bookId}_${v.kanji || v.hira || v.hiragana}`;
                if (!v.kanji && !v.hira && !v.hiragana) continue;
                if (seen.has(key)) continue;
                if (matchVocabItem(v)) {
                  seen.set(key, true);
                  const one = [toVocabResult(v, idx++, `all_ind_${bookId}`, label)];
                  startTransition(() => setResults(prev => [...prev, ...one]));
                  preloader.preloadVocabBatch(one.map(f => f.title));
                }
              }
              await yieldToUI();
            }
          })();

          const localKanjiDict = (async () => {
            if (token !== searchTokenRef.current) return;
            const kanjiFound = searchKanji(targetQuery);
            if (kanjiFound.length === 0) return;
            const mapped: SearchResult[] = kanjiFound.slice(0, 10).map((k, idx) => ({
              id: `all_kanjidict_${idx}_${k.kanji}`,
              type: 'vocab',
              title: k.kanji,
              subtitle: k.hanviet.join(' • '),
              description: k.meanings_vi.join(', '),
              data: k,
              sourceLabel: '🈳 Hán tự',
            }));
            startTransition(() => setResults(prev => [...prev, ...mapped]));
          })();

          const localSentence = (async () => {
            const seen = new Map<string, boolean>();
            let total = 0;
            const CHUNK = 300;
            for (let i = 0; i < allSentences.length; i += CHUNK) {
              if (token !== searchTokenRef.current) return;
              if (total >= 8) break;
              const slice = allSentences.slice(i, i + CHUNK);
              const found: SearchResult[] = [];
              for (const s of slice) {
                if (!s?.jp) continue;
                const match = s.jp.includes(targetQuery) || normalizeString(s.vi || '').includes(nq);
                if (match && !seen.has(s.jp)) {
                  seen.set(s.jp, true);
                  found.push({
                    id: `all_sentence_${total + found.length}`,
                    type: 'sentence',
                    title: s.jp.length > 60 ? s.jp.slice(0, 60) + '...' : s.jp,
                    subtitle: s.source === 'grammar' ? `📝 ${s.pattern || 'Ngữ pháp'}` : s.level ? `📚 ${s.level}` : '',
                    description: s.vi,
                    data: s,
                  });
                  if (total + found.length >= 8) break;
                }
              }
              if (found.length > 0) {
                total += found.length;
                startTransition(() => setResults(prev => [...prev, ...found]));
                found.forEach(f => preloader.preloadSentence(f.id));
              }
              await yieldToUI();
            }
          })();

          const localGrammar = (async () => {
            const seen = new Map<string, boolean>();
            let total = 0;
            const CHUNK = 100;
            for (let i = 0; i < allGrammar.length; i += CHUNK) {
              if (token !== searchTokenRef.current) return;
              if (total >= 8) break;
              const slice = allGrammar.slice(i, i + CHUNK);
              const found: SearchResult[] = [];
              for (const g of slice) {
                const match =
                  g.pattern?.includes(targetQuery) ||
                  normalizeString(g.phienAm || '').includes(nq) ||
                  normalizeString(g.meaning || '').includes(nq);
                if (match && !seen.has(g.pattern)) {
                  seen.set(g.pattern, true);
                  found.push({
                    id: `all_grammar_${total + found.length}`,
                    type: 'grammar',
                    title: g.pattern,
                    subtitle: g.phienAm || '',
                    description: g.meaning,
                    data: g,
                  });
                  if (total + found.length >= 8) break;
                }
              }
              if (found.length > 0) {
                total += found.length;
                startTransition(() => setResults(prev => [...prev, ...found]));
                preloader.preloadGrammarBatch(found.map(f => f.title));
              }
              await yieldToUI();
            }
          })();

          const jishoStream = (async () => {
            const jishoResults = await searchJisho(targetQuery, isVietnamese);
            if (token !== searchTokenRef.current || jishoResults.length === 0) return;
            LayoutAnimation.configureNext(
              LayoutAnimation.create(
                280,
                LayoutAnimation.Types.easeInEaseOut,
                LayoutAnimation.Properties.opacity
              )
            );
            startTransition(() => setResults(prev => [...jishoResults, ...prev]));
          })();

          await Promise.all([localVocab, localIndustry, localKanjiDict, localSentence, localGrammar, jishoStream]);
          if (token === searchTokenRef.current) setLoading(false);
        };

        switch (targetTab) {
          case 'vocab':    runVocabStream();    break;
          case 'kanji':    runKanjiStream();    break;
          case 'sentence': runSentenceStream(); break;
          case 'grammar':  runGrammarStream();  break;
          case 'all':      runAllStream();      break;
        }
      });
    },
    [vocabByLevel, allGrammar, allSentences, industryVocab, startTransition]
  );

  // THAY toàn bộ useEffect hiện tại:
  useEffect(() => {
    if (!active) return;

    setQuery(initialQuery);
    setActiveTab(initialTab ?? 'vocab');
    setResults([]);
    setLoading(false);
    setKanjiModalVisible(false);
    setSelectedResult(null);
    setDrawModalVisible(false);

    // Không dùng InteractionManager ở đây — chạy đồng bộ ngay
    setHistoryKey(prev => prev + 1);

    if (autoOpenDrawer || initialTab === 'kanji') {
      setActiveTab('kanji');
      setDrawModalVisible(true);
      if (onDrawerOpened) onDrawerOpened();
    } else if (initialTab) {
      setActiveTab(initialTab);
    }

    if (initialQuery.trim()) {
      executeSearchLogic(initialQuery, initialTab ?? 'vocab');
    }
  }, [active]); 

  const performSearch = () => executeSearchLogic(query, activeTab);

  const handleTabChange = (tabId: SearchType) => {
    searchTokenRef.current++;
    setLoading(false);
    setActiveTab(tabId);
    setSelectedResult(null);
    setHistoryKey(prev => prev + 1);
    if (tabId !== 'kanji') {
      setKanjiModalVisible(false);
      setDrawModalVisible(false);
    }
    if (query.trim().length > 0) {
      if (tabId === 'kanji') {
        setResults([]);
        executeSearchLogic(query, tabId);
      } else {
        executeSearchLogic(query, tabId);
      }
    } else {
      setResults([]);
    }
  };

  const handleSearchPress = (candidates?: any[]) => {
    setDrawModalVisible(false);
    if (drawModalRef.current) drawModalRef.current.clearCanvas();

    if (candidates && candidates.length > 0) {
      const seen = new Map<string, boolean>();
      const chars: string[] = [];
      for (const c of candidates) {
        const k = c?.item?.kanji || c?.kanji || '';
        if (k && !seen.has(k)) { seen.set(k, true); chars.push(k); }
        if (chars.length >= 12) break;
      }
      if (chars.length > 0) {
        InteractionManager.runAfterInteractions(() => {
          startTransition(() => {
            setCurrentKanjiResults(chars);
            setFoundKanjiChars(chars);
            setKanjiModalVisible(true);
          });
          saveToHistory(chars[0], 'kanji');
          setHistoryKey(prev => prev + 1);
        });
        return;
      }
    }

    if (!query.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập từ khóa tìm kiếm');
      return;
    }
    performSearch();
    saveToHistory(query, activeTab);
    setHistoryKey(prev => prev + 1);
  };

  const openDrawKanjiModal = () => {
    Keyboard.dismiss();
    setActiveTab('kanji');
    setDrawModalVisible(true);
    if (onDrawerOpened) onDrawerOpened();
  };

  const handleSelectKanji = (kanji: string) => {
    const nextQuery = query + kanji;
    setQuery(nextQuery);
    if (drawModalRef.current) drawModalRef.current.clearCanvas();
    setActiveTab('kanji');
  };

    const handleResultPress = (result: SearchResult) => {
    Keyboard.dismiss();
    searchTokenRef.current++;
    setLoading(false);

    const isKanjiDictItem = result.sourceLabel === '🈳 Hán tự';

    if (result.type === 'kanji' || isKanjiDictItem) {
      const chars = isKanjiDictItem
        ? [result.title]
        : currentKanjiResults.length > 0 ? currentKanjiResults : [result.title];

      InteractionManager.runAfterInteractions(() => {
        startTransition(() => {
          setFoundKanjiChars(chars);
          setKanjiModalVisible(true);
        });
      });
    } else {
      InteractionManager.runAfterInteractions(() => {
        startTransition(() => setSelectedResult(result));
      });
    }
  };

  const renderItem = useCallback(
    ({ item }: { item: SearchResult }) => {
      if (item.type === 'vocab') {
        return (
          <TouchableOpacity
            style={[styles.vocabResultCard, { backgroundColor: c.card }]}
            onPress={() => handleResultPress(item)}
            activeOpacity={0.7}
          >
            <Text style={[styles.vocabResultChar, { color: c.primary }]}>{item.title}</Text>
            <View style={styles.vocabResultInfo}>
              <Text style={[styles.vocabResultReading, { color: c.mutedForeground }]}>{item.subtitle}</Text>
              <Text style={[styles.vocabResultMeaning, { color: c.mutedForeground }]} numberOfLines={1}>
                {item.description}
              </Text>
              {item.sourceLabel ? (
                <View style={[styles.sourceBadge, { backgroundColor: c.accent + '1a', borderColor: c.accent + '55' }]}>
                  <Text style={[styles.sourceBadgeText, { color: c.accent }]}>{item.sourceLabel}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.arrowIcon, { color: c.mutedForeground }]}>›</Text>
          </TouchableOpacity>
        );
      }
      return (
        <TouchableOpacity
          style={[styles.resultCard, { backgroundColor: c.card }]}
          onPress={() => handleResultPress(item)}
          activeOpacity={0.7}
        >
          <Text style={[styles.resultTitle, { color: c.text }]} numberOfLines={2}>{item.title}</Text>
          <Text style={[styles.resultSubtitle, { color: c.mutedForeground }]}>{item.subtitle}</Text>
          <Text style={[styles.resultDesc, { color: c.mutedForeground }]} numberOfLines={2}>{item.description}</Text>
          {/* Badge phân loại Mẫu câu / Ngữ pháp — giữ 2 màu cố định (xanh lá /
              vàng) để luôn phân biệt được loại kết quả, không phụ thuộc theme. */}
          <View
            style={[
              styles.resultTypeBadge,
              { backgroundColor: item.type === 'sentence' ? '#f0fdf4' : '#fef3c7' },
            ]}
          >
            <Text style={styles.resultTypeText}>
              {item.type === 'sentence' ? 'Mẫu câu' : 'Ngữ pháp'}
            </Text>
          </View>
          <Text style={[styles.arrowIcon, { color: c.mutedForeground }]}>›</Text>
        </TouchableOpacity>
      );
    },
    [currentKanjiResults, c]
  );

  const keyExtractor = useCallback((item: SearchResult) => item.id, []);
  const displayResults = deferredResults;
  const isStale = results !== deferredResults;

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <LinearGradient
        colors={[c.primary, c.primary + 'cc']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          {onBack ? (
            <TouchableOpacity onPress={onBack} style={styles.backBtn}>
              <Text style={[styles.backIcon, { color: c.primaryForeground }]}>←</Text>
            </TouchableOpacity>
          ) : null}
          <LinearGradient
            colors={SUN_GRAD}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.heroBorder, !onBack && { marginLeft: 0 }]}
          >
            <View style={[styles.searchContainer, { backgroundColor: c.card }]}>
              <TouchableOpacity
                onPress={() => handleSearchPress()}
                style={[styles.searchIconBtn, { backgroundColor: c.muted }]}
                activeOpacity={0.7}
              >
                <Text style={styles.searchIconText}>🔍</Text>
              </TouchableOpacity>

              <View style={styles.inputWrap}>
                <TextInput
                  ref={inputRef}
                  style={[styles.searchInput, { color: c.text }]}
                  placeholder=""
                  value={query}
                  onChangeText={text => {
                    setQuery(text);
                    if (!text.trim()) {
                      setResults([]);
                      setLoading(false);
                    }
                  }}
                  returnKeyType="search"
                  onSubmitEditing={() => handleSearchPress()}
                  autoFocus={false}
                  onFocus={() => {
                    setInputFocused(true);
                    if (drawModalVisible) setDrawModalVisible(false);
                  }}
                  onBlur={() => setInputFocused(false)}
                />
                {/* Chữ mẫu chạy tự động — chỉ hiện khi ô trống & chưa focus */}
                {!query && !inputFocused && (
                  <Animated.Text
                    pointerEvents="none"
                    style={[
                      styles.animatedPlaceholder,
                      { opacity: placeholderOpacity, color: c.mutedForeground },
                    ]}
                    numberOfLines={1}
                  >
                    {SEARCH_PLACEHOLDERS[placeholderIdx]}
                  </Animated.Text>
                )}
              </View>

              {(loading || isPending) ? (
                <ActivityIndicator size="small" color={c.primary} style={{ marginHorizontal: 4 }} />
              ) : (
                <TouchableOpacity onPress={openDrawKanjiModal} style={styles.drawKanjiBtn}>
                  <LinearGradient colors={SUN_GRAD} style={styles.drawKanjiBtnGrad}>
                    <Text style={styles.drawKanjiIcon}>✏️</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          </LinearGradient>
        </View>
        </SafeAreaView>
      </LinearGradient>

      <View style={[styles.tabBar, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        {TAB_LIST.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tabBtn,
              activeTab === tab.id && { borderBottomWidth: 2, borderBottomColor: c.primary },
            ]}
            onPress={() => handleTabChange(tab.id as SearchType)}
            activeOpacity={0.7}
          >
            <Text style={styles.tabIcon}>{tab.icon}</Text>
            <Text
              style={[
                styles.tabLabel,
                { color: c.mutedForeground },
                activeTab === tab.id && { color: c.primary, fontWeight: '700' },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ flex: 1 }}>
        {kanjiModalVisible && foundKanjiChars.length > 0 && (
          <View style={[StyleSheet.absoluteFill, { zIndex: 2 }]}>
            <KanjiDetailInline
              kanjiChars={foundKanjiChars}
              initialIndex={0}
              onClose={() => {
                setKanjiModalVisible(false);
                setFoundKanjiChars([]);
                setCurrentKanjiResults([]);
              }}
            />
          </View>
        )}
        {!kanjiModalVisible && (selectedResult ? (
          selectedResult.type === 'vocab' ? (
            <VocabDetailInline
              key={`vocab-${selectedResult.title}`}
              kanji={selectedResult.title}
              hiragana={selectedResult.subtitle}
              nghia={selectedResult.description}
              jisho_meaning_en={selectedResult.data?.jisho_meaning_en || ''}
              han={selectedResult.data?.han || ''}
              level={selectedResult.data?.level || 'N3'}
              example={selectedResult.data?.example || ''}
              exampleMeaning={selectedResult.data?.exampleMeaning || ''}
              id={selectedResult.data?.kanji || selectedResult.title}
              wordType={selectedResult.data?.wordType}
              typeLabel={selectedResult.data?.typeLabel}
              isNaAdjective={selectedResult.data?.isNaAdjective}
              isExtractedVerb={selectedResult.data?.isExtractedVerb}
              extractedVerb={selectedResult.data?.extractedVerb}
              isConjugatedForm={selectedResult.data?.isConjugatedForm}
              conjugatedForm={selectedResult.data?.conjugatedForm}
              onClose={() => setSelectedResult(null)}
            />
          ) : selectedResult.type === 'sentence' ? (
            <SentenceDetailInline
              key={`sentence-${selectedResult.title}`}
              jp={selectedResult.data?.jp || selectedResult.title}
              vi={selectedResult.description}
              pattern={selectedResult.data?.pattern}
              level={selectedResult.data?.level}
              note={selectedResult.data?.note}
              reading={selectedResult.data?.reading}
              onClose={() => setSelectedResult(null)}
            />
          ) : (
            <GrammarDetailInline
              key={`grammar-${selectedResult.title}`}
              id={selectedResult.data?.id}
              pattern={selectedResult.title}
              reading={selectedResult.subtitle}
              meaning={selectedResult.description}
              structure={selectedResult.data?.structure}
              note={selectedResult.data?.note}
              level={selectedResult.data?.level}
              examples={selectedResult.data?.examples || []}
              onClose={() => setSelectedResult(null)}
            />
          )
        ) : (
          <>
            {query.length === 0 ? (
              <FlatList
                data={[]}
                renderItem={null}
                ListHeaderComponent={
                  <>
                    <SearchSuggestions
                      activeTab={activeTab === 'all' ? 'vocab' : activeTab}
                      onSelectSuggestion={(text, tab) => {
                        setQuery(text);
                        setActiveTab(tab);
                        executeSearchLogic(text, tab);
                      }}
                      visible={query.length === 0}
                    />
                    <SearchHistory
                      key={historyKey}
                      ref={historyRef}
                      onSelectHistory={text => {
                        setQuery(text);
                        executeSearchLogic(text, activeTab);
                      }}
                      type={(activeTab === 'kanji' || activeTab === 'all') ? 'vocab' : activeTab}
                    />
                    <View style={{ height: 30 }} />
                  </>
                }
                keyboardShouldPersistTaps="handled"
              />
            ) : displayResults.length === 0 && !loading ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>✏️</Text>
                <Text style={[styles.emptyTitle, { color: c.text }]}>
                  {debouncedQuery.trim()
                    ? 'Không tìm thấy kết quả'
                    : 'Nhấn kính lúp để tìm kiếm'}
                </Text>
                <Text style={[styles.emptySub, { color: c.mutedForeground }]}>Thử từ khóa khác</Text>
              </View>
            ) : (
              <FlatList
                data={displayResults}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                windowSize={5}
                maxToRenderPerBatch={8}
                initialNumToRender={10}
                removeClippedSubviews={Platform.OS !== 'android'}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{
                  paddingTop: 8,
                  paddingHorizontal: 16,
                  paddingBottom: 20,
                  opacity: isStale ? 0.7 : 1,
                }}
                showsVerticalScrollIndicator={false}
              />
            )}
          </>
        ))}
      </View>

      {drawModalVisible && (
        <TouchableWithoutFeedback onPress={() => setDrawModalVisible(false)}>
          <View style={styles.drawBackdrop} />
        </TouchableWithoutFeedback>
      )}

      <KanjiDrawSearchModal
        visible={drawModalVisible}
        onClose={() => setDrawModalVisible(false)}
        ref={drawModalRef}
        onSearchPress={handleSearchPress}
        onSelectKanji={handleSelectKanji}
        isInline={false}
      />
      <MemoAdBanner />
    </View>
  );
}

// ─── STYLES (chỉ layout — màu gán inline theo theme ở trên) ───────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  backBtn: { 
    width: 42,
    height: 42,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center', 
  },
  backIcon: { 
    fontSize: 22, 
    fontWeight: '700',
    textAlign: 'center', 
    marginTop: -5,
  },
  // Viền gradient cam-vàng bọc ngoài ô tìm kiếm — đồng bộ với "hero search
  // dock" ở trang chủ.
  heroBorder: {
    flex: 1,
    borderRadius: 70,
    padding: 2,
    shadowColor: '#FF7A59',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 68,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  searchIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchIconText: { fontSize: 16 },
  inputWrap: {
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  searchInput: {
    fontSize: 16,
    fontWeight: '500',
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    paddingHorizontal: 4,
    height: 54,
    lineHeight: 26,
    ...(Platform.OS === 'android' && { textAlignVertical: 'center' }),
  },
  animatedPlaceholder: {
    position: 'absolute',
    left: 4,
    right: 4,
    fontSize: 14.5,
    fontWeight: '500',
  },
  drawKanjiBtn: {
    marginLeft: 2,
  },
  drawKanjiBtnGrad: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawKanjiIcon: { 
    fontSize: 16, 
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    gap: 2,
    position: 'relative',
  },
  tabIcon: { fontSize: 18 },
  tabLabel: { fontSize: 11 },
  vocabResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  vocabResultChar: {
    fontSize: 22,
    fontWeight: '700',
    minWidth: 44,
  },
  vocabResultInfo: { flex: 1, marginHorizontal: 10 },
  vocabResultReading: { fontSize: 14 },
  vocabResultMeaning: { fontSize: 13, marginTop: 2 },
  sourceBadge: {
    alignSelf: 'flex-start',
    marginTop: 5,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
  },
  sourceBadgeText: { fontSize: 10, fontWeight: '600' },
  resultCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  resultTitle: { fontSize: 17, fontWeight: '700' },
  resultSubtitle: { fontSize: 13, marginTop: 3 },
  resultDesc: { fontSize: 13, marginTop: 4 },
  resultTypeBadge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 6,
  },
  // Chữ trên badge Mẫu câu/Ngữ pháp giữ màu tối cố định — nền badge cũng cố
  // định (xanh lá/vàng nhạt) nên luôn đủ tương phản, không cần đổi theo theme.
  resultTypeText: { fontSize: 11, color: '#334155', fontWeight: '600' },
  arrowIcon: { fontSize: 20, marginLeft: 6 },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySub: { 
    fontSize: 13, 
    marginTop: 6 
  },
  drawBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 998,
    backgroundColor: 'transparent', 
  },
});