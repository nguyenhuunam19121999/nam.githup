// WritingPracticeModal.tsx — Modal luyện viết Kanji
//
// Cấu trúc layout (từ trên xuống):
//   [Handle + Header]              ← cố định, không cuộn
//   [ScrollView]                   ← cuộn: thông tin chữ + tham khảo nét
//   [Nhãn "Vùng luyện viết"]       ← cố định
//   [Canvas 田字格 — DrawingCanvas] ← cố định, KHÔNG cuộn, nét lưu đúng
//   [Nút Hoàn tác / Xoá hết]       ← cố định
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Modal,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { AdBanner } from "../components/AdBanner";
import Svg, { Line, Path, Rect } from "react-native-svg";
import { type KanjiItem, getKunyomiFromFull } from "../assets/data_JLPT_kanji";
import { KanjiStrokeOrder } from "./KanjiStrokeOrder";
import { loadStrokePaths } from "../services/KanjiPreloader";
import { useColors, ThemeFadeOverlay } from "../artifacts/mirai-jp/hooks/useColors";

const SCREEN_W      = Dimensions.get("window").width;
const CANVAS_SIZE    = Math.min(SCREEN_W - 24, 340);
const CANVAS_WIDTH   = CANVAS_SIZE;
const CANVAS_HEIGHT  = CANVAS_SIZE * 0.8;

// ─── Lưới 5 ô ly giống vở học sinh ──────────────────────────────────────────
// Giấy viết giữ tông riêng (giống giấy thật), chỉ đổi nhẹ giữa sáng/tối
// thay vì bám theo toàn bộ bảng màu theme — để cảm giác "viết trên giấy"
// không bị phá vỡ khi đổi theme.
function KanjiGrid({ width, height, paperColor, lineColor }: { width: number; height: number; paperColor: string; lineColor: string }) {
  const cellSize = width / 5;

  return (
    <>
      <Rect x={0} y={0} width={width} height={height} fill={paperColor} />

      {[1, 2, 3, 4].map((i) => (
        <Line
          key={`v-${i}`}
          x1={i * cellSize}
          y1={0}
          x2={i * cellSize}
          y2={height}
          stroke={lineColor}
          strokeWidth={0.8}
          strokeDasharray="2,2"
        />
      ))}

      {[1, 2, 3, 4].map((i) => (
        <Line
          key={`h-${i}`}
          x1={0}
          y1={i * (height / 5)}
          x2={width}
          y2={i * (height / 5)}
          stroke={lineColor}
          strokeWidth={0.8}
          strokeDasharray="2,2"
        />
      ))}
    </>
  );
}

// ─── Component hiển thị nét vẽ mờ (không controls) ──────────────────────────
function GhostStrokeView({
  kanji,
  size,
  reloadTrigger,
  ghostColor,
}: {
  kanji: string;
  size: number;
  reloadTrigger: number;
  ghostColor: string;
}) {
  const [paths, setPaths] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPaths = async () => {
      setLoading(true);
      try {
        const forceRefresh = reloadTrigger > 0;
        const result = await loadStrokePaths(kanji, forceRefresh);
        setPaths(result.paths || []);
      } catch (error) {
        console.error('Error loading stroke paths:', error);
      } finally {
        setLoading(false);
      }
    };
    loadPaths();
  }, [kanji, reloadTrigger]);

  if (loading || paths.length === 0) {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: size * 0.7, color: ghostColor, opacity: 0.15 }}>
          {kanji}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ width: size, height: size }}>
      <Svg width="100%" height="100%" viewBox="0 0 109 109">
        {paths.map((d, i) => (
          <Path
            key={i}
            d={d}
            stroke={ghostColor}
            strokeWidth={3.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.2}
          />
        ))}
      </Svg>
    </View>
  );
}

// ─── Canvas tách riêng ────────────────────────────────────────────────────────
interface DrawingCanvasProps {
  kanjiChar: string;
  strokes: string[];
  livePathRef: React.MutableRefObject<string>;
  panHandlers: object;
  onRegisterTick: (fn: () => void) => void;
  reloadTrigger: number;
  paperColor: string;
  gridLineColor: string;
  inkColor: string;
}

function DrawingCanvas({
  kanjiChar,
  strokes,
  livePathRef,
  panHandlers,
  onRegisterTick,
  reloadTrigger,
  paperColor,
  gridLineColor,
  inkColor,
}: DrawingCanvasProps) {
  const [, setTick] = useState(0);

  useEffect(() => {
    onRegisterTick(() => setTick((n) => n + 1));
  }, [onRegisterTick]);

  return (
    <View style={dc.wrap} {...panHandlers}>
      <View style={dc.ghostKanjiWrap} pointerEvents="none">
        <GhostStrokeView
          kanji={kanjiChar}
          size={CANVAS_HEIGHT * 0.85}
          reloadTrigger={reloadTrigger}
          ghostColor={inkColor}
        />
      </View>

      <Svg
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={StyleSheet.absoluteFillObject}
      >
        <KanjiGrid width={CANVAS_WIDTH} height={CANVAS_HEIGHT} paperColor={paperColor} lineColor={gridLineColor} />

        {strokes.map((d, i) => (
          <Path
            key={i} d={d}
            stroke={inkColor} strokeWidth={5}
            strokeLinecap="round" strokeLinejoin="round"
            fill="none"
          />
        ))}

        {livePathRef.current ? (
          <Path
            d={livePathRef.current}
            stroke={inkColor} strokeOpacity={0.75} strokeWidth={5}
            strokeLinecap="round" strokeLinejoin="round"
            fill="none"
          />
        ) : null}
      </Svg>
    </View>
  );
}

const dc = StyleSheet.create({
  wrap: {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    alignSelf: "center",
    marginHorizontal: -8,
    borderRadius: 0,
    overflow: "hidden",
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  ghostKanjiWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
    elevation: 1,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
export function WritingPracticeModal({
  item,
  onClose,
}: {
  item: KanjiItem | null;
  onClose: () => void;
}) {
  const c = useColors(); // bảng màu hiện tại — tự đổi theo giờ / lựa chọn người dùng

  // Giấy viết + mực: dùng tông cố định sáng/tối riêng (không bám theo
  // primary/accent của theme) để cảm giác "viết tay trên giấy" luôn nhất quán.
  const isDarkPaper = c.background === "#0b0f19"; // night palette
  const paperColor = isDarkPaper ? "#1a2130" : "#fcfbf9";
  const gridLineColor = isDarkPaper ? "#3a445c" : "#cbd5e1";
  const inkColor = isDarkPaper ? "#e5e7eb" : "#1e293b";

  const [strokes, setStrokes] = useState<string[]>([]);
  const livePathRef = useRef<string>("");
  const canvasTickRef = useRef<() => void>(() => {});
  const [reloadTrigger, setReloadTrigger] = useState(0);

  const handleRegisterTick = useCallback((fn: () => void) => {
    canvasTickRef.current = fn;
  }, []);

  const clearCanvas = useCallback(() => {
    setStrokes([]);
    livePathRef.current = "";
    canvasTickRef.current();
  }, []);

  const undoStroke = useCallback(() => {
    setStrokes((prev) => prev.slice(0, -1));
  }, []);

  const handleReloadStrokes = useCallback(() => {
    setReloadTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
    clearCanvas();
    setReloadTrigger(0);
  }, [item?.id]);

  // PanResponder
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder:        () => true,
      onMoveShouldSetPanResponder:         () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture:  () => true,

      onPanResponderGrant: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        livePathRef.current = `M ${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
        canvasTickRef.current();
      },
      onPanResponderMove: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        livePathRef.current += ` L ${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
        canvasTickRef.current();
      },
      onPanResponderRelease: () => {
        if (livePathRef.current) {
          const done = livePathRef.current;
          livePathRef.current = "";
          setStrokes((prev) => [...prev, done]);
        }
      },
      onPanResponderTerminate: () => {
        if (livePathRef.current) {
          const done = livePathRef.current;
          livePathRef.current = "";
          setStrokes((prev) => [...prev, done]);
        }
      },
    }),
  ).current;

  if (!item) return null;
  const noStrokes = strokes.length === 0;

  return (
    <Modal
      visible={!!item}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={[ws.overlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
        <View style={[ws.sheet, { backgroundColor: c.card }]}>

          <View style={[ws.handle, { backgroundColor: c.border }]} />
          <View style={ws.sheetHeader}>
            <Text style={[ws.sheetTitle, { color: c.text }]}>✍️ Luyện viết — {item.kanji}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Text style={[ws.closeText, { color: c.primary }]}>Đóng</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            style={ws.scrollArea}
            contentContainerStyle={ws.scrollContent}
          >
            <View style={[ws.infoRow, { backgroundColor: c.muted }]}>
              <Text style={[ws.kanjiLarge, { color: c.primary }]}>{item.kanji}</Text>
              <View style={ws.infoText}>
                <Text style={[ws.hanViet, { color: c.mutedForeground }]}>{item.hanviet?.[0] ?? ""}</Text>
                {(() => {
                  const kun = getKunyomiFromFull(item.kanji);
                  return kun.length > 0
                    ? <Text style={[ws.reading, { color: c.text }]}>訓 {kun.join("、")}</Text>
                    : null;
                })()}
                {(item.readings?.onyomi?.length ?? 0) > 0 && (
                  <Text style={[ws.reading, { color: c.text }]}>音 {item.readings.onyomi.join("、")}</Text>
                )}
                <Text style={[ws.meaning, { color: c.text }]} numberOfLines={2}>
                  {item.meanings_vi?.[0] ?? ""}
                </Text>
              </View>
            </View>

            <Text style={[ws.sectionLabel, { color: c.mutedForeground }]}>📖 Thứ tự nét tham khảo</Text>
            <View style={ws.strokeRef}>
              <KanjiStrokeOrder
                kanji={item.kanji}
                size={180}
                onReload={handleReloadStrokes}
              />
            </View>
          </ScrollView>

          <Text style={[ws.sectionLabel, ws.canvasLabel, { color: c.mutedForeground }]}>✏️ Vùng luyện viết</Text>
          <DrawingCanvas
            kanjiChar={item.kanji}
            strokes={strokes}
            livePathRef={livePathRef}
            panHandlers={panResponder.panHandlers}
            onRegisterTick={handleRegisterTick}
            reloadTrigger={reloadTrigger}
            paperColor={paperColor}
            gridLineColor={gridLineColor}
            inkColor={inkColor}
          />

          <View style={ws.btnRow}>
            <TouchableOpacity
              style={[ws.undoBtn, { backgroundColor: c.primary + "1a" }, noStrokes && { backgroundColor: c.muted }]}
              onPress={undoStroke}
              activeOpacity={0.8}
              disabled={noStrokes}
            >
              <Text style={[ws.undoBtnText, { color: c.primary }, noStrokes && { color: c.mutedForeground }]}>
                ↩ Hoàn tác
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[ws.clearBtn, { backgroundColor: c.destructive + "1a" }, noStrokes && { backgroundColor: c.muted }]}
              onPress={clearCanvas}
              activeOpacity={0.8}
              disabled={noStrokes}
            >
              <Text style={[ws.clearBtnText, { color: c.destructive }, noStrokes && { color: c.mutedForeground }]}>
                🗑 Xoá hết
              </Text>
            </TouchableOpacity>
          </View>

          <View style={ws.bottomPad} />
        </View>
        <ThemeFadeOverlay />
      </View>
    <AdBanner />
    </Modal>
  );
}

// ─── Styles (chỉ layout — màu gán inline theo theme ở trên) ───────────────────
const ws = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: "92%",
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
  },
  handle: {
    alignSelf: "center",
    width: 40, height: 4,
    borderRadius: 2,
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sheetTitle: { fontSize: 17, fontWeight: "800" },
  closeText:  { fontSize: 15, fontWeight: "600" },

  scrollArea:    { flexShrink: 1, flexGrow: 0 },
  scrollContent: { paddingBottom: 2 },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    gap: 14,
  },
  kanjiLarge: { fontSize: 40, fontWeight: "500", lineHeight: 46, flexShrink: 0 },
  infoText:   { flex: 1, minWidth: 0 },
  hanViet: {
    fontSize: 12,
    fontWeight: "700", letterSpacing: 0.5, marginBottom: 3,
  },
  reading: { fontSize: 13, marginBottom: 2 },
  meaning: { fontSize: 14, fontWeight: "600" },

  sectionLabel: {
    fontSize: 13, fontWeight: "700", marginBottom: 8,
  },
  canvasLabel: { marginTop: 4 },

  strokeRef: { alignItems: "center", marginBottom: 14 },

  btnRow: { flexDirection: "row", gap: 10, marginTop: 14 },

  undoBtn: {
    flex: 1, borderRadius: 14,
    paddingVertical: 13, alignItems: "center",
  },
  undoBtnText: { fontWeight: "700", fontSize: 15 },

  clearBtn: {
    flex: 1, borderRadius: 14,
    paddingVertical: 13, alignItems: "center",
  },
  clearBtnText: { fontWeight: "700", fontSize: 15 },

  bottomPad: { height: 36 },
});