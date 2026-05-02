import itVocab from "./it.json";
import businessVocab from "./business.json";
import medicalVocab from "./medical.json";
import engineeringVocab from "./engineering.json";
import foodVocab from "./food.json";
import tourismVocab from "./tourism.json";
import financeVocab from "./finance.json";
import educationVocab from "./education.json";

export interface VocabEntry {
  jp: string;
  kana: string;
  vi: string;
  category: string;
}

export interface IndustryVocab {
  id: string;
  name: string;
  nameJP: string;
  emoji: string;
  vocab: VocabEntry[];
}

export const INDUSTRY_VOCAB: IndustryVocab[] = [
  { id: "food", name: "Thực phẩm", nameJP: "飲食料品製造業", emoji: "🍱", vocab: foodVocab as VocabEntry[] },
  { id: "construction", name: "Xây dựng", nameJP: "建設業", emoji: "🏗️", vocab: [] },
  { id: "nursing", name: "Điều dưỡng", nameJP: "介護", emoji: "🧑‍⚕️", vocab: medicalVocab as VocabEntry[] },
  { id: "agriculture", name: "Nông nghiệp", nameJP: "農業", emoji: "🌾", vocab: [] },
  { id: "hotel", name: "Khách sạn", nameJP: "宿泊業", emoji: "🏨", vocab: tourismVocab as VocabEntry[] },
  { id: "restaurant", name: "Nhà hàng", nameJP: "外食業", emoji: "🍜", vocab: [] },
  { id: "auto", name: "Ô tô", nameJP: "自動車整備", emoji: "🚗", vocab: engineeringVocab as VocabEntry[] },
  { id: "cleaning", name: "Vệ sinh", nameJP: "ビルクリーニング", emoji: "🧹", vocab: [] },
  { id: "it", name: "Công nghệ thông tin", nameJP: "IT・情報技術", emoji: "💻", vocab: itVocab as VocabEntry[] },
  { id: "business", name: "Kinh doanh", nameJP: "ビジネス", emoji: "💼", vocab: businessVocab as VocabEntry[] },
  { id: "finance", name: "Tài chính", nameJP: "金融・財務", emoji: "💴", vocab: financeVocab as VocabEntry[] },
  { id: "education", name: "Giáo dục", nameJP: "教育", emoji: "🎓", vocab: educationVocab as VocabEntry[] },
];

export function getIndustryById(id: string): IndustryVocab | undefined {
  return INDUSTRY_VOCAB.find((i) => i.id === id);
}

export interface BookInfo {
  emoji: string;
  jp: string;
  vi: string;
}

const JLPT_INFO: Record<string, BookInfo> = {
  N5: { emoji: "📗", jp: "N5", vi: "Khoá học N5" },
  N4: { emoji: "📘", jp: "N4", vi: "Khoá học N4" },
  N3: { emoji: "📙", jp: "N3", vi: "Khoá học N3" },
  N2: { emoji: "📕", jp: "N2", vi: "Khoá học N2" },
  N1: { emoji: "📓", jp: "N1", vi: "Khoá học N1" },
};

const BOOK_INFO: Record<string, BookInfo> = {
  "mimikara-n3": { emoji: "📙", jp: "Mimikara N3", vi: "Mimikara N3" },
  "mimikara-n2": { emoji: "📕", jp: "Mimikara N2", vi: "Mimikara N2" },
  "soumatome-n3": { emoji: "📙", jp: "総まとめ N3", vi: "Soumatome N3" },
  "soumatome-n2": { emoji: "📕", jp: "総まとめ N2", vi: "Soumatome N2" },
};

export function getBookInfo(level?: string, bookId?: string): BookInfo {
  if (bookId) {
    if (BOOK_INFO[bookId]) return BOOK_INFO[bookId];
    const industry = INDUSTRY_VOCAB.find((i) => `industry-${i.id}` === bookId || i.id === bookId.replace("industry-", ""));
    if (industry) return { emoji: industry.emoji, jp: industry.nameJP, vi: industry.name };
  }
  if (level && JLPT_INFO[level.toUpperCase()]) return JLPT_INFO[level.toUpperCase()];
  return { emoji: "📚", jp: "Từ vựng", vi: "Tất cả từ vựng" };
}
