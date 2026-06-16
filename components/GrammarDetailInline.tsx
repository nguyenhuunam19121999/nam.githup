// components/GrammarDetailInline.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

const TEAL = "#1f7a1f";
const TEAL_DARK = "#1c5765";
const BG_GRAY = "#f0f4f8";

interface GrammarDetailInlineProps {
  id?: string;
  pattern: string;
  reading?: string;
  meaning: string;
  structure?: string;
  note?: string;
  level?: string;
  examples?: Array<{ jp?: string; sentence?: string; vi?: string; translation?: string }>;
  onClose: () => void;
}

export default function GrammarDetailInline({
  pattern,
  reading,
  meaning,
  structure,
  note,
  level,
  examples = [],
  onClose,
}: GrammarDetailInlineProps) {
  const [showStructure, setShowStructure] = useState(false);

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

  return (
    // <View style={styles.container}>
    //   {/* Header */}
    //   <View style={styles.header}>
    //     <TouchableOpacity onPress={onClose} style={styles.backBtn}>
    //       <Text style={styles.backIcon}>‹</Text>
    //     </TouchableOpacity>
    //     <Text style={styles.headerTitle}>Chi tiết ngữ pháp</Text>
    //     <View style={styles.headerPlaceholder} />
    //   </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Pattern card */}
        <View style={styles.patternCard}>
          <View style={styles.patternRow}>
            <Text style={styles.patternText}>{pattern}</Text>
          </View>
          {reading ? (
            <Text style={styles.readingText}>{reading}</Text>
          ) : null}
          {level ? (
            <View style={[styles.levelBadge, { backgroundColor: getLevelColor(level) + '20' }]}>
              <Text style={[styles.levelText, { color: getLevelColor(level) }]}>JLPT {level}</Text>
            </View>
          ) : null}
        </View>

        {/* Meaning */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>📖 Ý nghĩa</Text>
          <View style={styles.meaningBox}>
            <Text style={styles.meaningText}>{meaning}</Text>
          </View>
        </View>

        {/* Structure (optional) */}
        {structure ? (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.structureHeader}
              onPress={() => setShowStructure(!showStructure)}
            >
              <Text style={styles.sectionLabel}>🔧 Cấu trúc</Text>
              <Text style={styles.toggleBtn}>{showStructure ? 'Thu gọn ▲' : 'Xem ▼'}</Text>
            </TouchableOpacity>
            {showStructure && (
              <View style={styles.structureBox}>
                <Text style={styles.structureText}>{structure}</Text>
              </View>
            )}
          </View>
        ) : null}

        {/* Note */}
        {note ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>💡 Ghi chú</Text>
            <View style={styles.noteBox}>
              <Text style={styles.noteText}>{note}</Text>
            </View>
          </View>
        ) : null}

        {/* Examples */}
        {examples.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>✏️ Ví dụ ({examples.length})</Text>
            {examples.map((ex, idx) => {
              const jp = ex.jp || ex.sentence || '';
              const vi = ex.vi || ex.translation || '';
              return (
                <View key={idx} style={styles.exampleCard}>
                  <View style={styles.exNumBadge}>
                    <Text style={styles.exNumText}>{idx + 1}</Text>
                  </View>
                  <View style={styles.exContent}>
                    <Text style={styles.exJp}>{jp}</Text>
                    {vi ? <Text style={styles.exVi}>{vi}</Text> : null}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    // </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_GRAY },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: BG_GRAY,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: {
    width: 42, height: 42,
    backgroundColor: '#fff',
    borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#e2e8f0',
  },
  backIcon: { fontSize: 28, color: TEAL_DARK, fontWeight: '300', marginTop: -4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: TEAL_DARK },
  headerPlaceholder: { width: 42 },
  content: { flex: 1, paddingHorizontal: 16 },
  patternCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    marginBottom: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  patternRow: { marginBottom: 8 },
  patternText: {
    fontSize: 26,
    fontWeight: '800',
    color: TEAL_DARK,
    textAlign: 'center',
  },
  readingText: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 10,
  },
  levelBadge: {
    paddingHorizontal: 14, paddingVertical: 4,
    borderRadius: 16,
  },
  levelText: { fontSize: 12, fontWeight: '700' },
  section: { marginTop: 16 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  structureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  toggleBtn: { fontSize: 12, color: TEAL, fontWeight: '600' },
  meaningBox: {
    backgroundColor: '#fff',
    padding: 16, borderRadius: 12,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  meaningText: { fontSize: 16, color: '#1e293b', lineHeight: 26 },
  structureBox: {
    backgroundColor: '#f0fdf4',
    padding: 14, borderRadius: 12,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  structureText: { fontSize: 14, color: '#166534', lineHeight: 22, fontFamily: 'monospace' },
  noteBox: {
    backgroundColor: '#fefce8',
    padding: 14, borderRadius: 12,
    borderWidth: 1, borderColor: '#fde68a',
  },
  noteText: { fontSize: 14, color: '#713f12', lineHeight: 22 },
  exampleCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1, borderColor: '#e2e8f0',
    gap: 12,
  },
  exNumBadge: {
    width: 24, height: 24,
    borderRadius: 12,
    backgroundColor: TEAL,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  exNumText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  exContent: { flex: 1 },
  exJp: { fontSize: 16, fontWeight: '700', color: TEAL_DARK, marginBottom: 6, lineHeight: 24 },
  exVi: { fontSize: 13, color: '#475569', lineHeight: 20 },
});
