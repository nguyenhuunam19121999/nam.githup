// app/vocab-detail.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Trang chi tiết từ vựng - Giao diện giống ảnh + Bảng chia từ chuẩn
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { BottomTabBar } from '../components/BottomTabBar';
import { useAuth } from '../artifacts/mirai-jp/hooks/useAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import VocabImagePicker from '../components/VocabImagePicker';
import { findExamplesByVocab, ExampleSentence } from '../assets/sentences';

// ✅ MÀU CHỦ ĐẠO
const TEAL = "#1f7a1f";
const TEAL_DARK = "#1c5765";
const BG_GRAY = "#f0f4f8";

// ============================================
// 📖 XÁC ĐỊNH LOẠI TỪ CHI TIẾT
// ============================================

type WordType = 'godan' | 'ichidan' | 'sahen' | 'kahen' | 'irregular' | 'i-adjective' | 'na-adjective' | 'noun-only' | 'noun-suru';

function detectWordType(kanji: string, nghia: string = ''): WordType {
  const word = kanji;
  const meaning = nghia.toLowerCase();
  
  // 1. Bất quy tắc
  if (word === 'する') return 'irregular';
  if (word === 'くる' || word === '来る') return 'kahen';
  
  // 2. Sahen (Động từ nhóm 3 - đã có する)
  if (word.endsWith('する')) return 'sahen';
  
  // 3. Tính từ đuôi い
  if (meaning.includes('tính từ đuôi i') || meaning.includes('i-adjective')) return 'i-adjective';
  if (word.endsWith('い') && !word.endsWith('ない')) {
    const commonIAdjectives = ['高い', '安い', '新しい', '古い', '楽しい', '面白い', '美味しい', '暑い', '寒い', '大きい', '小さい'];
    if (commonIAdjectives.includes(word)) return 'i-adjective';
  }
  
  // 4. Tính từ đuôi な
  if (meaning.includes('tính từ đuôi na') || meaning.includes('na-adjective')) return 'na-adjective';
  
  // 5. Động từ nhóm 1 (Godan)
  const lastChar = word.slice(-1);
  const godanEndings = ['う', 'く', 'ぐ', 'す', 'つ', 'ぬ', 'ぶ', 'む'];
  if (godanEndings.includes(lastChar)) return 'godan';
  if (lastChar === 'る') {
    const prevChar = word.slice(-2, -1);
    if (['あ', 'う', 'お', 'a', 'u', 'o'].includes(prevChar)) return 'godan';
    return 'ichidan';
  }
  
  // 6. Danh từ - kiểm tra xem có thể thêm する không
  const commonSuruNouns = ['勉強', '旅行', '運転', '結婚', '洗濯', '掃除', '準備', '練習', '復習', '予習', '説明', '質問', '回答', '連絡', '相談', '徹底'];
  const canAddSuru = commonSuruNouns.includes(word) || (word.length >= 2 && !word.endsWith('ん'));
  
  return canAddSuru ? 'noun-suru' : 'noun-only';
}

// ============================================
// 📖 CHIA ĐỘNG TỪ NHÓM 1 (GODAN - 五段動詞)
// ============================================
function conjugateGodan(verb: string): { name: string; japanese: string }[] {
  const lastChar = verb.slice(-1);
  const stem = verb.slice(0, -1);
  
  const godanMap: Record<string, { negative: string; te: string; past: string; potential: string; passive: string; causative: string; volitional: string; conditional: string; imperative: string }> = {
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
    { name: 'Phủ định quá khứ', japanese: stem + map.negative.slice(0, -2) + 'かった' },
    { name: 'て形', japanese: stem + map.te },
    { name: 'Lịch sự (ます形)', japanese: stem + 'います' },
    { name: 'Khả năng (可能形)', japanese: stem + map.potential },
    { name: 'Thụ động (受身形)', japanese: stem + map.passive },
    { name: 'Sai khiến (使役形)', japanese: stem + map.causative },
    { name: 'Sai khiến thụ động', japanese: stem + map.causative.slice(0, -2) + 'せられる' },
    { name: 'Điều kiện (条件形)', japanese: stem + map.conditional },
    { name: 'Mệnh lệnh (命令形)', japanese: stem + map.imperative },
    { name: 'Ý chí (意向形)', japanese: stem + map.volitional },
  ];
}

// ============================================
// 📖 CHIA ĐỘNG TỪ NHÓM 2 (ICHIDAN - 一段動詞)
// ============================================
function conjugateIchidan(verb: string): { name: string; japanese: string }[] {
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
    { name: 'Sai khiến thụ động', japanese: stem + 'させられる' },
    { name: 'Điều kiện (条件形)', japanese: stem + 'れば' },
    { name: 'Mệnh lệnh (命令形)', japanese: stem + 'ろ' },
    { name: 'Ý chí (意向形)', japanese: stem + 'よう' },
  ];
}

// ============================================
// 📖 CHIA ĐỘNG TỪ NHÓM 3 (SAHEN - サ変動詞)
// ============================================
function conjugateSahen(verb: string): { name: string; japanese: string }[] {
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
    { name: 'Sai khiến thụ động', japanese: stem + 'させられる' },
    { name: 'Điều kiện (条件形)', japanese: stem + 'すれば' },
    { name: 'Mệnh lệnh (命令形)', japanese: stem + 'しろ' },
    { name: 'Ý chí (意向形)', japanese: stem + 'しよう' },
  ];
}

// ============================================
// 📖 CHIA ĐỘNG TỪ KA HEN (来る)
// ============================================
function conjugateKahen(): { name: string; japanese: string }[] {
  return [
    { name: 'Từ điển (辞書形)', japanese: '来る' },
    { name: 'Phủ định (ない形)', japanese: '来ない' },
    { name: 'Quá khứ (た形)', japanese: '来た' },
    { name: 'Phủ định quá khứ', japanese: '来なかった' },
    { name: 'て形', japanese: '来て' },
    { name: 'Lịch sự (ます形)', japanese: '来ます' },
    { name: 'Khả năng (可能形)', japanese: '来られる' },
    { name: 'Thụ động (受身形)', japanese: '来られる' },
    { name: 'Sai khiến (使役形)', japanese: '来させる' },
    { name: 'Sai khiến thụ động', japanese: '来させられる' },
    { name: 'Điều kiện (条件形)', japanese: '来れば' },
    { name: 'Mệnh lệnh (命令形)', japanese: '来い' },
    { name: 'Ý chí (意向形)', japanese: '来よう' },
  ];
}

// ============================================
// 📖 CHIA TÍNH TỪ ĐUÔI I (I-ADJECTIVE)
// ============================================
function conjugateIAdjectiveFull(adj: string): { name: string; japanese: string }[] {
  const stem = adj.slice(0, -1);
  
  return [
    { name: 'Từ điển (辞書形)', japanese: adj },
    { name: 'Khẳng định (現在)', japanese: adj + 'です' },
    { name: 'Phủ định (現在)', japanese: stem + 'くない' },
    { name: 'Phủ định lịch sự', japanese: stem + 'くないです' },
    { name: 'Quá khứ (過去)', japanese: stem + 'かった' },
    { name: 'Quá khứ lịch sự', japanese: stem + 'かったです' },
    { name: 'Phủ định quá khứ', japanese: stem + 'くなかった' },
    { name: 'Phủ định quá khứ lịch sự', japanese: stem + 'くなかったです' },
    { name: 'て形', japanese: stem + 'くて' },
    { name: 'Điều kiện (条件形)', japanese: stem + 'ければ' },
    { name: 'Trạng từ hóa', japanese: stem + 'く' },
  ];
}

// ============================================
// 📖 CHIA TÍNH TỪ ĐUÔI NA (NA-ADJECTIVE)
// ============================================
function conjugateNaAdjectiveFull(adj: string): { name: string; japanese: string }[] {
  return [
    { name: 'Từ điển (辞書形)', japanese: adj + 'だ' },
    { name: 'Khẳng định (現在)', japanese: adj + 'です' },
    { name: 'Phủ định (現在)', japanese: adj + 'ではありません' },
    { name: 'Phủ định (現在 - thân mật)', japanese: adj + 'じゃない' },
    { name: 'Quá khứ (過去)', japanese: adj + 'でした' },
    { name: 'Quá khứ (thân mật)', japanese: adj + 'だった' },
    { name: 'Phủ định quá khứ', japanese: adj + 'ではありませんでした' },
    { name: 'Phủ định quá khứ (thân mật)', japanese: adj + 'じゃなかった' },
    { name: 'て形', japanese: adj + 'で' },
    { name: 'Điều kiện (条件形)', japanese: adj + 'なら' },
    { name: 'Trạng từ hóa', japanese: adj + 'に' },
  ];
}

// ============================================
// 📖 BẢNG BIẾN THỂ DANH TỪ (Noun Conjugation)
// ============================================
function conjugateNoun(noun: string): { name: string; japanese: string }[] {
  return [
    { name: 'Từ điển (辞書形)', japanese: noun },
    { name: 'Khẳng định (現在)', japanese: noun + 'です' },
    { name: 'Phủ định (現在)', japanese: noun + 'ではありません' },
    { name: 'Phủ định (現在 - thân mật)', japanese: noun + 'じゃない' },
    { name: 'Quá khứ (過去)', japanese: noun + 'でした' },
    { name: 'Phủ định quá khứ', japanese: noun + 'ではありませんでした' },
    { name: 'Phủ định quá khứ (thân mật)', japanese: noun + 'じゃなかった' },
    { name: 'て形 (để nối câu)', japanese: noun + 'で' },
    { name: 'Điều kiện (条件形)', japanese: noun + 'なら' },
  ];
}

// ============================================
// 📖 COMPONENT BẢNG CHIA TỪ
// ============================================
function ConjugationTable({ word, wordType, originalWord }: { word: string; wordType: WordType; originalWord: string }) {
  let conjugations: { name: string; japanese: string }[] = [];
  let displayTitle = '';
  
  switch (wordType) {
    case 'godan':
      conjugations = conjugateGodan(word);
      displayTitle = `📖 Chia động từ nhóm 1 (Godan) - ${originalWord}`;
      break;
    case 'ichidan':
      conjugations = conjugateIchidan(word);
      displayTitle = `📖 Chia động từ nhóm 2 (Ichidan) - ${originalWord}`;
      break;
    case 'sahen':
      conjugations = conjugateSahen(word);
      displayTitle = `📖 Chia động từ nhóm 3 (Sahen) - ${originalWord}`;
      break;
    case 'kahen':
      conjugations = conjugateKahen();
      displayTitle = `📖 Chia động từ bất quy tắc - 来る`;
      break;
    case 'irregular':
      conjugations = conjugateSahen('する');
      displayTitle = `📖 Chia động từ bất quy tắc - する`;
      break;
    case 'i-adjective':
      conjugations = conjugateIAdjectiveFull(word);
      displayTitle = `📖 Chia tính từ đuôi I - ${originalWord}`;
      break;
    case 'na-adjective':
      conjugations = conjugateNaAdjectiveFull(word);
      displayTitle = `📖 Chia tính từ đuôi NA - ${originalWord}`;
      break;
    case 'noun-suru':
      conjugations = conjugateSahen(word + 'する');
      displayTitle = `📖 Chia động từ (Danh từ + する) - ${originalWord}する`;
      break;
    case 'noun-only':
      conjugations = conjugateNoun(word);
      displayTitle = `📖 Biến thể danh từ - ${originalWord}`;
      break;
    default:
      return null;
  }
  
  if (conjugations.length === 0) return null;
  
  return (
    <View style={styles.tableContainer}>
      <Text style={styles.tableTitle}>{displayTitle}</Text>
      <View style={styles.tableHeader}>
        <Text style={[styles.headerCell, styles.headerName]}>Tên thể</Text>
        <Text style={[styles.headerCell, styles.headerValue]}>Từ vựng</Text>
      </View>
      <ScrollView nestedScrollEnabled={true} style={styles.tableScroll}>
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
// 📱 TRANG CHÍNH
// ============================================

export default function VocabDetailScreen() {
  const router = useRouter();
  const { scopedKey } = useAuth();
  const params = useLocalSearchParams<{
    id?: string;
    kanji?: string;
    hiragana?: string;
    han?: string;
    nghia?: string;
    example?: string;
    exampleMeaning?: string;
    level?: string;
  }>();

  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showFullMeaning, setShowFullMeaning] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showAllExamples, setShowAllExamples] = useState(false);

  const vocabData = {
    id: params.id || '',
    kanji: params.kanji || '',
    hiragana: params.hiragana || '',
    han: params.han || '',
    nghia: params.nghia || '',
    example: params.example || '',
    exampleMeaning: params.exampleMeaning || '',
    level: params.level || 'N3',
  };

  const [relatedExamples, setRelatedExamples] = useState<ExampleSentence[]>([]);

  useEffect(() => {
    if (vocabData.kanji) {
      const examples = findExamplesByVocab(vocabData.kanji);
      setRelatedExamples(examples);
    }
  }, [vocabData.kanji]);

  // Hàm lấy màu cho level badge
    const getLevelColor = (level: string) => {
    switch (level) {
        case 'N5': return '#22C55E';
        case 'N4': return '#3B82F6';
        case 'N3': return '#F59E0B';
        case 'N2': return '#EA580C';
        case 'N1': return '#C0392B';
        default: return '#94A3B8';
    }
    };

  // Xác định loại từ
  const wordType = detectWordType(vocabData.kanji, vocabData.nghia);
  
  // Xác định từ dùng để chia
  let conjugationWord = vocabData.kanji;
  if (wordType === 'noun-suru') {
    conjugationWord = vocabData.kanji;
  }

  useEffect(() => {
    const checkBookmark = async () => {
      try {
        const saved = await AsyncStorage.getItem(scopedKey("bookmarks"));
        if (saved) {
          const bookmarks = new Set(JSON.parse(saved));
          setIsBookmarked(bookmarks.has(vocabData.id));
        }
      } catch (e) {
      }
    };
    if (vocabData.id) checkBookmark();
  }, [vocabData.id, scopedKey]);

  const toggleBookmark = async () => {
    try {
      const saved = await AsyncStorage.getItem(scopedKey("bookmarks"));
      const bookmarks = saved ? new Set(JSON.parse(saved)) : new Set();
      
      if (bookmarks.has(vocabData.id)) {
        bookmarks.delete(vocabData.id);
        Alert.alert("⭐ Bỏ ghim", `Đã xóa "${vocabData.kanji}" khỏi danh sách ghim`);
      } else {
        bookmarks.add(vocabData.id);
        Alert.alert("⭐ Đã ghim", `Đã thêm "${vocabData.kanji}" vào danh sách ghim`);
      }
      
      await AsyncStorage.setItem(scopedKey("bookmarks"), JSON.stringify([...bookmarks]));
      setIsBookmarked(!isBookmarked);
    } catch (e) {
    }
  };

  const speakWord = () => {
    if (vocabData.kanji) {
      Speech.speak(vocabData.kanji, { language: 'ja-JP', pitch: 1, rate: 0.8 });
    }
  };

  // Lấy text hiển thị loại từ
  const getWordTypeText = () => {
    switch (wordType) {
      case 'godan': return 'Động từ nhóm 1 (Godan - 五段動詞)';
      case 'ichidan': return 'Động từ nhóm 2 (Ichidan - 一段動詞)';
      case 'sahen': return 'Động từ nhóm 3 (Sahen - サ変動詞)';
      case 'kahen': return 'Động từ bất quy tắc (カ変動詞 - 来る)';
      case 'irregular': return 'Động từ bất quy tắc (する)';
      case 'i-adjective': return 'Tính từ đuôi I (I-Adjective)';
      case 'na-adjective': return 'Tính từ đuôi NA (Na-Adjective)';
      case 'noun-suru': return 'Danh từ (có thể thêm する để thành động từ)';
      case 'noun-only': return 'Danh từ (Noun)';
      default: return 'Từ vựng';
    }
  };

  if (!vocabData.kanji) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Không tìm thấy dữ liệu từ vựng</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor={BG_GRAY} />
      
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtnHeader}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết từ vựng</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={toggleBookmark} style={styles.iconBtn}>
              <Text style={styles.iconText}>{isBookmarked ? '⭐' : '☆'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={speakWord} style={styles.iconBtn}>
              <Text style={styles.iconText}>🔊</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            {/* Từ vựng chính */}
            <View style={styles.kanjiSection}>
              <Text style={styles.hiraganaText}>{vocabData.hiragana}</Text>
              <Text style={styles.kanjiText}>{vocabData.kanji}</Text>
              <Text style={styles.nghiaText}>{vocabData.nghia}</Text>
            </View>
            <Text style={styles.mainVocabHan}>{vocabData.han}</Text>


            {/* 3 nút chức năng */}
            <View style={styles.funcRow}>
              {/* <TouchableOpacity style={styles.funcBtn}>
                <Text style={styles.funcBtnText}>※ Kết hợp từ</Text>
              </TouchableOpacity> */}
              <TouchableOpacity 
                style={styles.funcBtn}
                onPress={() => setShowImageModal(true)}
              >
                <Text style={styles.funcBtnText}>🖼️ Ảnh minh họa</Text>
              </TouchableOpacity>
              {/* <TouchableOpacity style={styles.funcBtn}>
                <Text style={styles.funcBtnText}>⚙️ Luyện</Text>
              </TouchableOpacity> */}
            </View>

            {/* Modal Ảnh minh họa */}
            <Modal
              visible={showImageModal}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setShowImageModal(false)}
            >
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
                      vocabId={vocabData.id}
                      vocabWord={vocabData.kanji}
                      onImagesSelected={(images) => {
                        setShowImageModal(false);
                      }}
                    />
                  </ScrollView>
                </View>
              </View>
            </Modal>

            {/* Trình độ */}
            <View style={styles.levelRow}>
            <Text style={styles.levelLabel}>Trình độ:</Text>
            <View style={[styles.levelBadge, { backgroundColor: getLevelColor(vocabData.level) + '20' }]}>
                <Text style={[styles.levelText, { color: getLevelColor(vocabData.level) }]}>
                JLPT {vocabData.level}
                </Text>
            </View>
            </View>

            {/* Từ loại */}
            <View style={styles.wordTypeRow}>
              <Text style={styles.wordTypeText}>{getWordTypeText()}</Text>
              <TouchableOpacity onPress={() => setShowFullMeaning(!showFullMeaning)}>
                <Text style={styles.wordTypeMore}>{showFullMeaning ? 'Thu gọn' : '⇒ Đầy đủ'}</Text>
              </TouchableOpacity>
            </View>

            {/* Nội dung Đầy đủ */}
            {showFullMeaning && (
              <View style={styles.fullMeaningBox}>
                <Text style={styles.fullMeaningTitle}>📖 Đầy đủ nghĩa và cách dùng:</Text>
                <Text style={styles.fullMeaningText}>• {vocabData.kanji} ({vocabData.hiragana}): {vocabData.nghia}</Text>
                <Text style={styles.fullMeaningText}>• Loại từ: {getWordTypeText()}</Text>
                {wordType === 'noun-suru' && (
                  <Text style={styles.fullMeaningText}>• Có thể thêm する để tạo động từ: {vocabData.kanji}する</Text>
                )}
                {wordType === 'noun-only' && (
                  <Text style={styles.fullMeaningText}>• Danh từ thuần túy, không thêm する</Text>
                )}
              </View>
            )}

            {/* Nghĩa số 1 */}
            <View style={styles.meaningSection}>
              <Text style={styles.meaningNumber}>1.</Text>
              <Text style={styles.meaningText}>{vocabData.nghia}</Text>
            </View>

            {/* Ví dụ */}
            {vocabData.example && (
              <View style={styles.exampleBox}>
                <Text style={styles.exampleJp}>{vocabData.example}</Text>
                {vocabData.exampleMeaning && (
                  <Text style={styles.exampleVi}>{vocabData.exampleMeaning}</Text>
                )}
              </View>
            )}

            {/* Mẫu câu liên quan */}
            {relatedExamples.length > 0 && (
              <View style={styles.examplesSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>📖 Mẫu câu ví dụ</Text>
                  <Text style={styles.sectionCount}>{relatedExamples.length} câu</Text>
                </View>
                
                {/* Hiển thị 3 câu đầu hoặc tất cả */}
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
            
            {/* Bảng chia từ - Luôn hiển thị cho mọi loại từ */}
            <ConjugationTable 
              word={conjugationWord}
              wordType={wordType}
              originalWord={vocabData.kanji}
            />

            {/* Xem thêm */}
            <TouchableOpacity style={styles.viewMoreBtn}>
              <Text style={styles.viewMoreText}>Xem thêm</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
        
        <BottomTabBar />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_GRAY,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BG_GRAY,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    marginBottom: 16,
    textAlign: 'center',
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: TEAL,
    borderRadius: 8,
  },
  backBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: BG_GRAY,
  },
  backBtnHeader: {
    width: 42,
    height: 42,
    backgroundColor: '#fff',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  backIcon: {
    fontSize: 28,
    color: TEAL_DARK,
    fontWeight: '300',
    marginTop: -4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEAL_DARK,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 42,
    height: 42,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
   kanjiSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  kanjiText: {
    fontSize: 40,
    fontWeight: '800',
    color: TEAL_DARK,
  },
  hiraganaText: {
    fontSize: 16,
    color: '#64748b',
  },
  nghiaText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 4,

  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  mainVocab: {
    fontSize: 48,
    fontWeight: '800',
    color: TEAL_DARK,
    textAlign: 'center',
    marginBottom: 8,
  },
  mainVocabKana: {
    fontSize: 18,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 4,
  },
  mainVocabHan: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 4
  },
  funcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  funcBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    marginHorizontal: 4,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
  },
  funcBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  levelLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginRight: 8,
  },
  levelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    },
    levelText: {
    fontSize: 12,
    fontWeight: '700',
 },
  wordTypeRow: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  wordTypeText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 8,
  },
  wordTypeMore: {
    fontSize: 13,
    fontWeight: '600',
    color: TEAL,
    textAlign: 'right',
  },
  fullMeaningBox: {
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  fullMeaningTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 8,
  },
  fullMeaningText: {
    fontSize: 13,
    color: '#166534',
    lineHeight: 20,
    marginBottom: 4,
  },
  meaningSection: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  meaningNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: TEAL,
    marginRight: 8,
    width: 24,
  },
  meaningText: {
    fontSize: 16,
    color: '#1e293b',
    flex: 1,
    lineHeight: 24,
  },
  exampleBox: {
    backgroundColor: '#f0fdf4',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  exampleJp: {
    fontSize: 16,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 8,
  },
  exampleVi: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  // Mẫu câu liên quan
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
    marginTop: 8,
  },
  examplesSection: {
    marginTop: 20,
  },
  exampleCard: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  exampleNote: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 8,
    fontStyle: 'italic',
  },
  exampleLevelBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  exampleLevelText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  // Bảng chia từ
  tableContainer: {
    marginTop: 20,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tableTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: TEAL,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  headerCell: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  headerName: {
    flex: 0.5,
  },
  headerValue: {
    flex: 0.5,
  },
  tableScroll: {
    maxHeight: 400,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tableRowAlt: {
    backgroundColor: '#f8fafc',
  },
  rowCell: {
    fontSize: 12,
    color: '#334155',
  },
  rowName: {
    flex: 0.4,
    fontWeight: '500',
  },
  rowValue: {
    flex: 0.6,
    fontFamily: 'monospace',
    paddingLeft: 36
  },
  viewMoreBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  viewMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEAL,
  },
  // Thêm vào styles, sau các style hiện có (ví dụ sau `viewMoreText`)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    width: '90%',
    maxHeight: '85%',
    alignSelf: 'center',
  },
  imageModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  imageModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  imageModalClose: {
    fontSize: 20,
    fontWeight: '600',
    color: '#64748b',
    padding: 8,
  },
  imageModalContent: {
    maxHeight: '90%',
  },
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