// ============================================
// FILE: app/exam-result.tsx
// TRANG KẾT QUẢ THI - HIỂN THỊ ĐIỂM VÀ ĐÁNH GIÁ
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { 
  getExamById, 
  calculateTotalScore, 
  getVocabQuestions,
  getGrammarQuestions,
  getReadingQuestions,
  getListeningQuestions,
  TotalScoreResult
} from '../assets/data_EXAMS';

export default function ExamResultScreen() {
  const params = useLocalSearchParams();
  const [result, setResult] = useState<TotalScoreResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [allCompleted, setAllCompleted] = useState(false);
  
  const hasCalculated = useRef(false);
  
  const examId = params.examId as string;
  const vocabAnswersRaw = (params.vocabAnswers as string) || '[]';
  const grammarAnswersRaw = (params.grammarAnswers as string) || '[]';
  const listeningAnswersRaw = (params.listeningAnswers as string) || '[]';

  useEffect(() => {
    if (hasCalculated.current) return;
    hasCalculated.current = true;
    
    const calculateResult = async () => {
      try {
        const vocabAnswers = JSON.parse(vocabAnswersRaw);
        const grammarAnswers = JSON.parse(grammarAnswersRaw);
        const listeningAnswers = JSON.parse(listeningAnswersRaw);

        // examId dạng "n3_01" → suy ra level "N3" từ tiền tố trước dấu gạch dưới
        const level = examId.split('_')[0].toUpperCase();

        const exam = getExamById(level, examId);
        if (!exam) {
          setLoading(false);
          return;
        }

        const vocabQuestions = getVocabQuestions(level, examId);
        const grammarQuestions = getGrammarQuestions(level, examId);
        const readingQuestions = getReadingQuestions(level, examId);
        const listeningQuestions = getListeningQuestions(level, examId);

        const totalResult = calculateTotalScore(
          vocabQuestions,
          vocabAnswers,
          grammarQuestions,
          readingQuestions,
          grammarAnswers,
          listeningQuestions,
          listeningAnswers
        );

        setResult(totalResult);
        
        const totalQuestions = vocabQuestions.length + grammarQuestions.length + readingQuestions.length + listeningQuestions.length;
        const totalAnswers = vocabAnswers.filter((a: number) => a !== -1).length + 
                             grammarAnswers.filter((a: number) => a !== -1).length + 
                             listeningAnswers.filter((a: number) => a !== -1).length;
        setAllCompleted(totalAnswers === totalQuestions);
        
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    calculateResult();
  }, []);

  const getGradeColor = (score: number) => {
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#F59E0B';
    return '#EF4444';
  };

  const getGradeText = (score: number) => {
    if (score >= 80) return 'Xuất sắc';
    if (score >= 60) return 'Khá';
    if (score >= 40) return 'Trung bình';
    return 'Yếu';
  };

  const handleReview = () => {
    if (allCompleted) {
      Alert.alert("📝 Xem lại bài làm", "Tính năng đang được phát triển!");
    } else {
      router.push({
        pathname: '/exam-detail',
        params: { id: examId }
      });
    }
  };

  const handleNewExam = () => {
    router.push('/exam');
  };

  const handleHome = () => {
    router.push('/');
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Đang tính điểm...</Text>
        </View>
      </>
    );
  }

  if (!result) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Không thể tính điểm!</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.button}>
            <Text style={styles.buttonText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        
        <View style={styles.header}>
          <TouchableOpacity onPress={handleHome} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>📊 Kết quả thi</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* TỔNG ĐIỂM */}
        <View style={[styles.totalCard, { borderTopColor: getGradeColor(result.total.score) }]}>
          <Text style={styles.totalLabel}>🎯 Tổng điểm</Text>
          <Text style={[styles.totalScore, { color: getGradeColor(result.total.score) }]}>
            {Math.round(result.total.score)}/{result.total.maxScore}
          </Text>
          <Text style={styles.totalPercentage}>
            ({result.total.percentage.toFixed(1)}%)
          </Text>
          
          <View style={[styles.gradeBadge, { backgroundColor: getGradeColor(result.total.score) }]}>
            <Text style={styles.gradeText}>{getGradeText(result.total.score)}</Text>
          </View>
          
          <View style={[styles.passedContainer, { backgroundColor: result.isPassed ? '#D1FAE5' : '#FEE2E2' }]}>
            <Text style={[styles.passedText, { color: result.isPassed ? '#059669' : '#DC2626' }]}>
              {result.isPassed ? '🎉 CHÚC MỪNG! BẠN ĐÃ ĐỖ 🎉' : '😢 RẤT TIẾC! BẠN ĐÃ TRƯỢT 😢'}
            </Text>
          </View>
        </View>

        {/* ĐIỂM TỪNG PHẦN */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>📋 Chi tiết từng phần</Text>
          
          {/* TỪ VỰNG */}
          <View style={styles.scoreCard}>
            <View style={styles.scoreHeader}>
              <Text style={styles.scoreName}>📖 Từ vựng (30 phút)</Text>
              <Text style={[styles.scoreValue, { color: getGradeColor(result.vocab.scaledScore) }]}>
                {Math.round(result.vocab.scaledScore)}/60
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${(result.vocab.scaledScore / 60) * 100}%`, backgroundColor: '#3B82F6' }]} />
            </View>
            <Text style={styles.scoreDetail}>
              ✅ Đúng {Math.round(result.vocab.rawScore)}/{result.vocab.maxRawScore} câu
            </Text>
          </View>

          {/* NGỮ PHÁP & ĐỌC HIỂU */}
          <View style={styles.scoreCard}>
            <View style={styles.scoreHeader}>
              <Text style={styles.scoreName}>📝 Ngữ pháp & Đọc hiểu (60 phút)</Text>
              <Text style={[styles.scoreValue, { color: getGradeColor(result.grammarReading.scaledScore) }]}>
                {Math.round(result.grammarReading.scaledScore)}/60
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${(result.grammarReading.scaledScore / 60) * 100}%`, backgroundColor: '#F59E0B' }]} />
            </View>
            <Text style={styles.scoreDetail}>
              📌 Ngữ pháp: Đúng {Math.round(result.grammar.rawScore)}/{result.grammar.maxRawScore} câu | 
              📖 Đọc hiểu: Đúng {Math.round(result.reading.rawScore)}/{result.reading.maxRawScore} câu
            </Text>
          </View>

          {/* NGHE HIỂU */}
          <View style={styles.scoreCard}>
            <View style={styles.scoreHeader}>
              <Text style={styles.scoreName}>🎧 Nghe hiểu (35 phút)</Text>
              <Text style={[styles.scoreValue, { color: getGradeColor(result.listening.scaledScore) }]}>
                {Math.round(result.listening.scaledScore)}/60
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${(result.listening.scaledScore / 60) * 100}%`, backgroundColor: '#10B981' }]} />
            </View>
            <Text style={styles.scoreDetail}>
              ✅ Đúng {Math.round(result.listening.rawScore)}/{result.listening.maxRawScore} câu
            </Text>
          </View>
        </View>

        {/* CHI TIẾT THEO MONDAI */}
        {result.vocab.details && (
          <View style={styles.detailContainer}>
            <Text style={styles.detailTitle}>📊 Chi tiết theo Mondai (Từ vựng)</Text>
            <View style={styles.detailGrid}>
              {Object.entries(result.vocab.details).map(([key, detail]: [string, any]) => (
                <View key={key} style={styles.detailCard}>
                  <Text style={styles.detailMondai}>{key.toUpperCase()}</Text>
                  <Text style={styles.detailScore}>
                    {detail.correct}/{detail.total}
                  </Text>
                  <Text style={styles.detailPoints}>
                    {Math.round(detail.points)}/{Math.round(detail.maxPoints)}đ
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* NÚT HÀNH ĐỘNG */}
        <View style={styles.actionContainer}>
          <TouchableOpacity style={[styles.actionButton, styles.reviewButton]} onPress={handleReview}>
            <Text style={styles.reviewButtonText}>
              {allCompleted ? "📝 Xem lại bài làm" : "🔄 Quay lại bài thi"}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionButton, styles.homeButtonLarge]} onPress={handleNewExam}>
            <Text style={styles.homeButtonLargeText}>📚 Làm đề khác</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  backButtonText: { fontSize: 24, color: '#3B82F6' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E293B' },

  totalCard: {
    margin: 16,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    alignItems: 'center',
    borderTopWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  totalLabel: { fontSize: 14, color: '#64748B', marginBottom: 8 },
  totalScore: { fontSize: 48, fontWeight: 'bold', marginBottom: 4 },
  totalPercentage: { fontSize: 16, color: '#64748B', marginBottom: 12 },
  gradeBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginBottom: 16 },
  gradeText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  passedContainer: { width: '100%', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  passedText: { fontSize: 16, fontWeight: 'bold' },

  sectionContainer: { paddingHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B', marginBottom: 12 },
  scoreCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  scoreHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  scoreName: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  scoreValue: { fontSize: 20, fontWeight: 'bold' },
  progressBar: { height: 8, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: 4 },
  scoreDetail: { fontSize: 12, color: '#64748B' },

  detailContainer: { paddingHorizontal: 16, marginBottom: 16 },
  detailTitle: { fontSize: 16, fontWeight: '600', color: '#1E293B', marginBottom: 12 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  detailCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  detailMondai: { fontSize: 12, fontWeight: 'bold', color: '#64748B', marginBottom: 4 },
  detailScore: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  detailPoints: { fontSize: 10, color: '#94A3B8', marginTop: 2 },

  actionContainer: { flexDirection: 'row', padding: 16, gap: 12, marginBottom: 32 },
  actionButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  reviewButton: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#3B82F6' },
  reviewButtonText: { color: '#3B82F6', fontSize: 14, fontWeight: '600' },
  homeButtonLarge: { backgroundColor: '#3B82F6' },
  homeButtonLargeText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },

  loadingText: { marginTop: 12, fontSize: 14, color: '#64748B' },
  errorText: { fontSize: 18, color: '#EF4444', textAlign: 'center', marginBottom: 20 },
  button: { backgroundColor: '#3B82F6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
