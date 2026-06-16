
// // ─────────────────────────────────────────────────────────────────────────────
// // KanjiStrokeOrder.tsx thư viện svg-kanji
// // //
// import React, {
//   useCallback,
//   useEffect,
//   useRef,
//   useState,
// } from "react";
// import { 
//   Animated, 
//   Easing, 
//   StyleSheet, 
//   Text, 
//   TouchableOpacity, 
//   InteractionManager ,
//   View
// } from "react-native";
// // import {
// //   Animated,
// //   Easing,
// //   StyleSheet,
// //   Text,
// //   TouchableOpacity,
// //   View,
// // } from "react-native";
// import Svg, { Path, G } from "react-native-svg";
// import { Kanji } from "react-native-kanjivg"; 

// const BG_GRAY = "#f0f4f8";

// const AnimatedPath = Animated.createAnimatedComponent(Path);

// // ✅ Cache SVG fetch — tránh gọi network mỗi lần chuyển kanji
// const svgCache = new Map<string, string[]>();
// const pendingFetch = new Set<string>();

// const STROKE_PALETTE = [
//   "#E63946", "#3A86FF", "#06A77D", "#F77F00", "#9B5DE5",
//   "#00B4D8", "#EF476F", "#7209B7", "#FFB703", "#2EC4B6"
// ];

// interface KanjiStrokeOrderProps {
//   kanji: string;
//   size?: number; 
//   autoPlay?: boolean;
//   showNumbers?: boolean;
//   speed?: number; 
// }

// function precisePathLength(d: string): number {
//   const tokens = d.match(/[A-Za-z]|[-+]?[\d.]+/g) || [];
//   let length = 0;
//   let curX = 0, curY = 0;
  
//   for (let i = 0; i < tokens.length; ) {
//     const cmd = tokens[i++];
//     if (!cmd) break;
    
//     if (cmd === 'M' || cmd === 'm') {
//       curX = parseFloat(tokens[i++]);
//       curY = parseFloat(tokens[i++]);
//     } else if (cmd === 'L' || cmd === 'l') {
//       const x = parseFloat(tokens[i++]);
//       const y = parseFloat(tokens[i++]);
//       length += Math.hypot(x - curX, y - curY);
//       curX = x;
//       curY = y;
//     } else if (/[CcQsStTeE]/.test(cmd)) {
//       const isC = /[Cc]/.test(cmd);
//       const paramsCount = isC ? 6 : 4;
//       let endX = curX, endY = curY;
//       for (let p = 0; p < paramsCount; p++) {
//         const val = parseFloat(tokens[i++]);
//         if (p === paramsCount - 2) endX = val;
//         if (p === paramsCount - 1) endY = val;
//       }
//       length += Math.hypot(endX - curX, endY - curY) * (isC ? 1.15 : 1.05); 
//       curX = endX;
//       curY = endY;
//     }
//   }
//   return length > 0 ? length : 120;
// }

// export function KanjiStrokeOrder({
//   kanji,
//   size = 180, 
//   autoPlay = true,
//   showNumbers = true,
//   speed = 400,
// }: KanjiStrokeOrderProps) {
//   const [strokePaths, setStrokePaths] = useState<string[]>([]);
//   const [currentStroke, setCurrentStroke] = useState(0);
//   const [isPlaying, setIsPlaying] = useState(autoPlay);
//   const [isComplete, setIsComplete] = useState(false);

//   const animationValues = useRef<Animated.Value[]>([]);
//   const pathLengths = useRef<number[]>([]);
//   const activeAnimation = useRef<Animated.CompositeAnimation | null>(null);

//   // ✅ THAY BẰNG — kiểm tra cache trước khi fetch
//   // ✅ THÊM ĐOẠN NÀY VÀO THAY THẾ
//   useEffect(() => {
//     let isMounted = true;
//     const code = kanji.charCodeAt(0).toString(16).toLowerCase();
//     const hexId = "0" + code;
//     const cacheKey = hexId;

//     const applyPaths = (paths: string[]) => {
//       if (!isMounted || paths.length === 0) return;
//       const lengths = paths.map(p => precisePathLength(p));
//       pathLengths.current = lengths;
//       animationValues.current = lengths.map(len => new Animated.Value(len));
//       setStrokePaths(paths);
//       setCurrentStroke(0);
//       setIsComplete(false);
//       setIsPlaying(autoPlay);
//     };

//     // 1. Nếu đã có trong cache (Memory) -> Hiển thị ngay lập tức không cần chờ
//     if (svgCache.has(cacheKey)) {
//       applyPaths(svgCache.get(cacheKey)!);
//       return () => { isMounted = false; };
//     }

//     // 2. Nếu đang có một tiến trình đổi chữ khác đang tải -> Chờ cache cập nhật
//     if (pendingFetch.has(cacheKey)) {
//       const interval = setInterval(() => {
//         if (svgCache.has(cacheKey)) {
//           clearInterval(interval);
//           if (isMounted) applyPaths(svgCache.get(cacheKey)!);
//         }
//       }, 50);
//       return () => {
//         isMounted = false;
//         clearInterval(interval);
//       };
//     }

//     // 3. LẦN ĐẦU TIÊN: Hoãn xử lý bóc tách SVG nặng bằng InteractionManager
//     // Luồng UI sẽ được ưu tiên chạy xong hiệu ứng bấm nút/chuyển chữ mượt mà trước
//     const task = InteractionManager.runAfterInteractions(() => {
//       if (!isMounted) return;

//       pendingFetch.add(cacheKey);
//       fetch(`https://cdn.jsdelivr.net/gh/kanjivg/kanjivg@master/kanji/${hexId}.svg`)
//         .then(res => res.text())
//         .then(rawSvg => {
//           // Toàn bộ logic bóc tách Regex nặng được đẩy xuống đây khi JS Thread đang rảnh
//           const paths: string[] = [];
//           const cleanSvg = rawSvg.replace(/<g[^>]*id="kvg:StrokeNumbers_[\s\S]*$/, "");
//           const pathRegex = /<path[^>]*d="([^"]+)"/g;
//           let match;
//           while ((match = pathRegex.exec(cleanSvg)) !== null) {
//             if (match[1]) paths.push(match[1]);
//           }

//           svgCache.set(cacheKey, paths); // Lưu vào bộ nhớ đệm
//           pendingFetch.delete(cacheKey);

//           if (isMounted) {
//             applyPaths(paths);
//           }
//         })
//         .catch(err => {
//           pendingFetch.delete(cacheKey);
//           console.error("Lỗi tải dữ liệu nét Kanji:", err);
//         });
//     });

//     return () => {
//       isMounted = false;
//       task.cancel(); // Hủy tác vụ xử lý nếu user bấm Next/Prev liên tục quá nhanh
//     };
//   }, [kanji, autoPlay]);

//   // useEffect(() => {
//   //   let isMounted = true;
//   //   const code = kanji.charCodeAt(0).toString(16).toLowerCase();
//   //   const hexId = "0" + code;
    
//   //   fetch(`https://cdn.jsdelivr.net/gh/kanjivg/kanjivg@master/kanji/${hexId}.svg`)
//   //     .then((res) => res.text())
//   //     .then((rawSvg) => {
//   //       if (!isMounted) return;
        
//   //       const paths: string[] = [];
//   //       const cleanSvg = rawSvg.replace(/<g[^>]*id="kvg:StrokeNumbers_[\s\S]*$/, ""); 
//   //       const pathRegex = /<path[^>]*d="([^"]+)"/g;
//   //       let match;
        
//   //       while ((match = pathRegex.exec(cleanSvg)) !== null) {
//   //         if (match[1]) {
//   //           paths.push(match[1]);
//   //         }
//   //       }

//   //       if (paths.length > 0) {
//   //         const lengths = paths.map((p) => precisePathLength(p));
//   //         pathLengths.current = lengths;
//   //         animationValues.current = lengths.map((len) => new Animated.Value(len));
          
//   //         setStrokePaths(paths);
//   //         setCurrentStroke(0);
//   //         setIsComplete(false);
//   //         setIsPlaying(autoPlay);
//   //       }
//   //     })
//   //     .catch((err) => {
//   //       console.error("Lỗi đồng bộ dữ liệu nét Kanji:", err);
//   //     });

//   //   return () => {
//   //     isMounted = false;
//   //   };
//   // }, [kanji, autoPlay]);

//   const runAnimation = useCallback((strokeIndex: number) => {
//     if (strokeIndex >= strokePaths.length) {
//       setIsComplete(true);
//       setIsPlaying(false);
//       return;
//     }

//     for (let i = 0; i < strokeIndex; i++) {
//       animationValues.current[i]?.setValue(0);
//     }
//     animationValues.current[strokeIndex]?.setValue(pathLengths.current[strokeIndex]);

//     const currentLength = pathLengths.current[strokeIndex] || 100;
    
//     // ĐỘ ĐẦM VÀ MƯỢT MÀ: Tăng thời gian chạy lên gấp 1.8 lần để mặc định chuyển động chậm rãi
//     const baseDuration = Math.max(300, (currentLength / 120) * speed);
//     const slowDuration = baseDuration * 1.8;

//     activeAnimation.current = Animated.timing(animationValues.current[strokeIndex], {
//       toValue: 0,
//       duration: slowDuration,
//       // ĐƯỜNG CONG TỐI ƯU SIÊU MƯỢT: Giúp nét vẽ khởi đầu mềm mại, đi đều và kết thúc vuốt nhẹ
//       easing: Easing.bezier(0.42, 0, 0.58, 1), 
//       useNativeDriver: true,
//     });

//     activeAnimation.current.start(({ finished }) => {
//       if (finished) {
//         const nextStroke = strokeIndex + 1;
//         setCurrentStroke(nextStroke);
//         runAnimation(nextStroke);
//       }
//     });
//   }, [strokePaths, speed]);

//   useEffect(() => {
//     if (isPlaying && strokePaths.length > 0 && !isComplete) {
//       runAnimation(currentStroke);
//     } else {
//       if (activeAnimation.current) activeAnimation.current.stop();
//     }

//     return () => {
//       if (activeAnimation.current) activeAnimation.current.stop();
//     };
//   }, [isPlaying, currentStroke, strokePaths, isComplete, runAnimation]);

//   const handleReplay = () => {
//     if (activeAnimation.current) activeAnimation.current.stop();
//     animationValues.current.forEach((anim, i) => anim.setValue(pathLengths.current[i]));
//     setIsComplete(false);
//     setCurrentStroke(0);
//     setIsPlaying(true);
//   };

//   const handleTogglePlay = () => {
//     if (isComplete) {
//       handleReplay();
//     } else {
//       setIsPlaying(!isPlaying);
//     }
//   };

//   const scale = size / 109;

//   if (strokePaths.length === 0) {
//     return (
//       <View style={styles.container}>
//         <View style={styles.canvasBox}>
//           <View style={{ width: size, height: size }}>
//             <Kanji character={kanji} width={size} height={size} />
//           </View>
//         </View>
//       </View>
//     );
//   }

//   return (
//     <View style={styles.container}>
//       <View style={styles.canvasBox}>
//         <View style={styles.gridV} />
//         <View style={styles.gridH} />

//         {/* KHUNG NÉT VẼ GIỮ NGUYÊN 180 */}
//         <View style={{ width: size, height: size, position: "relative" }}>
//           <Svg width={size} height={size} viewBox="0 0 109 109" style={StyleSheet.absoluteFill}>
//             <G>
//               {/* LỚP LÓT NỀN MỜ */}
//               {strokePaths.map((d, i) => (
//                 <Path
//                   key={`bg-${i}`}
//                   d={d}
//                   stroke="#d7dce0" // Màu mờ giúp nhìn rõ nét chính hơn
//                   strokeOpacity={0.5}
//                   strokeWidth={4}
//                   strokeLinecap="round"
//                   strokeLinejoin="round"
//                   fill="none"
//                 />
//               ))}

//               {/* LỚP HIỂN THỊ CHÍNH */}
//               {strokePaths.map((d, i) => {
//                 const strokeColor = STROKE_PALETTE[i % STROKE_PALETTE.length];
//                 const len = pathLengths.current[i] || 150;

//                 return (
//                   <AnimatedPath
//                     key={`stroke-${i}`}
//                     d={d}
//                     stroke={strokeColor}
//                     strokeWidth={4.5}
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                     fill="none"
//                     strokeDasharray={`${len}`}
//                     strokeDashoffset={animationValues.current[i] || 0}
//                   />
//                 );
//               })}
//             </G>
//           </Svg>

//           {/* LỚP SỐ THỨ TỰ NÉT */}
//           {showNumbers &&
//             strokePaths.map((d, i) => {
//               if (i > currentStroke && !isComplete) return null;

//               const match = d.match(/M\s*([\d.-]+)[,\s]+([\d.-]+)/);
//               if (!match) return null;

//               const x = parseFloat(match[1]) * scale - 4;
//               const y = parseFloat(match[2]) * scale - 14;

//               return (
//                 <Text
//                   key={`num-${i}`}
//                   style={[
//                     styles.strokeNumber,
//                     {
//                       left: Math.max(2, x),
//                       top: Math.max(2, y),
//                       color: STROKE_PALETTE[i % STROKE_PALETTE.length],
//                     },
//                   ]}
//                 >
//                   {i + 1}
//                 </Text>
//               );
//             })}
//         </View>

//         {/* Chỉ giữ nút điều khiển Play/Pause tinh gọn ở góc trái */}
//         <TouchableOpacity style={styles.inlineControlBtn} onPress={handleTogglePlay}>
//           <Text style={styles.inlineControlText}>
//             {isComplete ? "↻" : isPlaying ? "⏸" : "▶"}
//           </Text>
//         </TouchableOpacity>

//         {/* Khung hiển thị đếm số nét ở góc phải */}
//         <View style={styles.inlineStrokeInfo}>
//           <Text style={styles.inlineStrokeInfoText}>
//             {isComplete
//               ? `${strokePaths.length} nét`
//               : `${Math.min(currentStroke + 1, strokePaths.length)}/${strokePaths.length}`}
//           </Text>
//         </View>
//       </View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     width: "100%",
//     alignItems: "stretch", 
//   },
//   canvasBox: {
//     width: "100%",
//     height: 180,              
//     backgroundColor: BG_GRAY,
//     borderRadius: 0, 
//     borderLeftWidth: 0,
//     borderRightWidth: 0,
//     borderTopWidth: 1.5,
//     borderBottomWidth: 1.5,
//     borderColor: "#E2E8F0",
//     position: "relative",
//     overflow: "hidden",
//     alignItems: "center",     
//     justifyContent: "center", 
//   },
//   gridV: {
//     position: "absolute",
//     top: 0,
//     bottom: 0,
//     left: "50%",
//     width: 1,
//     borderStyle: "dashed",
//     borderWidth: 0.5,
//     borderColor: "#CBD5E1",
//   },
//   gridH: {
//     position: "absolute",
//     left: 0,
//     right: 0,
//     top: "50%",
//     height: 1,
//     borderStyle: "dashed",
//     borderWidth: 0.5,
//     borderColor: "#CBD5E1",
//   },
//   strokeNumber: {
//     position: "absolute",
//     fontSize: 11,
//     fontWeight: "800",
//     backgroundColor: "rgba(255,255,255,0.9)",
//     paddingHorizontal: 3,
//     borderRadius: 4,
//     zIndex: 10,
//   },
//   inlineControlBtn: {
//     position: "absolute",
//     bottom: 12,
//     left: 12,
//     width: 32,
//     height: 32,
//     borderRadius: 16,
//     backgroundColor: "rgba(37, 99, 235, 0.9)", 
//     alignItems: "center",
//     justifyContent: "center",
//     zIndex: 20,
//     elevation: 2,
//   },
//   inlineControlText: {
//     color: "#FFFFFF",
//     fontWeight: "bold",
//     fontSize: 14,
//   },
//   inlineStrokeInfo: {
//     position: "absolute",
//     bottom: 12,
//     right: 12,
//     backgroundColor: "rgba(15, 23, 42, 0.75)", 
//     paddingHorizontal: 10,
//     paddingVertical: 4,
//     borderRadius: 6,
//     zIndex: 20,
//   },
//   inlineStrokeInfoText: {
//     color: "#FFFFFF",
//     fontSize: 11,
//     fontWeight: "700",
//   },
// });

///////code hoàn chỉnh vẽ theo tọa độ
// ─────────────────────────────────────────────────────────────────────────────
// KanjiStrokeOrder
// Vẽ chữ Kanji theo từng nét — mỗi nét một màu khác nhau, có đánh số thứ tự.
// Có hoạt cảnh "viết" tuần tự từ nét đầu đến nét cuối; hỗ trợ phát lại.
// Dữ liệu nét lấy từ KanjiVG (canvas mặc định 109×109).
// ─────────────────────────────────────────────────────────────────────────────

// import React, {
//   useCallback,
//   useEffect,
//   useMemo,
//   useRef,
//   useState,
// } from "react";
// import {
//   Animated,
//   Easing,
//   StyleSheet,
//   Text,
//   TouchableOpacity,
//   View,
// } from "react-native";
// import Svg, { G, Path } from "react-native-svg";

// import strokesMap from "../assets/data_JLPT_kanji/kanji_strokes.json";

// const AnimatedPath = Animated.createAnimatedComponent(Path);

// // Bảng 30 màu — đủ dùng cho cả các kanji nhiều nét nhất (~29 nét)
// const PALETTE = [
//   "#E63946", "#3A86FF", "#06A77D", "#F77F00", "#9B5DE5",
//   "#00B4D8", "#EF476F", "#7209B7", "#FFB703", "#2EC4B6",
//   "#D62828", "#1D3557", "#52B788", "#F4A261", "#8338EC",
//   "#118AB2", "#E76F51", "#80B918", "#5A189A", "#FB8500",
//   "#0096C7", "#B5179E", "#43AA8B", "#F94144", "#577590",
//   "#90BE6D", "#F9844A", "#277DA1", "#F3722C", "#4D908E",
// ];

// interface Props {
//   /** Chữ Kanji cần vẽ, vd "候" */
//   kanji: string;
//   /** Kích thước nét vẽ SVG (pixel). Mặc định 220. */
//   size?: number;
//   /** Kích thước khung ngoài (pixel). Mặc định bằng size. */
//   containerSize?: number;
//   /** Có tự chạy hoạt cảnh khi mở không (mặc định: có) */
//   autoPlay?: boolean;
//   /** Có hiển thị số thứ tự nét không */
//   showNumbers?: boolean;
// }

// /** Trích điểm bắt đầu (M x,y) của một path "d" */
// function getStartPoint(d: string): { x: number; y: number } | null {
//   const m = d.match(/^\s*M\s*(-?[\d.]+)[,\s]+(-?[\d.]+)/);
//   if (!m) return null;
//   return { x: parseFloat(m[1]), y: parseFloat(m[2]) };
// }

// /**
//  * Ước lượng độ dài hình học của một path SVG (đơn vị viewBox).
//  * Dùng để đặt strokeDasharray và tính thời lượng vẽ tỉ lệ với độ dài nét.
//  * KanjiVG hầu hết là M + một vài đoạn cong cubic ("c"), nên ta cộng dồn
//  * khoảng cách giữa các điểm điều khiển — đủ chính xác cho mục đích hoạt cảnh.
//  */
// function approxPathLength(d: string): number {
//   const tokens = d.match(/[A-Za-z]|-?\d*\.?\d+(?:e-?\d+)?/g) || [];
//   let cmd = "";
//   let cx = 0;
//   let cy = 0;
//   let total = 0;
//   let i = 0;

//   const argCount = (c: string): number => {
//     const lc = c.toLowerCase();
//     if (lc === "m" || lc === "l" || lc === "t") return 2;
//     if (lc === "h" || lc === "v") return 1;
//     if (lc === "c") return 6;
//     if (lc === "s" || lc === "q") return 4;
//     if (lc === "a") return 7;
//     return 0;
//   };

//   while (i < tokens.length) {
//     const t = tokens[i];
//     if (/[A-Za-z]/.test(t)) {
//       cmd = t;
//       i++;
//       // Sau "M"/"m" mà có nhiều cặp toạ độ thì các cặp tiếp theo coi như "L"/"l"
//       continue;
//     }
//     const n = argCount(cmd);
//     if (n === 0) {
//       i++;
//       continue;
//     }
//     const a: number[] = [];
//     for (let k = 0; k < n; k++) a.push(parseFloat(tokens[i + k]));
//     i += n;

//     const isRel = cmd === cmd.toLowerCase();
//     let nx = cx;
//     let ny = cy;
//     let seg = 0;

//     switch (cmd.toUpperCase()) {
//       case "M":
//         nx = isRel ? cx + a[0] : a[0];
//         ny = isRel ? cy + a[1] : a[1];
//         // Sau lệnh M, các cặp tiếp theo được coi là L
//         cmd = isRel ? "l" : "L";
//         break;
//       case "L":
//       case "T":
//         nx = isRel ? cx + a[0] : a[0];
//         ny = isRel ? cy + a[1] : a[1];
//         seg = Math.hypot(nx - cx, ny - cy);
//         break;
//       case "H":
//         nx = isRel ? cx + a[0] : a[0];
//         seg = Math.abs(nx - cx);
//         break;
//       case "V":
//         ny = isRel ? cy + a[0] : a[0];
//         seg = Math.abs(ny - cy);
//         break;
//       case "C": {
//         const x1 = isRel ? cx + a[0] : a[0];
//         const y1 = isRel ? cy + a[1] : a[1];
//         const x2 = isRel ? cx + a[2] : a[2];
//         const y2 = isRel ? cy + a[3] : a[3];
//         nx = isRel ? cx + a[4] : a[4];
//         ny = isRel ? cy + a[5] : a[5];
//         const poly =
//           Math.hypot(x1 - cx, y1 - cy) +
//           Math.hypot(x2 - x1, y2 - y1) +
//           Math.hypot(nx - x2, ny - y2);
//         const chord = Math.hypot(nx - cx, ny - cy);
//         seg = (poly + chord) / 2; // xấp xỉ độ dài cong Bezier
//         break;
//       }
//       case "S":
//       case "Q": {
//         const x2 = isRel ? cx + a[0] : a[0];
//         const y2 = isRel ? cy + a[1] : a[1];
//         nx = isRel ? cx + a[2] : a[2];
//         ny = isRel ? cy + a[3] : a[3];
//         seg = (Math.hypot(x2 - cx, y2 - cy) + Math.hypot(nx - x2, ny - y2)) * 0.95;
//         break;
//       }
//       case "A":
//         nx = isRel ? cx + a[5] : a[5];
//         ny = isRel ? cy + a[6] : a[6];
//         seg = Math.hypot(nx - cx, ny - cy) * 1.2;
//         break;
//     }
//     total += seg;
//     cx = nx;
//     cy = ny;
//   }
//   return Math.max(8, total);
// }

// export function KanjiStrokeOrder({
//   kanji,
//   size = 220,
//   containerSize,
//   autoPlay = true,
//   showNumbers = true,
// }: Props) {
//   const boxSize = containerSize ?? size;
//   const svgOffset = (boxSize - size) / 2;
//   const paths = (strokesMap as Record<string, string[]>)[kanji];

//   // stage = số nét đã vẽ XONG (0 = chưa vẽ gì, paths.length = tất cả xong)
//   // animatingIndex = chỉ số nét ĐANG VẼ (-1 = không có)
//   const [stage, setStage] = useState(-1);
//   const [animatingIndex, setAnimatingIndex] = useState(-1);
//   const [done, setDone] = useState(false);

//   // Mỗi nét có 1 Animated.Value riêng → nét cũ không bị ảnh hưởng khi nét mới reset
//   const offsetsRef = useRef<Animated.Value[]>([]);

//   const cancelRef = useRef(false);
//   const sessionRef = useRef(0);

//   const lengths = useMemo(
//     () => (paths ? paths.map(approxPathLength) : []),
//     [paths],
//   );

//   // Khởi tạo / reset mảng offsets khi paths thay đổi
//   useEffect(() => {
//     if (!paths) return;
//     offsetsRef.current = paths.map((_, i) => new Animated.Value(lengths[i]));
//   }, [paths]);

//   const play = useCallback(() => {
//     if (!paths || paths.length === 0) return;
//     cancelRef.current = false;
//     sessionRef.current += 1;
//     const mySession = sessionRef.current;

//     // Reset toàn bộ offsets về "chưa vẽ"
//     paths.forEach((_, i) => {
//       offsetsRef.current[i]?.setValue(lengths[i]);
//     });

//     setDone(false);
//     setStage(-1);
//     setAnimatingIndex(-1);

//     const step = (i: number) => {
//       if (cancelRef.current || mySession !== sessionRef.current) return;
//       if (i >= paths.length) {
//         setStage(paths.length);
//         setAnimatingIndex(-1);
//         setDone(true);
//         return;
//       }

//       const len = lengths[i];
//       const anim = offsetsRef.current[i];
//       if (!anim) return;

//       // Đặt nét i về "chưa vẽ", các nét trước (0..i-1) đã ở 0 (xong)
//       anim.setValue(len);

//       // Cập nhật state: i-1 nét đã xong, nét i đang vẽ
//       setStage(i - 1);
//       setAnimatingIndex(i);

//       Animated.timing(anim, {
//         toValue: 0,
//         duration: Math.max(280, Math.min(1400, Math.round(len * 14))),
//         easing: Easing.linear,
//         useNativeDriver: false,
//       }).start(({ finished }) => {
//         if (!finished) return;
//         if (cancelRef.current || mySession !== sessionRef.current) return;
//         setTimeout(() => {
//           if (cancelRef.current || mySession !== sessionRef.current) return;
//           step(i + 1);
//         }, 120);
//       });
//     };

//     step(0);
//   }, [paths, lengths]);

//   // Tự chạy khi mount (hoặc khi đổi chữ)
//   useEffect(() => {
//     if (autoPlay) play();
//     return () => {
//       cancelRef.current = true;
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [kanji]);

//   if (!paths || paths.length === 0) {
//     return (
//       <View
//         style={[s.box, { width: size, height: size, justifyContent: "center" }]}
//       >
//         <Text
//           style={{
//             fontSize: size * 0.55,
//             fontWeight: "700",
//             color: "#0f172a",
//             textAlign: "center",
//           }}
//         >
//           {kanji}
//         </Text>
//         <Text style={s.fallbackHint}>Chưa có dữ liệu thứ tự nét</Text>
//       </View>
//     );
//   }

//   // KanjiVG dùng viewBox 109×109
//   const VB = 109;
//   const stroke = Math.max(2.4, (size / VB) * 3.2);
//   const numberSize = Math.max(8, size * 0.055);
//   const scale = size / VB;

//   return (
//     <View style={{ alignItems: "center" }}>
//       <View style={[s.box, { width: boxSize, height: boxSize }]}>
//         {/* Đường gióng dọc / ngang ở giữa khung */}
//         <View style={[s.gridV, { left: boxSize / 2 - 0.5 }]} />
//         <View style={[s.gridH, { top: boxSize / 2 - 0.5 }]} />

//         <Svg
//           width={size}
//           height={size}
//           viewBox={`0 0 ${VB} ${VB}`}
//           style={{ position: "absolute", left: svgOffset, top: svgOffset }}
//         >
//           <G fill="none" strokeLinecap="round" strokeLinejoin="round">
//             {/* LAYER STATIC: nét đã vẽ xong — key cố định, không bao giờ re-animate */}
//             {paths.map((d, i) => {
//               const isDone = done || i <= stage;
//               if (!isDone) return null;
//               return (
//                 <Path
//                   key={`static-${i}`}
//                   d={d}
//                   stroke={PALETTE[i % PALETTE.length]}
//                   strokeWidth={stroke}
//                 />
//               );
//             })}

//             {/* LAYER ANIMATED: đúng 1 nét đang vẽ — dùng offset riêng của nét đó */}
//             {!done && animatingIndex >= 0 && animatingIndex < paths.length && (() => {
//               const i = animatingIndex;
//               const anim = offsetsRef.current[i];
//               if (!anim) return null;
//               return (
//                 <AnimatedPath
//                   key={`anim-${i}`}
//                   d={paths[i]}
//                   stroke={PALETTE[i % PALETTE.length]}
//                   strokeWidth={stroke}
//                   strokeDasharray={`${lengths[i]}`}
//                   strokeDashoffset={anim as unknown as number}
//                 />
//               );
//             })()}
//           </G>
//         </Svg>

//         {/* Số thứ tự — hiển thị cho nét đã xong và nét đang vẽ */}
//         {showNumbers &&
//           paths.map((d, i) => {
//             if (!done && i > animatingIndex) return null;
//             const p = getStartPoint(d);
//             if (!p) return null;
//             const left = p.x * scale - numberSize / 2 + svgOffset;
//             const top = p.y * scale - numberSize / 2 + svgOffset;
//             return (
//               <Text
//                 key={`num-${i}`}
//                 style={[
//                   s.numLabel,
//                   {
//                     left,
//                     top,
//                     fontSize: numberSize,
//                     color: PALETTE[i % PALETTE.length],
//                     width: numberSize * 1.6,
//                     height: numberSize * 1.6,
//                     lineHeight: numberSize * 1.6,
//                     borderRadius: numberSize,
//                   },
//                 ]}
//               >
//                 {i + 1}
//               </Text>
//             );
//           })}
//       </View>

//       {/* Nút phát lại / tạm dừng */}
//       <TouchableOpacity
//         style={s.replayBtn}
//         onPress={play}
//         activeOpacity={0.85}
//       >
//         <Text style={s.replayIcon}>↻</Text>
//         <Text style={s.replayText}>
//           {done ? "Phát lại" : `Đang vẽ… (${Math.min(stage + 1, paths.length)}/${paths.length})`}
//         </Text>
//       </TouchableOpacity>
//     </View>
//   );
// }

// const s = StyleSheet.create({
//   box: {
//     backgroundColor: "#f8fafc",
//     borderRadius: 12,
//     borderWidth: 1,
//     borderColor: "#e2e8f0",
//     alignSelf: "center",
//     position: "relative",
//     overflow: "hidden",
//   },
//   gridV: {
//     position: "absolute",
//     top: 4,
//     bottom: 4,
//     width: 1,
//     backgroundColor: "#cbd5e1",
//     opacity: 0.6,
//   },
//   gridH: {
//     position: "absolute",
//     left: 4,
//     right: 4,
//     height: 1,
//     backgroundColor: "#cbd5e1",
//     opacity: 0.6,
//   },
//   numLabel: {
//     position: "absolute",
//     textAlign: "center",
//     fontWeight: "800",
//     backgroundColor: "rgba(255,255,255,0.85)",
//     overflow: "hidden",
//   },
//   fallbackHint: {
//     color: "#94a3b8",
//     fontSize: 11,
//     textAlign: "center",
//     marginTop: 6,
//   },
//   replayBtn: {
//     flexDirection: "row",
//     alignItems: "center",
//     marginTop: 10,
//     paddingHorizontal: 14,
//     paddingVertical: 8,
//     borderRadius: 20,
//     backgroundColor: "#eff6ff",
//     borderWidth: 1,
//     borderColor: "#bfdbfe",
//   },
//   replayIcon: {
//     fontSize: 16,
//     color: "#2F80ED",
//     marginRight: 6,
//     fontWeight: "700",
//   },
//   replayText: { color: "#1E40AF", fontWeight: "700", fontSize: 13 },
// });