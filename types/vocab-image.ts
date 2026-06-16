// types/vocab-image.ts
// ─────────────────────────────────────────────────────────────────────────────
// Định nghĩa kiểu dữ liệu cho hệ thống đóng góp hình ảnh từ vựng
// ─────────────────────────────────────────────────────────────────────────────

export interface VocabImage {
  id: string;
  vocabId: string;
  url: string;
  contributorId: string;
  contributorName: string;
  votes: number;           // Số lượt bình chọn
  votesUp: string[];       // Danh sách user ID đã vote lên
  votesDown: string[];     // Danh sách user ID đã vote xuống
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
}

export interface VocabSuggestion {
  id: string;
  vocabId: string;
  suggestedImages: string[];  // URL ảnh đề xuất
  selectedImages: string[];   // Ảnh được người dùng chọn
  userId: string;
  createdAt: number;
}