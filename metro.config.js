const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Loại bỏ thư mục ẩn .pnpm và các tầng node_modules lồng nhau để tránh lỗi watch trên Windows
config.resolver.blockList = [
  /node_modules\/\.pnpm/,
  /node_modules\/.*\/node_modules/
];

module.exports = config;