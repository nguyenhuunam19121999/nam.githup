import type { RawVocab } from "../../vocab";
import vocabData from "./thuc_pham.json";

export const THUC_PHAM_VOCAB: RawVocab[] = vocabData as RawVocab[];

export const THUC_PHAM_PDF = {
  otafftv: {
    name: "Tài liệu từ OTAFFtv",
    description: "Kỹ năng Đặc định Số 1 — Thực phẩm và Đồ uống",
    webPath: "/otafftv.pdf",
    assetPath: "./thuc_pham/otafftv.pdf",
  },
} as const;
