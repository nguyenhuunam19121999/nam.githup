// ─────────────────────────────────────────────────────────────────────────────
// KanjiStrokeOrder
// Vẽ chữ Kanji theo từng nét — mỗi nét một màu khác nhau, có đánh số thứ tự.
// Có hoạt cảnh "viết" tuần tự từ nét đầu đến nét cuối; hỗ trợ phát lại.
// Dữ liệu nét lấy từ KanjiVG (canvas mặc định 109×109).
// ─────────────────────────────────────────────────────────────────────────────

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { G, Path } from "react-native-svg";

import strokesMap from "../assets/data_JLPT_kanji/kanji_strokes.json";

const AnimatedPath = Animated.createAnimatedComponent(Path);

// Bảng 30 màu — đủ dùng cho cả các kanji nhiều nét nhất (~29 nét)
const PALETTE = [
  "#E63946", "#3A86FF", "#06A77D", "#F77F00", "#9B5DE5",
  "#00B4D8", "#EF476F", "#7209B7", "#FFB703", "#2EC4B6",
  "#D62828", "#1D3557", "#52B788", "#F4A261", "#8338EC",
  "#118AB2", "#E76F51", "#80B918", "#5A189A", "#FB8500",
  "#0096C7", "#B5179E", "#43AA8B", "#F94144", "#577590",
  "#90BE6D", "#F9844A", "#277DA1", "#F3722C", "#4D908E",
];

interface Props {
  /** Chữ Kanji cần vẽ, vd "候" */
  kanji: string;
  /** Kích thước cạnh khung (pixel). Mặc định 220. */
  size?: number;
  /** Có tự chạy hoạt cảnh khi mở không (mặc định: có) */
  autoPlay?: boolean;
  /** Có hiển thị số thứ tự nét không */
  showNumbers?: boolean;
}

/** Trích điểm bắt đầu (M x,y) của một path "d" */
function getStartPoint(d: string): { x: number; y: number } | null {
  const m = d.match(/^\s*M\s*(-?[\d.]+)[,\s]+(-?[\d.]+)/);
  if (!m) return null;
  return { x: parseFloat(m[1]), y: parseFloat(m[2]) };
}

/**
 * Ước lượng độ dài hình học của một path SVG (đơn vị viewBox).
 * Dùng để đặt strokeDasharray và tính thời lượng vẽ tỉ lệ với độ dài nét.
 * KanjiVG hầu hết là M + một vài đoạn cong cubic ("c"), nên ta cộng dồn
 * khoảng cách giữa các điểm điều khiển — đủ chính xác cho mục đích hoạt cảnh.
 */
function approxPathLength(d: string): number {
  const tokens = d.match(/[A-Za-z]|-?\d*\.?\d+(?:e-?\d+)?/g) || [];
  let cmd = "";
  let cx = 0;
  let cy = 0;
  let total = 0;
  let i = 0;

  const argCount = (c: string): number => {
    const lc = c.toLowerCase();
    if (lc === "m" || lc === "l" || lc === "t") return 2;
    if (lc === "h" || lc === "v") return 1;
    if (lc === "c") return 6;
    if (lc === "s" || lc === "q") return 4;
    if (lc === "a") return 7;
    return 0;
  };

  while (i < tokens.length) {
    const t = tokens[i];
    if (/[A-Za-z]/.test(t)) {
      cmd = t;
      i++;
      // Sau "M"/"m" mà có nhiều cặp toạ độ thì các cặp tiếp theo coi như "L"/"l"
      continue;
    }
    const n = argCount(cmd);
    if (n === 0) {
      i++;
      continue;
    }
    const a: number[] = [];
    for (let k = 0; k < n; k++) a.push(parseFloat(tokens[i + k]));
    i += n;

    const isRel = cmd === cmd.toLowerCase();
    let nx = cx;
    let ny = cy;
    let seg = 0;

    switch (cmd.toUpperCase()) {
      case "M":
        nx = isRel ? cx + a[0] : a[0];
        ny = isRel ? cy + a[1] : a[1];
        // Sau lệnh M, các cặp tiếp theo được coi là L
        cmd = isRel ? "l" : "L";
        break;
      case "L":
      case "T":
        nx = isRel ? cx + a[0] : a[0];
        ny = isRel ? cy + a[1] : a[1];
        seg = Math.hypot(nx - cx, ny - cy);
        break;
      case "H":
        nx = isRel ? cx + a[0] : a[0];
        seg = Math.abs(nx - cx);
        break;
      case "V":
        ny = isRel ? cy + a[0] : a[0];
        seg = Math.abs(ny - cy);
        break;
      case "C": {
        const x1 = isRel ? cx + a[0] : a[0];
        const y1 = isRel ? cy + a[1] : a[1];
        const x2 = isRel ? cx + a[2] : a[2];
        const y2 = isRel ? cy + a[3] : a[3];
        nx = isRel ? cx + a[4] : a[4];
        ny = isRel ? cy + a[5] : a[5];
        const poly =
          Math.hypot(x1 - cx, y1 - cy) +
          Math.hypot(x2 - x1, y2 - y1) +
          Math.hypot(nx - x2, ny - y2);
        const chord = Math.hypot(nx - cx, ny - cy);
        seg = (poly + chord) / 2; // xấp xỉ độ dài cong Bezier
        break;
      }
      case "S":
      case "Q": {
        const x2 = isRel ? cx + a[0] : a[0];
        const y2 = isRel ? cy + a[1] : a[1];
        nx = isRel ? cx + a[2] : a[2];
        ny = isRel ? cy + a[3] : a[3];
        seg = (Math.hypot(x2 - cx, y2 - cy) + Math.hypot(nx - x2, ny - y2)) * 0.95;
        break;
      }
      case "A":
        nx = isRel ? cx + a[5] : a[5];
        ny = isRel ? cy + a[6] : a[6];
        seg = Math.hypot(nx - cx, ny - cy) * 1.2;
        break;
    }
    total += seg;
    cx = nx;
    cy = ny;
  }
  return Math.max(8, total);
}

export function KanjiStrokeOrder({
  kanji,
  size = 220,
  autoPlay = true,
  showNumbers = true,
}: Props) {
  const paths = (strokesMap as Record<string, string[]>)[kanji];

  // Stage = số nét đã vẽ xong; nét đang vẽ có chỉ số = stage
  const [stage, setStage] = useState(0);
  const [done, setDone] = useState(false);
  const offset = useRef(new Animated.Value(0)).current;

  // Cờ huỷ — dùng để dừng chuỗi animation khi unmount hoặc replay
  const cancelRef = useRef(false);
  // Bộ đếm session — chỉ chấp nhận callback của lần phát hiện tại
  const sessionRef = useRef(0);

  const lengths = useMemo(
    () => (paths ? paths.map(approxPathLength) : []),
    [paths],
  );

  const play = useCallback(() => {
    if (!paths || paths.length === 0) return;
    cancelRef.current = false;
    sessionRef.current += 1;
    const mySession = sessionRef.current;
    setDone(false);
    setStage(0);

    const step = (i: number) => {
      if (cancelRef.current || mySession !== sessionRef.current) return;
      if (i >= paths.length) {
        setStage(paths.length);
        setDone(true);
        return;
      }
      const len = lengths[i];
      offset.setValue(len);
      setStage(i);
      Animated.timing(offset, {
        toValue: 0,
        // Tốc độ tỉ lệ độ dài nét — nét dài viết lâu hơn
        duration: Math.max(280, Math.min(1400, Math.round(len * 14))),
        easing: Easing.linear,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (!finished) return;
        if (cancelRef.current || mySession !== sessionRef.current) return;
        // Tạm dừng nhẹ giữa các nét cho dễ theo dõi
        setTimeout(() => {
          if (cancelRef.current || mySession !== sessionRef.current) return;
          step(i + 1);
        }, 120);
      });
    };
    step(0);
  }, [paths, lengths, offset]);

  // Tự chạy khi mount (hoặc khi đổi chữ)
  useEffect(() => {
    if (autoPlay) play();
    return () => {
      cancelRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kanji]);

  if (!paths || paths.length === 0) {
    return (
      <View
        style={[s.box, { width: size, height: size, justifyContent: "center" }]}
      >
        <Text
          style={{
            fontSize: size * 0.55,
            fontWeight: "700",
            color: "#0f172a",
            textAlign: "center",
          }}
        >
          {kanji}
        </Text>
        <Text style={s.fallbackHint}>Chưa có dữ liệu thứ tự nét</Text>
      </View>
    );
  }

  // KanjiVG dùng viewBox 109×109
  const VB = 109;
  const stroke = Math.max(2.4, (size / VB) * 3.2);
  const numberSize = Math.max(8, size * 0.055);
  const scale = size / VB;

  return (
    <View style={{ alignItems: "center" }}>
      <View style={[s.box, { width: size, height: size }]}>
        {/* Đường gióng dọc / ngang ở giữa khung */}
        <View style={[s.gridV, { left: size / 2 - 0.5 }]} />
        <View style={[s.gridH, { top: size / 2 - 0.5 }]} />

        <Svg width={size} height={size} viewBox={`0 0 ${VB} ${VB}`}>
          <G fill="none" strokeLinecap="round" strokeLinejoin="round">
            {paths.map((d, i) => {
              const color = PALETTE[i % PALETTE.length];
              if (done || i < stage) {
                // Đã vẽ xong — hiển thị nguyên vẹn
                return (
                  <Path
                    key={i}
                    d={d}
                    stroke={color}
                    strokeWidth={stroke}
                  />
                );
              }
              if (i === stage) {
                // Nét đang vẽ — dùng dasharray/dashoffset để "trượt"
                const len = lengths[i];
                return (
                  <AnimatedPath
                    key={`a-${i}-${sessionRef.current}`}
                    d={d}
                    stroke={color}
                    strokeWidth={stroke}
                    strokeDasharray={`${len}`}
                    strokeDashoffset={offset as unknown as number}
                  />
                );
              }
              // Chưa đến lượt — chưa vẽ
              return null;
            })}
          </G>
        </Svg>

        {/* Số thứ tự — chỉ hiển thị cho các nét đã bắt đầu vẽ */}
        {showNumbers &&
          paths.map((d, i) => {
            if (!done && i > stage) return null;
            const p = getStartPoint(d);
            if (!p) return null;
            const left = p.x * scale - numberSize / 2;
            const top = p.y * scale - numberSize / 2;
            return (
              <Text
                key={`num-${i}`}
                style={[
                  s.numLabel,
                  {
                    left,
                    top,
                    fontSize: numberSize,
                    color: PALETTE[i % PALETTE.length],
                    width: numberSize * 1.6,
                    height: numberSize * 1.6,
                    lineHeight: numberSize * 1.6,
                    borderRadius: numberSize,
                  },
                ]}
              >
                {i + 1}
              </Text>
            );
          })}
      </View>

      {/* Nút phát lại / tạm dừng */}
      <TouchableOpacity
        style={s.replayBtn}
        onPress={play}
        activeOpacity={0.85}
      >
        <Text style={s.replayIcon}>↻</Text>
        <Text style={s.replayText}>
          {done ? "Phát lại" : `Đang viết… (${Math.min(stage + 1, paths.length)}/${paths.length})`}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  box: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignSelf: "center",
    position: "relative",
    overflow: "hidden",
  },
  gridV: {
    position: "absolute",
    top: 4,
    bottom: 4,
    width: 1,
    backgroundColor: "#cbd5e1",
    opacity: 0.6,
  },
  gridH: {
    position: "absolute",
    left: 4,
    right: 4,
    height: 1,
    backgroundColor: "#cbd5e1",
    opacity: 0.6,
  },
  numLabel: {
    position: "absolute",
    textAlign: "center",
    fontWeight: "800",
    backgroundColor: "rgba(255,255,255,0.85)",
    overflow: "hidden",
  },
  fallbackHint: {
    color: "#94a3b8",
    fontSize: 11,
    textAlign: "center",
    marginTop: 6,
  },
  replayBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  replayIcon: {
    fontSize: 16,
    color: "#2F80ED",
    marginRight: 6,
    fontWeight: "700",
  },
  replayText: { color: "#1E40AF", fontWeight: "700", fontSize: 13 },
});
