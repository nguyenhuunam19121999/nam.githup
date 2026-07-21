const { getDefaultConfig } = require("expo/metro-config");
const config = getDefaultConfig(__dirname);

// Chỉ chặn thư mục ẩn .pnpm, KHÔNG chặn nested node_modules hợp lệ
config.resolver.blockList = [
  /node_modules\/\.pnpm\/.*\/node_modules\/\.bin/, // ví dụ nếu cần loại trừ .bin gây trùng watch
];

// Bật hỗ trợ symlink (pnpm dùng symlink kể cả khi hoisted một phần)
config.resolver.unstable_enableSymlinks = true;

module.exports = config;