/**
 * BẢNG MÀU CHỦ ĐẠO — Mirai.JP
 * ─────────────────────────────────────────────────────────────────
 * Màu chính:  #4ECDC4  (rgb 124, 58, 237)  — tím violet
 * Màu tối hơn: #4ECDC4                      — violet đậm (hover, viền)
 * Nền ứng dụng: #f1f5f9                     — xám nhạt
 *
 * Cách dùng:
 *   import colors from "@/constants/colors";
 *   colors.light.primary  → "#7C3AED"
 *
 * old: primary #4ECDC4, dark #3BB3AC
 * ─────────────────────────────────────────────────────────────────
 */

const colors = {
  light: {
    text: "#0a0a0a",

    tint: "#4ECDC4", /* old: #4ECDC4 */

    background: "#ffffff",

    foreground: "#0a0a0a",

    card: "#f9f9f9",
    cardForeground: "#0a0a0a",

    primary: "#4ECDC4",       /* old: #4ECDC4 */
    primaryForeground: "#ffffff",

    secondary: "#f0f0f0",
    secondaryForeground: "#1a1a1a",

    muted: "#f0f0f0",
    mutedForeground: "#737373",

    accent: "#4ECDC4",        /* old: #4ECDC4 */
    accentForeground: "#ffffff",

    destructive: "#ef4444",
    destructiveForeground: "#ffffff",

    border: "#e5e5e5",
    input: "#e5e5e5",
  },

  radius: 8,
};

export default colors;
