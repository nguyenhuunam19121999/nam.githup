// components/ImageViewerModal.tsx
import React from 'react';
import { Modal, View, Image, TouchableOpacity, Text, StyleSheet } from 'react-native';

// ✅ Thêm interface định nghĩa kiểu props
interface ImageViewerModalProps {
  visible: boolean;
  imageUrl: string;
  onClose: () => void;
}

export default function ImageViewerModal({ visible, imageUrl, onClose }: ImageViewerModalProps) {
  return (
    <Modal visible={visible} transparent={true} animationType="fade">
      <View style={styles.modalContainer}>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
        <Image source={{ uri: imageUrl }} style={styles.fullImage} resizeMode="contain" />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  closeText: {
    fontSize: 24,
    color: '#fff',
  },
  fullImage: {
    width: '90%',
    height: '80%',
  },
});