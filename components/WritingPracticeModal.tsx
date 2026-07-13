// ─────────────────────────────────────────────────────────────────────────────
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
import Svg, { Line, Path, Rect } from "react-native-svg";

// import { type KanjiItem } from "../assets/data_JLPT_kanji";
import { type KanjiItem, getKunyomiFromFull } from "../assets/data_JLPT_kanji";
import { KanjiStrokeOrder } from "./KanjiStrokeOrder";

const textcolor = "#1d4ed8";

const SCREEN_W      = Dimensions.get("window").width;
const CANVAS_SIZE    = Math.min(SCREEN_W - 24, 340);
const CANVAS_WIDTH   = CANVAS_SIZE;
const CANVAS_HEIGHT  = CANVAS_SIZE * 0.8;

// ─── Lưới 田字格 chuẩn luyện viết Kanji ──────────────────────────────────────
function KanjiGrid({ width, height }: { width: number; height: number }) {
  const halfX = width / 2;
  const halfY = height / 2;
  const dash = `${Math.min(width, height) * 0.04},${Math.min(width, height) * 0.03}`;
  return (
    <>
      <Rect x={0} y={0} width={width} height={height} fill="#fcfcfc" />
      <Line x1={halfX} y1={0} x2={halfX} y2={height}
        stroke="#cbd5e1" strokeWidth={1} strokeDasharray={dash} />
      <Line x1={0} y1={halfY} x2={width} y2={halfY}
        stroke="#cbd5e1" strokeWidth={1} strokeDasharray={dash} />
      <Rect x={1} y={1} width={width - 2} height={height - 2}
        fill="none" stroke="#e2e8f0" strokeWidth={2} rx={12} />
    </>
  );
}

// ─── Canvas tách riêng ────────────────────────────────────────────────────────
// Tách ra để re-render nội bộ (khi vẽ realtime) KHÔNG lan sang parent,
// tránh ScrollView reset vị trí cuộn.
interface DrawingCanvasProps {
  kanjiChar: string;
  strokes: string[];
  livePathRef: React.MutableRefObject<string>;
  panHandlers: object;
  // Callback để parent nhận setter tick (dùng để trigger re-render canvas từ PanResponder)
  onRegisterTick: (fn: () => void) => void;
}

// function DrawingCanvas({
function DrawingCanvas({
  kanjiChar,
  strokes,
  livePathRef,
  panHandlers,
  onRegisterTick,
}: DrawingCanvasProps) {
  const [, setTick] = useState(0);

  // Đăng ký hàm trigger lên parent ngay khi mount
  useEffect(() => {
    onRegisterTick(() => setTick((n) => n + 1));
  }, [onRegisterTick]);

  return (
     <View style={dc.wrap} {...panHandlers}>
       <View style={dc.ghostKanjiWrap} pointerEvents="none">
        <Text style={dc.ghostKanji}>{kanjiChar}</Text>
      </View>
      <Svg
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={StyleSheet.absoluteFillObject}
      >
        <KanjiGrid width={CANVAS_WIDTH} height={CANVAS_HEIGHT} />

        {strokes.map((d, i) => (
          <Path
            key={i} d={d}
            stroke="#1e293b" strokeWidth={5}
            strokeLinecap="round" strokeLinejoin="round"
            fill="none"
          />
        ))}

        {livePathRef.current ? (
          <Path
            d={livePathRef.current}
            stroke="#1e293b" strokeOpacity={0.75} strokeWidth={5}
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
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
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
  ghostKanji: {
    fontSize: CANVAS_HEIGHT * 0.85,
    color: "#1e293b",
    opacity: 0.15,
    fontWeight: "100",
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
  // Nét đã hoàn thành — state để React re-render đúng
  const [strokes, setStrokes] = useState<string[]>([]);

  // Nét đang vẽ — ref để tránh re-render parent liên tục
  const livePathRef = useRef<string>("");

  // Hàm trigger re-render của DrawingCanvas, được đăng ký khi canvas mount
  const canvasTickRef = useRef<() => void>(() => {});
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

  // Reset khi đổi chữ
  useEffect(() => {
    clearCanvas();
  }, [item?.id]);

  // PanResponder
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder:        () => true,
      onMoveShouldSetPanResponder:         () => true,
      // Capture phase: giành gesture trước ScrollView cha
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
      // Gesture bị hệ thống chiếm (thông báo, v.v.) — vẫn lưu nét dở
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
      <View style={ws.overlay}>
        <View style={ws.sheet}>

          {/* ── CỐ ĐỊNH: Handle + Header ── */}
          <View style={ws.handle} />
          <View style={ws.sheetHeader}>
            <Text style={ws.sheetTitle}>✍️ Luyện viết — {item.kanji}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Text style={ws.closeText}>Đóng</Text>
            </TouchableOpacity>
          </View>

          {/* ── CUỘN: Thông tin chữ + Tham khảo nét ── */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            style={ws.scrollArea}
            contentContainerStyle={ws.scrollContent}
          >
            <View style={ws.infoRow}>
              <Text style={ws.kanjiLarge}>{item.kanji}</Text>
              <View style={ws.infoText}>
                <Text style={ws.hanViet}>{item.hanviet?.[0] ?? ""}</Text>
                {(() => {
                  const kun = getKunyomiFromFull(item.kanji);
                  return kun.length > 0
                    ? <Text style={ws.reading}>訓 {kun.join("、")}</Text>
                    : null;
                })()}
                {/* {(item.readings?.kunyomi?.length ?? 0) > 0 && (
                  <Text style={ws.reading}>訓 {item.readings.kunyomi.join("、")}</Text>
                )} */}
                {(item.readings?.onyomi?.length ?? 0) > 0 && (
                  <Text style={ws.reading}>音 {item.readings.onyomi.join("、")}</Text>
                )}
                <Text style={ws.meaning} numberOfLines={2}>
                  {item.meanings_vi?.[0] ?? ""}
                </Text>
              </View>
            </View>

            <Text style={ws.sectionLabel}>📖 Thứ tự nét tham khảo</Text>
            <View style={ws.strokeRef}>
              <KanjiStrokeOrder kanji={item.kanji} size={180}/>
            </View>
          </ScrollView>

          {/* ── CỐ ĐỊNH: Canvas ── */}
          <Text style={[ws.sectionLabel, ws.canvasLabel]}>✏️ Vùng luyện viết</Text>
          <DrawingCanvas
            kanjiChar={item.kanji}
            strokes={strokes}
            livePathRef={livePathRef}
            panHandlers={panResponder.panHandlers}
            onRegisterTick={handleRegisterTick}
          />

          {/* ── CỐ ĐỊNH: Nút hành động ── */}
          <View style={ws.btnRow}>
            <TouchableOpacity
              style={[ws.undoBtn, noStrokes && ws.btnDisabled]}
              onPress={undoStroke}
              activeOpacity={0.8}
              disabled={noStrokes}
            >
              <Text style={[ws.undoBtnText, noStrokes && ws.btnTextDisabled]}>
                ↩ Hoàn tác
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[ws.clearBtn, noStrokes && ws.btnDisabled]}
              onPress={clearCanvas}
              activeOpacity={0.8}
              disabled={noStrokes}
            >
              <Text style={[ws.clearBtnText, noStrokes && ws.btnTextDisabled]}>
                🗑 Xoá hết
              </Text>
            </TouchableOpacity>
          </View>

          <View style={ws.bottomPad} />
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const ws = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: "92%",
  },
  handle: {
    alignSelf: "center",
    width: 40, height: 4,
    borderRadius: 2,
    backgroundColor: "#e2e8f0",
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sheetTitle: { fontSize: 17, fontWeight: "800", color: "#0f172a" },
  closeText:  { fontSize: 15, color: textcolor, fontWeight: "600" },

  // ScrollView co lại vừa đủ nội dung của nó, nhường chỗ cho canvas bên dưới
  scrollArea:    { flexShrink: 1, flexGrow: 0 },
  scrollContent: { paddingBottom: 2 },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    gap: 14,
  },
  kanjiLarge: { fontSize: 40, fontWeight: "500", color: textcolor, lineHeight: 46, flexShrink: 0 },
  infoText:   { flex: 1, minWidth: 0 },
  hanViet: {
    fontSize: 12, color: "#94a3b8",
    fontWeight: "700", letterSpacing: 0.5, marginBottom: 3,
  },
  reading: { fontSize: 13, color: "#475569", marginBottom: 2 },
  meaning: { fontSize: 14, fontWeight: "600", color: "#0f172a" },

  sectionLabel: {
    fontSize: 13, fontWeight: "700", color: "#64748b", marginBottom: 8,
  },
  canvasLabel: { marginTop: 4 },

  strokeRef: { alignItems: "center", marginBottom: 14 },

  btnRow: { flexDirection: "row", gap: 10, marginTop: 14 },

  undoBtn: {
    flex: 1, backgroundColor: "#eff6ff", borderRadius: 14,
    paddingVertical: 13, alignItems: "center",
  },
  undoBtnText: { color: textcolor, fontWeight: "700", fontSize: 15 },

  clearBtn: {
    flex: 1, backgroundColor: "#fee2e2", borderRadius: 14,
    paddingVertical: 13, alignItems: "center",
  },
  clearBtnText: { color: "#991b1b", fontWeight: "700", fontSize: 15 },

  btnDisabled:     { backgroundColor: "#f1f5f9" },
  btnTextDisabled: { color: "#cbd5e1" },

  bottomPad: { height: 36 },
});
