import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Animated, StyleSheet, useColorScheme } from "react-native";
import colors, { ColorTokens, TimeOfDayKey } from "../constants/colors";

/**
 * useColors — trả về bảng màu (design tokens) đang hoạt động.
 *
 * Khi chuyển theme, một lớp phủ mờ dần (crossfade) sẽ che màn hình trong
 * một khoảnh khắc để việc đổi màu không bị "giật" đột ngột.
 *
 * QUAN TRỌNG VỀ THỜI ĐIỂM: lớp phủ phải hiện lên TRƯỚC khi màu thật sự
 * đổi, không phải SAU. Vì vậy:
 *  - Khi người dùng bấm nút đổi theme (qua setThemeMode), ta cho overlay
 *    hiện full-opacity NGAY trong cùng lệnh đó — trước khi state màu mới
 *    được set — để không có khung hình nào bị lộ màu mới đột ngột.
 *  - Với chế độ "auto" (tự đổi theo giờ, không qua nút bấm), dùng
 *    useLayoutEffect (chạy TRƯỚC khi vẽ lên màn hình) thay vì useEffect
 *    (chạy SAU khi đã vẽ) để giảm tối đa độ trễ.
 */

function getTimeOfDay(): TimeOfDayKey {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return "morning";
  if (h >= 11 && h < 17) return "day";
  if (h >= 17 && h < 20) return "evening";
  return "night";
}

const CHECK_INTERVAL_MS = 30 * 1000;
const THEME_MODE_KEY = "app.themeMode";
const TRANSITION_DURATION_MS = 550; // độ mượt của hiệu ứng chuyển theme

export type ThemeMode = "auto" | "light" | "dark";

interface ColorsContextValue {
  tokens: ColorTokens & { radius: number };
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  timeOfDay: TimeOfDayKey;
  ready: boolean;
  overlayColor: string | null;
  overlayOpacity: Animated.Value;
}

const ColorsContext = createContext<ColorsContextValue | null>(null);

function resolvePalette(mode: ThemeMode, timeOfDay: TimeOfDayKey): ColorTokens {
  if (mode === "light") return colors.light; // ← khôi phục lại như cũ
  if (mode === "dark") return colors.timeOfDay.night;
  return colors.timeOfDay[timeOfDay]; // "auto"
}

export function ColorsProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>("auto");
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDayKey>(getTimeOfDay());
  const [ready, setReady] = useState(false);

  // ── Lớp phủ crossfade để chuyển theme mượt, không bị giật ──────────────
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const [overlayColor, setOverlayColor] = useState<string | null>(null);
  const prevPaletteRef = useRef<ColorTokens | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_MODE_KEY);
        if (saved === "auto" || saved === "light" || saved === "dark") {
          setThemeModeState(saved);
        }
      } finally {
        setReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (themeMode !== "auto") return;
    const id = setInterval(() => {
      const next = getTimeOfDay();
      setTimeOfDay((prev) => (prev !== next ? next : prev));
    }, CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [themeMode]);

  // Bắt đầu hiệu ứng phủ mờ dần: nhận màu nền CŨ, phủ lên rồi mờ dần đi.
  const triggerFade = useCallback((prevBg: string, nextBg: string) => {
    if (prevBg === nextBg) return; // màu không đổi thì khỏi phủ gì cả
    setOverlayColor(prevBg);
    overlayOpacity.setValue(1); // hiện NGAY, không animate bước này
    Animated.timing(overlayOpacity, {
      toValue: 0,
      duration: TRANSITION_DURATION_MS,
      useNativeDriver: true,
    }).start(() => setOverlayColor(null));
  }, []);

  // setThemeMode: gọi khi người dùng bấm nút đổi Sáng/Tối/Tự động.
  // Cho overlay hiện lên NGAY TẠI ĐÂY — trước khi đổi state màu —
  // để tránh bị lộ 1 khung hình màu mới trước khi overlay kịp che.
  const setThemeMode = useCallback(
    (mode: ThemeMode) => {
      const prevBg = resolvePalette(themeMode, timeOfDay).background;
      const nextPalette = resolvePalette(mode, timeOfDay);
      triggerFade(prevBg, nextPalette.background);
      prevPaletteRef.current = nextPalette; // đánh dấu đã xử lý, tránh layout-effect bên dưới chạy lại lần nữa
      setThemeModeState(mode);
      AsyncStorage.setItem(THEME_MODE_KEY, mode).catch(() => {});
    },
    [themeMode, timeOfDay, triggerFade],
  );

  const palette = resolvePalette(themeMode, timeOfDay);

  // Lưới an toàn cho trường hợp màu đổi KHÔNG qua setThemeMode — ví dụ
  // chế độ "auto" tự đổi theo giờ (timeOfDay thay đổi từ vòng lặp 30s).
  // Dùng useLayoutEffect (chạy TRƯỚC khi vẽ lên màn hình) thay vì
  // useEffect (chạy SAU) để giảm độ trễ xuống mức thấp nhất có thể.
  useLayoutEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevPaletteRef.current = palette;
      return;
    }
    const prev = prevPaletteRef.current;
    if (prev && prev.background !== palette.background) {
      triggerFade(prev.background, palette.background);
    }
    prevPaletteRef.current = palette;
  }, [palette.background, triggerFade]);

  const value = useMemo<ColorsContextValue>(
    () => ({
      tokens: { ...palette, radius: colors.radius },
      themeMode,
      setThemeMode,
      timeOfDay,
      ready,
      overlayColor,
      overlayOpacity,
    }),
    [palette, themeMode, setThemeMode, timeOfDay, ready, overlayColor],
  );

  return (
    <ColorsContext.Provider value={value}>
      {children}
      <ThemeFadeOverlay />
    </ColorsContext.Provider>
  );
}

/** Lớp phủ crossfade — render lại bên trong bất kỳ <Modal> nào cần được
 * phủ đúng lúc đổi theme (xem AuthMenu.tsx). */
export function ThemeFadeOverlay() {
  const ctx = useContext(ColorsContext);
  if (!ctx || !ctx.overlayColor) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: ctx.overlayColor, opacity: ctx.overlayOpacity, zIndex: 9999 },
      ]}
    />
  );
}

/** Lấy bảng màu hiện tại — dùng trong mọi màn hình. */
export function useColors() {
  const ctx = useContext(ColorsContext);
  const scheme = useColorScheme();

  if (ctx) return ctx.tokens;

  const palette = scheme === "dark" ? colors.timeOfDay.night : colors.light;
  return { ...palette, radius: colors.radius };
}

/** Đọc/đổi chế độ theme — dùng trong màn hình Cài đặt. */
export function useThemeMode() {
  const ctx = useContext(ColorsContext);
  if (!ctx) {
    throw new Error("useThemeMode must be used inside ColorsProvider");
  }
  return {
    themeMode: ctx.themeMode,
    setThemeMode: ctx.setThemeMode,
    timeOfDay: ctx.timeOfDay,
  };
}