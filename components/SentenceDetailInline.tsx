// components/SentenceDetailInline.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import * as Speech from 'expo-speech';
import FuriganaText from './FuriganaText';
import { useColors } from '../artifacts/mirai-jp/hooks/useColors';

interface SentenceDetailInlineProps {
  jp: string;
  vi: string;
  pattern?: string;
  level?: string;
  note?: string;
  reading?: { text: string; furigana?: string }[];
  onClose: () => void;
}

export default function SentenceDetailInline({
  jp,
  vi,
  pattern,
  level,
  note,
  reading,
  onClose,
}: SentenceDetailInlineProps) {
  const c = useColors(); // bảng màu hiện tại — tự đổi theo giờ / lựa chọn người dùng
  const [showRomaji, setShowRomaji] = useState(false);

  // Màu badge cấp độ JLPT — cố định theo cấp, không đổi theo theme
  // (cùng lý do như các file khác: mã màu nhận diện nhanh theo N5–N1).
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

  const speakSentence = () => {
    if (jp) Speech.speak(jp, { language: 'ja-JP', pitch: 1, rate: 0.75 });
  };

  // Split câu thành từng phần để highlight
  const renderHighlightedSentence = () => {
    if (!pattern || !jp.includes(pattern)) {
      return <Text style={[styles.jpText, { color: c.primary }]}>{jp}</Text>;
    }
    const parts = jp.split(pattern);
    return (
      <Text style={[styles.jpText, { color: c.primary }]}>
        {parts.map((part, i) => (
          <React.Fragment key={i}>
            {part}
            {i < parts.length - 1 && (
              <Text style={styles.jpHighlight}>{pattern}</Text>
            )}
          </React.Fragment>
        ))}
      </Text>
    );
  };

  return (
    // <View style={[styles.container, { backgroundColor: c.background }]}>
    //   {/* Header */}
    //   <View style={[styles.header, { backgroundColor: c.background, borderBottomColor: c.background }]}>
    //     <TouchableOpacity onPress={onClose} style={[styles.backBtn, { backgroundColor: c.card, borderColor: c.border }]}>
    //       <Text style={[styles.backIcon, { color: c.primary }]}>‹</Text>
    //     </TouchableOpacity>
    //     <Text style={[styles.headerTitle, { color: c.primary }]}>Chi tiết mẫu câu</Text>
    //     {/* <TouchableOpacity onPress={speakSentence} style={[styles.speakBtn, { backgroundColor: c.card, borderColor: c.border }]}>
    //       <Text style={styles.speakIcon}>🔊</Text>
    //     </TouchableOpacity> */}
    //   </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Câu chính */}
        <View style={[styles.sentenceCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={styles.badgeRow}>
            {level ? (
              <View style={[styles.levelBadge, { backgroundColor: getLevelColor(level) + '20' }]}>
                <Text style={[styles.levelText, { color: getLevelColor(level) }]}>JLPT {level}</Text>
              </View>
            ) : null}
            {pattern ? (
              <View style={styles.patternBadge}>
                <Text style={styles.patternBadgeText}>📝 {pattern}</Text>
              </View>
            ) : null}
          </View>

          <View style={[styles.jpBox, { backgroundColor: c.muted }]}>
            {reading && reading.length > 0 ? (
              <FuriganaText segments={reading} color={c.primary} fontSize={20} furiganaFontSize={12} />
            ) : (
              renderHighlightedSentence()
            )}
          </View>
          <TouchableOpacity
            style={styles.listenBtn}
            onPress={speakSentence}
            activeOpacity={0.7}
          >
            <Text style={[styles.listenBtnText, { color: c.primary }]}>🔊 Nghe phát âm</Text>
          </TouchableOpacity>
        </View>

        {/* Dịch nghĩa */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: c.mutedForeground }]}>🇻🇳 Dịch nghĩa</Text>
          <View style={[styles.viBox, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.viText, { color: c.text }]}>{vi}</Text>
          </View>
        </View>

        {/* Ngữ pháp liên quan */}
        {pattern ? (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: c.mutedForeground }]}>📐 Mẫu ngữ pháp</Text>
            <View style={styles.grammarBox}>
              <Text style={styles.grammarPatternText}>{pattern}</Text>
              <Text style={styles.grammarNote}>Mẫu câu được highlight màu xanh trong câu trên</Text>
            </View>
          </View>
        ) : null}

        {/* Ghi chú */}
        {note ? (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: c.mutedForeground }]}>💡 Ghi chú</Text>
            <View style={styles.noteBox}>
              <Text style={styles.noteText}>{note}</Text>
            </View>
          </View>
        ) : null}

        {/* Luyện tập */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: c.mutedForeground }]}>🎯 Luyện tập</Text>
          <View style={[styles.practiceBox, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.practiceJp, { color: c.primary }]}>{jp}</Text>
            <View style={styles.practiceActions}>
              <TouchableOpacity
                style={[styles.practiceBtn, { backgroundColor: c.muted }]}
                onPress={speakSentence}
                activeOpacity={0.7}
              >
                <Text style={[styles.practiceBtnText, { color: c.text }]}>🔊 Nghe lại</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    // </View>
  );
}

// ─── Styles (chỉ layout — màu gán inline theo theme ở trên) ───────────────────
// Riêng patternBadge / jpHighlight / listenBtn / grammarBox / noteBox giữ
// nguyên hex cố định (khối "highlight" theo ngữ cảnh — vàng/đỏ/xanh lá/xanh
// dương nhạt) — không đổi theo theme, cùng lý do như các file trước.
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 42, height: 42,
    borderRadius: 12,
    alignItems: 'center', 
    justifyContent: 'center',
    borderWidth: 1.5, 
  },
  backIcon: { 
    fontSize: 28, 
    fontWeight: '300', 
    marginTop: -4 
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  speakBtn: {
    width: 42, height: 42,
    backgroundColor: '#fff',
    borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#e2e8f0',
  },
  speakIcon: { fontSize: 20 },
  content: { flex: 1, paddingHorizontal: 16 },
  sentenceCard: {
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  levelBadge: {
    paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 16,
  },
  levelText: { fontSize: 12, fontWeight: '700' },
  patternBadge: {
    paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: '#fef3c7',
  },
  patternBadgeText: { fontSize: 12, fontWeight: '600', color: '#92400e' },
  jpBox: {
    padding: 16, borderRadius: 12,
    marginBottom: 14,
  },
  jpText: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 34,
  },
  jpHighlight: {
    color: '#dc2626',
    backgroundColor: '#fee2e2',
    borderRadius: 4,
  },
  listenBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  listenBtnText: { fontSize: 14, fontWeight: '600' },
  section: { marginTop: 16 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  viBox: {
    padding: 16, borderRadius: 12,
    borderWidth: 1,
  },
  viText: { fontSize: 16, lineHeight: 26 },
  grammarBox: {
    backgroundColor: '#eff6ff',
    padding: 14, borderRadius: 12,
    borderWidth: 1, borderColor: '#bfdbfe',
  },
  grammarPatternText: {
    fontSize: 18, fontWeight: '700',
    color: '#1e40af', marginBottom: 6,
  },
  grammarNote: { fontSize: 13, color: '#3b82f6' },
  noteBox: {
    backgroundColor: '#fefce8',
    padding: 14, borderRadius: 12,
    borderWidth: 1, borderColor: '#fde68a',
  },
  noteText: { fontSize: 14, color: '#713f12', lineHeight: 22 },
  practiceBox: {
    padding: 16, borderRadius: 12,
    borderWidth: 1,
  },
  practiceJp: {
    fontSize: 18, fontWeight: '700',
    lineHeight: 30,
    marginBottom: 12,
  },
  practiceActions: {
    flexDirection: 'row',
    gap: 10,
  },
  practiceBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  practiceBtnText: { fontSize: 13, fontWeight: '600' },
});