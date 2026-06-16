import dieuDuong from "./dieu_duong.json";
import khachSan from "./khach_san.json";
import nhaHang from "./nha_hang.json";
import nongNghiep from "./nong_nghiep.json";
import oto from "./oto.json";
import thucPham from "./thuc_pham.json";
import veSinh from "./ve_sinh.json";
import xayDung from "./xay_dung.json";
import coKhi from "./co_khi.json";
import dienTu from "./dien_tu.json";
import dongTau from "./dong_tau.json";
import detMay from "./det_may.json";
import nguNghiep from "./ngu_nghiep.json";
import sanXuatCN from "./san_xuat_cn.json";

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
  "industry-machinery": coKhi as RawVocab[],
  "industry-electronics": dienTu as RawVocab[],
  "industry-shipbuilding": dongTau as RawVocab[],
  "industry-textile": detMay as RawVocab[],
  "industry-fishing": nguNghiep as RawVocab[],
  "industry-manufacturing": sanXuatCN as RawVocab[],
};

export const ALL_INDUSTRY_VOCAB: RawVocab[] = Object.values(
  INDUSTRY_VOCAB,
).flat();

/**
 * Thông tin hiển thị (tiêu đề) của từng nhóm ngành.
 * Trùng với danh sách INDUSTRIES ở trang chủ — đặt ở đây để dùng chung
 * cho mọi trang (header vocab, breadcrumb...) tránh hard-code rải rác.
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
  "industry-machinery": { emoji: "⚙️", jp: "素形材・産業機械", vi: "Cơ khí" },
  "industry-electronics": { emoji: "⚡", jp: "電気・電子情報", vi: "Điện tử" },
  "industry-shipbuilding": { emoji: "🚢", jp: "造船・舶用工業", vi: "Đóng tàu" },
  "industry-textile": { emoji: "🧵", jp: "繊維・衣服", vi: "Dệt may" },
  "industry-fishing": { emoji: "🪴", jp: "漁業", vi: "Ngư nghiệp" },
  "industry-manufacturing": { emoji: "🏭", jp: "工業製品製造業", vi: "Sản xuất CN" },
};

const JLPT_BOOK_INFO: Record<string, BookInfo> = {
  "n5":           { emoji: "📖", jp: "日本語能力試験 N5", vi: "JLPT · N5" },
  "n4":           { emoji: "📖", jp: "日本語能力試験 N4", vi: "JLPT · N4" },
  "n3":           { emoji: "📖", jp: "日本語能力試験 N3", vi: "JLPT · N3" },
  "n2":           { emoji: "📖", jp: "日本語能力試験 N2", vi: "JLPT · N2" },
  "n1":           { emoji: "📖", jp: "日本語能力試験 N1", vi: "JLPT · N1" },
  "soumatome-n3": { emoji: "📗", jp: "総まとめ N3",       vi: "Soumatome · N3" },
  "soumatome-n2": { emoji: "📗", jp: "総まとめ N2",       vi: "Soumatome · N2" },
  "mimikara-n3":  { emoji: "📘", jp: "耳から覚える N3",   vi: "Mimikara · N3" },
  "mimikara-n2":  { emoji: "📘", jp: "耳から覚える N2",   vi: "Mimikara · N2" },
};

/**
 * Trả về thông tin tiêu đề cho một khoá / nhóm ngành.
 * Ưu tiên bookId (sách JLPT hoặc ngành nghề), nếu không có thì dựa vào cấp độ JLPT.
 * Khi không có cả hai → trả về tiêu đề chung "Tất cả từ vựng".
 */
export function getBookInfo(
  level?: string,
  bookId?: string,
): BookInfo {
  if (bookId && JLPT_BOOK_INFO[bookId]) return JLPT_BOOK_INFO[bookId];
  if (bookId && INDUSTRY_INFO[bookId]) return INDUSTRY_INFO[bookId];
  const lvl = (level ?? "").toUpperCase();
  if (["N5", "N4", "N3", "N2", "N1"].includes(lvl)) {
    return { emoji: "📖", jp: `JLPT ${lvl}`, vi: `Khoá học ${lvl}` };
  }
  return { emoji: "📚", jp: "全部", vi: "Tất cả từ vựng" };
}
