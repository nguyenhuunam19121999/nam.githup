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

const TEAL = "#1f7a1f";
const TEAL_DARK = "#1c5765";
const BG_GRAY = "#f0f4f8";

interface SentenceDetailInlineProps {
  jp: string;
  vi: string;
  pattern?: string;
  level?: string;
  note?: string;
  onClose: () => void;
}

export default function SentenceDetailInline({
  jp,
  vi,
  pattern,
  level,
  note,
  onClose,
}: SentenceDetailInlineProps) {
  const [showRomaji, setShowRomaji] = useState(false);

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
      return <Text style={styles.jpText}>{jp}</Text>;
    }
    const parts = jp.split(pattern);
    return (
      <Text style={styles.jpText}>
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
    // <View style={styles.container}>
    //   {/* Header */}
    //   <View style={styles.header}>
    //     <TouchableOpacity onPress={onClose} style={styles.backBtn}>
    //       <Text style={styles.backIcon}>‹</Text>
    //     </TouchableOpacity>
    //     <Text style={styles.headerTitle}>Chi tiết mẫu câu</Text>
    //     {/* <TouchableOpacity onPress={speakSentence} style={styles.speakBtn}>
    //       <Text style={styles.speakIcon}>🔊</Text>
    //     </TouchableOpacity> */}
    //   </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Câu chính */}
        <View style={styles.sentenceCard}>
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

          <View style={styles.jpBox}>
            {renderHighlightedSentence()}
          </View>

          <TouchableOpacity
            style={styles.listenBtn}
            onPress={speakSentence}
            activeOpacity={0.7}
          >
            <Text style={styles.listenBtnText}>🔊 Nghe phát âm</Text>
          </TouchableOpacity>
        </View>

        {/* Dịch nghĩa */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>🇻🇳 Dịch nghĩa</Text>
          <View style={styles.viBox}>
            <Text style={styles.viText}>{vi}</Text>
          </View>
        </View>

        {/* Ngữ pháp liên quan */}
        {pattern ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>📐 Mẫu ngữ pháp</Text>
            <View style={styles.grammarBox}>
              <Text style={styles.grammarPatternText}>{pattern}</Text>
              <Text style={styles.grammarNote}>Mẫu câu được highlight màu xanh trong câu trên</Text>
            </View>
          </View>
        ) : null}

        {/* Ghi chú */}
        {note ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>💡 Ghi chú</Text>
            <View style={styles.noteBox}>
              <Text style={styles.noteText}>{note}</Text>
            </View>
          </View>
        ) : null}

        {/* Luyện tập */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>🎯 Luyện tập</Text>
          <View style={styles.practiceBox}>
            <Text style={styles.practiceJp}>{jp}</Text>
            <View style={styles.practiceActions}>
              <TouchableOpacity
                style={styles.practiceBtn}
                onPress={speakSentence}
                activeOpacity={0.7}
              >
                <Text style={styles.practiceBtnText}>🔊 Nghe lại</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    // </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: BG_GRAY 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 4,
    backgroundColor: BG_GRAY,
    borderBottomWidth: 1,
    // borderBottomColor: '#e2e8f0',
    borderBottomColor: BG_GRAY,
  },
  backBtn: {
    width: 42, height: 42,
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
    marginTop: -4 
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: TEAL_DARK },
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
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    borderWidth: 1, borderColor: '#e2e8f0',
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
    backgroundColor: '#f8fafc',
    padding: 16, borderRadius: 12,
    marginBottom: 14,
  },
  jpText: {
    fontSize: 20,
    fontWeight: '700',
    color: TEAL_DARK,
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
  listenBtnText: { fontSize: 14, fontWeight: '600', color: TEAL },
  section: { marginTop: 16 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  viBox: {
    backgroundColor: '#fff',
    padding: 16, borderRadius: 12,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  viText: { fontSize: 16, color: '#1e293b', lineHeight: 26 },
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
    backgroundColor: '#fff',
    padding: 16, borderRadius: 12,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  practiceJp: {
    fontSize: 18, fontWeight: '700',
    color: TEAL_DARK, lineHeight: 30,
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
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
  },
  practiceBtnText: { fontSize: 13, fontWeight: '600', color: '#475569' },
});
