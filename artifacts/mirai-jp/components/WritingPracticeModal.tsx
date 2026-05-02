// ─────────────────────────────────────────────────────────────────────────────
// WritingPracticeModal.tsx — Modal luyện viết Kanji tự do
//
// Hiển thị:
//   • Thông tin chữ (kanji to, Hán Việt, âm đọc, nghĩa)
//   • KanjiStrokeOrder — tham khảo thứ tự nét
//   • Canvas SVG + PanResponder — vẽ tay theo nét mẫu
//   • Nút Xoá để reset canvas
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";

import { type KanjiItem } from "../assets/data_JLPT_kanji";
import { KanjiStrokeOrder } from "./KanjiStrokeOrder";

const BLUE = "#4ECDC4";
const RED  = "#E03131";

const SCREEN_W   = Dimensions.get("window").width;
const CANVAS_SIZE = Math.min(SCREEN_W - 48, 300);

// ─────────────────────────────────────────────────────────────────────────────
export function WritingPracticeModal({
  item,
  onClose,
}: {
  item: KanjiItem | null;
  onClose: () => void;
}) {
  // Danh sách các nét đã hoàn thành (mỗi phần tử là 1 chuỗi SVG path)
  const [strokes, setStrokes]       = useState<string[]>([]);
  const currentPath                 = useRef<string>("");
  // forceUpdate để vẽ realtime trong khi ngón tay đang di chuyển
  const [, forceUpdate]             = useState(0);

  // Xoá toàn bộ canvas
  const clearCanvas = () => {
    setStrokes([]);
    currentPath.current = "";
  };

  // Hoàn tác nét vừa vẽ (xoá phần tử cuối của mảng strokes)
  const undoStroke = () => {
    setStrokes((prev) => prev.slice(0, -1));
  };

  // Reset khi chuyển sang chữ khác
  useEffect(() => {
    clearCanvas();
  }, [item?.id]);

  // PanResponder — ghi nhận nét chạm của ngón tay
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderGrant: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        currentPath.current = `M ${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
        forceUpdate((n) => n + 1);
      },
      onPanResponderMove: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        currentPath.current += ` L ${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
        forceUpdate((n) => n + 1);
      },
      onPanResponderRelease: () => {
        if (currentPath.current) {
          setStrokes((prev) => [...prev, currentPath.current]);
          currentPath.current = "";
        }
      },
    }),
  ).current;

  if (!item) return null;

  return (
    <Modal
      visible={!!item}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={ws.overlay}>
        <View style={ws.sheet}>
          {/* Handle + tiêu đề */}
          <View style={ws.handle} />
          <View style={ws.sheetHeader}>
            <Text style={ws.sheetTitle}>✍️ Luyện viết — {item.kanji}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Text style={ws.closeText}>Đóng</Text>
            </TouchableOpacity>
          </View>

          {/* Thông tin chữ */}
          <View style={ws.infoRow}>
            <Text style={ws.kanjiLarge}>{item.kanji}</Text>
            <View style={ws.infoText}>
              <Text style={ws.hanViet}>{item.hanViet}</Text>
              {item.kunyomi.length > 0 && (
                <Text style={ws.reading}>訓 {item.kunyomi.join("、")}</Text>
              )}
              {item.onyomi.length > 0 && (
                <Text style={ws.reading}>音 {item.onyomi.join("、")}</Text>
              )}
              <Text style={ws.meaning} numberOfLines={2}>
                {item.meanings[0] ?? ""}
              </Text>
            </View>
          </View>

          {/* Tham khảo thứ tự nét */}
          <Text style={ws.sectionLabel}>📖 Thứ tự nét tham khảo</Text>
          <View style={ws.strokeRef}>
            <KanjiStrokeOrder kanji={item.kanji} size={130} containerSize={200} />
          </View>

          {/* Canvas vẽ tay */}
          <Text style={ws.sectionLabel}>✏️ Vùng luyện viết — vẽ theo nét trên</Text>
          <View style={ws.canvasWrap} {...panResponder.panHandlers}>
            <Svg
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              style={StyleSheet.absoluteFillObject}
            >
              {/* Lưới hướng dẫn */}
              <Path
                d={`M ${CANVAS_SIZE / 2} 0 L ${CANVAS_SIZE / 2} ${CANVAS_SIZE}`}
                stroke="#e2e8f0" strokeWidth={1} strokeDasharray="6,4"
              />
              <Path
                d={`M 0 ${CANVAS_SIZE / 2} L ${CANVAS_SIZE} ${CANVAS_SIZE / 2}`}
                stroke="#e2e8f0" strokeWidth={1} strokeDasharray="6,4"
              />
              <Path
                d={`M 0 0 L ${CANVAS_SIZE} ${CANVAS_SIZE}`}
                stroke="#f1f5f9" strokeWidth={1}
              />
              <Path
                d={`M ${CANVAS_SIZE} 0 L 0 ${CANVAS_SIZE}`}
                stroke="#f1f5f9" strokeWidth={1}
              />

              {/* Các nét đã hoàn thành */}
              {strokes.map((d, i) => (
                <Path
                  key={i} d={d}
                  stroke="#1e293b" strokeWidth={4}
                  strokeLinecap="round" strokeLinejoin="round"
                  fill="none"
                />
              ))}

              {/* Nét đang vẽ realtime */}
              {currentPath.current ? (
                <Path
                  d={currentPath.current}
                  stroke="#1e293b" strokeWidth={4}
                  strokeLinecap="round" strokeLinejoin="round"
                  fill="none"
                />
              ) : null}
            </Svg>
          </View>

          {/* Hàng nút: Hoàn tác + Xoá */}
          <View style={ws.btnRow}>
            <TouchableOpacity
              style={[ws.undoBtn, strokes.length === 0 && ws.btnDisabled]}
              onPress={undoStroke}
              activeOpacity={0.8}
              disabled={strokes.length === 0}
            >
              <Text style={[ws.undoBtnText, strokes.length === 0 && ws.btnTextDisabled]}>
                ↩ Hoàn tác
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[ws.clearBtn, strokes.length === 0 && ws.btnDisabled]}
              onPress={clearCanvas}
              activeOpacity={0.8}
              disabled={strokes.length === 0}
            >
              <Text style={[ws.clearBtnText, strokes.length === 0 && ws.btnTextDisabled]}>
                🗑 Xoá hết
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const ws = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 36, paddingTop: 12,
    maxHeight: "92%",
  },
  handle: {
    alignSelf: "center", width: 40, height: 4,
    borderRadius: 2, backgroundColor: "#e2e8f0", marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 14,
  },
  sheetTitle: { fontSize: 17, fontWeight: "800", color: "#0f172a" },
  closeText:  { fontSize: 15, color: BLUE, fontWeight: "600" },

  infoRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#f8fafc", borderRadius: 14,
    padding: 14, marginBottom: 14, gap: 14,
  },
  kanjiLarge: { fontSize: 52, fontWeight: "700", color: RED, lineHeight: 60 },
  infoText:   { flex: 1 },
  hanViet:    { fontSize: 12, color: "#94a3b8", fontWeight: "700", letterSpacing: 0.5, marginBottom: 3 },
  reading:    { fontSize: 13, color: "#475569", marginBottom: 2 },
  meaning:    { fontSize: 14, fontWeight: "600", color: "#0f172a" },

  sectionLabel: { fontSize: 13, fontWeight: "700", color: "#64748b", marginBottom: 8 },

  strokeRef: { alignItems: "center", marginBottom: 14 },

  canvasWrap: {
    width: CANVAS_SIZE, height: CANVAS_SIZE,
    alignSelf: "center",
    backgroundColor: "#fafafa",
    borderRadius: 16,
    borderWidth: 2, borderColor: "#e2e8f0",
    overflow: "hidden",
    marginBottom: 14,
  },

  // Hàng chứa 2 nút hoàn tác + xoá hết
  btnRow: { flexDirection: "row", gap: 10 },

  // Nút hoàn tác (↩)
  undoBtn: {
    flex: 1, backgroundColor: "#eff6ff", borderRadius: 14,
    paddingVertical: 13, alignItems: "center",
  },
  undoBtnText: { color: "#1d4ed8", fontWeight: "700", fontSize: 15 },

  // Nút xoá hết (🗑)
  clearBtn: {
    flex: 1, backgroundColor: "#fee2e2", borderRadius: 14,
    paddingVertical: 13, alignItems: "center",
  },
  clearBtnText: { color: "#991b1b", fontWeight: "700", fontSize: 15 },

  // Trạng thái bị vô hiệu (chưa có nét nào)
  btnDisabled: { backgroundColor: "#f1f5f9" },
  btnTextDisabled: { color: "#cbd5e1" },
});
