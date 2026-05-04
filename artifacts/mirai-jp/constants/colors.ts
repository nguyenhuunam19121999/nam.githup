/**
 * BẢNG MÀU CHỦ ĐẠO — Mirai.JP
 * ─────────────────────────────────────────────────────────────────
 * Màu chính:  #7C3AED  (rgb 124, 58, 237)  — tím violet
 * Màu tối hơn: #5B21B6                      — violet đậm (hover, viền)
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

    tint: "#7C3AED", /* old: #4ECDC4 */

    background: "#ffffff",

    foreground: "#0a0a0a",

    card: "#f9f9f9",
    cardForeground: "#0a0a0a",

    primary: "#7C3AED",       /* old: #4ECDC4 */
    primaryForeground: "#ffffff",

    secondary: "#f0f0f0",
    secondaryForeground: "#1a1a1a",

    muted: "#f0f0f0",
    mutedForeground: "#737373",

    accent: "#7C3AED",        /* old: #4ECDC4 */
    accentForeground: "#ffffff",

    destructive: "#ef4444",
    destructiveForeground: "#ffffff",

    border: "#e5e5e5",
    input: "#e5e5e5",
  },

  radius: 8,
};

export default colors;
