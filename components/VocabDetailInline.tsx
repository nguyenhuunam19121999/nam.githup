// components/VocabDetailInline.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import VocabImagePicker from './VocabImagePicker';
import { findExamplesByVocab, ExampleSentence } from '../assets/sentences';

const TEAL = "#1f7a1f";
const TEAL_DARK = "#1c5765";
const BG_GRAY = "#f0f4f8";

// ============================================
// INTERFACE PROPS
// ============================================

// Props interface — thêm field mới
interface VocabDetailInlineProps {
  kanji: string;
  hiragana?: string;
  hira?: string;
  han?: string;
  nghia?: string;
  example?: string;
  exampleMeaning?: string;
  level?: string;
  id?: string;
  wordType?: string;
  typeLabel?: string;
  isNaAdjective?: boolean;
  isExtractedVerb?: boolean;
  extractedVerb?: string | null;
  isConjugatedForm?: boolean;
  conjugatedForm?: string | null;
  onClose: () => void;
}
// interface VocabDetailInlineProps {
//   kanji: string;
//   hiragana?: string;
//   hira?: string;
//   han?: string;
//   nghia?: string;
//   example?: string;
//   exampleMeaning?: string;
//   level?: string;
//   id?: string;
//   onClose: () => void;
// }

// ============================================
// LOẠI TỪ
// ============================================
type WordType = 'godan' | 'ichidan' | 'sahen' | 'kahen' | 'irregular' | 'i-adjective' | 'na-adjective' | 'noun-only' | 'noun-suru';

const VALID_WORD_TYPES: WordType[] = [
  'godan', 'ichidan', 'sahen', 'kahen', 'irregular',
  'i-adjective', 'na-adjective', 'noun-only', 'noun-suru',
];

function detectWordType(kanji: string, nghia: string = ''): WordType {
  const word = kanji;
  const meaning = nghia.toLowerCase();
  if (word === 'する') return 'irregular';
  if (word === 'くる' || word === '来る') return 'kahen';
  if (word.endsWith('する')) return 'sahen';
  if (meaning.includes('tính từ đuôi i') || meaning.includes('i-adjective')) return 'i-adjective';
  if (word.endsWith('い') && !word.endsWith('ない')) {
    const commonIAdjectives = ['高い', '安い', '新しい', '古い', '楽しい', '面白い', '美味しい', '暑い', '寒い', '大きい', '小さい'];
    if (commonIAdjectives.includes(word)) return 'i-adjective';
  }
  if (meaning.includes('tính từ đuôi na') || meaning.includes('na-adjective')) return 'na-adjective';
  const lastChar = word.slice(-1);
  const godanEndings = ['う', 'く', 'ぐ', 'す', 'つ', 'ぬ', 'ぶ', 'む'];
  if (godanEndings.includes(lastChar)) return 'godan';
  if (lastChar === 'る') {
    const prevChar = word.slice(-2, -1);
    if (['あ', 'う', 'お'].includes(prevChar)) return 'godan';
    return 'ichidan';
  }
  const commonSuruNouns = ['勉強', '旅行', '運転', '結婚', '洗濯', '掃除', '準備', '練習', '復習', '予習', '説明', '質問', '回答', '連絡', '相談', '徹底'];
  const canAddSuru = commonSuruNouns.includes(word) || (word.length >= 2 && !word.endsWith('ん'));
  return canAddSuru ? 'noun-suru' : 'noun-only';
}

function resolveWordType(
  entry: { wordType?: string; isNaAdjective?: boolean },
  kanji: string,
  nghia: string = ''
): WordType {
  // Ưu tiên tuyệt đối: field isNaAdjective từ JSON (đáng tin hơn wordType text)
  if (entry.isNaAdjective) return 'na-adjective';
  // Ưu tiên 2: đọc thẳng wordType đã tính sẵn trong JSON
  if (entry.wordType && VALID_WORD_TYPES.includes(entry.wordType as WordType)) {
    return entry.wordType as WordType;
  }
  // Fallback: chỉ đoán khi entry cũ chưa có field này
  return detectWordType(kanji, nghia);
}

// ============================================
// BẢNG CHIA TỪ (tất cả nhóm)
// ============================================
function conjugateGodan(verb: string) {
  const lastChar = verb.slice(-1);
  const stem = verb.slice(0, -1);
  const godanMap: Record<string, any> = {
    'う': { negative: 'わない', te: 'って', past: 'った', potential: 'える', passive: 'われる', causative: 'わせる', volitional: 'おう', conditional: 'えば', imperative: 'え' },
    'く': { negative: 'かない', te: 'いて', past: 'いた', potential: 'ける', passive: 'かれる', causative: 'かせる', volitional: 'こう', conditional: 'けば', imperative: 'け' },
    'ぐ': { negative: 'がない', te: 'いで', past: 'いだ', potential: 'げる', passive: 'がれる', causative: 'がせる', volitional: 'ごう', conditional: 'げば', imperative: 'げ' },
    'す': { negative: 'さない', te: 'して', past: 'した', potential: 'せる', passive: 'される', causative: 'させる', volitional: 'そう', conditional: 'せば', imperative: 'せ' },
    'つ': { negative: 'たない', te: 'って', past: 'った', potential: 'てる', passive: 'たれる', causative: 'たせる', volitional: 'とう', conditional: 'てば', imperative: 'て' },
    'ぬ': { negative: 'なない', te: 'んで', past: 'んだ', potential: 'ねる', passive: 'なれる', causative: 'なせる', volitional: 'のう', conditional: 'ねば', imperative: 'ね' },
    'ぶ': { negative: 'ばない', te: 'んで', past: 'んだ', potential: 'べる', passive: 'ばれる', causative: 'ばせる', volitional: 'ぼう', conditional: 'べば', imperative: 'べ' },
    'む': { negative: 'まない', te: 'んで', past: 'んだ', potential: 'める', passive: 'まれる', causative: 'ませる', volitional: 'もう', conditional: 'めば', imperative: 'め' },
    'る': { negative: 'らない', te: 'って', past: 'った', potential: 'れる', passive: 'られる', causative: 'らせる', volitional: 'ろう', conditional: 'れば', imperative: 'れ' },
  };
  const map = godanMap[lastChar];
  if (!map) return [];
  return [
    { name: 'Từ điển (辞書形)', japanese: verb },
    { name: 'Phủ định (ない形)', japanese: stem + map.negative },
    { name: 'Quá khứ (た形)', japanese: stem + map.past },
    // { name: 'Phủ định quá khứ', japanese: stem + map.negative.slice(0, -2) + 'かった' },
    { name: 'Phủ định quá khứ', japanese: stem + map.negative.slice(0, -1) + 'かった' },
    { name: 'て形', japanese: stem + map.te },
    { name: 'Lịch sự (ます形)', japanese: stem + 'います' },
    { name: 'Khả năng (可能形)', japanese: stem + map.potential },
    { name: 'Thụ động (受身形)', japanese: stem + map.passive },
    { name: 'Sai khiến (使役形)', japanese: stem + map.causative },
    { name: 'Điều kiện (条件形)', japanese: stem + map.conditional },
    { name: 'Mệnh lệnh (命令形)', japanese: stem + map.imperative },
    { name: 'Ý chí (意向形)', japanese: stem + map.volitional },
  ];
}

function conjugateIchidan(verb: string) {
  const stem = verb.slice(0, -1);
  return [
    { name: 'Từ điển (辞書形)', japanese: verb },
    { name: 'Phủ định (ない形)', japanese: stem + 'ない' },
    { name: 'Quá khứ (た形)', japanese: stem + 'た' },
    { name: 'Phủ định quá khứ', japanese: stem + 'なかった' },
    { name: 'て形', japanese: stem + 'て' },
    { name: 'Lịch sự (ます形)', japanese: stem + 'ます' },
    { name: 'Khả năng (可能形)', japanese: stem + 'られる' },
    { name: 'Thụ động (受身形)', japanese: stem + 'られる' },
    { name: 'Sai khiến (使役形)', japanese: stem + 'させる' },
    { name: 'Điều kiện (条件形)', japanese: stem + 'れば' },
    { name: 'Mệnh lệnh (命令形)', japanese: stem + 'ろ' },
    { name: 'Ý chí (意向形)', japanese: stem + 'よう' },
  ];
}

function conjugateSahen(verb: string) {
  const stem = verb.replace('する', '');
  return [
    { name: 'Từ điển (辞書形)', japanese: verb },
    { name: 'Phủ định (ない形)', japanese: stem + 'しない' },
    { name: 'Quá khứ (た形)', japanese: stem + 'した' },
    { name: 'Phủ định quá khứ', japanese: stem + 'しなかった' },
    { name: 'て形', japanese: stem + 'して' },
    { name: 'Lịch sự (ます形)', japanese: stem + 'します' },
    { name: 'Khả năng (可能形)', japanese: stem + 'できる' },
    { name: 'Thụ động (受身形)', japanese: stem + 'される' },
    { name: 'Sai khiến (使役形)', japanese: stem + 'させる' },
    { name: 'Điều kiện (条件形)', japanese: stem + 'すれば' },
    { name: 'Mệnh lệnh (命令形)', japanese: stem + 'しろ' },
    { name: 'Ý chí (意向形)', japanese: stem + 'しよう' },
  ];
}

function conjugateKahen() {
  return [
    { name: 'Từ điển (辞書形)', japanese: '来る' },
    { name: 'Phủ định (ない形)', japanese: '来ない' },
    { name: 'Quá khứ (た形)', japanese: '来た' },
    { name: 'Phủ định quá khứ', japanese: '来なかった' },
    { name: 'て形', japanese: '来て' },
    { name: 'Lịch sự (ます形)', japanese: '来ます' },
    { name: 'Khả năng (可能形)', japanese: '来られる' },
    { name: 'Điều kiện (条件形)', japanese: '来れば' },
    { name: 'Mệnh lệnh (命令形)', japanese: '来い' },
    { name: 'Ý chí (意向形)', japanese: '来よう' },
  ];
}

function conjugateIAdjective(adj: string) {
  const stem = adj.slice(0, -1);
  return [
    { name: 'Từ điển (辞書形)', japanese: adj },
    { name: 'Khẳng định (現在)', japanese: adj + 'です' },
    { name: 'Phủ định (現在)', japanese: stem + 'くない' },
    { name: 'Quá khứ (過去)', japanese: stem + 'かった' },
    { name: 'Phủ định quá khứ', japanese: stem + 'くなかった' },
    { name: 'て形', japanese: stem + 'くて' },
    { name: 'Điều kiện (条件形)', japanese: stem + 'ければ' },
    { name: 'Trạng từ hóa', japanese: stem + 'く' },
  ];
}

function conjugateNaAdjective(adj: string) {
  return [
    { name: 'Từ điển (辞書形)', japanese: adj + 'だ' },
    { name: 'Khẳng định (現在)', japanese: adj + 'です' },
    { name: 'Phủ định (現在)', japanese: adj + 'ではありません' },
    { name: 'Phủ định (thân mật)', japanese: adj + 'じゃない' },
    { name: 'Quá khứ (過去)', japanese: adj + 'でした' },
    { name: 'Phủ định quá khứ', japanese: adj + 'ではありませんでした' },
    { name: 'て形', japanese: adj + 'で' },
    { name: 'Điều kiện (条件形)', japanese: adj + 'なら' },
    { name: 'Trạng từ hóa', japanese: adj + 'に' },
  ];
}

function conjugateNoun(noun: string) {
  return [
    { name: 'Từ điển (辞書形)', japanese: noun },
    { name: 'Khẳng định (現在)', japanese: noun + 'です' },
    { name: 'Phủ định (現在)', japanese: noun + 'ではありません' },
    { name: 'Phủ định (thân mật)', japanese: noun + 'じゃない' },
    { name: 'Quá khứ (過去)', japanese: noun + 'でした' },
    { name: 'Phủ định quá khứ', japanese: noun + 'ではありませんでした' },
    { name: 'て形', japanese: noun + 'で' },
    { name: 'Điều kiện (条件形)', japanese: noun + 'なら' },
  ];
}

function ConjugationTable({ word, wordType, originalWord }: { word: string; wordType: WordType; originalWord: string }) {
  let conjugations: { name: string; japanese: string }[] = [];
  let displayTitle = '';
  switch (wordType) {
    case 'godan': conjugations = conjugateGodan(word); displayTitle = `📖 Chia động từ nhóm 1 (Godan) - ${originalWord}`; break;
    case 'ichidan': conjugations = conjugateIchidan(word); displayTitle = `📖 Chia động từ nhóm 2 (Ichidan) - ${originalWord}`; break;
    case 'sahen': conjugations = conjugateSahen(word); displayTitle = `📖 Chia động từ nhóm 3 (Sahen) - ${originalWord}`; break;
    case 'kahen': conjugations = conjugateKahen(); displayTitle = `📖 Chia động từ bất quy tắc - 来る`; break;
    case 'irregular': conjugations = conjugateSahen('する'); displayTitle = `📖 Chia động từ bất quy tắc - する`; break;
    case 'i-adjective': conjugations = conjugateIAdjective(word); displayTitle = `📖 Chia tính từ đuôi I - ${originalWord}`; break;
    case 'na-adjective': conjugations = conjugateNaAdjective(word); displayTitle = `📖 Chia tính từ đuôi NA - ${originalWord}`; break;
    case 'noun-suru': conjugations = conjugateSahen(word + 'する'); displayTitle = `📖 Chia (Danh từ + する) - ${originalWord}する`; break;
    case 'noun-only': conjugations = conjugateNoun(word); displayTitle = `📖 Biến thể danh từ - ${originalWord}`; break;
    default: return null;
  }
  if (conjugations.length === 0) return null;
  return (
    <View style={styles.tableContainer}>
      <Text style={styles.tableTitle}>{displayTitle}</Text>
      <View style={styles.tableHeader}>
        <Text style={[styles.headerCell, styles.headerName]}>Tên thể</Text>
        <Text style={[styles.headerCell, styles.headerValue]}>Từ vựng</Text>
      </View>
      <ScrollView nestedScrollEnabled style={styles.tableScroll}>
        {conjugations.map((item, index) => (
          <View key={index} style={[styles.tableRow, index % 2 === 0 && styles.tableRowAlt]}>
            <Text style={[styles.rowCell, styles.rowName]}>{item.name}</Text>
            <Text style={[styles.rowCell, styles.rowValue]}>{item.japanese}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// ============================================
// COMPONENT CHÍNH
// ============================================


  function resolveConjugationTarget(entry: {
    isExtractedVerb?: boolean;
    extractedVerb?: string | null;
    isConjugatedForm?: boolean;
    conjugatedForm?: string | null;
  }, kanji: string): { word: string; skip: boolean; baseNote?: string } {
    if (entry.isConjugatedForm) {  
      return { word: kanji, skip: true, baseNote: entry.conjugatedForm ?? undefined };
    }
    if (entry.isExtractedVerb && entry.extractedVerb) {
      return { word: entry.extractedVerb, skip: false };
    }
    return { word: kanji, skip: false };
  } 

export default function VocabDetailInline({
  kanji,
  hiragana = '',
  hira = '',
  han = '',
  nghia = '',
  example = '',
  exampleMeaning = '',
  level = 'N3',
  id = '',
  wordType, typeLabel, isNaAdjective, isExtractedVerb, extractedVerb, isConjugatedForm, conjugatedForm,
  onClose,
}: VocabDetailInlineProps) {
    
  const displayHiragana = hiragana || hira;

  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showFullMeaning, setShowFullMeaning] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [relatedExamples, setRelatedExamples] = useState<ExampleSentence[]>([]);
  const [showAllExamples, setShowAllExamples] = useState(false); 

  useEffect(() => {
    let cancelled = false;
    const loadExamples = async () => {
      if (!kanji) return;
      const examples = await findExamplesByVocab(kanji);
      if (!cancelled) setRelatedExamples(examples);
    };
    loadExamples();
    return () => {
      cancelled = true;
    };
  }, [kanji]);

  useEffect(() => {
    const checkBookmark = async () => {
      try {
        const saved = await AsyncStorage.getItem('bookmarks');
        if (saved) {
          const bookmarks = new Set(JSON.parse(saved));
          setIsBookmarked(bookmarks.has(id));
        }
      } catch {}
    };
    if (id) checkBookmark();
  }, [id]);

  const toggleBookmark = async () => {
    try {
      const saved = await AsyncStorage.getItem('bookmarks');
      const bookmarks = saved ? new Set(JSON.parse(saved)) : new Set();
      if (bookmarks.has(id)) {
        bookmarks.delete(id);
        Alert.alert('⭐ Bỏ ghim', `Đã xóa "${kanji}" khỏi danh sách ghim`);
      } else {
        bookmarks.add(id);
        Alert.alert('⭐ Đã ghim', `Đã thêm "${kanji}" vào danh sách ghim`);
      }
      await AsyncStorage.setItem('bookmarks', JSON.stringify([...bookmarks]));
      setIsBookmarked(!isBookmarked);
    } catch {}
  };

  const speakWord = () => {
    if (kanji) Speech.speak(kanji, { language: 'ja-JP', pitch: 1, rate: 0.8 });
  };

  const getLevelColor = (lv: string) => {
    switch (lv) {
      case 'N5': return '#22C55E';
      case 'N4': return '#3B82F6';
      case 'N3': return '#F59E0B';
      case 'N2': return '#EA580C';
      case 'N1': return '#C0392B';
      default: return '#94A3B8';
    }
  };

  // const wordType = detectWordType(kanji, nghia);
  // const conjugationWord = kanji;
  const resolvedWordType = resolveWordType({ wordType, isNaAdjective }, kanji, nghia);
  const { word: conjugationWord, skip: skipConjugation, baseNote } = resolveConjugationTarget(
    { isExtractedVerb, extractedVerb, isConjugatedForm, conjugatedForm }, kanji
  );

  const getWordTypeText = () => {
    if (typeLabel) return typeLabel;
    switch (resolvedWordType) {
      case 'godan': return 'Động từ nhóm 1 (Godan - 五段動詞)';
      case 'ichidan': return 'Động từ nhóm 2 (Ichidan - 一段動詞)';
      case 'sahen': return 'Động từ nhóm 3 (Sahen - サ変動詞)';
      case 'kahen': return 'Động từ bất quy tắc (カ変動詞 - 来る)';
      case 'irregular': return 'Động từ bất quy tắc (する)';
      case 'i-adjective': return 'Tính từ đuôi I (I-Adjective)';
      case 'na-adjective': return 'Tính từ đuôi NA (Na-Adjective)';
      case 'noun-suru': return 'Danh từ (có thể thêm する)';
      case 'noun-only': return 'Danh từ (Noun)';
      default: return 'Từ vựng';
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* Header với nút đóng */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
        backgroundColor: '#fff',
      }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#1e293b' }}>
          📖 {kanji} — Chi tiết từ vựng
        </Text>
        <TouchableOpacity onPress={onClose} hitSlop={10}>
          <Text style={{ fontSize: 22, color: '#64748b', fontWeight: '300' }}>✕</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          {/* Từ vựng chính */}
          <View style={styles.kanjiSection}>
            <Text style={styles.hiraganaText}>{displayHiragana}</Text>
            <Text style={styles.kanjiText}>{kanji}</Text>
            <Text style={styles.nghiaText}>{nghia}</Text>
          </View>
          {han ? <Text style={styles.mainVocabHan}>{han}</Text> : null}

          {/* Nút chức năng */}
          <View style={styles.funcRow}>
            <TouchableOpacity style={styles.funcBtn} onPress={() => setShowImageModal(true)}>
              <Text style={styles.funcBtnText}>🖼️ Ảnh minh họa</Text>
            </TouchableOpacity>
          </View>

          {/* Modal ảnh */}
          <Modal visible={showImageModal} transparent animationType="slide" onRequestClose={() => setShowImageModal(false)}>
            <View style={styles.modalOverlay}>
              <View style={styles.imageModalContainer}>
                <View style={styles.imageModalHeader}>
                  <Text style={styles.imageModalTitle}>📸 Đóng góp hình ảnh</Text>
                  <TouchableOpacity onPress={() => setShowImageModal(false)}>
                    <Text style={styles.imageModalClose}>✕</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.imageModalContent}>
                  <VocabImagePicker
                    vocabId={id}
                    vocabWord={kanji}
                    onImagesSelected={() => setShowImageModal(false)}
                  />
                </ScrollView>
              </View>
            </View>
          </Modal>

          {/* Trình độ */}
          <View style={styles.levelRow}>
            <Text style={styles.levelLabel}>Trình độ:</Text>
            <View style={[styles.levelBadge, { backgroundColor: getLevelColor(level) + '20' }]}>
              <Text style={[styles.levelText, { color: getLevelColor(level) }]}>JLPT {level}</Text>
            </View>
          </View>

          {/* Loại từ */}
          <View style={styles.wordTypeRow}>
            <Text style={styles.wordTypeText}>{getWordTypeText()}</Text>
            <TouchableOpacity onPress={() => setShowFullMeaning(!showFullMeaning)}>
              <Text style={styles.wordTypeMore}>{showFullMeaning ? 'Thu gọn' : '⇒ Đầy đủ'}</Text>
            </TouchableOpacity>
          </View>

          {showFullMeaning && (
            <View style={styles.fullMeaningBox}>
              <Text style={styles.fullMeaningTitle}>📖 Đầy đủ nghĩa và cách dùng:</Text>
              <Text style={styles.fullMeaningText}>• {kanji} ({displayHiragana}): {nghia}</Text>
              <Text style={styles.fullMeaningText}>• Loại từ: {getWordTypeText()}</Text>
              {resolvedWordType === 'noun-suru' && (
                <Text style={styles.fullMeaningText}>• Có thể thêm する để tạo động từ: {kanji}する</Text>
              )}
            </View>
          )}

          {/* Nghĩa */}
          <View style={styles.meaningSection}>
            <Text style={styles.meaningNumber}>1.</Text>
            <Text style={styles.meaningText}>{nghia}</Text>
          </View>

          {/* Ví dụ */}
          {example ? (
            <View style={styles.exampleBox}>
              <Text style={styles.exampleJp}>{example}</Text>
              {exampleMeaning ? <Text style={styles.exampleVi}>{exampleMeaning}</Text> : null}
            </View>
          ) : null}

          {/* Mẫu câu liên quan */}
          {relatedExamples.length > 0 && (
            <View style={styles.examplesSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>📖 Mẫu câu ví dụ</Text>
                <Text style={styles.sectionCount}>{relatedExamples.length} câu</Text>
              </View>
              
              {/* Hiển thị 3 câu đầu tiên hoặc tất cả */}
              {(showAllExamples ? relatedExamples : relatedExamples.slice(0, 3)).map((item) => (
                <View key={item.id} style={styles.exampleCard}>
                  <Text style={styles.exampleJp}>{item.jp}</Text>
                  <Text style={styles.exampleVi}>{item.vi}</Text>
                </View>
              ))}
              
              {/* Nút xem thêm/thu gọn */}
              {relatedExamples.length > 3 && (
                <TouchableOpacity 
                  style={styles.showMoreBtn}
                  onPress={() => setShowAllExamples(!showAllExamples)}
                >
                  <Text style={styles.showMoreText}>
                    {showAllExamples ? '📖 Thu gọn' : `📖 Xem thêm ${relatedExamples.length - 3} câu`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Bảng chia từ */}
            {skipConjugation ? (
              <View style={styles.wordTypeRow}>
                <Text style={styles.wordTypeText}>
                  📌 Đây là dạng chia sẵn của: {baseNote || '—'}
                </Text>
              </View>
            ) : (
              <ConjugationTable word={conjugationWord} wordType={resolvedWordType} originalWord={kanji} />
            )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, paddingHorizontal: 16 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20,
    marginTop: 12, marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  kanjiSection: { alignItems: 'center', marginBottom: 20 },
  hiraganaText: { fontSize: 16, color: '#64748b' },
  kanjiText: { fontSize: 40, fontWeight: '800', color: TEAL_DARK },
  nghiaText: { fontSize: 16, color: '#64748b', marginTop: 4 },
  mainVocabHan: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginBottom: 4 },
  funcRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 24 },
  funcBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 10,
    marginHorizontal: 4, backgroundColor: '#f1f5f9', borderRadius: 20,
  },
  funcBtnText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  levelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  levelLabel: { fontSize: 14, fontWeight: '600', color: '#475569', marginRight: 8 },
  levelBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16 },
  levelText: { fontSize: 12, fontWeight: '700' },
  wordTypeRow: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, marginBottom: 16 },
  wordTypeText: { fontSize: 13, color: '#475569', lineHeight: 18, marginBottom: 8 },
  wordTypeMore: { fontSize: 13, fontWeight: '600', color: TEAL, textAlign: 'right' },
  fullMeaningBox: { backgroundColor: '#f0fdf4', padding: 12, borderRadius: 12, marginBottom: 16 },
  fullMeaningTitle: { fontSize: 13, fontWeight: '700', color: '#166534', marginBottom: 8 },
  fullMeaningText: { fontSize: 13, color: '#166534', lineHeight: 20, marginBottom: 4 },
  meaningSection: { flexDirection: 'row', marginBottom: 16 },
  meaningNumber: { fontSize: 16, fontWeight: '700', color: TEAL, marginRight: 8, width: 24 },
  meaningText: { fontSize: 16, color: '#1e293b', flex: 1, lineHeight: 24 },
  exampleBox: { backgroundColor: '#f0fdf4', padding: 16, borderRadius: 12, marginBottom: 16 },
  exampleJp: { fontSize: 16, fontWeight: '600', color: '#166534', marginBottom: 8 },
  exampleVi: { fontSize: 14, color: '#475569', lineHeight: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 12, marginTop: 8 },
  examplesSection: { marginTop: 20 },
  exampleCard: {
    backgroundColor: '#f8fafc', padding: 16, borderRadius: 12,
    marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0',
  },
  tableContainer: {
    marginTop: 20, marginBottom: 16, backgroundColor: '#fff',
    borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0',
  },
  tableTitle: {
    fontSize: 14, fontWeight: '700', color: '#1e293b',
    padding: 12, backgroundColor: '#f8fafc',
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  tableHeader: { flexDirection: 'row', backgroundColor: TEAL, paddingVertical: 12, paddingHorizontal: 16 },
  headerCell: { fontSize: 13, fontWeight: '700', color: '#fff' },
  headerName: { flex: 0.5 },
  headerValue: { flex: 0.5 },
  tableScroll: { maxHeight: 400 },
  tableRow: {
    flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  tableRowAlt: { backgroundColor: '#f8fafc' },
  rowCell: { fontSize: 12, color: '#334155' },
  rowName: { flex: 0.4, fontWeight: '500' },
  rowValue: { flex: 0.6, paddingLeft: 36 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  imageModalContainer: { backgroundColor: '#fff', borderRadius: 24, padding: 20, width: '90%', maxHeight: '85%' },
  imageModalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  imageModalTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  imageModalClose: { fontSize: 20, fontWeight: '600', color: '#64748b', padding: 8 },
  imageModalContent: { maxHeight: '90%' },
  // Thêm vào StyleSheet (cuối cùng, trước dấu đóng ngoặc)
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  sectionCount: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  showMoreBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
  },
  showMoreText: {
    fontSize: 13,
    fontWeight: '600',
    color: TEAL,
  },
});
