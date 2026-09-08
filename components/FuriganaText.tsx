// components/FuriganaText.tsx
//
// Hiển thị câu tiếng Nhật với furigana THẬT (hiragana nhỏ nằm phía trên kanji),
// giống sách giáo khoa, không dùng thẻ HTML <ruby> (RN không hỗ trợ).
//
// Cách làm: mỗi "segment" là 1 cụm chữ. Nếu segment có furigana → dựng 1 View
// dọc (furigana nhỏ ở trên, chữ chính ở dưới). Nếu không có furigana (phần
// hiragana/dấu câu/trợ từ) → render thẳng bằng Text, canh theo baseline dưới
// cùng để không bị lệch dòng so với các cụm có furigana bên cạnh.
//
// Toàn bộ segment được xếp trong 1 View flexDirection:'row' + flexWrap:'wrap'
// để câu dài tự động xuống dòng đúng chỗ mà không cắt đứt giữa 1 cụm kanji.
//
// ⚠️ NGẮT DÒNG ÉP BUỘC ("\n"): vì mỗi segment là 1 flex-item riêng trong 1
// row flexWrap, ký tự "\n" bên trong text của 1 segment KHÔNG đẩy được các
// segment kế tiếp xuống dòng mới (nó chỉ tự xuống dòng bên trong CHÍNH Text
// đó). Để thực sự ngắt dòng giữa 2 segment (ví dụ giữa 2 chữ kanji trong
// kanji_breakdown), ta tách text tại "\n" và chèn 1 View rộng 100% xen giữa
// — 1 flex-item chiếm trọn hàng sẽ buộc mọi thứ phía sau rơi xuống hàng mới.

import React from 'react';
import { View, Text, StyleSheet, TextStyle } from 'react-native';

export interface FuriganaSegment {
  text: string;
  furigana?: string;
}

interface FuriganaTextProps {
  segments: FuriganaSegment[];
  color?: string;
  fontSize?: number;
  furiganaFontSize?: number;
  textStyle?: TextStyle;
  furiganaStyle?: TextStyle;
}

export default function FuriganaText({
  segments,
  color = '#f2f5f9',
  fontSize = 15,
  furiganaFontSize = 10,
  textStyle,
  furiganaStyle,
}: FuriganaTextProps) {
  if (!segments || segments.length === 0) return null;

  return (
    <View style={styles.row}>
      {segments.map((seg, i) => {
        const hasFurigana = !!seg.furigana?.trim();
        const rawText = seg.text || '';
        if (hasFurigana) {
          return (
            <View key={i} style={styles.unit}>
              <Text
                numberOfLines={1}
                style={[
                  styles.furigana,
                  { color, fontSize: furiganaFontSize, lineHeight: furiganaFontSize + 2 },
                  furiganaStyle,
                ]}
              >
                {seg.furigana}
              </Text>
              <Text style={[styles.mainText, { color, fontSize, lineHeight: fontSize + 8 }, textStyle]}>
                {rawText}
              </Text>
            </View>
          );
        }
        if (rawText.includes('\n')) {
          const parts = rawText.split('\n');
          return (
            <React.Fragment key={i}>
              {parts.map((part, pi) => (
                <React.Fragment key={pi}>
                  {pi > 0 && <View style={styles.lineBreak} />}
                  {part.length > 0 && (
                    <Text
                      style={[
                        styles.mainText,
                        styles.plainUnit,
                        { color, fontSize, lineHeight: fontSize + 8 },
                        textStyle,
                      ]}
                    >
                      {part}
                    </Text>
                  )}
                </React.Fragment>
              ))}
            </React.Fragment>
          );
        }

        // Không có furigana, không có "\n" (trợ từ, dấu câu, phần hiragana...)
        return (
          <Text
            key={i}
            style={[
              styles.mainText,
              styles.plainUnit,
              { color, fontSize, lineHeight: fontSize + 8 },
              textStyle,
            ]}
          >
            {rawText}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  },
  unit: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  furigana: {
    textAlign: 'center',
  },
  mainText: {
    fontWeight: '500',
  },
  plainUnit: {
    marginBottom: 0,
  },
  lineBreak: {
    width: '100%',
    height: 0,
  },
});