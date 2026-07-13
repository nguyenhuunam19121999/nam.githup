//////////Searchinline.tsx ////////////
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
  FlatList,
  Keyboard,
  ActivityIndicator,
  Alert,
  InteractionManager,
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
import SearchSuggestions from './SearchSuggestions';
import { preloader } from '../services/KanjiPreloader';
import { searchKanji } from '../assets/data_JLPT_kanji';

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

const TEAL = '#1F6F7A';
const TEAL_DARK = '#0B3540';
const BG_GRAY = '#f0f4f8';
const bgrColor = "#f1f5f9";

type SearchType = 'vocab' | 'kanji' | 'sentence' | 'grammar';

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
    ざ: 'za', じ: 'ji', zu: 'zu', ぜ: 'ze', ぞ: 'zo',
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

export default function SearchInline({
  onBack,
  autoOpenDrawer = false,
  onDrawerOpened,
  initialTab,
  initialQuery = '',
  active = true,
}: SearchInlineProps) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<SearchType>(initialTab ?? 'vocab');
  const inputRef = useRef<TextInput>(null);
  const [drawModalVisible, setDrawModalVisible] = useState(false);
  const [kanjiModalVisible, setKanjiModalVisible] = useState(false);
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
    const histType = tab === 'kanji' ? 'vocab' : tab;
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
          await Promise.all([
            runJLPTVocabStream(),
            runIndustryVocabStream(),
            runKanjiEntryStream(), 
          ]);
          if (token === searchTokenRef.current) setLoading(false);
        };

        // ── KANJI STREAM (Giải quyết hoàn toàn bằng việc tách ký tự) ───────
        const runKanjiStream = async () => {
          if (targetTab !== 'kanji') return;

          const seenKanji = new Map<string, boolean>();
          const allFoundKanji: KanjiItem[] = [];

          const updateUI = () => {
          const chars = allFoundKanji.map(k => k.kanji);
          startTransition(() => {
            setCurrentKanjiResults(chars);
            setFoundKanjiChars(chars);
            if (chars.length > 0 && !kanjiModalVisible) {  // ← thêm lại check
              setKanjiModalVisible(true);
            }
          });
        };

          // // THÀNH (version cũ dùng check !kanjiModalVisible — ok vì không còn trong deps):
          // const updateUI = () => {
          //   const chars = allFoundKanji.map(k => k.kanji);
          //   startTransition(() => {
          //     setCurrentKanjiResults(chars);
          //     setFoundKanjiChars(chars);
          //     if (chars.length > 0 && !kanjiModalVisible) {
          //       setKanjiModalVisible(true);
          //     }
          //   });
          // };

          // Trong runKanjiStream, thay đoạn updateUI():
          // const updateUI = () => {
          //   const chars = allFoundKanji.map(k => k.kanji);
          //   startTransition(() => {
          //     setCurrentKanjiResults(chars);
          //     setFoundKanjiChars(chars);
          //     // Dùng ref thay vì check kanjiModalVisible trực tiếp để tránh stale closure
          //     if (chars.length > 0) {
          //       setKanjiModalVisible(true);  // luôn set, không check !kanjiModalVisible
          //     }
          //   });
          // };
          
          // const updateUI = () => {
          //   const chars = allFoundKanji.map(k => k.kanji);
          //   startTransition(() => {
          //     setCurrentKanjiResults(chars);
          //     setFoundKanjiChars(chars);
          //     if (chars.length > 0 && !kanjiModalVisible) {
          //       setKanjiModalVisible(true);
          //     }
          //   });
          // };

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

        switch (targetTab) {
          case 'vocab':    runVocabStream();    break;
          case 'kanji':    runKanjiStream();    break;
          case 'sentence': runSentenceStream(); break;
          case 'grammar':  runGrammarStream();  break;
        }
      });
    },
    [vocabByLevel, allGrammar, allSentences, industryVocab, startTransition]
    // [vocabByLevel, allGrammar, allSentences, industryVocab, startTransition, kanjiModalVisible]
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

  // const handleTabChange = (tabId: SearchType) => {
  //   searchTokenRef.current++;
  //   setLoading(false);
  //   setActiveTab(tabId);
  //   setSelectedResult(null);
  //   setHistoryKey(prev => prev + 1);
  //   if (tabId !== 'kanji') {
  //     setKanjiModalVisible(false);
  //     setDrawModalVisible(false);
  //   }
  //   if (query.trim().length > 0) {
  //     if (tabId === 'kanji') {
  //       setResults([]);
  //       executeSearchLogic(query, tabId);
  //     } else {
  //       executeSearchLogic(query, tabId);
  //     }
  //   } else {
  //     setResults([]);
  //   }
  // };

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
            style={styles.vocabResultCard}
            onPress={() => handleResultPress(item)}
            activeOpacity={0.7}
          >
            <Text style={styles.vocabResultChar}>{item.title}</Text>
            <View style={styles.vocabResultInfo}>
              <Text style={styles.vocabResultReading}>{item.subtitle}</Text>
              <Text style={styles.vocabResultMeaning} numberOfLines={1}>
                {item.description}
              </Text>
              {item.sourceLabel ? (
                <View style={styles.sourceBadge}>
                  <Text style={styles.sourceBadgeText}>{item.sourceLabel}</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.arrowIcon}>›</Text>
          </TouchableOpacity>
        );
      }
      return (
        <TouchableOpacity
          style={styles.resultCard}
          onPress={() => handleResultPress(item)}
          activeOpacity={0.7}
        >
          <Text style={styles.resultTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.resultSubtitle}>{item.subtitle}</Text>
          <Text style={styles.resultDesc} numberOfLines={2}>{item.description}</Text>
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
          <Text style={styles.arrowIcon}>›</Text>
        </TouchableOpacity>
      );
    },
    [currentKanjiResults]
  );

  const keyExtractor = useCallback((item: SearchResult) => item.id, []);
  const displayResults = deferredResults;
  const isStale = results !== deferredResults;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[TEAL, TEAL_DARK]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          {onBack ? (
            <TouchableOpacity onPress={onBack} style={styles.backBtn}>
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
          ) : null}
          <View style={[styles.searchContainer, !onBack && { marginLeft: 0 }]}>
            <TouchableOpacity
              onPress={() => handleSearchPress()}
              style={styles.searchIconBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.searchIconText}>🔍</Text>
            </TouchableOpacity>
            <TextInput
              ref={inputRef}
              style={styles.searchInput}
              placeholder="Tìm từ vựng, kanji, mẫu câu, ngữ pháp..."
              placeholderTextColor="#94a3b8"
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
                if (drawModalVisible) setDrawModalVisible(false);
              }}
            />
            {(loading || isPending) ? (
              <ActivityIndicator size="small" color={TEAL} style={{ marginHorizontal: 4 }} />
            ) : (
              <TouchableOpacity onPress={openDrawKanjiModal} style={styles.drawKanjiBtn}>
                <Text style={styles.drawKanjiIcon}>✏️</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        </SafeAreaView>
      </LinearGradient>

      <View style={styles.tabBar}>
        {[
          { id: 'vocab',    label: 'Từ vựng', icon: '📖' },
          { id: 'kanji',   label: 'Hán tự',  icon: '🈳' },
          { id: 'sentence', label: 'Mẫu câu', icon: '📚' },
          { id: 'grammar',  label: 'Ngữ pháp', icon: '📝' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tabBtn, activeTab === tab.id && styles.tabBtnActive]}
            onPress={() => handleTabChange(tab.id as SearchType)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabIcon, activeTab === tab.id && styles.tabIconActive]}>
              {tab.icon}
            </Text>
            <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>
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
                      activeTab={activeTab}
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
                      type={activeTab === 'kanji' ? 'vocab' : activeTab}
                    />
                    <View style={{ height: 30 }} />
                  </>
                }
                keyboardShouldPersistTaps="handled"
              />
            ) : displayResults.length === 0 && !loading ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>✏️</Text>
                <Text style={styles.emptyTitle}>
                  {debouncedQuery.trim()
                    ? 'Không tìm thấy kết quả'
                    : 'Nhấn kính lúp để tìm kiếm'}
                </Text>
                <Text style={styles.emptySub}>Thử từ khóa khác</Text>
              </View>
            ) : (
              <FlatList
                data={displayResults}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                windowSize={5}
                maxToRenderPerBatch={8}
                initialNumToRender={10}
                removeClippedSubviews={true}
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

      <KanjiDrawSearchModal
        visible={drawModalVisible}
        onClose={() => setDrawModalVisible(false)}
        ref={drawModalRef}
        onSearchPress={handleSearchPress}
        onSelectKanji={handleSelectKanji}
        isInline={false}
      />
    </View>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_GRAY },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  backBtn: { 
    // padding: 8,
    width: 42,
    height: 42,
    backgroundColor: 'transparent',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e8f0', 
  },
  backIcon: { 
    color: '#fff', 
    fontSize: 22, 
    fontWeight: '700',
    textAlign: 'center', 
    marginTop: -5,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 70,
    paddingHorizontal: 8,
  },
  searchIconBtn: { padding: 6 },
  searchIconText: { fontSize: 18 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1e293b',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  drawKanjiBtn: { 
    backgroundColor: '#f1f5f9', 
    borderRadius: 70,
    padding: 6,
    paddingHorizontal: 8,
  },
  drawKanjiIcon: { 
    fontSize: 16, 
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    gap: 2,
    position: 'relative',
  },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: TEAL },
  tabIcon: { fontSize: 18 },
  tabIconActive: {},
  tabLabel: { fontSize: 11, color: '#64748b' },
  tabLabelActive: { color: TEAL, fontWeight: '700' },
  vocabResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
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
    color: TEAL,
    minWidth: 44,
  },
  vocabResultInfo: { flex: 1, marginHorizontal: 10 },
  vocabResultReading: { fontSize: 14, color: '#475569' },
  vocabResultMeaning: { fontSize: 13, color: '#64748b', marginTop: 2 },
  sourceBadge: {
    alignSelf: 'flex-start',
    marginTop: 5,
    backgroundColor: '#fff7ed',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  sourceBadgeText: { fontSize: 10, color: '#c2410c', fontWeight: '600' },
  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  resultTitle: { fontSize: 17, fontWeight: '700', color: '#1e293b' },
  resultSubtitle: { fontSize: 13, color: '#64748b', marginTop: 3 },
  resultDesc: { fontSize: 13, color: '#475569', marginTop: 4 },
  resultTypeBadge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 6,
  },
  resultTypeText: { fontSize: 11, color: '#334155', fontWeight: '600' },
  arrowIcon: { fontSize: 20, color: '#94a3b8', marginLeft: 6 },
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
    color: '#475569',
    textAlign: 'center',
  },
  emptySub: { fontSize: 13, color: '#94a3b8', marginTop: 6 },
});