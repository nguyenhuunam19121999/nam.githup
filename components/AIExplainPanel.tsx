// components/AIExplainPanel.tsx
//
// Khung chat AI luôn hiển thị sẵn, có viền gradient + header riêng để nổi bật
// rõ đây là tính năng AI (khác với các khối thông tin tĩnh khác trên trang).
// Khi đang gọi AI: hiện hiệu ứng "đang suy nghĩ" (chấm nhảy) cả trong khung
// lẫn trên nút. Nút CHỈ đổi sang "Đã xong" sau khi chữ đã chạy (typing effect)
// hoàn tất hẳn trong khung — không đổi ngay khi vừa nhận được kết quả.

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '../artifacts/mirai-jp/hooks/useColors';
import {
  lookupAI,
  AIResult,
  AIExample,
  AILookupType,
  NotAuthenticatedError,
  AIQuotaExceededError,
  AIMaintenanceError,
} from '../services/aiService';

interface AIExplainPanelProps {
  type: AILookupType;
  word: string;
  context?: string;
}

// Gradient riêng cho tính năng AI — tím-xanh, khác hẳn tông cam/vàng của search
// bar hay màu primary thường của app, để mắt người dùng nhận ra ngay "đây là AI".
const AI_GRAD = ['#6366F1', '#A855F7'] as const;

const TYPING_CHARS_PER_TICK = 1;
const TYPING_TICK_MS = 30;
const CHAT_BOX_HEIGHT = 260;

function buildDisplayText(r: AIResult, type: AILookupType): string {
  if (r.parseFailed) {
    return r.meaning;
  }

  let text = `📖 Nghĩa\n${r.meaning}`;

  if (type === 'vocab' && r.part_of_speech?.trim()) {
    text += `\n\n🏷️ Từ loại\n${r.part_of_speech}`;
  }

  if (type === 'grammar' && r.structure?.trim()) {
    text += `\n\n🧩 Cấu trúc\n${r.structure}`;
  }

  if (r.usage?.trim()) {
    text += `\n\n✏️ Cách dùng\n${r.usage}`;
  }

  if (type === 'grammar' && r.conjugation?.trim()) {
    text += `\n\n🔄 Biến đổi\n${r.conjugation}`;
  }

  if (type === 'kanji' && r.component_analysis?.trim()) {
    text += `\n\n🧩 Phân tích bộ thủ\n${r.component_analysis}`;
  }

  if (type === 'vocab' && r.kanji_breakdown?.trim()) {
    text += `\n\n🈁 Phân tích kanji trong từ\n${r.kanji_breakdown}`;
  }

  if (r.examples?.length > 0) {
    text += `\n\n📝 Ví dụ`;
    r.examples.forEach((ex, i) => {
      text += `\n${i + 1}. ${ex.jp}\n   → ${ex.vi}`;
    });
  }

  if (type === 'vocab' && r.collocations?.trim()) {
    text += `\n\n🔗 Kết hợp từ thường gặp\n${r.collocations}`;
  }

  if (r.synonyms_distinction?.trim()) {
    text += `\n\n🔍 Phân biệt từ/mẫu đồng nghĩa\n${r.synonyms_distinction}`;
  }

  if (type === 'kanji' && r.similar_kanji?.trim()) {
    text += `\n\n⚠️ Kanji dễ nhầm\n${r.similar_kanji}`;
  }

  if (type === 'kanji' && r.stroke_count_note?.trim()) {
    text += `\n\n✍️ Mẹo nhớ mặt chữ\n${r.stroke_count_note}`;
  }

  if (type === 'grammar' && r.jlpt_level?.trim()) {
    text += `\n\n🎓 Cấp độ JLPT\n${r.jlpt_level}`;
  }

  if (r.notes?.trim()) {
    text += `\n\n💡 Ghi chú\n${r.notes}`;
  }

  return text;
}

// function buildDisplayText(r: AIResult): string {
//   if (r.parseFailed) {
//     return r.meaning;
//   }

//   let text = `📖 Nghĩa\n${r.meaning}`;

//   if (r.usage?.trim()) {
//     text += `\n\n✏️ Cách dùng\n${r.usage}`;
//   }

//   if (r.examples?.length > 0) {
//     text += `\n\n📝 Ví dụ`;
//     r.examples.forEach((ex: AIExample, i: number) => {
//       text += `\n${i + 1}. ${ex.jp}\n   → ${ex.vi}`;
//     });
//   }

//   if (r.synonyms_distinction?.trim()) {
//     text += `\n\n🔍 Phân biệt từ đồng nghĩa\n${r.synonyms_distinction}`;
//   }

//   if (r.notes?.trim()) {
//     text += `\n\n💡 Ghi chú\n${r.notes}`;
//   }

//   return text;
// }

// ─── Chấm nhảy "đang suy nghĩ" — tự đổi số chấm mỗi 400ms, không cần Animated ──
function ThinkingDots({ color }: { color: string }) {
  const [dotCount, setDotCount] = useState(1);
  useEffect(() => {
    const id = setInterval(() => {
      setDotCount((n) => (n % 3) + 1);
    }, 400);
    return () => clearInterval(id);
  }, []);
  return (
    <Text style={{ color : "#888888", fontSize: 13, fontWeight: '700'}}>
      AI Thinking{'.'.repeat(dotCount)}
    </Text>
  );
}

export default function AIExplainPanel({ type, word, context }: AIExplainPanelProps) {
  const c = useColors();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<AIResult | null>(null);
  const [displayedText, setDisplayedText] = useState('');
  const [typingDone, setTypingDone] = useState(false); // true khi chữ đã chạy XONG HẲN trong khung
  const typingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!result) return;
    const fullText = buildDisplayText(result, type); 
    setDisplayedText('');
    setTypingDone(false);

    let pos = 0;
    typingTimerRef.current = setInterval(() => {
      pos += TYPING_CHARS_PER_TICK;
      setDisplayedText(fullText.slice(0, pos));
      scrollRef.current?.scrollToEnd({ animated: false });
      if (pos >= fullText.length) {
        if (typingTimerRef.current) clearInterval(typingTimerRef.current);
        typingTimerRef.current = null;
        setTypingDone(true); // chỉ tới đây, nút mới được phép đổi thành "Đã xong"
      }
    }, TYPING_TICK_MS);

    return () => {
      if (typingTimerRef.current) {
        clearInterval(typingTimerRef.current);
        typingTimerRef.current = null;
      }
    };
  }, [result]);

  const handlePress = async () => {
    if (result || loading) return;

    setLoading(true);
    setErrorMsg(null);
    try {
      const r = await lookupAI(type, word, context);
      setResult(r);
    } catch (err: any) {
      console.error('[AIExplainPanel] Lỗi thật khi tra cứu AI:', err);
      if (err instanceof NotAuthenticatedError) {
        setErrorMsg('Vui lòng đăng nhập để dùng tính năng tra cứu AI.');
      } else if (err instanceof AIQuotaExceededError) {
        const resetTime = err.resetAt
          ? new Date(err.resetAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
          : null;
        setErrorMsg(
          `Bạn đã dùng hết ${err.used ?? '?'}/${err.limit ?? '?'} lượt tra cứu AI hôm nay. ` +
            (resetTime ? `Quay lại sau ${resetTime} nhé.` : 'Quay lại vào ngày mai nhé.')
        );
      } else if (err instanceof AIMaintenanceError) {
        setErrorMsg('Hệ thống AI đang bảo trì, vui lòng thử lại sau ít phút.');
      } else {
        setErrorMsg('Có lỗi khi tra cứu AI, vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setResult(null);
    setErrorMsg(null);
    setTypingDone(false);
    handlePress();
  };

  const hasAnyContent = loading || !!errorMsg || !!result;
  const isThinking = loading; // đang chờ AI trả lời (chưa có gì cả)
  const isTypingInProgress = !!result && !typingDone && !errorMsg; // đã có data, đang "gõ" ra màn hình
  const isFullyDone = !!result && typingDone && !errorMsg;

  let buttonLabel = '🤖 Tra cứu từ AI';
  if (isThinking) buttonLabel = ''; // dùng ThinkingDots thay chữ tĩnh
  else if (errorMsg) buttonLabel = '🔄 Retry';
  else if (isTypingInProgress) buttonLabel = 'AI replying...';
  else if (isFullyDone) buttonLabel = '✅ Completed';

  const buttonDisabled = loading || isTypingInProgress || isFullyDone;

  return (
    <View style={styles.wrapper}>
      {/* Viền gradient tím-xanh — làm nổi bật đây là tính năng AI, khác các khối thường */}
      <LinearGradient colors={AI_GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientBorder}>
        <View style={[styles.chatBox, { backgroundColor: '#272829' }]}>
          {/* Header riêng — icon + tên, để nhận diện ngay đây là AI */}
          <LinearGradient colors={AI_GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
            <Text style={styles.headerIcon}>🤖</Text>
            <Text style={styles.headerTitle}>Trợ lý AI Mirai</Text>
          </LinearGradient>

          <ScrollView
            ref={scrollRef}
            style={{ maxHeight: CHAT_BOX_HEIGHT }}
            contentContainerStyle={styles.chatContent}
            showsVerticalScrollIndicator
          >
            {!hasAnyContent && (
              <Text style={[styles.placeholderText, { color: c.mutedForeground }]}>
                🤖 Nhấn &quot;Tra cứu từ AI&quot; bên dưới để xem giải thích chi tiết về{' '}
                <Text style={{ fontWeight: '700' }}>{word}</Text>...
              </Text>
            )}

            {isThinking && (
              <View style={styles.thinkingRow}>
                <ThinkingDots color="#8B5CF6" />
              </View>
            )}

            {errorMsg && !loading && <Text style={[styles.errorText, { color: c.destructive }]}>{errorMsg}</Text>}

            {result && !errorMsg && !loading && (
              <Text style={[styles.resultText, { color: '#f2f5f9' }]}>{displayedText}</Text>
            )}
          </ScrollView>
        </View>
      </LinearGradient>

      {/* Nút tra cứu */}
      <TouchableOpacity
        onPress={errorMsg ? handleRetry : handlePress}
        activeOpacity={0.85}
        disabled={buttonDisabled}
        style={styles.triggerBtnWrapper}
      >
        <LinearGradient
          colors={buttonDisabled && !isThinking && !errorMsg ? ['#94A3B8', '#94A3B8'] : AI_GRAD}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.triggerBtn}
        >
          {isThinking ? (
            <ThinkingDots color="#fff" />
          ) : (
            <Text style={styles.triggerText}>{buttonLabel}</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  gradientBorder: {
    borderRadius: 14,
    padding: 2,
    marginBottom: 10,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  chatBox: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  headerIcon: {
    fontSize: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  chatContent: {
    padding: 14,
  },
  placeholderText: {
    fontSize: 13,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  thinkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  errorText: {
    fontSize: 13,
    lineHeight: 20,
  },
  resultText: {
    fontSize: 14,
    lineHeight: 22,
  },
  triggerBtnWrapper: {
    borderRadius: 12,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  triggerBtn: {
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  triggerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
});