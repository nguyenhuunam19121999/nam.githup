// ─────────────────────────────────────────────────────────────────────────────
// app/kanji-detail.tsx
// Đồng bộ tính năng với vocab-detail.tsx (loại từ, bảng chia từ, đầy đủ nghĩa,
// mẫu câu liên quan) — vẫn giữ 2 file riêng vì kanji có thêm modal "Cách viết"
// (nét vẽ + bộ thủ, hỗ trợ nhiều chữ trong 1 từ qua tab).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  Modal,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { BottomTabBar } from "../components/BottomTabBar";
import { AdBanner } from "../components/AdBanner";
import { useAuth } from "../artifacts/mirai-jp/hooks/useAuth";
import {
  useColors,
  useThemeMode,
  ThemeFadeOverlay,
} from "../artifacts/mirai-jp/hooks/useColors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Speech from "expo-speech";
import VocabImagePicker from "../components/VocabImagePicker";
import { KanjiStrokeOrder } from "../components/KanjiStrokeOrder";
import { WritingPracticeModal } from "../components/WritingPracticeModal";
import {
  getKanjiByCharFull,
  getExamplesByKanjiChar,
  type KanjiItem,
  type KanjiExample,
} from "../assets/data_JLPT_kanji";
import { findExamplesByVocab, ExampleSentence } from "../assets/sentences";
import { FeedbackSection } from "../components/FeedbackSection";
import AIExplainPanel from "../components/AIExplainPanel";
import { KeyboardAwareScrollViewCompat } from "../components/KeyboardAwareScrollViewCompat";

const MAX_EXAMPLES = 15;
const MODAL_KANJI_MAX_EXAMPLES = 15;

// ✅ CODE MỚI (Giữ lại tất cả ký tự)
function extractKanjiChars(text: string): string[] {
  const chars: string[] = [];
  const seen = new Set<string>();
  for (const c of text) {
    if (!seen.has(c)) {
      seen.add(c);
      chars.push(c);
    }
  }
  return chars;
}

// ============================================
// 📖 LOẠI TỪ + CHIA TỪ — bê nguyên logic từ vocab-detail.tsx
// (kanji_book_vocab đã có cùng cột wordType/isNaAdjective/... như vocab)
// ============================================

type WordType =
  | "godan"
  | "ichidan"
  | "sahen"
  | "kahen"
  | "irregular"
  | "i-adjective"
  | "na-adjective"
  | "noun-only"
  | "noun-suru";

const VALID_WORD_TYPES: WordType[] = [
  "godan",
  "ichidan",
  "sahen",
  "kahen",
  "irregular",
  "i-adjective",
  "na-adjective",
  "noun-only",
  "noun-suru",
];

function detectWordType(kanji: string, nghia: string = ""): WordType {
  const word = kanji;
  const meaning = nghia.toLowerCase();

  if (word === "する") return "irregular";
  if (word === "くる" || word === "来る") return "kahen";
  if (word.endsWith("する")) return "sahen";

  if (meaning.includes("tính từ đuôi i") || meaning.includes("i-adjective"))
    return "i-adjective";
  if (word.endsWith("い") && !word.endsWith("ない")) {
    const commonIAdjectives = [
      "高い", "安い", "新しい", "古い", "楽しい", "面白い",
      "美味しい", "暑い", "寒い", "大きい", "小さい",
    ];
    if (commonIAdjectives.includes(word)) return "i-adjective";
  }

  if (meaning.includes("tính từ đuôi na") || meaning.includes("na-adjective"))
    return "na-adjective";

  const lastChar = word.slice(-1);
  const godanEndings = ["う", "く", "ぐ", "す", "つ", "ぬ", "ぶ", "む"];
  if (godanEndings.includes(lastChar)) return "godan";
  if (lastChar === "る") {
    const prevChar = word.slice(-2, -1);
    if (["あ", "う", "お", "a", "u", "o"].includes(prevChar)) return "godan";
    return "ichidan";
  }

  const commonSuruNouns = [
    "勉強", "旅行", "運転", "結婚", "洗濯", "掃除", "準備",
    "練習", "復習", "予習", "説明", "質問", "回答", "連絡",
    "相談", "徹底",
  ];
  const canAddSuru =
    commonSuruNouns.includes(word) ||
    (word.length >= 2 && !word.endsWith("ん"));

  return canAddSuru ? "noun-suru" : "noun-only";
}

function resolveWordType(
  entry: { wordType?: string; isNaAdjective?: boolean },
  kanji: string,
  nghia: string = "",
): WordType {
  if (entry.isNaAdjective) return "na-adjective";
  if (entry.wordType && VALID_WORD_TYPES.includes(entry.wordType as WordType)) {
    return entry.wordType as WordType;
  }
  return detectWordType(kanji, nghia);
}

function conjugateGodan(verb: string): { name: string; japanese: string }[] {
  const lastChar = verb.slice(-1);
  const stem = verb.slice(0, -1);
  const godanMap: Record<string, {
    negative: string; te: string; past: string; potential: string;
    passive: string; causative: string; volitional: string;
    conditional: string; imperative: string;
  }> = {
    う: { negative: "わない", te: "って", past: "った", potential: "える", passive: "われる", causative: "わせる", volitional: "おう", conditional: "えば", imperative: "え" },
    く: { negative: "かない", te: "いて", past: "いた", potential: "ける", passive: "かれる", causative: "かせる", volitional: "こう", conditional: "けば", imperative: "け" },
    ぐ: { negative: "がない", te: "いで", past: "いだ", potential: "げる", passive: "がれる", causative: "がせる", volitional: "ごう", conditional: "げば", imperative: "げ" },
    す: { negative: "さない", te: "して", past: "した", potential: "せる", passive: "される", causative: "させる", volitional: "そう", conditional: "せば", imperative: "せ" },
    つ: { negative: "たない", te: "って", past: "った", potential: "てる", passive: "たれる", causative: "たせる", volitional: "とう", conditional: "てば", imperative: "て" },
    ぬ: { negative: "なない", te: "んで", past: "んだ", potential: "ねる", passive: "なれる", causative: "なせる", volitional: "のう", conditional: "ねば", imperative: "ね" },
    ぶ: { negative: "ばない", te: "んで", past: "んだ", potential: "べる", passive: "ばれる", causative: "ばせる", volitional: "ぼう", conditional: "べば", imperative: "べ" },
    む: { negative: "まない", te: "んで", past: "んだ", potential: "める", passive: "まれる", causative: "ませる", volitional: "もう", conditional: "めば", imperative: "め" },
    る: { negative: "らない", te: "って", past: "った", potential: "れる", passive: "られる", causative: "らせる", volitional: "ろう", conditional: "れば", imperative: "れ" },
  };
  const map = godanMap[lastChar];
  if (!map) return [];
  return [
    { name: "Từ điển (辞書形)", japanese: verb },
    { name: "Phủ định (ない形)", japanese: stem + map.negative },
    { name: "Quá khứ (た形)", japanese: stem + map.past },
    { name: "Phủ định quá khứ", japanese: stem + map.negative.slice(0, -1) + "かった" },
    { name: "て形", japanese: stem + map.te },
    { name: "Lịch sự (ます形)", japanese: stem + "います" },
    { name: "Khả năng (可能形)", japanese: stem + map.potential },
    { name: "Thụ động (受身形)", japanese: stem + map.passive },
    { name: "Sai khiến (使役形)", japanese: stem + map.causative },
    { name: "Sai khiến thụ động", japanese: stem + map.causative.slice(0, -2) + "せられる" },
    { name: "Điều kiện (条件形)", japanese: stem + map.conditional },
    { name: "Mệnh lệnh (命令形)", japanese: stem + map.imperative },
    { name: "Ý chí (意向形)", japanese: stem + map.volitional },
  ];
}

function conjugateIchidan(verb: string): { name: string; japanese: string }[] {
  const stem = verb.slice(0, -1);
  return [
    { name: "Từ điển (辞書形)", japanese: verb },
    { name: "Phủ định (ない形)", japanese: stem + "ない" },
    { name: "Quá khứ (た形)", japanese: stem + "た" },
    { name: "Phủ định quá khứ", japanese: stem + "なかった" },
    { name: "て形", japanese: stem + "て" },
    { name: "Lịch sự (ます形)", japanese: stem + "ます" },
    { name: "Khả năng (可能形)", japanese: stem + "られる" },
    { name: "Thụ động (受身形)", japanese: stem + "られる" },
    { name: "Sai khiến (使役形)", japanese: stem + "させる" },
    { name: "Sai khiến thụ động", japanese: stem + "させられる" },
    { name: "Điều kiện (条件形)", japanese: stem + "れば" },
    { name: "Mệnh lệnh (命令形)", japanese: stem + "ろ" },
    { name: "Ý chí (意向形)", japanese: stem + "よう" },
  ];
}

function conjugateSahen(verb: string): { name: string; japanese: string }[] {
  const stem = verb.replace("する", "");
  return [
    { name: "Từ điển (辞書形)", japanese: verb },
    { name: "Phủ định (ない形)", japanese: stem + "しない" },
    { name: "Quá khứ (た形)", japanese: stem + "した" },
    { name: "Phủ định quá khứ", japanese: stem + "しなかった" },
    { name: "て形", japanese: stem + "して" },
    { name: "Lịch sự (ます形)", japanese: stem + "します" },
    { name: "Khả năng (可能形)", japanese: stem + "できる" },
    { name: "Thụ động (受身形)", japanese: stem + "される" },
    { name: "Sai khiến (使役形)", japanese: stem + "させる" },
    { name: "Sai khiến thụ động", japanese: stem + "させられる" },
    { name: "Điều kiện (条件形)", japanese: stem + "すれば" },
    { name: "Mệnh lệnh (命令形)", japanese: stem + "しろ" },
    { name: "Ý chí (意向形)", japanese: stem + "しよう" },
  ];
}

function conjugateKahen(): { name: string; japanese: string }[] {
  return [
    { name: "Từ điển (辞書形)", japanese: "来る" },
    { name: "Phủ định (ない形)", japanese: "来ない" },
    { name: "Quá khứ (た形)", japanese: "来た" },
    { name: "Phủ định quá khứ", japanese: "来なかった" },
    { name: "て形", japanese: "来て" },
    { name: "Lịch sự (ます形)", japanese: "来ます" },
    { name: "Khả năng (可能形)", japanese: "来られる" },
    { name: "Thụ động (受身形)", japanese: "来られる" },
    { name: "Sai khiến (使役形)", japanese: "来させる" },
    { name: "Sai khiến thụ động", japanese: "来させられる" },
    { name: "Điều kiện (条件形)", japanese: "来れば" },
    { name: "Mệnh lệnh (命令形)", japanese: "来い" },
    { name: "Ý chí (意向形)", japanese: "来よう" },
  ];
}

function conjugateIAdjectiveFull(adj: string): { name: string; japanese: string }[] {
  const stem = adj.slice(0, -1);
  return [
    { name: "Từ điển (辞書形)", japanese: adj },
    { name: "Khẳng định (現在)", japanese: adj + "です" },
    { name: "Phủ định (現在)", japanese: stem + "くない" },
    { name: "Phủ định lịch sự", japanese: stem + "くないです" },
    { name: "Quá khứ (過去)", japanese: stem + "かった" },
    { name: "Quá khứ lịch sự", japanese: stem + "かったです" },
    { name: "Phủ định quá khứ", japanese: stem + "くなかった" },
    { name: "Phủ định quá khứ lịch sự", japanese: stem + "くなかったです" },
    { name: "て形", japanese: stem + "くて" },
    { name: "Điều kiện (条件形)", japanese: stem + "ければ" },
    { name: "Trạng từ hóa", japanese: stem + "く" },
  ];
}

function conjugateNaAdjectiveFull(adj: string): { name: string; japanese: string }[] {
  return [
    { name: "Từ điển (辞書形)", japanese: adj + "だ" },
    { name: "Khẳng định (現在)", japanese: adj + "です" },
    { name: "Phủ định (現在)", japanese: adj + "ではありません" },
    { name: "Phủ định (現在 - thân mật)", japanese: adj + "じゃない" },
    { name: "Quá khứ (過去)", japanese: adj + "でした" },
    { name: "Quá khứ (thân mật)", japanese: adj + "だった" },
    { name: "Phủ định quá khứ", japanese: adj + "ではありませんでした" },
    { name: "Phủ định quá khứ (thân mật)", japanese: adj + "じゃなかった" },
    { name: "て形", japanese: adj + "で" },
    { name: "Điều kiện (条件形)", japanese: adj + "なら" },
    { name: "Trạng từ hóa", japanese: adj + "に" },
  ];
}

function conjugateNoun(noun: string): { name: string; japanese: string }[] {
  return [
    { name: "Từ điển (辞書形)", japanese: noun },
    { name: "Khẳng định (現在)", japanese: noun + "です" },
    { name: "Phủ định (現在)", japanese: noun + "ではありません" },
    { name: "Phủ định (現在 - thân mật)", japanese: noun + "じゃない" },
    { name: "Quá khứ (過去)", japanese: noun + "でした" },
    { name: "Phủ định quá khứ", japanese: noun + "ではありませんでした" },
    { name: "Phủ định quá khứ (thân mật)", japanese: noun + "じゃなかった" },
    { name: "て形 (để nối câu)", japanese: noun + "で" },
    { name: "Điều kiện (条件形)", japanese: noun + "なら" },
  ];
}

function ConjugationTable({
  word,
  wordType,
  originalWord,
  c,
}: {
  word: string;
  wordType: WordType;
  originalWord: string;
  c: ReturnType<typeof useColors>;
}) {
  let conjugations: { name: string; japanese: string }[] = [];
  let displayTitle = "";

  switch (wordType) {
    case "godan":
      conjugations = conjugateGodan(word);
      displayTitle = `📖 Chia động từ nhóm 1 (Godan) - ${originalWord}`;
      break;
    case "ichidan":
      conjugations = conjugateIchidan(word);
      displayTitle = `📖 Chia động từ nhóm 2 (Ichidan) - ${originalWord}`;
      break;
    case "sahen":
      conjugations = conjugateSahen(word);
      displayTitle = `📖 Chia động từ nhóm 3 (Sahen) - ${originalWord}`;
      break;
    case "kahen":
      conjugations = conjugateKahen();
      displayTitle = `📖 Chia động từ bất quy tắc - 来る`;
      break;
    case "irregular":
      conjugations = conjugateSahen("する");
      displayTitle = `📖 Chia động từ bất quy tắc - する`;
      break;
    case "i-adjective":
      conjugations = conjugateIAdjectiveFull(word);
      displayTitle = `📖 Chia tính từ đuôi I - ${originalWord}`;
      break;
    case "na-adjective":
      conjugations = conjugateNaAdjectiveFull(word);
      displayTitle = `📖 Chia tính từ đuôi NA - ${originalWord}`;
      break;
    case "noun-suru":
      conjugations = conjugateSahen(word + "する");
      displayTitle = `📖 Chia động từ (Danh từ + する) - ${originalWord}する`;
      break;
    case "noun-only":
      conjugations = conjugateNoun(word);
      displayTitle = `📖 Biến thể danh từ - ${originalWord}`;
      break;
    default:
      return null;
  }

  if (conjugations.length === 0) return null;

  return (
    <View style={[styles.tableContainer, { backgroundColor: c.card, borderColor: c.border }]}>
      <Text style={[styles.tableTitle, { backgroundColor: c.muted, color: c.text, borderBottomColor: c.border }]}>
        {displayTitle}
      </Text>
      <View style={[styles.tableHeader, { backgroundColor: c.primary }]}>
        <Text style={[styles.headerCell, styles.headerName, { color: c.primaryForeground }]}>Tên thể</Text>
        <Text style={[styles.headerCell, styles.headerValue, { color: c.primaryForeground }]}>Từ vựng</Text>
      </View>
      <ScrollView nestedScrollEnabled={true} style={styles.tableScroll}>
        {conjugations.map((item, index) => (
          <View
            key={index}
            style={[
              styles.tableRow,
              { borderBottomColor: c.border },
              index % 2 === 0 && { backgroundColor: c.muted },
            ]}
          >
            <Text style={[styles.rowCell, styles.rowName, { color: c.text }]}>{item.name}</Text>
            <Text style={[styles.rowCell, styles.rowValue, { color: c.text }]}>{item.japanese}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function resolveConjugationTarget(
  entry: {
    isExtractedVerb?: boolean;
    extractedVerb?: string | null;
    isConjugatedForm?: boolean;
    conjugatedForm?: string | null;
  },
  kanji: string,
): { word: string; skip: boolean; baseNote?: string } {
  if (entry.isConjugatedForm) {
    return { word: kanji, skip: true, baseNote: entry.conjugatedForm ?? undefined };
  }
  if (entry.isExtractedVerb && entry.extractedVerb) {
    return { word: entry.extractedVerb, skip: false };
  }
  return { word: kanji, skip: false };
}

// ============================================
// 📱 TRANG CHÍNH
// ============================================

export default function KanjiDetailScreen() {
  const c = useColors();
  const { themeMode, timeOfDay } = useThemeMode();
  const isDark = themeMode === "dark" || (themeMode === "auto" && timeOfDay === "night");

  const router = useRouter();
  const { scopedKey } = useAuth();
  const params = useLocalSearchParams<{
    id?: string;
    kanji?: string;
    kanjiChars?: string;
    fromSearch?: string;
    hiragana?: string;
    han?: string;
    nghia?: string;
    jisho_meaning_en?: string;
    example?: string;
    exampleMeaning?: string;
    level?: string;
    wordType?: string;
    typeLabel?: string;
    isNaAdjective?: string;
    isExtractedVerb?: string;
    extractedVerb?: string;
    isConjugatedForm?: string;
    conjugatedForm?: string;
  }>();
  const id = typeof params.id === "string" ? params.id : "";
  const directKanji = typeof params.kanji === "string" ? params.kanji : "";
  const kanjiChars = useMemo(() => {
    const rawInput = (params.kanjiChars || params.kanji || id || directKanji || "").trim();
    if (!rawInput) return [];

    let list: string[] = [];
    try {
      list = JSON.parse(rawInput) as string[];
    } catch {
      list = rawInput.split(",").filter(Boolean);
    }

    const result: string[] = [];
    const seen = new Set<string>();
    for (const item of list) {
      for (const char of extractKanjiChars(item)) {
        if (!seen.has(char)) {
          seen.add(char);
          result.push(char);
        }
      }
    }
    return result;
  }, [params.kanjiChars, params.kanji, id, directKanji]);
  const joinedKanji = useMemo(() => kanjiChars.join(""), [kanjiChars]);
  const primaryChar = kanjiChars[0] || "";

  // ── Dữ liệu từ params (giống vocabData ở vocab-detail.tsx) ─────────────────
  const wordData = {
    id: params.id || joinedKanji,
    kanji: joinedKanji,
    hiragana: params.hiragana || "",
    han: params.han || "",
    nghia: params.nghia || "",
    jisho_meaning_en: params.jisho_meaning_en || "",
    example: params.example || "",
    exampleMeaning: params.exampleMeaning || "",
    level: params.level || "",
    wordType: params.wordType || undefined,
    typeLabel: params.typeLabel || undefined,
    isNaAdjective: params.isNaAdjective === "true",
    isExtractedVerb: params.isExtractedVerb === "true",
    extractedVerb: params.extractedVerb || null,
    isConjugatedForm: params.isConjugatedForm === "true",
    conjugatedForm: params.conjugatedForm || null,
  };
  const hasWordParams = !!(wordData.nghia || wordData.wordType || wordData.han);
  const [kanjiData, setKanjiData] = useState<KanjiItem | null>(null);
  const [examples, setExamples] = useState<KanjiExample[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllExamples, setShowAllExamples] = useState(false);
  const englishMeaning = params.jisho_meaning_en || (kanjiData as any)?.jisho_meaning_en || "";

  useEffect(() => {
    if (!primaryChar) {
      setKanjiData(null);
      setExamples([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setKanjiData(null);
    setExamples([]);
    const rafId = requestAnimationFrame(() => {
      const data = getKanjiByCharFull(primaryChar) || null;
      setKanjiData(data);
      const inlineExamples = (data as any)?.examples || [];
      const vocabExamples = getExamplesByKanjiChar(primaryChar, MAX_EXAMPLES);
      const combined = [...inlineExamples];
      for (const ex of vocabExamples) {
        if (combined.length >= MAX_EXAMPLES) break;
        if (!combined.some((existing: any) => existing.jp === ex.jp)) {
          combined.push(ex);
        }
      }
      setExamples(combined);
      setLoading(false);
    });
    return () => cancelAnimationFrame(rafId);
  }, [primaryChar]);

  // ── Mẫu câu liên quan tới cả từ (giống vocab-detail.tsx) ───────────────────
  const [relatedExamples, setRelatedExamples] = useState<ExampleSentence[]>([]);
  useEffect(() => {
    let cancelled = false;
    const loadExamples = async () => {
      if (!joinedKanji) return;
      const ex = await findExamplesByVocab(joinedKanji);
      if (!cancelled) setRelatedExamples(ex);
    };
    loadExamples();
    return () => {
      cancelled = true;
    };
  }, [joinedKanji]);

  // ── Ghim (bookmark) ─────────────────────────────────────────────────────────
  const [isBookmarked, setIsBookmarked] = useState(false);
  const bookmarkId = joinedKanji;

  useEffect(() => {
    const checkBookmark = async () => {
      try {
        const saved = await AsyncStorage.getItem(scopedKey("kanji_bookmarks"));
        if (saved) {
          const bookmarks = new Set(JSON.parse(saved));
          setIsBookmarked(!!bookmarkId && bookmarks.has(bookmarkId));
        } else {
          setIsBookmarked(false);
        }
      } catch (e) {}
    };
    if (bookmarkId) checkBookmark();
    else setIsBookmarked(false);
  }, [bookmarkId, scopedKey]);

  const toggleBookmark = async () => {
    if (!bookmarkId) return;
    try {
      const saved = await AsyncStorage.getItem(scopedKey("kanji_bookmarks"));
      const bookmarks = saved ? new Set(JSON.parse(saved)) : new Set();
      if (bookmarks.has(bookmarkId)) {
        bookmarks.delete(bookmarkId);
        Alert.alert("⭐ Bỏ ghim", `Đã xóa "${joinedKanji}" khỏi danh sách ghim`);
      } else {
        bookmarks.add(bookmarkId);
        Alert.alert("⭐ Đã ghim", `Đã thêm "${joinedKanji}" vào danh sách ghim`);
      }
      await AsyncStorage.setItem(scopedKey("kanji_bookmarks"), JSON.stringify([...bookmarks]));
      setIsBookmarked(!isBookmarked);
    } catch (e) {}
  };

  const speakWord = () => {
    if (joinedKanji) {
      Speech.speak(joinedKanji, { language: "ja-JP", pitch: 1, rate: 0.8 });
    }
  };

  // ── Modal Ảnh minh họa ───────────────────────────────────────────────────────
  const [showImageModal, setShowImageModal] = useState(false);

  // ── Modal "Cách viết" — nét vẽ + bộ thủ, tab chuyển từng chữ ────────────────
  const [showStrokeModal, setShowStrokeModal] = useState(false);
  const [strokeTabIndex, setStrokeTabIndex] = useState(0);
  const [modalKanjiData, setModalKanjiData] = useState<KanjiItem | null>(null);
  const [modalKanjiExamples, setModalKanjiExamples] = useState<KanjiExample[]>([]);
  const [modalKanjiLoading, setModalKanjiLoading] = useState(false);

  useEffect(() => {
    if (!showStrokeModal) return;
    const activeChar = kanjiChars[strokeTabIndex] || kanjiChars[0] || "";
    if (!activeChar) {
      setModalKanjiData(null);
      setModalKanjiExamples([]);
      setModalKanjiLoading(false);
      return;
    }
    setModalKanjiLoading(true);
    setModalKanjiData(null);
    setModalKanjiExamples([]);
    const rafId = requestAnimationFrame(() => {
      const data = getKanjiByCharFull(activeChar) || null;
      setModalKanjiData(data);
      const inlineExamples = (data as any)?.examples || [];
      const vocabExamples = getExamplesByKanjiChar(activeChar, MODAL_KANJI_MAX_EXAMPLES);
      const combined = [...inlineExamples];
      for (const ex of vocabExamples) {
        if (combined.length >= MODAL_KANJI_MAX_EXAMPLES) break;
        if (!combined.some((existing: any) => existing.jp === ex.jp)) {
          combined.push(ex);
        }
      }
      setModalKanjiExamples(combined);
      setModalKanjiLoading(false);
    });
    return () => cancelAnimationFrame(rafId);
  }, [showStrokeModal, strokeTabIndex, kanjiChars]);

  // ── Modal Luyện viết ─────────────────────────────────────────────────────────
  const [writingModalOpen, setWritingModalOpen] = useState(false);
  const [writingInitialIndex, setWritingInitialIndex] = useState(0);

  const handleOpenWritingPractice = () => {
    if (kanjiChars.length === 0) return;
    const idx = strokeTabIndex < kanjiChars.length ? strokeTabIndex : 0;
    setWritingInitialIndex(idx);
    setWritingModalOpen(true);
  };

  // ── Loại từ + bảng chia từ (giống hệt vocab-detail.tsx) ─────────────────────
  const wordType = resolveWordType(wordData, wordData.kanji, wordData.nghia);
  const { word: conjugationWord, skip: skipConjugation, baseNote } =
    resolveConjugationTarget(wordData, wordData.kanji);

  const getWordTypeText = () => {
    if (wordData.typeLabel) return wordData.typeLabel;
    switch (wordType) {
      case "godan": return "Động từ nhóm 1 (Godan - 五段動詞)";
      case "ichidan": return "Động từ nhóm 2 (Ichidan - 一段動詞)";
      case "sahen": return "Động từ nhóm 3 (Sahen - サ変動詞)";
      case "kahen": return "Động từ bất quy tắc (カ変動詞 - 来る)";
      case "irregular": return "Động từ bất quy tắc (する)";
      case "i-adjective": return "Tính từ đuôi I (I-Adjective)";
      case "na-adjective": return "Tính từ đuôi NA (Na-Adjective)";
      case "noun-suru": return "Danh từ (có thể thêm する để thành động từ)";
      case "noun-only": return "Danh từ (Noun)";
      default: return "Từ vựng";
    }
  };

  // Nghĩa hiển thị chính — ưu tiên params (từ danh sách bài học),
  // fallback về dữ liệu chữ Hán đơn (bảng kanji master).
  const displayHanViet = wordData.han || kanjiData?.hanviet?.join(" • ") || "";
  const displayHiragana =
    wordData.hiragana ||
    [...(kanjiData?.readings?.onyomi || []), ...(kanjiData?.readings?.kunyomi || [])].join("、");
  const displayNghia = wordData.nghia || kanjiData?.meanings_vi?.[0] || "";
  const displayLevel = wordData.level || kanjiData?.jlpt || "N3";

  if (!primaryChar) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Text style={[styles.errorText, { color: c.destructive }]}>
          Không tìm thấy dữ liệu Kanji
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: c.primary }]}>
          <Text style={[styles.backBtnText, { color: c.primaryForeground }]}>← Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={c.background} />

      <View style={[styles.container, { backgroundColor: c.background }]}>
        <View style={[styles.header, { backgroundColor: c.background }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backBtnHeader, { backgroundColor: c.card, borderColor: c.border }]}
          >
            <Text style={[styles.backIcon, { color: c.primary }]}>‹</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: c.primary }]}>Chi tiết Kanji</Text>
          <View style={{ width: 42 }} />
        </View>

        <KeyboardAwareScrollViewCompat style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.bigKanji, { color: c.text }]}>{joinedKanji}</Text>
                <Text style={[styles.bigHanViet, { color: c.primary }]}>{displayHanViet}</Text>
                <Text style={[styles.bigHiragana, { color: c.text }]}>{displayHiragana}</Text>
                <Text style={[styles.bigNghia, { color: c.mutedForeground }]}>{displayNghia}</Text>
              </View>
              <View style={styles.headerActions}>
                <TouchableOpacity
                  onPress={toggleBookmark}
                  style={[styles.iconBtn, { backgroundColor: c.card, borderColor: c.border }]}
                >
                  <Text style={styles.iconText}>{isBookmarked ? "⭐" : "☆"}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={speakWord}
                  style={[styles.iconBtn, { backgroundColor: c.card, borderColor: c.border }]}
                >
                  <Text style={styles.iconText}>🔊</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: c.border }]} />

            <View style={styles.funcRow}>
              <TouchableOpacity
                style={[styles.funcBtn, { backgroundColor: c.muted }]}
                onPress={() => setShowImageModal(true)}
              >
                <Text style={[styles.funcBtnText, { color: c.mutedForeground }]} numberOfLines={1} adjustsFontSizeToFit>
                  🖼️ Ảnh minh họa
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.funcBtn, { backgroundColor: c.muted }]}
                onPress={() => { setStrokeTabIndex(0); setShowStrokeModal(true); }}
              >
                <Text style={[styles.funcBtnText, { color: c.mutedForeground }]} numberOfLines={1} adjustsFontSizeToFit>
                  ✎ Cách viết
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.funcBtn, { backgroundColor: c.muted }]}
                onPress={handleOpenWritingPractice}
              >
                <Text style={[styles.funcBtnText, { color: c.mutedForeground }]} numberOfLines={1} adjustsFontSizeToFit>
                  ✍️ Luyện viết
                </Text>
              </TouchableOpacity>
            </View>

            {/* Modal Ảnh minh họa */}
            <Modal visible={showImageModal} transparent animationType="slide" onRequestClose={() => setShowImageModal(false)}>
              <View style={styles.modalOverlay}>
                <View style={[styles.imageModalContainer, { backgroundColor: c.card }]}>
                  <View style={[styles.imageModalHeader, { borderBottomColor: c.border }]}>
                    <Text style={[styles.imageModalTitle, { color: c.text }]}>📸 Đóng góp hình ảnh</Text>
                    <TouchableOpacity onPress={() => setShowImageModal(false)}>
                      <Text style={[styles.imageModalClose, { color: c.mutedForeground }]}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  <ScrollView style={styles.imageModalContent}>
                    <VocabImagePicker
                      vocabId={wordData.id || joinedKanji}
                      vocabWord={joinedKanji || id}
                      vocabMeaning={displayNghia || kanjiData?.meanings_vi?.join(", ") || ""}
                      vocabMeaningEn={englishMeaning}
                      onImagesSelected={(_images) => {
                        setShowImageModal(false);
                      }}
                    />
                  </ScrollView>
                </View>
                <ThemeFadeOverlay />
              </View>
            </Modal>

            {/* Modal Cách viết — nét vẽ + bộ thủ, tab chuyển từng chữ */}
            <Modal visible={showStrokeModal} transparent animationType="slide" onRequestClose={() => setShowStrokeModal(false)}>
              <View style={styles.modalOverlay}>
                <View style={[styles.imageModalContainer, { backgroundColor: c.card }]}>
                  <View style={[styles.imageModalHeader, { borderBottomColor: c.border }]}>
                    <Text style={[styles.imageModalTitle, { color: c.text }]}>✎ Cách viết: {joinedKanji}</Text>
                    <TouchableOpacity onPress={() => setShowStrokeModal(false)}>
                      <Text style={[styles.imageModalClose, { color: c.mutedForeground }]}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  {kanjiChars.length > 1 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.strokeTabBar, { borderBottomColor: c.border }]}>
                      <View style={{ flexDirection: "row" }}>
                        {kanjiChars.map((char, idx) => (
                          <TouchableOpacity
                            key={`${char}_${idx}`}
                            onPress={() => setStrokeTabIndex(idx)}
                            style={[styles.strokeTabItem, { borderBottomColor: strokeTabIndex === idx ? c.primary : "transparent" }]}
                          >
                            <Text style={[styles.strokeTabText, { color: strokeTabIndex === idx ? c.primary : c.mutedForeground }]}>
                              {char}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  )}

                  <ScrollView style={styles.imageModalContent} contentContainerStyle={{ paddingVertical: 12, paddingHorizontal: 4 }}>
                    {modalKanjiLoading ? (
                      <View style={{ paddingVertical: 40, alignItems: "center" }}>
                        <Text style={{ color: c.mutedForeground }}>Đang tải...</Text>
                      </View>
                    ) : !modalKanjiData ? (
                      <View style={{ paddingVertical: 40, alignItems: "center" }}>
                        <Text style={{ color: c.mutedForeground, textAlign: "center" }}>
                          Không tìm thấy chữ &quot;{kanjiChars[strokeTabIndex] || kanjiChars[0]}&quot; trong cơ sở dữ liệu.
                        </Text>
                      </View>
                    ) : (
                      <>
                        <View style={styles.kdHeaderRow}>
                          <Text style={[styles.kdBigKanji, { color: c.text }]}>{modalKanjiData.kanji}</Text>
                          <Text style={[styles.kdBigHanViet, { color: c.mutedForeground }]}>
                            {modalKanjiData.hanviet?.join(" • ") || ""}
                          </Text>
                        </View>
                        <View style={[styles.kdDivider, { backgroundColor: c.border }]} />

                        <Text style={[styles.kdSectionTitle, { color: c.text }]}>Phát âm</Text>
                        {modalKanjiData.readings?.kunyomi?.length > 0 && (
                          <View style={styles.kdPronRow}>
                            <Text style={[styles.kdDiamond, { color: c.accent }]}>◆</Text>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.kdPronLabel, { color: c.primary }]}>Kunyomi</Text>
                              <Text style={[styles.kdPronValue, { color: c.text }]}>
                                {modalKanjiData.readings.kunyomi.join("、")}
                              </Text>
                            </View>
                          </View>
                        )}
                        {modalKanjiData.readings?.onyomi?.length > 0 && (
                          <View style={styles.kdPronRow}>
                            <Text style={[styles.kdDiamond, { color: c.accent }]}>◆</Text>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.kdPronLabel, { color: c.primary }]}>Onyomi</Text>
                              <Text style={[styles.kdPronValue, { color: c.text }]}>
                                {modalKanjiData.readings.onyomi.join("、")}
                              </Text>
                            </View>
                          </View>
                        )}

                        <View style={{ alignItems: "center", marginVertical: 12 }}>
                          <KanjiStrokeOrder kanji={modalKanjiData.kanji} size={200} />
                        </View>

                        <View style={styles.kdStatsRow}>
                          <View style={styles.kdStatCol}>
                            <View style={[styles.kdStatChip, { backgroundColor: c.muted, borderColor: c.border }]}>
                              <Text style={[styles.kdStatChipText, { color: c.mutedForeground }]}>JLPT</Text>
                            </View>
                            <Text style={[styles.kdStatValue, { color: c.primary }]}>{modalKanjiData.jlpt || "—"}</Text>
                          </View>
                          <View style={styles.kdStatCol}>
                            <View style={[styles.kdStatChip, { backgroundColor: c.muted, borderColor: c.border }]}>
                              <Text style={[styles.kdStatChipText, { color: c.mutedForeground }]}>Tần suất</Text>
                            </View>
                            <Text style={[styles.kdStatValue, { color: c.primary }]}>
                              {modalKanjiData.freq ? `#${modalKanjiData.freq}/2500` : "—"}
                            </Text>
                          </View>
                          <View style={styles.kdStatCol}>
                            <View style={[styles.kdStatChip, { backgroundColor: c.muted, borderColor: c.border }]}>
                              <Text style={[styles.kdStatChipText, { color: c.mutedForeground }]}>Số nét</Text>
                            </View>
                            <Text style={[styles.kdStatValue, { color: c.primary }]}>{modalKanjiData.strokes || "—"}</Text>
                          </View>
                        </View>

                        <View style={[styles.kdDivider, { backgroundColor: c.border }]} />

                        {(modalKanjiData.components ?? []).length > 0 && (
                          <>
                            <Text style={[styles.kdSectionTitle, { color: c.text }]}>Bộ & Phân tích</Text>
                            {(modalKanjiData.components ?? []).map((comp, i) => (
                              <View key={i} style={styles.kdBushuRow}>
                                <View style={[styles.kdBushuBar, { backgroundColor: c.accent }]} />
                                <Text style={[styles.kdBushuKanji, { color: c.text }]}>{comp.kanji}</Text>
                                {comp.hanViet ? (
                                  <Text style={[styles.kdBushuHanViet, { color: c.mutedForeground }]}>{comp.hanViet}</Text>
                                ) : null}
                              </View>
                            ))}
                            <View style={[styles.kdDivider, { backgroundColor: c.border }]} />
                          </>
                        )}

                        <Text style={[styles.kdSectionTitle, { color: c.text }]}>Nghĩa</Text>
                        {modalKanjiData.meanings_vi?.map((m, i) => (
                          <View key={i} style={styles.kdMeaningRow}>
                            <Text style={[styles.kdMeaningDot, { color: c.accent }]}>•</Text>
                            <Text style={[styles.kdMeaningText, { color: c.text }]}>{m}</Text>
                          </View>
                        ))}

                        {modalKanjiExamples.length > 0 && (
                          <>
                            <View style={[styles.kdDivider, { backgroundColor: c.border }]} />
                            <Text style={[styles.kdSectionTitle, { color: c.text }]}>Ví dụ {modalKanjiExamples.length}</Text>
                            {modalKanjiExamples.map((ex, i) => (
                              <View key={i} style={styles.kdExampleRow}>
                                <Text style={[styles.kdExampleJp, { color: c.text }]}>{ex.jp}</Text>
                                <Text style={[styles.kdExampleReading, { color: c.primary }]}>{ex.reading}</Text>
                                <Text style={[styles.kdExampleVi, { color: c.mutedForeground }]}>→ {ex.vi}</Text>
                              </View>
                            ))}
                          </>
                        )}
                      </>
                    )}
                  </ScrollView>
                </View>
                <ThemeFadeOverlay />
              </View>
            </Modal>

            {/* Trình độ */}
            <View style={styles.levelRow}>
              <Text style={[styles.levelLabel, { color: c.mutedForeground }]}>Trình độ:</Text>
              <View style={[styles.levelBadge, { backgroundColor: getLevelColor(displayLevel) + "20" }]}>
                <Text style={[styles.levelText, { color: getLevelColor(displayLevel) }]}>
                  JLPT {displayLevel}
                </Text>
              </View>
            </View>

            {/* Loại từ + Đầy đủ nghĩa — giống hệt vocab-detail.tsx */}
            <View style={[styles.fullMeaningBox, { backgroundColor: c.primary + "14" }]}>
              <Text style={[styles.fullMeaningTitle, { color: c.primary }]}>📖 Đầy đủ nghĩa và cách dùng:</Text>
              {displayNghia ? (
                <Text style={[styles.fullMeaningText, { color: c.text }]}>
                  • {joinedKanji} ({displayHiragana}): {displayNghia}
                </Text>
              ) : (
                kanjiData?.meanings_vi?.map((m, i) => (
                  <Text key={i} style={[styles.fullMeaningText, { color: c.text }]}>• {m}</Text>
                ))
              )}
              {hasWordParams && (
                <Text style={[styles.fullMeaningText, { color: c.text }]}>
                  • Loại từ: {getWordTypeText()}
                </Text>
              )}
              {hasWordParams && wordType === "noun-suru" && (
                <Text style={[styles.fullMeaningText, { color: c.text }]}>
                  • Có thể thêm する để tạo động từ: {joinedKanji}する
                </Text>
              )}
              {hasWordParams && wordType === "noun-only" && (
                <Text style={[styles.fullMeaningText, { color: c.text }]}>
                  • Danh từ thuần túy, không thêm する
                </Text>
              )}
            </View>

            {displayNghia ? (
              <View style={styles.meaningSection}>
                <Text style={[styles.meaningNumber, { color: c.primary }]}>1.</Text>
                <Text style={[styles.meaningText, { color: c.text }]}>{displayNghia}</Text>
              </View>
            ) : null}

            {/* Tra cứu từ AI */}
            <AIExplainPanel type="kanji" word={joinedKanji} context={displayNghia} />

            {/* Ví dụ đơn (nếu có truyền từ danh sách) */}
            {wordData.example && (
              <View style={[styles.exampleBox, { backgroundColor: c.primary + "14" }]}>
                <Text style={[styles.exampleJp, { color: c.primary }]}>{wordData.example}</Text>
                {wordData.exampleMeaning && (
                  <Text style={[styles.exampleVi, { color: c.text }]}>{wordData.exampleMeaning}</Text>
                )}
              </View>
            )}

            {/* Mẫu câu liên quan tới cả từ */}
            {relatedExamples.length > 0 && (
              <View style={styles.examplesSection}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: c.text }]}>📖 Mẫu câu ví dụ</Text>
                  <Text style={[styles.sectionCount, { color: c.mutedForeground }]}>{relatedExamples.length} câu</Text>
                </View>
                {(showAllExamples ? relatedExamples : relatedExamples.slice(0, 3)).map((item) => (
                  <View key={item.id} style={[styles.exampleCard, { backgroundColor: c.muted, borderColor: c.border }]}>
                    <Text style={[styles.exampleJp, { color: c.primary }]}>{item.jp}</Text>
                    <Text style={[styles.exampleVi, { color: c.mutedForeground }]}>{item.vi}</Text>
                  </View>
                ))}
                {relatedExamples.length > 3 && (
                  <TouchableOpacity
                    style={[styles.showMoreBtn, { backgroundColor: c.muted }]}
                    onPress={() => setShowAllExamples(!showAllExamples)}
                  >
                    <Text style={[styles.showMoreText, { color: c.primary }]}>
                      {showAllExamples ? "📖 Thu gọn" : `📖 Xem thêm ${relatedExamples.length - 3} câu`}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Ví dụ riêng của chữ Hán (từ getExamplesByKanjiChar) — chỉ hiện khi
                không trùng với relatedExamples và khi chưa loading */}
            {!loading && examples.length > 0 && relatedExamples.length === 0 && (
              <View style={styles.examplesSection}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: c.text }]}>📖 Mẫu câu chứa chữ này</Text>
                  <Text style={[styles.sectionCount, { color: c.mutedForeground }]}>{examples.length} câu</Text>
                </View>
                {(showAllExamples ? examples : examples.slice(0, 3)).map((item, i) => (
                  <View key={i} style={[styles.exampleCard, { backgroundColor: c.muted, borderColor: c.border }]}>
                    <Text style={[styles.exampleJp, { color: c.primary }]}>{item.jp}</Text>
                    <Text style={[styles.exampleReading, { color: c.text }]}>{item.reading}</Text>
                    <Text style={[styles.exampleVi, { color: c.mutedForeground }]}>→ {item.vi}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Bảng chia từ — chỉ hiện khi có dữ liệu wordType/nghia (từ danh sách bài học) */}
            {hasWordParams && (
              skipConjugation ? (
                <View style={[styles.wordTypeRow, { backgroundColor: c.muted }]}>
                  <Text style={[styles.wordTypeText, { color: c.text }]}>
                    📌 Đây là dạng chia sẵn của: {baseNote || "—"}
                  </Text>
                </View>
              ) : (
                <ConjugationTable word={conjugationWord} wordType={wordType} originalWord={joinedKanji} c={c} />
              )
            )}
          </View>

          <View style={{ paddingHorizontal: 12 }}>
            <FeedbackSection pageKey={`kanji-detail::${joinedKanji}`} />
          </View>
          <View style={{ height: 40 }} />
        </KeyboardAwareScrollViewCompat>

        <BottomTabBar />
        <AdBanner />
      </View>

      <WritingPracticeModal
        chars={writingModalOpen ? kanjiChars : null}
        initialIndex={writingInitialIndex}
        onClose={() => setWritingModalOpen(false)}
      />
    </>
  );
}

function getLevelColor(level?: string) {
  switch (level) {
    case "N5": return "#22C55E";
    case "N4": return "#3B82F6";
    case "N3": return "#F59E0B";
    case "N2": return "#EA580C";
    case "N1": return "#C0392B";
    default: return "#94A3B8";
  }
}

// ─── Styles — giữ nguyên toàn bộ pattern cũ + thêm phần từ vocab-detail.tsx ──
const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { fontSize: 16, marginBottom: 16, textAlign: "center" },
  backBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  backBtnText: { fontSize: 14, fontWeight: "600" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16,
  },
  backBtnHeader: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
  backIcon: { fontSize: 28, fontWeight: "300", marginTop: -4 },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  content: { flex: 1, paddingHorizontal: 16 },
  headerRow: { flexDirection: "row", alignItems: "flex-start" },
  bigKanji: { fontSize: 32, fontWeight: "800", lineHeight: 40 },
  bigHanViet: { fontSize: 18, fontWeight: "700", letterSpacing: 1, marginTop: 2 },
  bigHiragana: { fontSize: 16, marginTop: 2 },
  bigNghia: { fontSize: 15, marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 14 },
  headerActions: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  iconBtn: { width: 42, height: 42, borderWidth: 1.5, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  iconText: { fontSize: 20 },
  card: {
    borderRadius: 16, padding: 20, marginBottom: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8,
    elevation: 3, borderWidth: 1,
  },
  funcRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  funcBtn: {
    flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 10,
    paddingHorizontal: 4, marginHorizontal: 4, borderRadius: 20, minHeight: 40,
  },
  funcBtnText: { fontSize: 11, fontWeight: "600", textAlign: "center" },
  levelRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  levelLabel: { fontSize: 14, fontWeight: "600", marginRight: 8 },
  levelBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16 },
  levelText: { fontSize: 12, fontWeight: "700" },
  wordTypeRow: { padding: 12, borderRadius: 12, marginBottom: 16 },
  wordTypeText: { fontSize: 13, lineHeight: 18, marginBottom: 8 },
  fullMeaningBox: { padding: 12, borderRadius: 12, marginBottom: 16 },
  fullMeaningTitle: { fontSize: 13, fontWeight: "700", marginBottom: 8 },
  fullMeaningText: { fontSize: 13, lineHeight: 20, marginBottom: 4 },
  meaningSection: { flexDirection: "row", marginBottom: 16 },
  meaningNumber: { fontSize: 16, fontWeight: "700", marginRight: 8, width: 24 },
  meaningText: { fontSize: 16, flex: 1, lineHeight: 24 },
  exampleBox: { padding: 16, borderRadius: 12, marginBottom: 16 },
  exampleJp: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  exampleReading: { fontSize: 13, marginBottom: 4 },
  exampleVi: { fontSize: 14, lineHeight: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12, marginTop: 8 },
  examplesSection: { marginTop: 20 },
  exampleCard: { padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12, marginTop: 8 },
  sectionCount: { fontSize: 12, fontWeight: "500" },
  showMoreBtn: { alignItems: "center", paddingVertical: 12, marginTop: 4, borderRadius: 12 },
  showMoreText: { fontSize: 13, fontWeight: "600" },
  tableContainer: { marginTop: 20, marginBottom: 16, borderRadius: 12, overflow: "hidden", borderWidth: 1 },
  tableTitle: { fontSize: 14, fontWeight: "700", padding: 12, borderBottomWidth: 1 },
  tableHeader: { flexDirection: "row", paddingVertical: 12, paddingHorizontal: 16 },
  headerCell: { fontSize: 13, fontWeight: "700" },
  headerName: { flex: 0.5 },
  headerValue: { flex: 0.5 },
  tableScroll: { maxHeight: 400 },
  tableRow: { flexDirection: "row", paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1 },
  rowCell: { fontSize: 12 },
  rowName: { flex: 0.4, fontWeight: "500" },
  rowValue: { flex: 0.6, fontFamily: "monospace", paddingLeft: 36 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  imageModalContainer: { borderRadius: 24, padding: 20, width: "90%", maxHeight: "85%", alignSelf: "center" },
  imageModalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1,
  },
  imageModalTitle: { fontSize: 18, fontWeight: "700" },
  imageModalClose: { fontSize: 20, fontWeight: "600", padding: 8 },
  imageModalContent: { maxHeight: "90%" },
  strokeTabBar: { maxHeight: 48, borderBottomWidth: 1, marginBottom: 4 },
  strokeTabItem: { paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 2, minHeight: 36, justifyContent: "center" },
  strokeTabText: { fontSize: 18, fontWeight: "700" },
  kdHeaderRow: { alignItems: "center", marginBottom: 4 },
  kdBigKanji: { fontSize: 32, fontWeight: "800", lineHeight: 40 },
  kdBigHanViet: { fontSize: 16, fontWeight: "700", letterSpacing: 1, marginTop: 2 },
  kdDivider: { height: StyleSheet.hairlineWidth, marginVertical: 14 },
  kdSectionTitle: { fontSize: 15, fontWeight: "800", marginBottom: 10 },
  kdPronRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10, flexWrap: "wrap" },
  kdDiamond: { fontSize: 16, marginRight: 8, marginTop: 4 },
  kdPronLabel: { fontSize: 13, fontWeight: "700" },
  kdPronValue: { fontSize: 18, marginTop: 2, flex: 1, flexWrap: "wrap", paddingRight: 8 },
  kdStatsRow: { flexDirection: "row", marginTop: 4, paddingHorizontal: 4 },
  kdStatCol: { flex: 1, alignItems: "center" },
  kdStatChip: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 14, borderWidth: 1 },
  kdStatChipText: { fontSize: 11, fontWeight: "600" },
  kdStatValue: { fontSize: 16, fontWeight: "800", marginTop: 6 },
  kdBushuRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  kdBushuBar: { width: 3, height: 18, marginRight: 8, borderRadius: 2 },
  kdBushuKanji: { fontSize: 26, fontWeight: "700", marginRight: 6 },
  kdBushuHanViet: { fontSize: 13 },
  kdMeaningRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 6 },
  kdMeaningDot: { fontSize: 16, marginRight: 8 },
  kdMeaningText: { flex: 1, fontSize: 16, lineHeight: 22 },
  kdExampleRow: { marginBottom: 12, paddingLeft: 4 },
  kdExampleJp: { fontSize: 18, fontWeight: "700" },
  kdExampleReading: { fontSize: 14, marginTop: 2 },
  kdExampleVi: { fontSize: 14, marginTop: 2 },
});