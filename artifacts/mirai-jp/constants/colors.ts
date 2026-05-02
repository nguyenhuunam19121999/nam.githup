/**
 * BẢNG MÀU CHỦ ĐẠO — Mirai.JP
 * ─────────────────────────────────────────────────────────────────
 * Màu chính:  #4ECDC4  (rgb 78, 205, 196)  — xanh ngọc teal
 * Màu tối hơn: #3BB3AC                      — teal đậm (hover, viền)
 * Nền ứng dụng: #f1f5f9                     — xám nhạt
 *
 * Cách dùng:
 *   import colors from "@/constants/colors";
 *   colors.light.primary  → "#4ECDC4"
 * ─────────────────────────────────────────────────────────────────
 */

const colors = {
  light: {
    // Màu chữ mặc định toàn app
    text: "#0a0a0a",

    // Màu nhấn mạnh (tint) — dùng cho icon tab đang active
    tint: "#4ECDC4",

    // Nền trang trắng
    background: "#ffffff",

    // Màu chữ trên nền trắng
    foreground: "#0a0a0a",

    // Nền thẻ / card nổi
    card: "#f9f9f9",
    cardForeground: "#0a0a0a",

    // MÀU CHỦ ĐẠO — dùng cho nút bấm, thanh header, trạng thái active
    primary: "#4ECDC4",       // rgb(78, 205, 196)
    primaryForeground: "#ffffff",

    // Màu phụ — nền nút thứ cấp, chip không active
    secondary: "#f0f0f0",
    secondaryForeground: "#1a1a1a",

    // Màu mờ — divider, placeholder, timestamp
    muted: "#f0f0f0",
    mutedForeground: "#737373",

    // Màu điểm nhấn — badge, item được chọn, focus ring
    accent: "#4ECDC4",
    accentForeground: "#ffffff",

    // Màu hành động nguy hiểm — xóa, lỗi
    destructive: "#ef4444",
    destructiveForeground: "#ffffff",

    // Viền và ô nhập liệu
    border: "#e5e5e5",
    input: "#e5e5e5",
  },

  // Bo góc toàn app (px) — dùng cho card, nút, modal
  radius: 8,
};

export default colors;
