import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Path, Text as SvgText } from "react-native-svg";
import strokeData from "@/assets/kanji_strokes.json";

interface Props {
  kanji: string;
  size?: number;
}

const STROKE_COLORS = [
  "#2563eb", "#dc2626", "#16a34a", "#d97706", "#7c3aed",
  "#0891b2", "#be185d", "#92400e", "#047857", "#1d4ed8",
];

export function KanjiStrokeOrder({ kanji, size = 200 }: Props) {
  const strokes: string[] = useMemo(() => {
    const data = strokeData as Record<string, string[]>;
    return data[kanji] ?? [];
  }, [kanji]);

  if (strokes.length === 0) {
    return (
      <View style={[s.placeholder, { width: size, height: size }]}>
        <Text style={[s.kanjiLarge, { fontSize: size * 0.5 }]}>{kanji}</Text>
        <Text style={s.noDataText}>Chưa có dữ liệu nét</Text>
      </View>
    );
  }

  return (
    <View style={[s.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 109 109">
        {strokes.map((pathData, idx) => (
          <Path
            key={idx}
            d={pathData}
            fill="none"
            stroke={STROKE_COLORS[idx % STROKE_COLORS.length]}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </Svg>
      <View style={s.numbers}>
        {strokes.map((_, idx) => (
          <View key={idx} style={[s.numBadge, { backgroundColor: STROKE_COLORS[idx % STROKE_COLORS.length] }]}>
            <Text style={s.numText}>{idx + 1}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    backgroundColor: "#f8fafc",
  },
  kanjiLarge: {
    fontWeight: "700",
    color: "#2563eb",
  },
  noDataText: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 4,
  },
  numbers: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    justifyContent: "center",
    marginTop: 8,
    maxWidth: 200,
  },
  numBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  numText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },
});
