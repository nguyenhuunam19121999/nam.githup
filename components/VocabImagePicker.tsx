// components/VocabImagePicker.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../artifacts/mirai-jp/hooks/useAuth';

interface VocabImagePickerProps {
  vocabId: string;
  vocabWord: string;
  vocabMeaning?: string;
  onImagesSelected?: (images: string[]) => void;
}

// API tìm kiếm ảnh
const fetchSuggestedImages = async (keyword: string): Promise<string[]> => {
  try {
    const API_KEY = '56058578-a59bff04fd57cf7ad79fa94db';
    const url = `https://pixabay.com/api/?key=${API_KEY}&q=${encodeURIComponent(keyword)}&image_type=photo&per_page=12`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.hits && data.hits.length > 0) {
      return data.hits.map((hit: any) => hit.webformatURL);
    }
    // Ảnh mặc định nếu không tìm thấy
    return [
      'https://picsum.photos/id/1/200/150',
      'https://picsum.photos/id/2/200/150',
      'https://picsum.photos/id/3/200/150',
      'https://picsum.photos/id/4/200/150',
    ];
  } catch (error) {
    return [];
  }
};

export default function VocabImagePicker({ vocabId, vocabWord, vocabMeaning, onImagesSelected }: VocabImagePickerProps) {
  const { currentUser, scopedKey } = useAuth();
  const [suggestedImages, setSuggestedImages] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [contributedImages, setContributedImages] = useState<string[]>([]); // ✅ Lưu ảnh đã đóng góp

  // Tải ảnh đã đóng góp trước
  useEffect(() => {
    loadContributedImages();
    loadSuggestedImages();
  }, [vocabId]);

  // ✅ Load ảnh đã đóng góp từ storage
  const loadContributedImages = async () => {
    try {
      const key = scopedKey(`vocab_contributed_${vocabId}`);
      const saved = await AsyncStorage.getItem(key);
      if (saved) {
        const images = JSON.parse(saved);
        setContributedImages(images);
      }
    } catch (error) {
    }
  };

  const loadSuggestedImages = async () => {
    setLoading(true);
    const searchKeyword = vocabMeaning || vocabWord;
    const images = await fetchSuggestedImages(searchKeyword);
    setSuggestedImages(images);
    setLoading(false);
  };

  const toggleSelectImage = (url: string) => {
    if (selectedImages.includes(url)) {
      setSelectedImages(selectedImages.filter(img => img !== url));
    } else if (selectedImages.length < 4) {
      setSelectedImages([...selectedImages, url]);
    } else {
      Alert.alert('⚠️ Thông báo', 'Bạn chỉ có thể chọn tối đa 4 ảnh!');
    }
  };

  // ✅ Lưu ảnh đã đóng góp
  const saveContributedImages = async (images: string[]) => {
    try {
      const key = scopedKey(`vocab_contributed_${vocabId}`);
      await AsyncStorage.setItem(key, JSON.stringify(images));
    } catch (error) {
    }
  };

  const handleSubmit = async () => {
    if (!currentUser) {
      Alert.alert('🔒 Cần đăng nhập', 'Vui lòng đăng nhập để đóng góp hình ảnh!');
      return;
    }

    if (selectedImages.length === 0) {
      Alert.alert('⚠️ Thông báo', 'Vui lòng chọn ít nhất 1 ảnh!');
      return;
    }

    setLoading(true);
    try {
      // ✅ Lưu ảnh đã chọn vào contributedImages
      const newContributedImages = [...selectedImages];
      setContributedImages(newContributedImages);
      await saveContributedImages(newContributedImages);
      
      Alert.alert(
        '🙌 Cảm ơn bạn đã đóng góp!',
        'Bức ảnh của bạn sẽ giúp cộng đồng học tiếng Nhật tốt hơn.'
      );
      
      setSelectedImages([]);
      onImagesSelected?.(selectedImages);
      
    } catch (error) {
      Alert.alert('❌ Lỗi', 'Không thể gửi ảnh, vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1F6F7A" />
        <Text style={styles.loadingText}>Đang tải ảnh gợi ý...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tiêu đề */}
      <View style={styles.header}>
        <Text style={styles.title}>📸 Cùng Mazii hoàn thiện từ điển hình ảnh</Text>
        <Text style={styles.subtitle}>
          Vui lòng chọn tối đa 4 ảnh phù hợp với từ "{vocabWord}"
        </Text>
      </View>

      {/* ✅ Ảnh đã đóng góp - Hiển thị đầu tiên */}
      {contributedImages.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>🎉 Ảnh bạn đã đóng góp</Text>
          <ScrollView 
            showsVerticalScrollIndicator={true} 
            style={styles.imageGridScroll}
            contentContainerStyle={styles.imageGridContainer}
          >
            <View style={styles.imageGrid}>
              {contributedImages.map((url, index) => (
                <View key={index} style={styles.gridImageCard}>
                  <Image source={{ uri: url }} style={styles.gridImage} />
                  <View style={styles.contributedMark}>
                    <Text style={styles.contributedText}>✓</Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </>
      )}

      {/* Ảnh đề xuất */}
      <Text style={styles.sectionTitle}>✨ Ảnh đề xuất (chọn thêm)</Text>
      <ScrollView 
        showsVerticalScrollIndicator={true} 
        style={styles.imageGridScroll}
        contentContainerStyle={styles.imageGridContainer}
      >
        <View style={styles.imageGrid}>
          {suggestedImages.map((url, index) => {
            const isSelected = selectedImages.includes(url);
            return (
              <TouchableOpacity
                key={index}
                style={[styles.gridImageCard, isSelected && styles.imageCardSelected]}
                onPress={() => toggleSelectImage(url)}
              >
                <Image source={{ uri: url }} style={styles.gridImage} />
                {isSelected && (
                  <View style={styles.checkMark}>
                    <Text style={styles.checkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Thông tin đã chọn */}
      <View style={styles.selectionInfo}>
        <Text style={styles.selectionText}>
          Đã chọn: {selectedImages.length}/4 ảnh
        </Text>
      </View>

      {/* Nút gửi */}
      <TouchableOpacity 
        style={[styles.submitBtn, selectedImages.length === 0 && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={selectedImages.length === 0 || loading}
      >
        <Text style={styles.submitBtnText}>📤 Gửi đóng góp</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 12,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: '#64748b',
  },
  imageGridScroll: {
    maxHeight: 300,
    marginBottom: 16,
  },
  imageGridContainer: {
    paddingBottom: 8,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  gridImageCard: {
    width: '23%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f1f5f9',
  },
  imageCardSelected: {
    borderColor: '#1F6F7A',
    borderWidth: 3,
  },
  checkMark: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1F6F7A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  contributedMark: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contributedText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  selectionInfo: {
    marginVertical: 12,
    alignItems: 'center',
  },
  selectionText: {
    fontSize: 13,
    color: '#1F6F7A',
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: '#1F6F7A',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    backgroundColor: '#cbd5e1',
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});