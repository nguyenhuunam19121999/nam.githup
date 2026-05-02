import dieuDuong from "./dieu_duong.json";
import khachSan from "./khach_san.json";
import nhaHang from "./nha_hang.json";
import nongNghiep from "./nong_nghiep.json";
import oto from "./oto.json";
import thucPham from "./thuc_pham.json";
import veSinh from "./ve_sinh.json";
import xayDung from "./xay_dung.json";

import type { RawVocab } from "../vocab";

export const INDUSTRY_VOCAB: Record<string, RawVocab[]> = {
  "industry-food": thucPham as RawVocab[],
  "industry-construction": xayDung as RawVocab[],
  "industry-nursing": dieuDuong as RawVocab[],
  "industry-agriculture": nongNghiep as RawVocab[],
  "industry-hotel": khachSan as RawVocab[],
  "industry-restaurant": nhaHang as RawVocab[],
  "industry-auto": oto as RawVocab[],
  "industry-cleaning": veSinh as RawVocab[],
};

export const ALL_INDUSTRY_VOCAB: RawVocab[] = Object.values(
  INDUSTRY_VOCAB,
).flat();

/**
 * Thông tin hiển thị (tiêu đề) của từng nhóm ngành.
 * Trùng với danh sách INDUSTRIES ở trang chủ — đặt ở đây để dùng chung
 * cho mọi trang (header flashcard, breadcrumb...) tránh hard-code rải rác.
 */
export interface BookInfo {
  emoji: string;
  jp: string;
  vi: string;
}

export const INDUSTRY_INFO: Record<string, BookInfo> = {
  "industry-food": { emoji: "🍱", jp: "飲食料品製造業", vi: "Thực phẩm" },
  "industry-construction": { emoji: "🏗️", jp: "建設業", vi: "Xây dựng" },
  "industry-nursing": { emoji: "🧑‍⚕️", jp: "介護", vi: "Điều dưỡng" },
  "industry-agriculture": { emoji: "🌾", jp: "農業", vi: "Nông nghiệp" },
  "industry-hotel": { emoji: "🏨", jp: "宿泊業", vi: "Khách sạn" },
  "industry-restaurant": { emoji: "🍜", jp: "外食業", vi: "Nhà hàng" },
  "industry-auto": { emoji: "🚗", jp: "自動車整備", vi: "Ô tô" },
  "industry-cleaning": { emoji: "🧹", jp: "ビルクリーニング", vi: "Vệ sinh" },
};

/**
 * Trả về thông tin tiêu đề cho một khoá / nhóm ngành.
 * Ưu tiên bookId (ngành nghề), nếu không có thì dựa vào cấp độ JLPT.
 * Khi không có cả hai → trả về tiêu đề chung "Tất cả từ vựng".
 */
export function getBookInfo(
  level?: string,
  bookId?: string,
): BookInfo {
  if (bookId && INDUSTRY_INFO[bookId]) return INDUSTRY_INFO[bookId];
  const lvl = (level ?? "").toUpperCase();
  if (["N5", "N4", "N3", "N2", "N1"].includes(lvl)) {
    return { emoji: "📖", jp: `JLPT ${lvl}`, vi: `Khoá học ${lvl}` };
  }
  return { emoji: "📚", jp: "全部", vi: "Tất cả từ vựng" };
}
