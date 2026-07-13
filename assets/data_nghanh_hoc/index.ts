export interface BookInfo {
  emoji: string;
  jp: string;
  vi: string;
}

export const INDUSTRY_VOCAB: Record<string, never> = {};
export const ALL_INDUSTRY_VOCAB: never[] = [];

export const INDUSTRY_INFO: Record<string, BookInfo> = {
  "industry-food": { emoji: "🍱", jp: "飲食料品製造業", vi: "Thực phẩm" },
  "industry-construction": { emoji: "🏗️", jp: "建設業", vi: "Xây dựng" },
  "industry-nursing": { emoji: "🧑‍⚕️", jp: "介護", vi: "Điều dưỡng" },
  "industry-agriculture": { emoji: "🌾", jp: "農業", vi: "Nông nghiệp" },
  "industry-hotel": { emoji: "🏨", jp: "宿泊業", vi: "Khách sạn" },
  "industry-restaurant": { emoji: "🍜", jp: "外食業", vi: "Nhà hàng" },
  "industry-auto": { emoji: "🚗", jp: "自動車整備", vi: "Ô tô" },
  "industry-cleaning": { emoji: "🧹", jp: "ビルクリーニング", vi: "Vệ sinh" },
  "industry-machinery": { emoji: "⚙️", jp: "素形材・産業機械", vi: "Cơ khí" },
  "industry-electronics": { emoji: "⚡", jp: "電気・電子情報", vi: "Điện tử" },
  "industry-shipbuilding": { emoji: "🚢", jp: "造船・舶用工業", vi: "Đóng tàu" },
  "industry-textile": { emoji: "🧵", jp: "繊維・衣服", vi: "Dệt may" },
  "industry-fishing": { emoji: "🪴", jp: "漁業", vi: "Ngư nghiệp" },
  "industry-manufacturing": { emoji: "🏭", jp: "工業製品製造業", vi: "Sản xuất CN" },
};

const JLPT_BOOK_INFO: Record<string, BookInfo> = {
  "n5": { emoji: "📖", jp: "日本語能力試験 N5", vi: "JLPT · N5" },
  "n4": { emoji: "📖", jp: "日本語能力試験 N4", vi: "JLPT · N4" },
  "n3": { emoji: "📖", jp: "日本語能力試験 N3", vi: "JLPT · N3" },
  "n2": { emoji: "📖", jp: "日本語能力試験 N2", vi: "JLPT · N2" },
  "n1": { emoji: "📖", jp: "日本語能力試験 N1", vi: "JLPT · N1" },
  "soumatome-n3": { emoji: "📗", jp: "総まとめ N3", vi: "Soumatome · N3" },
  "soumatome-n2": { emoji: "📗", jp: "総まとめ N2", vi: "Soumatome · N2" },
  "mimikara-n3": { emoji: "📘", jp: "耳から覚える N3", vi: "Mimikara · N3" },
  "mimikara-n2": { emoji: "📘", jp: "耳から覚える N2", vi: "Mimikara · N2" },
};

export function getBookInfo(level?: string, bookId?: string): BookInfo {
  if (bookId && JLPT_BOOK_INFO[bookId]) return JLPT_BOOK_INFO[bookId];
  if (bookId && INDUSTRY_INFO[bookId]) return INDUSTRY_INFO[bookId];
  const lvl = (level ?? "").toUpperCase();
  if (["N5", "N4", "N3", "N2", "N1"].includes(lvl)) {
    return { emoji: "📖", jp: `JLPT ${lvl}`, vi: `Khoá học ${lvl}` };
  }
  return { emoji: "📚", jp: "全部", vi: "Tất cả từ vựng" };
}
