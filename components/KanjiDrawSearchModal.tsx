import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  ActivityIndicator,
  Dimensions,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
} from "react-native";
import Svg, { Line, Path } from "react-native-svg";

import { getKanji, type KanjiItem } from "../assets/data_JLPT_kanji";
import strokesMap from "../assets/data_JLPT_kanji/kanji_strokes.json";

// ═══════════════════════════════════════════════════════════════════
// 🎨 HẰNG SỐ
// ═══════════════════════════════════════════════════════════════════
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CANVAS_SIZE = Math.min(SCREEN_WIDTH - 40, 500);
const STROKE_WIDTH = 6;
const ORANGE = "#ed8b3a";
const SEARCH_DEBOUNCE_MS = 320;
const TOP_K_CANDIDATES = 15;

// Feature vector constants
const GRID4 = 4;
const GRID8 = 8;
const NORMALIZED_SIZE = 100;
const DIR_BINS = 8;

// Regex khớp mọi ký tự Nhật: Kanji CJK, Hiragana, Katakana
const JAPANESE_REGEX = /[\u4e00-\u9faf\u3400-\u4dbf\uf900-\ufaff\u3040-\u309f\u30a0-\u30ff]/;

// ═══════════════════════════════════════════════════════════════════
// 📝 INTERFACES
// ═══════════════════════════════════════════════════════════════════
interface StrokePoint { x: number; y: number; }

interface Stroke {
  id: string;
  points: StrokePoint[];
  path: string;
  order: number;
}

type FeatureVector = number[];

interface KanjiCandidate {
  item: KanjiItem;
  score: number;
  strokeSimilarity: number;
  shapeSimilarity: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelectKanji?: (kanji: string, kanjiData?: KanjiItem) => void;
  isInline?: boolean;
  onSearchPress?: (searchResults?: KanjiCandidate[]) => void;
}

// ═══════════════════════════════════════════════════════════════════
// 🛠️ HÀM TIỆN ÍCH VẼ
// ═══════════════════════════════════════════════════════════════════
// function pointsToPath(points: StrokePoint[]): string {
//   if (points.length === 0) return "";
//   if (points.length === 1) {
//     // Chấm đơn: vẽ một đoạn rất ngắn để SVG hiển thị
//     return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} L ${(points[0].x + 0.5).toFixed(1)} ${points[0].y.toFixed(1)}`;
//   }
//   let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
//   for (let i = 1; i < points.length; i++) {
//     d += ` L ${points[i].x.toFixed(1)} ${points[i].y.toFixed(1)}`;
//   }
//   return d;
// }
function pointsToPath(points: StrokePoint[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) {
    return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} L ${(points[0].x + 0.5).toFixed(1)} ${points[0].y.toFixed(1)}`;
  }
  if (points.length === 2) {
    return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} L ${points[1].x.toFixed(1)} ${points[1].y.toFixed(1)}`;
  }
  // Dùng quadratic bezier — đi qua midpoint giữa các điểm liên tiếp
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 1; i < points.length - 1; i++) {
    const midX = ((points[i].x + points[i + 1].x) / 2).toFixed(1);
    const midY = ((points[i].y + points[i + 1].y) / 2).toFixed(1);
    d += ` Q ${points[i].x.toFixed(1)} ${points[i].y.toFixed(1)} ${midX} ${midY}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;
  return d;
}

// ═══════════════════════════════════════════════════════════════════
// 🔬 SVG PATH PARSER — đọc đúng M/L/C/Q/Z (chuẩn KanjiVG 109×109)
// ═══════════════════════════════════════════════════════════════════
function sampleCubicBezier(
  p0: StrokePoint, p1: StrokePoint, p2: StrokePoint, p3: StrokePoint,
  samples = 8
): StrokePoint[] {
  const pts: StrokePoint[] = [];
  for (let i = 1; i <= samples; i++) {
    const t = i / samples;
    const mt = 1 - t;
    pts.push({
      x: mt*mt*mt*p0.x + 3*mt*mt*t*p1.x + 3*mt*t*t*p2.x + t*t*t*p3.x,
      y: mt*mt*mt*p0.y + 3*mt*mt*t*p1.y + 3*mt*t*t*p2.y + t*t*t*p3.y,
    });
  }
  return pts;
}

function sampleQuadraticBezier(
  p0: StrokePoint, p1: StrokePoint, p2: StrokePoint,
  samples = 6
): StrokePoint[] {
  const pts: StrokePoint[] = [];
  for (let i = 1; i <= samples; i++) {
    const t = i / samples;
    const mt = 1 - t;
    pts.push({
      x: mt*mt*p0.x + 2*mt*t*p1.x + t*t*p2.x,
      y: mt*mt*p0.y + 2*mt*t*p1.y + t*t*p2.y,
    });
  }
  return pts;
}

function parseSvgPathToPoints(svgPath: string, maxPoints = 40): StrokePoint[] {
  const scale = NORMALIZED_SIZE / 109;
  const points: StrokePoint[] = [];
  const tokens = svgPath.match(/[MmLlCcQqZz]|[-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?/g);
  if (!tokens) return [];

  let cx = 0, cy = 0, cmd = '';
  let i = 0;

  const peek = () => tokens[i];
  const readNum = (): number => {
    while (i < tokens.length && /[MmLlCcQqZz]/.test(tokens[i])) cmd = tokens[i++];
    return i < tokens.length ? parseFloat(tokens[i++]) : 0;
  };

  while (i < tokens.length) {
    if (/[MmLlCcQqZz]/.test(peek())) cmd = tokens[i++];

    if (cmd === 'M') {
      cx = readNum() * scale; cy = readNum() * scale;
      points.push({ x: cx, y: cy });
      cmd = 'L';
    } else if (cmd === 'm') {
      cx += readNum() * scale; cy += readNum() * scale;
      points.push({ x: cx, y: cy });
      cmd = 'l';
    } else if (cmd === 'L') {
      cx = readNum() * scale; cy = readNum() * scale;
      points.push({ x: cx, y: cy });
    } else if (cmd === 'l') {
      cx += readNum() * scale; cy += readNum() * scale;
      points.push({ x: cx, y: cy });
    } else if (cmd === 'C') {
      const x1=readNum()*scale, y1=readNum()*scale;
      const x2=readNum()*scale, y2=readNum()*scale;
      const x=readNum()*scale,  y=readNum()*scale;
      points.push(...sampleCubicBezier({x:cx,y:cy},{x:x1,y:y1},{x:x2,y:y2},{x,y}));
      cx=x; cy=y;
    } else if (cmd === 'c') {
      const dx1=readNum()*scale, dy1=readNum()*scale;
      const dx2=readNum()*scale, dy2=readNum()*scale;
      const dx=readNum()*scale,  dy=readNum()*scale;
      points.push(...sampleCubicBezier({x:cx,y:cy},{x:cx+dx1,y:cy+dy1},{x:cx+dx2,y:cy+dy2},{x:cx+dx,y:cy+dy}));
      cx+=dx; cy+=dy;
    } else if (cmd === 'Q') {
      const x1=readNum()*scale, y1=readNum()*scale;
      const x=readNum()*scale,  y=readNum()*scale;
      points.push(...sampleQuadraticBezier({x:cx,y:cy},{x:x1,y:y1},{x,y}));
      cx=x; cy=y;
    } else if (cmd === 'q') {
      const dx1=readNum()*scale, dy1=readNum()*scale;
      const dx=readNum()*scale,  dy=readNum()*scale;
      points.push(...sampleQuadraticBezier({x:cx,y:cy},{x:cx+dx1,y:cy+dy1},{x:cx+dx,y:cy+dy}));
      cx+=dx; cy+=dy;
    } else if (cmd === 'Z' || cmd === 'z') {
      // close path — bỏ qua
    } else {
      i++;
    }
  }

  if (points.length > maxPoints) {
    const step = points.length / maxPoints;
    return Array.from({ length: maxPoints }, (_, j) => points[Math.floor(j * step)]);
  }
  return points;
}

// ═══════════════════════════════════════════════════════════════════
// 🔬 FEATURE VECTOR — Multi-resolution + Direction histogram
// ═══════════════════════════════════════════════════════════════════
function getBoundingBox(points: StrokePoint[]) {
  let minX=Infinity, maxX=-Infinity, minY=Infinity, maxY=-Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
  }
  return { minX, maxX, minY, maxY };
}

function computeDirectionHistogram(points: StrokePoint[]): number[] {
  const hist = new Array(DIR_BINS).fill(0);
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i-1].x;
    const dy = points[i].y - points[i-1].y;
    const len = Math.sqrt(dx*dx + dy*dy);
    if (len < 0.5) continue;
    let angle = Math.atan2(dy, dx);
    if (angle < 0) angle += 2*Math.PI;
    const bin = Math.floor((angle / (2*Math.PI)) * DIR_BINS) % DIR_BINS;
    hist[bin] += len;
  }
  const total = hist.reduce((s, v) => s + v, 0) || 1;
  return hist.map(v => v / total);
}

function buildFeatureVector(points: StrokePoint[], strokeCount: number): FeatureVector | null {
  if (points.length === 0) return null;
  const { minX, maxX, minY, maxY } = getBoundingBox(points);
  const w = maxX - minX || 1;
  const h = maxY - minY || 1;

  const norm = points.map(p => ({ x: (p.x - minX) / w, y: (p.y - minY) / h }));

  let sumX = 0, sumY = 0;
  for (const p of norm) { sumX += p.x; sumY += p.y; }
  const gravityX = sumX / norm.length;
  const gravityY = sumY / norm.length;
  const aspectRatio = Math.log(w / h + 0.01);

  const grid4 = new Array(GRID4*GRID4).fill(0);
  for (const p of norm) {
    const col = Math.min(GRID4-1, Math.floor(p.x * GRID4));
    const row = Math.min(GRID4-1, Math.floor(p.y * GRID4));
    grid4[row * GRID4 + col]++;
  }
  const density4 = grid4.map(c => c / norm.length);

  const grid8 = new Array(GRID8*GRID8).fill(0);
  for (const p of norm) {
    const col = Math.min(GRID8-1, Math.floor(p.x * GRID8));
    const row = Math.min(GRID8-1, Math.floor(p.y * GRID8));
    grid8[row * GRID8 + col]++;
  }
  const density8 = grid8.map(c => c / norm.length);

  const dirHist = computeDirectionHistogram(norm);
  const strokeCountLog = Math.log(strokeCount + 1);

  return [strokeCountLog, aspectRatio, gravityX, gravityY, ...density4, ...density8, ...dirHist];
}

function extractUserFeatureVector(strokes: Stroke[]): FeatureVector | null {
  if (strokes.length === 0) return null;
  const allPoints: StrokePoint[] = [];
  for (const s of strokes) {
    const step = Math.max(1, Math.floor(s.points.length / 25));
    for (let i = 0; i < s.points.length; i += step) allPoints.push(s.points[i]);
  }
  return buildFeatureVector(allPoints, strokes.length);
}

function buildKanjiFeatureFromSVG(kanji: KanjiItem): FeatureVector | null {
  const svgPaths = (strokesMap as Record<string, string[]>)[kanji.kanji];
  if (!svgPaths || svgPaths.length === 0) return null;
  const allPoints: StrokePoint[] = [];
  for (const p of svgPaths) allPoints.push(...parseSvgPathToPoints(p));
  if (allPoints.length === 0) return null;
  return buildFeatureVector(allPoints, kanji.strokes);
}

function buildKanjiFeatureHeuristic(kanji: KanjiItem): FeatureVector {
  const code = kanji.kanji.charCodeAt(0);
  const n = kanji.strokes;
  const aspectRatio = Math.sin(code * 0.017) * 0.3;
  const gravityX = 0.5 + Math.sin(code * 0.023) * 0.12;
  const gravityY = 0.5 + Math.cos(code * 0.019) * 0.12;

  const makeGrid = (g: number) =>
    new Array(g*g).fill(0).map((_, i) => {
      const row = Math.floor(i/g), col = i%g;
      const dx = (col+0.5)/g - gravityX, dy = (row+0.5)/g - gravityY;
      const s = 0.24 + n * 0.019;
      const base = Math.exp(-(dx*dx+dy*dy)/(2*s*s));
      return base * (0.65 + 0.35*Math.sin(code*0.031+i*0.71));
    }).map((v, _, arr) => v / (arr.reduce((a,b)=>a+b,0)||1));

  const dirHist = new Array(DIR_BINS).fill(0)
    .map((_, i) => (1/DIR_BINS) + 0.03*Math.sin(code*0.011+i*0.79))
    .map((v, _, arr) => v / (arr.reduce((a,b)=>a+b,0)||1));

  return [Math.log(n+1), aspectRatio, gravityX, gravityY, ...makeGrid(GRID4), ...makeGrid(GRID8), ...dirHist];
}

// ═══════════════════════════════════════════════════════════════════
// 📐 SCORING
// ═══════════════════════════════════════════════════════════════════
function cosineSimilarity(a: number[], b: number[]): number {
  let dot=0, na=0, nb=0;
  for (let i=0; i<a.length; i++) { dot+=a[i]*b[i]; na+=a[i]*a[i]; nb+=b[i]*b[i]; }
  return (na===0||nb===0) ? 0 : dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function strokeCountSimilarity(kanjiStrokes: number, drawnStrokes: number): number {
  const diff = Math.abs(kanjiStrokes - drawnStrokes);
  if (diff === 0) return 1.0;
  if (diff === 1) return 0.82;
  if (diff === 2) return 0.60;
  if (diff === 3) return 0.38;
  return Math.max(0, 0.20 - (diff-4)*0.04);
}

function computeLocalScore(
  userVec: FeatureVector,
  refVec: FeatureVector,
  drawnStrokes: number,
  kanjiStrokes: number,
  levelBonus: number
): { total: number; strokeSim: number; shapeSim: number } {
  const D4 = GRID4*GRID4, D8 = GRID8*GRID8;
  const uD4 = userVec.slice(4, 4+D4);
  const rD4 = refVec.slice(4, 4+D4);
  const uD8 = userVec.slice(4+D4, 4+D4+D8);
  const rD8 = refVec.slice(4+D4, 4+D4+D8);
  const uDir = userVec.slice(4+D4+D8);
  const rDir = refVec.slice(4+D4+D8);

  const strokeSim   = strokeCountSimilarity(kanjiStrokes, drawnStrokes);
  const density4Sim = cosineSimilarity(uD4, rD4);
  const density8Sim = cosineSimilarity(uD8, rD8);
  const dirSim      = cosineSimilarity(uDir, rDir);

  const aspectDiff = Math.abs(userVec[1] - refVec[1]);
  const aspectSim  = Math.max(0, 1 - aspectDiff * 1.5);

  const gravDist   = Math.sqrt((userVec[2]-refVec[2])**2 + (userVec[3]-refVec[3])**2);
  const gravSim    = Math.max(0, 1 - gravDist * 2.5);

  // Weighted shape: chi tiết quan trọng hơn tổng thể
  const shapeSim =
    density4Sim * 0.18 +
    density8Sim * 0.37 +
    dirSim      * 0.28 +
    aspectSim   * 0.10 +
    gravSim     * 0.07;

  const total = strokeSim * 0.40 + shapeSim * 0.50 + levelBonus * 0.10;
  return { total, strokeSim, shapeSim };
}

// ═══════════════════════════════════════════════════════════════════
// 🌐 GOOGLE HANDWRITING API — qua Vercel proxy
// ═══════════════════════════════════════════════════════════════════
async function searchViaGoogleAPI(
  strokes: Stroke[],
  canvasSize: number
): Promise<string[] | null> {
  try {
    const ink = strokes.map((stroke) => {
      const xCoords: number[] = [];
      const yCoords: number[] = [];
      stroke.points.forEach((pt) => {
        xCoords.push(Math.round(pt.x));
        yCoords.push(Math.round(pt.y));
      });
      return [xCoords, yCoords];
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(
      "https://japanese-handwriting-proxy.vercel.app/api",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: "ja", ink }),
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);

    const data = await response.json();
    if (data?.[0] === "SUCCESS" && data[1]?.[0]?.[1]) {
      return data[1][0][1] as string[];
    }
    return null;
  } catch {
    return null; // Network error → fallback to local
  }
}

// ═══════════════════════════════════════════════════════════════════
// 🧩 COMPONENT CHÍNH
// ═══════════════════════════════════════════════════════════════════
const KanjiDrawSearchModal = forwardRef<any, Props>(
  ({ visible, onClose, onSelectKanji, isInline = false, onSearchPress }, ref) => {

    // ─── Dữ liệu từ điển ───────────────────────────────────────────
    const allKanji = useMemo<KanjiItem[]>(() => getKanji(), []);

    const kanjiMap = useMemo(() => {
      const m = new Map<string, KanjiItem>();
      for (const item of allKanji) m.set(item.kanji, item);
      return m;
    }, [allKanji]);

    // Pre-compute feature DB cho fallback local
    const kanjiFeatureDB = useMemo<Map<string, FeatureVector>>(() => {
      const db = new Map<string, FeatureVector>();
      for (const item of allKanji) {
        const vec = buildKanjiFeatureFromSVG(item) ?? buildKanjiFeatureHeuristic(item);
        db.set(item.kanji, vec);
      }
      return db;
    }, [allKanji]);

    // ─── Trạng thái vẽ ─────────────────────────────────────────────
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const strokesRef      = useRef<Stroke[]>([]);
    const currentPoints   = useRef<StrokePoint[]>([]);
    const isDrawing       = useRef(false);
    const [, forceRender] = useState(0);
    const searchTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ─── Trạng thái tìm kiếm ───────────────────────────────────────
    const [candidates, setCandidates] = useState<KanjiCandidate[]>([]);
    const [searching, setSearching]   = useState(false);
    const [searchMode, setSearchMode] = useState<"google" | "local" | "">("");

    // ─── Animation ─────────────────────────────────────────────────
    const slideAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim  = useRef(new Animated.Value(0)).current;
    const [isMounted, setIsMounted] = useState(false);

    const clearCanvas = useCallback(() => {
      setStrokes([]);
      strokesRef.current = [];
      currentPoints.current = [];
      setCandidates([]);
      setSearching(false);
      setSearchMode("");
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      forceRender(n => n + 1);
    }, []);

    useImperativeHandle(ref, () => ({ clearCanvas }));

    useEffect(() => {
      if (visible) {
        setIsMounted(true);
        clearCanvas();
        if (!isInline) {
          slideAnim.setValue(0);
          fadeAnim.setValue(0);
          Animated.parallel([
            Animated.spring(slideAnim, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }),
            Animated.timing(fadeAnim,  { toValue: 1, duration: 200, useNativeDriver: true }),
          ]).start();
        }
      } else {
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        if (!isInline) {
          Animated.parallel([
            Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
            Animated.timing(fadeAnim,  { toValue: 0, duration: 180, useNativeDriver: true }),
          ]).start(({ finished }) => {
            if (finished) setIsMounted(false);
          });
        } else {
          setIsMounted(false);
        }
      }
    }, [visible, isInline, slideAnim, fadeAnim, clearCanvas]);

    useEffect(() => () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    }, []);

    // ─── Thuật toán tìm kiếm local (Fallback Tầng 2) ──────────────
    const performLocalSearch = useCallback(
      (targetStrokes: Stroke[]): KanjiCandidate[] => {
        if (targetStrokes.length === 0) return [];
        const userVec = extractUserFeatureVector(targetStrokes);
        if (!userVec) return [];
        const drawnCount = targetStrokes.length;
        const results: KanjiCandidate[] = [];
        const seenKanji = new Set<string>();

        const LEVEL_BONUS: Record<string, number> = { N5: 0.05, N4: 0.04, N3: 0.03, N2: 0.02, N1: 0.01 };

        for (const item of allKanji) {
          if (seenKanji.has(item.kanji)) continue;
          seenKanji.add(item.kanji);
          const refVec = kanjiFeatureDB.get(item.kanji);
          if (!refVec) continue;
          const lb = LEVEL_BONUS[item.jlpt] ?? 0;
          const { total, strokeSim, shapeSim } = computeLocalScore(userVec, refVec, drawnCount, item.strokes, lb);
          if (total < 0.25) continue; // 👈 bỏ kết quả quá thấp
          results.push({ item, score: total, strokeSimilarity: strokeSim, shapeSimilarity: shapeSim });
        }

        return results
          .sort((a, b) => b.score - a.score)
          .slice(0, TOP_K_CANDIDATES);
      },
      [allKanji, kanjiFeatureDB]
    );
    // ─── Thuật toán tìm kiếm chính (Tầng 1: Google + Tầng 2: Local) ─
    const performSearch = useCallback(
      async (targetStrokes: Stroke[]) => {
        if (targetStrokes.length === 0) {
          setCandidates([]);
          setSearching(false);
          return;
        }
        setSearching(true);

        // ── Tầng 1: Google Handwriting API ──────────────────────────
        const googleResults = await searchViaGoogleAPI(targetStrokes, CANVAS_SIZE);

        if (googleResults && googleResults.length > 0) {
          const results: KanjiCandidate[] = [];
          const seenKanji = new Set<string>();

          for (let i = 0; i < googleResults.length; i++) {
            const char = googleResults[i];
            if (!JAPANESE_REGEX.test(char)) continue;
            if (seenKanji.has(char)) continue;  // 👈 thêm dòng này
                seenKanji.add(char);   

            const foundItem = kanjiMap.get(char);
            const googleRankScore = (1 - i / googleResults.length) * 100;

            const fallbackItem: KanjiItem = {
              id: `ext-${i}-${char}`,
              kanji: char,
              readings: { onyomi: [], kunyomi: [] },
              meanings_vi: ["Ký tự ngoài danh mục JLPT"],
              meanings_en: [],
              hanviet: [],
              strokes: 0,
              jlpt: "N1",
            } as unknown as KanjiItem;

            results.push({
              item: foundItem ?? fallbackItem,
              score: googleRankScore ,
              strokeSimilarity: 100,
              shapeSimilarity: 100,
            });
          }

          setCandidates(results.slice(0, TOP_K_CANDIDATES));
          setSearchMode("google");
          setSearching(false);
          return;
        }

        // ── Tầng 2: Local Feature Vector (fallback khi mất mạng) ────
        const localResults = performLocalSearch(targetStrokes);
        setCandidates(localResults);
        setSearchMode("local");
        setSearching(false);
      },
      [kanjiMap, performLocalSearch]
    );

    // ─── PanResponder — ghi nhận nét vẽ ───────────────────────────
    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder:  () => true,

        onPanResponderGrant: (e) => {
          if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
          const { locationX, locationY } = e.nativeEvent;
          isDrawing.current = true;
          currentPoints.current = [{ x: locationX, y: locationY }];
          forceRender(n => n + 1);
        },
        onPanResponderMove: (e) => {
          if (!isDrawing.current) return;
          const { locationX, locationY } = e.nativeEvent;
          const pts = currentPoints.current;
          // Bỏ qua điểm quá gần điểm trước — giảm noise, nét mượt hơn
          if (pts.length > 0) {
            const last = pts[pts.length - 1];
            const dx = locationX - last.x;
            const dy = locationY - last.y;
            if (dx * dx + dy * dy < 9) return; // < 3px thì bỏ
          }
          pts.push({ x: locationX, y: locationY });
          forceRender(n => n + 1);
        },

        onPanResponderRelease: () => {
          isDrawing.current = false;
          const pts = [...currentPoints.current];

          if (pts.length >= 1) {
            const newStroke: Stroke = {
              id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              points: pts,
              path: pointsToPath(pts),
              order: strokesRef.current.length + 1,
            };

            const updated = [...strokesRef.current, newStroke];
            strokesRef.current = updated;
            setStrokes(updated);

            if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
            searchTimerRef.current = setTimeout(() => {
              performSearch(updated);
            }, SEARCH_DEBOUNCE_MS);
          }

          currentPoints.current = [];
          forceRender(n => n + 1);
        },

        onPanResponderTerminate: () => {
          isDrawing.current = false;
          currentPoints.current = [];
          forceRender(n => n + 1);
        },
      })
    ).current;

    // ─── Undo nét cuối ─────────────────────────────────────────────
    const undoStroke = useCallback(() => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      const updated = strokesRef.current.slice(0, -1);
      strokesRef.current = updated;
      setStrokes(updated);

      if (updated.length > 0) {
        searchTimerRef.current = setTimeout(() => performSearch(updated), SEARCH_DEBOUNCE_MS);
      } else {
        setCandidates([]);
        setSearching(false);
        setSearchMode("");
      }
    }, [performSearch]);

    const handleKanjiPress = useCallback(
      (kanji: KanjiItem) => onSelectKanji?.(kanji.kanji, kanji),
      [onSelectKanji]
    );

    const handleSearchPress = () => {
      onClose();
      onSearchPress?.(candidates);
    };

    // ─── Render ────────────────────────────────────────────────────
    const strokeCount  = strokes.length;
    const currentPath  = pointsToPath(currentPoints.current);
    const hasResults   = candidates.length > 0;
    const translateY = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [300, 0] });

    if (!isMounted && !visible) return null;

    const statusText = searching
      ? "🔍 Đang nhận diện chữ viết tay..."
      : strokeCount === 0
      ? "✍️ Vẽ chữ Hán vào ô dưới đây"
      : hasResults
      ? `📝 ${candidates.length} kết quả  ${searchMode === "local" ? "📴" : "🌐"}`
      : "⏳ Hãy vẽ thêm nét...";
      

    return (
      <Animated.View
        style={[
          isInline ? styles.inlineContainer : styles.container,
          !isInline && { transform: [{ translateY }], opacity: fadeAnim },
        ]}
      >
        {/* ── KẾT QUẢ GỢI Ý ─────────────────────────────────────── */}
        <View style={[styles.resultsWrapper, isInline && styles.resultsWrapperInline]}>
          <Text style={styles.resultsTitle}>{statusText}</Text>

          {searching && (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="small" color={ORANGE} />
            </View>
          )}

          {!searching && strokeCount > 0 && hasResults && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.resultsScroll}
              keyboardShouldPersistTaps="handled"
            >
              {candidates.map((cand) => (
                <TouchableOpacity
                  key={`${cand.item.kanji}_${cand.item.id ?? ''}`}
                  style={styles.resultChip}
                  onPress={() => handleKanjiPress(cand.item)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.resultChipKanji}>{cand.item.kanji}</Text>
                  {cand.item.hanviet && cand.item.hanviet.length > 0 && (
                    <Text style={styles.resultChipHanViet}>{cand.item.hanviet[0]}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* ── Ô VẼ ─────────────────────────────────────────────── */}
        <View style={styles.canvasWrapper}>
          <View style={styles.canvasSection}>
            <View style={styles.canvas} {...panResponder.panHandlers}>
              <Svg width={CANVAS_SIZE} height={CANVAS_SIZE} style={StyleSheet.absoluteFillObject}>
                {/* Lưới hướng dẫn */}
                <Line x1={CANVAS_SIZE/2} y1={0}           x2={CANVAS_SIZE/2} y2={CANVAS_SIZE} stroke="#f0f4f8" strokeWidth={1} strokeDasharray="6,4" />
                <Line x1={0}            y1={CANVAS_SIZE/2} x2={CANVAS_SIZE}   y2={CANVAS_SIZE/2} stroke="#f0f4f8" strokeWidth={1} strokeDasharray="6,4" />
                <Line x1={0}            y1={0}             x2={CANVAS_SIZE}   y2={CANVAS_SIZE} stroke="#f0f4f8" strokeWidth={1} />
                <Line x1={CANVAS_SIZE} y1={0}             x2={0}             y2={CANVAS_SIZE} stroke="#f0f4f8" strokeWidth={1} />

                {/* Các nét đã hoàn tất — màu gradient theo thứ tự */}
                {strokes.map((s, i) => (
                  <Path
                    key={s.id}
                    d={s.path}
                    stroke={`hsl(${(i * 45) % 360}, 78%, 52%)`}
                    strokeWidth={STROKE_WIDTH}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                ))}

                {/* Nét đang vẽ hiện tại */}
                {currentPath !== "" && (
                  <Path
                    d={currentPath}
                    stroke={ORANGE}
                    strokeWidth={STROKE_WIDTH}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                )}
              </Svg>

              {strokeCount === 0 && currentPoints.current.length === 0 && (
                <View style={styles.placeholder} pointerEvents="none">
                  <Text style={styles.placeholderIcon}>✍️</Text>
                  <Text style={styles.placeholderText}>Vẽ Kanji để tra từ</Text>
                </View>
              )}
            </View>
          </View>

          {/* ── THANH ĐIỀU KHIỂN ──────────────────────────────── */}
          <View style={styles.controlRow}>
            <View style={styles.controlLeftGroup}>
              <TouchableOpacity
                style={styles.controlBtn}
                onPress={undoStroke}
                disabled={strokeCount === 0}
                activeOpacity={0.75}
              >
                <Text style={[styles.controlBtnText, strokeCount === 0 && styles.controlBtnDisabled]}>
                  ↩
                </Text>
              </TouchableOpacity>

              <View style={styles.strokeInfo}>
                <Text style={styles.strokeCountText}>{strokeCount}</Text>
                <Text style={styles.strokeInfoText}> nét</Text>
              </View>

              <TouchableOpacity
                style={styles.controlBtn}
                onPress={clearCanvas}
                disabled={strokeCount === 0}
                activeOpacity={0.75}
              >
                <Text style={[styles.controlBtnText, strokeCount === 0 && styles.controlBtnDisabled]}>
                  🗑
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.searchBtn}
              onPress={handleSearchPress}
              activeOpacity={0.85}
            >
              <Text style={styles.searchBtnText}>🔍 Tìm kiếm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    );
  }
);

KanjiDrawSearchModal.displayName = "KanjiDrawSearchModal";

// ═══════════════════════════════════════════════════════════════════
// 🎨 STYLES
// ═══════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 20,
    marginTop: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    width: "100%",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 999,
  },
  inlineContainer: {
    backgroundColor: "#fff",
    width: "100%",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
  },
  resultsWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f4f8",
    minHeight: 75,
  },
  resultsWrapperInline: {
    paddingVertical: 8,
  },
  resultsTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 6,
  },
  resultsScroll: {
    flexDirection: "row",
  },
  loaderContainer: {
    height: 44,
    justifyContent: "center",
    alignItems: "flex-start",
    paddingLeft: 10,
  },
  resultChip: {
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    paddingHorizontal: 14,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 46,
    height: 52,
  },
  resultChipKanji: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1e293b",
    lineHeight: 28,
  },
  resultChipHanViet: {
    fontSize: 9,
    fontWeight: "600",
    color: "#64748b",
    textTransform: "uppercase",
    marginTop: 1,
    letterSpacing: 0.3,
  },
  canvasWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  canvasSection: {
    alignItems: "center",
  },
  canvas: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    backgroundColor: "#fafafa",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#e2e8f0",
    overflow: "hidden",
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderIcon: {
    fontSize: 32,
    opacity: 0.25,
  },
  placeholderText: {
    fontSize: 13,
    color: "#94a3b8",
    fontWeight: "500",
    marginTop: 4,
  },
  controlRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    paddingHorizontal: 10,
  },
  controlLeftGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  strokeInfo: {
    flexDirection: "row",
    alignItems: "baseline",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 24,
  },
  strokeCountText: {
    fontWeight: "800",
    color: ORANGE,
    fontSize: 18,
  },
  strokeInfoText: {
    fontSize: 12,
    color: "#64748b",
  },
  controlBtn: {
    backgroundColor: "#f1f5f9",
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  controlBtnText: {
    fontSize: 20,
    color: "#475569",
  },
  controlBtnDisabled: {
    opacity: 0.4,
  },
  searchBtn: {
    backgroundColor: "#adaa4b",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
});
export default KanjiDrawSearchModal;
