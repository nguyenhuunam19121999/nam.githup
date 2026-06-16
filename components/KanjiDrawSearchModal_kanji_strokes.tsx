// // components/KanjiDrawSearchModal.tsx - không có thư viện svg
// import React, {
//   useCallback,
//   useEffect,
//   useMemo,
//   useRef,
//   useState,
//   forwardRef,
//   useImperativeHandle,
// } from "react";
// import {
//   ActivityIndicator,
//   Dimensions,
//   PanResponder,
//   ScrollView,
//   StyleSheet,
//   Text,
//   TouchableOpacity,
//   View,
//   Animated,
// } from "react-native";
// import Svg, { Line, Path } from "react-native-svg";

// import { getKanji, type KanjiItem } from "../assets/data_JLPT_kanji";
// import strokesMap from "../assets/data_JLPT_kanji/kanji_strokes.json";

// // ═══════════════════════════════════════════════════════════════════
// // 🎨 HẰNG SỐ
// // ═══════════════════════════════════════════════════════════════════
// const { width: SCREEN_WIDTH } = Dimensions.get("window");
// const CANVAS_SIZE = Math.min(SCREEN_WIDTH - 40, 500);
// const STROKE_WIDTH = 6;
// const ORANGE = "#ed8b3a";
// const SEARCH_DEBOUNCE_MS = 300;
// const TOP_K_CANDIDATES = 12;

// // Grid sizes (multi-resolution như mazii)
// const GRID4 = 4;   // 4x4 = 16 cells  (bắt hình dạng tổng thể)
// const GRID8 = 8;   // 8x8 = 64 cells  (bắt chi tiết không gian)
// const NORMALIZED_SIZE = 100;

// // 8 hướng (như mazii/tegaki) theo thứ tự: →, ↗, ↑, ↖, ←, ↙, ↓, ↘
// const DIR_BINS = 8;

// const LEVEL_SCORE: Record<string, number> = {
//   N5: 5, N4: 4, N3: 3, N2: 2, N1: 1,
// };

// // ═══════════════════════════════════════════════════════════════════
// // 📝 INTERFACES
// // ═══════════════════════════════════════════════════════════════════
// interface StrokePoint { x: number; y: number; }

// interface Stroke {
//   id: string;
//   points: StrokePoint[];
//   path: string;
//   order: number;
// }

// /**
//  * Feature vector nhiều chiều (giống cách mazii nhận dạng nét vẽ):
//  * [0]      strokeCountLog
//  * [1]      aspectRatio (log)
//  * [2]      gravityX
//  * [3]      gravityY
//  * [4..19]  density grid 4x4 (16 cells) — hình dạng tổng thể
//  * [20..83] density grid 8x8 (64 cells) — chi tiết không gian
//  * [84..91] direction histogram 8 hướng — hướng bút
//  */
// type FeatureVector = number[];
// const FV_LEN = 4 + GRID4 * GRID4 + GRID8 * GRID8 + DIR_BINS; // 92

// interface KanjiCandidate {
//   item: KanjiItem;
//   score: number;
//   strokeSimilarity: number;
//   shapeSimilarity: number;
// }

// interface Props {
//   visible: boolean;
//   onClose: () => void;
//   onSelectKanji?: (kanji: string, kanjiData?: KanjiItem) => void;
//   isInline?: boolean;
//   // onSearchPress?: () => void;
//   onSearchPress?: (searchResults?: KanjiCandidate[]) => void; 
// }

// // ═══════════════════════════════════════════════════════════════════
// // 🛠️ HÀM TIỆN ÍCH VẼ
// // ═══════════════════════════════════════════════════════════════════
// function pointsToPath(points: StrokePoint[]): string {
//   if (points.length === 0) return "";
//   let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
//   for (let i = 1; i < points.length; i++) {
//     d += ` L ${points[i].x.toFixed(1)} ${points[i].y.toFixed(1)}`;
//   }
//   return d;
// }

// // ═══════════════════════════════════════════════════════════════════
// // 🔬 PARSER SVG PATH ĐẦY ĐỦ — đọc cả bezier curves (C/c/Q/q/L/l)
// // ═══════════════════════════════════════════════════════════════════

// /**
//  * Sample điểm trên cubic bezier
//  * P(t) = (1-t)³P0 + 3(1-t)²tP1 + 3(1-t)t²P2 + t³P3
//  */
// function sampleCubicBezier(
//   p0: StrokePoint, p1: StrokePoint, p2: StrokePoint, p3: StrokePoint,
//   samples = 8
// ): StrokePoint[] {
//   const pts: StrokePoint[] = [];
//   for (let i = 1; i <= samples; i++) {
//     const t = i / samples;
//     const mt = 1 - t;
//     const x = mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x;
//     const y = mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y;
//     pts.push({ x, y });
//   }
//   return pts;
// }

// /**
//  * Sample điểm trên quadratic bezier
//  * P(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
//  */
// function sampleQuadraticBezier(
//   p0: StrokePoint, p1: StrokePoint, p2: StrokePoint,
//   samples = 6
// ): StrokePoint[] {
//   const pts: StrokePoint[] = [];
//   for (let i = 1; i <= samples; i++) {
//     const t = i / samples;
//     const mt = 1 - t;
//     pts.push({
//       x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
//       y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
//     });
//   }
//   return pts;
// }

// /**
//  * Parse SVG path string thành mảng điểm, đọc đúng tất cả commands:
//  * M/m, L/l, C/c, Q/q, Z/z — chuẩn KanjiVG
//  * Scale về không gian NORMALIZED_SIZE x NORMALIZED_SIZE
//  */
// function parseSvgPathToPoints(svgPath: string, maxPoints = 40): StrokePoint[] {
//   const scale = NORMALIZED_SIZE / 109; // KanjiVG dùng 109x109
//   const points: StrokePoint[] = [];

//   // Tokenize: tách lệnh và số
//   const tokens = svgPath.match(/[MmLlCcQqZz]|[-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?/g);
//   if (!tokens) return [];

//   let cx = 0, cy = 0;  // current point
//   let cmd = '';
//   let i = 0;

//   const readNum = () => {
//     while (i < tokens.length && /[MmLlCcQqZz]/.test(tokens[i])) {
//       cmd = tokens[i++];
//     }
//     return i < tokens.length ? parseFloat(tokens[i++]) : 0;
//   };

//   while (i < tokens.length) {
//     if (/[MmLlCcQqZz]/.test(tokens[i])) {
//       cmd = tokens[i++];
//     }

//     if (cmd === 'M' || cmd === 'm') {
//       const x = readNum() * scale;
//       const y = readNum() * scale;
//       cx = cmd === 'M' ? x : cx + x;
//       cy = cmd === 'M' ? y : cy + y;
//       // Sau M, lệnh tiếp theo mặc định là L/l
//       cmd = cmd === 'M' ? 'L' : 'l';
//       points.push({ x: cx * scale / scale, y: cy * scale / scale }); // đã scale rồi
//       // Fix: scale đúng
//       points[points.length - 1] = { x: cx, y: cy };
//     } else if (cmd === 'L') {
//       const x = readNum() * scale;
//       const y = readNum() * scale;
//       cx = x; cy = y;
//       points.push({ x: cx, y: cy });
//     } else if (cmd === 'l') {
//       const dx = readNum() * scale;
//       const dy = readNum() * scale;
//       cx += dx; cy += dy;
//       points.push({ x: cx, y: cy });
//     } else if (cmd === 'C') {
//       const x1 = readNum() * scale, y1 = readNum() * scale;
//       const x2 = readNum() * scale, y2 = readNum() * scale;
//       const x  = readNum() * scale, y  = readNum() * scale;
//       const p0 = { x: cx, y: cy };
//       const sampled = sampleCubicBezier(p0, { x: x1, y: y1 }, { x: x2, y: y2 }, { x, y });
//       points.push(...sampled);
//       cx = x; cy = y;
//     } else if (cmd === 'c') {
//       const dx1 = readNum() * scale, dy1 = readNum() * scale;
//       const dx2 = readNum() * scale, dy2 = readNum() * scale;
//       const dx  = readNum() * scale, dy  = readNum() * scale;
//       const p0 = { x: cx, y: cy };
//       const sampled = sampleCubicBezier(
//         p0,
//         { x: cx + dx1, y: cy + dy1 },
//         { x: cx + dx2, y: cy + dy2 },
//         { x: cx + dx,  y: cy + dy },
//       );
//       points.push(...sampled);
//       cx += dx; cy += dy;
//     } else if (cmd === 'Q') {
//       const x1 = readNum() * scale, y1 = readNum() * scale;
//       const x  = readNum() * scale, y  = readNum() * scale;
//       const sampled = sampleQuadraticBezier({ x: cx, y: cy }, { x: x1, y: y1 }, { x, y });
//       points.push(...sampled);
//       cx = x; cy = y;
//     } else if (cmd === 'q') {
//       const dx1 = readNum() * scale, dy1 = readNum() * scale;
//       const dx  = readNum() * scale, dy  = readNum() * scale;
//       const sampled = sampleQuadraticBezier(
//         { x: cx, y: cy },
//         { x: cx + dx1, y: cy + dy1 },
//         { x: cx + dx,  y: cy + dy },
//       );
//       points.push(...sampled);
//       cx += dx; cy += dy;
//     } else if (cmd === 'Z' || cmd === 'z') {
//       // close path — bỏ qua
//     } else {
//       i++; // unknown, skip
//     }
//   }

//   // Down-sample đều nếu quá nhiều
//   if (points.length > maxPoints) {
//     const step = points.length / maxPoints;
//     const sampled: StrokePoint[] = [];
//     for (let j = 0; j < maxPoints; j++) sampled.push(points[Math.floor(j * step)]);
//     return sampled;
//   }
//   return points;
// }

// // ═══════════════════════════════════════════════════════════════════
// // 🔬 TRÍCH XUẤT ĐẶC TRƯNG — multi-resolution + direction histogram
// // ═══════════════════════════════════════════════════════════════════

// function getBoundingBox(points: StrokePoint[]) {
//   let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
//   for (const p of points) {
//     if (p.x < minX) minX = p.x;
//     if (p.x > maxX) maxX = p.x;
//     if (p.y < minY) minY = p.y;
//     if (p.y > maxY) maxY = p.y;
//   }
//   return { minX, maxX, minY, maxY };
// }

// /**
//  * Tính direction histogram 8 hướng từ danh sách điểm
//  * Mỗi đoạn nối hai điểm liên tiếp được phân loại vào 1 trong 8 hướng
//  */
// function computeDirectionHistogram(points: StrokePoint[]): number[] {
//   const hist = new Array(DIR_BINS).fill(0);
//   if (points.length < 2) return hist;

//   for (let i = 1; i < points.length; i++) {
//     const dx = points[i].x - points[i - 1].x;
//     const dy = points[i].y - points[i - 1].y;
//     const len = Math.sqrt(dx * dx + dy * dy);
//     if (len < 0.5) continue; // bỏ điểm quá gần nhau

//     // Góc từ -π đến π, quy về 0..2π
//     let angle = Math.atan2(dy, dx);
//     if (angle < 0) angle += 2 * Math.PI;

//     // Phân vào 8 bin (mỗi bin 45°)
//     const bin = Math.floor((angle / (2 * Math.PI)) * DIR_BINS) % DIR_BINS;
//     hist[bin] += len; // trọng số theo độ dài đoạn
//   }

//   // Normalize
//   const total = hist.reduce((s, v) => s + v, 0) || 1;
//   return hist.map(v => v / total);
// }

// /**
//  * Feature vector đầy đủ:
//  * [strokeLog, aspectRatio, gravX, gravY, ...grid4x4, ...grid8x8, ...dirHist8]
//  */
// function buildFeatureVector(points: StrokePoint[], strokeCount: number): FeatureVector | null {
//   if (points.length === 0) return null;

//   const { minX, maxX, minY, maxY } = getBoundingBox(points);
//   const w = maxX - minX || 1;
//   const h = maxY - minY || 1;

//   // Chuẩn hóa về [0..1]
//   const norm = points.map(p => ({
//     x: (p.x - minX) / w,
//     y: (p.y - minY) / h,
//   }));

//   // Gravity center
//   let sumX = 0, sumY = 0;
//   for (const p of norm) { sumX += p.x; sumY += p.y; }
//   const gravityX = sumX / norm.length;
//   const gravityY = sumY / norm.length;

//   // Aspect ratio (log scale)
//   const aspectRatio = Math.log(w / h + 0.01);

//   // Grid 4x4
//   const grid4 = new Array(GRID4 * GRID4).fill(0);
//   for (const p of norm) {
//     const col = Math.min(GRID4 - 1, Math.floor(p.x * GRID4));
//     const row = Math.min(GRID4 - 1, Math.floor(p.y * GRID4));
//     grid4[row * GRID4 + col]++;
//   }
//   const t4 = norm.length;
//   const density4 = grid4.map(c => c / t4);

//   // Grid 8x8
//   const grid8 = new Array(GRID8 * GRID8).fill(0);
//   for (const p of norm) {
//     const col = Math.min(GRID8 - 1, Math.floor(p.x * GRID8));
//     const row = Math.min(GRID8 - 1, Math.floor(p.y * GRID8));
//     grid8[row * GRID8 + col]++;
//   }
//   const density8 = grid8.map(c => c / t4);

//   // Direction histogram (trên điểm đã normalize)
//   const dirHist = computeDirectionHistogram(norm);

//   const strokeCountLog = Math.log(strokeCount + 1);

//   return [strokeCountLog, aspectRatio, gravityX, gravityY, ...density4, ...density8, ...dirHist];
// }

// // Trích xuất feature từ nét vẽ người dùng
// function extractUserFeatureVector(strokes: Stroke[]): FeatureVector | null {
//   if (strokes.length === 0) return null;
//   const allPoints: StrokePoint[] = [];
//   for (const s of strokes) {
//     const step = Math.max(1, Math.floor(s.points.length / 25));
//     for (let i = 0; i < s.points.length; i += step) allPoints.push(s.points[i]);
//   }
//   if (allPoints.length === 0) return null;
//   return buildFeatureVector(allPoints, strokes.length);
// }

// // ═══════════════════════════════════════════════════════════════════
// // 📦 XÂY DỰNG FEATURE DATABASE CHO KANJI (Pre-compute)
// // ═══════════════════════════════════════════════════════════════════

// function buildKanjiFeatureFromSVG(kanji: KanjiItem): FeatureVector | null {
//   const svgPaths = (strokesMap as Record<string, string[]>)[kanji.kanji];
//   if (!svgPaths || svgPaths.length === 0) return null;

//   const allPoints: StrokePoint[] = [];
//   for (const svgPath of svgPaths) {
//     const pts = parseSvgPathToPoints(svgPath);
//     allPoints.push(...pts);
//   }
//   if (allPoints.length === 0) return null;

//   return buildFeatureVector(allPoints, kanji.strokes);
// }

// // Heuristic fallback (khi không có dữ liệu SVG)
// function buildKanjiFeatureHeuristic(kanji: KanjiItem): FeatureVector {
//   const code = kanji.kanji.charCodeAt(0);
//   const n = kanji.strokes;

//   const aspectRatio = Math.sin(code * 0.017) * 0.3;
//   const gravityX = 0.5 + Math.sin(code * 0.023) * 0.12;
//   const gravityY = 0.5 + Math.cos(code * 0.019) * 0.12;

//   // Grid 4x4
//   const density4 = new Array(GRID4 * GRID4).fill(0).map((_, i) => {
//     const row = Math.floor(i / GRID4), col = i % GRID4;
//     const dx = (col + 0.5) / GRID4 - gravityX;
//     const dy = (row + 0.5) / GRID4 - gravityY;
//     const sigma = 0.25 + n * 0.02;
//     const base = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
//     const noise = 0.5 + 0.5 * Math.sin(code * 0.031 + i * 0.71);
//     return base * (0.7 + 0.3 * noise);
//   });
//   const dSum4 = density4.reduce((s, v) => s + v, 0) || 1;
//   const normD4 = density4.map(v => v / dSum4);

//   // Grid 8x8 (interpolate from 4x4 heuristic)
//   const density8 = new Array(GRID8 * GRID8).fill(0).map((_, i) => {
//     const row = Math.floor(i / GRID8), col = i % GRID8;
//     const dx = (col + 0.5) / GRID8 - gravityX;
//     const dy = (row + 0.5) / GRID8 - gravityY;
//     const sigma = 0.22 + n * 0.018;
//     const base = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
//     const noise = 0.5 + 0.5 * Math.sin(code * 0.037 + i * 0.53);
//     return base * (0.65 + 0.35 * noise);
//   });
//   const dSum8 = density8.reduce((s, v) => s + v, 0) || 1;
//   const normD8 = density8.map(v => v / dSum8);

//   // Direction heuristic (uniform + bias based on code)
//   const dirHist = new Array(DIR_BINS).fill(0).map((_, i) =>
//     (1 / DIR_BINS) + 0.03 * Math.sin(code * 0.011 + i * 0.79)
//   );
//   const dirSum = dirHist.reduce((s, v) => s + v, 0) || 1;
//   const normDir = dirHist.map(v => v / dirSum);

//   return [Math.log(n + 1), aspectRatio, gravityX, gravityY, ...normD4, ...normD8, ...normDir];
// }

// // ═══════════════════════════════════════════════════════════════════
// // 📐 HÀM ĐO ĐỘ TƯƠNG ĐỒNG
// // ═══════════════════════════════════════════════════════════════════

// function cosineSimilarity(a: number[], b: number[]): number {
//   let dot = 0, na = 0, nb = 0;
//   for (let i = 0; i < a.length; i++) {
//     dot += a[i] * b[i];
//     na += a[i] * a[i];
//     nb += b[i] * b[i];
//   }
//   if (na === 0 || nb === 0) return 0;
//   return dot / (Math.sqrt(na) * Math.sqrt(nb));
// }

// function strokeCountSimilarity(kanjiStrokes: number, drawnStrokes: number): number {
//   const diff = Math.abs(kanjiStrokes - drawnStrokes);
//   if (diff === 0) return 1.0;
//   if (diff === 1) return 0.85;
//   if (diff === 2) return 0.65;
//   if (diff === 3) return 0.4;
//   return 0.2;
// }

// function aspectRatioSimilarity(a: number, b: number): number {
//   return Math.max(0, 1 - Math.abs(a - b) * 1.5);
// }

// function gravitySimilarity(ax: number, ay: number, bx: number, by: number): number {
//   const dist = Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
//   return Math.max(0, 1 - dist * 2.5);
// }

// /**
//  * Tính điểm tổng hợp theo cách mazii:
//  * - Stroke count: hard filter + penalty
//  * - Density 4x4: hình dạng tổng thể (cosine)
//  * - Density 8x8: chi tiết không gian (cosine)  ← mới
//  * - Direction histogram: hướng bút (cosine)    ← mới
//  * - Gravity + aspect ratio: vị trí/tỷ lệ
//  * - Level bonus: ưu tiên JLPT N5→N1
//  */
// function computeScore(
//   userVec: FeatureVector,
//   refVec: FeatureVector,
//   drawnStrokes: number,
//   kanjiStrokes: number,
//   levelBonus: number
// ): { total: number; strokeSim: number; shapeSim: number } {
//   // Slice từng phần của feature vector
//   const uD4   = userVec.slice(4, 4 + GRID4 * GRID4);
//   const rD4   = refVec.slice(4, 4 + GRID4 * GRID4);
//   const uD8   = userVec.slice(4 + GRID4 * GRID4, 4 + GRID4 * GRID4 + GRID8 * GRID8);
//   const rD8   = refVec.slice(4 + GRID4 * GRID4, 4 + GRID4 * GRID4 + GRID8 * GRID8);
//   const uDir  = userVec.slice(4 + GRID4 * GRID4 + GRID8 * GRID8);
//   const rDir  = refVec.slice(4 + GRID4 * GRID4 + GRID8 * GRID8);

//   const strokeSim  = strokeCountSimilarity(kanjiStrokes, drawnStrokes);
//   const density4Sim = cosineSimilarity(uD4, rD4);
//   const density8Sim = cosineSimilarity(uD8, rD8);
//   const dirSim     = cosineSimilarity(uDir, rDir);
//   const aspectSim  = aspectRatioSimilarity(userVec[1], refVec[1]);
//   const gravSim    = gravitySimilarity(userVec[2], userVec[3], refVec[2], refVec[3]);

//   // Shape score: kết hợp 4 yếu tố không gian
//   // direction + density8 quan trọng hơn density4 vì chi tiết hơn
//   const shapeSim =
//     density4Sim * 0.20 +
//     density8Sim * 0.35 +
//     dirSim      * 0.30 +
//     aspectSim   * 0.10 +
//     gravSim     * 0.05;

//   // Total: stroke count vẫn là yếu tố quyết định nhất (40%)
//   const total = strokeSim * 0.40 + shapeSim * 0.50 + levelBonus * 0.10;

//   return { total, strokeSim, shapeSim };
// }

// // ═══════════════════════════════════════════════════════════════════
// // 🧩 COMPONENT CHÍNH  (giữ nguyên giao diện gốc)
// // ═══════════════════════════════════════════════════════════════════
// const KanjiDrawSearchModal = forwardRef<any, Props>(
//   ({
//     visible,
//     onClose,
//     onSelectKanji,
//     isInline = false,
//     onSearchPress,
//   }, ref) => {
//     const allKanji = useMemo<KanjiItem[]>(() => getKanji(), []);

//     // Pre-compute feature database cho toàn bộ Kanji
//     const kanjiFeatureDB = useMemo<Map<string, FeatureVector>>(() => {
//       const db = new Map<string, FeatureVector>();
//       let svgCount = 0;
//       let heuristicCount = 0;
//       for (const item of allKanji) {
//         const svgVec = buildKanjiFeatureFromSVG(item);
//         if (svgVec) {
//           db.set(item.kanji, svgVec);
//           svgCount++;
//         } else {
//           db.set(item.kanji, buildKanjiFeatureHeuristic(item));
//           heuristicCount++;
//         }
//       }
//       console.log(`📊 Kanji feature DB: ${svgCount} từ SVG, ${heuristicCount} từ heuristic`);
//       return db;
//     }, [allKanji]);

//     // Index kanji theo số nét
//     const kanjiByStrokes = useMemo(() => {
//       const map = new Map<number, KanjiItem[]>();
//       for (const kanji of allKanji) {
//         const n = kanji.strokes;
//         if (!map.has(n)) map.set(n, []);
//         map.get(n)!.push(kanji);
//       }
//       return map;
//     }, [allKanji]);

//     // State vẽ
//     const [strokes, setStrokes] = useState<Stroke[]>([]);
//     const currentPoints = useRef<StrokePoint[]>([]);
//     const isDrawing = useRef(false);
//     const [, forceRender] = useState(0);
//     const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

//     // State tìm kiếm
//     const [candidates, setCandidates] = useState<KanjiCandidate[]>([]);
//     const [searching, setSearching] = useState(false);

//     const handleSearchPress = () => {
//       onClose();
//       onSearchPress?.();
//     };

//     // Animation
//     const slideAnim = useRef(new Animated.Value(0)).current;
//     const fadeAnim = useRef(new Animated.Value(0)).current;

//     useImperativeHandle(ref, () => ({
//       clearCanvas: () => {
//         setStrokes([]);
//         currentPoints.current = [];
//         setCandidates([]);
//         forceRender((n) => n + 1);
//       },
//     }));

//     // Hiệu ứng mở/đóng
//     useEffect(() => {
//       if (visible) {
//         setStrokes([]);
//         currentPoints.current = [];
//         setCandidates([]);
//         setSearching(false);
//         if (!isInline) {
//           Animated.parallel([
//             Animated.spring(slideAnim, {
//               toValue: 1, friction: 8, tension: 40, useNativeDriver: true,
//             }),
//             Animated.timing(fadeAnim, {
//               toValue: 1, duration: 200, useNativeDriver: true,
//             }),
//           ]).start();
//         }
//       } else {
//         if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
//         if (!isInline) {
//           Animated.parallel([
//             Animated.spring(slideAnim, {
//               toValue: 0, friction: 8, tension: 40, useNativeDriver: true,
//             }),
//             Animated.timing(fadeAnim, {
//               toValue: 0, duration: 150, useNativeDriver: true,
//             }),
//           ]).start();
//         }
//       }
//     }, [visible, isInline, slideAnim, fadeAnim]);

//     useEffect(() => {
//       return () => {
//         if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
//       };
//     }, []);

//     // 🔍 THUẬT TOÁN TÌM KIẾM
//     const performSearch = useCallback(
//       (drawnStrokesCount: number, currentStrokes: Stroke[]) => {
//         if (drawnStrokesCount === 0) {
//           setCandidates([]);
//           setSearching(false);
//           return;
//         }

//         setSearching(true);

//         requestAnimationFrame(() => {
//           const userVec = extractUserFeatureVector(currentStrokes);
//           if (!userVec) {
//             setSearching(false);
//             return;
//           }

//           const minStrokes = Math.max(1, drawnStrokesCount - 2);
//           const maxStrokes = drawnStrokesCount + 2;
//           const results: KanjiCandidate[] = [];

//           for (let sc = minStrokes; sc <= maxStrokes; sc++) {
//             const kanjiList = kanjiByStrokes.get(sc);
//             if (!kanjiList) continue;

//             for (const kanji of kanjiList) {
//               const refVec = kanjiFeatureDB.get(kanji.kanji);
//               if (!refVec) continue;

//               // Bỏ qua nếu feature vector độ dài không khớp (fallback heuristic vs SVG)
//               if (refVec.length !== userVec.length) continue;

//               const levelBonus = (LEVEL_SCORE[kanji.level] ?? 1) / 5;
//               const { total, strokeSim, shapeSim } = computeScore(
//                 userVec, refVec, drawnStrokesCount, kanji.strokes, levelBonus
//               );

//               if (total > 0.2) {
//                 results.push({
//                   item: kanji,
//                   score: total * 100,
//                   strokeSimilarity: strokeSim * 100,
//                   shapeSimilarity: shapeSim * 100,
//                 });
//               }
//             }
//           }

//           // Lọc bỏ trùng lặp theo chữ Kanji
//           const uniqueResults = results.filter((cand, index, self) =>
//             index === self.findIndex((c) => c.item.kanji === cand.item.kanji)
//           );

//           // Sắp xếp theo điểm giảm dần
//           uniqueResults.sort((a, b) => b.score - a.score);
//           setCandidates(uniqueResults.slice(0, TOP_K_CANDIDATES));
//           setSearching(false);
//         });
//       },
//       [kanjiByStrokes, kanjiFeatureDB]
//     );

//     // Debounce search
//     useEffect(() => {
//       if (strokes.length > 0) {
//         if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
//         searchTimerRef.current = setTimeout(() => {
//           performSearch(strokes.length, strokes);
//         }, SEARCH_DEBOUNCE_MS);
//         return () => {
//           if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
//         };
//       } else {
//         setCandidates([]);
//         setSearching(false);
//       }
//     }, [strokes, performSearch]);

//     // PanResponder
//     const panResponder = useRef(
//       PanResponder.create({
//         onStartShouldSetPanResponder: () => true,
//         onMoveShouldSetPanResponder: () => true,

//         onPanResponderGrant: (e) => {
//           const { locationX, locationY } = e.nativeEvent;
//           isDrawing.current = true;
//           currentPoints.current = [{ x: locationX, y: locationY }];
//           forceRender((n) => n + 1);
//         },

//         onPanResponderMove: (e) => {
//           if (!isDrawing.current) return;
//           const { locationX, locationY } = e.nativeEvent;
//           currentPoints.current = [...currentPoints.current, { x: locationX, y: locationY }];
//           if (currentPoints.current.length % 2 === 0) forceRender((n) => n + 1);
//         },

//         onPanResponderRelease: () => {
//           isDrawing.current = false;
//           const pts = currentPoints.current;
//           if (pts.length > 2) {
//             setStrokes((prev) => [
//               ...prev,
//               {
//                 id: Date.now().toString(),
//                 points: pts,
//                 path: pointsToPath(pts),
//                 order: prev.length + 1,
//               },
//             ]);
//           }
//           currentPoints.current = [];
//           forceRender((n) => n + 1);
//         },

//         onPanResponderTerminate: () => {
//           isDrawing.current = false;
//           currentPoints.current = [];
//         },
//       })
//     ).current;

//     const clearCanvas = useCallback(() => {
//       setStrokes([]);
//       currentPoints.current = [];
//       setCandidates([]);
//       forceRender((n) => n + 1);
//     }, []);

//     const undoStroke = useCallback(() => {
//       setStrokes((prev) => prev.slice(0, -1));
//     }, []);

//     const handleKanjiPress = useCallback(
//       (kanji: KanjiItem) => {
//         onSelectKanji?.(kanji.kanji, kanji);
//       },
//       [onSelectKanji]
//     );

//     const strokeCount = strokes.length;
//     const currentPath = pointsToPath(currentPoints.current);
//     const hasResults = candidates.length > 0;
//     const translateY = slideAnim.interpolate({
//       inputRange: [0, 1], outputRange: [500, 0],
//     });

//     if (!visible) return null;

//     // Render — giữ nguyên giao diện gốc
//     const content = (
//       <>
//         {/* KHU VỰC GỢI Ý */}
//         <View style={[styles.resultsWrapper, isInline && styles.resultsWrapperInline]}>
//           <Text style={styles.resultsTitle}>
//             {searching
//               ? "🔍 Đang phân tích đặc trưng hình học..."
//               : strokeCount === 0
//               ? "✍️ Vẽ chữ Hán vào ô dưới đây"
//               : `📝 Kết quả gợi ý (${candidates.length})`}
//           </Text>

//           {searching && (
//             <View style={styles.loaderContainer}>
//               <ActivityIndicator size="small" color={ORANGE} />
//             </View>
//           )}

//           {!searching && strokeCount > 0 && hasResults && (
//             <ScrollView
//               horizontal
//               showsHorizontalScrollIndicator={false}
//               style={styles.resultsScroll}
//             >
//               {candidates.map((cand) => (
//                 <TouchableOpacity
//                   key={cand.item.id ?? cand.item.kanji}
//                   style={styles.resultChip}
//                   onPress={() => handleKanjiPress(cand.item)}
//                   activeOpacity={0.7}
//                 >
//                   <Text style={styles.resultChipKanji}>{cand.item.kanji}</Text>
//                 </TouchableOpacity>
//               ))}
//             </ScrollView>
//           )}
//         </View>

//         {/* KHUNG VẼ */}
//         <View style={styles.canvasWrapper}>
//           <View style={styles.canvasSection}>
//             <View style={styles.canvas} {...panResponder.panHandlers}>
//               <Svg width={CANVAS_SIZE} height={CANVAS_SIZE} style={StyleSheet.absoluteFillObject}>
//                 {/* Lưới hướng dẫn */}
//                 <Line x1={CANVAS_SIZE/2} y1={0} x2={CANVAS_SIZE/2} y2={CANVAS_SIZE} stroke="#e2e8f0" strokeWidth={1} strokeDasharray="6,4" />
//                 <Line x1={0} y1={CANVAS_SIZE/2} x2={CANVAS_SIZE} y2={CANVAS_SIZE/2} stroke="#e2e8f0" strokeWidth={1} strokeDasharray="6,4" />
//                 <Line x1={0} y1={0} x2={CANVAS_SIZE} y2={CANVAS_SIZE} stroke="#f1f5f9" strokeWidth={1} />
//                 <Line x1={CANVAS_SIZE} y1={0} x2={0} y2={CANVAS_SIZE} stroke="#f1f5f9" strokeWidth={1} />

//                 {/* Các nét đã vẽ */}
//                 {strokes.map((s, i) => {
//                   const hue = (i * 45) % 360;
//                   const color = `hsl(${hue}, 80%, 55%)`;
//                   return (
//                     <Path
//                       key={s.id}
//                       d={s.path}
//                       stroke={color}
//                       strokeWidth={STROKE_WIDTH}
//                       strokeLinecap="round"
//                       strokeLinejoin="round"
//                       fill="none"
//                     />
//                   );
//                 })}

//                 {/* Nét đang vẽ */}
//                 {currentPath !== "" && (
//                   <Path
//                     d={currentPath}
//                     stroke={ORANGE}
//                     strokeWidth={STROKE_WIDTH}
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                     fill="none"
//                   />
//                 )}
//               </Svg>

//               {strokeCount === 0 && currentPoints.current.length === 0 && (
//                 <View style={styles.placeholder} pointerEvents="none">
//                   <Text style={styles.placeholderIcon}>✍️</Text>
//                   <Text style={styles.placeholderText}>Vẽ Kanji</Text>
//                 </View>
//               )}
//             </View>
//           </View>

//           {/* THANH ĐIỀU KHIỂN */}
//           <View style={styles.controlRow}>
//             <View style={styles.controlLeftGroup}>
//               <TouchableOpacity style={styles.controlBtn} onPress={undoStroke} disabled={strokeCount === 0}>
//                 <Text style={[styles.controlBtnText, strokeCount === 0 && styles.controlBtnDisabled]}>↩</Text>
//               </TouchableOpacity>
//               <View style={styles.strokeInfo}>
//                 <Text style={styles.strokeCountText}>{strokeCount}</Text>
//                 <Text style={styles.strokeInfoText}> nét</Text>
//               </View>
//               <TouchableOpacity style={styles.controlBtn} onPress={clearCanvas} disabled={strokeCount === 0}>
//                 <Text style={[styles.controlBtnText, strokeCount === 0 && styles.controlBtnDisabled]}>🗑</Text>
//               </TouchableOpacity>
//             </View>

//             <TouchableOpacity style={styles.searchBtn} onPress={handleSearchPress}>
//               <Text style={styles.searchBtnText}>🔍 Tìm kiếm</Text>
//             </TouchableOpacity> 
//           </View>
//         </View>
//       </>
//     );

//     return (
//       <Animated.View
//         style={[
//           styles.container,
//           {
//             transform: [{ translateY }],
//             opacity: fadeAnim,
//           },
//         ]}
//       >
//         {content}
//       </Animated.View>
//     );
//   }
// );

// KanjiDrawSearchModal.displayName = "KanjiDrawSearchModal";

// // ═══════════════════════════════════════════════════════════════════
// // 🎨 STYLES — giữ nguyên giao diện gốc
// // ═══════════════════════════════════════════════════════════════════
// const styles = StyleSheet.create({
//   container: {
//     backgroundColor: "#fff",
//     borderRadius: 20,
//     marginTop: 12,
//     overflow: "hidden",
//     borderWidth: 1,
//     borderColor: "#e2e8f0",
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.1,
//     shadowRadius: 8,
//     elevation: 5,
//     width: "100%",
//     position: 'absolute',
//     bottom: 0,
//     left: 0,
//     right: 0,
//     zIndex: 999,
//   },
//   inlineContainer: {
//     backgroundColor: "#fff",
//     width: "100%",
//     borderTopWidth: 1,
//     borderBottomWidth: 1,
//     borderColor: "#e2e8f0",
//   },
//   resultsWrapper: {
//     paddingHorizontal: 16,
//     paddingVertical: 8,
//     borderBottomWidth: 1,
//     borderBottomColor: "#f1f5f9",
//     minHeight: 50,
//   },
//   resultsWrapperInline: {
//     paddingVertical: 8,
//   },
//   resultsTitle: {
//     fontSize: 12,
//     fontWeight: "600",
//     color: "#64748b",
//     marginBottom: 4,
//   },
//   resultsScroll: {
//     flexDirection: "row",
//     maxHeight: 50,
//   },
//   loaderContainer: {
//     height: 40,
//     justifyContent: "center",
//     alignItems: "flex-start",
//     paddingLeft: 10,
//   },
//   resultChip: {
//     backgroundColor: "#f1f5f9",
//     borderRadius: 16,
//     paddingHorizontal: 16,
//     marginRight: 10,
//     alignItems: "center",
//     justifyContent: "center",
//     minWidth: 40,
//     minHeight: 40,
//     position: "relative",
//   },
//   resultChipKanji: {
//     fontSize: 24,
//     fontWeight: "700",
//     color: "#1e293b",
//   },
//   canvasWrapper: {
//     paddingHorizontal: 16,
//     paddingTop: 12,
//     paddingBottom: 12,
//   },
//   canvasSection: {
//     alignItems: "center",
//   },
//   canvas: {
//     width: CANVAS_SIZE,
//     height: CANVAS_SIZE,
//     backgroundColor: "#fafafa",
//     borderRadius: 20,
//     borderWidth: 2,
//     borderColor: "#e2e8f0",
//     overflow: "hidden",
//   },
//   placeholder: {
//     ...StyleSheet.absoluteFillObject,
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   placeholderIcon: {
//     fontSize: 32,
//     opacity: 0.25,
//   },
//   placeholderText: {
//     fontSize: 13,
//     color: "#94a3b8",
//     fontWeight: "500",
//     marginTop: 4,
//   },
//   controlRow: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     marginTop: 14,
//     paddingHorizontal: 20,
//   },
//   strokeInfo: {
//     flexDirection: "row",
//     alignItems: "baseline",
//     backgroundColor: "#f1f5f9",
//     paddingHorizontal: 16,
//     paddingVertical: 6,
//     borderRadius: 24,
//   },
//   strokeInfoText: {
//     fontSize: 12,
//     color: "#64748b",
//   },
//   strokeCountText: {
//     fontWeight: "800",
//     color: ORANGE,
//     fontSize: 18,
//   },
//   controlBtn: {
//     backgroundColor: "#f1f5f9",
//     width: 44,
//     height: 44,
//     borderRadius: 22,
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   controlBtnText: {
//     fontSize: 20,
//     color: "#475569",
//   },
//   controlBtnDisabled: {
//     opacity: 0.4,
//   },
//   searchBtn: {
//     backgroundColor: "#adaa4b",
//     paddingHorizontal: 16,
//     paddingVertical: 10,
//     borderRadius: 22,
//     alignItems: 'center',
//     justifyContent: 'center',
//     flexDirection: 'row',
//     gap: 6,
//   },
//   searchBtnText: {
//     fontSize: 14,
//     fontWeight: '700',
//     color: '#fff',
//   },
//   controlLeftGroup: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//   },
// });

// export default KanjiDrawSearchModal;