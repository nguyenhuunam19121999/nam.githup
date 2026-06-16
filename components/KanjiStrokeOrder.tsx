/**
 * KanjiStrokeOrder.tsx
 *
 * Nguồn dữ liệu (theo thứ tự ưu tiên):
 *   1. kanji_strokes.json   → LOCAL  (ký hiệu 📦 xanh lá)
 *   2. AsyncStorage         → CACHED (ký hiệu 💾 xanh dương)
 *   3. Fetch CDN KanjiVG    → CDN    (ký hiệu 🌐 cam)
 *   4. Không có dữ liệu     → Hiển thị fallback chữ lớn
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  InteractionManager,
  Animated,
} from 'react-native';
import Svg, { Path, Line, Text as SvgText, G } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import strokesMap from '../assets/data_JLPT_kanji/kanji_strokes.json';
import { memoryCache } from '../services/KanjiPreloader'; 

// ── Types ──────────────────────────────────────────────────────────────────

type StrokeSource = 'local' | 'cache' | 'cdn' | 'none';

interface Props {
  kanji: string;
  size?: number;
  containerSize?: number;
  autoPlay?: boolean;
  showNumbers?: boolean;
  /** Hiện badge nguồn dữ liệu ở góc trên phải — mặc định true */
  showSourceBadge?: boolean;
}

// ── Constants ──────────────────────────────────────────────────────────────

const STROKE_COLORS = [
  '#E53935','#8E24AA','#1E88E5','#00897B','#43A047',
  '#FB8C00','#F4511E','#6D4C41','#546E7A','#D81B60',
  '#3949AB','#00ACC1','#7CB342','#C0CA33','#FFB300',
  '#F06292','#CE93D8','#90CAF9','#80CBC4','#A5D6A7',
  '#FFCC80','#FFAB91','#BCAAA4','#B0BEC5','#EF9A9A',
  '#C5CAE9','#B2EBF2','#DCEDC8','#FFF9C4','#FFE0B2',
];

const CDN_BASE = 'https://cdn.jsdelivr.net/gh/kanjivg/kanjivg@master/kanji/';
const ASYNC_STORAGE_PREFIX = 'kanji_stroke_v1:';

const BG_GRAY = "#f0f4f8";

// ── Helpers ────────────────────────────────────────────────────────────────

function toHexId(char: string): string {
  return char.codePointAt(0)!.toString(16).toLowerCase().padStart(5, '0');
}

function parseSvgPaths(rawSvg: string): string[] | null {
  const clean = rawSvg.replace(/<g[^>]*id="kvg:StrokeNumbers[\s\S]*$/, '');
  const paths: string[] = [];
  const re = /<path[^>]*\bd="([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(clean)) !== null) {
    const d = m[1].trim();
    if (d) paths.push(d);
  }
  return paths.length > 0 ? paths : null;
}

function pathLength(d: string): number {
  const nums = d.match(/[\d.]+/g);
  if (!nums || nums.length < 4) return 60;
  let len = 0;
  const vals = nums.map(Number);
  for (let i = 2; i < vals.length - 1; i += 2) {
    const dx = vals[i] - vals[i - 2];
    const dy = vals[i + 1] - vals[i - 1];
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return Math.max(len, 20);
}

// ── Source Badge ───────────────────────────────────────────────────────────

const SOURCE_CONFIG: Record<StrokeSource, { label: string; color: string; emoji: string }> = {
  local:  { label: 'LOCAL', color: '#2E7D32', emoji: '📦' },
  cache:  { label: 'CACHE', color: '#1565C0', emoji: '💾' },
  cdn:    { label: 'CDN',   color: '#E65100', emoji: '🌐' },
  none:   { label: 'N/A',   color: '#757575', emoji: '✕'  },
};

function SourceBadge({ source }: { source: StrokeSource }) {
  const cfg = SOURCE_CONFIG[source];
  return (
    <View style={[styles.badge, { backgroundColor: cfg.color }]}>
      {/* <Text style={styles.badgeText}>{cfg.emoji} {cfg.label}</Text> */}
      <Text style={styles.badgeText}>{cfg.emoji} </Text>
    </View>
  );
}

// ── Animated Stroke — dùng Animated.Value thay vì CSS style ───────────────
// react-native-svg Path không hỗ trợ prop style, dùng AnimatedStroke riêng

interface AnimatedStrokeProps {
  d: string;
  color: string;
  onDone: () => void;
}

function AnimatedStroke({ d, color, onDone }: AnimatedStrokeProps) {
  const len        = pathLength(d);
  const dashTotal  = len + 20;
  const speed      = Math.min(Math.max(len * 8, 400), 1800);
  const offsetAnim = useRef(new Animated.Value(dashTotal)).current;
  const hasRun     = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;
    
    // 1. Gán animation vào một biến hằng để dễ quản lý dọn dẹp
    const animation = Animated.timing(offsetAnim, {
      toValue: 0,
      duration: speed,
      useNativeDriver: false, // strokeDashoffset không hỗ trợ native driver
    });
    
    // 2. Kích hoạt chạy animation
    animation.start(({ finished }) => {
      if (finished) onDone();
    });

    // 3. THÊM HÀM RETURN NÀY: Giúp ngắt animation ngay lập tức nếu đổi chữ Kanji đột ngột
    return () => {
      animation.stop();
    };
  }, [offsetAnim, speed, onDone]); // Đã điền đầy đủ dependency chống cảnh báo từ React ESLint

  // Animated.Value → string cần interpolate
  const dashOffsetStr = offsetAnim.interpolate({
    inputRange:  [0, dashTotal],
    outputRange: ['0', `${dashTotal}`],
  });

  // react-native-svg hỗ trợ AnimatedPath qua createAnimatedComponent
  const AnimatedPath = Animated.createAnimatedComponent(Path);

  return (
    <AnimatedPath
      d={d}
      stroke={color}
      strokeWidth={3.5}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={`${dashTotal}`}
      strokeDashoffset={dashOffsetStr as any}
    />
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export function KanjiStrokeOrder({
  kanji,
  size = 220,
  containerSize,
  autoPlay = true,
  showNumbers = true,
  showSourceBadge = true,
}: Props) {
  const boxSize = containerSize ?? size;

  // State
  const [paths, setPaths]               = useState<string[] | null>(null);
  const [source, setSource]             = useState<StrokeSource>('none');
  const [isLoading, setIsLoading]       = useState(true);
  const [currentIdx, setCurrentIdx]     = useState(-1);   // nét đang animate (-1 = không)
  const [drawnCount, setDrawnCount]     = useState(0);    // số nét đã xong
  const [isPlaying, setIsPlaying]       = useState(false);
  const [progressText, setProgressText] = useState('');
  const [staticMask, setStaticMask]     = useState<boolean[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  const cancelRef    = useRef(false);
  const animatingRef = useRef(false);
  const playTimeoutRef = useRef<any>(null);
  const startTimeoutRef = useRef<any>(null);
  const forcePlayRef = useRef(false);

  // ── Load stroke paths ──────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setDrawnCount(0);
    setCurrentIdx(-1);
    setStaticMask([]);
    setIsPlaying(false);
    setProgressText('');
    cancelRef.current    = true;   // hủy animation cũ nếu đang chạy
    animatingRef.current = false;

    async function load() {
      // 1. Kiểm tra Bộ nhớ đệm Session (RAM) trước để có tốc độ hiển thị tức thì (0ms)
      if (memoryCache.has(kanji)) {
        const cached = memoryCache.get(kanji)!;
        if (!cancelled) { setPaths(cached); setSource('cache'); setIsLoading(false); }
        return;
      }

      // 2. Kiểm tra bộ nhớ máy (AsyncStorage) - Nơi lưu bản sửa lỗi CDN (Lưu đè Local)
      try {
        const stored = await AsyncStorage.getItem(ASYNC_STORAGE_PREFIX + kanji);
        if (stored) {
          const parsed: string[] = JSON.parse(stored);
          if (parsed.length > 0) {
            memoryCache.set(kanji, parsed);
            if (!cancelled) { setPaths(parsed); setSource('cache'); setIsLoading(false); }
            return;
          }
        }
      } catch (_) {}

      // 3. Nếu bộ nhớ máy chưa có bản lưu đè, lúc này mới dùng đến file Local mặc định
      const local = (strokesMap as Record<string, string[]>)[kanji];
      if (local && local.length > 0) {
        if (!cancelled) { setPaths(local); setSource('local'); setIsLoading(false); }
        return;
      }

      // 4. Fetch CDN (Trường hợp cả Local lẫn bộ nhớ đều chưa có dữ liệu của chữ này)
      const hexId = toHexId(kanji);
      try {
        const res     = await fetch(`${CDN_BASE}${hexId}.svg`);
        const text    = await res.text();
        const fetched = parseSvgPaths(text);
        if (fetched && !cancelled) {
          AsyncStorage.setItem(ASYNC_STORAGE_PREFIX + kanji, JSON.stringify(fetched)).catch(() => {});
          memoryCache.set(kanji, fetched);
          setPaths(fetched);
          setSource('cdn');
          setIsLoading(false);
        } else if (!cancelled) {
          setPaths([]);
          setSource('none');
          setIsLoading(false);
        }
      } catch (_) {
        if (!cancelled) { setPaths([]); setSource('none'); setIsLoading(false); }
      }
    }

    InteractionManager.runAfterInteractions(() => { load(); });
    return () => { 
      cancelled = true; 
      if (playTimeoutRef.current) clearTimeout(playTimeoutRef.current);
      if (startTimeoutRef.current) clearTimeout(startTimeoutRef.current);
    };
  }, [kanji]);

  // ── Animation logic ────────────────────────────────────────────────────

  const startFrom = useCallback((idx: number) => {
    if (!paths || cancelRef.current) return;
    if (idx >= paths.length) {
      // Xong tất cả
      animatingRef.current = false;
      setIsPlaying(false);
      setProgressText('');
      setCurrentIdx(-1);
      setDrawnCount(paths.length);
      setIsComplete(true);
      return;
    }
    setProgressText(`Đang vẽ… (${idx + 1}/${paths.length})`);
    setCurrentIdx(idx);
  }, [paths]);

  // Callback khi 1 nét vẽ xong
  const handleStrokeDone = useCallback(() => {
    if (cancelRef.current || !paths) return;
    setStaticMask(prev => {
      const next = [...prev];
      next[currentIdx] = true;
      return next;
    });
    setDrawnCount(prev => prev + 1);
    startFrom(currentIdx + 1);
  }, [currentIdx, paths, startFrom]);

  const play = useCallback(() => {
    if (!paths || paths.length === 0 || animatingRef.current) return;
    cancelRef.current    = false;
    animatingRef.current = true;
    setIsPlaying(true);
    setDrawnCount(0);
    setCurrentIdx(-1);
    setStaticMask(new Array(paths.length).fill(false));
    if (startTimeoutRef.current) clearTimeout(startTimeoutRef.current);
    startTimeoutRef.current = setTimeout(() => startFrom(0), 30);
  }, [paths, startFrom]);

  const pause = useCallback(() => {
    cancelRef.current    = true;
    animatingRef.current = false;
    setIsPlaying(false);
    setProgressText('');
    setCurrentIdx(-1);
  }, []);

  useEffect(() => {
    if (!isLoading && paths && paths.length > 0 && (autoPlay || forcePlayRef.current)) {
      forcePlayRef.current = false;
      playTimeoutRef.current = setTimeout(play, 300); // ← dòng này bị thiếu
    }
    return () => {
      if (playTimeoutRef.current) clearTimeout(playTimeoutRef.current);
    };
  }, [isLoading, paths, autoPlay, play]);

  // ── Render ─────────────────────────────────────────────────────────────

  // Hàm ép buộc tải lại từ CDN khi nét Local bị sai
  const forceFetchCDN = useCallback(async () => {
    setIsLoading(true);
    setDrawnCount(0);
    setCurrentIdx(-1);
    setStaticMask([]);
    setIsPlaying(false);
    setProgressText('');
    cancelRef.current = true;
    animatingRef.current = false;

    const hexId = toHexId(kanji);
    try {
      const res = await fetch(`${CDN_BASE}${hexId}.svg`);
      const text = await res.text();
      const fetched = parseSvgPaths(text);

      if (fetched && fetched.length > 0) {
        // 1. Lưu đè vào AsyncStorage để lần sau ưu tiên dùng bản CDN này thay vì bản Local lỗi
        await AsyncStorage.setItem(ASYNC_STORAGE_PREFIX + kanji, JSON.stringify(fetched));
        // 2. Cập nhật vào bộ nhớ đệm Session
        memoryCache.set(kanji, fetched);
        
        // 3. Cập nhật State để vẽ lại chữ mới
        setPaths(fetched);
        setSource('cdn'); 
        forcePlayRef.current = true;
      } else {
        alert("Không tìm thấy dữ liệu nét vẽ trên CDN.");
      }
    } catch (error) {
      alert("Lỗi kết nối mạng, không thể tải dữ liệu từ CDN.");
    } finally {
      setIsLoading(false);
    }
  }, [kanji]);

  return (
    <View style={styles.canvasBox}>
      {/* Source badge */}
        {showSourceBadge && !isLoading && (
          <View style={styles.topRightContainer}>
            <SourceBadge source={source} />
            
            {source === 'local' && (
              <TouchableOpacity onPress={forceFetchCDN} style={styles.reloadBtn}>
                <Text style={styles.reloadText}>⚠️ Tải lại nét</Text>
              </TouchableOpacity>
            )}
          </View>
        )}  
        
        {isLoading ? (
          <View style={styles.center}>
            <Text style={styles.loadingText}>Đang tải nét chữ…</Text>
          </View>
        ) : !paths || paths.length === 0 ? (
          <View style={styles.center}>
            <Text style={[styles.fallbackText, { fontSize: size * 0.7 }]}>{kanji}</Text>
          </View>
        ) : (
          <>
            <Svg
              width="100%"
              height={boxSize}    
              viewBox="0 0 109 109"
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            >
              <Line x1="0" y1="54.5" 
              x2="109" y2="54.5" 
              stroke="#ccc" 
              strokeWidth="0.5" 
              strokeDasharray="3,3" 
              />
              <Line x1="54.5" y1="0" 
              x2="54.5" y2="109" 
              stroke="#ccc" 
              strokeWidth="0.5" 
              strokeDasharray="3,3" 
              />

              {/* Layer mờ — toàn bộ chữ */}
              <G opacity="0.08">
                {paths.map((d, i) => (
                  <Path key={`bg-${i}`} d={d} stroke="#333" strokeWidth="3.5" fill="none"
                    strokeLinecap="round" strokeLinejoin="round" />
                ))}
              </G>

              {/* Các nét đã vẽ xong (static) */}
              {paths.map((d, i) =>
                staticMask[i] ? (
                  <Path
                    key={`static-${i}`}
                    d={d}
                    stroke={STROKE_COLORS[i % STROKE_COLORS.length]}
                    strokeWidth={3.5}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : null
              )}

              {/* Nét đang animate — key đổi mỗi lần để remount và chạy lại */}
              {currentIdx >= 0 && currentIdx < paths.length && (
                <AnimatedStroke
                  key={`anim-${kanji}-${currentIdx}`}
                  d={paths[currentIdx]}
                  color={STROKE_COLORS[currentIdx % STROKE_COLORS.length]}
                  onDone={handleStrokeDone}
                />
              )}

              {/* Số thứ tự trên mỗi nét đã hiện */}
              {showNumbers && paths.map((d, i) => {
                if (!staticMask[i] && i !== currentIdx) return null;
                const nums = d.match(/^[Mm]\s*([\d.]+)[,\s]+([\d.]+)/);
                if (!nums) return null;
                const nx = parseFloat(nums[1]);
                const ny = parseFloat(nums[2]);
                return (
                  <SvgText
                    key={`num-${i}`}
                    x={nx}
                    y={ny - 3}
                    fontSize="6"
                    fill={STROKE_COLORS[i % STROKE_COLORS.length]}
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {i + 1}
                  </SvgText>
                );
              })}
            </Svg>
            <View style={styles.controls}>
              <TouchableOpacity style={styles.btn} onPress={() => {
                if (isComplete) {
                  cancelRef.current = false;
                  setCurrentIdx(-1);
                  setDrawnCount(0);
                  setStaticMask(new Array(paths?.length || 0).fill(false));
                  setIsComplete(false);
                  setIsPlaying(true);
                  setTimeout(() => startFrom(0), 30);
                } else if (isPlaying) {
                  pause();
                } else {
                  play();
                }
              }}>
                <Text style={styles.btnText}>
                  {isPlaying ? '⏸' : (isComplete ? '↻' : '▶')}
                </Text>
              </TouchableOpacity>

              {/* Chỉ hiển thị số nét */}
              {paths && paths.length > 0 && (
                <Text style={styles.progress}>
                  {drawnCount}/{paths.length}
                </Text>
              )}
            </View>
          </>
        )}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
 container: {
    width: "100%",
    alignItems: "stretch",
    margin: 0,
    padding: 0,
    backgroundColor: 'transparent',
  }, 
  canvasBox: {
    width: "100%",
    height: 200,
    backgroundColor: 'transparent',
    // backgroundColor: BG_GRAY,
    borderRadius: 0,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderColor: "#E2E8F0",
    position: "relative",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: '#999',
  },
  fallbackText: {
    color: '#333',
    fontWeight: '300',
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    backgroundColor: 'transparent', 
  },
  btn: {
    backgroundColor: 'transparent', 
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
  },
  btnText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
  },
  progress: {
    fontSize: 12,
    color: '#666',
  },
  topRightContainer: {
    position: 'absolute',
    top: 6,
    right: 6,
    zIndex: 10,
    alignItems: 'flex-end',
    gap: 4, 
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  reloadBtn: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: '#FFEAEA',
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: '#FFCCCC',
  },
  reloadText: {
    fontSize: 9,
    color: '#D32F2F',
    fontWeight: '600',
  },
});
export default KanjiStrokeOrder;