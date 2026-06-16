
// // components/SearchModal.tsx

// // ╔══════════════════════════════════════════════════════════════════╗
// // ║  SearchModal — PHIÊN BẢN TỐI ƯU ĐA LUỒNG                       ║
// // ║                                                                  ║
// // ║  Các kỹ thuật được áp dụng:                                      ║
// // ║  1. requestAnimationFrame  — yield chính xác theo frame 60fps    ║
// // ║  2. InteractionManager     — chờ animation xong mới search       ║
// // ║  3. useTransition          — update kết quả không block input    ║
// // ║  4. useDeferredValue       — React tự delay render khi bận       ║
// // ║  5. Debounce tự động       — auto-search sau 350ms gõ phím       ║
// // ║  6. Batch results          — gộp nhiều kết quả/render thay vì 1  ║
// // ╚══════════════════════════════════════════════════════════════════╝

// import React, {
//   useState,
//   useEffect,
//   useRef,
//   useCallback,
//   useMemo,
//   useTransition,
//   useDeferredValue,
// } from 'react';
// import {
//   Modal,
//   View,
//   Text,
//   StyleSheet,
//   TextInput,
//   TouchableOpacity,
//   FlatList,
//   StatusBar,
//   Keyboard,
//   ActivityIndicator,
//   Alert,
//   Dimensions,
//   InteractionManager,
// } from 'react-native';
// import { LinearGradient } from 'expo-linear-gradient';
// import { getVocab } from '../assets/vocab';
// import { getKanji, type KanjiItem } from '../assets/data_JLPT_kanji';
// import { getGrammar } from '../assets/data_nn';
// import { EXAMPLE_SENTENCES } from '../assets/sentences';
// import KanjiDetailInline from './KanjiDetailInline';
// import KanjiDrawSearchModal from './KanjiDrawSearchModal';
// import VocabDetailInline from './VocabDetailInline';
// import GrammarDetailInline from './GrammarDetailInline';
// import SentenceDetailInline from './SentenceDetailInline';
// import { SearchHistory, SearchHistoryRef } from './SearchHistory';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { useAuth } from '../artifacts/mirai-jp/hooks/useAuth';
// import SearchSuggestions from './SearchSuggestions';

// const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
// const TEAL = '#1F6F7A';
// const TEAL_DARK = '#0B3540';
// const BG_GRAY = '#f0f4f8';

// type SearchType = 'vocab' | 'kanji' | 'sentence' | 'grammar';

// interface SearchResult {
//   id: string;
//   type: SearchType;
//   title: string;
//   subtitle: string;
//   description: string;
//   data?: any;
// }

// interface SearchModalProps {
//   visible: boolean;
//   onClose: () => void;
//   autoOpenDrawer?: boolean;
//   onDrawerOpened?: () => void;
//   initialTab?: SearchType;
// }

// // ─── UTILS (không đổi) ───────────────────────────────────────────────────────

// function normalizeString(s: string) {
//   if (!s || typeof s !== 'string') return '';
//   return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
// }

// function hiraganaToRomaji(hiragana: string): string {
//   const map: Record<string, string> = {
//     あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o',
//     か: 'ka', き: 'ki', く: 'ku', け: 'ke', こ: 'ko',
//     さ: 'sa', し: 'shi', す: 'su', せ: 'se', そ: 'so',
//     た: 'ta', ち: 'chi', つ: 'tsu', て: 'te', と: 'to',
//     な: 'na', に: 'ni', ぬ: 'nu', ね: 'ne', の: 'no',
//     は: 'ha', ひ: 'hi', ふ: 'fu', へ: 'he', ほ: 'ho',
//     ま: 'ma', み: 'mi', む: 'mu', め: 'me', も: 'mo',
//     や: 'ya', ゆ: 'yu', よ: 'yo',
//     ら: 'ra', り: 'ri', る: 'ru', れ: 're', ろ: 'ro',
//     わ: 'wa', を: 'wo', ん: 'n',
//     が: 'ga', ぎ: 'gi', ぐ: 'gu', げ: 'ge', ご: 'go',
//     ざ: 'za', じ: 'ji', ず: 'zu', ぜ: 'ze', ぞ: 'zo',
//     だ: 'da', ぢ: 'ji', づ: 'zu', で: 'de', ど: 'do',
//     ば: 'ba', び: 'bi', ぶ: 'bu', べ: 'be', ぼ: 'bo',
//     ぱ: 'pa', ぴ: 'pi', ぷ: 'pu', ぺ: 'pe', ぽ: 'po',
//   };
//   let result = '';
//   let i = 0;
//   while (i < hiragana.length) {
//     const two = hiragana.slice(i, i + 2);
//     if (map[two]) { result += map[two]; i += 2; }
//     else { result += map[hiragana[i]] || hiragana[i]; i++; }
//   }
//   return result;
// }

// // ─── KỸ THUẬT 1: yieldToUI bằng requestAnimationFrame ───────────────────────
// // requestAnimationFrame chính xác hơn setTimeout(0):
// //   - Đồng bộ với vòng vẽ 60fps của hệ thống
// //   - Không bị gộp/trì hoãn bởi Hermes engine như setTimeout
// //   - Bị tạm dừng tự động khi app vào background (tiết kiệm pin)
// const yieldToUI = (): Promise<void> =>
//   new Promise(resolve => requestAnimationFrame(() => resolve()));

// // ─── KỸ THUẬT 2: Nhóm dữ liệu theo level một lần duy nhất ──────────────────
// // Thay vì mỗi lần search lại chạy vòng lặp phân loại → cache sẵn khi mount
// function groupByLevel<T extends Record<string, any>>(
//   items: T[]
// ): T[][] {
//   const byLevel: Record<string, T[]> = {
//     N5: [], N4: [], N3: [], N2: [], N1: [], other: [],
//   };
//   for (const item of items) {
//     const lv = (item as any).level || (item as any).jlpt || '';
//     if (byLevel[lv]) byLevel[lv].push(item);
//     else byLevel.other.push(item);
//   }
//   const ordered = ['N5', 'N4', 'N3', 'N2', 'N1']
//     .map(lv => byLevel[lv])
//     .filter(arr => arr.length > 0);
//   if (byLevel.other.length > 0) ordered.push(byLevel.other);
//   return ordered;
// }

// // ─── KỸ THUẬT 3: Debounce hook ───────────────────────────────────────────────
// // Auto-search sau khi người dùng ngừng gõ 350ms
// // Không cần bấm nút → UX mượt hơn, không block UI
// function useDebounce<T>(value: T, delay: number): T {
//   const [debounced, setDebounced] = useState<T>(value);
//   useEffect(() => {
//     const timer = setTimeout(() => setDebounced(value), delay);
//     return () => clearTimeout(timer);
//   }, [value, delay]);
//   return debounced;
// }

// // ════════════════════════════════════════════════════════════════════════════
// // COMPONENT CHÍNH
// // ════════════════════════════════════════════════════════════════════════════

// export default function SearchModal({
//   visible,
//   onClose,
//   autoOpenDrawer = false,
//   onDrawerOpened,
//   initialTab,
// }: SearchModalProps) {
//   const [query, setQuery] = useState('');
//   const [results, setResults] = useState<SearchResult[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [activeTab, setActiveTab] = useState<SearchType>('vocab');
//   const inputRef = useRef<TextInput>(null);
//   const [drawModalVisible, setDrawModalVisible] = useState(false);
//   const [kanjiModalVisible, setKanjiModalVisible] = useState(false);
//   const [foundKanjiChars, setFoundKanjiChars] = useState<string[]>([]);
//   const [currentKanjiResults, setCurrentKanjiResults] = useState<string[]>([]);
//   const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);

//   const { scopedKey, currentUser } = useAuth();
//   const historyRef = useRef<SearchHistoryRef>(null);
//   const drawModalRef = useRef<any>(null);
//   const [historyKey, setHistoryKey] = useState(0);
//   const [drawModalHeight, setDrawModalHeight] = useState(0);

//   // ── KỸ THUẬT 4: useTransition ──────────────────────────────────────────────
//   // isPending = true trong khi React đang xử lý update thấp ưu tiên
//   // Tất cả setResults() trong search được bọc trong startTransition →
//   // React ưu tiên xử lý input/animation, trì hoãn render kết quả nếu cần
//   const [isPending, startTransition] = useTransition();

//   // ── KỸ THUẬT 5: useDeferredValue ───────────────────────────────────────────
//   // React có thể "giữ lại" giá trị cũ của results khi đang transition
//   // Màn hình không flash trắng, không "nhảy" trong khi search đang chạy
//   const deferredResults = useDeferredValue(results);

//   // ── KỸ THUẬT 6: Debounce auto-search ─────────────────────────────────────
//   const debouncedQuery = useDebounce(query, 350);

//   // ── Cache phân loại dữ liệu theo level — chỉ tính 1 lần khi mount ─────────
//   const allVocab = useMemo(() => getVocab(), []);
//   const allKanji = useMemo(() => getKanji(), []);
//   const allGrammar = useMemo(() => getGrammar(), []);
//   const allSentences = useMemo(() => EXAMPLE_SENTENCES, []);

//   // Cache nhóm theo level — tốn O(n) lần đầu, sau đó O(1) mỗi search
//   const vocabByLevel = useMemo(() => groupByLevel(allVocab), [allVocab]);
//   const kanjiByLevel = useMemo(() => groupByLevel(allKanji), [allKanji]);

//   const searchTokenRef = useRef(0);

//   const saveToHistory = async (text: string, tab: SearchType) => {
//     if (!currentUser || !text.trim()) return;
//     const histType = tab === 'kanji' ? 'vocab' : tab;
//     const key = scopedKey(`search_history_${histType}`);
//     try {
//       const raw = await AsyncStorage.getItem(key);
//       let items = raw ? JSON.parse(raw) : [];
//       items = items.filter((i: any) => i.text !== text.trim());
//       items.unshift({
//         id: Date.now().toString(),
//         text: text.trim(),
//         timestamp: Date.now(),
//         type: histType,
//       });
//       if (items.length > 20) items = items.slice(0, 20);
//       await AsyncStorage.setItem(key, JSON.stringify(items));
//     } catch (_) {}
//   };

//   // ══════════════════════════════════════════════════════════════════════════
//   // LOGIC TÌM KIẾM TỐI ƯU
//   // ══════════════════════════════════════════════════════════════════════════

//   const executeSearchLogic = useCallback(
//     (targetQuery: string, targetTab: SearchType) => {
//       setSelectedResult(null);
//       setKanjiModalVisible(false);

//       if (!targetQuery.trim()) {
//         setResults([]);
//         setLoading(false);
//         return;
//       }

//       const token = ++searchTokenRef.current;
//       setLoading(true);

//       // KỸ THUẬT 7: InteractionManager.runAfterInteractions ─────────────────
//       // Toàn bộ logic search bắt đầu SAU KHI animation/transition UI xong
//       // Ví dụ: khi bấm tab → tab animation xong → rồi mới search
//       // Tránh search chạy đồng thời với animation gây drop frame
//       InteractionManager.runAfterInteractions(() => {
//         if (token !== searchTokenRef.current) return;

//         // Reset kết quả trong transition (không block UI)
//         startTransition(() => setResults([]));

//         const nq = normalizeString(targetQuery);
//         const lq = targetQuery.toLowerCase();
//         const isEnglish = /[a-zA-Z]/.test(targetQuery);
//         const isVietnamese =
//           /[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠƯàáâãèéêìíòóôõùúăđĩũơư]/i.test(
//             targetQuery
//           );

//         // ── Helpers ─────────────────────────────────────────────────────────

//         const searchVocabChunk = (
//           chunk: any[],
//           seen: Map<string, boolean>,
//           offset: number
//         ): SearchResult[] => {
//           const out: SearchResult[] = [];
//           for (const v of chunk) {
//             if (seen.size >= 30) break;
//             const hira = v.hiragana || v.hira || '';
//             const romaji = isEnglish ? hiraganaToRomaji(hira) : '';
//             if (
//               (v.kanji?.includes(targetQuery) ||
//                 hira.includes(targetQuery) ||
//                 romaji.includes(lq) ||
//                 normalizeString(v.han || '').includes(nq) ||
//                 normalizeString(v.nghia || '').includes(nq)) &&
//               v.kanji &&
//               !seen.has(v.kanji)
//             ) {
//               seen.set(v.kanji, true);
//               out.push({
//                 id: `vocab_${offset + out.length}`,
//                 type: 'vocab',
//                 title: v.kanji,
//                 subtitle: hira,
//                 description: v.nghia || '',
//                 data: v,
//               });
//             }
//           }
//           return out;
//         };

//         const searchKanjiChunk = (
//           chunk: KanjiItem[],
//           seen: Map<string, boolean>,
//           searchChars: string[]
//         ): KanjiItem[] => {
//           const out: KanjiItem[] = [];
//           for (const k of chunk) {
//             if (seen.size >= 20) break;
//             const match = isVietnamese
//               ? normalizeString(k.hanViet || '').includes(nq) ||
//                 k.meanings?.some((m: string) =>
//                   normalizeString(m).includes(nq)
//                 )
//               : searchChars.includes(k.kanji) ||
//                 k.kunyomi?.some((r: string) => r.includes(targetQuery)) ||
//                 k.onyomi?.some((r: string) => r.includes(targetQuery));
//             if (match && !seen.has(k.kanji)) {
//               seen.set(k.kanji, true);
//               out.push(k);
//             }
//           }
//           return out;
//         };

//         // ── VOCAB STREAM ────────────────────────────────────────────────────
//         const runVocabStream = async () => {
//           if (targetTab !== 'vocab') return;
//           const seen = new Map<string, boolean>();
//           let totalFound = 0;

//           for (const chunk of vocabByLevel) {
//             if (token !== searchTokenRef.current) return;
//             if (seen.size >= 30) break;

//             const found = searchVocabChunk(chunk, seen, totalFound);

//             if (found.length > 0) {
//               totalFound += found.length;
//               // KỸ THUẬT 8: Bọc setResults trong startTransition ────────────
//               // React KHÔNG block input/scroll để xử lý update này
//               // Nếu người dùng đang gõ, React sẽ ưu tiên input trước
//               startTransition(() => {
//                 setResults(prev => [...prev, ...found]);
//               });
//             }

//             await yieldToUI(); // nhường frame cho UI
//           }

//           if (token === searchTokenRef.current) setLoading(false);
//         };

//         // ── KANJI STREAM ────────────────────────────────────────────────────
//         const runKanjiStream = async () => {
//           if (targetTab !== 'kanji') return;
//           const seen = new Map<string, boolean>();
//           const searchChars = targetQuery
//             .split('')
//             .filter(c => /[\u3000-\u9fff]/.test(c));
//           const allFound: KanjiItem[] = [];

//           for (const chunk of kanjiByLevel) {
//             if (token !== searchTokenRef.current) return;
//             if (seen.size >= 20) break;

//             const found = searchKanjiChunk(chunk, seen, searchChars);
//             allFound.push(...found);

//             if (found.length > 0) {
//               const chars = allFound.map(k => k.kanji);
//               // Lần đầu tìm thấy: dùng InteractionManager để chắc chắn
//               // chunk-yield animation đã xong mới render KanjiDetailInline
//               // Lần sau (streaming thêm): chỉ update chars, không re-open
//               const alreadyOpen = allFound.length > found.length;
//               if (alreadyOpen) {
//                 startTransition(() => {
//                   setCurrentKanjiResults(chars);
//                   setFoundKanjiChars(chars);
//                 });
//               } else {
//                 InteractionManager.runAfterInteractions(() => {
//                   startTransition(() => {
//                     setCurrentKanjiResults(chars);
//                     setFoundKanjiChars(chars);
//                     setKanjiModalVisible(true);
//                   });
//                 });
//               }
//             }

//             await yieldToUI();
//           }

//           if (token === searchTokenRef.current) setLoading(false);
//         };

//         // ── SENTENCE STREAM ─────────────────────────────────────────────────
//         const runSentenceStream = async () => {
//           if (targetTab !== 'sentence') return;
//           const seen = new Map<string, boolean>();
//           // KỸ THUẬT 9: Chunk lớn hơn để giảm số lần yield overhead ─────────
//           // 300 items/chunk là ngưỡng tốt: đủ nhanh để không cảm thấy
//           // nhưng không quá lớn để không block quá 1 frame (~16ms)
//           const CHUNK = 300;
//           let total = 0;

//           for (let i = 0; i < allSentences.length; i += CHUNK) {
//             if (token !== searchTokenRef.current) return;
//             if (total >= 30) break;

//             const slice = allSentences.slice(i, i + CHUNK);
//             const found: SearchResult[] = [];

//             for (const s of slice) {
//               if (!s?.jp) continue;
//               const match =
//                 s.jp.includes(targetQuery) ||
//                 normalizeString(s.vi || '').includes(nq);
//               if (match && !seen.has(s.jp)) {
//                 seen.set(s.jp, true);
//                 found.push({
//                   id: `sentence_${total + found.length}`,
//                   type: 'sentence',
//                   title: s.jp.length > 60 ? s.jp.slice(0, 60) + '...' : s.jp,
//                   subtitle:
//                     s.source === 'grammar'
//                       ? `📝 ${s.pattern || 'Ngữ pháp'}`
//                       : s.level
//                         ? `📚 ${s.level}`
//                         : '',
//                   description: s.vi,
//                   data: s,
//                 });
//                 if (total + found.length >= 30) break;
//               }
//             }

//             if (found.length > 0) {
//               total += found.length;
//               startTransition(() => {
//                 setResults(prev => [...prev, ...found]);
//               });
//             }

//             await yieldToUI();
//           }

//           if (token === searchTokenRef.current) setLoading(false);
//         };

//         // ── GRAMMAR STREAM ──────────────────────────────────────────────────
//         const runGrammarStream = async () => {
//           if (targetTab !== 'grammar') return;
//           const seen = new Map<string, boolean>();
//           const CHUNK = 100;
//           let total = 0;

//           for (let i = 0; i < allGrammar.length; i += CHUNK) {
//             if (token !== searchTokenRef.current) return;
//             if (total >= 30) break;

//             const slice = allGrammar.slice(i, i + CHUNK);
//             const found: SearchResult[] = [];

//             for (const g of slice) {
//               const match =
//                 g.pattern?.includes(targetQuery) ||
//                 normalizeString(g.phienAm || '').includes(nq) ||
//                 normalizeString(g.meaning || '').includes(nq);
//               if (match && !seen.has(g.pattern)) {
//                 seen.set(g.pattern, true);
//                 found.push({
//                   id: `grammar_${total + found.length}`,
//                   type: 'grammar',
//                   title: g.pattern,
//                   subtitle: g.phienAm || '',
//                   description: g.meaning,
//                   data: g,
//                 });
//                 if (total + found.length >= 30) break;
//               }
//             }

//             if (found.length > 0) {
//               total += found.length;
//               startTransition(() => {
//                 setResults(prev => [...prev, ...found]);
//               });
//             }

//             await yieldToUI();
//           }

//           if (token === searchTokenRef.current) setLoading(false);
//         };

//         // ── Khởi chạy luồng phù hợp ─────────────────────────────────────────
//         switch (targetTab) {
//           case 'vocab':    runVocabStream();    break;
//           case 'kanji':    runKanjiStream();    break;
//           case 'sentence': runSentenceStream(); break;
//           case 'grammar':  runGrammarStream();  break;
//         }
//       }); // end InteractionManager
//     },
//     // vocabByLevel / kanjiByLevel là cache được tính từ allVocab/allKanji
//     [vocabByLevel, kanjiByLevel, allGrammar, allSentences, startTransition]
//   );

//   // ── KỸ THUẬT 10: Auto-search khi debounced query thay đổi ────────────────
//   // Thay vì bắt buộc bấm nút, search tự động sau 350ms ngừng gõ
//   // Kết hợp với useTransition → gõ phím không bao giờ bị chặn
//   useEffect(() => {
//     if (debouncedQuery.trim()) {
//       executeSearchLogic(debouncedQuery, activeTab);
//     } else {
//       setResults([]);
//     }
//   }, [debouncedQuery, activeTab]);

//   // ── Handler không đổi so với bản gốc ────────────────────────────────────

//   const performSearch = () => {
//     executeSearchLogic(query, activeTab);
//   };

//   const handleTabChange = (tabId: SearchType) => {
//     setActiveTab(tabId);
//     setSelectedResult(null);
//     setHistoryKey(prev => prev + 1);
//     if (tabId !== 'kanji') {
//       setKanjiModalVisible(false);
//       setDrawModalVisible(false);
//     }
//     if (query.trim().length > 0) {
//       if (tabId === 'kanji') {
//         setResults([]);
//         setLoading(false);
//       } else {
//         executeSearchLogic(query, tabId);
//       }
//     } else {
//       setResults([]);
//     }
//   };

//   const handleSearchPress = (candidates?: any[]) => {
//     setDrawModalVisible(false);
//     if (drawModalRef.current) drawModalRef.current.clearCanvas();

//     if (candidates && candidates.length > 0) {
//       const seen = new Map<string, boolean>();
//       const chars: string[] = [];
//       for (const c of candidates) {
//         const k = c?.item?.kanji || c?.kanji || '';
//         if (k && !seen.has(k)) { seen.set(k, true); chars.push(k); }
//         if (chars.length >= 12) break;
//       }
//       if (chars.length > 0) {
//         // InteractionManager thay setTimeout(50): chờ đúng lúc UI sẵn sàng
//         InteractionManager.runAfterInteractions(() => {
//           startTransition(() => {
//             setCurrentKanjiResults(chars);
//             setFoundKanjiChars(chars);
//             setKanjiModalVisible(true);
//           });
//           saveToHistory(chars[0], 'kanji');
//           setHistoryKey(prev => prev + 1);
//         });
//         return;
//       }
//     }

//     if (!query.trim()) {
//       Alert.alert('Thông báo', 'Vui lòng nhập từ khóa tìm kiếm');
//       return;
//     }
//     performSearch();
//     saveToHistory(query, activeTab);
//     setHistoryKey(prev => prev + 1);
//   };

//   useEffect(() => {
//     let timer: ReturnType<typeof setTimeout>;
//     if (visible) {
//       setResults([]);
//       setLoading(false);
//       setKanjiModalVisible(false);
//       setSelectedResult(null);
//       setHistoryKey(prev => prev + 1);
//       if (autoOpenDrawer || initialTab === 'kanji') {
//         setActiveTab('kanji');
//         timer = setTimeout(() => {
//           setDrawModalVisible(true);
//           if (onDrawerOpened) onDrawerOpened();
//         }, 100);
//       } else if (initialTab) {
//         setActiveTab(initialTab);
//       }
//     } else {
//       setQuery('');
//       setResults([]);
//       setCurrentKanjiResults([]);
//       setDrawModalVisible(false);
//       setKanjiModalVisible(false);
//       setSelectedResult(null);
//       setLoading(false);
//       setActiveTab('vocab');
//     }
//     return () => { if (timer) clearTimeout(timer); };
//   }, [visible, autoOpenDrawer, initialTab]);

//   const openDrawKanjiModal = () => {
//     Keyboard.dismiss();
//     setActiveTab('kanji');
//     setDrawModalVisible(true);
//   };

//   const handleSelectKanji = (kanji: string) => {
//     const nextQuery = query + kanji;
//     setQuery(nextQuery);
//     if (drawModalRef.current) drawModalRef.current.clearCanvas();
//     setActiveTab('kanji');
//   };

//   const handleResultPress = (result: SearchResult) => {
//     Keyboard.dismiss();
//     if (result.type === 'kanji') {
//       const chars =
//         currentKanjiResults.length > 0 ? currentKanjiResults : [result.title];
//       // InteractionManager: chờ Keyboard.dismiss() animation xong mới render
//       // KanjiDetailInline — tránh 2 animation nặng chạy cùng lúc
//       InteractionManager.runAfterInteractions(() => {
//         startTransition(() => {
//           setFoundKanjiChars(chars);
//           setKanjiModalVisible(true);
//         });
//       });
//     } else {
//       // Vocab/sentence/grammar nhẹ hơn, dùng startTransition là đủ
//       startTransition(() => setSelectedResult(result));
//     }
//   };

//   // ── KỸ THUẬT 11: FlatList thay ScrollView + renderItem tối ưu ────────────
//   // FlatList chỉ render item nào đang visible trên màn hình (virtual list)
//   // ScrollView render TẤT CẢ items cùng lúc → lag khi có nhiều kết quả
//   const renderItem = useCallback(
//     ({ item }: { item: SearchResult }) => {
//       if (item.type === 'vocab') {
//         return (
//           <TouchableOpacity
//             style={styles.vocabResultCard}
//             onPress={() => handleResultPress(item)}
//             activeOpacity={0.7}
//           >
//             <Text style={styles.vocabResultChar}>{item.title}</Text>
//             <View style={styles.vocabResultInfo}>
//               <Text style={styles.vocabResultReading}>{item.subtitle}</Text>
//               <Text style={styles.vocabResultMeaning}>{item.description}</Text>
//             </View>
//             <Text style={styles.arrowIcon}>›</Text>
//           </TouchableOpacity>
//         );
//       }
//       if (item.type === 'kanji') {
//         return (
//           <TouchableOpacity
//             style={styles.resultCard}
//             onPress={() => handleResultPress(item)}
//             activeOpacity={0.7}
//           >
//             <Text style={[styles.resultTitle, { color: TEAL, fontSize: 24 }]}>
//               {item.title}
//             </Text>
//             <Text style={styles.resultSubtitle}>
//               Hán Việt: {item.subtitle}
//             </Text>
//             <Text style={styles.resultDesc} numberOfLines={2}>
//               Ý nghĩa: {item.description}
//             </Text>
//             <View style={[styles.resultTypeBadge, { backgroundColor: '#e0f2fe' }]}>
//               <Text style={styles.resultTypeText}>Hán tự</Text>
//             </View>
//             <Text style={styles.arrowIcon}>›</Text>
//           </TouchableOpacity>
//         );
//       }
//       return (
//         <TouchableOpacity
//           style={styles.resultCard}
//           onPress={() => handleResultPress(item)}
//           activeOpacity={0.7}
//         >
//           <Text style={styles.resultTitle} numberOfLines={2}>
//             {item.title}
//           </Text>
//           <Text style={styles.resultSubtitle}>{item.subtitle}</Text>
//           <Text style={styles.resultDesc} numberOfLines={2}>
//             {item.description}
//           </Text>
//           <View
//             style={[
//               styles.resultTypeBadge,
//               {
//                 backgroundColor:
//                   item.type === 'sentence' ? '#f0fdf4' : '#fef3c7',
//               },
//             ]}
//           >
//             <Text style={styles.resultTypeText}>
//               {item.type === 'sentence' ? 'Mẫu câu' : 'Ngữ pháp'}
//             </Text>
//           </View>
//           <Text style={styles.arrowIcon}>›</Text>
//         </TouchableOpacity>
//       );
//     },
//     [currentKanjiResults] // chỉ re-create khi kanjiResults đổi
//   );

//   // keyExtractor ổn định để FlatList không re-render toàn bộ
//   const keyExtractor = useCallback((item: SearchResult) => item.id, []);

//   if (!visible) return null;

//   // Dùng deferredResults (phiên bản "trễ") để render list
//   // Khi search đang chạy, React giữ list cũ thay vì flash trắng
//   const displayResults = deferredResults;
//   const isStale = results !== deferredResults; // true khi đang transition

//   return (
//     <Modal
//       visible={visible}
//       animationType="slide"
//       transparent={false}
//       presentationStyle="overFullScreen"
//       onRequestClose={onClose}
//     >
//       <StatusBar barStyle="light-content" backgroundColor={TEAL} />

//       <View style={styles.container}>
//         {/* Loading: chỉ hiện khi thực sự đang tải (không hiện khi transition) */}
//         {loading && !isPending && (
//           <View style={styles.absoluteLoadingOverlay}>
//             <View style={styles.loadingBox}>
//               <ActivityIndicator size="large" color="#fff" />
//               <Text style={styles.loadingBoxText}>Đang xử lý...</Text>
//             </View>
//           </View>
//         )}

//         {/* Indicator nhỏ khi đang transition (không block UI) */}
//         {isPending && (
//           <View style={styles.transitionIndicator}>
//             <ActivityIndicator size="small" color={TEAL} />
//           </View>
//         )}

//         <LinearGradient
//           colors={[TEAL, TEAL_DARK]}
//           start={{ x: 0, y: 0 }}
//           end={{ x: 0, y: 1 }}
//         >
//           <View style={styles.header}>
//             <TouchableOpacity onPress={onClose} style={styles.backBtn}>
//               <Text style={styles.backIcon}>←</Text>
//             </TouchableOpacity>
//             <View style={styles.searchContainer}>
//               <TouchableOpacity
//                 onPress={() => handleSearchPress()}
//                 style={styles.searchIconBtn}
//               >
//                 <Text style={styles.searchIconText}>🔍</Text>
//               </TouchableOpacity>
//               <TextInput
//                 ref={inputRef}
//                 style={styles.searchInput}
//                 placeholder="Tìm kiếm từ vựng, kanji, mẫu câu, ngữ pháp..."
//                 placeholderTextColor="#94a3b8"
//                 value={query}
//                 onChangeText={text => {
//                   setQuery(text); // update ngay (không debounce input)
//                   if (!text.trim()) {
//                     setResults([]);
//                     setLoading(false);
//                   }
//                   // Auto-search chạy qua debouncedQuery (350ms sau)
//                 }}
//                 returnKeyType="search"
//                 onSubmitEditing={() => handleSearchPress()}
//                 autoFocus={false}
//                 onFocus={() => {
//                   if (drawModalVisible) setDrawModalVisible(false);
//                 }}
//               />
//               <TouchableOpacity
//                 onPress={openDrawKanjiModal}
//                 style={styles.drawKanjiBtn}
//               >
//                 <Text style={styles.drawKanjiIcon}>✏️</Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//         </LinearGradient>

//         <View style={styles.tabBar}>
//           {[
//             { id: 'vocab', label: 'Từ vựng', icon: '📖' },
//             { id: 'kanji', label: 'Hán tự', icon: '🈳' },
//             { id: 'sentence', label: 'Mẫu câu', icon: '💬' },
//             { id: 'grammar', label: 'Ngữ pháp', icon: '📝' },
//           ].map(tab => (
//             <TouchableOpacity
//               key={tab.id}
//               style={[
//                 styles.tabBtn,
//                 activeTab === tab.id && styles.tabBtnActive,
//               ]}
//               onPress={() => handleTabChange(tab.id as SearchType)}
//               activeOpacity={0.7}
//             >
//               <Text
//                 style={[
//                   styles.tabIcon,
//                   activeTab === tab.id && styles.tabIconActive,
//                 ]}
//               >
//                 {tab.icon}
//               </Text>
//               <Text
//                 style={[
//                   styles.tabLabel,
//                   activeTab === tab.id && styles.tabLabelActive,
//                 ]}
//               >
//                 {tab.label}
//               </Text>
//             </TouchableOpacity>
//           ))}
//         </View>

//         <View style={{ flex: 1 }}>
//           {activeTab === 'kanji' &&
//           kanjiModalVisible &&
//           foundKanjiChars.length > 0 ? (
//             <KanjiDetailInline
//               kanjiChars={foundKanjiChars}
//               initialIndex={0}
//               onClose={() => setKanjiModalVisible(false)}
//             />
//           ) : selectedResult ? (
//             selectedResult.type === 'vocab' ? (
//               <VocabDetailInline
//                 kanji={selectedResult.title}
//                 hiragana={selectedResult.subtitle}
//                 nghia={selectedResult.description}
//                 han={selectedResult.data?.han || ''}
//                 level={selectedResult.data?.level || 'N3'}
//                 example={selectedResult.data?.example || ''}
//                 exampleMeaning={selectedResult.data?.exampleMeaning || ''}
//                 id={selectedResult.data?.kanji || selectedResult.title}
//                 onClose={() => setSelectedResult(null)}
//               />
//             ) : selectedResult.type === 'sentence' ? (
//               <SentenceDetailInline
//                 jp={selectedResult.data?.jp || selectedResult.title}
//                 vi={selectedResult.description}
//                 pattern={selectedResult.data?.pattern}
//                 level={selectedResult.data?.level}
//                 note={selectedResult.data?.note}
//                 onClose={() => setSelectedResult(null)}
//               />
//             ) : (
//               <GrammarDetailInline
//                 id={selectedResult.data?.id}
//                 pattern={selectedResult.title}
//                 reading={selectedResult.subtitle}
//                 meaning={selectedResult.description}
//                 structure={selectedResult.data?.structure}
//                 note={selectedResult.data?.note}
//                 level={selectedResult.data?.level}
//                 examples={selectedResult.data?.examples || []}
//                 onClose={() => setSelectedResult(null)}
//               />
//             )
//           ) : (
//             <>
//               {query.length === 0 ? (
//                 // Dùng ScrollView cho trang history/suggestions (ít item, không cần virtual)
//                 <FlatList
//                   data={[]}
//                   renderItem={null}
//                   ListHeaderComponent={
//                     <>
//                       <SearchSuggestions
//                         activeTab={activeTab}
//                         onSelectSuggestion={(text, tab) => {
//                           setQuery(text);
//                           setActiveTab(tab);
//                           executeSearchLogic(text, tab);
//                         }}
//                         visible={query.length === 0}
//                       />
//                       <SearchHistory
//                         key={historyKey}
//                         ref={historyRef}
//                         onSelectHistory={text => {
//                           setQuery(text);
//                           executeSearchLogic(text, activeTab);
//                         }}
//                         type={activeTab === 'kanji' ? 'vocab' : activeTab}
//                       />
//                       <View style={{ height: 30 }} />
//                     </>
//                   }
//                   keyboardShouldPersistTaps="handled"
//                 />
//               ) : displayResults.length === 0 && !loading ? (
//                 <View style={styles.emptyContainer}>
//                   <Text style={styles.emptyEmoji}>✏️</Text>
//                   <Text style={styles.emptyTitle}>
//                     {debouncedQuery.trim()
//                       ? 'Không tìm thấy kết quả'
//                       : 'Nhấn nút kính lúp để bắt đầu tìm kiếm'}
//                   </Text>
//                   <Text style={styles.emptySub}>Thử tìm với từ khóa khác</Text>
//                 </View>
//               ) : (
//                 // KỸ THUẬT 11: FlatList với các tối ưu quan trọng
//                 <FlatList
//                   data={displayResults}
//                   renderItem={renderItem}
//                   keyExtractor={keyExtractor}
//                   // windowSize=5: chỉ render 5 màn hình (trên+dưới viewport)
//                   windowSize={5}
//                   // maxToRenderPerBatch=8: mỗi batch render tối đa 8 item
//                   maxToRenderPerBatch={8}
//                   // initialNumToRender=10: render 10 item đầu ngay lập tức
//                   initialNumToRender={10}
//                   // removeClippedSubviews: unmount item ngoài viewport
//                   removeClippedSubviews={true}
//                   keyboardShouldPersistTaps="handled"
//                   contentContainerStyle={{
//                     paddingTop: 8,
//                     paddingHorizontal: 16,
//                     paddingBottom: 20,
//                     // Mờ nhẹ khi đang transition để báo hiệu đang refresh
//                     opacity: isStale ? 0.7 : 1,
//                   }}
//                   showsVerticalScrollIndicator={false}
//                 />
//               )}
//             </>
//           )}
//         </View>

//         {drawModalVisible && (
//           <KanjiDrawSearchModal
//             visible={drawModalVisible}
//             onClose={() => setDrawModalVisible(false)}
//             ref={drawModalRef}
//             onSearchPress={handleSearchPress}
//             onSelectKanji={handleSelectKanji}
//           />
//         )}
//       </View>
//     </Modal>
//   );
// }

// // ─── STYLES (giữ nguyên từ bản gốc, chỉ thêm transitionIndicator) ─────────
// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: BG_GRAY },
//   absoluteLoadingOverlay: {
//     ...StyleSheet.absoluteFillObject,
//     backgroundColor: 'rgba(0,0,0,0.35)',
//     zIndex: 100,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   loadingBox: {
//     backgroundColor: TEAL_DARK,
//     borderRadius: 16,
//     padding: 24,
//     alignItems: 'center',
//     gap: 12,
//   },
//   loadingBoxText: { color: '#fff', fontSize: 15, fontWeight: '600' },
//   // Indicator nhỏ ở góc — không che UI khi transition
//   transitionIndicator: {
//     position: 'absolute',
//     top: 8,
//     right: 12,
//     zIndex: 99,
//   },
//   header: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingTop: 48,
//     paddingBottom: 12,
//     paddingHorizontal: 12,
//     gap: 8,
//   },
//   backBtn: { padding: 8 },
//   backIcon: { color: '#fff', fontSize: 22, fontWeight: '700' },
//   searchContainer: {
//     flex: 1,
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#fff',
//     borderRadius: 12,
//     paddingHorizontal: 8,
//   },
//   searchIconBtn: { padding: 6 },
//   searchIconText: { fontSize: 18 },
//   searchInput: {
//     flex: 1,
//     fontSize: 15,
//     color: '#1e293b',
//     paddingVertical: 10,
//     paddingHorizontal: 4,
//   },
//   drawKanjiBtn: { padding: 6 },
//   drawKanjiIcon: { fontSize: 18 },
//   tabBar: {
//     flexDirection: 'row',
//     backgroundColor: '#fff',
//     borderBottomWidth: 1,
//     borderBottomColor: '#e2e8f0',
//   },
//   tabBtn: {
//     flex: 1,
//     alignItems: 'center',
//     paddingVertical: 10,
//     gap: 2,
//   },
//   tabBtnActive: { borderBottomWidth: 2, borderBottomColor: TEAL },
//   tabIcon: { fontSize: 18 },
//   tabIconActive: {},
//   tabLabel: { fontSize: 11, color: '#64748b' },
//   tabLabelActive: { color: TEAL, fontWeight: '700' },
//   vocabResultCard: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#fff',
//     borderRadius: 12,
//     padding: 14,
//     marginBottom: 8,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.06,
//     shadowRadius: 4,
//     elevation: 2,
//   },
//   vocabResultChar: {
//     fontSize: 22,
//     fontWeight: '700',
//     color: TEAL,
//     minWidth: 44,
//   },
//   vocabResultInfo: { flex: 1, marginHorizontal: 10 },
//   vocabResultReading: { fontSize: 14, color: '#475569' },
//   vocabResultMeaning: { fontSize: 13, color: '#64748b', marginTop: 2 },
//   resultCard: {
//     backgroundColor: '#fff',
//     borderRadius: 12,
//     padding: 14,
//     marginBottom: 8,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.06,
//     shadowRadius: 4,
//     elevation: 2,
//   },
//   resultTitle: { fontSize: 17, fontWeight: '700', color: '#1e293b' },
//   resultSubtitle: { fontSize: 13, color: '#64748b', marginTop: 3 },
//   resultDesc: { fontSize: 13, color: '#475569', marginTop: 4 },
//   resultTypeBadge: {
//     alignSelf: 'flex-start',
//     borderRadius: 6,
//     paddingHorizontal: 8,
//     paddingVertical: 2,
//     marginTop: 6,
//   },
//   resultTypeText: { fontSize: 11, color: '#334155', fontWeight: '600' },
//   arrowIcon: { fontSize: 20, color: '#94a3b8', marginLeft: 6 },
//   emptyContainer: {
//     flex: 1,
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingTop: 60,
//   },
//   emptyEmoji: { fontSize: 40, marginBottom: 12 },
//   emptyTitle: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#475569',
//     textAlign: 'center',
//   },
//   emptySub: { fontSize: 13, color: '#94a3b8', marginTop: 6 },
// });




// // components/SearchModal.tsx gg
// // import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
// // import {
// //   Modal,
// //   View,
// //   Text,
// //   StyleSheet,
// //   TextInput,
// //   TouchableOpacity,
// //   ScrollView,
// //   StatusBar,
// //   Keyboard,
// //   ActivityIndicator,
// //   Alert,
// //   Dimensions,
// //   InteractionManager,
// // } from 'react-native';
// // import { LinearGradient } from 'expo-linear-gradient';
// // import { useRouter } from 'expo-router';
// // import { getVocab } from '../assets/vocab';
// // import { getKanji, type KanjiItem } from '../assets/data_JLPT_kanji';
// // import { getGrammar } from '../assets/data_nn';
// // import { EXAMPLE_SENTENCES } from '../assets/sentences'; 
// // import KanjiDetailInline from './KanjiDetailInline'; 
// // import KanjiDrawSearchModal from './KanjiDrawSearchModal';
// // import VocabDetailInline from './VocabDetailInline';
// // import GrammarDetailInline from './GrammarDetailInline';
// // import SentenceDetailInline from './SentenceDetailInline';
// // import { SearchHistory, SearchHistoryRef } from './SearchHistory';
// // import AsyncStorage from '@react-native-async-storage/async-storage';
// // import { useAuth } from '../artifacts/mirai-jp/hooks/useAuth';
// // import SearchSuggestions from './SearchSuggestions';

// // const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
// // const TEAL = "#1F6F7A";
// // const TEAL_DARK = "#0B3540";
// // const BG_GRAY = "#f0f4f8";

// // type SearchType = 'vocab' | 'kanji' | 'sentence' | 'grammar'; 

// // interface SearchResult {
// //   id: string;
// //   type: SearchType;
// //   title: string;
// //   subtitle: string;
// //   description: string;
// //   data?: any;
// // }

// // interface SearchModalProps {
// //   visible: boolean;
// //   onClose: () => void;
// //   autoOpenDrawer?: boolean;  
// //   onDrawerOpened?: () => void;
// //   initialTab?: SearchType;
// // }

// // function normalizeString(s: string) {
// //   if (!s || typeof s !== 'string') return '';
// //   return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
// // }

// // function hiraganaToRomaji(hiragana: string): string {
// //   const hiraToRomajiMap: Record<string, string> = {
// //     'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o',
// //     'か': 'ka', 'き': 'ki', 'く': 'ku', 'け': 'ke', 'こ': 'ko',
// //     'さ': 'sa', 'し': 'shi', 'す': 'su', 'せ': 'se', 'そ': 'so',
// //     'た': 'ta', 'ち': 'chi', 'つ': 'tsu', 'て': 'te', 'と': 'to',
// //     'な': 'na', 'に': 'ni', 'ぬ': 'nu', 'ね': 'ne', ' của': 'no', 'の': 'no',
// //     'は': 'ha', 'ひ': 'bi', 'ふ': 'fu', 'へ': 'he', 'ほ': 'ho',
// //     'ま': 'ma', 'み': 'mi', 'む': 'mu', 'め': 'me', 'も': 'mo',
// //     'や': 'ya', 'ゆ': 'yu', 'よ': 'yo',
// //     'ら': 'ra', 'り': 'ri', 'る': 'ru', 'れ': 're', 'ろ': 'ro',
// //     'わ': 'wa', 'を': 'wo', 'ん': 'n',
// //     'が': 'ga', 'ぎ': 'gi', 'ぐ': 'gu', 'げ': 'ge', 'ご': 'go',
// //     'ざ': 'za', 'じ': 'ji', 'ず': 'zu', 'ぜ': 'ze', 'ぞ': 'zo',
// //     'だ': 'da', 'ぢ': 'ji', 'づ': 'zu', 'で': 'de', 'ど': 'do',
// //     'ば': 'ba', 'び': 'bi', 'ぶ': 'bu', 'べ': 'be', 'ぼ': 'bo',
// //     'ぱ': 'pa', 'ぴ': 'pi', 'ぷ': 'pu', 'ぺ': 'pe', 'ぽ': 'po',
// //   };
// //   let result = '';
// //   let i = 0;
// //   while (i < hiragana.length) {
// //     const twoChars = hiragana.slice(i, i + 2);
// //     if (hiraToRomajiMap[twoChars]) {
// //       result += hiraToRomajiMap[twoChars];
// //       i += 2;
// //     } else {
// //       const oneChar = hiragana.slice(i, i + 1);
// //       result += hiraToRomajiMap[oneChar] || oneChar;
// //       i += 1;
// //     }
// //   }
// //   return result;
// // }

// // export default function SearchModal({ 
// //   visible, 
// //   onClose, 
// //   autoOpenDrawer = false, 
// //   onDrawerOpened, 
// //   initialTab 
// // }: SearchModalProps) {
// //   const [query, setQuery] = useState('');
// //   const [results, setResults] = useState<SearchResult[]>([]);
// //   const [loading, setLoading] = useState(false);
// //   const [activeTab, setActiveTab] = useState<SearchType>('vocab');
// //   const inputRef = useRef<TextInput>(null);
// //   const [drawModalVisible, setDrawModalVisible] = useState(false);
  
// //   const [kanjiModalVisible, setKanjiModalVisible] = useState(false);
// //   const [foundKanjiChars, setFoundKanjiChars] = useState<string[]>([]);
// //   const [currentKanjiResults, setCurrentKanjiResults] = useState<string[]>([]);

// //   const { scopedKey, currentUser } = useAuth();
// //   const historyRef = useRef<SearchHistoryRef>(null);
// //   const drawModalRef = useRef<any>(null);
// //   const [historyKey, setHistoryKey] = useState(0);
// //   const [drawModalHeight, setDrawModalHeight] = useState(0);
// //   const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);

// //   const allVocab = useMemo(() => getVocab(), []);
// //   const allKanji = useMemo(() => getKanji(), []);
// //   const allGrammar = useMemo(() => getGrammar(), []);
// //   const allSentences = useMemo(() => EXAMPLE_SENTENCES, []);

// //   const saveToHistory = async (text: string, tab: SearchType) => {
// //     if (!currentUser || !text.trim()) return;
// //     const histType = (tab === 'kanji') ? 'vocab' : tab;
// //     const key = scopedKey(`search_history_${histType}`);
// //     try {
// //       const raw = await AsyncStorage.getItem(key);
// //       let items = raw ? JSON.parse(raw) : [];
// //       items = items.filter((i: any) => i.text !== text.trim());
// //       items.unshift({ id: Date.now().toString(), text: text.trim(), timestamp: Date.now(), type: histType });
// //       if (items.length > 20) items = items.slice(0, 20);
// //       await AsyncStorage.setItem(key, JSON.stringify(items));
// //     } catch (e) {}
// //   };

// //   // 🔄 KHẮC PHỤC LAG BẰNG UX FLOW MỚI: Hiện Loading trước, giữ nguyên trang, tính toán sau
// //   const executeSearchLogic = useCallback((targetQuery: string, targetTab: SearchType) => {
// //     setSelectedResult(null);
// //     setKanjiModalVisible(false);

// //     if (!targetQuery.trim()) {
// //       setResults([]);
// //       setLoading(false);
// //       return;
// //     }

// //     // Bước 1: Bật ngay vòng xoay loading để UI phản hồi lập tức, tránh bị đơ
// //     setLoading(true);

// //     // Bước 2: Dùng một khoảng hoãn siêu nhỏ (80ms) để UI thread kịp vẽ vòng xoay mượt mà, sau đó mới tính toán dữ liệu
// //     setTimeout(() => {
// //       InteractionManager.runAfterInteractions(() => {
// //         const normalizedQuery = normalizeString(targetQuery);
// //         const searchResults: SearchResult[] = [];
// //         const lowerQuery = targetQuery.toLowerCase();
// //         const uniqueItemsMap = new Map<string, any>();

// //         if (targetTab === 'vocab') {
// //           const isEnglishOrRomaji = /[a-zA-Z]/.test(targetQuery);
// //           for (let i = 0; i < allVocab.length; i++) {
// //             const v = allVocab[i];
// //             const hiraText = v.hiragana || v.hira || '';
// //             const romajiText = isEnglishOrRomaji ? hiraganaToRomaji(hiraText) : '';

// //             const isMatch = v.kanji?.includes(targetQuery) ||
// //                             hiraText.includes(targetQuery) ||
// //                             romajiText.includes(lowerQuery) ||
// //                             v.han?.toLowerCase().includes(normalizedQuery) ||
// //                             (v.nghia && normalizeString(v.nghia).includes(normalizedQuery));

// //             if (isMatch && v.kanji) {
// //               if (!uniqueItemsMap.has(v.kanji)) {
// //                 uniqueItemsMap.set(v.kanji, v);
// //                 if (uniqueItemsMap.size >= 20) break; 
// //               }
// //             }
// //           }
          
// //           const mappedResults = Array.from(uniqueItemsMap.values()).map((v, idx) => ({
// //             id: `vocab_${idx}`,
// //             type: 'vocab' as SearchType,
// //             title: v.kanji || '',
// //             subtitle: v.hiragana || v.hira || '',  
// //             description: v.nghia || '',
// //             data: v,
// //           }));
// //           searchResults.push(...mappedResults);
// //         }
// //         else if (targetTab === 'kanji') {
// //           let kanjiResults: KanjiItem[] = [];
// //           const isVietnamese = /[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠƯàáâãèéêìíòóôõùúăđĩũơư\s]/i.test(targetQuery);
          
// //           if (isVietnamese) {
// //             for (let i = 0; i < allKanji.length; i++) {
// //               const k = allKanji[i];
// //               if (k.hanViet?.toLowerCase().includes(normalizedQuery) || 
// //                   k.meanings?.some(m => m.toLowerCase().includes(normalizedQuery))) {
// //                 if (!uniqueItemsMap.has(k.kanji)) {
// //                   uniqueItemsMap.set(k.kanji, k);
// //                   kanjiResults.push(k);
// //                   if (kanjiResults.length >= 20) break;
// //                 }
// //               }
// //             }
// //           } else {
// //             const searchChars = targetQuery.split('');
// //             for (let i = 0; i < allKanji.length; i++) {
// //               const k = allKanji[i];
// //               if (searchChars.includes(k.kanji)) {
// //                 if (!uniqueItemsMap.has(k.kanji)) {
// //                   uniqueItemsMap.set(k.kanji, k);
// //                   kanjiResults.push(k);
// //                   if (kanjiResults.length >= 20) break;
// //                 }
// //               }
// //             }
// //           }
          
// //           if (kanjiResults.length > 0) {
// //             const allTitles = kanjiResults.map(k => k.kanji);
// //             setCurrentKanjiResults(allTitles);
// //             setFoundKanjiChars(allTitles);
// //             setKanjiModalVisible(true);
// //           }
// //         }
// //         else if (targetTab === 'sentence') {
// //           for (let i = 0; i < allSentences.length; i++) {
// //             const s = allSentences[i];
// //             if (s && s.jp && s.jp.includes(targetQuery)) {
// //               if (!uniqueItemsMap.has(s.jp)) {
// //                 uniqueItemsMap.set(s.jp, true);
// //                 let subtitle = s.source === 'grammar' ? `📝 ${s.pattern || 'Ngữ pháp'}` : (s.level ? `📚 ${s.level}` : '');
// //                 searchResults.push({
// //                   id: `sentence_${searchResults.length}`,
// //                   type: 'sentence',
// //                   title: s.jp.length > 60 ? s.jp.slice(0, 60) + '...' : s.jp,
// //                   subtitle: subtitle,
// //                   description: s.vi,
// //                   data: s,
// //                 });
// //                 if (searchResults.length >= 30) break; 
// //               }
// //             }
// //           }
// //         }
// //         else if (targetTab === 'grammar') {
// //           for (let i = 0; i < allGrammar.length; i++) {
// //             const g = allGrammar[i];
// //             if (g.pattern?.includes(targetQuery) || 
// //                 g.phienAm?.toLowerCase().includes(normalizedQuery) || 
// //                 g.meaning?.toLowerCase().includes(normalizedQuery)) {
// //               if (!uniqueItemsMap.has(g.pattern)) {
// //                 uniqueItemsMap.set(g.pattern, true);
// //                 searchResults.push({
// //                   id: `grammar_${searchResults.length}`,
// //                   type: 'grammar',
// //                   title: g.pattern,
// //                   subtitle: g.phienAm || '',
// //                   description: g.meaning,
// //                   data: g,
// //                 });
// //                 if (searchResults.length >= 30) break;
// //               }
// //             }
// //           }
// //         }

// //         // Bước 3: Cập nhật kết quả lên màn hình và tắt loading cùng một lúc
// //         setResults(searchResults);
// //         setLoading(false);
// //       });
// //     }, 80);
// //   }, [allVocab, allKanji, allGrammar, allSentences]);

// //   const performSearch = () => {
// //     executeSearchLogic(query, activeTab);
// //   };

// //   const handleTabChange = (tabId: SearchType) => {
// //     setActiveTab(tabId);
// //     setSelectedResult(null);
// //     setHistoryKey(prev => prev + 1);

// //     if (tabId !== 'kanji') {
// //       setKanjiModalVisible(false);
// //       setDrawModalVisible(false);  
// //     }

// //     if (query.trim().length > 0) {
// //       if (tabId === 'kanji') {
// //         setResults([]);
// //         setLoading(false);
// //       } else {
// //         executeSearchLogic(query, tabId);
// //       }
// //     } else {
// //       setResults([]);
// //     }
// //   };

// //   const handleSearchPress = () => {
// //     if (!query.trim()) {
// //       Alert.alert('Thông báo', 'Vui lòng nhập từ khóa tìm kiếm');
// //       return;
// //     }
// //     setDrawModalVisible(false);
// //     if (drawModalRef.current) {
// //       drawModalRef.current.clearCanvas();
// //     }
// //     performSearch();
// //     saveToHistory(query, activeTab);
// //     setHistoryKey(prev => prev + 1);
// //   };

// //   useEffect(() => {
// //     let timer: ReturnType<typeof setTimeout>;
// //     if (visible) {
// //       setResults([]);
// //       setLoading(false);
// //       setKanjiModalVisible(false);
// //       setSelectedResult(null);
// //       setHistoryKey(prev => prev + 1);
// //       if (autoOpenDrawer || initialTab === 'kanji') {
// //         setActiveTab('kanji');
// //         timer = setTimeout(() => {
// //           setDrawModalVisible(true);
// //           if (onDrawerOpened) onDrawerOpened();
// //         }, 100); 
// //       } else if (initialTab) {
// //         setActiveTab(initialTab);
// //       }
// //     } else {
// //       setQuery('');
// //       setResults([]);
// //       setCurrentKanjiResults([]);
// //       setDrawModalVisible(false); 
// //       setKanjiModalVisible(false);
// //       setSelectedResult(null);
// //       setLoading(false);
// //       setActiveTab('vocab');
// //     }
// //     return () => {
// //       if (timer) clearTimeout(timer);
// //     };
// //   }, [visible, autoOpenDrawer, initialTab]);

// //   const openDrawKanjiModal = () => {
// //     Keyboard.dismiss();
// //     setActiveTab('kanji');
// //     setDrawModalVisible(true);
// //   };

// //   const handleSelectKanji = (kanji: string, kanjiData?: any) => {
// //     const nextQuery = query + kanji;
// //     setQuery(nextQuery);
// //     if (drawModalRef.current) {
// //       drawModalRef.current.clearCanvas(); 
// //     }
// //     setActiveTab('kanji');
// //   };

// //   const handleResultPress = (result: SearchResult) => {
// //     Keyboard.dismiss();
// //     if (result.type === 'kanji') {
// //       if (currentKanjiResults.length > 0) {
// //         setFoundKanjiChars(currentKanjiResults);
// //       } else {
// //         setFoundKanjiChars([result.title]);
// //       }
// //       setKanjiModalVisible(true);
// //     } else {
// //       setSelectedResult(result);
// //     }
// //   };

// //   if (!visible) return null;

// //   return (
// //     <Modal
// //       visible={visible}
// //       animationType="slide"
// //       transparent={false}
// //       presentationStyle="overFullScreen"
// //       onRequestClose={onClose}
// //     >
// //       <StatusBar barStyle="light-content" backgroundColor={TEAL} />
      
// //       <View style={styles.container}>
// //         {/* LỚP PHỦ LOADING BẢO VỆ GIAO DIỆN CHỐNG LAG: Khi loading = true, trang hiện tại giữ nguyên và hiện 1 vòng xoay nhỏ mượt mà ở giữa màn hình */}
// //         {loading && (
// //           <View style={styles.absoluteLoadingOverlay}>
// //             <View style={styles.loadingBox}>
// //               <ActivityIndicator size="large" color="#fff" />
// //               <Text style={styles.loadingBoxText}>Đang xử lý...</Text>
// //             </View>
// //           </View>
// //         )}

// //         <LinearGradient colors={[TEAL, TEAL_DARK]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
// //           <View style={styles.header}>
// //             <TouchableOpacity onPress={onClose} style={styles.backBtn}>
// //               <Text style={styles.backIcon}>←</Text>
// //             </TouchableOpacity>
// //             <View style={styles.searchContainer}>
// //               <TouchableOpacity onPress={handleSearchPress} style={styles.searchIconBtn}>
// //                 <Text style={styles.searchIconText}>🔍</Text>
// //               </TouchableOpacity>
// //               <TextInput
// //                 ref={inputRef}
// //                 style={styles.searchInput}
// //                 placeholder="Tìm kiếm từ vựng, kanji, mẫu câu, ngữ pháp..."
// //                 placeholderTextColor="#94a3b8"
// //                 value={query}
// //                 onChangeText={(text) => {
// //                   setQuery(text);
// //                   if (!text.trim()) setResults([]);
// //                 }}
// //                 returnKeyType="search"
// //                 onSubmitEditing={handleSearchPress}  
// //                 autoFocus={false}
// //                 onFocus={() => {
// //                   if (drawModalVisible) setDrawModalVisible(false);
// //                 }}
// //               />
// //               <TouchableOpacity onPress={openDrawKanjiModal} style={styles.drawKanjiBtn}>
// //                 <Text style={styles.drawKanjiIcon}>✏️</Text>
// //               </TouchableOpacity>
// //             </View>
// //           </View>
// //         </LinearGradient>

// //         <View style={styles.tabBar}>
// //           {[
// //             { id: 'vocab', label: 'Từ vựng', icon: '📖' },
// //             { id: 'kanji', label: 'Hán tự', icon: '🈳' },
// //             { id: 'sentence', label: 'Mẫu câu', icon: '💬' },
// //             { id: 'grammar', label: 'Ngữ pháp', icon: '📝' },
// //           ].map((tab) => (
// //             <TouchableOpacity
// //               key={tab.id}
// //               style={[styles.tabBtn, activeTab === tab.id && styles.tabBtnActive]}
// //               onPress={() => handleTabChange(tab.id as SearchType)}
// //               activeOpacity={0.7}
// //             >
// //               <Text style={[styles.tabIcon, activeTab === tab.id && styles.tabIconActive]}>
// //                 {tab.icon}
// //               </Text>
// //               <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>
// //                 {tab.label}
// //               </Text>
// //             </TouchableOpacity>
// //           ))}
// //         </View>

// //         <View style={{ flex: 1 }}>
// //           {activeTab === 'kanji' && kanjiModalVisible && foundKanjiChars.length > 0 ? (
// //             <KanjiDetailInline
// //               kanjiChars={foundKanjiChars}
// //               initialIndex={0}
// //               onClose={() => setKanjiModalVisible(false)}
// //             />
// //           ) : selectedResult ? (
// //             selectedResult.type === 'vocab' ? (
// //               <VocabDetailInline
// //                 kanji={selectedResult.title}
// //                 hiragana={selectedResult.subtitle}
// //                 nghia={selectedResult.description}
// //                 han={selectedResult.data?.han || ''}
// //                 level={selectedResult.data?.level || 'N3'}
// //                 example={selectedResult.data?.example || ''}
// //                 exampleMeaning={selectedResult.data?.exampleMeaning || ''}
// //                 id={selectedResult.data?.kanji || selectedResult.title}
// //                 onClose={() => setSelectedResult(null)}
// //               />
// //             ) : selectedResult.type === 'sentence' ? (
// //               <SentenceDetailInline
// //                 jp={selectedResult.data?.jp || selectedResult.title}
// //                 vi={selectedResult.description}
// //                 pattern={selectedResult.data?.pattern}
// //                 level={selectedResult.data?.level}
// //                 note={selectedResult.data?.note}
// //                 onClose={() => setSelectedResult(null)}
// //               />
// //             ) : (
// //               <GrammarDetailInline
// //                 id={selectedResult.data?.id}
// //                 pattern={selectedResult.title}
// //                 reading={selectedResult.subtitle}
// //                 meaning={selectedResult.description}
// //                 structure={selectedResult.data?.structure}
// //                 note={selectedResult.data?.note}
// //                 level={selectedResult.data?.level}
// //                 examples={selectedResult.data?.examples || []}
// //                 onClose={() => setSelectedResult(null)}
// //               />
// //             )
// //           ) : (
// //             <ScrollView 
// //               style={{ flex: 1 }}
// //               contentContainerStyle={{ 
// //                 flexGrow: 1, 
// //                 paddingTop: 8, 
// //                 paddingHorizontal: 16, 
// //                 paddingBottom: drawModalVisible && results.length === 0 ? drawModalHeight + 8 : 20 
// //               }}
// //               showsVerticalScrollIndicator={false}
// //               keyboardShouldPersistTaps="handled"
// //             >
// //               {query.length === 0 ? (
// //                 <>
// //                   <SearchSuggestions
// //                     activeTab={activeTab}
// //                     onSelectSuggestion={(text, tab) => {
// //                       setQuery(text);
// //                       setActiveTab(tab);
// //                       executeSearchLogic(text, tab);
// //                     }}
// //                     visible={query.length === 0}
// //                   />
// //                   <SearchHistory
// //                     key={historyKey}
// //                     ref={historyRef}
// //                     onSelectHistory={(text) => {
// //                       setQuery(text);
// //                       executeSearchLogic(text, activeTab);
// //                     }}
// //                     type={activeTab === 'kanji' ? 'vocab' : activeTab}
// //                   />
// //                   <View style={{ height: 30 }} />
// //                 </>
// //               ) : results.length === 0 && !loading ? (
// //                 <View style={styles.emptyContainer}>
// //                   <Text style={styles.emptyEmoji}>✏️</Text>
// //                   <Text style={styles.emptyTitle}>Nhấn nút kính lúp để bắt đầu tìm kiếm</Text>
// //                   <Text style={styles.emptySub}>Thử tìm với từ khóa khác</Text>
// //                 </View>
// //               ) : (
// //                 results.map((item) => {
// //                   if (item.type === 'vocab') {
// //                     return (
// //                       <TouchableOpacity
// //                         key={item.id}
// //                         style={styles.vocabResultCard}
// //                         onPress={() => handleResultPress(item)}
// //                         activeOpacity={0.7}
// //                       >
// //                         <Text style={styles.vocabResultChar}>{item.title}</Text>
// //                         <View style={styles.vocabResultInfo}>
// //                           <Text style={styles.vocabResultReading}>{item.subtitle}</Text>
// //                           <Text style={styles.vocabResultMeaning}>{item.description}</Text>
// //                         </View>
// //                         <Text style={styles.arrowIcon}>›</Text>
// //                       </TouchableOpacity>
// //                     );
// //                   }
// //                   if (item.type === 'kanji') {
// //                     return (
// //                       <TouchableOpacity
// //                         key={item.id}
// //                         style={styles.resultCard}
// //                         onPress={() => handleResultPress(item)}
// //                         activeOpacity={0.7}
// //                       >
// //                         <Text style={[styles.resultTitle, { color: TEAL, fontSize: 24 }]}>{item.title}</Text>
// //                         <Text style={styles.resultSubtitle}>Hán Việt: {item.subtitle}</Text>
// //                         <Text style={styles.resultDesc} numberOfLines={2}>Ý nghĩa: {item.description}</Text>
// //                         <View style={[styles.resultTypeBadge, { backgroundColor: '#e0f2fe' }]}>
// //                           <Text style={styles.resultTypeText}>Hán tự</Text>
// //                         </View>
// //                         <Text style={styles.arrowIcon}>›</Text>
// //                       </TouchableOpacity>
// //                     );
// //                   }
// //                   return (
// //                     <TouchableOpacity
// //                       key={item.id}
// //                       style={styles.resultCard}
// //                       onPress={() => handleResultPress(item)}
// //                       activeOpacity={0.7}
// //                     >
// //                       <Text style={styles.resultTitle}>{item.title}</Text>
// //                       {item.subtitle ? <Text style={styles.resultSubtitle}>{item.subtitle}</Text> : null}
// //                       <Text style={styles.resultDesc} numberOfLines={2}>{item.description}</Text>
// //                       <View style={[styles.resultTypeBadge, 
// //                         { backgroundColor: item.type === 'sentence' ? '#fef3c7' : '#f3e8ff' }
// //                       ]}>
// //                         <Text style={styles.resultTypeText}>
// //                           {item.type === 'sentence' ? 'Mẫu câu' : 'Ngữ pháp'}
// //                         </Text>
// //                       </View>
// //                       <Text style={styles.arrowIcon}>›</Text>
// //                     </TouchableOpacity>
// //                   );
// //                 })
// //               )}
// //             </ScrollView>
// //           )}
// //         </View>

// //         {drawModalVisible && results.length === 0 && (
// //           <View
// //             onLayout={(e) => setDrawModalHeight(e.nativeEvent.layout.height)}
// //             style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 999 }}
// //           >
// //             <KanjiDrawSearchModal
// //               ref={drawModalRef}
// //               visible={drawModalVisible}
// //               onClose={() => setDrawModalVisible(false)}
// //               onSelectKanji={handleSelectKanji}
// //               onSearchPress={handleSearchPress}
// //             />
// //           </View>
// //         )}
// //       </View>
// //     </Modal>
// //   );
// // }

// // const styles = StyleSheet.create({
// //   container: { flex: 1, backgroundColor: BG_GRAY, position: 'relative' },
// //   // Lớp phủ mờ trong suốt giúp giữ nguyên giao diện cũ khi loading mà không bị biến mất nội dung đột ngột
// //   absoluteLoadingOverlay: {
// //     ...StyleSheet.absoluteFillObject,
// //     backgroundColor: 'rgba(15, 23, 42, 0.25)',
// //     zIndex: 9999,
// //     justifyContent: 'center',
// //     alignItems: 'center',
// //   },
// //   loadingBox: {
// //     backgroundColor: 'rgba(0, 0, 0, 0.75)',
// //     paddingHorizontal: 24,
// //     paddingVertical: 18,
// //     borderRadius: 14,
// //     alignItems: 'center',
// //     justifyContent: 'center',
// //     gap: 8,
// //   },
// //   loadingBoxText: {
// //     color: '#fff',
// //     fontSize: 13,
// //     fontWeight: '500',
// //   },
// //   header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16 },
// //   backBtn: { width: 42, height: 42, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
// //   backIcon: { fontSize: 28, color: '#fff', fontWeight: '300' },
// //   searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, height: 46 },
// //   searchInput: { flex: 1, fontSize: 15, color: '#0f172a', height: '100%' },
// //   drawKanjiBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: '#f1f5f9', marginLeft: 4 },
// //   drawKanjiIcon: { fontSize: 20, color: TEAL },
// //   tabBar: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', gap: 8 },
// //   tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, backgroundColor: '#f1f5f9' },
// //   tabBtnActive: { backgroundColor: TEAL },
// //   tabIcon: { fontSize: 16, color: '#64748b' },
// //   tabIconActive: { color: '#fff' },
// //   tabLabel: { fontSize: 13, fontWeight: '600', color: '#475569' },
// //   tabLabelActive: { color: '#fff' },
// //   emptyContainer: { alignItems: 'center', paddingVertical: 60, flex: 1, justifyContent: 'center' },
// //   emptyEmoji: { fontSize: 48, marginBottom: 16 },
// //   emptyTitle: { fontSize: 16, fontWeight: '600', color: '#334155', marginBottom: 8 },
// //   emptySub: { fontSize: 13, color: '#94a3b8' },
// //   resultCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0', position: 'relative' },
// //   resultTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
// //   resultSubtitle: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
// //   resultDesc: { fontSize: 13, color: '#475569', marginTop: 4 },
// //   resultTypeBadge: { position: 'absolute', top: 12, right: 12, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
// //   resultTypeText: { fontSize: 10, fontWeight: '600', color: '#475569' },
// //   arrowIcon: { position: 'absolute', bottom: 12, right: 12, fontSize: 18, color: '#cbd5e1' },
// //   vocabResultCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0', position: 'relative' },
// //   vocabResultChar: { fontSize: 32, fontWeight: '700', color: TEAL_DARK, width: 60, textAlign: 'center' },
// //   vocabResultInfo: { flex: 1, marginLeft: 12 },
// //   vocabResultReading: { fontSize: 14, color: '#64748b', marginBottom: 2 },
// //   vocabResultMeaning: { fontSize: 14, fontWeight: '500', color: '#1e293b' },
// //   searchIconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, marginRight: 4 },
// //   searchIconText: { fontSize: 16, color: '#fff' }
// // });



// ////// goc
// // // components/SearchModal.tsx
// // import React, { useState, useEffect, useRef } from 'react';
// // import {
// //   Modal,
// //   View,
// //   Text,
// //   StyleSheet,
// //   TextInput,
// //   TouchableOpacity,
// //   ScrollView,
// //   StatusBar,
// //   Keyboard,
// //   ActivityIndicator,
// //   Alert,
// //   Dimensions,
// // } from 'react-native';
// // import { LinearGradient } from 'expo-linear-gradient';
// // import { useRouter } from 'expo-router';
// // import { getVocab } from '../assets/vocab';
// // import { getKanji, type KanjiItem } from '../assets/data_JLPT_kanji';
// // import { getGrammar } from '../assets/data_nn';
// // import { EXAMPLE_SENTENCES } from '../assets/sentences'; 
// // import KanjiDetailInline from './KanjiDetailInline'; 
// // import KanjiDrawSearchModal from './KanjiDrawSearchModal';
// // import VocabDetailInline from './VocabDetailInline';
// // import GrammarDetailInline from './GrammarDetailInline';
// // import SentenceDetailInline from './SentenceDetailInline';
// // import { SearchHistory, SearchHistoryRef } from './SearchHistory';
// // import AsyncStorage from '@react-native-async-storage/async-storage';
// // import { useAuth } from '../artifacts/mirai-jp/hooks/useAuth';

// // import { InteractionManager } from 'react-native';
// // import SearchSuggestions from './SearchSuggestions';

// // const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
// // const TEAL = "#1F6F7A";
// // const TEAL_DARK = "#0B3540";
// // const BG_GRAY = "#f0f4f8";

// // type SearchType = 'vocab' | 'kanji' | 'sentence' | 'grammar'; 

// // interface SearchModalProps {
// //   visible: boolean;
// //   onClose: () => void;
// //   autoOpenDrawer?: boolean;  
// //   onDrawerOpened?: () => void;
// //   initialTab?: SearchType;
// // }

// // interface SearchResult {
// //   id: string;
// //   type: SearchType;
// //   title: string;
// //   subtitle: string;
// //   description: string;
// //   data?: any;
// // }

// // function normalizeString(s: string) {
// //   if (!s || typeof s !== 'string') return '';
// //   return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
// // }

// // // Hàm chuyển Hiragana sang Romaji
// // function hiraganaToRomaji(hiragana: string): string {
// //   const hiraToRomajiMap: Record<string, string> = {
// //     'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o',
// //     'か': 'ka', 'き': 'ki', 'く': 'ku', 'け': 'ke', 'こ': 'ko',
// //     'さ': 'sa', 'し': 'shi', 'す': 'su', 'せ': 'se', 'そ': 'so',
// //     'た': 'ta', 'ち': 'chi', 'つ': 'tsu', 'て': 'te', 'と': 'to',
// //     'な': 'na', 'に': 'ni', 'ぬ': 'nu', 'ね': 'ne', 'の': 'no',
// //     'は': 'ha', 'ひ': 'hi', 'ふ': 'fu', 'へ': 'he', 'ほ': 'ho',
// //     'ま': 'ma', 'み': 'mi', 'む': 'mu', 'め': 'me', 'も': 'mo',
// //     'や': 'ya', 'ゆ': 'yu', 'よ': 'yo',
// //     'ら': 'ra', 'り': 'ri', 'る': 'ru', 'れ': 're', 'ろ': 'ro',
// //     'わ': 'wa', 'を': 'wo', 'ん': 'n',
// //     'が': 'ga', 'ぎ': 'gi', 'ぐ': 'gu', 'げ': 'ge', 'ご': 'go',
// //     'ざ': 'za', 'じ': 'ji', 'ず': 'zu', 'ぜ': 'ze', 'ぞ': 'zo',
// //     'だ': 'da', 'ぢ': 'ji', 'づ': 'zu', 'で': 'de', 'ど': 'do',
// //     'ば': 'ba', 'び': 'bi', 'ぶ': 'bu', 'べ': 'be', 'ぼ': 'bo',
// //     'ぱ': 'pa', 'ぴ': 'pi', 'ぷ': 'pu', 'ぺ': 'pe', 'ぽ': 'po',
// //     'きゃ': 'kya', 'きゅ': 'kyu', 'きょ': 'kyo',
// //     'しゃ': 'sha', 'しゅ': 'shu', 'しょ': 'sho',
// //     'ちゃ': 'cha', 'ちゅ': 'chu', 'ちょ': 'cho',
// //     'にゃ': 'nya', 'にゅ': 'nyu', 'にょ': 'nyo',
// //     'ひゃ': 'hya', 'ひゅ': 'hyu', 'ひょ': 'hyo',
// //     'みゃ': 'mya', 'みゅ': 'myu', 'みょ': 'myo',
// //     'りゃ': 'rya', 'りゅ': 'ryu', 'りょ': 'ryo',
// //     'ぎゃ': 'gya', 'ぎゅ': 'gyu', 'ぎょ': 'gyo',
// //     'じゃ': 'ja', 'じゅ': 'ju', 'じょ': 'jo',
// //     'びゃ': 'bya', 'びゅ': 'byu', 'びょ': 'byo',
// //     'ぴゃ': 'pya', 'ぴゅ': 'pyu', 'ぴょ': 'pyo',
// //   };
  
// //   let result = '';
// //   let i = 0;
// //   while (i < hiragana.length) {
// //     const twoChars = hiragana.slice(i, i + 2);
// //     if (hiraToRomajiMap[twoChars]) {
// //       result += hiraToRomajiMap[twoChars];
// //       i += 2;
// //     } else {
// //       const oneChar = hiragana.slice(i, i + 1);
// //       result += hiraToRomajiMap[oneChar] || oneChar;
// //       i += 1;
// //     }
// //   }
// //   return result;
// // }

// // // Hàm chuyển Romaji sơ bộ sang Hiragana (cho các trường hợp cơ bản)
// // function romajiToHiragana(romaji: string): string {
// //   const romajiMap: Record<string, string> = {
// //     'a': 'あ', 'i': 'い', 'u': 'う', 'e': 'え', 'o': 'お',
// //     'ka': 'か', 'ki': 'き', 'ku': 'く', 'ke': 'け', 'ko': 'こ',
// //     'sa': 'さ', 'shi': 'し', 'su': 'す', 'se': 'せ', 'so': 'そ',
// //     'ta': 'た', 'chi': 'ち', 'tsu': 'つ', 'te': 'て', 'to': 'と',
// //     'na': 'な', 'ni': 'に', 'nu': 'ぬ', 'ne': 'ね', 'no': 'の',
// //     'ha': 'は', 'hi': 'ひ', 'fu': 'ふ', 'he': 'へ', 'ho': 'ほ',
// //     'ma': 'ま', 'mi': 'み', 'mu': 'む', 'me': 'め', 'mo': 'も',
// //     'ya': 'や', 'yu': 'ゆ', 'yo': 'よ',
// //     'ra': 'ら', 'ri': 'り', 'ru': 'る', 're': 'れ', 'ro': 'ろ',
// //     'wa': 'わ', 'wo': 'を', 'n': 'ん',
// //     'ga': 'が', 'gi': 'ぎ', 'gu': 'ぐ', 'ge': 'げ', 'go': 'ご',
// //     'za': 'ざ', 'ji': 'じ', 'zu': 'ず', 'ze': 'ぜ', 'zo': 'ぞ',
// //     'da': 'だ', 'di': 'ぢ', 'du': 'づ', 'de': 'で', 'do': 'ど',
// //     'ba': 'ば', 'bi': 'び', 'bu': 'ぶ', 'be': 'べ', 'bo': 'ぼ',
// //     'pa': 'ぱ', 'pi': 'ぴ', 'pu': 'ぷ', 'pe': 'ぺ', 'po': 'ぽ',
// //     'kya': 'きゃ', 'kyu': 'きゅ', 'kyo': 'きょ',
// //     'sha': 'しゃ', 'shu': 'しゅ', 'sho': 'しょ',
// //     'cha': 'ちゃ', 'chu': 'ちゅ', 'cho': 'ちょ',
// //     'nya': 'にゃ', 'nyu': 'にゅ', 'nyo': 'にょ',
// //     'hya': 'ひゃ', 'hyu': 'ひゅ', 'hyo': 'ひょ',
// //     'mya': 'みゃ', 'myu': 'みゅ', 'myo': 'みょ',
// //     'rya': 'りゃ', 'ryu': 'りゅ', 'ryo': 'りょ',
// //     'gya': 'ぎゃ', 'gyu': 'ぎゅ', 'gyo': 'ぎょ',
// //     'ja': 'じゃ', 'ju': 'じゅ', 'jo': 'じょ',
// //     'bya': 'びゃ', 'byu': 'びゅ', 'byo': 'びょ',
// //     'pya': 'ぴゃ', 'pyu': 'ぴゅ', 'pyo': 'ぴょ',
// //   };
  
// //   const lowerRomaji = romaji.toLowerCase();
  
// //   // Tìm từ dài nhất trước
// //   for (let len = 4; len >= 1; len--) {
// //     const sub = lowerRomaji.slice(0, len);
// //     if (romajiMap[sub]) {
// //       return romajiMap[sub] + romajiToHiragana(lowerRomaji.slice(len));
// //     }
// //   }
// //   return lowerRomaji;
// // }

// // export default function SearchModal({ 
// //   visible, 
// //   onClose, 
// //   autoOpenDrawer = false, 
// //   onDrawerOpened, 
// //   initialTab 
// // }: SearchModalProps) {
// //   const router = useRouter();
// //   const [query, setQuery] = useState('');
// //   const [results, setResults] = useState<SearchResult[]>([]);
// //   const [loading, setLoading] = useState(false);
// //   const [activeTab, setActiveTab] = useState<SearchType>('vocab');
// //   const inputRef = useRef<TextInput>(null);
// //   const [drawModalVisible, setDrawModalVisible] = useState(false);
  
// //   const [kanjiModalVisible, setKanjiModalVisible] = useState(false);
// //   const [foundKanjiChars, setFoundKanjiChars] = useState<string[]>([]);
// //   const [currentKanjiResults, setCurrentKanjiResults] = useState<string[]>([]);

// //   const { scopedKey, currentUser } = useAuth();
// //   const historyRef = useRef<SearchHistoryRef>(null);
// //   const drawModalRef = useRef<any>(null);
// //   const [historyKey, setHistoryKey] = useState(0);

// //   // Lưu lịch sử trực tiếp — không phụ thuộc vào historyRef (ref null khi query > 0)
// //   // kanji và vocab dùng chung key 'vocab' để chia sẻ lịch sử
// //   const saveToHistory = async (text: string, tab: SearchType) => {
// //     if (!currentUser || !text.trim()) return;
// //     const histType = (tab === 'kanji') ? 'vocab' : tab;
// //     const key = scopedKey(`search_history_${histType}`);
// //     try {
// //       const raw = await AsyncStorage.getItem(key);
// //       let items: { id: string; text: string; timestamp: number; type: string }[] = raw ? JSON.parse(raw) : [];
// //       items = items.filter(i => i.text !== text.trim());
// //       items.unshift({ id: Date.now().toString(), text: text.trim(), timestamp: Date.now(), type: histType });
// //       if (items.length > 20) items = items.slice(0, 20);
// //       await AsyncStorage.setItem(key, JSON.stringify(items));
// //     } catch (e) {
// //       // silent
// //     }
// //   };
// //   const [drawModalHeight, setDrawModalHeight] = useState(0);
// //   const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);

// //   // Tự động mở khung vẽ khi autoOpenDrawer = true
// //   // useEffect(() => {
// //   //   if (visible && autoOpenDrawer) {
// //   //     setDrawModalVisible(true);
// //   //     if (onDrawerOpened) onDrawerOpened();
// //   //   }
// //   // }, [visible, autoOpenDrawer, onDrawerOpened]);

// //   // // Active tab khi có initialTab (từ trang chủ)
// //   // useEffect(() => {
// //   //   if (visible && initialTab) {
// //   //     setActiveTab(initialTab);
// //   //     setDrawModalVisible(true);
// //   //   }else if (visible) {
// //   //     setDrawModalVisible(true);
// //   //   }
// //   // }, [visible, initialTab]);

// //   // // Reset state khi modal đóng/mở
// //   // useEffect(() => {
// //   //   if (visible) {
// //   //     setResults([]);
// //   //     setLoading(false);
// //   //     setDrawModalVisible(false);
// //   //     setKanjiModalVisible(false);
// //   //     setSelectedResult(null);
// //   //     setHistoryKey(prev => prev + 1); 
// //   //   } else {// Khi đóng màn hình tìm kiếm: Dọn dẹp sạch sẽ trạng thái
// //   //     setQuery('');
// //   //     setResults([]);
// //   //     setCurrentKanjiResults([]);
// //   //     setDrawModalVisible(false);
// //   //     setKanjiModalVisible(false);
// //   //     setSelectedResult(null);
// //   //     setLoading(false);
// //   //     setActiveTab('vocab');
// //   //   }
// //   // }, [visible]);

// //   // 🟢 CẢI TIẾN TOÀN DIỆN LOGIC MỞ KHUNG VẼ 
// //   useEffect(() => {
// //     let timer: ReturnType<typeof setTimeout>;
// //     if (visible) {
// //       // 1. Reset các trạng thái tìm kiếm ngay lập tức
// //       setResults([]);
// //       setLoading(false);
// //       setKanjiModalVisible(false);
// //       setSelectedResult(null);
// //       setHistoryKey(prev => prev + 1);
// //       if (autoOpenDrawer || initialTab === 'kanji') {
// //         setActiveTab('kanji');
// //         timer = setTimeout(() => {
// //           setDrawModalVisible(true);
// //           if (onDrawerOpened) onDrawerOpened();
// //         }, 100); // Bạn có thể chỉnh lên 150ms nếu máy ảo/thiết bị chạy chậm
// //       } else if (initialTab) {
// //         setActiveTab(initialTab);
// //       }
// //     } else {
// //       // 3. Khi đóng màn hình tìm kiếm: Dọn dẹp sạch sẽ trạng thái
// //       setQuery('');
// //       setResults([]);
// //       setCurrentKanjiResults([]);
// //       setDrawModalVisible(false); 
// //       setKanjiModalVisible(false);
// //       setSelectedResult(null);
// //       setLoading(false);
// //       setActiveTab('vocab');
// //     }
// //     // Khử bộ đếm khi đóng màn hình hoặc re-render để tránh rò rỉ bộ nhớ
// //     return () => {
// //       if (timer) clearTimeout(timer);
// //     };
// //   }, [visible, autoOpenDrawer, initialTab]);


// //   const openDrawKanjiModal = () => {
// //     Keyboard.dismiss();
// //     setActiveTab('kanji');
// //     setDrawModalVisible(true);
// //   };

// //   const handleSelectKanji = (kanji: string, kanjiData?: any) => {
// //     setQuery(prevQuery => prevQuery + kanji);
// //     if (drawModalRef.current) {
// //       drawModalRef.current.clearCanvas();
// //     }
// //     setActiveTab('kanji');
// //   };

// //   const allVocab = getVocab();
// //   const allKanji = getKanji();
// //   console.log('📊 Số lượng Kanji:', allKanji.length);
// //   console.log('📝 Ví dụ Kanji đầu tiên:', allKanji[0]);
// //   const allGrammar = getGrammar();
// //   const allSentences = EXAMPLE_SENTENCES; 

// //   const handleSearchPress = () => {
// //     if (!query.trim()) {
// //       Alert.alert('Thông báo', 'Vui lòng nhập từ khóa tìm kiếm');
// //       return;
// //     }
// //     setDrawModalVisible(false);
// //     if (drawModalRef.current) {
// //       drawModalRef.current.clearCanvas();
// //     }
// //     performSearch();
// //     // Lưu lịch sử trực tiếp (không dùng ref vì SearchHistory chỉ mount khi query rỗng)
// //     saveToHistory(query, activeTab);
// //     // Refresh SearchHistory sau khi lưu
// //     setHistoryKey(prev => prev + 1);
// //   };

// //   const performSearch = () => {
// //     setSelectedResult(null);
// //     setKanjiModalVisible(false);
// //     setLoading(true);
// //     const normalizedQuery = normalizeString(query);
// //     const searchResults: SearchResult[] = [];

// //     const lowerQuery = query.toLowerCase();
// //     const romaji = query;  // Tạm thời gán bằng query, hoặc bạn cần hàm chuyển đổi

// //     if (activeTab === 'vocab') {
// //       const vocabResults = allVocab
// //         .filter(v => {
// //           const hiraganaText = v.hiragana || v.hira || '';
// //           const romajiText = hiraganaText ? hiraganaToRomaji(hiraganaText) : '';

// //           return v.kanji?.includes(query) ||
// //                 hiraganaText.includes(query) ||
// //                 romajiText.includes(query.toLowerCase()) ||
// //                 v.han?.toLowerCase().includes(normalizedQuery) ||
// //                 normalizeString(v.nghia || '').includes(normalizedQuery);
// //         });
      
// //       const uniqueVocabMap = new Map();
// //       for (const v of vocabResults) {
// //         const key = v.kanji;
// //         if (!uniqueVocabMap.has(key)) {
// //           uniqueVocabMap.set(key, v);
// //         }
// //       }
      
// //       const uniqueVocabResults = Array.from(uniqueVocabMap.values()).slice(0, 20);
      
// //       // 👇 QUAN TRỌNG: Sửa subtitle để hiển thị đúng Hiragana
// //       const mappedResults = uniqueVocabResults.map((v, idx) => ({
// //         id: `vocab_${idx}`,
// //         type: 'vocab' as SearchType,
// //         title: v.kanji || '',
// //         subtitle: v.hiragana || v.hira || '',  // 👈 Ưu tiên hiragana, fallback sang hira
// //         description: v.nghia || '',
// //         data: v,
// //       }));
      
// //       searchResults.push(...mappedResults);
// //     }

// //     // if (activeTab === 'vocab') {
// //     //   const vocabResults = allVocab
// //     //     .filter(v => 
// //     //       v.kanji?.includes(query) ||
// //     //       v.hiragana?.includes(query) ||
// //     //       romaji.includes(lowerQuery) ||  
// //     //       v.han?.toLowerCase().includes(normalizedQuery) ||
// //     //       normalizeString(v.nghia || '').includes(normalizedQuery)
// //     //     );
      
// //     //   const uniqueVocabMap = new Map();
// //     //   for (const v of vocabResults) {
// //     //     const key = v.kanji;
// //     //     if (!uniqueVocabMap.has(key)) {
// //     //       uniqueVocabMap.set(key, v);
// //     //     }
// //     //   }
      
// //     //   const uniqueVocabResults = Array.from(uniqueVocabMap.values()).slice(0, 20);
      
// //     //   const mappedResults = uniqueVocabResults.map((v, idx) => ({
// //     //     id: `vocab_${idx}`,
// //     //     type: 'vocab' as SearchType,
// //     //     title: v.kanji || '',
// //     //     subtitle: v.hiragana || '',
// //     //     description: v.nghia || '',
// //     //     data: v,
// //     //   }));
      
// //     //   searchResults.push(...mappedResults);
// //     // }

// //     //activeTab kanji
// //     else if (activeTab === 'kanji') {
// //       console.log('🔍 Đang tìm kiếm Kanji với từ khóa:', query);
// //       console.log('📊 Tổng số Kanji:', allKanji.length);
      
// //       const normalizedQuery = normalizeString(query);
// //       let kanjiResults: KanjiItem[] = [];
// //       let vocabKanjiChars: string[] = [];
      
// //       // Kiểm tra xem query có phải là tiếng Việt không (có dấu hoặc chữ cái Latin)
// //       const isVietnamese = /[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠƯàáâãèéêìíòóôõùúăđĩũơư\s]/i.test(query);
      
// //       if (isVietnamese) {
// //         // 1️⃣ Tìm trong dữ liệu Kanji trước (theo nghĩa, Hán Việt, Kunyomi, Onyomi)
// //         kanjiResults = allKanji
// //           .filter(k => {
// //             const matchByHanViet = k.hanViet?.toLowerCase().includes(normalizedQuery) || false;
// //             const matchByMeaning = k.meanings?.some(m => m.toLowerCase().includes(normalizedQuery)) || false;
// //             const matchByKun = k.kunyomi?.some(kun => kun.toLowerCase().includes(normalizedQuery)) || false;
// //             const matchByOn = k.onyomi?.some(on => on.toLowerCase().includes(normalizedQuery)) || false;
// //             return matchByHanViet || matchByMeaning || matchByKun || matchByOn;
// //           })
// //           .slice(0, 20);
        
// //         // 2️⃣ Nếu không tìm thấy trong Kanji, tìm trong Từ vựng
// //         if (kanjiResults.length === 0) {
// //           console.log('⚠️ Không tìm thấy trong Kanji, tìm trong Từ vựng...');
          
// //           const vocabResults = allVocab
// //             .filter(v => {
// //               const hiraganaText = v.hiragana || v.hira || '';
// //               const romajiText = hiraganaText ? hiraganaToRomaji(hiraganaText) : '';
              
// //               return v.kanji?.includes(query) ||
// //                     hiraganaText.includes(query) ||
// //                     romajiText.includes(query.toLowerCase()) ||
// //                     v.han?.toLowerCase().includes(normalizedQuery) ||
// //                     normalizeString(v.nghia || '').includes(normalizedQuery);
// //             })
// //             .slice(0, 20);
          
// //           // 👇 Lấy TẤT CẢ chữ Kanji (Hán tự) từ kết quả Từ vựng
// //           const uniqueVocabKanji = new Map();
// //           for (const v of vocabResults) {
// //             if (v.kanji) {
// //               // Tách từng ký tự và chỉ lấy chữ Hán (Kanji)
// //               const chars = v.kanji.split('');
// //               for (const char of chars) {
// //                 // Kiểm tra có phải chữ Hán không (Unicode range 4E00-9FAF)
// //                 if (/[\u4e00-\u9faf]/.test(char) && !uniqueVocabKanji.has(char)) {
// //                   uniqueVocabKanji.set(char, char);
// //                 }
// //               }
// //             }
// //           }
// //           vocabKanjiChars = Array.from(uniqueVocabKanji.keys());
// //           console.log('📝 Chữ Kanji tìm được từ Từ vựng:', vocabKanjiChars);
// //         }
// //       } else {
// //         // 3️⃣ Nếu query là Kanji, tách từng ký tự để tìm
// //         const searchChars = query.split('');
// //         kanjiResults = allKanji
// //           .filter(k => {
// //             const matchByKanji = searchChars.some(char => k.kanji === char);
// //             const matchByHanViet = k.hanViet?.toLowerCase().includes(normalizedQuery) || false;
// //             const matchByMeaning = k.meanings?.some(m => m.toLowerCase().includes(normalizedQuery)) || false;
// //             const matchByKun = k.kunyomi?.some(kun => kun.toLowerCase().includes(normalizedQuery)) || false;
// //             const matchByOn = k.onyomi?.some(on => on.toLowerCase().includes(normalizedQuery)) || false;
// //             return matchByKanji || matchByHanViet || matchByMeaning || matchByKun || matchByOn;
// //           })
// //           .slice(0, 20);
// //       }
      
// //       console.log('📊 Số lượng kết quả Kanji tìm được:', kanjiResults.length);
// //       console.log('📊 Số lượng chữ Kanji từ Từ vựng:', vocabKanjiChars.length);
      
// //       // 4️⃣ Xử lý hiển thị kết quả
// //       if (kanjiResults.length > 0) {
// //         // Có kết quả từ Kanji → hiển thị modal KanjiDetailInline
// //         const uniqueKanjiMap = new Map(kanjiResults.map(k => [k.kanji, k]));
// //         const allTitles = Array.from(uniqueKanjiMap.keys());
// //         setCurrentKanjiResults(allTitles);
// //         setFoundKanjiChars(allTitles);
// //         setKanjiModalVisible(true);
// //       } 
// //       else if (vocabKanjiChars.length > 0) {
// //         // Không có kết quả từ Kanji, nhưng có từ Từ vựng → hiển thị KanjiDetailInline
// //         console.log('✅ Hiển thị KanjiDetailInline từ kết quả Từ vựng');
// //         setCurrentKanjiResults(vocabKanjiChars);
// //         setFoundKanjiChars(vocabKanjiChars);
// //         setKanjiModalVisible(true);
// //       }
// //     }


// //     //code củ gốc
// //     // else if (activeTab === 'kanji') {
// //     //   console.log('🔍 Đang tìm kiếm Kanji với từ khóa:', query);
// //     //   console.log('📊 Tổng số Kanji:', allKanji.length);
// //     //   const searchChars = query.split('');
      
// //     //   const kanjiResults = allKanji
// //     //     .filter(k => {
// //     //       const matchByKanji = searchChars.some(char => k.kanji === char);
// //     //       const matchByHanViet = k.hanViet?.toLowerCase().includes(normalizedQuery) || false;
// //     //       const matchByMeaning = k.meanings?.some(m => m.toLowerCase().includes(normalizedQuery)) || false;
// //     //       return matchByKanji || matchByHanViet || matchByMeaning;
// //     //     })
// //     //     .slice(0, 20);

// //     //   if (kanjiResults.length > 0) {
// //     //     const uniqueKanjiMap = new Map(kanjiResults.map(k => [k.kanji, k]));
// //     //     const allTitles = Array.from(uniqueKanjiMap.keys());
// //     //     setCurrentKanjiResults(allTitles);
// //     //     setFoundKanjiChars(allTitles);
// //     //     setKanjiModalVisible(true);
// //     //   }
// //     // }
// //     else if (activeTab === 'sentence') {
// //       const sentenceResults = allSentences
// //         .filter(s => {
// //           if (!s || !s.jp) return false;
// //           return s.jp.includes(query);
// //         });
      
// //         const uniqueMap = new Map();
// //         for (const s of sentenceResults) {
// //           const key = s.jp;
// //           if (!uniqueMap.has(key)) {
// //             uniqueMap.set(key, s);
// //           }
// //       }
      
// //       const uniqueResults = Array.from(uniqueMap.values()).slice(0, 30);
      
// //       const mappedResults = uniqueResults.map((s, idx) => {
// //         let subtitle = '';
// //         if (s.source === 'grammar') {
// //           subtitle = `📝 ${s.pattern || 'Ngữ pháp'}`;
// //         } else if (s.level) {
// //           subtitle = `📚 ${s.level}`;
// //         }
        
// //         return {
// //           id: `sentence_${idx}`,
// //           type: 'sentence' as SearchType,
// //           title: s.jp.length > 60 ? s.jp.slice(0, 60) + '...' : s.jp,
// //           subtitle: subtitle,
// //           description: s.vi,
// //           data: s,
// //         };
// //       });
      
// //       searchResults.push(...mappedResults);
// //     }
// //     else if (activeTab === 'grammar') {
// //       let grammarResults = allGrammar;
      
// //       if (query.trim()) {
// //         grammarResults = allGrammar.filter(g =>
// //           g.pattern?.includes(query) ||
// //           g.phienAm?.toLowerCase().includes(normalizedQuery) ||
// //           g.meaning?.toLowerCase().includes(normalizedQuery)
// //         );
// //       }
      
// //       const uniqueMap = new Map();
// //       for (const g of grammarResults) {
// //         const key = g.pattern;
// //         if (!uniqueMap.has(key)) {
// //           uniqueMap.set(key, g);
// //         }
// //       }
      
// //       const uniqueResults = Array.from(uniqueMap.values()).slice(0, 50);
      
// //       const mappedResults = uniqueResults.map((g, idx) => ({
// //         id: `grammar_${idx}`,
// //         type: 'grammar' as SearchType,
// //         title: g.pattern,
// //         subtitle: g.phienAm || '',
// //         description: g.meaning,
// //         data: g,
// //       }));
      
// //       searchResults.push(...mappedResults);
// //     }
// //     setResults(searchResults);
// //     setLoading(false);
// //   };

// //   const handleResultPress = (result: SearchResult) => {
// //     Keyboard.dismiss();
// //     if (result.type === 'kanji') {
// //       if (currentKanjiResults.length > 0) {
// //         setFoundKanjiChars(currentKanjiResults);
// //       } else {
// //         setFoundKanjiChars([result.title]);
// //       }
// //       setKanjiModalVisible(true);
// //     } else {
// //       setSelectedResult(result);
// //     }
// //   };

// //   const clearSearch = () => {
// //     setQuery('');
// //     setResults([]);
// //     inputRef.current?.focus();
// //   };

// //   const getTypeLabel = (type: SearchType) => {
// //     switch (type) {
// //       case 'vocab': return 'Từ vựng';
// //       case 'kanji': return 'Hán tự';
// //       case 'sentence': return 'Mẫu câu';
// //       case 'grammar': return 'Ngữ pháp';
// //       default: return '';
// //     }
// //   };

// //   if (!visible) return null;

// //   return (
// //     <Modal
// //       visible={visible}
// //       animationType="slide"
// //       transparent={false}
// //       presentationStyle="overFullScreen"
// //       onRequestClose={onClose}
// //     >
// //       <StatusBar barStyle="light-content" backgroundColor={TEAL} />
      
// //       <View style={styles.container}>
// //         <LinearGradient colors={[TEAL, TEAL_DARK]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
// //           <View style={styles.header}>
// //             <TouchableOpacity onPress={onClose} style={styles.backBtn}>
// //               <Text style={styles.backIcon}>←</Text>
// //             </TouchableOpacity>
// //             <View style={styles.searchContainer}>
// //               <TouchableOpacity onPress={handleSearchPress} style={styles.searchIconBtn}>
// //                 <Text style={styles.searchIconText}>🔍</Text>
// //               </TouchableOpacity>
// //               <TextInput
// //                 ref={inputRef}
// //                 style={styles.searchInput}
// //                 placeholder="Tìm kiếm từ vựng, kanji, mẫu câu, ngữ pháp..."
// //                 placeholderTextColor="#94a3b8"
// //                 value={query}
// //                 onChangeText={setQuery}
// //                 returnKeyType="search"
// //                 onSubmitEditing={handleSearchPress}  
// //                 autoFocus={false}
// //                 onFocus={() => {
// //                   if (drawModalVisible) {
// //                     setDrawModalVisible(false);
// //                   }
// //                 }}
// //               />
// //               <TouchableOpacity onPress={openDrawKanjiModal} style={styles.drawKanjiBtn}>
// //                 <Text style={styles.drawKanjiIcon}>✏️</Text>
// //               </TouchableOpacity>
// //             </View>
// //           </View>
// //         </LinearGradient>

// //         <View style={styles.tabBar}>
// //           {[
// //             { id: 'vocab', label: 'Từ vựng', icon: '📖' },
// //             { id: 'kanji', label: 'Hán tự', icon: '🈳' },
// //             { id: 'sentence', label: 'Mẫu câu', icon: '💬' },
// //             { id: 'grammar', label: 'Ngữ từ', icon: '📝' },
// //           ].map((tab) => (
// //             <TouchableOpacity
// //               key={tab.id}
// //               style={[styles.tabBtn, activeTab === tab.id && styles.tabBtnActive]}
// //               onPress={() => {
// //                 setActiveTab(tab.id as SearchType);
// //                 setSelectedResult(null);
// //                 setResults([]);
// //                 setHistoryKey(prev => prev + 1);
// //                 if (tab.id !== 'kanji') {
// //                   setKanjiModalVisible(false);
// //                   setDrawModalVisible(false);  
// //                 }
// //               }}
// //               activeOpacity={0.7}
// //             >
// //               <Text style={[styles.tabIcon, activeTab === tab.id && styles.tabIconActive]}>
// //                 {tab.icon}
// //               </Text>
// //               <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>
// //                 {tab.label}
// //               </Text>
// //             </TouchableOpacity>
// //           ))}
// //         </View>

// //         {/* PHẦN TRÊN - LỊCH SỬ/KẾT QUẢ hoặc CHI TIẾT KANJI hoặc CHI TIẾT KẾT QUẢ */}
// //         <View style={{ flex: 1 }}>
// //           {activeTab === 'kanji' && kanjiModalVisible && foundKanjiChars.length > 0 ? (
// //             <KanjiDetailInline
// //               kanjiChars={foundKanjiChars}
// //               initialIndex={0}
// //               onClose={() => setKanjiModalVisible(false)}
// //             />
// //           ) : selectedResult ? (
// //             selectedResult.type === 'vocab' ? (
// //               <VocabDetailInline
// //                 kanji={selectedResult.title}
// //                 hiragana={selectedResult.subtitle}
// //                 nghia={selectedResult.description}
// //                 han={selectedResult.data?.han || ''}
// //                 level={selectedResult.data?.level || 'N3'}
// //                 example={selectedResult.data?.example || ''}
// //                 exampleMeaning={selectedResult.data?.exampleMeaning || ''}
// //                 id={selectedResult.data?.kanji || selectedResult.title}
// //                 onClose={() => setSelectedResult(null)}
// //               />
// //             ) : (
// //             selectedResult.type === 'sentence' ? (
// //               <SentenceDetailInline
// //                 jp={selectedResult.data?.jp || selectedResult.title}
// //                 vi={selectedResult.description}
// //                 pattern={selectedResult.data?.pattern}
// //                 level={selectedResult.data?.level}
// //                 note={selectedResult.data?.note}
// //                 onClose={() => setSelectedResult(null)}
// //               />
// //             ) : (
// //               <GrammarDetailInline
// //                 id={selectedResult.data?.id}
// //                 pattern={selectedResult.title}
// //                 reading={selectedResult.subtitle}
// //                 meaning={selectedResult.description}
// //                 structure={selectedResult.data?.structure}
// //                 note={selectedResult.data?.note}
// //                 level={selectedResult.data?.level}
// //                 examples={selectedResult.data?.examples || []}
// //                 onClose={() => setSelectedResult(null)}
// //               />
// //             )
// //             )
// //           ) : (
// //           <ScrollView 
// //             style={{ flex: 1 }}
// //             contentContainerStyle={{ flexGrow: 1, paddingTop: 8, paddingHorizontal: 16, paddingBottom: drawModalVisible && results.length === 0 ? drawModalHeight + 8 : 20 }}
// //             showsVerticalScrollIndicator={false}
// //             keyboardShouldPersistTaps="handled"
// //           >
// //             {query.length === 0 ? (
// //               <>
// //                 {/* 👇 THÊM GỢI Ý TÌM KIẾM LÊN TRÊN */}
// //                 <SearchSuggestions
// //                   activeTab={activeTab}
// //                   onSelectSuggestion={(text, tab) => {
// //                     setQuery(text);
// //                     setActiveTab(tab);
// //                     setTimeout(() => performSearch(), 100);
// //                   }}
// //                   visible={query.length === 0}
// //                 />
                
// //                 {/* Lịch sử tìm kiếm ở dưới */}
// //                 <SearchHistory
// //                   key={historyKey}
// //                   ref={historyRef}
// //                   onSelectHistory={(text) => {
// //                     setQuery(text);
// //                     performSearch();
// //                   }}
// //                   type={activeTab === 'kanji' ? 'vocab' : activeTab}
// //                 />
                
// //                 <View style={{ height: 30 }} />
// //               </>
// //             ) : loading ? (
// //               <View style={[styles.loadingContainer, { flex: 1 }]}>
// //                 <ActivityIndicator size="large" color={TEAL} />
// //                 <Text style={styles.loadingText}>Đang tìm kiếm...</Text>
// //               </View>
// //             ) : results.length === 0 ? (
// //               <View style={[styles.emptyContainer, { flex: 1 }]}>
// //                 <Text style={styles.emptyEmoji}>🔍</Text>
// //                 <Text style={styles.emptyTitle}>Nhấn vào icon để tìm kiếm kết quả</Text>
// //                 <Text style={styles.emptySub}>Thử tìm với từ khóa khác</Text>
// //               </View>
// //             ) : (
// //               <>
// //                 {results.map((item) => {
// //                   if (item.type === 'vocab') {
// //                     return (
// //                       <TouchableOpacity
// //                         key={item.id}
// //                         style={styles.vocabResultCard}
// //                         onPress={() => handleResultPress(item)}
// //                         activeOpacity={0.7}
// //                       >
// //                         <Text style={styles.vocabResultChar}>{item.title}</Text>
// //                         <View style={styles.vocabResultInfo}>
// //                           <Text style={styles.vocabResultReading}>{item.subtitle}</Text>
// //                           <Text style={styles.vocabResultMeaning}>{item.description}</Text>
// //                         </View>
// //                         <Text style={styles.arrowIcon}>›</Text>
// //                       </TouchableOpacity>
// //                     );
// //                   }
// //                   if (item.type === 'kanji') {
// //                     return (
// //                       <TouchableOpacity
// //                         key={item.id}
// //                         style={styles.resultCard} // Thêm margin để căn đều lề giống vocab
// //                         onPress={() => handleResultPress(item)}
// //                         activeOpacity={0.7}
// //                       >
// //                         <Text style={[styles.resultTitle, { color: TEAL, fontSize: 24 }]}>{item.title}</Text>
// //                         <Text style={styles.resultSubtitle}>Hán Việt: {item.subtitle}</Text>
// //                         <Text style={styles.resultDesc} numberOfLines={2}>Ý nghĩa: {item.description}</Text>
// //                         <View style={[styles.resultTypeBadge, { backgroundColor: '#e0f2fe' }]}>
// //                           <Text style={styles.resultTypeText}>Hán tự</Text>
// //                         </View>
// //                         <Text style={styles.arrowIcon}>›</Text>
// //                       </TouchableOpacity>
// //                     );
// //                   }
                  
// //                   return (
// //                     <TouchableOpacity
// //                       key={item.id}
// //                       style={styles.resultCard}
// //                       onPress={() => handleResultPress(item)}
// //                       activeOpacity={0.7}
// //                     >
// //                       <Text style={styles.resultTitle}>{item.title}</Text>
// //                       {item.subtitle ? (
// //                         <Text style={styles.resultSubtitle}>{item.subtitle}</Text>
// //                       ) : null}
// //                       <Text style={styles.resultDesc} numberOfLines={2}>{item.description}</Text>
// //                       <View style={[styles.resultTypeBadge, 
// //                         { backgroundColor: item.type === 'sentence' ? '#fef3c7' : '#f3e8ff' }
// //                       ]}>
// //                         <Text style={styles.resultTypeText}>
// //                           {item.type === 'sentence' ? 'Mẫu câu' : 'Ngữ pháp'}
// //                         </Text>
// //                       </View>
// //                       <Text style={styles.arrowIcon}>›</Text>
// //                     </TouchableOpacity>
// //                   );
// //                 })}
// //               </>
// //             )}
// //           </ScrollView>
// //           )}
// //         </View>

// //         {/* KHUNG VẼ KANJI - bám đáy, trượt lên từ dưới */}
// //         {/* {drawModalVisible && results.length === 0 && (
// //           <View
// //             onLayout={(e) => setDrawModalHeight(e.nativeEvent.layout.height)}
// //             style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 999 }}
// //           >
// //             <KanjiDrawSearchModal
// //               ref={drawModalRef}
// //               visible={drawModalVisible}
// //               onClose={() => setDrawModalVisible(false)}
// //               onSelectKanji={handleSelectKanji}
// //             />
// //           </View>
// //         )} */}

// //         {drawModalVisible && results.length === 0 && (
// //           <View
// //             onLayout={(e) => setDrawModalHeight(e.nativeEvent.layout.height)}
// //             style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 999 }}
// //           >
// //             <KanjiDrawSearchModal
// //               ref={drawModalRef}
// //               visible={drawModalVisible}
// //               onClose={() => setDrawModalVisible(false)}
// //               onSelectKanji={handleSelectKanji}
// //               onSearchPress={() => {
// //                 setDrawModalVisible(false);
// //                 handleSearchPress();  // Gọi lại chính hàm tìm kiếm
// //               }}
// //             />
// //           </View>
// //         )}


// //       </View>
// //     </Modal>
// //   );
// // }

// // const styles = StyleSheet.create({
// //   container: {
// //     flex: 1,
// //     backgroundColor: BG_GRAY,
// //   },
// //   header: {
// //     flexDirection: 'row',
// //     alignItems: 'center',
// //     paddingHorizontal: 16,
// //     paddingTop: 56,
// //     paddingBottom: 16,
// //   },
// //   backBtn: {
// //     width: 42,
// //     height: 42,
// //     backgroundColor: 'rgba(255,255,255,0.2)',
// //     borderRadius: 12,
// //     alignItems: 'center',
// //     justifyContent: 'center',
// //     marginRight: 12,
// //   },
// //   backIcon: {
// //     fontSize: 28,
// //     color: '#fff',
// //     fontWeight: '300',
// //   },
// //   searchContainer: {
// //     flex: 1,
// //     flexDirection: 'row',
// //     alignItems: 'center',
// //     backgroundColor: '#fff',
// //     borderRadius: 12,
// //     paddingHorizontal: 12,
// //     height: 46,
// //   },
// //   searchIcon: {
// //     fontSize: 16,
// //     marginRight: 8,
// //     color: '#94a3b8',
// //   },
// //   searchInput: {
// //     flex: 1,
// //     fontSize: 15,
// //     color: '#0f172a',
// //     height: '100%',
// //   },
// //   drawKanjiBtn: {
// //     width: 40,
// //     height: 40,
// //     alignItems: 'center',
// //     justifyContent: 'center',
// //     borderRadius: 20,
// //     backgroundColor: '#f1f5f9',
// //     marginLeft: 4,
// //   },
// //   drawKanjiIcon: {
// //     fontSize: 20,
// //     color: TEAL,
// //   },
// //   tabBar: {
// //     flexDirection: 'row',
// //     backgroundColor: '#fff',
// //     paddingHorizontal: 16,
// //     paddingVertical: 8,
// //     borderBottomWidth: 1,
// //     borderBottomColor: '#e2e8f0',
// //     gap: 8,
// //   },
// //   tabBtn: {
// //     flex: 1,
// //     flexDirection: 'row',
// //     alignItems: 'center',
// //     justifyContent: 'center',
// //     gap: 6,
// //     paddingVertical: 10,
// //     borderRadius: 12,
// //     backgroundColor: '#f1f5f9',
// //   },
// //   tabBtnActive: {
// //     backgroundColor: TEAL,
// //   },
// //   tabIcon: {
// //     fontSize: 16,
// //     color: '#64748b',
// //   },
// //   tabIconActive: {
// //     color: '#fff',
// //   },
// //   tabLabel: {
// //     fontSize: 13,
// //     fontWeight: '600',
// //     color: '#475569',
// //   },
// //   tabLabelActive: {
// //     color: '#fff',
// //   },
// //   content: {
// //     flex: 1,
// //     padding: 16,
// //     minHeight: 0,
// //   },
// //   loadingContainer: {
// //     padding: 40,
// //     alignItems: 'center',
// //   },
// //   loadingText: {
// //     marginTop: 12,
// //     color: '#64748b',
// //   },
// //   emptyContainer: {
// //     alignItems: 'center',
// //     paddingVertical: 60,
// //   },
// //   emptyEmoji: {
// //     fontSize: 48,
// //     marginBottom: 16,
// //   },
// //   emptyTitle: {
// //     fontSize: 16,
// //     fontWeight: '600',
// //     color: '#334155',
// //     marginBottom: 8,
// //   },
// //   emptySub: {
// //     fontSize: 13,
// //     color: '#94a3b8',
// //   },
// //   resultCard: {
// //     backgroundColor: '#fff',
// //     borderRadius: 12,
// //     padding: 16,
// //     marginBottom: 8,
// //     borderWidth: 1,
// //     borderColor: '#e2e8f0',
// //   },
// //   resultTitle: {
// //     fontSize: 18,
// //     fontWeight: '700',
// //     color: '#1e293b',
// //   },
// //   resultSubtitle: {
// //     fontSize: 12,
// //     color: '#94a3b8',
// //     marginTop: 2,
// //   },
// //   resultDesc: {
// //     fontSize: 13,
// //     color: '#475569',
// //     marginTop: 4,
// //   },
// //   resultTypeBadge: {
// //     position: 'absolute',
// //     top: 12,
// //     right: 12,
// //     paddingHorizontal: 8,
// //     paddingVertical: 2,
// //     borderRadius: 12,
// //   },
// //   resultTypeText: {
// //     fontSize: 10,
// //     fontWeight: '600',
// //     color: '#475569',
// //   },
// //   arrowIcon: {
// //     position: 'absolute',
// //     bottom: 12,
// //     right: 12,
// //     fontSize: 18,
// //     color: '#cbd5e1',
// //   },
// //   vocabResultCard: {
// //     flexDirection: 'row',
// //     alignItems: 'center',
// //     backgroundColor: '#fff',
// //     borderRadius: 16,
// //     padding: 16,
// //     marginBottom: 10,
// //     borderWidth: 1,
// //     borderColor: '#e2e8f0',
// //   },
// //   vocabResultChar: {
// //     fontSize: 32,
// //     fontWeight: '700',
// //     color: TEAL_DARK,
// //     width: 60,
// //     textAlign: 'center',
// //   },
// //   vocabResultInfo: {
// //     flex: 1,
// //     marginLeft: 12,
// //   },
// //   vocabResultReading: {
// //     fontSize: 14,
// //     color: '#64748b',
// //     marginBottom: 2,
// //   },
// //   vocabResultMeaning: {
// //     fontSize: 14,
// //     fontWeight: '500',
// //     color: '#1e293b',
// //   },
// //   inlineDrawContainer: {
// //     backgroundColor: '#fff',
// //     borderTopWidth: 1,
// //     borderBottomWidth: 1,
// //     borderColor: '#e2e8f0',
// //     marginTop: 8,
// //     marginBottom: 0,
// //     // --- THUỘC TÍNH DI CHUYỂN ---
// //     position: 'absolute',  // Đưa khung vẽ ra khỏi luồng render thông thường
// //     bottom: 0,             // Đẩy sát xuống đáy màn hình (thay đổi thành top: 100 nếu muốn đưa lên trên)
// //     left: 0,               // Căn sát lề trái
// //     right: 0,              // Căn sát lề phải để tự dãn hết chiều ngang
// //     zIndex: 999,           // Đảm bảo khung vẽ nổi lên trên ScrollView lịch sử/kết quả
// //   },
// //   inlineDrawHeader: {
// //     flexDirection: 'row',
// //     justifyContent: 'space-between',
// //     alignItems: 'center',
// //     paddingHorizontal: 16,
// //     paddingVertical: 12,
// //     backgroundColor: '#f8fafc',
// //     borderBottomWidth: 1,
// //     borderBottomColor: '#e2e8f0',
// //   },
// //   searchIconBtn: {
// //     width: 40,
// //     height: 40,
// //     alignItems: 'center',
// //     justifyContent: 'center',
// //     borderRadius: 20,
// //     marginRight: 4,
// //   },
// //   searchIconText: {
// //     fontSize: 16,
// //     color: '#fff',
// //   },

// //   detailBackBtn: {
// //     flexDirection: 'row',
// //     alignItems: 'center',
// //     paddingHorizontal: 16,
// //     paddingVertical: 12,
// //     gap: 8,
// //   },
// //   detailBackIcon: {
// //     fontSize: 20,
// //     color: TEAL,
// //     fontWeight: '600',
// //   },
// //   detailBackText: {
// //     fontSize: 14,
// //     color: TEAL,
// //     fontWeight: '600',
// //   },
// //   detailCard: {
// //     backgroundColor: '#fff',
// //     marginHorizontal: 16,
// //     marginBottom: 16,
// //     borderRadius: 16,
// //     padding: 20,
// //     borderWidth: 1,
// //     borderColor: '#e2e8f0',
// //   },
// //   detailKanjiRow: {
// //     alignItems: 'center',
// //     marginBottom: 12,
// //   },
// //   detailKanjiBig: {
// //     fontSize: 56,
// //     fontWeight: '800',
// //     color: TEAL_DARK,
// //   },
// //   detailPatternBig: {
// //     fontSize: 28,
// //     fontWeight: '800',
// //     color: TEAL_DARK,
// //     marginBottom: 4,
// //   },
// //   detailReading: {
// //     fontSize: 16,
// //     color: '#64748b',
// //     fontWeight: '500',
// //     textAlign: 'center',
// //     marginBottom: 4,
// //   },
// //   detailDivider: {
// //     height: 1,
// //     backgroundColor: '#e2e8f0',
// //     marginVertical: 14,
// //   },
// //   detailSectionLabel: {
// //     fontSize: 12,
// //     fontWeight: '700',
// //     color: '#94a3b8',
// //     textTransform: 'uppercase',
// //     letterSpacing: 0.5,
// //     marginBottom: 6,
// //   },
// //   detailMeaning: {
// //     fontSize: 16,
// //     color: '#1e293b',
// //     lineHeight: 24,
// //   },
// //   detailJpSentence: {
// //     fontSize: 18,
// //     fontWeight: '700',
// //     color: TEAL_DARK,
// //     lineHeight: 28,
// //   },
// //   detailBadgeRow: {
// //     flexDirection: 'row',
// //     flexWrap: 'wrap',
// //     gap: 8,
// //     marginTop: 12,
// //   },
// //   detailBadge: {
// //     paddingHorizontal: 10,
// //     paddingVertical: 4,
// //     borderRadius: 12,
// //   },
// //   detailBadgeText: {
// //     fontSize: 12,
// //     fontWeight: '600',
// //     color: '#475569',
// //   },
// //   detailExBox: {
// //     backgroundColor: '#f8fafc',
// //     borderRadius: 10,
// //     padding: 12,
// //     marginBottom: 8,
// //   },
// //   detailExJp: {
// //     fontSize: 15,
// //     fontWeight: '700',
// //     color: '#0f172a',
// //     marginBottom: 4,
// //   },
// //   detailExVi: {
// //     fontSize: 13,
// //     color: '#475569',
// //   },
// // });