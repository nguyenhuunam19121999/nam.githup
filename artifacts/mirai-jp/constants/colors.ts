/**
 * BẢNG MÀU CHỦ ĐẠO — Mirai.JP
 * ─────────────────────────────────────────────────────────────────
 * Có 2 cơ chế đổi màu:
 *   1. light / dark  → theo cài đặt sáng/tối của điện thoại (cũ)
 *   2. morning / day / evening / night → theo giờ trong ngày (mới)
 *
 * Cách dùng (qua hook useColors, không import trực tiếp):
 *   import { useColors } from "@/hooks/useColors";
 *   const colors = useColors();
 *   colors.primary → màu chính hiện tại (tự đổi theo giờ)
 *
 * Muốn thêm/sửa màu: chỉ cần sửa các object bên dưới, không cần
 * đụng vào hook — hook tự đọc theo key tương ứng.
 * ─────────────────────────────────────────────────────────────────
 */

// Token dùng chung cho mọi palette — tất cả object bên dưới phải có đủ các key này
export interface ColorTokens {
  text: string;
  tint: string;
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
}

const light: ColorTokens = {
  text: "#0a0a0a",
  tint: "#004370",
  background: "#ffffff",
  foreground: "#0a0a0a",
  card: "#f9f9f9",
  cardForeground: "#0a0a0a",
  primary: "#004370",
  primaryForeground: "#ffffff",
  secondary: "#f0f0f0",
  secondaryForeground: "#1a1a1a",
  muted: "#f0f0f0",
  mutedForeground: "#737373",
  accent: "#4ECDC4",
  accentForeground: "#ffffff",
  destructive: "#ef4444",
  destructiveForeground: "#ffffff",
  border: "#e5e5e5",
  input: "#e5e5e5",
};

// ── Bảng màu theo thời gian trong ngày ──────────────────────────────────────
// morning: 05:00–10:59 | day: 11:00–16:59 | evening: 17:00–19:59 | night: 20:00–04:59

const morning: ColorTokens = {
  text: "#1f2937",
  tint: "#004370",
  background: "#FFF7F0",
  foreground: "#1f2937",
  card: "#ffffff",
  cardForeground: "#1f2937",
  primary: "#004370",
  primaryForeground: "#ffffff",
  secondary: "#FFE7DA",
  secondaryForeground: "#7C2D12",
  muted: "#FFF1E8",
  mutedForeground: "#9a6a55",
  accent: "#FFB238",
  accentForeground: "#7C2D12",
  destructive: "#ef4444",
  destructiveForeground: "#ffffff",
  border: "#FFE0CE",
  input: "#FFE0CE",
};

const day: ColorTokens = {
  text: "#0f172a",
  tint: "#004370",
  background: "#EEF2F6",
  foreground: "#0f172a",
  card: "#ffffff",
  cardForeground: "#0f172a",
  primary: "#004370",
  primaryForeground: "#ffffff",
  secondary: "#e2e8f0",
  secondaryForeground: "#0f172a",
  muted: "#f1f5f9",
  mutedForeground: "#64748b",
  accent: "#10B981",
  accentForeground: "#ffffff",
  destructive: "#ef4444",
  destructiveForeground: "#ffffff",
  border: "#e2e8f0",
  input: "#e2e8f0",
};

const evening: ColorTokens = {
  text: "#1e1b3a",
  tint: "#7C3AED",
  background: "#F3F0FA",
  foreground: "#1e1b3a",
  card: "#ffffff",
  cardForeground: "#1e1b3a",
  primary: "#7C3AED",
  primaryForeground: "#ffffff",
  secondary: "#E9E1FB",
  secondaryForeground: "#4C1D95",
  muted: "#EFEAFA",
  mutedForeground: "#7c6a99",
  accent: "#F97316",
  accentForeground: "#ffffff",
  destructive: "#ef4444",
  destructiveForeground: "#ffffff",
  border: "#E1D6F7",
  input: "#E1D6F7",
};

const night: ColorTokens = {
  text: "#e5e7eb",
  tint: "#818CF8",
  background: "#0b0f19",
  foreground: "#e5e7eb",
  card: "#151b2b",
  cardForeground: "#e5e7eb",
  primary: "#818CF8",
  primaryForeground: "#0b0f19",
  secondary: "#1f2937",
  secondaryForeground: "#e5e7eb",
  muted: "#1a2333",
  mutedForeground: "#8b93a7",
  accent: "#34D399",
  accentForeground: "#0b0f19",
  destructive: "#f87171",
  destructiveForeground: "#0b0f19",
  border: "#242e42",
  input: "#242e42",
};

const colors = {
  light,
  // dark chưa có thiết kế riêng -> tạm fallback sang light (giữ như bản gốc)
  radius: 8,

  // Bảng màu theo thời gian trong ngày
  timeOfDay: {
    morning,
    day,
    evening,
    night,
  },
};

export type TimeOfDayKey = keyof typeof colors.timeOfDay;

export default colors;