import React from "react";
import {
  View,
  Image,
  Text,
  StyleSheet,
  Dimensions,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface ImageViewerProps {
  imageFile: string;
  description?: string;
  level?: string;
}

// Mapping trực tiếp tất cả hình ảnh
const IMAGE_MAP: Record<string, any> = {
  // N3 2021 07
  "n3_01_01": require("../assets/data_EXAMS/images/n3/n3_01_01.png"),
  "n3_01_02": require("../assets/data_EXAMS/images/n3/n3_01_02.png"),
  "n3_01_03": require("../assets/data_EXAMS/images/n3/n3_01_03.png"),
  "n3_01_04": require("../assets/data_EXAMS/images/n3/n3_01_04.png"),
  "n3_01_05": require("../assets/data_EXAMS/images/n3/n3_01_05.png"),
  // Thêm các hình ảnh khác tại đây
};

export default function ImageViewer({ imageFile, description, level = "n3" }: ImageViewerProps) {
  if (!imageFile) return null;

  const imageSource = IMAGE_MAP[imageFile];
  
  if (!imageSource) {
    // Hiển thị placeholder nếu không có ảnh
    return (
      <View style={styles.placeholderContainer}>
        <Text style={styles.placeholderIcon}>🖼️</Text>
        <Text style={styles.placeholderText}>Hình ảnh: {imageFile}</Text>
        {description && <Text style={styles.description}>{description}</Text>}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image
        source={imageSource}
        style={styles.image}
        resizeMode="contain"
      />
      {description && (
        <Text style={styles.description}>{description}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginBottom: 16,
  },
  image: {
    width: SCREEN_WIDTH - 64,
    height: 200,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
  },
  description: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 8,
    textAlign: "center",
  },
  placeholderContainer: {
    width: SCREEN_WIDTH - 64,
    minHeight: 120,
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderStyle: "dashed",
  },
  placeholderIcon: {
    fontSize: 40,
    opacity: 0.5,
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "center",
  },
});
